const express = require('express');
const router = express.Router();
const { Readable } = require('stream');
const { client } = require('../services/telegram');
const { Api } = require('telegram');
const bigInt = require('big-integer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

// Point fluent-ffmpeg at the bundled binary (no system install needed)
ffmpeg.setFfmpegPath(ffmpegPath);

// MIME types browsers can play natively → no transcoding needed
const NATIVE_TYPES = new Set(['video/mp4', 'video/webm', 'video/ogg']);

const activeTranscodes = new Map();
const HLS_DIR = path.join(__dirname, '../tmp_hls');
if (!fs.existsSync(HLS_DIR)) fs.mkdirSync(HLS_DIR, { recursive: true });

// Maps Telegram mime types → FFmpeg -f format names
const MIME_TO_FFMPEG = {
  'video/avi': 'avi',
  'video/x-msvideo': 'avi',
  'video/x-matroska': 'matroska',
  'video/mkv': 'matroska',
  'video/x-flv': 'flv',
  'video/quicktime': 'mov',
  'video/3gpp': '3gp',
};

// Cache codec probe results so we only probe each file once per server run
const codecCache = new Map();

// Probe the actual video codec from a small chunk using FFprobe
function probeCodec(buffer) {
  return new Promise((resolve) => {
    const tmpFile = path.join(HLS_DIR, `probe_${Date.now()}.mp4`);
    fs.writeFileSync(tmpFile, buffer);
    ffmpeg.ffprobe(tmpFile, (err, metadata) => {
      fs.unlink(tmpFile, () => { }); // clean up temp probe file
      if (err || !metadata) return resolve({ codec: 'unknown', pixFmt: 'unknown' });
      const videoStream = (metadata.streams || []).find(s => s.codec_type === 'video');
      resolve({
        codec: videoStream?.codec_name || 'unknown',
        pixFmt: videoStream?.pix_fmt || 'unknown',
      });
    });
  });
}

// Browser-incompatible video codecs (require transcode)
const INCOMPATIBLE_CODECS = new Set(['hevc', 'h265', 'av1', 'vp9', 'mpeg4', 'mpeg2video', 'wmv1', 'wmv2', 'wmv3', 'theora']);
// 10-bit pixel formats that browsers can't decode
const INCOMPATIBLE_PIX_FMTS = ['yuv420p10le', 'yuv420p10be', 'yuv422p', 'yuv422p10le', 'yuv444p', 'yuv444p10le', 'p010le', 'p010be'];

// Download a small chunk from a specific byte offset in a Telegram file
async function downloadChunk(fileLocation, offset, size) {
  const chunks = [];
  let downloaded = 0;
  try {
    for await (const chunk of client.iterDownload({
      file: fileLocation,
      offset: bigInt(offset),
      limit: size,
      requestSize: 512 * 1024,
    })) {
      if (!chunk) break;
      chunks.push(Buffer.from(chunk));
      downloaded += chunk.length;
      if (downloaded >= size) break;
    }
  } catch (e) { /* ignore download errors */ }
  return Buffer.concat(chunks);
}

// ── GET /api/stream/:chatId/:messageId/metadata ───────────────────────────────
router.get('/:chatId/:messageId/metadata', async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const messageId = Number(req.params.messageId);
    const cacheKey = `${chatId}_${messageId}`;

    // Return cached result immediately if available
    if (codecCache.has(cacheKey)) {
      return res.json(codecCache.get(cacheKey));
    }

    const messages = await client.getMessages(chatId, { ids: [messageId] });

    if (!messages || !messages[0] || !messages[0].media || !messages[0].media.document) {
      return res.status(404).json({ error: 'Video document not found in message.' });
    }

    const document = messages[0].media.document;
    const mimeType = document.mimeType || 'video/mp4';
    const fileSize = Number(document.size);

    // AVI/MKV always forces HLS transcode
    const isAvi = mimeType === 'video/avi' || mimeType === 'video/x-msvideo';
    const isNonNative = !new Set(['video/mp4', 'video/webm', 'video/ogg']).has(mimeType);

    if (isAvi || isNonNative) {
      const result = { mimeType, needsTranscode: true, isAvi, codec: 'unknown', size: fileSize };
      codecCache.set(cacheKey, result);
      return res.json(result);
    }

    // For MP4/WebM: probe codec via HTTP stream so ffprobe can automatically seek to moov atom
    const internalStreamUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/stream/${chatId}/${messageId}`;
    console.log(`[Probe] ${cacheKey}: Probing via HTTP stream...`);

    let codec = 'unknown';
    let pixFmt = 'unknown';

    try {
      const probeData = await new Promise((resolve) => {
        ffmpeg.ffprobe(internalStreamUrl, (err, metadata) => {
          if (err || !metadata) {
            console.error(`[Probe] ${cacheKey} error:`, err?.message);
            return resolve({ codec: 'unknown', pixFmt: 'unknown' });
          }
          const videoStream = (metadata.streams || []).find(s => s.codec_type === 'video');
          resolve({
            codec: videoStream?.codec_name || 'unknown',
            pixFmt: videoStream?.pix_fmt || 'unknown',
          });
        });
      });
      codec = probeData.codec;
      pixFmt = probeData.pixFmt;
    } catch (e) {
      console.error(`[Probe] ${cacheKey} failed:`, e);
    }

    console.log(`[Probe] ${cacheKey}: codec=${codec} pix_fmt=${pixFmt}`);

    const isUnknownCodec = codec === 'unknown';
    // Do not force transcode just because ffprobe is missing (unknown). Assume native MP4 is compatible.
    const isIncompatibleCodec = !isUnknownCodec && INCOMPATIBLE_CODECS.has(codec.toLowerCase());
    const isIncompatiblePixFmt = pixFmt !== 'unknown' && INCOMPATIBLE_PIX_FMTS.includes(pixFmt);
    const needsTranscode = isIncompatibleCodec || isIncompatiblePixFmt;

    const result = {
      mimeType,
      needsTranscode,
      isAvi: false,
      codec,
      pixFmt,
      incompatibleCodec: isIncompatibleCodec,
      incompatiblePixFmt: isIncompatiblePixFmt,
      size: fileSize
    };
    codecCache.set(cacheKey, result);
    res.json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/stream/:chatId/:messageId ────────────────────────────────────────
router.get('/:chatId/:messageId', async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const messageId = Number(req.params.messageId);

    // 1. Fetch message metadata from Telegram
    const messages = await client.getMessages(chatId, { ids: [messageId] });
    if (!messages || !messages[0] || !messages[0].media || !messages[0].media.document) {
      return res.status(404).send('Video document not found in message.');
    }

    const document = messages[0].media.document;
    const fileSize = Number(document.size);
    const mimeType = document.mimeType || 'video/mp4';
    const needsTranscode = !NATIVE_TYPES.has(mimeType);
    const ffmpegFormat = MIME_TO_FFMPEG[mimeType] || null;

    const fileLocation = new Api.InputDocumentFileLocation({
      id: document.id,
      accessHash: document.accessHash,
      fileReference: document.fileReference,
      thumbSize: ''
    });

    // ── NATIVE / RAW BYTE STREAM ─────────────────────────────────────────────
    // We serve raw bytes for ALL formats here. For native types (MP4/WebM),
    // the browser consumes this directly. For AVI/MKV, the /hls endpoint's
    // FFmpeg process uses this as its input source — blocking it causes a 400.
    const range = req.headers.range;
    let start = 0;
    let end = fileSize - 1;
    let isPartial = false;

    if (range) {
      isPartial = true;
      const parts = range.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        console.warn(`[Native Stream] 416 Range Not Satisfiable: start ${start} >= fileSize ${fileSize}`);
        return res.status(416).set({
          'Content-Range': `bytes */${fileSize}`
        }).end();
      }

      if (end >= fileSize) end = fileSize - 1;
    }

    const contentLength = end - start + 1;
    console.log(`[Native Stream] Request: Range=${range || 'none'} | Serving: ${start}-${end} (${contentLength} bytes)`);

    if (isPartial) {
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': mimeType,
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
      });
    } else {
      res.writeHead(200, {
        'Content-Length': contentLength,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
      });
    }

    let downloadedBytes = 0;
    let currentOffset = start;

    req.on('close', () => {
      console.log(`[Native Stream] Client disconnected at offset ${currentOffset}`);
    });

    while (downloadedBytes < contentLength && !req.destroyed && !req.closed) {
      try {
        const chunkSize = 512 * 1024;
        const alignedOffset = Math.floor(currentOffset / chunkSize) * chunkSize;
        const skipBytes = currentOffset - alignedOffset;

        let bytesToSkip = skipBytes;
        console.log(`[Native Stream] Fetching from alignedOffset ${alignedOffset} (skip ${bytesToSkip})`);

        for await (let chunk of client.iterDownload({
          file: fileLocation,
          offset: bigInt(alignedOffset),
          requestSize: chunkSize,
        })) {
          if (!chunk || req.destroyed || req.closed) break;

          let buf = Buffer.from(chunk);
          if (bytesToSkip > 0) {
            if (buf.length <= bytesToSkip) {
              bytesToSkip -= buf.length;
              continue; // completely skipped this chunk
            } else {
              buf = buf.slice(bytesToSkip);
              bytesToSkip = 0; // finished skipping
            }
          }

          if (buf.length === 0) continue;

          const remaining = contentLength - downloadedBytes;
          if (buf.length > remaining) {
            buf = buf.slice(0, remaining);
          }

          const canWrite = res.write(buf);
          downloadedBytes += buf.length;
          currentOffset += buf.length;

          if (!canWrite) {
            await new Promise(resolve => {
              const onDrain = () => { cleanup(); resolve(); };
              const onClose = () => { cleanup(); resolve(); };
              const onError = () => { cleanup(); resolve(); };
              const cleanup = () => {
                res.removeListener('drain', onDrain);
                req.removeListener('close', onClose);
                req.removeListener('error', onError);
              };
              res.once('drain', onDrain);
              req.once('close', onClose);
              req.once('error', onError);
            });
          }
          if (downloadedBytes >= contentLength) break;
        }
        console.log(`[Native Stream] iterDownload loop ended. req.closed=${req.closed}, downloadedBytes=${downloadedBytes}`);
        break;
      } catch (e) {
        if (req.destroyed || req.closed) break;
        console.log(`[Native Stream] Connection dropped. Reconnecting at offset ${currentOffset}... Error: ${e.message}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    console.log(`[Native Stream] Stream handler finishing. req.closed=${req.closed}`);
    res.end();

  } catch (err) {
    console.error('Telegram Stream Error:', err.message);
    if (!res.headersSent) res.status(500).send('Streaming error');
    else res.end();
  }
});

// ── GET /api/stream/hls/:chatId/:messageId/playlist.m3u8 ─────────────────────────
router.get('/hls/:chatId/:messageId/playlist.m3u8', async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const messageId = Number(req.params.messageId);
    const startSeconds = Math.max(0, Math.floor(Number(req.query.start) || 0));
    const transcodeId = `${chatId}_${messageId}_${startSeconds}`; // Unique ID per seek offset
    const outDir = path.join(HLS_DIR, String(chatId), String(messageId), String(startSeconds));
    const playlistPath = path.join(outDir, 'playlist.m3u8');
    const staticUrl = `/api/stream/hls/${chatId}/${messageId}/${startSeconds}/playlist.m3u8`;

    // If we already have an active transcode for this video at this offset, wait for it
    if (activeTranscodes.has(transcodeId)) {
      for (let i = 0; i < 60; i++) {
        if (fs.existsSync(playlistPath)) {
          return res.redirect(staticUrl);
        }
        await new Promise(r => setTimeout(r, 500));
      }
      return res.status(500).json({ error: 'Playlist generation timeout' });
    }

    // If playlist exists, re-use it
    if (fs.existsSync(playlistPath)) {
      return res.redirect(staticUrl);
    }

    // Start new FFmpeg pipeline
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    activeTranscodes.set(transcodeId, { startedAt: Date.now() });

    // Verify the message exists
    const messages = await client.getMessages(chatId, { ids: [messageId] });
    if (!messages || !messages[0] || !messages[0].media || !messages[0].media.document) {
      activeTranscodes.delete(transcodeId);
      return res.status(404).send('Video document not found.');
    }

    const document = messages[0].media.document;
    const mimeType = document.mimeType || 'video/mp4';
    const isAvi = mimeType === 'video/avi' || mimeType === 'video/x-msvideo';

    // ── KEY FIX: Use our own HTTP stream endpoint as FFmpeg input ──────────────
    // The /api/stream/:chatId/:messageId endpoint supports HTTP Range requests,
    // so FFmpeg can SEEK freely — this solves the moov-at-end black screen issue.
    // FFmpeg fetches from localhost so it's fast (no external network needed).
    const internalStreamUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/stream/${chatId}/${messageId}`;

    console.log(`[HLS FFmpeg] Starting: ${transcodeId} | AVI=${isAvi} | src=HTTP | start=${startSeconds}`);

    const inputOptions = [
      '-fflags', '+genpts+igndts',
      '-avoid_negative_ts', 'make_zero',
      '-thread_queue_size', '512',
      '-analyzeduration', '2M',
      '-probesize', '2M',
    ];
    if (startSeconds > 0) {
      inputOptions.unshift('-ss', String(startSeconds));
    }

    const cmd = ffmpeg(internalStreamUrl)
      .inputOptions(inputOptions)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-map', '0:v:0',
        '-map', '0:a:0',
        '-preset', 'veryfast',
        '-crf', '23',
        // Force browser-compatible pixel format — fixes black screen from
        // H.265/HEVC, 10-bit, yuv444p, or any non-standard source
        '-pix_fmt', 'yuv420p',
        // Ensure dimensions are divisible by 2 (required by libx264)
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-g', '48',
        '-keyint_min', '48',
        '-sc_threshold', '0',
        '-b:a', '128k',
        '-ac', '2',
        '-ar', '44100',
        '-af', 'aresample=async=1000',
        '-hls_time', '6',
        '-hls_list_size', '0',
        '-hls_flags', 'independent_segments+append_list',
        '-hls_segment_type', 'mpegts',
        '-hls_playlist_type', 'event',
        '-start_number', '0',
        '-hls_segment_filename', path.join(outDir, 'segment_%03d.ts'),
        '-f', 'hls'
      ])
      .output(playlistPath)
      .on('start', (cmd) => console.log(`[HLS FFmpeg] Started: ${transcodeId}`))
      .on('end', () => {
        console.log(`[HLS FFmpeg] Finished: ${transcodeId}`);
        activeTranscodes.delete(transcodeId);
      })
      .on('error', (err) => {
        if (err.message.includes('SIGKILL')) return;
        console.error(`[HLS FFmpeg] Error: ${err.message}`);
        activeTranscodes.delete(transcodeId);
      });

    cmd.run();

    // Wait for first playlist to appear (up to 30s)
    for (let i = 0; i < 60; i++) {
      if (fs.existsSync(playlistPath)) {
        return res.redirect(staticUrl);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    res.status(500).json({ error: 'Playlist generation timeout' });

  } catch (err) {
    console.error('HLS Stream Error:', err.message);
    res.status(500).send('HLS Streaming error');
  }
});

// Clean up old HLS folders every 30 minutes
setInterval(() => {
  if (!fs.existsSync(HLS_DIR)) return;
  const now = Date.now();
  const chats = fs.readdirSync(HLS_DIR);
  chats.forEach(chatFolder => {
    const chatPath = path.join(HLS_DIR, chatFolder);
    if (!fs.statSync(chatPath).isDirectory()) return;
    const episodes = fs.readdirSync(chatPath);
    episodes.forEach(epFolder => {
      const folderPath = path.join(chatPath, epFolder);
      const stat = fs.statSync(folderPath);
      const transcodeId = `${chatFolder}_${epFolder}`;
      if (now - stat.mtimeMs > 2 * 60 * 60 * 1000 && !activeTranscodes.has(transcodeId)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
        console.log(`[HLS Cleanup] Deleted stale folder: ${path.join(chatFolder, epFolder)}`);
      }
    });
  });
}, 30 * 60 * 1000);

module.exports = router;
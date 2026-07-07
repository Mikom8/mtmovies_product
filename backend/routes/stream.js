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
const Movie = require('../models/Movie');
const Series = require('../models/Series');

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

// Probe the actual video codec from a small buffer chunk using FFprobe (for native formats)
function probeMetadataFromBuffer(buffer) {
  return new Promise((resolve) => {
    const tmpFile = path.join(HLS_DIR, `probe_${Date.now()}.tmp`);
    fs.writeFileSync(tmpFile, buffer);
    ffmpeg.ffprobe(tmpFile, (err, metadata) => {
      fs.unlink(tmpFile, () => { }); // clean up temp probe file
      if (err || !metadata) {
        return resolve({ codec: 'unknown', pixFmt: 'unknown', duration: 0 });
      }
      const videoStream = (metadata.streams || []).find(s => s.codec_type === 'video');
      resolve({
        codec: videoStream?.codec_name || 'unknown',
        pixFmt: videoStream?.pix_fmt || 'unknown',
        duration: metadata.format?.duration ? Number(metadata.format.duration) : 0,
      });
    });
  });
}

// Parse AVI duration from RIFF header bytes.
// AVI always stores dwMicroSecPerFrame + dwTotalFrames in the 'avih' chunk
// which is in the first ~256 bytes — no need to read the whole file.
function parseAviDurationFromBuffer(buf) {
  try {
    // Scan for the 'avih' FourCC in the buffer
    for (let i = 0; i < buf.length - 32; i++) {
      if (
        buf[i] === 0x61 && buf[i + 1] === 0x76 &&
        buf[i + 2] === 0x69 && buf[i + 3] === 0x68
      ) {
        // Found 'avih' at offset i
        // avih layout (after the 8-byte chunk header):
        //   +0  dwMicroSecPerFrame  (uint32 LE)
        //   +4  dwMaxBytesPerSec
        //   +8  dwPaddingGranularity
        //   +12 dwFlags
        //   +16 dwTotalFrames       (uint32 LE)
        const avihData = i + 8; // skip 'avih' FourCC (4) + chunk size (4)
        if (avihData + 20 > buf.length) break;
        const microSecPerFrame = buf.readUInt32LE(avihData);     // µs per frame
        const totalFrames      = buf.readUInt32LE(avihData + 16); // total frames
        if (microSecPerFrame > 0 && totalFrames > 0) {
          const durationSec = (microSecPerFrame * totalFrames) / 1_000_000;
          if (durationSec > 1) {
            console.log(`[AVI Header] microSecPerFrame=${microSecPerFrame} totalFrames=${totalFrames} → ${Math.round(durationSec)}s`);
            return Math.round(durationSec);
          }
        }
      }
    }
  } catch (e) {
    console.error('[AVI Header Parse Error]', e.message);
  }
  return 0;
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

    // Extract exact duration from Telegram attributes
    let telegramDuration = 0;
    if (document.attributes) {
      const videoAttr = document.attributes.find(a => a.className === 'DocumentAttributeVideo');
      if (videoAttr && videoAttr.duration) {
        telegramDuration = Number(videoAttr.duration);
      }
    }

    let duration = telegramDuration;
    let codec = 'unknown';
    let pixFmt = 'unknown';
    let needsTranscode = isAvi || isNonNative;

    // We probe if:
    // 1. It is a native format (to check if it needs transcode due to codec/pixFmt)
    // 2. OR we don't have a valid duration yet (duration === 0)
    if (!isNonNative || duration === 0) {
      console.log(`[Probe] ${cacheKey}: Downloading header chunk to probe metadata...`);
      try {
        const fileLocation = new Api.InputDocumentFileLocation({
          id: document.id,
          accessHash: document.accessHash,
          fileReference: document.fileReference,
          thumbSize: ''
        });

        if (isAvi && duration === 0) {
          // AVI: parse duration from RIFF 'avih' header — always in first 512 bytes.
          // Do NOT use ffprobe on a truncated AVI — it measures actual frame data,
          // not the total declared duration, giving wrong results (e.g. only 25s).
          const headerChunk = await downloadChunk(fileLocation, 0, 512);
          if (headerChunk && headerChunk.length > 0) {
            const aviDur = parseAviDurationFromBuffer(headerChunk);
            if (aviDur > 0) {
              duration = aviDur;
              console.log(`[AVI Header] ${cacheKey}: Parsed actual duration = ${duration}s`);
            }
          }
        } else if (!isNonNative) {
          // Native MP4/WebM: download 2MB and ffprobe to check codec + duration
          const chunk = await downloadChunk(fileLocation, 0, 2 * 1024 * 1024);
          if (chunk && chunk.length > 0) {
            const probeData = await probeMetadataFromBuffer(chunk);
            codec = probeData.codec;
            pixFmt = probeData.pixFmt;
            if (probeData.duration > 0) {
              duration = Math.round(probeData.duration);
              console.log(`[Probe] ${cacheKey}: Probed actual duration = ${duration}s`);
            }
          }
        }
      } catch (e) {
        console.error(`[Probe] ${cacheKey} chunk probe failed:`, e.message);
      }
    }

    // If it's a native format, check if we actually need transcoding due to incompatible codecs/pixel formats
    if (!needsTranscode) {
      const isUnknownCodec = codec === 'unknown';
      const isIncompatibleCodec = !isUnknownCodec && INCOMPATIBLE_CODECS.has(codec.toLowerCase());
      const isIncompatiblePixFmt = pixFmt !== 'unknown' && INCOMPATIBLE_PIX_FMTS.includes(pixFmt);
      needsTranscode = isIncompatibleCodec || isIncompatiblePixFmt;
    }

    const result = {
      mimeType,
      needsTranscode,
      isAvi,
      codec,
      pixFmt,
      duration,
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

    // ── PRE-BUILT VOD MANIFEST ────────────────────────────────────────────────
    // If we know the duration (from the /metadata endpoint cache), immediately
    // return a complete VOD manifest with all segment entries + #EXT-X-ENDLIST.
    // This tells the mobile player the total duration from the very first second,
    // instead of watching it grow as FFmpeg generates segments one by one.
    const cachedMeta = codecCache.get(`${chatId}_${messageId}`);
    let knownDuration = cachedMeta?.duration || 0;

    // If no cached duration yet, fall back to DB duration immediately
    // so the player sees the correct total time even on first play
    if (!knownDuration) {
      knownDuration = await getDurationFromDb(messageId);
    }
    const HLS_SEG_TIME = 6;

    if (knownDuration > 0) {
      console.log(`[HLS] Serving pre-built VOD manifest for ${transcodeId} (duration=${knownDuration}s)`);

      // Build full segment list based on known duration
      const numSegments = Math.ceil(knownDuration / HLS_SEG_TIME);
      const lines = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        `#EXT-X-TARGETDURATION:${HLS_SEG_TIME}`,
        '#EXT-X-MEDIA-SEQUENCE:0',
        '#EXT-X-PLAYLIST-TYPE:VOD',
      ];
      for (let i = 0; i < numSegments; i++) {
        const segDur = Math.min(HLS_SEG_TIME, knownDuration - i * HLS_SEG_TIME);
        lines.push(`#EXTINF:${segDur.toFixed(3)},`);
        // Reference segments relative to the static serving path
        lines.push(`/api/stream/hls/${chatId}/${messageId}/${startSeconds}/segment_${String(i).padStart(3, '0')}.ts`);
      }
      lines.push('#EXT-X-ENDLIST');

      // Kick off background transcode if not already running
      if (!activeTranscodes.has(transcodeId) && !fs.existsSync(playlistPath)) {
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        activeTranscodes.set(transcodeId, { startedAt: Date.now() });

        const messages2 = await client.getMessages(chatId, { ids: [messageId] });
        const doc2 = messages2?.[0]?.media?.document;
        if (doc2) {
          const internalUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/stream/${chatId}/${messageId}`;
          const inOpts = [
            '-fflags', '+genpts+igndts', '-avoid_negative_ts', 'make_zero',
            '-thread_queue_size', '512', '-analyzeduration', '2M', '-probesize', '2M',
          ];
          if (startSeconds > 0) inOpts.unshift('-ss', String(startSeconds));

          ffmpeg(internalUrl)
            .inputOptions(inOpts)
            .videoCodec('libx264').audioCodec('aac')
            .outputOptions([
              '-map', '0:v:0', '-map', '0:a:0',
              '-preset', 'ultrafast', '-crf', '28', '-threads', '2',
              '-pix_fmt', 'yuv420p',
              '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
              '-g', '48', '-keyint_min', '48', '-sc_threshold', '0',
              '-b:a', '128k', '-ac', '2', '-ar', '44100', '-af', 'aresample=async=1000',
              `-hls_time`, String(HLS_SEG_TIME),
              '-hls_list_size', '0',
              '-hls_flags', 'independent_segments',
              '-hls_segment_type', 'mpegts',
              '-hls_playlist_type', 'vod',
              '-start_number', '0',
              '-hls_segment_filename', path.join(outDir, 'segment_%03d.ts'),
              '-f', 'hls',
            ])
            .output(playlistPath)
            .on('start', () => console.log(`[HLS FFmpeg] Started: ${transcodeId}`))
            .on('end', () => { console.log(`[HLS FFmpeg] Done: ${transcodeId}`); activeTranscodes.delete(transcodeId); })
            .on('error', (e) => { if (!e.message.includes('SIGKILL')) console.error(`[HLS FFmpeg] Error: ${e.message}`); activeTranscodes.delete(transcodeId); })
            .run();
        }
      }

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(lines.join('\n'));
    }

    // ── FALLBACK (no cached duration): wait for FFmpeg to write playlist ──────
    if (activeTranscodes.has(transcodeId)) {
      for (let i = 0; i < 60; i++) {
        if (fs.existsSync(playlistPath)) return res.redirect(staticUrl);
        await new Promise(r => setTimeout(r, 500));
      }
      return res.status(500).json({ error: 'Playlist generation timeout' });
    }

    if (fs.existsSync(playlistPath)) return res.redirect(staticUrl);

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    activeTranscodes.set(transcodeId, { startedAt: Date.now() });

    const messages = await client.getMessages(chatId, { ids: [messageId] });
    if (!messages?.[0]?.media?.document) {
      activeTranscodes.delete(transcodeId);
      return res.status(404).send('Video document not found.');
    }

    const document = messages[0].media.document;
    const mimeType = document.mimeType || 'video/mp4';
    const internalStreamUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/stream/${chatId}/${messageId}`;
    console.log(`[HLS FFmpeg] Fallback starting: ${transcodeId} | mime=${mimeType}`);

    const inputOptions = [
      '-fflags', '+genpts+igndts', '-avoid_negative_ts', 'make_zero',
      '-thread_queue_size', '512', '-analyzeduration', '2M', '-probesize', '2M',
    ];
    if (startSeconds > 0) inputOptions.unshift('-ss', String(startSeconds));

    ffmpeg(internalStreamUrl)
      .inputOptions(inputOptions)
      .videoCodec('libx264').audioCodec('aac')
      .outputOptions([
        '-map', '0:v:0', '-map', '0:a:0',
        '-preset', 'ultrafast', '-crf', '28', '-threads', '2',
        '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-g', '48', '-keyint_min', '48', '-sc_threshold', '0',
        '-b:a', '128k', '-ac', '2', '-ar', '44100', '-af', 'aresample=async=1000',
        `-hls_time`, String(HLS_SEG_TIME), '-hls_list_size', '0',
        '-hls_flags', 'independent_segments+append_list',
        '-hls_segment_type', 'mpegts', '-hls_playlist_type', 'event',
        '-start_number', '0',
        '-hls_segment_filename', path.join(outDir, 'segment_%03d.ts'),
        '-f', 'hls',
      ])
      .output(playlistPath)
      .on('start', () => console.log(`[HLS FFmpeg] Started fallback: ${transcodeId}`))
      .on('end', () => { activeTranscodes.delete(transcodeId); })
      .on('error', (err) => { if (!err.message.includes('SIGKILL')) console.error(`[HLS] Error: ${err.message}`); activeTranscodes.delete(transcodeId); })
      .run();

    for (let i = 0; i < 120; i++) {
      if (fs.existsSync(playlistPath)) return res.redirect(staticUrl);
      await new Promise(r => setTimeout(r, 500));
    }

    res.status(500).json({ error: 'Playlist generation timeout' });

  } catch (err) {
    console.error('HLS Stream Error:', err.message);
    res.status(500).send('HLS Streaming error');
  }
});

// ── GET /api/stream/hls/:chatId/:messageId/:startSeconds/:segment.ts ─────────
// Seek-aware segment server. When the requested segment is too far ahead of the
// current transcode, a new FFmpeg process is started at the seek position.
const seekTranscodeMap = new Map(); // videoKey → { outDir, baseSegNum, transcodeId }

router.get('/hls/:chatId/:messageId/:startSeconds/:segmentFile', async (req, res) => {
  const { chatId, messageId, startSeconds, segmentFile } = req.params;
  if (!segmentFile.endsWith('.ts')) return res.status(404).send('Not found');

  const segMatch = segmentFile.match(/segment_(\d+)\.ts/);
  if (!segMatch) return res.status(404).send('Invalid segment name');

  const requestedSegNum = parseInt(segMatch[1], 10);
  const HLS_SEG_TIME = 6;
  const videoKey = `${chatId}_${messageId}`;
  const SEEK_AHEAD_THRESHOLD = 15; // segments (~90s) — if farther, start a seek transcode

  // ── Helper: count existing .ts segments in a directory ───────────────────
  const countSegs = (dir) => {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter(f => f.endsWith('.ts')).length;
  };

  // ── Helper: start a new FFmpeg transcode at a given time offset ───────────
  const startSeekTranscode = (seekTime, outDir, seekTranscodeId) => {
    if (activeTranscodes.has(seekTranscodeId)) return;
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    activeTranscodes.set(seekTranscodeId, { startedAt: Date.now() });

    const internalUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/stream/${chatId}/${messageId}`;
    const inOpts = [
      '-fflags', '+genpts+igndts', '-avoid_negative_ts', 'make_zero',
      '-thread_queue_size', '512', '-analyzeduration', '2M', '-probesize', '2M',
    ];
    if (seekTime > 0) inOpts.unshift('-ss', String(seekTime));

    ffmpeg(internalUrl)
      .inputOptions(inOpts)
      .videoCodec('libx264').audioCodec('aac')
      .outputOptions([
        '-map', '0:v:0', '-map', '0:a:0',
        '-preset', 'ultrafast', '-crf', '28', '-threads', '2',
        '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-g', '48', '-keyint_min', '48', '-sc_threshold', '0',
        '-b:a', '128k', '-ac', '2', '-ar', '44100', '-af', 'aresample=async=1000',
        `-hls_time`, String(HLS_SEG_TIME), '-hls_list_size', '0',
        '-hls_flags', 'independent_segments',
        '-hls_segment_type', 'mpegts', '-hls_playlist_type', 'vod',
        '-start_number', '0',
        '-hls_segment_filename', path.join(outDir, 'segment_%03d.ts'),
        '-f', 'hls',
      ])
      .output(path.join(outDir, 'playlist.m3u8'))
      .on('start', () => console.log(`[Seek FFmpeg] Started at ${seekTime}s: ${seekTranscodeId}`))
      .on('end', () => { activeTranscodes.delete(seekTranscodeId); })
      .on('error', (e) => { if (!e.message.includes('SIGKILL')) console.error(`[Seek FFmpeg] Error: ${e.message}`); activeTranscodes.delete(seekTranscodeId); })
      .run();
  };

  // ── Determine which transcode to use ─────────────────────────────────────
  let seekInfo = seekTranscodeMap.get(videoKey);
  let localSegNum;

  if (seekInfo) {
    localSegNum = requestedSegNum - seekInfo.baseSegNum;
    const existingCount = countSegs(seekInfo.outDir);

    // Is this segment too far ahead of current transcode? Start a new seek.
    if (localSegNum < 0 || localSegNum > existingCount + SEEK_AHEAD_THRESHOLD) {
      seekInfo = null; // fall through to create new seek transcode
    }
  }

  if (!seekInfo) {
    // No mapping yet OR seek to a distant position → start transcode at seek time
    const seekTime = requestedSegNum * HLS_SEG_TIME;
    const seekTranscodeId = `${chatId}_${messageId}_seek_${seekTime}`;
    const seekOutDir = path.join(HLS_DIR, String(chatId), String(messageId), `seek_${seekTime}`);

    seekInfo = { outDir: seekOutDir, baseSegNum: requestedSegNum, transcodeId: seekTranscodeId };
    seekTranscodeMap.set(videoKey, seekInfo);
    localSegNum = 0;

    console.log(`[Seek] Starting new transcode at ${seekTime}s for segment_${requestedSegNum}`);
    startSeekTranscode(seekTime, seekOutDir, seekTranscodeId);
  }

  // ── Poll for the local segment file ──────────────────────────────────────
  const localSegFile = `segment_${String(localSegNum).padStart(3, '0')}.ts`;
  const segmentPath = path.join(seekInfo.outDir, localSegFile);

  const deadline = Date.now() + 60000; // 60s timeout
  while (Date.now() < deadline) {
    if (fs.existsSync(segmentPath)) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(segmentPath);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.warn(`[Segment] Timeout: ${segmentFile} (local: ${localSegFile})`);
  res.status(504).send('Segment not ready in time');
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

// Helper: parse "1h 45m", "105", "2h", "45m" → seconds
function parseDurationToSeconds(str) {
  if (!str) return 0;
  const s = String(str).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10) * 60; // plain number = minutes
  let total = 0;
  const h = s.match(/(\d+)\s*h/i);
  const m = s.match(/(\d+)\s*m/i);
  if (h) total += parseInt(h[1], 10) * 3600;
  if (m) total += parseInt(m[1], 10) * 60;
  return total;
}

// Helper: look up duration (in seconds) from Movie or Series DB by Telegram messageId
async function getDurationFromDb(messageId) {
  try {
    const mid = String(messageId);

    // Try Movie first
    const movie = await Movie.findOne({ 'telegram.messageId': mid }).select('duration').lean();
    if (movie?.duration) {
      const secs = parseDurationToSeconds(movie.duration);
      if (secs > 0) { console.log(`[DB Duration] Movie found: ${secs}s`); return secs; }
    }

    // Try Series episodes
    const series = await Series.findOne({
      'seasons.episodes.telegramMessageId': mid
    }).select('seasons').lean();

    if (series) {
      for (const season of series.seasons || []) {
        for (const ep of season.episodes || []) {
          if (String(ep.telegramMessageId) === mid && ep.duration) {
            const secs = parseDurationToSeconds(ep.duration);
            if (secs > 0) { console.log(`[DB Duration] Episode found: ${secs}s`); return secs; }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[getDurationFromDb] Error:', e.message);
  }
  return 0;
}

module.exports = router;
import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOVIES } from '../data/movies';
import { useAuth } from '../context/AuthContext';
import { useMyList } from '../hooks/useMyList';
import Hls from 'hls.js';
import { FaPlay, FaPause, FaStar, FaFire } from 'react-icons/fa';
import {
  BiVolumeFull, BiVolumeMute, BiFullscreen, BiExitFullscreen, BiMoviePlay,
} from 'react-icons/bi';
import { MdReplay10, MdForward10, MdArrowBack } from 'react-icons/md';
import { FiPlus, FiCheck } from 'react-icons/fi';
import styles from './WatchPage.module.css';

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(s) {
  if (!s || !isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function parseDuration(str) {
  if (!str) return 0;
  let h = 0, m = 0;
  const hMatch = str.match(/(\d+)h/);
  const mMatch = str.match(/(\d+)m/);
  if (hMatch) h = parseInt(hMatch[1], 10);
  if (mMatch) m = parseInt(mMatch[1], 10);
  return h * 3600 + m * 60;
}

// Rank similar movies: more shared genres = higher score, then prefer closer year
function getSimilar(current, all) {
  const currentGenres = current.genre.split(' • ');
  return all
    .filter(m => m.id !== current.id)
    .map(m => {
      const sharedGenres = m.genre.split(' • ').filter(g => currentGenres.includes(g)).length;
      const yearDiff = Math.abs(m.year - current.year);
      return { movie: m, score: sharedGenres * 10 - Math.floor(yearDiff / 5) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(x => x.movie);
}

// ── CustomPlayer ──────────────────────────────────────────────────────────────
function CustomPlayer({ movie, showUI, onUIActivity, user, token, updateUser }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const hlsRef = useRef(null);
  const dblClickTimer = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('mtmovies_volume');
    return saved !== null ? Number(saved) : 1;
  });
  const [muted, setMuted] = useState(() => {
    return localStorage.getItem('mtmovies_muted') === 'true';
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSkipFlash, setShowSkipFlash] = useState(null);
  const [showPlayFlash, setShowPlayFlash] = useState(null);
  const [streamMeta, setStreamMeta] = useState(null);
  const [buffering, setBuffering] = useState(true);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [hlsStartTime, setHlsStartTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [forceHls, setForceHls] = useState(false); // auto-fallback for black-screen MP4s
  const { toggleMyList, isInMyList } = useMyList();

  const isTelegram = !!(movie.telegramChatId && movie.telegramMessageId);

  const [initialOffset] = useState(() => {
    if (user && user.watchHistory) {
      const h = user.watchHistory.find(x => x.movieId === String(movie.id));
      if (h && h.progress > 0) return h.progress;
    }
    return 0;
  });

  // Fetch metadata — now includes real FFprobe codec detection (first 2MB downloaded)
  const [isProbing, setIsProbing] = useState(false);
  useEffect(() => {
    if (!isTelegram) return;
    setIsProbing(true);
    fetch(`https://mtmovies-production.up.railway.app/api/stream/${movie.telegramChatId}/${movie.telegramMessageId}/metadata`)
      .then(r => r.json())
      .then(meta => {
        console.log(`[Meta] codec=${meta.codec} pix_fmt=${meta.pixFmt} needsTranscode=${meta.needsTranscode}`);
        if (meta.needsTranscode && initialOffset > 0) {
          setHlsStartTime(initialOffset);
        }
        setStreamMeta(meta);
      })
      .catch(console.error)
      .finally(() => setIsProbing(false));
  }, [movie.id, isTelegram, movie.telegramChatId, movie.telegramMessageId, initialOffset]);

  // Guard — AVI must NEVER bypass HLS, even if metadata fetch is slow/wrong
  const isAviMime = streamMeta?.mimeType === 'video/avi' || streamMeta?.mimeType === 'video/x-msvideo';
  const useHls = streamMeta?.needsTranscode || isAviMime || forceHls;
  let src = null;
  if (isTelegram && streamMeta && !useHls) {
    src = `https://mtmovies-production.up.railway.app/api/stream/${movie.telegramChatId}/${movie.telegramMessageId}`;
  }

  // Auto-detect black screen: if native MP4 is playing but videoWidth=0, the codec
  // is unsupported (H.265/HEVC, 10-bit, etc.). Switch to HLS automatically.
  // Auto-detect black screen: if native MP4 is playing but videoWidth=0 → switch to HLS
  useEffect(() => {
    if (!src || !videoRef.current) return;
    const v = videoRef.current;
    const onPlay = () => setTimeout(() => {
      if (v.videoWidth === 0) {
        console.warn('[Stream] Black screen on movie — auto-switching to HLS');
        setHlsStartTime(v.currentTime);
        setForceHls(true);
      }
    }, 2500);
    v.addEventListener('playing', onPlay);
    return () => v.removeEventListener('playing', onPlay);
  }, [src]);

  // ── initialize HLS if needed ─────────────────────────────────────────────
  useEffect(() => {
    if (!isTelegram || !useHls || !videoRef.current) return;

    let hls;
    const v = videoRef.current;
    const query = hlsStartTime > 0 ? `?start=${Math.floor(hlsStartTime)}` : '';
    const hlsSrc = `https://mtmovies-production.up.railway.app/api/stream/hls/${movie.telegramChatId}/${movie.telegramMessageId}/playlist.m3u8${query}`;

    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 60 * 5, // buffer up to 5 minutes ahead
        maxMaxBufferLength: 60 * 10,
        autoStartLoad: true,
      });
      hls.loadSource(hlsSrc);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        v.play().catch(e => console.log(e));
        setPlaying(true);
        setBuffering(false);
      });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari Native HLS
      v.src = hlsSrc;
      v.addEventListener('loadedmetadata', () => {
        v.play().catch(e => console.log(e));
        setPlaying(true);
        setBuffering(false);
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [useHls, movie.telegramChatId, movie.telegramMessageId, hlsStartTime]);

  const hasResumedRef = useRef(false);
  const onTimeUpdate = () => {
    if (isSeeking) return;
    const v = videoRef.current;
    if (!v) return;
    const currentAbs = useHls ? v.currentTime + hlsStartTime : v.currentTime;
    setCurrentTime(currentAbs);
    if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
  };
  const onLoaded = () => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;

      if (useHls) {
        // HLS stream starts at hlsStartTime — its reported duration is only the
        // remaining portion. Use the stored metadata string for the real duration.
        setDuration(parseDuration(movie.duration));
        // Do NOT resume from history here: FFmpeg already starts at the right offset.
      } else {
        setDuration(videoRef.current.duration);
        // Resume from history once, only for native streams
        if (user && user.watchHistory && !hasResumedRef.current) {
          hasResumedRef.current = true;
          const historyItem = user.watchHistory.find(h => h.movieId === String(movie.id));
          if (historyItem && historyItem.progress > 0 && historyItem.progress < videoRef.current.duration - 15) {
            videoRef.current.currentTime = historyItem.progress;
          }
        }
      }
    }
  };

  // ── save history ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTelegram || !token) return;

    const interval = setInterval(async () => {
      const v = videoRef.current;
      if (v && !v.paused && v.currentTime > 5) {
        try {
          const realTime = useHls ? v.currentTime + hlsStartTime : v.currentTime;
          await fetch('https://mtmovies-production.up.railway.app/api/users/history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ movieId: String(movie.id), progress: realTime })
          });

          // update local context so Browse gets it instantly when we go back
          const newHistory = [...(user.watchHistory || [])];
          const idx = newHistory.findIndex(h => h.movieId === String(movie.id));
          if (idx !== -1) {
            newHistory[idx].progress = realTime;
            newHistory[idx].watchedAt = new Date().toISOString();
          } else {
            newHistory.push({ movieId: String(movie.id), progress: realTime, watchedAt: new Date().toISOString() });
          }
          updateUser({ ...user, watchHistory: newHistory });

        } catch (e) {
          console.error('Failed to save history', e);
        }
      }
    }, 10000); // Save every 10 seconds

    return () => clearInterval(interval);
  }, [movie.id, isTelegram, token, user, updateUser, useHls, hlsStartTime]);

  // ── lock orientation on mobile ────────────────────────────────────────────
  useEffect(() => {
    const lockLandscape = async () => {
      if (window.innerWidth > 768) return; // Only on mobile
      try {
        if (window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape');
        } else if (window.screen.lockOrientation) {
          window.screen.lockOrientation('landscape');
        }
      } catch (err) {
        console.log("Auto-orientation lock failed (likely needs fullscreen/gesture first):", err);
      }
    };

    lockLandscape();

    return () => {
      try {
        if (window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        } else if (window.screen.unlockOrientation) {
          window.screen.unlockOrientation();
        }
      } catch (err) {
        // ignore
      }
    };
  }, []);

  // ── actions ───────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
      setShowPlayFlash('play');
    } else {
      v.pause();
      setPlaying(false);
      setShowPlayFlash('pause');
    }
    setTimeout(() => setShowPlayFlash(null), 600);
  }, []);

  const skip = useCallback((secs) => {
    setShowSkipFlash(secs > 0 ? 'fwd' : 'bck');
    setTimeout(() => setShowSkipFlash(null), 600);

    const v = videoRef.current;
    if (!v) return;
    v.currentTime += secs;
    const currentAbs = useHls ? v.currentTime + hlsStartTime : v.currentTime;
    setCurrentTime(currentAbs); // instantly update visually
    v.play().catch(e => console.log(e));
    setPlaying(true);
  }, [streamMeta, useHls, hlsStartTime]);

  const getProgressPct = (clientX) => {
    if (!progressRef.current || duration === 0) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const seek = (e) => {
    const pct = getProgressPct(e.clientX);
    const targetAbsoluteTime = pct * duration;
    const targetRelativeTime = useHls ? targetAbsoluteTime - hlsStartTime : targetAbsoluteTime;

    // Instantly update the visual progress bar and time label
    setCurrentTime(targetAbsoluteTime);

    const needsRestartHls = useHls && (targetRelativeTime < -15 || targetRelativeTime > buffered + 15);

    if (needsRestartHls) {
      setHlsStartTime(targetAbsoluteTime);
      setBuffering(true);
      setPlaying(true);
      return;
    }

    if (videoRef.current) {
      videoRef.current.currentTime = targetRelativeTime;
      videoRef.current.play().catch(e => console.log(e));
      setPlaying(true);
      if (targetRelativeTime > buffered + 10) {
        setBuffering(true);
      }
    }
  };

  const startSeeking = (e) => {
    setIsSeeking(true);
    seek(e);
  };

  const stopSeeking = () => {
    setIsSeeking(false);
  };

  useEffect(() => {
    if (!isSeeking) return;
    const onPointerUp = () => setIsSeeking(false);
    window.addEventListener('pointerup', onPointerUp);
    return () => window.removeEventListener('pointerup', onPointerUp);
  }, [isSeeking]);

  const handleProgressHover = (e) => {
    if (!progressRef.current || duration === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(pct * 100);
    setHoverTime(pct * duration);
    if (isSeeking) seek(e);
  };

  const changeVolume = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    localStorage.setItem('mtmovies_volume', v);
    if (videoRef.current) videoRef.current.volume = v;
    setMuted(v === 0);
    localStorage.setItem('mtmovies_muted', v === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    localStorage.setItem('mtmovies_muted', v.muted);
  };

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
        if (window.innerWidth <= 768 && window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape');
        }
      } catch (err) {
        console.log("Fullscreen/Lock failed:", err);
      }
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      if (window.innerWidth <= 768 && window.screen.orientation && window.screen.orientation.unlock) {
        window.screen.orientation.unlock();
      }
      setFullscreen(false);
    }
  }, []);

  // ── single click = play/pause | double click = fullscreen ─────────────────
  const handleClick = (e) => {
    e.stopPropagation();
    onUIActivity();
    if (dblClickTimer.current) {
      // second click came in quickly → double-click detected
      clearTimeout(dblClickTimer.current);
      dblClickTimer.current = null;
      toggleFullscreen();
    } else {
      dblClickTimer.current = setTimeout(() => {
        dblClickTimer.current = null;
        togglePlay();
      }, 250);
    }
  };

  // ── keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowRight') skip(10);
      if (e.code === 'ArrowLeft') skip(-10);
      if (e.code === 'KeyF') toggleFullscreen();
      if (e.code === 'KeyM') toggleMute();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, skip, toggleFullscreen]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufProgress = duration > 0 ? ((useHls ? buffered + hlsStartTime : buffered) / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`${styles.playerWrap} ${showUI ? '' : styles.hideCursor}`}
      onMouseMove={onUIActivity}
      onClick={handleClick}
    >
      {/* ── video ── */}
      {isTelegram ? (
        <video
          ref={videoRef}
          src={src || undefined}
          className={styles.video}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoaded}
          onPlay={() => { setPlaying(true); setBuffering(false); }}
          onPause={() => setPlaying(false)}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          disablePictureInPicture
          autoPlay
        />
      ) : (
        <div className={styles.youtubeWrap}>
          <iframe
            src={`https://www.youtube.com/embed/${movie.trailerEmbedId}?autoplay=1&rel=0&modestbranding=1`}
            title={movie.title}
            className={styles.youtubeIframe}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen"
            allowFullScreen
          />
        </div>
      )}

      {/* ── probing overlay: shown while FFprobe detects codec ── */}
      {isProbing && isTelegram && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}

      {/* ── buffering overlay ── */}
      {!isProbing && buffering && isTelegram && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}

      {/* ── skip flash ── */}
      {showSkipFlash && (
        <div className={`${styles.skipFlash} ${showSkipFlash === 'fwd' ? styles.skipRight : styles.skipLeft}`}>
          {showSkipFlash === 'fwd' ? <MdForward10 size={54} /> : <MdReplay10 size={54} />}
        </div>
      )}

      {/* ── play/pause flash ── */}
      {showPlayFlash && (
        <div className={styles.playFlash}>
          {showPlayFlash === 'play' ? <FaPlay size={40} style={{ marginLeft: '4px' }} /> : <FaPause size={40} />}
        </div>
      )}

      {/* ── controls (Telegram only) ── */}
      {isTelegram && (
        <div
          className={`${styles.controls} ${showUI ? styles.controlsVisible : ''}`}
          onClick={e => e.stopPropagation()}
        >
          <div
            className={styles.progressArea}
            ref={progressRef}
            onClick={seek}
            onPointerDown={startSeeking}
            onPointerMove={handleProgressHover}
            onPointerUp={stopSeeking}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            <div className={styles.progressBg}>
              <div className={styles.progressBuf} style={{ width: `${bufProgress}%` }} />
              <div className={styles.progressFill} style={{ width: `${progress}%` }}>
                <div className={styles.progressThumb} />
              </div>
              {hoverTime !== null && (
                <div className={styles.progressHoverTooltip} style={{ left: `${hoverPos}%` }}>
                  {fmt(hoverTime)}
                </div>
              )}
            </div>
          </div>

          <div className={styles.btnRow}>
            <div className={styles.btnLeft}>
              <button className={styles.iconBtn} onClick={togglePlay}>
                {playing ? <FaPause size={20} /> : <FaPlay size={20} style={{ marginLeft: '2px' }} />}
              </button>
              <button className={styles.iconBtn} onClick={() => skip(-10)} title="Rewind 10s">
                <MdReplay10 size={24} />
              </button>
              <button className={styles.iconBtn} onClick={() => skip(10)} title="Forward 10s">
                <MdForward10 size={24} />
              </button>
              <button className={styles.iconBtn} onClick={toggleMute}>
                {muted || volume === 0 ? <BiVolumeMute size={22} /> : <BiVolumeFull size={22} />}
              </button>
              <input
                type="range" min="0" max="1" step="0.05"
                value={muted ? 0 : volume}
                onChange={changeVolume}
                className={styles.volumeSlider}
              />
              <span className={styles.timeLabel}>{fmt(currentTime)} / {duration ? fmt(duration) : '--:--'}</span>
            </div>

            <div className={styles.btnCenter}>
              {movie.title}
            </div>

            <div className={styles.btnRight}>
              {movie.isTrailer && (
                <span className={styles.trailerBadge}><BiMoviePlay size={16} style={{ marginRight: 4 }} /> Official Trailer</span>
              )}
              <button
                className={styles.iconBtn}
                onClick={() => toggleMyList(movie)}
                style={{ fontSize: '0.9rem', width: 'auto', padding: '0 8px' }}
              >
                {isInMyList(movie.id) ? <><FiCheck size={18} style={{ marginRight: '4px' }} /> In List</> : <><FiPlus size={18} style={{ marginRight: '4px' }} /> My List</>}
              </button>
              <button className={styles.iconBtn} onClick={toggleFullscreen}>
                {fullscreen ? <BiExitFullscreen size={22} /> : <BiFullscreen size={22} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WatchPage ─────────────────────────────────────────────────────────────────
export default function WatchPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, updateUser, isAuthenticated } = useAuth();
  const [showUI, setShowUI] = useState(true);
  const hideTimer = useRef(null);

  // shared UI activity handler — controls + back button + cursor all fade together
  const onUIActivity = useCallback(() => {
    setShowUI(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUI(false), 3000);
  }, []);

  useEffect(() => {
    onUIActivity();
    return () => clearTimeout(hideTimer.current);
  }, [onUIActivity]);

  if (!isAuthenticated) { navigate('/login'); return null; }

  const movie = MOVIES.find(m => String(m.id) === id);
  if (!movie) { navigate('/browse'); return null; }

  const similar = getSimilar(movie, MOVIES);

  return (
    <div
      className={`${styles.page} ${showUI ? '' : styles.hideCursor}`}
      onMouseMove={onUIActivity}
    >
      {/* Back button — fades with controls */}
      <button
        className={`${styles.backBtn} ${showUI ? styles.backBtnVisible : ''}`}
        onClick={() => navigate('/browse')}
      >
        <MdArrowBack size={22} />
      </button>

      {/* Player */}
      <CustomPlayer
        movie={movie}
        showUI={showUI}
        onUIActivity={onUIActivity}
        user={user}
        token={token}
        updateUser={updateUser}
      />
    </div>
  );
}

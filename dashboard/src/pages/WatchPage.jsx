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
function CustomPlayer({ movie, showUI, onUIActivity, onToggleUI, user, token, updateUser }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const hlsRef = useRef(null);
  const dblTapTimer = useRef(null);
  const navigate = useNavigate();

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
  const [showSkipFlash, setShowSkipFlash] = useState(null); // 'fwd' | 'bck'
  const [showPlayFlash, setShowPlayFlash] = useState(null);
  const [streamMeta, setStreamMeta] = useState(null);
  const [buffering, setBuffering] = useState(true);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [hlsStartTime, setHlsStartTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [forceHls, setForceHls] = useState(false);
  const [isMobile] = useState(() => window.innerWidth <= 768);
  const { toggleMyList, isInMyList } = useMyList();

  const isTelegram = !!(movie.telegramChatId && movie.telegramMessageId);

  const [initialOffset] = useState(() => {
    if (user && user.watchHistory) {
      const h = user.watchHistory.find(x => x.movieId === String(movie.id));
      if (h && h.progress > 0) return h.progress;
    }
    return 0;
  });

  const [isProbing, setIsProbing] = useState(false);
  useEffect(() => {
    if (!isTelegram) return;
    setIsProbing(true);
    fetch(`https://mtmovies-production.up.railway.app/api/stream/${movie.telegramChatId}/${movie.telegramMessageId}/metadata`)
      .then(r => r.json())
      .then(meta => {
        if (meta.needsTranscode && initialOffset > 0) {
          setHlsStartTime(initialOffset);
        }
        setStreamMeta(meta);
      })
      .catch(console.error)
      .finally(() => setIsProbing(false));
  }, [movie.id, isTelegram, movie.telegramChatId, movie.telegramMessageId, initialOffset]);

  const isAviMime = streamMeta?.mimeType === 'video/avi' || streamMeta?.mimeType === 'video/x-msvideo';
  const useHls = streamMeta?.needsTranscode || isAviMime || forceHls;
  let src = null;
  if (isTelegram && streamMeta && !useHls) {
    src = `https://mtmovies-production.up.railway.app/api/stream/${movie.telegramChatId}/${movie.telegramMessageId}`;
  }

  useEffect(() => {
    if (!src || !videoRef.current) return;
    const v = videoRef.current;
    const onPlay = () => setTimeout(() => {
      if (v.videoWidth === 0) {
        setHlsStartTime(v.currentTime);
        setForceHls(true);
      }
    }, 2500);
    v.addEventListener('playing', onPlay);
    return () => v.removeEventListener('playing', onPlay);
  }, [src]);

  // ── initialize HLS ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTelegram || !useHls || !videoRef.current) return;
    let hls;
    const v = videoRef.current;
    const query = hlsStartTime > 0 ? `?start=${Math.floor(hlsStartTime)}` : '';
    const hlsSrc = `https://mtmovies-production.up.railway.app/api/stream/hls/${movie.telegramChatId}/${movie.telegramMessageId}/playlist.m3u8${query}`;

    if (Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 60 * 5, maxMaxBufferLength: 60 * 10, autoStartLoad: true });
      hls.loadSource(hlsSrc);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        v.play().catch(e => console.log(e));
        setPlaying(true);
        setBuffering(false);
      });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = hlsSrc;
      v.addEventListener('loadedmetadata', () => {
        v.play().catch(e => console.log(e));
        setPlaying(true);
        setBuffering(false);
      });
    }

    return () => {
      if (hls) { hls.destroy(); hlsRef.current = null; }
    };
  }, [useHls, movie.telegramChatId, movie.telegramMessageId, hlsStartTime]);

  // ── Auto fullscreen on mobile ────────────────────────────────────────────
  useEffect(() => {
    if (!isMobile) return;
    const enterFs = async () => {
      try {
        if (containerRef.current && !document.fullscreenElement) {
          await containerRef.current.requestFullscreen();
          setFullscreen(true);
        }
        if (window.screen.orientation?.lock) {
          await window.screen.orientation.lock('landscape');
        }
      } catch (err) {
        console.log('Auto-fullscreen failed:', err);
      }
    };
    // Small delay so the page has rendered
    const t = setTimeout(enterFs, 300);
    return () => clearTimeout(t);
  }, [isMobile]);

  // ── Cleanup fullscreen/orientation on unmount ─────────────────────────────
  useEffect(() => {
    return () => {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        if (window.screen.orientation?.unlock) window.screen.orientation.unlock();
      } catch { /* ignore */ }
    };
  }, []);

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
        setDuration(parseDuration(movie.duration));
      } else {
        setDuration(videoRef.current.duration);
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

  // ── save history ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTelegram || !token) return;
    const interval = setInterval(async () => {
      const v = videoRef.current;
      if (v && !v.paused && v.currentTime > 5) {
        try {
          const realTime = useHls ? v.currentTime + hlsStartTime : v.currentTime;
          await fetch('https://mtmovies-production.up.railway.app/api/users/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ movieId: String(movie.id), progress: realTime })
          });
          const newHistory = [...(user.watchHistory || [])];
          const idx = newHistory.findIndex(h => h.movieId === String(movie.id));
          if (idx !== -1) {
            newHistory[idx].progress = realTime;
            newHistory[idx].watchedAt = new Date().toISOString();
          } else {
            newHistory.push({ movieId: String(movie.id), progress: realTime, watchedAt: new Date().toISOString() });
          }
          updateUser({ ...user, watchHistory: newHistory });
        } catch (e) { console.error('Failed to save history', e); }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [movie.id, isTelegram, token, user, updateUser, useHls, hlsStartTime]);

  // ── actions ──────────────────────────────────────────────────────────────
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
    setCurrentTime(currentAbs);
    v.play().catch(e => console.log(e));
    setPlaying(true);
  }, [useHls, hlsStartTime]);

  const getProgressPct = (clientX) => {
    if (!progressRef.current || duration === 0) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const seek = (e) => {
    const pct = getProgressPct(e.clientX);
    const targetAbsoluteTime = pct * duration;
    const targetRelativeTime = useHls ? targetAbsoluteTime - hlsStartTime : targetAbsoluteTime;
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
      if (targetRelativeTime > buffered + 10) setBuffering(true);
    }
  };

  const startSeeking = (e) => { setIsSeeking(true); seek(e); };
  const stopSeeking = () => setIsSeeking(false);

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
        if (window.screen.orientation?.lock) await window.screen.orientation.lock('landscape');
      } catch (err) { console.log('Fullscreen failed:', err); }
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      if (window.screen.orientation?.unlock) window.screen.orientation.unlock();
      setFullscreen(false);
    }
  }, []);

  // ── tap/click handling ────────────────────────────────────────────────────
  // Mobile: single tap = toggle controls visibility; double tap left/right = ±10s
  // Desktop: single click = toggle play; double click = fullscreen
  const handleVideoTap = useCallback((e) => {
    e.stopPropagation();

    if (isMobile) {
      // determine which half was tapped for double-tap skip
      const rect = e.currentTarget.getBoundingClientRect();
      const tapX = e.clientX - rect.left;
      const isRightSide = tapX > rect.width / 2;

      if (dblTapTimer.current) {
        // double tap
        clearTimeout(dblTapTimer.current);
        dblTapTimer.current = null;
        skip(isRightSide ? 10 : -10);
        // keep controls visible after skip
        onUIActivity();
      } else {
        dblTapTimer.current = setTimeout(() => {
          dblTapTimer.current = null;
          // single tap: just toggle controls
          onToggleUI();
        }, 250);
      }
    } else {
      // Desktop: single click = toggle play, double click = fullscreen
      if (dblTapTimer.current) {
        clearTimeout(dblTapTimer.current);
        dblTapTimer.current = null;
        toggleFullscreen();
      } else {
        dblTapTimer.current = setTimeout(() => {
          dblTapTimer.current = null;
          togglePlay();
        }, 250);
      }
      onUIActivity();
    }
  }, [isMobile, skip, onUIActivity, onToggleUI, togglePlay, toggleFullscreen]);

  // ── keyboard shortcuts ────────────────────────────────────────────────────
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
      onMouseMove={!isMobile ? onUIActivity : undefined}
      onClick={handleVideoTap}
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

      {/* ── probing / buffering overlay ── */}
      {(isProbing || (!isProbing && buffering)) && isTelegram && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}

      {/* ── double-tap skip flash ── */}
      {showSkipFlash && (
        <div className={`${styles.skipFlash} ${showSkipFlash === 'fwd' ? styles.skipRight : styles.skipLeft}`}>
          {showSkipFlash === 'fwd' ? <MdForward10 size={54} /> : <MdReplay10 size={54} />}
          <span className={styles.skipLabel}>{showSkipFlash === 'fwd' ? '+10s' : '-10s'}</span>
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
          {/* ── Mobile top bar: back + title ── */}
          {isMobile && (
            <div className={styles.mobileTopBar}>
              <button
                className={styles.mobileBackBtn}
                onClick={() => navigate(-1)}
                aria-label="Back"
              >
                <MdArrowBack size={22} />
              </button>
              <span className={styles.mobileTitle}>{movie.title}</span>
            </div>
          )}

          {/* ── Mobile center play button ── */}
          {isMobile && (
            <div className={styles.mobileCenterControls}>
              <button
                className={styles.mobileCenterPlay}
                onClick={(e) => { e.stopPropagation(); togglePlay(); onUIActivity(); }}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <FaPause size={32} /> : <FaPlay size={32} style={{ marginLeft: '4px' }} />}
              </button>
            </div>
          )}

          {/* ── Progress bar ── */}
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

          {/* ── Bottom button row ── */}
          <div className={styles.btnRow}>
            <div className={styles.btnLeft}>
              {/* Play/pause only on desktop in bottom bar */}
              {!isMobile && (
                <button className={styles.iconBtn} onClick={togglePlay}>
                  {playing ? <FaPause size={20} /> : <FaPlay size={20} style={{ marginLeft: '2px' }} />}
                </button>
              )}
              {/* Skip buttons only on desktop */}
              {!isMobile && (
                <>
                  <button className={styles.iconBtn} onClick={() => skip(-10)} title="Rewind 10s">
                    <MdReplay10 size={24} />
                  </button>
                  <button className={styles.iconBtn} onClick={() => skip(10)} title="Forward 10s">
                    <MdForward10 size={24} />
                  </button>
                </>
              )}
              <button className={styles.iconBtn} onClick={toggleMute}>
                {muted || volume === 0 ? <BiVolumeMute size={22} /> : <BiVolumeFull size={22} />}
              </button>
              {!isMobile && (
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={muted ? 0 : volume}
                  onChange={changeVolume}
                  className={styles.volumeSlider}
                />
              )}
              <span className={styles.timeLabel}>{fmt(currentTime)} / {duration ? fmt(duration) : '--:--'}</span>
            </div>

            {/* Desktop title in center */}
            {!isMobile && (
              <div className={styles.btnCenter}>{movie.title}</div>
            )}

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
              {/* Fullscreen button: desktop only */}
              {!isMobile && (
                <button className={styles.iconBtn} onClick={toggleFullscreen}>
                  {fullscreen ? <BiExitFullscreen size={22} /> : <BiFullscreen size={22} />}
                </button>
              )}
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

  const resetTimer = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUI(false), 3000);
  }, []);

  const onUIActivity = useCallback(() => {
    setShowUI(true);
    resetTimer();
  }, [resetTimer]);

  // Toggle for mobile single-tap
  const onToggleUI = useCallback(() => {
    setShowUI(prev => {
      if (!prev) {
        // showing — start hide timer
        resetTimer();
        return true;
      } else {
        // hiding immediately
        clearTimeout(hideTimer.current);
        return false;
      }
    });
  }, [resetTimer]);

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
      {/* Desktop back button — fades with controls */}
      <button
        className={`${styles.backBtn} ${showUI ? styles.backBtnVisible : ''} ${styles.backBtnDesktop}`}
        onClick={() => navigate(-1)}
      >
        <MdArrowBack size={22} />
      </button>

      <CustomPlayer
        movie={movie}
        showUI={showUI}
        onUIActivity={onUIActivity}
        onToggleUI={onToggleUI}
        user={user}
        token={token}
        updateUser={updateUser}
      />
    </div>
  );
}

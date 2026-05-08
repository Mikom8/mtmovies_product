import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SERIES } from '../data/series';
import { useAuth } from '../context/AuthContext';
import { useMyList } from '../hooks/useMyList';
import Hls from 'hls.js';
import { FaPlay, FaPause } from 'react-icons/fa';
import {
  BiVolumeFull, BiVolumeMute, BiFullscreen, BiExitFullscreen,
} from 'react-icons/bi';
import { MdReplay10, MdForward10, MdArrowBack, MdSkipNext } from 'react-icons/md';
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

// ── CustomPlayer ──────────────────────────────────────────────────────────────
function CustomPlayer({ series, season, episode, showUI, onUIActivity, onToggleUI, user, token, updateUser }) {
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
  const [showSkipFlash, setShowSkipFlash] = useState(null);
  const [showPlayFlash, setShowPlayFlash] = useState(null);
  const [streamMeta, setStreamMeta] = useState(null);
  const [buffering, setBuffering] = useState(true);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [hlsStartTime, setHlsStartTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [forceHls, setForceHls] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [isMobile] = useState(() => window.innerWidth <= 768);
  const { toggleMyList, isInMyList } = useMyList();

  const compoundId = `${series.id}_S${season.seasonNumber}_E${episode.episodeNumber}`;
  const isTelegram = !!(episode.telegramChatId && episode.telegramMessageId);
  const currentIndex = season.episodes.findIndex(e => e.episodeNumber === episode.episodeNumber);
  const hasNextEpisode = currentIndex < season.episodes.length - 1;
  const nextEp = hasNextEpisode ? season.episodes[currentIndex + 1] : null;

  const [initialOffset, setInitialOffset] = useState(0);
  const hasResumedRef = useRef(false);

  useEffect(() => {
    if (user && user.watchHistory) {
      const h = user.watchHistory.find(x => x.movieId === compoundId);
      setInitialOffset(h && h.progress > 0 ? h.progress : 0);
    }
    setHlsStartTime(0);
    hasResumedRef.current = false;
  }, [compoundId]);

  useEffect(() => {
    if (!isTelegram) return;
    setIsProbing(true);
    setForceHls(false);
    setStreamMeta(null);
    fetch(`https://mtmovies-production.up.railway.app/api/stream/${episode.telegramChatId}/${episode.telegramMessageId}/metadata`)
      .then(r => r.json())
      .then(meta => {
        if (meta.needsTranscode && initialOffset > 0) setHlsStartTime(initialOffset);
        setStreamMeta(meta);
      })
      .catch(console.error)
      .finally(() => setIsProbing(false));
  }, [episode.telegramChatId, episode.telegramMessageId, initialOffset, isTelegram]);

  const isAviMime = streamMeta?.mimeType === 'video/avi' || streamMeta?.mimeType === 'video/x-msvideo';
  const useHls = streamMeta?.needsTranscode || isAviMime || forceHls;
  let src = null;
  if (isTelegram && streamMeta && !useHls) {
    src = `https://mtmovies-production.up.railway.app/api/stream/${episode.telegramChatId}/${episode.telegramMessageId}`;
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

  useEffect(() => {
    if (!isTelegram || !useHls || !videoRef.current) return;
    let hls;
    const v = videoRef.current;
    const query = hlsStartTime > 0 ? `?start=${Math.floor(hlsStartTime)}` : '';
    const hlsSrc = `https://mtmovies-production.up.railway.app/api/stream/hls/${episode.telegramChatId}/${episode.telegramMessageId}/playlist.m3u8${query}`;

    if (Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 60 * 5, maxMaxBufferLength: 60 * 10, autoStartLoad: true });
      hlsRef.current = hls;
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
  }, [useHls, episode.telegramChatId, episode.telegramMessageId, hlsStartTime]);

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
    const t = setTimeout(enterFs, 300);
    return () => clearTimeout(t);
  }, [isMobile]);

  useEffect(() => {
    return () => {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        if (window.screen.orientation?.unlock) window.screen.orientation.unlock();
      } catch { /* ignore */ }
    };
  }, []);

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
        setDuration(parseDuration(episode.duration));
      } else {
        setDuration(videoRef.current.duration);
        if (user && user.watchHistory && !hasResumedRef.current) {
          hasResumedRef.current = true;
          const historyItem = user.watchHistory.find(h => h.movieId === compoundId);
          if (historyItem && historyItem.progress > 0 && historyItem.progress < videoRef.current.duration - 15) {
            videoRef.current.currentTime = historyItem.progress;
          }
        }
      }
    }
  };

  const onEnded = () => {
    if (hasNextEpisode) {
      navigate(`/watch-series/${series.id}/s/${season.seasonNumber}/e/${nextEp.episodeNumber}`);
    } else {
      navigate(`/series/${series.id}`);
    }
  };

  const handleNextEp = () => {
    if (hasNextEpisode) {
      navigate(`/watch-series/${series.id}/s/${season.seasonNumber}/e/${nextEp.episodeNumber}`);
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
            body: JSON.stringify({ movieId: compoundId, progress: realTime })
          });
          const newHistory = [...(user.watchHistory || [])];
          const idx = newHistory.findIndex(h => h.movieId === compoundId);
          if (idx !== -1) {
            newHistory[idx].progress = realTime;
            newHistory[idx].watchedAt = new Date().toISOString();
          } else {
            newHistory.push({ movieId: compoundId, progress: realTime, watchedAt: new Date().toISOString() });
          }
          updateUser({ ...user, watchHistory: newHistory });
        } catch (e) { console.error('Failed to save history', e); }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [compoundId, isTelegram, token, user, updateUser]);

  // ── actions ──────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play(); setPlaying(true); setShowPlayFlash('play');
    } else {
      v.pause(); setPlaying(false); setShowPlayFlash('pause');
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
  const handleVideoTap = useCallback((e) => {
    e.stopPropagation();

    if (isMobile) {
      const rect = e.currentTarget.getBoundingClientRect();
      const tapX = e.clientX - rect.left;
      const isRightSide = tapX > rect.width / 2;

      if (dblTapTimer.current) {
        clearTimeout(dblTapTimer.current);
        dblTapTimer.current = null;
        skip(isRightSide ? 10 : -10);
        onUIActivity();
      } else {
        dblTapTimer.current = setTimeout(() => {
          dblTapTimer.current = null;
          onToggleUI();
        }, 250);
      }
    } else {
      // Desktop
      if (dblTapTimer.current) {
        clearTimeout(dblTapTimer.current);
        dblTapTimer.current = null;
        toggleFullscreen();
      } else {
        dblTapTimer.current = setTimeout(() => {
          dblTapTimer.current = null;
          // single click: just toggle controls (do not play/pause!)
          onToggleUI();
        }, 250);
      }
    }
  }, [isMobile, skip, onUIActivity, onToggleUI, toggleFullscreen]);

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
          onEnded={onEnded}
          disablePictureInPicture
          autoPlay
        />
      ) : (
        <div className={styles.youtubeWrap}>
          <iframe
            src={`https://www.youtube.com/embed/${series.trailerEmbedId}?autoplay=1&rel=0`}
            title={series.title}
            className={styles.youtubeIframe}
            allowFullScreen
          />
        </div>
      )}

      {(isProbing || (!isProbing && buffering)) && isTelegram && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}

      {showSkipFlash && (
        <div className={`${styles.skipFlash} ${showSkipFlash === 'fwd' ? styles.skipRight : styles.skipLeft}`}>
          {showSkipFlash === 'fwd' ? <MdForward10 size={54} /> : <MdReplay10 size={54} />}
          <span className={styles.skipLabel}>{showSkipFlash === 'fwd' ? '+10s' : '-10s'}</span>
        </div>
      )}

      {showPlayFlash && (
        <div className={styles.playFlash}>
          {showPlayFlash === 'play' ? <FaPlay size={40} style={{ marginLeft: '4px' }} /> : <FaPause size={40} />}
        </div>
      )}

      {isTelegram && (
        <>
          {/* Mobile top bar */}
          {isMobile && (
            <div className={`${styles.mobileTopBar} ${showUI ? styles.controlsVisible : ''}`}>
              <button
                className={styles.mobileBackBtn}
                onClick={() => navigate(-1)}
                aria-label="Back"
              >
                <MdArrowBack size={22} />
              </button>
              <span className={styles.mobileTitle}>
                S{season.seasonNumber} E{episode.episodeNumber}: {episode.title}
              </span>
            </div>
          )}

          {/* Mobile center play */}
          {isMobile && (
            <div className={`${styles.mobileCenterControls} ${showUI ? styles.controlsVisible : ''}`}>
              <button
                className={styles.mobileCenterPlay}
                onClick={(e) => { e.stopPropagation(); togglePlay(); onUIActivity(); }}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <FaPause size={32} /> : <FaPlay size={32} style={{ marginLeft: '4px' }} />}
              </button>
            </div>
          )}

          <div
            className={`${styles.controls} ${showUI ? styles.controlsVisible : ''}`}
            onClick={e => e.stopPropagation()}
          >


            {/* Progress bar */}
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

            {/* Bottom row */}
            <div className={styles.btnRow}>
              <div className={styles.btnLeft}>
                {!isMobile && (
                  <button className={styles.iconBtn} onClick={togglePlay}>
                    {playing ? <FaPause size={20} /> : <FaPlay size={20} style={{ marginLeft: '2px' }} />}
                  </button>
                )}
                {!isMobile && (
                  <>
                    <button className={styles.iconBtn} onClick={() => skip(-10)}>
                      <MdReplay10 size={24} />
                    </button>
                    <button className={styles.iconBtn} onClick={() => skip(10)}>
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

              {!isMobile && (
                <div className={styles.btnCenter}>
                  S{season.seasonNumber} E{episode.episodeNumber}: {episode.title}
                </div>
              )}

              <div className={styles.btnRight}>
                {hasNextEpisode && (
                  <button
                    className={styles.iconBtn}
                    onClick={handleNextEp}
                    style={{ fontSize: '0.9rem', width: 'auto', padding: '0 8px' }}
                    title="Next Episode"
                  >
                    <MdSkipNext size={24} style={{ marginRight: '2px' }} /> Next Ep
                  </button>
                )}
                <button
                  className={styles.iconBtn}
                  onClick={() => toggleMyList(series)}
                  style={{ fontSize: '0.9rem', width: 'auto', padding: '0 8px' }}
                >
                  {isInMyList(series.id) ? <><FiCheck size={18} style={{ marginRight: '4px' }} /> In List</> : <><FiPlus size={18} style={{ marginRight: '4px' }} /> My List</>}
                </button>
                {!isMobile && (
                  <button className={styles.iconBtn} onClick={toggleFullscreen}>
                    {fullscreen ? <BiExitFullscreen size={22} /> : <BiFullscreen size={22} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── WatchSeriesPage ───────────────────────────────────────────────────────────
export default function WatchSeriesPage() {
  const { seriesId, seasonNum, epNum } = useParams();
  const navigate = useNavigate();
  const { user, token, updateUser, isAuthenticated } = useAuth();
  const [showUI, setShowUI] = useState(true);
  const hideTimer = useRef(null);
  const isMobileRef = useRef(window.innerWidth <= 768);

  const resetTimer = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUI(false), 3000);
  }, []);

  const onUIActivity = useCallback(() => {
    setShowUI(true);
    resetTimer();
  }, [resetTimer]);

  const onToggleUI = useCallback(() => {
    setShowUI(prev => {
      clearTimeout(hideTimer.current);
      if (!prev) {
        // UI was hidden → show it and start auto-hide timer
        hideTimer.current = setTimeout(() => setShowUI(false), 3000);
        return true;
      } else {
        // UI was visible → hide it immediately
        return false;
      }
    });
  }, []);

  useEffect(() => {
    onUIActivity();
    return () => clearTimeout(hideTimer.current);
  }, [onUIActivity]);

  if (!isAuthenticated) { navigate('/login'); return null; }

  const series = SERIES.find(s => String(s.id) === seriesId);
  if (!series) { navigate('/browse'); return null; }

  const season = series.seasons.find(s => String(s.seasonNumber) === seasonNum);
  if (!season) { navigate(`/series/${seriesId}`); return null; }

  const episode = season.episodes.find(e => String(e.episodeNumber) === epNum);
  if (!episode) { navigate(`/series/${seriesId}`); return null; }

  return (
    <div
      className={`${styles.page} ${showUI ? '' : styles.hideCursor}`}
      onMouseMove={!isMobileRef.current ? onUIActivity : undefined}
    >
      {/* Desktop back button only */}
      <button
        className={`${styles.backBtn} ${showUI ? styles.backBtnVisible : ''} ${styles.backBtnDesktop}`}
        onClick={() => navigate(`/series/${series.id}`)}
      >
        <MdArrowBack size={22} />
      </button>

      <CustomPlayer
        series={series}
        season={season}
        episode={episode}
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

import { useState, useRef, useEffect } from 'react';
import styles from './VideoPlayer.module.css';
import { FiX, FiPlus } from 'react-icons/fi';
import { FaStar, FaCheck } from 'react-icons/fa';
import { useMyList } from '../hooks/useMyList';
import { BiMoviePlay, BiFullscreen, BiExitFullscreen } from 'react-icons/bi';

export default function VideoPlayer({ movie, onClose }) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const { toggleMyList, isInMyList } = useMyList();
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimer = useRef(null);

  // Telegram stream config
  const isTelegramStream = movie.telegramChatId && movie.telegramMessageId;
  const streamSrc = `https://mtmovies-production.up.railway.app/api/stream/${movie.telegramChatId}/${movie.telegramMessageId}`;

  // YouTube embed fallback
  const embedSrc = `https://www.youtube.com/embed/${movie.trailerEmbedId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;

  const hideControlsAfterDelay = () => {
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    setPlaying(true);
    hideControlsAfterDelay();
    return () => clearTimeout(controlsTimer.current);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div
        ref={containerRef}
        className={styles.playerContainer}
        onMouseMove={hideControlsAfterDelay}
      >
        {/* Close button */}
        <button className={styles.closeBtn} onClick={onClose}><FiX size={28} /></button>

        {/* Movie info bar */}
        <div className={`${styles.infoBar} ${showControls ? styles.visible : ''}`}>
          <div>
            <div className={styles.movieTitle}>{movie.title}</div>
            <div className={styles.movieTitleAmharic}>{movie.titleAmharic}</div>
          </div>
          <div className={styles.badges}>
            <span className={styles.badge}>{movie.year}</span>
            {movie.hasAmharicDub && (
              <span className={`${styles.badge} ${styles.amharic}`}>አማርኛ DUB</span>
            )}
            <span className={styles.badge}>{movie.genre.split(' • ')[0]}</span>
          </div>
        </div>

        {/* Video Player */}
        {isTelegramStream ? (
          <video
            src={streamSrc}
            autoPlay
            controls
            className={styles.iframe}
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={embedSrc}
            title={movie.title}
            className={styles.iframe}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen"
            allowFullScreen
          />
        )}

      </div>

      {/* Controls below the player */}
      <div className={styles.bottomBar}>
        <div className={styles.controlsLeft}>
          {movie.isTrailer && (
            <span className={styles.trailerLabel}>
              <BiMoviePlay size={18} style={{ marginRight: '6px' }} />
              Official Trailer
            </span>
          )}
          <span className={styles.ratingBadge}><FaStar style={{ marginRight: '4px', color: '#ffd700', transform: 'translateY(-1px)' }} /> {movie.rating}/10</span>
        </div>
        <div className={styles.controlsRight}>
          <button className={styles.ctaBtn} onClick={() => toggleMyList(movie)}>
            {isInMyList(movie.id) ? (
              <><FaCheck size={18} style={{ marginRight: '6px' }} /> In My List</>
            ) : (
              <><FiPlus size={18} style={{ marginRight: '6px' }} /> My List</>
            )}
          </button>
          {!isTelegramStream && (
            <button className={styles.ctaBtn} onClick={toggleFullscreen}>
              {fullscreen ? <><BiExitFullscreen size={18} style={{ marginRight: '6px' }} /> Exit</> : <><BiFullscreen size={18} style={{ marginRight: '6px' }} /> Fullscreen</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import styles from './VideoPlayer.module.css';
import { FiX, FiPlus } from 'react-icons/fi';
import { FaStar, FaCheck } from 'react-icons/fa';
import { useMyList } from '../hooks/useMyList';
import { BiMoviePlay, BiFullscreen, BiExitFullscreen } from 'react-icons/bi';

export default function VideoPlayer({ movie, onClose }) {
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const { toggleMyList, isInMyList } = useMyList();
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
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
    hideControlsAfterDelay();
    return () => clearTimeout(controlsTimer.current);
  }, []);

  // Toggle controls on click (mobile behavior like YouTube)
  const handlePlayerClick = (e) => {
    // Don't toggle if clicking on controls, buttons, or video element itself
    if (
      e.target.closest('button') || 
      e.target.closest(`.${styles.volumeControl}`) ||
      e.target.tagName === 'VIDEO' ||
      e.target.tagName === 'IFRAME'
    ) {
      return;
    }
    
    const newShowControls = !showControls;
    setShowControls(newShowControls);
    
    // Only start auto-hide timer if we're showing controls
    if (newShowControls) {
      hideControlsAfterDelay();
    } else {
      clearTimeout(controlsTimer.current);
    }
  };

  // Hide controls immediately when interacting with them
  const handleControlInteraction = () => {
    clearTimeout(controlsTimer.current);
    setShowControls(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
    handleControlInteraction();
  };

  const handleMyListClick = () => {
    toggleMyList(movie);
    handleControlInteraction();
  };

  return (
    <div className={styles.overlay}>
      <div
        ref={containerRef}
        className={styles.playerContainer}
        onMouseMove={hideControlsAfterDelay}
        onClick={handlePlayerClick}
      >
        {/* Close button */}
        <button 
          className={`${styles.closeBtn} ${showControls ? styles.visible : ''}`} 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <FiX size={28} />
        </button>

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
            ref={videoRef}
            src={streamSrc}
            autoPlay
            controls
            controlsList="nodownload"
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
      <div className={`${styles.bottomBar} ${showControls ? styles.visible : ''}`}>
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
          <button 
            className={styles.ctaBtn} 
            onClick={(e) => {
              e.stopPropagation();
              handleMyListClick();
            }}
          >
            {isInMyList(movie.id) ? (
              <><FaCheck size={18} style={{ marginRight: '6px' }} /> In My List</>
            ) : (
              <><FiPlus size={18} style={{ marginRight: '6px' }} /> My List</>
            )}
          </button>
          {!isTelegramStream && (
            <button 
              className={styles.ctaBtn} 
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
            >
              {fullscreen ? <><BiExitFullscreen size={18} style={{ marginRight: '6px' }} /> Exit</> : <><BiFullscreen size={18} style={{ marginRight: '6px' }} /> Fullscreen</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

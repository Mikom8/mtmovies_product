import { useState, useRef, useEffect } from 'react';
import styles from './VideoPlayer.module.css';
import { FiX, FiPlus } from 'react-icons/fi';
import { FaStar, FaCheck } from 'react-icons/fa';
import { useMyList } from '../hooks/useMyList';
import { BiMoviePlay, BiFullscreen, BiExitFullscreen, BiPlay, BiPause } from 'react-icons/bi';
import { HiVolumeUp, HiVolumeOff } from 'react-icons/hi';

export default function VideoPlayer({ movie, onClose }) {
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
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
    controlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    setShowControls(true);
    hideControlsAfterDelay();
    return () => clearTimeout(controlsTimer.current);
  }, []);

  // Toggle controls on tap/click
  const handleContainerTap = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only toggle if tapping directly on the video element
    const isClickOnVideo = e.target.tagName === 'VIDEO';
    
    if (isClickOnVideo) {
      // Clear any existing timer first
      clearTimeout(controlsTimer.current);
      
      // Toggle controls
      setShowControls(prev => {
        const newState = !prev;
        // Only start timer if showing controls
        if (newState) {
          // Use setTimeout to ensure state is updated first
          setTimeout(() => {
            hideControlsAfterDelay();
          }, 100);
        }
        return newState;
      });
    }
  };

  // Hide controls immediately when interacting with them
  const handleControlInteraction = () => {
    clearTimeout(controlsTimer.current);
    setShowControls(false);
  };

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
    // Keep controls visible and reset auto-hide timer
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    setTimeout(() => {
      hideControlsAfterDelay();
    }, 100);
  };

  const handleMyListClick = () => {
    toggleMyList(movie);
    handleControlInteraction();
  };

  const togglePlayPause = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
    // Keep controls visible and reset auto-hide timer
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    setTimeout(() => {
      hideControlsAfterDelay();
    }, 100);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
      setIsMuted(newVolume === 0);
    }
    // Keep controls visible while adjusting volume
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    setTimeout(() => {
      hideControlsAfterDelay();
    }, 100);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
        if (volume === 0) {
          setVolume(100);
          videoRef.current.volume = 1;
        }
      } else {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    }
    // Keep controls visible and reset auto-hide timer
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    setTimeout(() => {
      hideControlsAfterDelay();
    }, 100);
  };

  return (
    <div className={styles.overlay}>
      <div
        ref={containerRef}
        className={styles.playerContainer}
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
          <>
            <video
              ref={videoRef}
              src={streamSrc}
              autoPlay
              playsInline
              className={styles.iframe}
              onTouchEnd={handleContainerTap}
            />
            
            {/* Custom video controls for mobile */}
            <div 
              className={`${styles.customVideoControls} ${showControls ? styles.visible : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
              }}
            >
              <div 
                className={styles.videoControlsRow}
                onClick={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                <button 
                  className={styles.playPauseBtn} 
                  onClick={togglePlayPause}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  {isPlaying ? <BiPause size={28} /> : <BiPlay size={28} />}
                </button>
                
                <div 
                  className={styles.volumeControlGroup}
                  onClick={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                >
                  <button 
                    className={styles.volumeBtn} 
                    onClick={toggleMute}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    {isMuted || volume === 0 ? <HiVolumeOff size={24} /> : <HiVolumeUp size={24} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    className={styles.volumeSlider}
                  />
                  <span className={styles.volumePercent}>{volume}%</span>
                </div>

                <button 
                  className={styles.fullscreenBtn} 
                  onClick={toggleFullscreen}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  {fullscreen ? <BiExitFullscreen size={24} /> : <BiFullscreen size={24} />}
                </button>
              </div>
            </div>
          </>
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

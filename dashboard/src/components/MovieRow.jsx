import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MovieRow.module.css';
import { FaPlay, FaStar } from 'react-icons/fa';

function MovieCard({ movie, landscape }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  // Use mylist image for landscape if available, otherwise backdrop
  const imageSrc = landscape ? (movie.mylist || movie.backdrop) : movie.poster;

  return (
    <div
      className={`${styles.card} ${landscape ? styles.landscapeCard : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (movie.continueWatchUrl) navigate(movie.continueWatchUrl);
        else navigate(movie.type === 'series' ? `/series/${movie.id}` : `/movie/${movie.id}`);
      }}
    >
      <div className={styles.posterWrapper}>
        <img
          src={imageSrc}
          alt={movie.title}
          className={`${styles.poster} ${landscape ? styles.landscapePoster : ''}`}
          loading="lazy"
        />

        {movie.isNewEpisode ? (
          <span className={styles.newTag}>NEW EP.</span>
        ) : movie.isNewSeason ? (
          <span className={styles.newTag}>NEW S.</span>
        ) : movie.isNew ? (
          <span className={styles.newTag}>NEW</span>
        ) : null}

        <div className={`${styles.cardOverlay} ${hovered ? styles.visible : ''}`}>
          <button className={styles.playCircle} aria-label="Play">
            <FaPlay style={{ marginLeft: '4px' }} />
          </button>

          <div className={styles.cardInfo}>
            <p className={styles.cardTitle}>{movie.title}</p>
            <div className={styles.cardMeta}>
              <span className={styles.cardRating}>
                <FaStar style={{ marginRight: '4px', color: '#ffd700', transform: 'translateY(-1px)' }} />
                {movie.rating}
              </span>
              <span className={styles.cardYear}>{movie.year}</span>
              {movie.hasAmharicDub && <span className={styles.dubTag}>አማርኛ</span>}
            </div>
            <p className={styles.cardGenre}>{movie.genre?.split(' • ').slice(0, 2).join(' • ')}</p>
          </div>
        </div>

        {/* Progress bar — always render track, fill only when there's progress */}
        {movie.progressPct !== undefined && (
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${movie.progressPct || 0}%` }}
            ></div>
          </div>
        )}

        {/* Episode badge: S01E02 — shown on hover for series cards */}
        {movie.episodeText && (
          <span className={`${styles.episodeBadge} ${hovered ? styles.episodeBadgeVisible : ''}`}>
            {movie.episodeText}
          </span>
        )}
      </div>

      <div className={styles.mobileInfo}>
        <p className={styles.mobileTitle}>{movie.title}</p>
        <p className={styles.mobileSub}>{movie.episodeText || ''}</p>
      </div>
    </div>
  );
}

export default function MovieRow({ title, movies, landscape }) {
  const scrollRef = useRef(null);
  const [rowHovered, setRowHovered] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  // Clone movies for seamless infinite scrolling
  const needsScroll = movies.length > 4;
  const displayMovies = needsScroll ? [...movies, ...movies, ...movies] : movies;

  const [totalSteps, setTotalSteps] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const getSetWidth = () => {
    const el = scrollRef.current;
    if (!el) return 0;
    const card = el.querySelector('[class*="card"]');
    if (!card) return 0;
    const cardW = card.offsetWidth + 8; // width + gap
    return cardW * movies.length; // width of ONE original set
  };

  const updateMetrics = () => {
    const el = scrollRef.current;
    if (!el || !needsScroll) return;
    const setWidth = getSetWidth();
    const visibleWidth = el.clientWidth;
    const card = el.querySelector('[class*="card"]');
    const cardW = card ? card.offsetWidth + 8 : 178;
    const steps = Math.max(1, Math.ceil(setWidth / (cardW * 4)));
    setTotalSteps(steps);
  };

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
  };

  useEffect(() => {
    const handleResize = () => {
      updateMetrics();
      updateArrows();
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [movies]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('[class*="card"]');
    const cardW = card ? card.offsetWidth + 8 : 178;

    setCurrentStep(prev => (prev + dir + totalSteps) % totalSteps);

    const scrollAmount = dir * cardW * 4;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });

    // After smooth scroll finishes, check if we need to wrap seamlessly
    setTimeout(() => {
      if (!el || !needsScroll) return;
      const setWidth = getSetWidth();
      // If we scrolled into the 3rd set, silently jump back to the identical spot in the 2nd set
      if (el.scrollLeft >= setWidth * 2 - 10) {
        el.scrollLeft -= setWidth;
      }
      // If we are deep in the 1st set, silently jump forward to the 2nd set (to allow infinite left scroll)
      // BUT we only jump if they're far enough from 0 so we don't accidentally hide the 4vw gap
      else if (el.scrollLeft > 0 && el.scrollLeft <= setWidth / 2) {
        // el.scrollLeft += setWidth; 
        // We actually want them to eventually hit 0 so the left arrow hides. 
        // So we don't forcefully push them forward here.
      }
      updateArrows();
    }, 450);
  };

  return (
    <section
      className={styles.row}
      onMouseEnter={() => setRowHovered(true)}
      onMouseLeave={() => setRowHovered(false)}
    >
      <div className={styles.rowHeader}>
        <h2 className={styles.rowTitle}>{title}</h2>
        {totalSteps > 1 && (() => {
          const maxDots = Math.min(totalSteps, 7);
          const activeDotIndex = totalSteps <= 7
            ? currentStep
            : Math.round((currentStep / (totalSteps - 1)) * (maxDots - 1));

          return (
            <div className={`${styles.scrollIndicator} ${rowHovered ? styles.indicatorVisible : ''}`}>
              {Array.from({ length: maxDots }).map((_, idx) => (
                <span
                  key={idx}
                  className={`${styles.dot} ${idx === activeDotIndex ? styles.activeDot : ''}`}
                />
              ))}
            </div>
          );
        })()}
      </div>

      <div className={styles.rowTrack}>
        <button
          className={`${styles.scrollArrow} ${styles.scrollArrowLeft} ${rowHovered && canScrollLeft ? styles.arrowVisible : ''}`}
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
        >
          ‹
        </button>

        <div
          className={styles.scrollContainer}
          ref={scrollRef}
          onScroll={updateArrows}
        >
          {displayMovies.map((movie, idx) => (
            <MovieCard key={`${movie.id}-${idx}`} movie={movie} landscape={landscape} />
          ))}
        </div>

        {/* Right arrow is always visible if we have enough movies to scroll */}
        {needsScroll && (
          <button
            className={`${styles.scrollArrow} ${styles.scrollArrowRight} ${rowHovered ? styles.arrowVisible : ''}`}
            onClick={() => scroll(1)}
            aria-label="Scroll right"
          >
            ›
          </button>
        )}
      </div>
    </section>
  );
}

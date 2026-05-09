import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMyList } from '../hooks/useMyList';
import Navbar from '../components/Navbar';
import { SERIES } from '../data/series';
import { MOVIES } from '../data/movies';
import { FaPlay, FaPlus, FaCheck } from 'react-icons/fa';
import { IoIosArrowBack } from 'react-icons/io';
import styles from './MovieDetails.module.css';

export default function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { toggleMyList, isInMyList } = useMyList();

  const [movie, setMovie] = useState(null);
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandPos, setExpandPos] = useState({ x: 0, y: 0 });
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const m = MOVIES.find(m => String(m.id) === id);
    if (m) {
      setMovie(m);
    } else {
      navigate('/browse');
    }
  }, [id, navigate]);

  if (!movie) return (
    <div className={styles.page}>
      <Navbar user={user} onLogout={() => { logout(); navigate('/'); }} />

      {/* Hero skeleton */}
      <div className={styles.skeletonHero}>
        <div className={styles.skeletonHeroContent}>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonMeta} />
          <div className={styles.skeletonDesc} />
          <div className={styles.skeletonDescShort} />
          <div className={styles.skeletonDescShort} style={{ width: '60%' }} />
          <div className={styles.skeletonGenre} />
          <div className={styles.skeletonBtnRow}>
            <div className={styles.skeletonBtn} />
            <div className={styles.skeletonBtnSm} />
          </div>
        </div>
      </div>

      {/* More Like This skeleton */}
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonSectionTitle} />
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonPoster} />
              <div className={styles.skeletonCardTitle} />
              <div className={styles.skeletonCardMeta} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getSimilarContent = () => {
    if (!movie) return [];

    const currentPrimaryGenre = movie.genre.split(' • ')[0];
    const currentGenres = movie.genre.split(' • ');

    const pool = [...MOVIES].filter(item => item.id !== movie.id);

    const scored = pool.map(item => {
      let score = 0;
      const itemGenres = item.genre.split(' • ');
      const itemPrimaryGenre = itemGenres[0];

      // Primary genre match: +5
      if (itemPrimaryGenre === currentPrimaryGenre) {
        score += 5;
      }

      // Secondary genres match: +2 per match
      itemGenres.forEach(g => {
        if (currentGenres.includes(g) && g !== currentPrimaryGenre) {
          score += 2;
        }
      });

      // Year proximity: max +10, min +0
      const yearDiff = Math.abs(item.year - movie.year);
      score += Math.max(0, 10 - yearDiff);

      return { ...item, score };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 10);
  };

  const similar = getSimilarContent();

  const handleWatchClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    setExpandPos({ x, y });
    setIsExpanding(true);

    setTimeout(() => {
      setShowSpinner(true);
      setTimeout(() => {
        navigate(`/watch/${movie.id}`);
      }, 500); // wait a bit before navigating so spinner is seen
    }, 500); // 500ms for the cubic-bezier expansion to finish
  };

  return (
    <>
      {isExpanding && (
        <div
          className={styles.expansionOverlay}
          style={{
            '--origin-x': `${expandPos.x}px`,
            '--origin-y': `${expandPos.y}px`
          }}
        >
          {showSpinner && <div className={styles.spinner}></div>}
        </div>
      )}
      <div className={styles.page}>
        <Navbar user={user} onLogout={handleLogout} />

      <div className={styles.hero} style={{ backgroundImage: `url(${movie.backdrop})` }}>
        <div className={styles.heroOverlay}>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>{movie.title}</h1>
            {movie.titleAmharic && <h2 className={styles.subtitle}></h2>}

            <div className={styles.meta}>
              <span>{movie.year}</span>
              <span>{movie.duration}</span>
              <span className={styles.quality}>{movie.quality || 'HD'}</span>
            </div>

            <p className={styles.description}>{movie.description}</p>
            <p className={styles.genre}><strong>Genres:</strong> {movie.genre}</p>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className={styles.playMainBtn}
                onClick={handleWatchClick}
              >
                <FaPlay /> Watch Movie
              </button>
              <button
                className={styles.myListBtn}
                onClick={() => toggleMyList(movie)}
              >
                {isInMyList(movie.id) ? <><FaCheck /> In My List</> : <><FaPlus /> My List</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* More Like This */}
        {similar.length > 0 && (
          <div className={styles.moreSection}>
            <h2 className={styles.moreTitle}>More Like This</h2>
            <div className={styles.moreGrid}>
              {similar.map(m => {
                const isSeriesItem = m.seasons !== undefined;
                return (
                  <div
                    key={m.id}
                    className={styles.moreCard}
                    onClick={() => navigate(isSeriesItem ? `/series/${m.id}` : `/movie/${m.id}`)}
                  >
                    <img src={m.poster} alt={m.title} className={styles.morePoster} loading="lazy" />
                    <div className={styles.moreOverlay}>
                      <FaPlay size={26} className={styles.morePlay} />
                    </div>
                    <div className={styles.moreInfo}>
                      <p className={styles.moreMovieTitle}>{m.title}</p>
                      <div className={styles.moreMeta}>
                        <span className={styles.moreMetaGenre}>{m.genre.split(' • ')[0]}</span>
                        <span>{isSeriesItem ? 'Series' : 'Movie'} &bull; {m.year}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}

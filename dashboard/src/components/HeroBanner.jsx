import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyList } from '../hooks/useMyList';
import styles from './HeroBanner.module.css';
import { FaFire, FaStar, FaPlay, FaPlus, FaCheck } from 'react-icons/fa';
import { IoIosInformationCircleOutline } from "react-icons/io";

export default function HeroBanner({ movie }) {
  const navigate = useNavigate();
  const { toggleMyList, isInMyList } = useMyList();
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandPos, setExpandPos] = useState({ x: 0, y: 0 });
  const [showSpinner, setShowSpinner] = useState(false);

  if (!movie) return null;

  const isSeries = movie.type === 'series';
  const detailUrl = isSeries ? `/series/${movie.id}` : `/movie/${movie.id}`;
  const watchUrl = movie.continueWatchUrl || (isSeries ? `/watch-series/${movie.id}/s/1/e/1` : `/watch/${movie.id}`);

  const handleWatchClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    setExpandPos({ x, y });
    setIsExpanding(true);

    setTimeout(() => {
      setShowSpinner(true);
      setTimeout(() => {
        navigate(watchUrl);
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
      <section
        className={styles.hero}
        style={{ backgroundImage: `url(${movie.backdrop})` }}
      >
        <div className={styles.gradient} />

        <div className={styles.content}>
          {movie.isNewEpisode ? (
            <span className={styles.newBadge}><FaFire style={{ marginRight: '6px', transform: 'translateY(1px)' }} /> New Episode</span>
          ) : movie.isNewSeason ? (
            <span className={styles.newBadge}><FaFire style={{ marginRight: '6px', transform: 'translateY(1px)' }} /> New Season</span>
          ) : movie.isNew ? (
            <span className={styles.newBadge}><FaFire style={{ marginRight: '6px', transform: 'translateY(1px)' }} /> New Release</span>
          ) : null}

          <h1 className={styles.title}>{movie.title}</h1>


          <div className={styles.meta}>
            <span className={styles.rating}><FaStar style={{ marginRight: '4px', color: '#ffd700', transform: 'translateY(-1px)' }} /> {movie.rating}</span>
            <span className={styles.dot} />
            <span>{movie.year}</span>
            <span className={styles.dot} />
            <span>{movie.duration || (movie.type === 'series' ? `${movie.seasons?.length || 0} Seasons` : '')}</span>
            <span className={styles.dot} />
            <span className={styles.quality}>{movie.quality}</span>
            {movie.hasAmharicDub && (
              <span className={styles.amharicBadge}>አማርኛ DUB</span>
            )}
          </div>

          <p className={styles.description}>{movie.description}</p>

          <div className={styles.actions}>
            <button
              className={styles.playBtn}
              onClick={handleWatchClick}
            >
              <FaPlay /> Watch Now
            </button>
            <button
              className={styles.infoBtn}
              onClick={() => navigate(detailUrl)}
            >
              <IoIosInformationCircleOutline size={24} /> More Info
            </button>
          </div>

          <p className={styles.genre}>{movie.genre}</p>
        </div>
      </section>
    </>
  );
}

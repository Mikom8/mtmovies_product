import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MovieRow.module.css';
import { FaPlay, FaStar } from 'react-icons/fa';

function MovieCard({ movie, onPlay }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  return (
    <div
      className={styles.card}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (movie.continueWatchUrl) navigate(movie.continueWatchUrl);
        else navigate(movie.seasons ? `/series/${movie.id}` : `/movie/${movie.id}`);
      }}
    >
      <div className={styles.posterWrapper}>
        <img src={movie.poster} alt={movie.title} className={styles.poster} loading="lazy" />

        {movie.isNew && <span className={styles.newTag}>NEW</span>}



        {movie.progressPct !== undefined && movie.progressPct > 0 && (
          <div className={styles.progressBarContainer}>
            <div className={styles.progressBarFill} style={{ width: `${movie.progressPct}%` }}></div>
          </div>
        )}

        <div className={`${styles.cardOverlay} ${hovered ? styles.visible : ''}`}>
          <button className={styles.playCircle} aria-label="Play trailer"><FaPlay style={{ marginLeft: '4px' }} /></button>

          <div className={styles.cardInfo}>
            <p className={styles.cardTitle}>{movie.title}</p>
            <div className={styles.cardMeta}>
              <span className={styles.cardRating}><FaStar style={{ marginRight: '4px', color: '#ffd700', transform: 'translateY(-1px)' }} /> {movie.rating}</span>
              <span className={styles.cardYear}>{movie.year}</span>
              {movie.hasAmharicDub && <span className={styles.dubTag}>አማርኛ</span>}
            </div>
            <p className={styles.cardGenre}>{movie.genre.split(' • ').slice(0, 2).join(' • ')}</p>
          </div>
        </div>
      </div>

      <div className={styles.mobileInfo}>
        <p className={styles.mobileTitle}>{movie.title}</p>
        <p className={styles.mobileSub}>
        </p>
      </div>
    </div>
  );
}

export default function MovieRow({ title, movies }) {
  return (
    <section className={styles.row}>
      <h2 className={styles.rowTitle}>{title}</h2>
      <div className={styles.scrollContainer}>
        {movies.map(movie => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  );
}

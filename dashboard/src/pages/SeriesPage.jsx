import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMovies } from '../context/MovieContext';
import Navbar from '../components/Navbar';
import HeroBanner from '../components/HeroBanner';
import MovieRow from '../components/MovieRow';
import PageSkeleton from '../components/PageSkeleton';
import styles from '../App.module.css';

export default function SeriesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { series: SERIES, loading } = useMovies();
  const [featuredItem, setFeaturedItem] = useState(null);

  useEffect(() => {
    if (!loading && !featuredItem && SERIES.length > 0) {
      const featuredPool = SERIES.filter(s => s.isFeatured || s.id === 'sq1');
      const heroPool = featuredPool.length > 0 ? featuredPool : SERIES.slice(0, 5);
      setFeaturedItem(heroPool[Math.floor(Math.random() * heroPool.length)]);
    }
  }, [loading, SERIES, featuredItem]);

  const handleLogout = () => { logout(); navigate('/'); };

  if (loading || !featuredItem) return <PageSkeleton />;

  const ACTION = SERIES.filter(s => s.genre && s.genre.includes('Action'));
  const DRAMA = SERIES.filter(s => s.genre && s.genre.includes('Drama'));
  const CRIME = SERIES.filter(s => s.genre && s.genre.includes('Crime'));
  const SCIFI = SERIES.filter(s => s.genre && s.genre.includes('Sci-Fi'));
  const MYSTERY = SERIES.filter(s => s.genre && (s.genre.includes('Mystery') || s.genre.includes('Thriller')));
  const NEW_SERIES = SERIES.filter(s => s.isNew);

  return (
    <div className={styles.app}>
      <Navbar user={user} onLogout={handleLogout} />

      <HeroBanner movie={featuredItem} />

      <div className={styles.rows}>
        {NEW_SERIES.length > 0 && <MovieRow title="New Series" movies={NEW_SERIES} />}
        {ACTION.length > 0 && <MovieRow title="Action & Adventure" movies={ACTION} />}
        {DRAMA.length > 0 && <MovieRow title="Drama" movies={DRAMA} />}
        {CRIME.length > 0 && <MovieRow title="Crime" movies={CRIME} />}
        {SCIFI.length > 0 && <MovieRow title="Sci-Fi" movies={SCIFI} />}
        {MYSTERY.length > 0 && <MovieRow title="Mystery & Thriller" movies={MYSTERY} />}
      </div>

      <footer className={styles.footer}>
        <p>MTMovies © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

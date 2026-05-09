import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMovies } from '../context/MovieContext';
import Navbar from '../components/Navbar';
import HeroBanner from '../components/HeroBanner';
import MovieRow from '../components/MovieRow';
import PageSkeleton from '../components/PageSkeleton';
import styles from '../App.module.css';

export default function FreePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { movies: MOVIES, series: SERIES, loading } = useMovies();
  const [featuredItem, setFeaturedItem] = useState(null);

  useEffect(() => {
    if (!loading && !featuredItem) {
      const allFree = [...MOVIES.filter(m => m.isFree), ...SERIES.filter(s => s.isFree)];
      if (allFree.length > 0) {
        setFeaturedItem(allFree[Math.floor(Math.random() * allFree.length)]);
      }
    }
  }, [loading, MOVIES, SERIES, featuredItem]);

  const handleLogout = () => { logout(); navigate('/'); };

  if (loading) return <PageSkeleton />;

  const FREE_MOVIES = MOVIES.filter(m => m.isFree);
  const FREE_SERIES = SERIES.filter(s => s.isFree);

  return (
    <div className={styles.app}>
      <Navbar user={user} onLogout={handleLogout} />

      {featuredItem && <HeroBanner movie={featuredItem} />}

      <div className={styles.rows}>
        {FREE_MOVIES.length > 0 && <MovieRow title="Free Movies" movies={FREE_MOVIES} />}
        {FREE_SERIES.length > 0 && <MovieRow title="Free TV Series" movies={FREE_SERIES} />}
      </div>

      <footer className={styles.footer}>
        <p>MTMovies © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

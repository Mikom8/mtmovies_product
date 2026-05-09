import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMovies } from '../context/MovieContext';
import Navbar from '../components/Navbar';
import HeroBanner from '../components/HeroBanner';
import MovieRow from '../components/MovieRow';
import PageSkeleton from '../components/PageSkeleton';
import styles from '../App.module.css';

export default function MoviesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { movies: MOVIES, loading } = useMovies();
  const [featuredItem, setFeaturedItem] = useState(null);

  useEffect(() => {
    if (!loading && !featuredItem && MOVIES.length > 0) {
      const featuredPool = MOVIES.filter(m => m.isFeatured);
      const heroPool = featuredPool.length > 0 ? featuredPool : MOVIES.slice(0, 5);
      setFeaturedItem(heroPool[Math.floor(Math.random() * heroPool.length)]);
    }
  }, [loading, MOVIES, featuredItem]);

  const handleLogout = () => { logout(); navigate('/'); };

  if (loading || !featuredItem) return <PageSkeleton />;

  const ACTION = MOVIES.filter(m => m.genre && m.genre.includes('Action'));
  const CRIME = MOVIES.filter(m => m.genre && m.genre.includes('Crime'));
  const SCIFI = MOVIES.filter(m => m.genre && m.genre.includes('Sci-Fi'));
  const ADVENTURE = MOVIES.filter(m => m.genre && m.genre.includes('Adventure'));
  const ROMANCE = MOVIES.filter(m => m.genre && m.genre.includes('Romance'));
  const HORROR = MOVIES.filter(m => m.genre && m.genre.includes('Horror'));
  const COMEDY = MOVIES.filter(m => m.genre && m.genre.includes('Comedy'));
  const NEW_MOVIES = MOVIES.filter(m => m.isNew);

  return (
    <div className={styles.app}>
      <Navbar user={user} onLogout={handleLogout} />

      <HeroBanner movie={featuredItem} />

      <div className={styles.rows}>
        {NEW_MOVIES.length > 0 && <MovieRow title="New Releases" movies={NEW_MOVIES} />}
        {ACTION.length > 0 && <MovieRow title="Action & Thriller" movies={ACTION} />}
        {CRIME.length > 0 && <MovieRow title="Crime & Mystery" movies={CRIME} />}
        {SCIFI.length > 0 && <MovieRow title="Sci-Fi" movies={SCIFI} />}
        {HORROR.length > 0 && <MovieRow title="Horror" movies={HORROR} />}
        {ADVENTURE.length > 0 && <MovieRow title="Adventure" movies={ADVENTURE} />}
        {ROMANCE.length > 0 && <MovieRow title="Romance & Drama" movies={ROMANCE} />}
        {COMEDY.length > 0 && <MovieRow title="Comedy" movies={COMEDY} />}
      </div>

      <footer className={styles.footer}>
        <p>MTMovies © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

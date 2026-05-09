import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import HeroBanner from '../components/HeroBanner';
import MovieRow from '../components/MovieRow';
import { MOVIES } from '../data/movies';
import { SERIES } from '../data/series';
import styles from '../App.module.css';

const FREE_MOVIES = MOVIES.filter(m => m.isFree);
const FREE_SERIES = SERIES.filter(s => s.isFree);

// Pick a random featured free item once per page load
const allFree = [...FREE_MOVIES, ...FREE_SERIES];
const HERO_ITEM = allFree.length > 0 ? allFree[Math.floor(Math.random() * allFree.length)] : null;

export default function FreePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className={styles.app}>
      <Navbar user={user} onLogout={handleLogout} />

      {HERO_ITEM && <HeroBanner movie={HERO_ITEM} />}

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

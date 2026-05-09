import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import HeroBanner from '../components/HeroBanner';
import MovieRow from '../components/MovieRow';
import { MOVIES } from '../data/movies';
import styles from '../App.module.css';

const ACTION = MOVIES.filter(m => m.genre.includes('Action'));
const CRIME = MOVIES.filter(m => m.genre.includes('Crime'));
const SCIFI = MOVIES.filter(m => m.genre.includes('Sci-Fi'));
const ADVENTURE = MOVIES.filter(m => m.genre.includes('Adventure'));
const ROMANCE = MOVIES.filter(m => m.genre.includes('Romance'));
const NEW_MOVIES = MOVIES.filter(m => m.isNew);

// Pick a random featured movie once per page load
const featuredPool = MOVIES.filter(m => m.isFeatured);
const heroPool = featuredPool.length > 0 ? featuredPool : MOVIES.slice(0, 5);
const HERO_MOVIE = heroPool[Math.floor(Math.random() * heroPool.length)];

export default function MoviesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className={styles.app}>
      <Navbar user={user} onLogout={handleLogout} />

      <HeroBanner movie={HERO_MOVIE} />

      <div className={styles.rows}>
        {NEW_MOVIES.length > 0 && <MovieRow title="New Releases" movies={NEW_MOVIES} />}
        <MovieRow title="All Movies" movies={MOVIES} />
        {ACTION.length > 0 && <MovieRow title="Action & Thriller" movies={ACTION} />}
        {CRIME.length > 0 && <MovieRow title="Crime & Mystery" movies={CRIME} />}
        {SCIFI.length > 0 && <MovieRow title="Sci-Fi" movies={SCIFI} />}
        {ADVENTURE.length > 0 && <MovieRow title="Adventure" movies={ADVENTURE} />}
        {ROMANCE.length > 0 && <MovieRow title="Romance & Drama" movies={ROMANCE} />}
      </div>

      <footer className={styles.footer}>
        <p>MTMovies © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

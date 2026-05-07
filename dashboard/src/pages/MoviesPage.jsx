import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import MovieRow from '../components/MovieRow';
import { MOVIES } from '../data/movies';
import styles from '../App.module.css';
import pageStyles from './MoviesPage.module.css';

const ACTION    = MOVIES.filter(m => m.genre.includes('Action'));
const CRIME     = MOVIES.filter(m => m.genre.includes('Crime'));
const SCIFI     = MOVIES.filter(m => m.genre.includes('Sci-Fi'));
const ADVENTURE = MOVIES.filter(m => m.genre.includes('Adventure'));
const ROMANCE   = MOVIES.filter(m => m.genre.includes('Romance'));
const NEW_MOVIES = MOVIES.filter(m => m.isNew);

export default function MoviesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className={styles.app}>
      <Navbar user={user} onLogout={handleLogout} />

      {/* Hero banner */}
      <div className={pageStyles.hero}>
        <div className={pageStyles.heroOverlay}>
          <h1 className={pageStyles.heroTitle}>Movies</h1>
          <p className={pageStyles.heroSub}>All movies — fully dubbed in Amharic</p>
        </div>
      </div>

      <div className={styles.rows}>
        {NEW_MOVIES.length > 0 && <MovieRow title="New Releases" movies={NEW_MOVIES} />}
        <MovieRow title="All Movies" movies={MOVIES} />
        {ACTION.length    > 0 && <MovieRow title="Action & Thriller"  movies={ACTION} />}
        {CRIME.length     > 0 && <MovieRow title="Crime & Mystery"    movies={CRIME} />}
        {SCIFI.length     > 0 && <MovieRow title="Sci-Fi"             movies={SCIFI} />}
        {ADVENTURE.length > 0 && <MovieRow title="Adventure"          movies={ADVENTURE} />}
        {ROMANCE.length   > 0 && <MovieRow title="Romance & Drama"    movies={ROMANCE} />}
      </div>

      <footer className={styles.footer}>
        <p>MTMovies © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

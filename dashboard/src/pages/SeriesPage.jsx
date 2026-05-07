import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import MovieRow from '../components/MovieRow';
import { SERIES } from '../data/series';
import styles from '../App.module.css';
import pageStyles from './MoviesPage.module.css'; // reuse same hero styles

const ACTION  = SERIES.filter(s => s.genre.includes('Action'));
const DRAMA   = SERIES.filter(s => s.genre.includes('Drama'));
const CRIME   = SERIES.filter(s => s.genre.includes('Crime'));
const SCIFI   = SERIES.filter(s => s.genre.includes('Sci-Fi'));
const MYSTERY = SERIES.filter(s => s.genre.includes('Mystery') || s.genre.includes('Thriller'));
const NEW_SERIES = SERIES.filter(s => s.isNew);

export default function SeriesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className={styles.app}>
      <Navbar user={user} onLogout={handleLogout} />

      {/* Hero banner */}
      <div className={pageStyles.hero}>
        <div className={pageStyles.heroOverlay}>
          <h1 className={pageStyles.heroTitle}>TV Series</h1>
          <p className={pageStyles.heroSub}>Binge-worthy series — fully dubbed in Amharic</p>
        </div>
      </div>

      <div className={styles.rows}>
        {NEW_SERIES.length > 0 && <MovieRow title="New Series"          movies={NEW_SERIES} />}
        <MovieRow title="All Series"          movies={SERIES} />
        {ACTION.length  > 0 && <MovieRow title="Action & Adventure" movies={ACTION} />}
        {DRAMA.length   > 0 && <MovieRow title="Drama"              movies={DRAMA} />}
        {CRIME.length   > 0 && <MovieRow title="Crime"              movies={CRIME} />}
        {SCIFI.length   > 0 && <MovieRow title="Sci-Fi"             movies={SCIFI} />}
        {MYSTERY.length > 0 && <MovieRow title="Mystery & Thriller"  movies={MYSTERY} />}
      </div>

      <footer className={styles.footer}>
        <p>MTMovies © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

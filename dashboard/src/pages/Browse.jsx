import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMyList } from '../hooks/useMyList';
import Navbar from '../components/Navbar';
import HeroBanner from '../components/HeroBanner';
import MovieRow from '../components/MovieRow';
import { MOVIES } from '../data/movies';
import { SERIES } from '../data/series';
import styles from '../App.module.css';

// Generate static featured item ONCE per full page load (persists across SPA navigation)
const pool = [...MOVIES.filter(m => m.isFeatured), ...SERIES.filter(s => s.isFeatured || s.id === 'sq1')];
const fallbackPool = [...MOVIES.slice(0, 5), ...SERIES.slice(0, 5)];
const activePool = pool.length > 0 ? pool : fallbackPool;
const INITIAL_FEATURED = activePool[Math.floor(Math.random() * activePool.length)];

const NEW = [...MOVIES, ...SERIES].filter(item => item.isNew);
const ACTION = MOVIES.filter(m => m.genre.includes('Action'));
const CRIME = MOVIES.filter(m => m.genre.includes('Crime'));
const scifi = MOVIES.filter(m => m.genre.includes('Sci-Fi'));
const adventure = MOVIES.filter(m => m.genre.includes('Adventure'));
const romance = MOVIES.filter(m => m.genre.includes('Romance'));


function parseDuration(str) {
  if (!str) return 0;
  let h = 0, m = 0;
  const hMatch = str.match(/(\d+)h/);
  const mMatch = str.match(/(\d+)m/);
  if (hMatch) h = parseInt(hMatch[1], 10);
  if (mMatch) m = parseInt(mMatch[1], 10);
  return h * 3600 + m * 60;
}

export default function Browse() {
  const { user, token, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { myList } = useMyList();

  const myListItems = myList.map(item => {
    if (item.type === 'movie') return MOVIES.find(m => m.id === item.id);
    return SERIES.find(s => s.id === item.id);
  }).filter(Boolean);

  // Refresh user profile when arriving at browse page
  useEffect(() => {
    if (token) {
      fetch('https://mtmovies-production.up.railway.app/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) updateUser(data.user);
        })
        .catch(console.error);
    }
  }, [token, updateUser]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const continueWatching = user?.watchHistory
    ? [...user.watchHistory]
      .sort((a, b) => {
        const timeA = a.watchedAt ? new Date(a.watchedAt).getTime() : 0;
        const timeB = b.watchedAt ? new Date(b.watchedAt).getTime() : 0;
        return timeB - timeA;
      })
      .map(h => {
        let isSeries = false;
        let m = MOVIES.find(m => String(m.id) === h.movieId);

        if (m) {
          m = { ...m, continueWatchUrl: `/watch/${m.id}` };
        } else if (h.movieId.includes('_S')) {
          // It's a series! ID format: "sq1_S1_E2"
          const [seriesId, sNum, eNum] = h.movieId.split('_');
          const series = SERIES.find(s => String(s.id) === seriesId);
          if (series) {
            const season = series.seasons.find(s => String(s.seasonNumber) === sNum.replace('S', ''));
            if (season) {
              const ep = season.episodes.find(e => String(e.episodeNumber) === eNum.replace('E', ''));
              if (ep) {
                m = { ...series }; // Base series data for the card
                m.id = h.movieId; // Use compound ID for unique key
                m.continueWatchUrl = `/watch-series/${series.id}/s/${season.seasonNumber}/e/${ep.episodeNumber}`;
                m.episodeText = `S${season.seasonNumber} E${ep.episodeNumber}`;
                isSeries = true;
                // For progress calculation
                m.duration = ep.duration;
              }
            }
          }
        }

        if (!m) return null;
        const totalSecs = parseDuration(m.duration);
        let progressPct = 0;
        if (totalSecs > 0 && h.progress > 0) {
          progressPct = Math.min(100, Math.max(0, (h.progress / totalSecs) * 100));
        }
        return { ...m, progressPct };
      })
      .filter(m => m)
    : [];

  return (
    <div className={styles.app}>
      <Navbar user={user} onLogout={handleLogout} />
      <HeroBanner movie={INITIAL_FEATURED} />
      <div className={styles.rows}>

        {NEW.length > 0 && <MovieRow title="New Releases" movies={NEW} />}
        {continueWatching.length > 0 && (
          <MovieRow title="Continue Watching" movies={continueWatching} />
        )}
        <MovieRow title="TV Series" movies={SERIES} />
        {ACTION.length > 0 && <MovieRow title="Action & Thriller" movies={ACTION} />}

        {CRIME.length > 0 && <MovieRow title="Crime" movies={CRIME} />}

        {scifi.length > 0 && <MovieRow title="Sci-Fi" movies={scifi} />}

        {adventure.length > 0 && <MovieRow title="Adventure" movies={adventure} />}

        {romance.length > 0 && <MovieRow title="Romance & Drama" movies={romance} />}

        {myListItems.length > 0 && (
          <MovieRow title="My List" movies={myListItems} />
        )}
      </div>
      <footer className={styles.footer}>
        <p>MTMovies © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

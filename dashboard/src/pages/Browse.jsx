import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMyList } from '../hooks/useMyList';
import Navbar from '../components/Navbar';
import HeroBanner from '../components/HeroBanner';
import MovieRow from '../components/MovieRow';
import { useMovies } from '../context/MovieContext';
import PageSkeleton from '../components/PageSkeleton';
import styles from '../App.module.css';

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
  const { movies: MOVIES, series: SERIES, featuredItem, loading } = useMovies();

  const myListItems = myList.map(item => {
    if (item.type === 'movie') return MOVIES.find(m => String(m.id) === String(item.id));
    return SERIES.find(s => String(s.id) === String(item.id));
  }).filter(Boolean);

  // Refresh user profile when arriving at browse page
  useEffect(() => {
    if (token) {
      fetch('http://localhost:5000/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 401) {
            // Token expired — force re-login
            logout();
            navigate('/');
            return null;
          }
          return res.json();
        })
        .then(data => {
          if (data?.user) updateUser(data.user);
        })
        .catch(console.error);
    }
  }, [token, updateUser, logout, navigate]);

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
        // Detect series compound ID: "<mongoId>_S1_E2"
        const seriesMatch = h.movieId.match(/^(.+)_S(\d+)_E(\d+)$/);

        let m = null;
        if (seriesMatch) {
          // It's a series episode
          const [, seriesId, sNum, eNum] = seriesMatch;
          const series = SERIES.find(s => String(s.id) === seriesId);

          if (series) {
            const season = series.seasons?.find(s => String(s.seasonNumber) === sNum);
            if (season) {
              const ep = season.episodes?.find(e => String(e.episodeNumber) === eNum);
              if (ep) {
                m = { ...series };
                m.id = h.movieId; // compound key for deduplication
                m.continueWatchUrl = `/watch-series/${series.id}/s/${sNum}/e/${eNum}`;
                m.episodeText = `S${sNum.padStart(2, '0')}E${eNum.padStart(2, '0')}`;
                m.duration = ep.duration; // episode duration for progress %
              }
            }
          }
        } else {
          // It's a regular movie
          const found = MOVIES.find(movie => String(movie.id) === h.movieId);
          if (found) {
            m = { ...found, continueWatchUrl: `/watch/${found.id}` };
          }
        }

        if (!m) return null;

        const totalSecs = parseDuration(m.duration);
        let progressPct = (totalSecs > 0 && h.progress > 0)
          ? Math.min(99, Math.max(1, (h.progress / totalSecs) * 100))
          : 0;

        return { ...m, progressPct };
      })
      .filter(Boolean)
      .slice(0, 10) // max 10 items
    : [];

  // DEBUG: log watch history to diagnose progress bar issues
  if (user?.watchHistory?.length > 0) {
    console.log('[Browse] Raw watchHistory:', user.watchHistory);
    console.log('[Browse] Computed continueWatching:', continueWatching.map(x => ({
      title: x.title,
      duration: x.duration,
      progressPct: x.progressPct,
      continueWatchUrl: x.continueWatchUrl
    })));
  }

  const hasActivePlan = user?.plan && user.plan !== 'free';
  const hasWatchHistory = continueWatching.length > 0;

  let picksForYou = [];
  if (hasActivePlan && hasWatchHistory) {
    const historyGenres = new Set();
    continueWatching.forEach(item => {
      if (item.genre) {
        item.genre.split('•').forEach(g => historyGenres.add(g.trim()));
      }
    });

    const historyBaseIds = new Set(continueWatching.map(item => {
      // For series, id looks like 'sq1_S1_E2', we want the base id 'sq1'
      return String(item.id).split('_')[0];
    }));

    const allContent = [...MOVIES, ...SERIES];

    const scoredItems = allContent
      .filter(item => !historyBaseIds.has(String(item.id)))
      .map(item => {
        let score = 0;
        if (item.genre) {
          item.genre.split('•').forEach(g => {
            if (historyGenres.has(g.trim())) score++;
          });
        }
        return { item, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || Math.random() - 0.5);

    picksForYou = scoredItems.slice(0, 10).map(x => x.item);
  }

  if (loading || !featuredItem) return <PageSkeleton />;

  const NEW = [...MOVIES, ...SERIES].filter(item => item.isNew);
  
  const trending = [...MOVIES, ...SERIES]
    .map(item => {
      const views = item.stats?.views || 0;
      const likes = item.stats?.likes || 0;
      return { item, score: views + (likes * 2) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(x => x.item);

  const ACTION = MOVIES.filter(m => m.genre && m.genre.includes('Action'));
  const CRIME = MOVIES.filter(m => m.genre && m.genre.includes('Crime'));
  const scifi = MOVIES.filter(m => m.genre && m.genre.includes('Sci-Fi'));
  const adventure = MOVIES.filter(m => m.genre && m.genre.includes('Adventure'));
  const romance = MOVIES.filter(m => m.genre && m.genre.includes('Romance'));
  const comedy = MOVIES.filter(m => m.genre && m.genre.includes('Comedy'));

  return (
    <div className={styles.app}>
      <Navbar user={user} onLogout={handleLogout} />

      <HeroBanner movie={featuredItem} />
      <div className={styles.rows}>

        {trending.length > 0 && <MovieRow title="Trending This Week" movies={trending} landscape={true} />}
        {NEW.length > 0 && <MovieRow title="New Releases" movies={NEW} />}
        {continueWatching.length > 0 && (
          <MovieRow title="Continue Watching" movies={continueWatching} />
        )}
        {picksForYou.length > 0 && (
          <MovieRow title="Picks for You" movies={picksForYou} />
        )}
        <MovieRow title="TV Series" movies={SERIES} />
        {ACTION.length > 0 && <MovieRow title="Action & Thriller" movies={ACTION} />}

        {CRIME.length > 0 && <MovieRow title="Crime" movies={CRIME} />}

        {scifi.length > 0 && <MovieRow title="Sci-Fi" movies={scifi} />}

        {adventure.length > 0 && <MovieRow title="Adventure" movies={adventure} />}

        {romance.length > 0 && <MovieRow title="Romance & Drama" movies={romance} />}
        {comedy.length > 0 && <MovieRow title="Comedy" movies={comedy} />}

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

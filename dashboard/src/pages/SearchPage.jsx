import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { FiArrowLeft, FiSearch, FiX } from 'react-icons/fi';
import { FaPlay } from 'react-icons/fa';
import PageSkeleton from '../components/PageSkeleton';
import styles from './SearchPage.module.css';
function matchesQuery(item, q) {
  const lower = q.toLowerCase();
  return (
    item.title?.toLowerCase().includes(lower) ||
    item.titleAmharic?.includes(q) ||
    item.genre?.toLowerCase().includes(lower)
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    const searchTerm = query.trim();
    if (!searchTerm) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const [moviesRes, seriesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/movies?search=${encodeURIComponent(searchTerm)}&limit=50`),
          fetch(`${API_BASE_URL}/series?search=${encodeURIComponent(searchTerm)}&limit=50`)
        ]);

        let mData = { movies: [] };
        let sData = { series: [] };

        if (moviesRes.ok) mData = await moviesRes.json();
        if (seriesRes.ok) sData = await seriesRes.json();

        const formattedMovies = (mData.movies || []).map(m => ({
          ...m,
          id: m._id,
          type: 'movie',
          genre: m.genres ? m.genres.join(' • ') : '',
        }));

        const formattedSeries = (sData.series || []).map(s => ({
          ...s,
          id: s._id,
          type: 'series',
          genre: s.genres ? s.genres.join(' • ') : '',
        }));

        setResults([...formattedMovies, ...formattedSeries]);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <FiArrowLeft />
        </button>

        <div className={styles.inputWrap}>
          <FiSearch className={styles.inputIcon} />
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Search movies, series…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button
              className={styles.clearBtn}
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              aria-label="Clear"
            >
              <FiX />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className={styles.body}>
        {!query.trim() && (
          <div className={styles.empty}>
            <FiSearch size={48} className={styles.emptyIcon} />
            <p>Search for movies & series</p>
            <span>Also works with Amharic titles</span>
          </div>
        )}

        {query.trim() && isSearching && (
          <div className={styles.empty}>
            <div className={styles.spinner} style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#E50914', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite' }}></div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {query.trim() && !isSearching && results.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.noResult}>No results for "{query}"</p>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className={styles.grid}>
            {results.map(item => (
              <div
                key={`${item.type}-${item.id}`}
                className={styles.card}
                onClick={() => navigate(item.type === 'series' ? `/series/${item.id}` : `/movie/${item.id}`)}
              >
                <div className={styles.posterWrap}>
                  <img src={item.poster} alt={item.title} className={styles.poster} loading="lazy" />
                  <div className={styles.overlay}>
                    <FaPlay size={22} />
                  </div>
                </div>
                <div className={styles.info}>
                  <p className={styles.title}>{item.title}</p>
                  <div className={styles.meta}>
                    <span className={styles.typeBadge}>{item.type === 'series' ? 'Series' : 'Movie'}</span>
                    <span>{item.year}</span>
                    {item.genre && <span>{item.genre.split(' • ')[0]}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

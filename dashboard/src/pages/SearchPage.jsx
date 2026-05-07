import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOVIES } from '../data/movies';
import { SERIES } from '../data/series';
import { FiArrowLeft, FiSearch, FiX } from 'react-icons/fi';
import { FaPlay } from 'react-icons/fa';
import styles from './SearchPage.module.css';

const ALL = [
  ...MOVIES.map(m => ({ ...m, type: 'movie' })),
  ...SERIES.map(s => ({ ...s, type: 'series' })),
];

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
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const results = query.trim() ? ALL.filter(i => matchesQuery(i, query.trim())) : [];

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

        {query.trim() && results.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.noResult}>No results for "{query}"</p>
          </div>
        )}

        {results.length > 0 && (
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

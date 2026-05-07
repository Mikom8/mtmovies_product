import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import styles from './Navbar.module.css';
import { FiChevronDown, FiChevronUp, FiSettings, FiLogOut, FiSearch, FiX } from 'react-icons/fi';
import { FaPlay } from 'react-icons/fa';
import { MOVIES } from '../data/movies';
import { SERIES } from '../data/series';

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

export default function Navbar({ user, onLogout, hideLinks = false }) {
  const [scrolled, setScrolled]       = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [query, setQuery]             = useState('');
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth <= 768);
  const timeoutRef  = useRef(null);
  const searchRef   = useRef(null);
  const inputRef    = useRef(null);
  const navigate    = useNavigate();

  /* track mobile breakpoint */
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  /* scroll shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* close desktop popup on outside click */
  useEffect(() => {
    if (!searchOpen || isMobile) return;
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen, isMobile]);

  /* focus input when desktop popup opens */
  useEffect(() => {
    if (searchOpen && !isMobile && inputRef.current) inputRef.current.focus();
  }, [searchOpen, isMobile]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMenuOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setMenuOpen(false), 200);
  };

  const handleSearchIconClick = () => {
    if (isMobile) {
      navigate('/search');   // full-screen page on mobile
    } else {
      setSearchOpen(v => !v);
      if (searchOpen) setQuery('');
    }
  };

  const desktopResults = query.trim() ? ALL.filter(i => matchesQuery(i, query.trim())).slice(0, 8) : [];

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      {hideLinks ? (
        <div className={styles.brand} style={{ cursor: 'default' }}>
          <img
            src="https://res.cloudinary.com/dyop5rdpn/image/upload/v1699352390/MT%20Movies/mt_movies_transparent_dark_x5j2m8.png"
            alt="MTMovies"
          />
          <span><strong>MT</strong>Movies</span>
        </div>
      ) : (
        <a href="/" className={styles.brand}>
          <img
            src="https://res.cloudinary.com/dyop5rdpn/image/upload/v1699352390/MT%20Movies/mt_movies_transparent_dark_x5j2m8.png"
            alt="MTMovies"
          />
          <span><strong>MT</strong>Movies</span>
        </a>
      )}

      {!hideLinks && (
        <div className={styles.navLinks}>
          <NavLink to="/browse"    className={({ isActive }) => isActive ? styles.active : ''}>Home</NavLink>
          <NavLink to="/movies"    className={({ isActive }) => isActive ? styles.active : ''}>Movies</NavLink>
          <NavLink to="/tv-series" className={({ isActive }) => isActive ? styles.active : ''}>TV Series</NavLink>
          <NavLink to="/my-list"   className={({ isActive }) => isActive ? styles.active : ''}>My List</NavLink>
        </div>
      )}

      <div className={styles.navRight}>
        {/* ── Search ── */}
        {!hideLinks && (
          <div className={styles.searchWrap} ref={searchRef}>
            {/* Desktop expanding input + popup */}
            {!isMobile && (
              <form
                className={`${styles.searchForm} ${searchOpen ? styles.searchFormOpen : ''}`}
                onSubmit={(e) => { e.preventDefault(); setSearchOpen(false); setQuery(''); }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search movies, series…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    className={styles.searchClear}
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    <FiX />
                  </button>
                )}
              </form>
            )}

            {/* Icon button — always visible */}
            <button
              className={`${styles.searchIconBtn} ${searchOpen ? styles.searchIconActive : ''}`}
              onClick={handleSearchIconClick}
              aria-label="Search"
            >
              <FiSearch />
            </button>

            {/* Desktop popup results */}
            {!isMobile && searchOpen && desktopResults.length > 0 && (
              <div className={styles.searchPopup}>
                {desktopResults.map(item => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className={styles.popupItem}
                    onClick={() => {
                      navigate(item.type === 'series' ? `/series/${item.id}` : `/movie/${item.id}`);
                      setSearchOpen(false);
                      setQuery('');
                    }}
                  >
                    <img src={item.poster} alt={item.title} className={styles.popupPoster} />
                    <div className={styles.popupInfo}>
                      <p className={styles.popupTitle}>{item.title}</p>
                      {item.titleAmharic && (
                        <p className={styles.popupAmharic}>{item.titleAmharic}</p>
                      )}
                      <div className={styles.popupMeta}>
                        <span className={styles.popupBadge}>{item.type === 'series' ? 'Series' : 'Movie'}</span>
                        <span>{item.year}</span>
                      </div>
                    </div>
                    <FaPlay size={12} className={styles.popupPlay} />
                  </div>
                ))}
              </div>
            )}

            {/* Desktop popup — no results */}
            {!isMobile && searchOpen && query.trim() && desktopResults.length === 0 && (
              <div className={styles.searchPopup}>
                <p className={styles.popupEmpty}>No results for "{query}"</p>
              </div>
            )}
          </div>
        )}

        {/* ── User menu / sign-out ── */}
        {hideLinks ? (
          <button
            onClick={onLogout}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer', padding: '8px 16px' }}
          >
            Sign Out
          </button>
        ) : (
          <div
            className={styles.userMenu}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => {
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              setMenuOpen(!menuOpen);
            }}
          >
            <img
              src={user?.avatar || 'https://res.cloudinary.com/dyop5rdpn/image/upload/v1692821899/MT%20Movies/profile_skqfj2.png'}
              alt={user?.name}
              className={styles.avatar}
            />
            <span className={styles.userName}>{user?.name || 'User'}</span>
            <span className={styles.chevron}>{menuOpen ? <FiChevronUp /> : <FiChevronDown />}</span>

            {menuOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownUser}>
                  <strong>{user?.name}</strong>
                  <span className={styles.planBadge}>{user?.plan || 'free'}</span>
                </div>
                <hr />
                <NavLink to="/account" className={styles.dropdownItem}><FiSettings style={{ marginRight: '8px' }} /> Account</NavLink>
                <button onClick={onLogout} className={styles.dropdownItem}><FiLogOut style={{ marginRight: '8px' }} /> Log Out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

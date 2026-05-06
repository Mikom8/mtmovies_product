import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';
import { FiChevronDown, FiChevronUp, FiSettings, FiLogOut } from 'react-icons/fi';

export default function Navbar({ user, onLogout, hideLinks = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMenuOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setMenuOpen(false);
    }, 200); // 100ms delay to allow moving mouse into dropdown
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
          <Link to="/browse" className={styles.active}>Home</Link>
          <Link to="/browse">Movies</Link>
          <Link to="/browse">Series</Link>
          <Link to="/my-list">My List</Link>
        </div>
      )}

      <div className={styles.navRight}>
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
                <Link to="/account" className={styles.dropdownItem}><FiSettings style={{ marginRight: '8px' }} /> Account</Link>
                <button onClick={onLogout} className={styles.dropdownItem}><FiLogOut style={{ marginRight: '8px' }} /> Log Out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

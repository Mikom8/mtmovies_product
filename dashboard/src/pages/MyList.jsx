import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMyList } from '../hooks/useMyList';
import Navbar from '../components/Navbar';
import { MOVIES } from '../data/movies';
import { SERIES } from '../data/series';
import { FaPlay } from 'react-icons/fa';
import styles from './MyList.module.css';

export default function MyList() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { myList, loading } = useMyList();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getListItems = () => {
    return myList.map(item => {
      if (item.type === 'movie') {
        return MOVIES.find(m => m.id === item.id) || null;
      } else {
        return SERIES.find(s => s.id === item.id) || null;
      }
    }).filter(Boolean);
  };

  const items = getListItems();

  const handleItemClick = (item) => {
    if (item.seasons) {
      navigate(`/series/${item.id}`);
    } else {
      navigate(`/movie/${item.id}`);
    }
  };

  const handlePlayClick = (e, item) => {
    e.stopPropagation();
    if (item.seasons) {
      navigate(`/watch-series/${item.id}/s/1/e/1`);
    } else {
      navigate(`/watch/${item.id}`);
    }
  };

  // Skeleton placeholders
  const skeletonCount = 10;
  const SkeletonGrid = () => (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <div key={i} className={styles.skeletonCard} style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
  const SkeletonMobileList = () => (
    <div className={styles.skeletonMobileList}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.skeletonListItem} style={{ animationDelay: `${i * 0.12}s` }}>
          <div className={styles.skeletonListImg} style={{ animationDelay: `${i * 0.12}s` }} />
          <div className={styles.skeletonListText} style={{ width: `${50 + Math.random() * 30}%`, animationDelay: `${i * 0.12}s` }} />
          <div className={styles.skeletonListCircle} style={{ animationDelay: `${i * 0.12}s` }} />
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles.page}>
      <Navbar user={user} onLogout={handleLogout} />

      <div className={styles.container}>
        <h1 className={styles.title}>My List</h1>

        {loading ? (
          <>
            <SkeletonGrid />
            <SkeletonMobileList />
          </>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            You haven't added anything to your list yet.
          </div>
        ) : (
          <>
            {/* PC Layout - Grid */}
            <div className={styles.grid}>
              {items.map(item => (
                <div key={item.id} className={styles.card} onClick={() => handleItemClick(item)}>
                  <img src={item.mylist || item.backdrop || item.poster} alt={item.title} className={styles.cardImg} loading="lazy" />
                  {!item.backdrop && <div className={styles.cardTitle}>{item.title}</div>}
                </div>
              ))}
            </div>

            {/* Mobile Layout - List */}
            <div className={styles.mobileList}>
              {items.map(item => (
                <div key={item.id} className={styles.listItem} onClick={() => handleItemClick(item)}>
                  <div className={styles.listItemImgWrapper}>
                    <img src={item.mylist || item.backdrop || item.poster} alt={item.title} className={styles.listItemImg} loading="lazy" />
                  </div>
                  <div className={styles.listItemTitle}>{item.title}</div>
                  <div className={styles.listItemPlay} onClick={(e) => handlePlayClick(e, item)}>
                    <FaPlay />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

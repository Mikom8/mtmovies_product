import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMyList } from '../hooks/useMyList';
import { useMovies } from '../context/MovieContext';
import Navbar from '../components/Navbar';
import { FaPlay, FaPlus, FaCheck, FaStar } from 'react-icons/fa';
import { IoIosArrowBack } from 'react-icons/io';
import styles from './SeriesDetails.module.css';

export default function SeriesDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { series: SERIES, loading } = useMovies();

  const [series, setSeries] = useState(null);
  const [activeSeason, setActiveSeason] = useState(1);
  const { toggleMyList, isInMyList } = useMyList();

  const [isExpanding, setIsExpanding] = useState(false);
  const [expandPos, setExpandPos] = useState({ x: 0, y: 0 });
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!loading && SERIES.length > 0) {
      const s = SERIES.find(s => String(s.id) === String(id));
      if (s) {
        setSeries(s);
        if (s.seasons && s.seasons.length > 0) {
          setActiveSeason(s.seasons[0].seasonNumber);
        }
      } else {
        navigate('/browse');
      }
    }
  }, [id, navigate, loading, SERIES]);

  if (loading || !series) return (
    <div className={styles.page}>
      <Navbar user={user} onLogout={() => { logout(); navigate('/'); }} />

      {/* Hero skeleton */}
      <div className={styles.skeletonHero}>
        <div className={styles.skeletonHeroContent}>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonMeta} />
          <div className={styles.skeletonDesc} />
          <div className={styles.skeletonDescShort} />
          <div className={styles.skeletonDescShort} style={{ width: '60%' }} />
          <div className={styles.skeletonGenre} />
          <div className={styles.skeletonBtnRow}>
            <div className={styles.skeletonBtn} />
            <div className={styles.skeletonBtnSm} />
          </div>
        </div>
      </div>

      {/* Episodes skeleton */}
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonSectionTitle} />
        <div className={styles.skeletonEpisodeList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonEpisodeCard}>
              <div className={styles.skeletonEpImage} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className={styles.skeletonEpTitle} />
                <div className={styles.skeletonEpDuration} />
              </div>
            </div>
          ))}
        </div>

        {/* More Like This skeleton */}
        <div className={styles.skeletonSectionTitle} />
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonPoster} />
              <div className={styles.skeletonCardTitle} />
              <div className={styles.skeletonCardMeta} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const currentSeason = series.seasons?.find(s => s.seasonNumber === activeSeason);

  // Find user progress if any
  const getEpisodeProgress = (sNum, eNum) => {
    if (!user || !user.watchHistory) return 0;
    const compoundId = `${series.id}_S${sNum}_E${eNum}`;
    const h = user.watchHistory.find(x => x.movieId === compoundId);
    return h ? h.progress : 0;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getSimilarContent = () => {
    if (!series || !series.genre) return [];

    const currentPrimaryGenre = series.genre.split(' • ')[0];
    const currentGenres = series.genre.split(' • ');

    const pool = [...SERIES].filter(item => String(item.id) !== String(series.id) && item.genre);

    const scored = pool.map(item => {
      let score = 0;
      const itemGenres = item.genre.split(' • ');
      const itemPrimaryGenre = itemGenres[0];

      // Primary genre match: +5
      if (itemPrimaryGenre === currentPrimaryGenre) {
        score += 5;
      }

      // Secondary genres match: +2 per match
      itemGenres.forEach(g => {
        if (currentGenres.includes(g) && g !== currentPrimaryGenre) {
          score += 2;
        }
      });

      // Year proximity: max +10, min +0
      const yearDiff = Math.abs(item.year - series.year);
      score += Math.max(0, 10 - yearDiff);

      return { ...item, score };
    });

    // Only include items that had at least one genre match (score > 10)
    return scored
      .filter(item => item.score > 10)
      .sort((a, b) => b.score - a.score)
      .slice(0, 9); // 9 items total for a 3x3 grid on mobile
  };

  const similar = getSimilarContent();

  const handleWatchClick = (e, url) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    setExpandPos({ x, y });
    setIsExpanding(true);

    setTimeout(() => {
      setShowSpinner(true);
      setTimeout(() => {
        navigate(url);
      }, 500); // wait a bit before navigating so spinner is seen
    }, 500); // 500ms for the cubic-bezier expansion to finish
  };

  return (
    <>
      {isExpanding && (
        <div
          className={styles.expansionOverlay}
          style={{
            '--origin-x': `${expandPos.x}px`,
            '--origin-y': `${expandPos.y}px`
          }}
        >
          {showSpinner && <div className={styles.spinner}></div>}
        </div>
      )}
      <div className={styles.page}>
        <Navbar user={user} onLogout={handleLogout} />

        <div className={styles.hero} style={{ backgroundImage: `url(${series.backdrop})` }}>
          <div className={styles.heroOverlay}>
            <div className={styles.heroContent}>
              <h1 className={styles.title}>{series.title}</h1>
              {series.titleAmharic && <h2 className={styles.subtitle}></h2>}

              <div className={styles.meta}>
                <span className={styles.rating}>
                  <FaStar style={{ marginRight: '5px', color: '#ffd700' }} />
                  {series.rating}
                </span>
                <span>•</span>
                <span>{series.year}</span>
                <span>•</span>
                <span className={styles.quality}>{series.quality || 'HD'}</span>
                <span>•</span>
                <span>{series.seasons?.length || 0} Season{series.seasons?.length > 1 ? 's' : ''}</span>
              </div>

              <p className={styles.description}>{series.description}</p>
              <p className={styles.genre}><strong>Genres:</strong> {series.genre}</p>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
                <button
                  className={styles.playMainBtn}
                  onClick={(e) => {
                    const firstEp = series.seasons?.[0]?.episodes?.[0];
                    if (firstEp) handleWatchClick(e, `/watch-series/${series.id}/s/1/e/1`);
                  }}
                >
                  <FaPlay /> Play
                </button>
                <button
                  className={styles.myListBtn}
                  onClick={() => toggleMyList(series)}
                >
                  {isInMyList(series.id) ? <><FaCheck /> In My List</> : <><FaPlus /> My List</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.seasonSelector}>
            <h2>Episodes</h2>
            {series.seasons?.length > 1 && (
              <select
                value={activeSeason}
                onChange={e => setActiveSeason(Number(e.target.value))}
                className={styles.dropdown}
              >
                {series.seasons.map(s => (
                  <option key={s.seasonNumber} value={s.seasonNumber}>
                    Season {s.seasonNumber}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className={styles.episodesList}>
            {currentSeason && currentSeason.episodes?.map(ep => {
              const progress = getEpisodeProgress(currentSeason.seasonNumber, ep.episodeNumber);
              // Rough parsing for progress bar
              let totalSecs = 3600; // default 1h
              const hMatch = ep.duration.match(/(\d+)h/);
              const mMatch = ep.duration.match(/(\d+)m/);
              if (hMatch || mMatch) {
                totalSecs = (hMatch ? parseInt(hMatch[1]) * 3600 : 0) + (mMatch ? parseInt(mMatch[1]) * 60 : 0);
              }
              const pct = Math.min(100, Math.max(0, (progress / totalSecs) * 100));

              return (
                <div
                  key={ep.episodeNumber}
                  className={styles.episodeCard}
                  onClick={(e) => handleWatchClick(e, `/watch-series/${series.id}/s/${currentSeason.seasonNumber}/e/${ep.episodeNumber}`)}
                >
                  <div className={styles.epImageWrap}>
                    <img src={series.backdrop} alt={ep.title} className={styles.epImage} />
                    <div className={styles.playIcon}><FaPlay /></div>
                    {pct > 0 && (
                      <div className={styles.progressWrap}>
                        <div className={styles.progressFill} style={{ width: `${pct}%` }}></div>
                      </div>
                    )}
                  </div>

                  <div className={styles.epInfo}>
                    <div className={styles.epHeader}>
                      <h3 className={styles.epTitle}>{ep.episodeNumber}. {ep.title}</h3>
                      <span className={styles.epDuration}>{ep.duration}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* More Like This */}
          {similar.length > 0 && (
            <div className={styles.moreSection}>
              <h2 className={styles.moreTitle}>More Like This</h2>
              <div className={styles.moreGrid}>
                {similar.map(m => {
                  const isSeriesItem = m.type === 'series';
                  return (
                    <div
                      key={m.id}
                      className={styles.moreCard}
                      onClick={() => navigate(isSeriesItem ? `/series/${m.id}` : `/movie/${m.id}`)}
                    >
                      <img src={m.poster} alt={m.title} className={styles.morePoster} loading="lazy" />
                      <div className={styles.moreOverlay}>
                        <FaPlay size={26} className={styles.morePlay} />
                      </div>
                      <div className={styles.moreInfo}>
                        <p className={styles.moreMovieTitle}>{m.title}</p>
                        <div className={styles.moreMeta}>
                          <span className={styles.moreMetaGenre}>{m.genre.split(' • ')[0]}</span>
                          <span>{isSeriesItem ? 'Series' : 'Movie'} &bull; {m.year}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMyList } from '../hooks/useMyList';
import Navbar from '../components/Navbar';
import { SERIES } from '../data/series';
import { MOVIES } from '../data/movies';
import { FaPlay, FaPlus, FaCheck } from 'react-icons/fa';
import { IoIosArrowBack } from 'react-icons/io';
import styles from './SeriesDetails.module.css';

export default function SeriesDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [series, setSeries] = useState(null);
  const [activeSeason, setActiveSeason] = useState(1);
  const { toggleMyList, isInMyList } = useMyList();

  useEffect(() => {
    const s = SERIES.find(s => String(s.id) === id);
    if (s) {
      setSeries(s);
      if (s.seasons && s.seasons.length > 0) {
        setActiveSeason(s.seasons[0].seasonNumber);
      }
    } else {
      navigate('/browse');
    }
  }, [id, navigate]);

  if (!series) return <div className={styles.loading}>Loading...</div>;

  const currentSeason = series.seasons.find(s => s.seasonNumber === activeSeason);

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
    if (!series) return [];

    const currentPrimaryGenre = series.genre.split(' • ')[0];
    const currentGenres = series.genre.split(' • ');

    const pool = [...SERIES].filter(item => item.id !== series.id);

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

    return scored.sort((a, b) => b.score - a.score).slice(0, 10);
  };

  const similar = getSimilarContent();

  return (
    <div className={styles.page}>
      <Navbar user={user} onLogout={handleLogout} />

      <div className={styles.hero} style={{ backgroundImage: `url(${series.backdrop})` }}>
        <div className={styles.heroOverlay}>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>{series.title}</h1>
            {series.titleAmharic && <h2 className={styles.subtitle}></h2>}

            <div className={styles.meta}>
              <span>{series.year}</span>
              <span className={styles.quality}>{series.quality || 'HD'}</span>
              <span>{series.seasons.length} Season{series.seasons.length > 1 ? 's' : ''}</span>
            </div>

            <p className={styles.description}>{series.description}</p>
            <p className={styles.genre}><strong>Genres:</strong> {series.genre}</p>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
              <button
                className={styles.playMainBtn}
                onClick={() => {
                  const firstEp = series.seasons[0]?.episodes[0];
                  if (firstEp) navigate(`/watch-series/${series.id}/s/1/e/1`);
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
          {series.seasons.length > 1 && (
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
          {currentSeason && currentSeason.episodes.map(ep => {
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
                onClick={() => navigate(`/watch-series/${series.id}/s/${currentSeason.seasonNumber}/e/${ep.episodeNumber}`)}
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
                const isSeriesItem = m.seasons !== undefined;
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
  );
}

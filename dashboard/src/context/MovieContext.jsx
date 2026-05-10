import { createContext, useContext, useState, useEffect } from 'react';

const MovieContext = createContext();

export function useMovies() {
  return useContext(MovieContext);
}

export function MovieProvider({ children }) {
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [featuredItem, setFeaturedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        // Fetch movies and series concurrently
        const [moviesRes, seriesRes] = await Promise.all([
          fetch('http://localhost:5000/api/movies?limit=500'),
          fetch('http://localhost:5000/api/series?limit=500')
        ]);
        
        let moviesData = { movies: [] };
        if (moviesRes.ok) moviesData = await moviesRes.json();
        
        let seriesData = { series: [] };
        if (seriesRes.ok) {
          seriesData = await seriesRes.json();
        } else {
          // Fallback if backend isn't deployed yet: extract series from moviesData
          if (moviesData.movies && moviesData.movies.length > 0) {
            seriesData.series = moviesData.movies.filter(m => m.type === 'series');
            moviesData.movies = moviesData.movies.filter(m => m.type !== 'series');
          }
        }
        
        const transformMovie = m => ({
          ...m,
          id: m._id,
          type: 'movie',
          genre: m.genres ? m.genres.join(' • ') : '',
          telegramChatId: m.telegram?.chatId,
          telegramMessageId: m.telegram?.messageId,
          year: m.year,
        });

        const transformSeries = m => ({
          ...m,
          id: m._id,
          type: 'series',
          genre: m.genres ? m.genres.join(' • ') : '',
          telegramChatId: m.telegram?.chatId,
          telegramMessageId: m.telegram?.messageId,
          year: m.year,
        });

        const transformedMovies = moviesData.movies.map(transformMovie);
        const transformedSeries = seriesData.series.map(transformSeries);

        setMovies(transformedMovies);
        setSeries(transformedSeries);

        // Select featured item ONCE per session
        const pool = [...transformedMovies.filter(m => m.isFeatured), ...transformedSeries.filter(s => s.isFeatured || s.id === 'sq1')];
        const fallbackPool = [...transformedMovies.slice(0, 5), ...transformedSeries.slice(0, 5)];
        const activePool = pool.length > 0 ? pool : fallbackPool;
        if (activePool.length > 0) {
          setFeaturedItem(activePool[Math.floor(Math.random() * activePool.length)]);
        }
      } catch (err) {
        setError(err.message);
        console.error("Error fetching movies from DB:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  return (
    <MovieContext.Provider value={{ movies, series, featuredItem, loading, error }}>
      {children}
    </MovieContext.Provider>
  );
}

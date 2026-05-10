import { createContext, useContext, useState, useEffect } from 'react';

const MovieContext = createContext();

export function useMovies() {
  return useContext(MovieContext);
}

export function MovieProvider({ children }) {
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        // Fetch movies and series concurrently
        const [moviesRes, seriesRes] = await Promise.all([
          fetch('https://mtmovies-production.up.railway.app/api/movies?limit=500'),
          fetch('https://mtmovies-production.up.railway.app/api/series?limit=500')
        ]);
        
        let moviesData = { movies: [] };
        if (moviesRes.ok) moviesData = await moviesRes.json();
        
        let seriesData = { series: [] };
        if (seriesRes.ok) seriesData = await seriesRes.json();
        
        const transform = m => ({
          ...m,
          id: m._id,
          genre: m.genres ? m.genres.join(' • ') : '',
          telegramChatId: m.telegram?.chatId,
          telegramMessageId: m.telegram?.messageId,
          year: m.year,
        });

        setMovies(moviesData.movies.map(transform));
        setSeries(seriesData.series.map(transform));
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
    <MovieContext.Provider value={{ movies, series, loading, error }}>
      {children}
    </MovieContext.Provider>
  );
}

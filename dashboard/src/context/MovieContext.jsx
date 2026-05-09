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
        // We fetch all movies and series from our backend
        const res = await fetch('https://mtmovies-production.up.railway.app/api/movies?limit=500');
        if (!res.ok) throw new Error('Failed to fetch movies');
        const data = await res.json();
        
        // Transform the backend format back to what the frontend expects
        const transformedData = data.movies.map(m => ({
          ...m,
          id: m._id, // map Mongo _id to id so frontend doesn't break
          genre: m.genres ? m.genres.join(' • ') : '',
          telegramChatId: m.telegram?.chatId,
          telegramMessageId: m.telegram?.messageId,
          year: m.year,
        }));

        setMovies(transformedData.filter(m => m.type === 'movie'));
        setSeries(transformedData.filter(m => m.type === 'series'));
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

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import client from '../api/client';
import { useNetworkError } from './NetworkErrorContext';

const MovieContext = createContext();

export const useMovies = () => useContext(MovieContext);

export const MovieProvider = ({ children }) => {
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showNetworkError } = useNetworkError();

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const [moviesRes, seriesRes, featuredMoviesRes, featuredSeriesRes] = await Promise.all([
        client.get('/movies?limit=200'),
        client.get('/series?limit=200'),
        client.get('/movies/featured'),
        client.get('/series/featured')
      ]);

      setMovies(moviesRes.data.movies);
      setSeries(seriesRes.data.series);

      const featured = [
        ...featuredMoviesRes.data.movies,
        ...featuredSeriesRes.data.series
      ];
      setFeaturedItems(featured);
      setError(null);
    } catch (err) {
      console.error('Error fetching content', err);
      setError('Failed to load content');
      // Show the global network error overlay with retry pointing back to this function
      showNetworkError(fetchContent);
      throw err; // Re-throw so the overlay retry handler knows it failed
    } finally {
      setLoading(false);
    }
  }, [showNetworkError]);

  useEffect(() => {
    fetchContent();
  }, []);

  return (
    <MovieContext.Provider value={{ movies, series, featuredItems, loading, error, refresh: fetchContent }}>
      {children}
    </MovieContext.Provider>
  );
};

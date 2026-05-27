import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import client from '../api/client';
import { useAuth } from './AuthContext';

const WatchlistContext = createContext();

export const useWatchlist = () => useContext(WatchlistContext);

export const WatchlistProvider = ({ children }) => {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState([]); // [{ itemId, itemType }]
  const [loading, setLoading] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    if (!user) { setWatchlist([]); return; }
    try {
      setLoading(true);
      const res = await client.get('/users/watchlist');
      setWatchlist(res.data.watchlist || []);
    } catch (e) {
      console.error('WatchlistContext fetch error:', e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reload whenever the logged-in user changes
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const isInWatchlist = useCallback(
    (itemId) => watchlist.some((w) => w.itemId === String(itemId)),
    [watchlist]
  );

  // Optimistic toggle — updates local state immediately, then syncs with DB
  const toggleWatchlist = useCallback(async (itemId, itemType) => {
    if (!user) return { success: false, error: 'Not logged in' };
    const alreadyIn = isInWatchlist(itemId);

    // Optimistic update
    if (alreadyIn) {
      setWatchlist((prev) => prev.filter((w) => w.itemId !== String(itemId)));
    } else {
      setWatchlist((prev) => [...prev, { itemId: String(itemId), itemType: itemType || 'movie' }]);
    }

    try {
      const res = await client.post('/users/watchlist', { itemId, itemType });
      // Sync with server response
      setWatchlist(res.data.watchlist || []);
      return { success: true, action: res.data.action };
    } catch (e) {
      // Revert on failure
      await fetchWatchlist();
      return { success: false, error: e?.response?.data?.error || 'Failed' };
    }
  }, [user, isInWatchlist, fetchWatchlist]);

  return (
    <WatchlistContext.Provider value={{ watchlist, loading, isInWatchlist, toggleWatchlist, fetchWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
};

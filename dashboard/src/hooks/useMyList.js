import { useState, useEffect, useCallback } from 'react';

const API = 'https://mtmovies-production.up.railway.app/api/users/watchlist';

function getToken() {
  return localStorage.getItem('mt_token');
}

export function useMyList() {
  const [myList, setMyList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch watchlist from DB on mount
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    fetch(API, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.watchlist) {
          // Map DB format {itemId, itemType} → hook format {id, type}
          setMyList(data.watchlist.map(w => ({ id: Number(w.itemId) || w.itemId, type: w.itemType })));
        }
      })
      .catch(err => console.error('[MyList] Failed to fetch:', err))
      .finally(() => setLoading(false));
  }, []);

  const toggleMyList = useCallback((item) => {
    const token = getToken();
    if (!token) return;

    const itemId = String(item.id);
    const itemType = item.seasons ? 'series' : 'movie';

    // Optimistic UI update
    setMyList(prev => {
      const exists = prev.find(i => String(i.id) === itemId);
      if (exists) {
        return prev.filter(i => String(i.id) !== itemId);
      } else {
        return [...prev, { id: item.id, type: itemType }];
      }
    });

    // Persist to DB
    fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ itemId, itemType }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.watchlist) {
          setMyList(data.watchlist.map(w => ({ id: Number(w.itemId) || w.itemId, type: w.itemType })));
        }
      })
      .catch(err => console.error('[MyList] Toggle failed:', err));
  }, []);

  const isInMyList = useCallback((id) => {
    return myList.some(i => String(i.id) === String(id));
  }, [myList]);

  return { myList, toggleMyList, isInMyList, loading };
}

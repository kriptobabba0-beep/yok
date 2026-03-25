import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchActivity } from './api';
import { useAuth, loadFavoritesFromFirestore, saveFavoritesToFirestore } from './auth';

const AppContext = createContext(null);

const NOTIFS_KEY = 'polyuserstats_notifs';

function loadNotifs() {
  try {
    const raw = localStorage.getItem(NOTIFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { notifications: [], notifRead: true };
}

function saveNotifs(state) {
  try {
    localStorage.setItem(NOTIFS_KEY, JSON.stringify(state));
  } catch {}
}

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [notifications, setNotifications] = useState(() => loadNotifs().notifications || []);
  const [notifRead, setNotifRead] = useState(() => loadNotifs().notifRead ?? true);
  const lastCheckRef = useRef({});

  // ============================================
  // Load favorites from Firestore when user signs in
  // ============================================
  useEffect(() => {
    if (user) {
      console.log('[Favorites] User signed in:', user.email, '- loading from Firestore...');
      setFavoritesLoaded(false);
      loadFavoritesFromFirestore(user.uid)
        .then((favs) => {
          console.log('[Favorites] Loaded', favs.length, 'favorites from Firestore');
          setFavorites(favs);
          setFavoritesLoaded(true);
        })
        .catch(err => {
          console.error('[Favorites] Failed to load:', err);
          setFavorites([]);
          setFavoritesLoaded(true);
        });
    } else {
      console.log('[Favorites] No user - clearing');
      setFavorites([]);
      setFavoritesLoaded(true);
    }
  }, [user]);

  // Persist notifications to localStorage
  useEffect(() => {
    saveNotifs({ notifications, notifRead });
  }, [notifications, notifRead]);

  // ============================================
  // Add favorite: update state + save to Firestore immediately
  // ============================================
  const addFavorite = useCallback(async (wallet) => {
    if (!user) return;

    // Check duplicate
    const isDuplicate = favorites.some(
      f => f.address.toLowerCase() === wallet.address.toLowerCase()
    );
    if (isDuplicate) return;

    const newFav = {
      address: wallet.address,
      name: wallet.name || '',
      pseudonym: wallet.pseudonym || '',
      profileImage: wallet.profileImage || '',
      addedAt: Date.now(),
    };
    const updated = [...favorites, newFav];

    // Update local state immediately
    setFavorites(updated);

    // Save to Firestore
    console.log('[Favorites] Adding:', wallet.address, '- saving', updated.length, 'to Firestore...');
    try {
      await saveFavoritesToFirestore(user.uid, updated);
      console.log('[Favorites] Saved successfully to Firestore');
    } catch (err) {
      console.error('[Favorites] FAILED to save to Firestore:', err);
    }
  }, [user, favorites]);

  // ============================================
  // Remove favorite: update state + save to Firestore immediately
  // ============================================
  const removeFavorite = useCallback(async (address) => {
    if (!user) return;

    const updated = favorites.filter(
      f => f.address.toLowerCase() !== address.toLowerCase()
    );

    // Update local state immediately
    setFavorites(updated);

    // Save to Firestore
    console.log('[Favorites] Removing:', address, '- saving', updated.length, 'to Firestore...');
    try {
      await saveFavoritesToFirestore(user.uid, updated);
      console.log('[Favorites] Saved successfully to Firestore');
    } catch (err) {
      console.error('[Favorites] FAILED to save to Firestore:', err);
    }
  }, [user, favorites]);

  const isFavorite = useCallback((address) => {
    return favorites.some(f => f.address.toLowerCase() === address.toLowerCase());
  }, [favorites]);

  // Poll tracked wallets for new activity
  useEffect(() => {
    if (favorites.length === 0) return;
    const checkWallets = async () => {
      for (const fav of favorites) {
        try {
          const activity = await fetchActivity(fav.address, { limit: 5, type: 'TRADE' });
          if (!Array.isArray(activity) || activity.length === 0) continue;
          const lastCheck = lastCheckRef.current[fav.address] || (Date.now() / 1000 - 300);
          const newItems = activity.filter(a => a.timestamp && a.timestamp > lastCheck);
          if (newItems.length > 0) {
            lastCheckRef.current[fav.address] = Math.max(...newItems.map(a => a.timestamp));
            const newNotifs = newItems.map(item => ({
              id: `${item.transactionHash || Math.random().toString(36)}-${item.timestamp}`,
              wallet: fav.address,
              walletName: fav.name || fav.pseudonym || fav.address,
              type: item.type || 'TRADE',
              title: item.title || 'Unknown market',
              slug: item.eventSlug || item.slug || '',
              side: item.side,
              size: item.usdcSize || item.size,
              price: item.price,
              outcome: item.outcome,
              timestamp: item.timestamp,
              read: false,
            }));
            setNotifications(prev => [...newNotifs, ...prev].slice(0, 200));
            setNotifRead(false);
          }
        } catch {}
      }
    };
    const timeout = setTimeout(checkWallets, 5000);
    const interval = setInterval(checkWallets, 30000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [favorites]);

  const markAllRead = useCallback(() => {
    setNotifRead(true);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setNotifRead(true);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      favorites, favoritesLoaded, addFavorite, removeFavorite, isFavorite,
      notifications, notifRead, unreadCount, markAllRead, clearNotifications,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

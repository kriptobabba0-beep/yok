import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchActivity } from './api';

const AppContext = createContext(null);

const STORAGE_KEY = 'polyuserstats_state';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { favorites: [], notifications: [], notifRead: true };
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function AppProvider({ children }) {
  const [favorites, setFavorites] = useState(() => loadState().favorites || []);
  const [notifications, setNotifications] = useState(() => loadState().notifications || []);
  const [notifRead, setNotifRead] = useState(() => loadState().notifRead ?? true);
  const lastCheckRef = useRef({});

  // Persist state
  useEffect(() => {
    saveState({ favorites, notifications, notifRead });
  }, [favorites, notifications, notifRead]);

  // Add/remove favorites
  const addFavorite = useCallback((wallet) => {
    setFavorites(prev => {
      if (prev.find(f => f.address.toLowerCase() === wallet.address.toLowerCase())) return prev;
      return [...prev, { ...wallet, addedAt: Date.now() }];
    });
  }, []);

  const removeFavorite = useCallback((address) => {
    setFavorites(prev => prev.filter(f => f.address.toLowerCase() !== address.toLowerCase()));
  }, []);

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
        } catch {
          // silently continue
        }
      }
    };

    // Initial delay then poll every 30s
    const timeout = setTimeout(checkWallets, 5000);
    const interval = setInterval(checkWallets, 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
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
      favorites, addFavorite, removeFavorite, isFavorite,
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

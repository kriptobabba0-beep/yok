import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Listen to auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
      return true;
    } catch (err) {
      console.error('Sign-in failed:', err);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  }, []);

  // Prompt sign-in (called by FavoriteButton, WalletTracker, etc.)
  const requireAuth = useCallback(() => {
    if (user) return true;
    setShowAuthModal(true);
    return false;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      authLoading,
      signInWithGoogle,
      logout,
      requireAuth,
      showAuthModal,
      setShowAuthModal,
    }}>
      {children}

      {/* Sign-in modal overlay */}
      {showAuthModal && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <div className="bg-surface-2 border border-white/[0.08] rounded-xl shadow-2xl w-full max-w-sm p-8 animate-slide-up">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="22" width="6" height="14" rx="2" fill="white" opacity="0.6"/>
                    <rect x="13" y="14" width="6" height="22" rx="2" fill="white" opacity="0.8"/>
                    <rect x="22" y="8" width="6" height="28" rx="2" fill="white"/>
                    <rect x="31" y="4" width="6" height="32" rx="2" fill="white" opacity="0.9"/>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Sign in to Polyuserstats</h3>
                <p className="text-sm text-slate-400">Sign in with Google to track wallets and save your favorites across devices.</p>
              </div>

              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white text-gray-800 font-semibold text-sm hover:bg-gray-100 transition-all shadow-md"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full mt-3 px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-300 hover:bg-white/[0.04] transition-all"
              >
                Maybe later
              </button>

              <p className="text-[11px] text-slate-600 text-center mt-4">
                Only required for wallet tracking. All other features are free to use.
              </p>
            </div>
          </div>
        </>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

// ============================================
// Firestore helpers for favorites
// ============================================

const FAVORITES_DOC = (uid) => doc(db, 'users', uid);

export async function loadFavoritesFromFirestore(uid) {
  try {
    console.log('[Firebase] Reading favorites from Firestore for uid:', uid);
    const snap = await getDoc(FAVORITES_DOC(uid));
    if (snap.exists()) {
      const favs = snap.data().favorites || [];
      console.log('[Firebase] Read successful:', favs.length, 'favorites found');
      return favs;
    }
    console.log('[Firebase] No document found for user - returning empty');
  } catch (err) {
    console.error('[Firebase] Read FAILED:', err);
  }
  return [];
}

export async function saveFavoritesToFirestore(uid, favorites) {
  try {
    // Firestore rejects undefined values — strip them from each favorite
    const cleaned = favorites.map(fav => {
      const obj = {};
      for (const [key, val] of Object.entries(fav)) {
        if (val !== undefined) obj[key] = val;
      }
      return obj;
    });
    console.log('[Firebase] Writing', cleaned.length, 'favorites to Firestore for uid:', uid);
    await setDoc(FAVORITES_DOC(uid), { favorites: cleaned, updatedAt: Date.now() }, { merge: true });
    console.log('[Firebase] Write successful');
  } catch (err) {
    console.error('[Firebase] Write FAILED:', err);
    throw err;
  }
}

export function subscribeFavorites(uid, callback) {
  return onSnapshot(FAVORITES_DOC(uid), (snap) => {
    if (snap.exists()) callback(snap.data().favorites || []);
  });
}

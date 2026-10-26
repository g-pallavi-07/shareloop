import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { addFavorite, getCurrentUser, getFavorites, logout as logoutApi, removeFavorite } from '../services/api.js';

// ── Favorites ──────────────────────────────────────────────────────────────

const FavoritesContext = createContext(null);
const EMPTY_FAVORITES = new Set();

export function FavoritesProvider({ children }) {
  const { user, isLoggedIn } = useAuth();
  const [savedFavorites, setSavedFavorites] = useState({ userId: null, ids: EMPTY_FAVORITES });
  const userId = user ? String(user.id) : null;
  const favorites = isLoggedIn && savedFavorites.userId === userId ? savedFavorites.ids : EMPTY_FAVORITES;

  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    let active = true;
    getFavorites()
      .then((items) => {
        if (active) setSavedFavorites({ userId, ids: new Set(items.map((item) => String(item.id))) });
      })
      .catch((error) => window.dispatchEvent(new CustomEvent('shareloop:error', { detail: error.message })));
    return () => { active = false; };
  }, [isLoggedIn, userId]);

  const toggle = useCallback(async (id) => {
    if (!isLoggedIn) {
      window.dispatchEvent(new CustomEvent('shareloop:error', { detail: 'Log in to save favorites.' }));
      return;
    }
    const key = String(id);
    const wasFavorite = favorites.has(key);
    setSavedFavorites((previous) => {
      const next = new Set(previous.userId === userId ? previous.ids : []);
      if (wasFavorite) next.delete(key);
      else next.add(key);
      return { userId, ids: next };
    });
    try {
      if (wasFavorite) await removeFavorite(id);
      else await addFavorite(id);
    } catch (error) {
      setSavedFavorites((previous) => {
        const next = new Set(previous.userId === userId ? previous.ids : []);
        if (wasFavorite) next.add(key);
        else next.delete(key);
        return { userId, ids: next };
      });
      window.dispatchEvent(new CustomEvent('shareloop:error', { detail: error.message }));
    }
  }, [favorites, isLoggedIn, userId]);

  const isFavorite = useCallback((id) => favorites.has(String(id)), [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, toggle, isFavorite, count: favorites.size }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}

// ── Auth ────────────────────────────────────────────────────────────────────

const AUTH_KEY = 'shareloop_user';

function loadAuth() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadAuth);

  useEffect(() => {
    const storedAuth = loadAuth();
    if (!storedAuth) return;
    getCurrentUser()
      .then((user) => {
        const data = { user };
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(data));
        setAuth(data);
      })
      .catch(() => {
        sessionStorage.removeItem(AUTH_KEY);
        setAuth(null);
      });
  }, []);

  useEffect(() => {
    const clearExpiredSession = () => {
      sessionStorage.removeItem(AUTH_KEY);
      setAuth(null);
    };
    window.addEventListener('shareloop:unauthorized', clearExpiredSession);
    return () => window.removeEventListener('shareloop:unauthorized', clearExpiredSession);
  }, []);

  const login = useCallback((user) => {
    const data = { user };
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(data));
    setAuth(data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch (error) {
      window.dispatchEvent(new CustomEvent('shareloop:error', { detail: error.message }));
    } finally {
      sessionStorage.removeItem(AUTH_KEY);
      setAuth(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ auth, user: auth?.user ?? null, isLoggedIn: !!auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// ── Toast ──────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    const showError = (event) => addToast(event.detail || 'The request failed.', 'error');
    window.addEventListener('shareloop:error', showError);
    return () => window.removeEventListener('shareloop:error', showError);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" role="alert" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

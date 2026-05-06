import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize state from localStorage if available
  const [auth, setAuth] = useState(() => {
    const savedToken = localStorage.getItem('mt_token');
    const savedUser = localStorage.getItem('mt_user');
    if (savedToken && savedUser) {
      try {
        return { token: savedToken, user: JSON.parse(savedUser) };
      } catch (e) {
        return { user: null, token: null };
      }
    }
    return { user: null, token: null };
  });

  const login = useCallback((user, token) => {
    localStorage.setItem('mt_token', token);
    localStorage.setItem('mt_user', JSON.stringify(user));
    setAuth({ user, token });
  }, []);

  const updateUser = useCallback((user) => {
    localStorage.setItem('mt_user', JSON.stringify(user));
    setAuth(prev => ({ ...prev, user }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('mt_token');
    localStorage.removeItem('mt_user');
    setAuth({ user: null, token: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, updateUser, isAuthenticated: !!auth.token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

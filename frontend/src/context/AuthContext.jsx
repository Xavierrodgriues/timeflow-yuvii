import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: verify existing token with backend
  useEffect(() => {
    const token = localStorage.getItem('tt_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('tt_token');
        localStorage.removeItem('tt_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const register = async ({ name, email, password }) => {
    try {
      const data = await authApi.register({ name, email, password });
      localStorage.setItem('tt_token', data.token);
      localStorage.setItem('tt_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  };

  const login = async ({ email, password }) => {
    try {
      const data = await authApi.login({ email, password });
      localStorage.setItem('tt_token', data.token);
      localStorage.setItem('tt_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  };

  const adminLogin = async ({ email, password }) => {
    try {
      const data = await authApi.adminLogin({ email, password });
      localStorage.setItem('tt_token', data.token);
      localStorage.setItem('tt_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('tt_token');
    localStorage.removeItem('tt_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, adminLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

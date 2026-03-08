import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('inv_user');
    const token = localStorage.getItem('inv_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  async function login(username, password) {
    const data = await api.login({ username, password });
    localStorage.setItem('inv_token', data.token);
    localStorage.setItem('inv_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function register(username, password, name) {
    const data = await api.register({ username, password, name });
    return data.user;
  }

  function logout() {
    localStorage.removeItem('inv_token');
    localStorage.removeItem('inv_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

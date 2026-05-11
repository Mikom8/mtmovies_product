import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        const response = await client.get('/auth/me');
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to check login status', error);
      await SecureStore.deleteItemAsync('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await client.post('/auth/login', { email, password });
      const { token, user } = response.data;
      await SecureStore.setItemAsync('token', token);
      setUser(user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  };

  const googleLogin = async (accessToken) => {
    try {
      const response = await client.post('/auth/google', { access_token: accessToken });
      const { token, user, isNewUser } = response.data;
      await SecureStore.setItemAsync('token', token);
      setUser(user);
      return { success: true, isNewUser: !!isNewUser };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Google login failed' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await client.post('/auth/register', { name, email, password });
      const { token, user } = response.data;
      await SecureStore.setItemAsync('token', token);
      setUser(user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' };
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

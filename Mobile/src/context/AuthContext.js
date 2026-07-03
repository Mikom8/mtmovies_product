import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';
import { registerForPushNotificationsAsync } from '../utils/notifications';

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
        // Try to load cached user first for immediate offline support
        const cachedUser = await AsyncStorage.getItem('user_cache');
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
        }

        try {
          const response = await client.get('/auth/me');
          setUser(response.data.user);
          await AsyncStorage.setItem('user_cache', JSON.stringify(response.data.user));
        } catch (error) {
          console.error('Failed to fetch user from server', error);
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Only sign out if the token is actually invalid
            await SecureStore.deleteItemAsync('token');
            await AsyncStorage.removeItem('user_cache');
            setUser(null);
          } else if (!cachedUser) {
            // Network error but no cached user, just create a fallback user so they don't get stuck on login
            setUser({ id: 'offline', name: 'Offline User', plan: 'free' });
          }
        }
      }
    } catch (error) {
      console.error('Failed to check login status', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await client.post('/auth/login', { email, password });
      const { token, user } = response.data;
      await SecureStore.setItemAsync('token', token);
      await AsyncStorage.setItem('user_cache', JSON.stringify(user));
      setUser(user);

      // Setup push notifications
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          // Send push token to backend using the newly acquired auth token
          await client.post('/users/push-token', { token: pushToken }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } catch (e) {
        console.error("Failed to register push token after login", e);
      }

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
      await AsyncStorage.setItem('user_cache', JSON.stringify(user));
      setUser(user);

      // Setup push notifications
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await client.post('/users/push-token', { token: pushToken }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } catch (e) {
        console.error("Failed to register push token after google login", e);
      }

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
      await AsyncStorage.setItem('user_cache', JSON.stringify(user));
      setUser(user);

      // Setup push notifications
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await client.post('/users/push-token', { token: pushToken }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } catch (e) {
        console.error("Failed to register push token after register", e);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' };
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await AsyncStorage.removeItem('user_cache');
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;
      const response = await client.get('/auth/me');
      setUser(response.data.user);
      await AsyncStorage.setItem('user_cache', JSON.stringify(response.data.user));
    } catch (error) {
      console.error('Failed to refresh user', error);
    }
  }, []);

  const updateToken = async (newToken) => {
    await SecureStore.setItemAsync('token', newToken);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, googleLogin, updateUser: setUser, refreshUser, updateToken }}>
      {children}
    </AuthContext.Provider>
  );
};

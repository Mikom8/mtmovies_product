import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Text, Animated, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from "expo-font";
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { MovieProvider } from './src/context/MovieContext';
import { WatchlistProvider } from './src/context/WatchlistContext';
import { NetworkErrorProvider } from './src/context/NetworkErrorContext';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { initializeStartIoSdk } from 'react-native-start-io-sdk';

// Initialize Start.io SDK
try {
  initializeStartIoSdk({
    androidAppId: "206404632",
    testAd: false, // Turn off testAd in production
    returnAd: false, // Prevent ads from showing when returning to the app
  });
} catch (e) {
  console.log("Start.io SDK init error", e);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const linking = {
  prefixes: ['mtmovies://', 'https://mtmoviess.netlify.app'],
  config: {
    screens: {
      Details: 'details',
    },
  },
};

function SplashScreen({ onDone }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hold for 1.6s then fade out over 0.5s
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onDone());
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, splashStyles.container, { opacity }]} pointerEvents="none">
      <Image
        source={require('./assets/img/unnamed-removebg-preview.png')}
        style={splashStyles.logo}
        resizeMode="contain"
      />
      <Text style={splashStyles.title}><Text style={{ color: "red" }}>MT</Text>Movies</Text>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontFamily: "Broche-Cut",
    letterSpacing: 1,
  },
});

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    // 1. Handle notification tap when app is running (foreground or background)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.id) {
        navigationRef.current?.navigate('Details', { id: data.id, type: data.type || 'movie' });
      }
    });

    // 2. Handle notification tap when app was completely closed (cold start)
    Notifications.getLastNotificationResponseAsync().then(response => {
      const data = response?.notification?.request?.content?.data;
      if (data?.id) {
        // Small delay to ensure NavigationContainer is fully mounted before navigating
        setTimeout(() => {
          navigationRef.current?.navigate('Details', { id: data.id, type: data.type || 'movie' });
        }, 500);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <WatchlistProvider>
          <NetworkErrorProvider>
            <MovieProvider>
              <NavigationContainer ref={navigationRef} linking={linking}>
                <StatusBar style="light" />
                <AppNavigator />
              </NavigationContainer>
            </MovieProvider>
          </NetworkErrorProvider>
        </WatchlistProvider>
      </AuthProvider>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
    </GestureHandlerRootView>
  );
}

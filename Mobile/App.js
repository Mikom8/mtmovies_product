import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Text, Animated, StyleSheet, Platform, PermissionsAndroid } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from "expo-font";
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { MovieProvider } from './src/context/MovieContext';
import { WatchlistProvider } from './src/context/WatchlistContext';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import {
  getMessaging,
  requestPermission,
  AuthorizationStatus,
  subscribeToTopic,
  onNotificationOpenedApp,
  getInitialNotification,
} from '@react-native-firebase/messaging';
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

// Firebase handles its own notification display in the background.
// To show notifications in the foreground, you could add an onMessage listener here if desired.

const linking = {
  prefixes: ['mtmovies://', 'https://mtmoviess.netlify.app'],
  config: {
    screens: {
      Details: 'details',
    },
  },
};

const navTheme = {
  dark: true,
  colors: {
    primary: '#E50914',
    background: '#000000',
    card: '#000000',
    text: '#ffffff',
    border: '#000000',
    notification: '#E50914',
  },
};

function SplashScreen({ onDone, fontsLoaded }) {
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
        source={require('./assets/img/removebgIcon.png')}
        style={splashStyles.logo}
        resizeMode="contain"
      />
      {fontsLoaded && (
        <Text style={[splashStyles.title, { fontFamily: "Broche-Cut" }]}><Text style={{ color: "red" }}>MT</Text>Movies</Text>
      )}
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
    letterSpacing: 1,
  },
});

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const [splashDone, setSplashDone] = useState(false);

  const [fontsLoaded] = useFonts({
    "Broche-Cut": require("./assets/fonts/Broche-Cut.ttf"),
  });

  useEffect(() => {
    // Request permission on app launch and subscribe to topic
    const requestPermissionAndSubscribe = async () => {
      try {
        // Android 13+ (API 33+) requires explicit POST_NOTIFICATIONS permission
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Notification permission denied by user');
            return;
          }
        }

        const m = getMessaging();
        const authStatus = await requestPermission(m);
        const enabled =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          await subscribeToTopic(m, 'all_users');
        }
      } catch (e) {
        console.log('Firebase messaging permission error', e);
      }
    };
    requestPermissionAndSubscribe();

    // 1. Handle notification tap when app is running in background
    const m = getMessaging();
    const unsubscribe = onNotificationOpenedApp(m, remoteMessage => {
      const data = remoteMessage.data;
      if (data?.id) {
        navigationRef.current?.navigate('Details', { id: data.id, type: data.type || 'movie' });
      }
    });

    // 2. Handle notification tap when app was completely closed (cold start)
    getInitialNotification(m).then(remoteMessage => {
      if (remoteMessage) {
        const data = remoteMessage.data;
        if (data?.id) {
          setTimeout(() => {
            navigationRef.current?.navigate('Details', { id: data.id, type: data.type || 'movie' });
          }, 500);
        }
      }
    });

    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <AuthProvider>
        <WatchlistProvider>
          <MovieProvider>
            <NavigationContainer ref={navigationRef} linking={linking} theme={navTheme}>
              <StatusBar style="light" />
              <AppNavigator />
            </NavigationContainer>
          </MovieProvider>
        </WatchlistProvider>
      </AuthProvider>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} fontsLoaded={fontsLoaded} />}
    </GestureHandlerRootView>
  );
}

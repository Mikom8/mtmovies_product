import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { Video, ResizeMode } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import Feather from '@expo/vector-icons/Feather';

const PlayerScreen = ({ route, navigation }) => {
  const { chatId, messageId, title } = route.params ?? {};
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);

  useEffect(() => {
    const initPlayer = async () => {
      if (!chatId || !messageId) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // 1. Fetch metadata to see if we need HLS transcode or direct stream
        const response = await axios.get(`https://mtmovies-production.up.railway.app/api/stream/${chatId}/${messageId}/metadata`);
        const { needsTranscode } = response.data;

        if (needsTranscode) {
          // Use HLS for incompatible formats (AVI, MKV, etc.)
          setStreamUrl(`https://mtmovies-production.up.railway.app/api/stream/hls/${chatId}/${messageId}/playlist.m3u8`);
        } else {
          // Use direct byte-stream for MP4 (allows exact duration and seeking)
          setStreamUrl(`https://mtmovies-production.up.railway.app/api/stream/${chatId}/${messageId}`);
        }
      } catch (err) {
        console.error("Player initialization error:", err);
        // Fallback to direct stream if metadata fails
        setStreamUrl(`https://mtmovies-production.up.railway.app/api/stream/${chatId}/${messageId}`);
      }
    };

    initPlayer();
  }, [chatId, messageId]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const handleBack = useCallback(async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.pauseAsync();
      }
    } catch (_) {}
    navigation.goBack();
  }, [navigation]);

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setLoading(false);
      setError(false);
    }
    if (status.error) {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {streamUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: streamUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          useNativeControls
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          onLoadStart={() => { setLoading(true); setError(false); }}
          onError={() => { setError(true); setLoading(false); }}
        />
      ) : (
        <View style={styles.centered}>
          <Feather name="alert-circle" color="#E50914" size={40} />
          <Text style={styles.errorText}>No stream source available</Text>
        </View>
      )}

      {/* Loading overlay */}
      {loading && !error && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      )}

      {/* Error overlay */}
      {error && (
        <View style={styles.overlay}>
          <Feather name="wifi-off" color="#E50914" size={36} />
          <Text style={styles.errorText}>Could not load stream</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => {
            setError(false);
            setLoading(true);
          }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Top bar with back + title */}
      <SafeAreaView style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Feather name="chevron-left" color="#fff" size={28} />
        </TouchableOpacity>
        {title ? (
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    gap: 12,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#E50914',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
    marginRight: 10,
  },
  titleText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default PlayerScreen;

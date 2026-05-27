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
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import Feather from '@expo/vector-icons/Feather';

const API_BASE = 'https://mtmovies-production.up.railway.app/api';

const PlayerScreen = ({ route, navigation }) => {
  const { chatId, messageId, title } = route.params ?? {};
  const videoRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);

  // ── 1. Resolve stream URL ────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId || !messageId) {
      setError(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const resolveUrl = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/stream/${chatId}/${messageId}/metadata`,
          { timeout: 10000 }
        );
        if (cancelled) return;

        const url = res.data?.needsTranscode
          ? `${API_BASE}/stream/hls/${chatId}/${messageId}/playlist.m3u8`
          : `${API_BASE}/stream/${chatId}/${messageId}`;

        setStreamUrl(url);
        setLoading(false); // URL resolved — dismiss spinner, native controls handle buffering
      } catch (err) {
        if (cancelled) return;
        console.warn('Metadata fetch failed, falling back to direct stream:', err.message);
        setStreamUrl(`${API_BASE}/stream/${chatId}/${messageId}`);
        setLoading(false); // Fallback URL set — dismiss spinner
      }
    };

    resolveUrl();
    return () => { cancelled = true; };
  }, [chatId, messageId]);

  // ── 2. Lock orientation to landscape ─────────────────────────────────────
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  // ── 3. Create the expo-video player (no initial source) ──────────────────
  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
  });

  // ── 4. Load + play when URL is ready ─────────────────────────────────────
  useEffect(() => {
    if (!player || !streamUrl) return;

    try {
      player.replace({ uri: streamUrl });
      player.play();
    } catch (e) {
      console.warn('player.replace error:', e);
      setError(true);
      setLoading(false);
    }
  }, [streamUrl]); // intentionally omit `player` — it's a stable ref

  // ── 5. Status listener — error detection only (loading is cleared above) ──
  useEffect(() => {
    if (!player) return;

    const sub = player.addListener('statusChange', (event) => {
      // expo-video may pass the status as a plain string or as { status }
      const status = typeof event === 'string' ? event : event?.status;
      if (status === 'error') {
        setError(true);
        setLoading(false);
      }
    });

    return () => sub.remove();
  }, [player]);

  // ── Back button ───────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    try { player?.pause(); } catch (_) {}
    navigation.goBack();
  }, [navigation, player]);

  // ── Retry ─────────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setError(false);
    setLoading(true);
    try {
      if (player && streamUrl) {
        player.replace({ uri: streamUrl });
        player.play();
      }
    } catch (_) {}
  }, [player, streamUrl]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Video — always mounted once we have a URL so the player can buffer */}
      {streamUrl ? (
        <VideoView
          ref={videoRef}
          style={styles.video}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
          contentFit="contain"
          nativeControls
        />
      ) : (
        /* No URL yet — just show the loading backdrop */
        <View style={styles.backdrop} />
      )}

      {/* Loading overlay */}
      {loading && !error && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.overlayText}>Loading…</Text>
        </View>
      )}

      {/* Error overlay */}
      {error && (
        <View style={styles.overlay}>
          <Feather name="wifi-off" color="#E50914" size={40} />
          <Text style={styles.overlayText}>Could not load stream</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Feather name="chevron-left" color="#fff" size={28} />
        </TouchableOpacity>
        {!!title && (
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
        )}
      </SafeAreaView>
    </View>
  );
};

export default PlayerScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    gap: 14,
  },
  overlayText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 28,
    paddingVertical: 10,
    backgroundColor: '#E50914',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableWithoutFeedback,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import Feather from '@expo/vector-icons/Feather';
import Slider from '@react-native-community/slider';
import { useFonts } from "expo-font";
import { useEvent } from 'expo';
import * as NavigationBar from 'expo-navigation-bar';

import Constants from 'expo-constants';

const cfg = (Constants.expoConfig && Constants.expoConfig.extra) || (Constants.manifest && Constants.manifest.extra) || {};
const API_BASE = cfg.API_BASE_URL || 'https://mtmoviesproduct-production.up.railway.app/api';

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const PlayerScreen = ({ route, navigation }) => {
  const { chatId, messageId, title } = route.params ?? {};
  const videoRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);

  // Custom controls state
  const [showControls, setShowControls] = useState(true);
  const [isSliding, setIsSliding] = useState(false);
  const [slidingTime, setSlidingTime] = useState(0);
  const [polledTime, setPolledTime] = useState(0);
  const controlsTimeoutRef = useRef(null);

  const skipBackAnim = useRef(new Animated.Value(1)).current;
  const skipForwardAnim = useRef(new Animated.Value(1)).current;

  const [showForwardRipple, setShowForwardRipple] = useState(false);
  const [showBackwardRipple, setShowBackwardRipple] = useState(false);
  const forwardRippleAnim = useRef(new Animated.Value(0)).current;
  const backwardRippleAnim = useRef(new Animated.Value(0)).current;

  const forwardTimeoutRef = useRef(null);
  const backwardTimeoutRef = useRef(null);
  const forwardCountRef = useRef(0);
  const backwardCountRef = useRef(0);

  // fonts
  const [fontsLoaded] = useFonts({
    "Coolvetica": require("../../assets/fonts/Coolvetica-Rg.otf"),
    "Code": require("../../assets/fonts/CODE-Bold.otf"),
    "TT": require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
    "TT Medium": require("../../assets/fonts/TT-Chocolates-Trial-Medium.otf"),
  });

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
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.warn('Metadata fetch failed, falling back to direct stream:', err.message);
        setStreamUrl(`${API_BASE}/stream/${chatId}/${messageId}`);
        setLoading(false);
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

  // ── 3. Create the expo-video player ──────────────────────────────────────
  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 1; // Emit time updates every 1 second
  });

  // ── 4. Load + play when URL is ready ─────────────────────────────────────
  useEffect(() => {
    if (!player || !streamUrl) return;

    try {
      player.replaceAsync({ uri: streamUrl });
      player.play();
    } catch (e) {
      console.warn('player.replace error:', e);
      setError(true);
      setLoading(false);
    }
  }, [streamUrl]);

  // ── 5. Status & Progress listeners ───────────────────────────────────────
  const { status, error: playerError } = useEvent(player, 'statusChange', { status: player?.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false });
  const { duration } = useEvent(player, 'sourceLoad', { duration: player?.duration ?? 0 });

  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      if (player.currentTime !== undefined) {
        setPolledTime(player.currentTime);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [player]);

  useEffect(() => {
    if (status === 'error') {
      setError(true);
      setLoading(false);
    } else if (status === 'readyToPlay') {
      setError(false);
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (isPlaying) {
      setError(false);
      setLoading(false);
    }
  }, [isPlaying]);

  // ── Back button ───────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    try { player?.pause(); } catch (_) { }
    navigation.goBack();
  }, [navigation, player]);

  // ── Retry ─────────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setError(false);
    setLoading(true);
    try {
      if (player && streamUrl) {
        // Appending a timestamp forces the player to treat it as a new URL and actually reload
        const retryUrl = streamUrl.includes('?')
          ? `${streamUrl}&retry=${Date.now()}`
          : `${streamUrl}?retry=${Date.now()}`;
        player.replaceAsync({ uri: retryUrl });
        player.play();
      }
    } catch (_) { }
  }, [player, streamUrl]);

  // ── Custom Controls Handlers ──────────────────────────────────────────────
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimeout]);

  const toggleControls = useCallback(() => {
    if (showControls) {
      setShowControls(false);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      resetControlsTimeout();
    }
  }, [showControls, resetControlsTimeout]);

  const togglePlayPause = useCallback(() => {
    if (!player) return;
    if (isPlaying) player.pause();
    else player.play();
    resetControlsTimeout();
  }, [player, isPlaying, resetControlsTimeout]);

  const skipBackward = useCallback(() => {
    if (player) {
      player.seekBy(-10);
      resetControlsTimeout();

      skipBackAnim.setValue(0.5);
      Animated.spring(skipBackAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }).start();

      backwardCountRef.current += 10;
      setShowBackwardRipple(true);
      backwardRippleAnim.setValue(1);

      if (backwardTimeoutRef.current) clearTimeout(backwardTimeoutRef.current);
      backwardTimeoutRef.current = setTimeout(() => {
        Animated.timing(backwardRippleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowBackwardRipple(false);
          backwardCountRef.current = 0;
        });
      }, 1000);
    }
  }, [player, resetControlsTimeout, skipBackAnim, backwardRippleAnim]);

  const skipForward = useCallback(() => {
    if (player) {
      player.seekBy(10);
      resetControlsTimeout();

      skipForwardAnim.setValue(0.5);
      Animated.spring(skipForwardAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }).start();

      forwardCountRef.current += 10;
      setShowForwardRipple(true);
      forwardRippleAnim.setValue(1);

      if (forwardTimeoutRef.current) clearTimeout(forwardTimeoutRef.current);
      forwardTimeoutRef.current = setTimeout(() => {
        Animated.timing(forwardRippleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowForwardRipple(false);
          forwardCountRef.current = 0;
        });
      }, 1000);
    }
  }, [player, resetControlsTimeout, skipForwardAnim, forwardRippleAnim]);

  const handleSlidingStart = useCallback((value) => {
    setIsSliding(true);
    setSlidingTime(value);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
  }, []);

  const handleValueChange = useCallback((value) => {
    setSlidingTime(value);
  }, []);

  const handleSlidingComplete = useCallback((value) => {
    if (player) {
      player.currentTime = value;
    }
    setIsSliding(false);
    resetControlsTimeout();
  }, [player, resetControlsTimeout]);

  const displayTime = isSliding ? slidingTime : polledTime;

  const skipBackRotate = skipBackAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: ['-45deg', '0deg']
  });

  const skipForwardRotate = skipForwardAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: ['45deg', '0deg']
  });

  // ── 6. Toggle System Bars (Status Bar & Nav Bar) ──────────────────────────
  useEffect(() => {
    if (showControls) {
      StatusBar.setHidden(false, 'fade');
      NavigationBar.setVisibilityAsync('visible');
    } else {
      StatusBar.setHidden(true, 'fade');
      NavigationBar.setVisibilityAsync('hidden');
    }
  }, [showControls]);

  useEffect(() => {
    // Restore system bars when exiting the player
    return () => {
      StatusBar.setHidden(false, 'fade');
      NavigationBar.setVisibilityAsync('visible');
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {streamUrl ? (
        <TouchableWithoutFeedback onPress={toggleControls}>
          <View style={styles.videoContainer}>
            <VideoView
              ref={videoRef}
              style={styles.video}
              player={player}
              fullscreenOptions={{ enable: false }}
              allowsPictureInPicture
              contentFit="contain"
              nativeControls={false}
            />

            {/* Accumulator Ripple Overlays */}
            {showBackwardRipple && (
              <Animated.View style={[styles.rippleOverlay, styles.rippleLeft, { opacity: backwardRippleAnim }]} pointerEvents="none">
                <View style={styles.rippleContent}>
                  <Feather name="chevron-left" size={24} color="#fff" />
                  <Text style={styles.rippleText}>- {backwardCountRef.current}</Text>
                </View>
              </Animated.View>
            )}

            {showForwardRipple && (
              <Animated.View style={[styles.rippleOverlay, styles.rippleRight, { opacity: forwardRippleAnim }]} pointerEvents="none">
                <View style={styles.rippleContent}>
                  <Text style={styles.rippleText}>+ {forwardCountRef.current}</Text>
                  <Feather name="chevron-right" size={24} color="#fff" />
                </View>
              </Animated.View>
            )}

            {showControls && (
              <View style={styles.controlsOverlay}>
                {/* Center play/pause and skip buttons */}
                <View style={styles.centerControls}>
                  <TouchableOpacity onPress={skipBackward} activeOpacity={0.7}>
                    <Animated.View style={[styles.controlBtn, { transform: [{ scale: skipBackAnim }, { rotate: skipBackRotate }] }]}>
                      <Feather name="rotate-ccw" size={32} color="#fff" />
                      <Text style={styles.skipText}>10</Text>
                    </Animated.View>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={togglePlayPause} style={[styles.controlBtn, styles.playPauseBtn]}>
                    <Feather name={isPlaying ? "pause" : "play"} size={48} color="#fff" style={{ marginLeft: isPlaying ? 0 : 4 }} />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={skipForward} activeOpacity={0.7}>
                    <Animated.View style={[styles.controlBtn, { transform: [{ scale: skipForwardAnim }, { rotate: skipForwardRotate }] }]}>
                      <Feather name="rotate-cw" size={32} color="#fff" />
                      <Text style={styles.skipText}>10</Text>
                    </Animated.View>
                  </TouchableOpacity>
                </View>

                {/* Bottom slider and time text */}
                <View style={styles.bottomControls}>
                  <Text style={styles.timeText}>{formatTime(displayTime)}</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration > 0 ? duration : 1}
                    value={displayTime}
                    minimumTrackTintColor="#E50914"
                    maximumTrackTintColor="rgba(255,255,255,0.5)"
                    thumbTintColor="#E50914"
                    onSlidingStart={handleSlidingStart}
                    onValueChange={handleValueChange}
                    onSlidingComplete={handleSlidingComplete}
                  />
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
              </View>
            )}

            {/* Top bar */}
            {showControls && (
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
            )}
          </View>
        </TouchableWithoutFeedback>
      ) : (
        <View style={styles.backdrop} />
      )}

      {/* Loading overlay */}
      {loading && !error && (
        <View style={styles.overlay} pointerEvents="none">
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
    </View>
  );
};

export default PlayerScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -35,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 30,
  },
  playPauseBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    position: 'absolute',
    top: 11,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 15,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
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
    paddingHorizontal: 20,
    paddingTop: 5,
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
    fontSize: 16,
    fontFamily: "TT Medium",
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rippleOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  rippleRight: {
    left: '70%',
    borderTopLeftRadius: 500,
    borderBottomLeftRadius: 500,
  },
  rippleLeft: {
    right: '70%',
    borderTopRightRadius: 500,
    borderBottomRightRadius: 500,
  },
  rippleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rippleText: {
    color: '#fff',
    fontSize: 30,
    fontFamily: "Code",
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

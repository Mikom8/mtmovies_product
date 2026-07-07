import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StatusBar,
  Animated,
  Dimensions,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { VolumeManager } from "react-native-volume-manager";
import { VideoView, useVideoPlayer } from "expo-video";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Brightness from "expo-brightness";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Slider from "@react-native-community/slider";
import { useFonts } from "expo-font";
import { useEvent } from "expo";
import * as NavigationBar from "expo-navigation-bar";
import Svg, { G, Path, Defs, ClipPath, Rect } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

import Constants from "expo-constants";

const cfg =
  (Constants.expoConfig && Constants.expoConfig.extra) ||
  (Constants.manifest && Constants.manifest.extra) ||
  {};
const API_BASE =
  cfg.API_BASE_URL || "https://mtmoviesproduct-production.up.railway.app/api";

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
};

const PlayerScreen = ({ route, navigation }) => {
  const {
    chatId,
    messageId,
    title,
    seriesData,
    seasonIndex,
    episodeIndex,
    movieId,
  } = route.params ?? {};
  const { user, updateUser } = useAuth();
  const hasResumedRef = useRef(false);
  const videoRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);

  // Custom controls state
  const [showControls, setShowControls] = useState(true);
  const [isSliding, setIsSliding] = useState(false);
  const [slidingTime, setSlidingTime] = useState(0);
  const [polledTime, setPolledTime] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [contentFit, setContentFit] = useState('contain');
  const CONTENT_FIT_MODES = ['contain', 'cover', 'fill'];
  const cycleContentFit = () => {
    setContentFit(prev => {
      const idx = CONTENT_FIT_MODES.indexOf(prev);
      return CONTENT_FIT_MODES[(idx + 1) % CONTENT_FIT_MODES.length];
    });
  };
  const [showTimeRemaining, setShowTimeRemaining] = useState(false);
  const controlsTimeoutRef = useRef(null);

  // ── Pan Gesture States ──────────────────────────────────────────────────
  const [panAction, setPanAction] = useState(null); // 'volume' | 'brightness' | null
  const [panValue, setPanValue] = useState(0); // 0 to 1
  const gestureStartValueRef = useRef(0);
  const swipeTimeoutRef = useRef(null);
  const panActionRef = useRef(null);

  const saveWatchProgress = useCallback(
    async (progress, syncLocal = false) => {
      if (!movieId || progress <= 5) return;
      try {
        await client.post("/users/history", {
          movieId: String(movieId),
          progress,
        });
        if (syncLocal && user) {
          const movieIdStr = String(movieId);
          const existing = user.watchHistory?.find(
            (h) => h.movieId === movieIdStr,
          );
          const entry = {
            movieId: movieIdStr,
            progress,
            watchedAt: new Date().toISOString(),
          };
          const watchHistory = existing
            ? user.watchHistory.map((h) =>
              h.movieId === movieIdStr ? { ...h, ...entry } : h,
            )
            : [...(user.watchHistory || []), entry];
          updateUser({ ...user, watchHistory });
        }
      } catch (e) {
        // ignore network or released player errors
      }
    },
    [movieId, user, updateUser],
  );

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      (async () => {
        try {
          // Apply the user's saved in-app brightness preference
          const savedB = await AsyncStorage.getItem("user_brightness");
          if (savedB !== null && isMounted) {
            await Brightness.setBrightnessAsync(parseFloat(savedB));
          }
        } catch (e) { }
      })();

      return () => {
        isMounted = false;
        // Restore full system brightness control when leaving the player
        Brightness.useSystemBrightnessAsync().catch(() => { });
      };
    }, []),
  );

  useEffect(() => {
    if (!player) return;
    (async () => {
      try {
        const savedV = await AsyncStorage.getItem("user_volume");
        if (savedV !== null) {
          const v = parseFloat(savedV);
          VolumeManager.setVolume(v).catch(() => { });
          setIsMuted(v === 0);
        } else {
          const { volume } = await VolumeManager.getVolume();
          setIsMuted(volume === 0);
        }
      } catch (e) { }
    })();
  }, [player]);

  // Refs for tap detection inside PanResponder
  const panTapLastTimeRef = useRef(0);
  const panTapSingleTimeoutRef = useRef(null);
  const isActualSwipeRef = useRef(false);
  const lastGestureValueRef = useRef(null);

  // Stable ref so PanResponder (created once) always calls the latest functions
  const panHandlersRef = useRef({});

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isActualSwipeRef.current = false;
        panActionRef.current = null;
      },
      onPanResponderMove: (evt, gestureState) => {
        const isVertical =
          Math.abs(gestureState.dy) > 12 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;

        if (!isActualSwipeRef.current) {
          if (isVertical) {
            isActualSwipeRef.current = true;
            if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
            const { width } = Dimensions.get("window");
            // Safely use initial touch coordinate x0 to determine side
            const isLeft = gestureState.x0 < width / 2;

            if (isLeft) {
              panActionRef.current = "brightness";
              setPanAction("brightness");
              Brightness.getBrightnessAsync()
                .then((b) => {
                  // Adjust for the movement that already happened
                  gestureStartValueRef.current = b + gestureState.dy / 220;
                  setPanValue(b);
                })
                .catch(() => {
                  gestureStartValueRef.current = 0.5 + gestureState.dy / 220;
                  setPanValue(0.5);
                });
            } else {
              panActionRef.current = "volume";
              setPanAction("volume");
              VolumeManager.getVolume().then(({ volume }) => {
                gestureStartValueRef.current = volume + gestureState.dy / 220;
                setPanValue(volume);
              }).catch(() => {
                gestureStartValueRef.current = 0.5 + gestureState.dy / 220;
                setPanValue(0.5);
              });
            }
          }
        } else {
          // We are currently swiping! update values
          if (!panActionRef.current) return;
          const delta = -gestureState.dy / 220;
          let newValue = Math.max(
            0,
            Math.min(1, gestureStartValueRef.current + delta),
          );
          setPanValue(newValue);
          lastGestureValueRef.current = newValue;

          if (panActionRef.current === "brightness") {
            try {
              Brightness.setBrightnessAsync(newValue);
            } catch (e) { }
          } else if (panActionRef.current === "volume") {
            try {
              VolumeManager.setVolume(newValue).catch(() => { });
            } catch (e) { }
            if (newValue === 0 && !panHandlersRef.current.isMuted)
              panHandlersRef.current.setIsMuted(true);
            if (newValue > 0 && panHandlersRef.current.isMuted)
              panHandlersRef.current.setIsMuted(false);
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!isActualSwipeRef.current) {
          // It was a tap! (Never became a swipe)
          const now = Date.now();
          const x = gestureState.x0; // Safe tap location
          const { width } = Dimensions.get("window");

          if (now - panTapLastTimeRef.current < 300) {
            // Double tap
            if (panTapSingleTimeoutRef.current) {
              clearTimeout(panTapSingleTimeoutRef.current);
              panTapSingleTimeoutRef.current = null;
            }
            if (x < width / 2) panHandlersRef.current.skipBackward?.();
            else panHandlersRef.current.skipForward?.();
            panTapLastTimeRef.current = 0;
          } else {
            // Single tap
            panTapLastTimeRef.current = now;
            if (panTapSingleTimeoutRef.current)
              clearTimeout(panTapSingleTimeoutRef.current);
            panTapSingleTimeoutRef.current = setTimeout(() => {
              panHandlersRef.current.toggleControls?.();
              panTapSingleTimeoutRef.current = null;
            }, 250);
          }
        }

        // Hide overlay after interaction
        if (panActionRef.current) {
          if (lastGestureValueRef.current !== null) {
            const finalVal = lastGestureValueRef.current;
            if (panActionRef.current === "brightness") {
              AsyncStorage.setItem(
                "user_brightness",
                finalVal.toString(),
              ).catch(() => { });
            } else if (panActionRef.current === "volume") {
              AsyncStorage.setItem("user_volume", finalVal.toString()).catch(
                () => { },
              );
            }
            lastGestureValueRef.current = null;
          }
          swipeTimeoutRef.current = setTimeout(() => {
            setPanAction(null);
            panActionRef.current = null;
          }, 1000);
        }
      },
      onPanResponderTerminate: () => {
        if (panActionRef.current) {
          swipeTimeoutRef.current = setTimeout(() => {
            setPanAction(null);
            panActionRef.current = null;
          }, 500);
        }
      },
    }),
  ).current;

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
    Coolvetica: require("../../assets/fonts/Coolvetica-Rg.otf"),
    Code: require("../../assets/fonts/CODE-Bold.otf"),
    TT: require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
    "TT Medium": require("../../assets/fonts/TT-Chocolates-Trial-Medium.otf"),
  });

  // ── 1. Resolve stream URL ────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId || !messageId) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    let cancelled = false;

    const resolveUrl = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/stream/${chatId}/${messageId}/metadata`,
          { timeout: 10000 },
        );
        if (cancelled) return;

        const url = res.data?.needsTranscode
          ? `${API_BASE}/stream/hls/${chatId}/${messageId}/playlist.m3u8`
          : `${API_BASE}/stream/${chatId}/${messageId}`;

        setStreamUrl(url);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.warn(
          "Metadata fetch failed, falling back to direct stream:",
          err.message,
        );
        setStreamUrl(`${API_BASE}/stream/${chatId}/${messageId}`);
        setLoading(false);
      }
    };

    resolveUrl();
    return () => {
      cancelled = true;
    };
  }, [chatId, messageId]);

  // ── 2. Lock orientation to landscape ─────────────────────────────────────
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
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

    let timeout;
    try {
      // Delay initialization slightly to let the Android ScreenOrientation lock
      // and SurfaceView layout settle, preventing the "black screen / audio only" bug.
      timeout = setTimeout(() => {
        player.replaceAsync({ uri: streamUrl });
        player.play();
      }, 500);
    } catch (e) {
      console.warn("player.replace error:", e);
      setError(true);
      setLoading(false);
    }

    return () => clearTimeout(timeout);
  }, [streamUrl, player]);

  const { status, error: playerError } = useEvent(player, "statusChange", {
    status: player?.status,
  });
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player?.playing ?? false,
  });
  const { duration } = useEvent(player, "sourceLoad", {
    duration: player?.duration ?? 0,
  });

  // When the video actually starts playing for the first time, mark it as ready
  const hasMarkedReadyRef = useRef(false);
  useEffect(() => {
    if (isPlaying && !hasMarkedReadyRef.current) {
      hasMarkedReadyRef.current = true;
      setVideoReady(true);
      setLoading(false);
    }
  }, [isPlaying]);

  // ── Episode Logic ────────────────────────────────────────────────────────
  const isSeries = !!seriesData;
  let nextEp = null;
  let nextSIndex = seasonIndex;
  let nextEIndex = episodeIndex + 1;

  if (isSeries) {
    let currentSeason = seriesData.seasons[nextSIndex];
    if (currentSeason && nextEIndex < currentSeason.episodes.length) {
      nextEp = currentSeason.episodes[nextEIndex];
    } else if (nextSIndex + 1 < seriesData.seasons.length) {
      nextSIndex++;
      nextEIndex = 0;
      let nextSeason = seriesData.seasons[nextSIndex];
      if (nextSeason && nextSeason.episodes.length > 0) {
        nextEp = nextSeason.episodes[nextEIndex];
      }
    }
  }

  let prevEp = null;
  let prevSIndex = seasonIndex;
  let prevEIndex = episodeIndex - 1;

  if (isSeries) {
    if (prevEIndex >= 0) {
      prevEp = seriesData.seasons[prevSIndex].episodes[prevEIndex];
    } else if (prevSIndex - 1 >= 0) {
      prevSIndex--;
      let prevSeason = seriesData.seasons[prevSIndex];
      if (prevSeason && prevSeason.episodes.length > 0) {
        prevEIndex = prevSeason.episodes.length - 1;
        prevEp = prevSeason.episodes[prevEIndex];
      }
    }
  }

  const handleNextEpisode = useCallback(() => {
    if (nextEp && isSeries) {
      try {
        player?.pause();
      } catch (_) { }
      navigation.setParams({
        title: `${seriesData.title} · S${seriesData.seasons[nextSIndex].seasonNumber}E${nextEp.episodeNumber} – ${nextEp.title}`,
        chatId: nextEp.telegramChatId,
        messageId: nextEp.telegramMessageId,
        seasonIndex: nextSIndex,
        episodeIndex: nextEIndex,
        movieId: `${seriesData._id}_S${seriesData.seasons[nextSIndex].seasonNumber}_E${nextEp.episodeNumber}`,
      });
    }
  }, [
    nextEp,
    isSeries,
    navigation,
    seriesData,
    nextSIndex,
    nextEIndex,
    player,
  ]);

  const handlePrevEpisode = useCallback(() => {
    if (prevEp && isSeries) {
      try {
        player?.pause();
      } catch (_) { }
      navigation.setParams({
        title: `${seriesData.title} · S${seriesData.seasons[prevSIndex].seasonNumber}E${prevEp.episodeNumber} – ${prevEp.title}`,
        chatId: prevEp.telegramChatId,
        messageId: prevEp.telegramMessageId,
        seasonIndex: prevSIndex,
        episodeIndex: prevEIndex,
        movieId: `${seriesData._id}_S${seriesData.seasons[prevSIndex].seasonNumber}_E${prevEp.episodeNumber}`,
      });
    }
  }, [
    prevEp,
    isSeries,
    navigation,
    seriesData,
    prevSIndex,
    prevEIndex,
    player,
  ]);

  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      try {
        if (player.currentTime !== undefined) {
          setPolledTime(player.currentTime);
        }
        if (
          player.bufferedPosition !== undefined &&
          player.bufferedPosition >= 0
        ) {
          setBufferedTime(player.bufferedPosition);
        }
      } catch (e) {
        // player might be released
      }
    }, 500);
    return () => clearInterval(interval);
  }, [player]);

  useEffect(() => {
    hasResumedRef.current = false;
  }, [movieId]);

  useEffect(() => {
    if (!movieId || !player) return;
    const saveProgressInterval = setInterval(async () => {
      try {
        const isPlaying = player.playing;
        const currentProgress = player.currentTime;

        if (isPlaying && currentProgress > 5) {
          await saveWatchProgress(currentProgress);
        }
      } catch (e) {
        // ignore released object error or network error
      }
    }, 2000);
    return () => clearInterval(saveProgressInterval);
  }, [movieId, player, saveWatchProgress]);

  useEffect(() => {
    if (status === "error") {
      setError(true);
      setLoading(false);
    } else if (status === "readyToPlay") {
      setError(false);
      // Don't hide loading yet — wait for first isPlaying=true (first frame rendered)

      if (
        user &&
        user.watchHistory &&
        !hasResumedRef.current &&
        movieId &&
        player
      ) {
        hasResumedRef.current = true;
        const historyItem = user.watchHistory.find(
          (h) => h.movieId === String(movieId),
        );
        if (
          historyItem &&
          historyItem.progress > 0 &&
          historyItem.progress < player.duration - 15
        ) {
          player.currentTime = historyItem.progress;
        }
      }
    }
  }, [status, user, movieId, player]);

  useEffect(() => {
    if (isPlaying) {
      setError(false);
      setLoading(false);
    }
  }, [isPlaying]);

  // ── Back button ───────────────────────────────────────────────────────────
  const handleBack = useCallback(async () => {
    try {
      if (player) {
        player.pause();
        await saveWatchProgress(player.currentTime, true);
      }
    } catch (_) { }
    navigation.goBack();
  }, [navigation, player, saveWatchProgress]);

  // ── Retry ─────────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setError(false);
    setLoading(true);
    setVideoReady(false);
    hasMarkedReadyRef.current = false;
    try {
      if (player && streamUrl) {
        // Appending a timestamp forces the player to treat it as a new URL and actually reload
        const retryUrl = streamUrl.includes("?")
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

  const toggleMute = useCallback(async () => {
    if (!player) return;
    const next = !isMuted;
    try {
      if (next) {
        await VolumeManager.setVolume(0);
        AsyncStorage.setItem("user_volume", "0").catch(() => { });
      } else {
        const savedV = await AsyncStorage.getItem("user_volume");
        const nextVol = savedV && parseFloat(savedV) > 0 ? parseFloat(savedV) : 0.5;
        await VolumeManager.setVolume(nextVol);
        AsyncStorage.setItem("user_volume", nextVol.toString()).catch(() => { });
      }
    } catch (e) { }
    setIsMuted(next);
    resetControlsTimeout();
  }, [player, isMuted, resetControlsTimeout]);

  const togglePlayPause = useCallback(() => {
    if (!player) return;
    if (isPlaying) player.pause();
    else player.play();
    resetControlsTimeout();
  }, [player, isPlaying, resetControlsTimeout]);

  const skipBackward = useCallback(() => {
    if (player) {
      player.seekBy(-10);
      if (showControls) {
        resetControlsTimeout();
      }

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
  }, [
    player,
    resetControlsTimeout,
    skipBackAnim,
    backwardRippleAnim,
    showControls,
  ]);

  const skipForward = useCallback(() => {
    if (player) {
      player.seekBy(10);
      if (showControls) {
        resetControlsTimeout();
      }

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
  }, [
    player,
    resetControlsTimeout,
    skipForwardAnim,
    forwardRippleAnim,
    showControls,
  ]);

  const handleSlidingStart = useCallback((value) => {
    setIsSliding(true);
    setSlidingTime(value);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
  }, []);

  const handleValueChange = useCallback((value) => {
    setSlidingTime(value);
  }, []);

  const handleSlidingComplete = useCallback(
    (value) => {
      if (player) {
        player.currentTime = value;
      }
      setIsSliding(false);
      resetControlsTimeout();
    },
    [player, resetControlsTimeout],
  );

  const displayTime = isSliding ? slidingTime : polledTime;

  const skipBackRotate = skipBackAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: ["-45deg", "0deg"],
  });

  const skipForwardRotate = skipForwardAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: ["45deg", "0deg"],
  });

  // ── Icons ─────────────────────────────────────────────────────────────────
  const MutedIcon = ({ size = 24 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G clipPath="url(#clip_muted)">
        <Path
          d="M7 17.7504H5C2.58 17.7504 1.25 16.4204 1.25 14.0004V10.0004C1.25 7.58036 2.58 6.25036 5 6.25036H6.43C6.66 6.25036 6.89 6.18036 7.09 6.06036L10.01 4.23036C11.47 3.32036 12.89 3.15036 14.01 3.77036C15.13 4.39036 15.74 5.68036 15.74 7.41036V8.37036C15.74 8.78036 15.4 9.12036 14.99 9.12036C14.58 9.12036 14.24 8.78036 14.24 8.37036V7.41036C14.24 6.27036 13.89 5.42036 13.28 5.09036C12.67 4.75036 11.77 4.90036 10.8 5.51036L7.88 7.33036C7.45 7.61036 6.94 7.75036 6.43 7.75036H5C3.42 7.75036 2.75 8.42036 2.75 10.0004V14.0004C2.75 15.5804 3.42 16.2504 5 16.2504H7C7.41 16.2504 7.75 16.5904 7.75 17.0004C7.75 17.4104 7.41 17.7504 7 17.7504Z"
          fill="white"
        />
        <Path
          d="M12.5501 20.5902C11.7601 20.5902 10.8901 20.3102 10.0201 19.7602C9.67009 19.5402 9.56009 19.0802 9.78009 18.7302C10.0001 18.3802 10.4601 18.2702 10.8101 18.4902C11.7801 19.0902 12.6801 19.2502 13.2901 18.9102C13.9001 18.5702 14.2501 17.7202 14.2501 16.5902V12.9502C14.2501 12.5402 14.5901 12.2002 15.0001 12.2002C15.4101 12.2002 15.7501 12.5402 15.7501 12.9502V16.5902C15.7501 18.3102 15.1301 19.6102 14.0201 20.2302C13.5701 20.4702 13.0701 20.5902 12.5501 20.5902Z"
          fill="white"
        />
        <Path
          d="M18 16.7503C17.84 16.7503 17.69 16.7003 17.55 16.6003C17.22 16.3503 17.15 15.8803 17.4 15.5503C18.66 13.8703 18.93 11.6403 18.12 9.71032C17.96 9.33032 18.14 8.89032 18.52 8.73032C18.9 8.57032 19.34 8.75032 19.5 9.13032C20.52 11.5503 20.17 14.3603 18.6 16.4603C18.45 16.6503 18.23 16.7503 18 16.7503Z"
          fill="white"
        />
        <Path
          d="M19.8301 19.2502C19.6701 19.2502 19.5201 19.2002 19.3801 19.1002C19.0501 18.8502 18.9801 18.3802 19.2301 18.0502C21.3701 15.2002 21.8401 11.3802 20.4601 8.0902C20.3001 7.7102 20.4801 7.2702 20.8601 7.1102C21.2501 6.9502 21.6801 7.1302 21.8401 7.5102C23.4301 11.2902 22.8901 15.6702 20.4301 18.9502C20.2901 19.1502 20.0601 19.2502 19.8301 19.2502Z"
          fill="white"
        />
        <Path
          d="M1.99994 22.7504C1.80994 22.7504 1.61994 22.6804 1.46994 22.5304C1.17994 22.2404 1.17994 21.7604 1.46994 21.4704L21.4699 1.47043C21.7599 1.18043 22.2399 1.18043 22.5299 1.47043C22.8199 1.76043 22.5299 2.24043 22.5299 2.53043L2.52994 22.5304C2.37994 22.6804 2.18994 22.7504 1.99994 22.7504Z"
          fill="white"
        />
      </G>
      <Defs>
        <ClipPath id="clip_muted">
          <Rect width="24" height="24" fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );

  const UnmutedIcon = ({ size = 24 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G clipPath="url(#clip_unmuted)">
        <Path
          d="M12.55 20.5896C11.76 20.5896 10.89 20.3096 10.02 19.7596L7.1 17.9296C6.9 17.8096 6.67 17.7396 6.44 17.7396H5C2.58 17.7396 1.25 16.4096 1.25 13.9896V9.98962C1.25 7.56962 2.58 6.23962 5 6.23962H6.43C6.66 6.23962 6.89 6.16962 7.09 6.04962L10.01 4.21962C11.47 3.30962 12.89 3.13962 14.01 3.75962C15.13 4.37962 15.74 5.66962 15.74 7.39962V16.5696C15.74 18.2896 15.12 19.5896 14.01 20.2096C13.57 20.4696 13.07 20.5896 12.55 20.5896ZM5 7.74962C3.42 7.74962 2.75 8.41962 2.75 9.99962V13.9996C2.75 15.5796 3.42 16.2496 5 16.2496H6.43C6.95 16.2496 7.45 16.3896 7.89 16.6696L10.81 18.4996C11.77 19.0996 12.68 19.2596 13.29 18.9196C13.9 18.5796 14.25 17.7296 14.25 16.5996V7.40962C14.25 6.26962 13.9 5.41962 13.29 5.08962C12.68 4.74962 11.77 4.89962 10.81 5.50962L7.88 7.32962C7.45 7.60962 6.94 7.74962 6.43 7.74962H5Z"
          fill="white"
        />
        <Path
          d="M18 16.7503C17.84 16.7503 17.69 16.7003 17.55 16.6003C17.22 16.3503 17.15 15.8803 17.4 15.5503C18.97 13.4603 18.97 10.5403 17.4 8.45027C17.15 8.12027 17.22 7.65027 17.55 7.40027C17.88 7.15027 18.35 7.22027 18.6 7.55027C20.56 10.1703 20.56 13.8303 18.6 16.4503C18.45 16.6503 18.23 16.7503 18 16.7503Z"
          fill="white"
        />
        <Path
          d="M19.8301 19.2503C19.6701 19.2503 19.5201 19.2003 19.3801 19.1003C19.0501 18.8503 18.9801 18.3803 19.2301 18.0503C21.9001 14.4903 21.9001 9.51027 19.2301 5.95027C18.9801 5.62027 19.0501 5.15027 19.3801 4.90027C19.7101 4.65027 20.1801 4.72027 20.4301 5.05027C23.5001 9.14027 23.5001 14.8603 20.4301 18.9503C20.2901 19.1503 20.0601 19.2503 19.8301 19.2503Z"
          fill="white"
        />
      </G>
      <Defs>
        <ClipPath id="clip_unmuted">
          <Rect width="24" height="24" fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );
  const PrevIcon = ({ size = 24, color = "#000000" }) => (
    <Svg width={size} height={size} viewBox={`0 0 24 24`} fill={color}>
      <G clipPath="url(#clip0_4418_7974)">
        <Path
          d="M20.24 7.21957V16.7896C20.24 18.7496 18.11 19.9796 16.41 18.9996L12.26 16.6096L8.10996 14.2096C6.40996 13.2296 6.40996 10.7796 8.10996 9.79957L12.26 7.39957L16.41 5.00957C18.11 4.02957 20.24 5.24957 20.24 7.21957Z"
          fill="white"
        />
        <Path
          d="M3.76001 18.9303C3.35001 18.9303 3.01001 18.5903 3.01001 18.1803V5.82031C3.01001 5.41031 3.35001 5.07031 3.76001 5.07031C4.17001 5.07031 4.51001 5.41031 4.51001 5.82031V18.1803C4.51001 18.5903 4.17001 18.9303 3.76001 18.9303Z"
          fill="white"
        />
      </G>
      <Defs>
        <ClipPath id="clip0_4418_7974">
          <Rect width="24" height="24" fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );

  const NextIcon = ({ size = 24, color = "#000000" }) => (
    <Svg width={size} height={size} viewBox={`0 0 24 24`} fill={color}>
      <G clipPath="url(#clip0_4418_7975)">
        <Path
          d="M3.76001 7.21957V16.7896C3.76001 18.7496 5.89001 19.9796 7.59001 18.9996L11.74 16.6096L15.89 14.2096C17.59 13.2296 17.59 10.7796 15.89 9.79957L11.74 7.39957L7.59001 5.00957C5.89001 4.02957 3.76001 5.24957 3.76001 7.21957Z"
          fill="white"
        />
        <Path
          d="M20.24 18.9303C19.83 18.9303 19.49 18.5903 19.49 18.1803V5.82031C19.49 5.41031 19.83 5.07031 20.24 5.07031C20.65 5.07031 20.99 5.41031 20.99 5.82031V18.1803C20.99 18.5903 20.66 18.9303 20.24 18.9303Z"
          fill="white"
        />
      </G>
      <Defs>
        <ClipPath id="clip0_4418_7975">
          <Rect width="24" height="24" fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );

  // ── 6. Toggle System Bars (Status Bar & Nav Bar) for Immersive Fullscreen ─
  useEffect(() => {
    // Enter immersive fullscreen mode
    StatusBar.setHidden(true, "fade");
    NavigationBar.setVisibilityAsync("hidden");

    return () => {
      // Restore system bars when exiting the player
      StatusBar.setHidden(false, "fade");
      NavigationBar.setVisibilityAsync("visible");
    };
  }, []);

  // ── Keep panHandlersRef current on every render ───────────────────────────
  panHandlersRef.current.toggleControls = toggleControls;
  panHandlersRef.current.skipBackward = skipBackward;
  panHandlersRef.current.skipForward = skipForward;
  panHandlersRef.current.player = player;
  panHandlersRef.current.isMuted = isMuted;
  panHandlersRef.current.setIsMuted = setIsMuted;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {streamUrl ? (
        <View style={styles.videoContainer}>
          <VideoView
            ref={videoRef}
            style={styles.video}
            player={player}
            fullscreenOptions={{ enable: false }}
            allowsPictureInPicture
            contentFit={contentFit}
            nativeControls={false}
          />

          {/* Explicit Gesture Catching Layer (between Video and Controls) */}
          <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />

          {/* Accumulator Ripple Overlays */}
          {showBackwardRipple && (
            <Animated.View
              style={[
                styles.rippleOverlay,
                styles.rippleLeft,
                { opacity: backwardRippleAnim },
              ]}
              pointerEvents="none"
            >
              <View style={styles.rippleContent}>
                <Feather name="chevron-left" size={24} color="#fff" />
                <Text style={styles.rippleText}>
                  - {backwardCountRef.current}
                </Text>
              </View>
            </Animated.View>
          )}

          {showForwardRipple && (
            <Animated.View
              style={[
                styles.rippleOverlay,
                styles.rippleRight,
                { opacity: forwardRippleAnim },
              ]}
              pointerEvents="none"
            >
              <View style={styles.rippleContent}>
                <Text style={styles.rippleText}>
                  + {forwardCountRef.current}
                </Text>
                <Feather name="chevron-right" size={24} color="#fff" />
              </View>
            </Animated.View>
          )}

          {showControls && (
            <View style={styles.controlsOverlay} pointerEvents="box-none">
              {/* Center play/pause and skip buttons */}
              <View style={styles.centerControls} pointerEvents="box-none">
                <TouchableOpacity
                  onPress={isSeries ? handlePrevEpisode : skipBackward}
                  activeOpacity={0.7}
                  disabled={(isSeries && !prevEp) || loading || !videoReady}
                >
                  <Animated.View
                    style={[
                      styles.controlBtn,
                      !isSeries && {
                        transform: [
                          { scale: skipBackAnim },
                          { rotate: skipBackRotate },
                        ],
                      },
                      isSeries && !prevEp,
                      (loading || !videoReady),
                    ]}
                  >
                    {isSeries ? (
                      <PrevIcon size={32} color="#fff" />
                    ) : (
                      <>
                        <Feather name="rotate-ccw" size={32} color="#fff" />
                        <Text style={styles.skipText}>10</Text>
                      </>
                    )}
                  </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={togglePlayPause}
                  style={[styles.controlBtn, styles.playPauseBtn, (loading || !videoReady) && { opacity: 0 }]}
                  disabled={loading || !videoReady}
                >
                  <FontAwesome6
                    name={isPlaying ? "pause" : "play"}
                    size={48}
                    color="#fff"
                    style={{ marginLeft: isPlaying ? 0 : 3 }}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={isSeries ? handleNextEpisode : skipForward}
                  activeOpacity={0.7}
                  disabled={(isSeries && !nextEp) || loading || !videoReady}
                >
                  <Animated.View
                    style={[
                      styles.controlBtn,
                      !isSeries && {
                        transform: [
                          { scale: skipForwardAnim },
                          { rotate: skipForwardRotate },
                        ],
                      },
                      isSeries && !nextEp && { opacity: 0.3 },
                      (loading || !videoReady) && { opacity: 0.3 },
                    ]}
                  >
                    {isSeries ? (
                      <NextIcon size={32} color="#fff" />
                    ) : (
                      <>
                        <Feather name="rotate-cw" size={32} color="#fff" />
                        <Text style={styles.skipText}>10</Text>
                      </>
                    )}
                  </Animated.View>
                </TouchableOpacity>
              </View>

              {/* Bottom slider and time text */}
              <View style={styles.bottomControls}>
                <TouchableOpacity
                  onPress={() => {
                    setShowTimeRemaining(prev => !prev);
                    resetControlsTimeout();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeText}>
                    {showTimeRemaining && duration > 0
                      ? `-${formatTime(Math.max(0, duration - displayTime))}`
                      : formatTime(displayTime)}
                  </Text>
                </TouchableOpacity>

                <View style={styles.sliderContainer}>
                  {/* Custom Background Track */}
                  <View style={styles.customTrackBackground} />
                  {/* Custom Buffered Track */}
                  <View
                    style={[
                      styles.customTrackBuffered,
                      {
                        width: `${(bufferedTime / (duration > 0 ? duration : 1)) * 100}%`,
                      },
                    ]}
                  />
                  {/* Custom Foreground Track */}
                  <View
                    style={[
                      styles.customTrackForeground,
                      {
                        width: `${(displayTime / (duration > 0 ? duration : 1)) * 100}%`,
                      },
                    ]}
                  />

                  {/* Custom Thumb */}
                  <View
                    style={[
                      styles.customThumb,
                      {
                        left: `${(displayTime / (duration > 0 ? duration : 1)) * 100}%`,
                      },
                    ]}
                    pointerEvents="none"
                  />

                  {/* Native Slider (invisible tracks, only thumb visible) */}
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration > 0 ? duration : 1}
                    value={displayTime}
                    minimumTrackTintColor="transparent"
                    maximumTrackTintColor="transparent"
                    thumbTintColor="transparent"
                    onSlidingStart={handleSlidingStart}
                    onValueChange={handleValueChange}
                    onSlidingComplete={handleSlidingComplete}
                  />
                </View>

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
              <TouchableOpacity
                style={styles.videoScale}
                activeOpacity={0.7}
                onPress={cycleContentFit}
              >
                <MaterialIcons name="fit-screen" size={24} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.muteButton}
                onPress={toggleMute}
                activeOpacity={0.7}
              >
                {isMuted ? <MutedIcon size={24} /> : <UnmutedIcon size={24} />}
              </TouchableOpacity>
            </SafeAreaView>
          )}

          {/* Pan Indicator Overlay */}
          {panAction && (
            <View style={styles.panIndicatorContainer}>
              {panAction === "brightness" ? (
                <Feather name="sun" size={40} color="#fff" />
              ) : (
                <Feather
                  name={panValue === 0 ? "volume-x" : "volume-2"}
                  size={40}
                  color="#fff"
                />
              )}
              <View style={styles.panProgressBarContainer}>
                <View
                  style={[
                    styles.panProgressBar,
                    { width: `${panValue * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.backdrop} />
      )}

      {/* Loading overlay — stays visible until first frame is painted */}
      {(loading || !videoReady) && !error && (
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
    backgroundColor: "#000",
  },
  videoContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#000",
  },
  video: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
  },
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    marginTop: -35,
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 30,
  },
  playPauseBtn: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 50,
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "TT Medium",
    position: "absolute",
    top: 11,
  },
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  sliderContainer: {
    flex: 1,
    height: 40,
    marginHorizontal: 15,
    justifyContent: "center",
    position: "relative",
  },
  customTrackBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
  },
  customTrackBuffered: {
    position: "absolute",
    left: 0,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 3,
  },
  customTrackForeground: {
    position: "absolute",
    left: 0,
    height: 6,
    backgroundColor: "#E50914",
    borderRadius: 3,
  },
  customThumb: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 10,
    backgroundColor: "#E50914",
    marginLeft: -10,
  },
  slider: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 40,
  },
  timeText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "TT Medium",
    fontVariant: ["tabular-nums"],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    gap: 14,
  },
  overlayText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontFamily: "Coolvetica",
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 28,
    paddingVertical: 10,
    backgroundColor: "#E50914",
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontFamily: "TT Medium",
    fontSize: 14,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 5,
  },
  backButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 6,
    marginRight: 10,
  },
  muteButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 6,
    marginLeft: 10,
    marginRight: 30,
  },
  videoScale: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 6,
    marginRight: 5,
  },
  titleText: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontFamily: "TT Medium",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  panIndicatorContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -75 }, { translateY: -75 }],
    width: 130,
    height: 130,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    elevation: 10,
    gap: 20,
    pointerEvents: "none",
  },
  panProgressBarContainer: {
    width: 100,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  panProgressBar: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 3,
  },
  rippleOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  rippleRight: {
    left: "60%",
    borderTopLeftRadius: 500,
    borderBottomLeftRadius: 500,
  },
  rippleLeft: {
    right: "60%",
    borderTopRightRadius: 500,
    borderBottomRightRadius: 500,
  },
  rippleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rippleText: {
    color: "#fff",
    fontSize: 30,
    fontFamily: "Code",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

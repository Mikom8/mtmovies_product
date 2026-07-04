import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Pressable,
  StatusBar,
  FlatList,
  Animated,
  Modal,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import { useWatchlist } from "../context/WatchlistContext";
import { useAuth } from "../context/AuthContext";
import Toast from "../components/Toast";
import ShareModal from "../components/ShareModal";
import Svg, { G, Path, Rect, Defs, ClipPath } from "react-native-svg";
import * as WebBrowser from "expo-web-browser";

const { width: W, height: H } = Dimensions.get("window");
const HERO_H = H * 0.32;

// ── Custom Watchlist Icons ────────────────────────────────────────────────────
const AddToListIcon = ({ size = 24, color = "#fff" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Defs>
      <ClipPath id="clip_add">
        <Rect width="24" height="24" fill="white" />
      </ClipPath>
    </Defs>
    <G clipPath="url(#clip_add)">
      <Path
        d="M14.5 11.4004H9.5C9.09 11.4004 8.75 11.0604 8.75 10.6504C8.75 10.2404 9.09 9.90039 9.5 9.90039H14.5C14.91 9.90039 15.25 10.2404 15.25 10.6504C15.25 11.0604 14.91 11.4004 14.5 11.4004Z"
        fill={color}
      />
      <Path
        d="M12 13.9609C11.59 13.9609 11.25 13.6209 11.25 13.2109V8.21094C11.25 7.80094 11.59 7.46094 12 7.46094C12.41 7.46094 12.75 7.80094 12.75 8.21094V13.2109C12.75 13.6209 12.41 13.9609 12 13.9609Z"
        fill={color}
      />
      <Path
        d="M19.0701 22.75C18.5601 22.75 18.0001 22.6 17.4601 22.29L12.5801 19.58C12.2901 19.42 11.7201 19.42 11.4301 19.58L6.55007 22.29C5.56007 22.84 4.55007 22.9 3.78007 22.44C3.01007 21.99 2.57007 21.08 2.57007 19.95V5.86C2.57007 3.32 4.64007 1.25 7.18007 1.25H16.8301C19.3701 1.25 21.4401 3.32 21.4401 5.86V19.95C21.4401 21.08 21.0001 21.99 20.2301 22.44C19.8801 22.65 19.4801 22.75 19.0701 22.75ZM12.0001 17.96C12.4701 17.96 12.9301 18.06 13.3001 18.27L18.1801 20.98C18.6901 21.27 19.1601 21.33 19.4601 21.15C19.7601 20.97 19.9301 20.54 19.9301 19.95V5.86C19.9301 4.15 18.5301 2.75 16.8201 2.75H7.18007C5.47007 2.75 4.07007 4.15 4.07007 5.86V19.95C4.07007 20.54 4.24007 20.98 4.54007 21.15C4.84007 21.32 5.31007 21.27 5.82007 20.98L10.7001 18.27C11.0701 18.06 11.5301 17.96 12.0001 17.96Z"
        fill={color}
      />
    </G>
  </Svg>
);

const AddedToListIcon = ({ size = 24, color = "#E50914" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Defs>
      <ClipPath id="clip_added">
        <Rect width="24" height="24" fill="white" />
      </ClipPath>
    </Defs>
    <G clipPath="url(#clip_added)">
      <Path
        d="M16.8201 1.91016H7.18007C5.06007 1.91016 3.32007 3.65016 3.32007 5.77016V19.8602C3.32007 21.6602 4.61007 22.4202 6.19007 21.5502L11.0701 18.8402C11.5901 18.5502 12.4301 18.5502 12.9401 18.8402L17.8201 21.5502C19.4001 22.4302 20.6901 21.6702 20.6901 19.8602V5.77016C20.6801 3.65016 18.9501 1.91016 16.8201 1.91016ZM15.6201 9.03016L11.6201 13.0302C11.4701 13.1802 11.2801 13.2502 11.0901 13.2502C10.9001 13.2502 10.7101 13.1802 10.5601 13.0302L9.06007 11.5302C8.77007 11.2402 8.77007 10.7602 9.06007 10.4702C9.35007 10.1802 9.83007 10.1802 10.1201 10.4702L11.0901 11.4402L14.5601 7.97016C14.8501 7.68016 15.3301 7.68016 15.6201 7.97016C15.9101 8.26016 15.9101 8.74016 15.6201 9.03016Z"
        fill={color}
      />
    </G>
  </Svg>
);

// ── Recommendation algorithm ───────────────────────────────────────────────────
function scoreItem(target, candidate) {
  if (target._id === candidate._id) return -Infinity;
  let score = 0;

  // Genre overlap (highest weight)
  const targetGenres = new Set(target.genres || []);
  (candidate.genres || []).forEach((g) => {
    if (targetGenres.has(g)) score += 8;
  });

  // Tag overlap
  const targetTags = new Set(target.tags || []);
  (candidate.tags || []).forEach((t) => {
    if (targetTags.has(t)) score += 4;
  });

  // Rating proximity (closer rating = higher score)
  const ratingDiff = Math.abs((target.rating || 0) - (candidate.rating || 0));
  score += Math.max(0, 5 - ratingDiff);

  // Year proximity (penalize >10 year gap)
  const targetYear = parseInt(target.year) || 2020;
  const candidateYear = parseInt(candidate.year) || 2020;
  const yearDiff = Math.abs(targetYear - candidateYear);
  if (yearDiff <= 3) score += 3;
  else if (yearDiff <= 7) score += 1;

  // Same quality
  if (target.quality && target.quality === candidate.quality) score += 1;

  return score;
}

function getRecommendations(target, allItems, count = 9) {
  return [...allItems]
    .map((item) => ({ item, score: scoreItem(target, item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ item }) => item);
}

// ── Sub-components ────────────────────────────────────────────────────────────
const MetaBadge = ({ label, icon }) => (
  <View style={styles.metaBadge}>
    {icon && (
      <MaterialIcons
        name={icon}
        size={12}
        color="#aaa"
        style={{ marginRight: 3 }}
      />
    )}
    <Text style={styles.metaBadgeText}>{label}</Text>
  </View>
);

const GenreChip = ({ label }) => (
  <View style={styles.genreChip}>
    <Text style={styles.genreChipText}>{label}</Text>
  </View>
);

const RecommendCard = React.memo(({ item, type, onPress }) => (
  <TouchableOpacity
    style={styles.recCard}
    onPress={() => onPress(item)}
    activeOpacity={0.8}
  >
    <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" }}>
      <Image
        source={require("../../assets/img/unnamed-removebg-preview.png")}
        style={{ width: "40%", height: "40%", opacity: 0.2 }}
        resizeMode="contain"
      />
    </View>
    <Image
      source={{ uri: item.poster || item.backdrop }}
      style={styles.recPoster}
      resizeMode="cover"
    />
    <LinearGradient
      colors={["transparent", "rgba(0,0,0,0.85)"]}
      style={StyleSheet.absoluteFill}
    />
    <View style={styles.recMeta}>
      <Text style={styles.recTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <MaterialIcons name="star" size={10} color="#FFD700" />
        <Text style={styles.recRating}>{item.rating || "—"}</Text>
      </View>
    </View>
  </TouchableOpacity>
));

function parseDuration(str) {
  if (!str) return 0;
  let h = 0,
    m = 0;
  const hMatch = str.match(/(\d+)h/);
  const mMatch = str.match(/(\d+)m/);
  if (hMatch) h = parseInt(hMatch[1], 10);
  if (mMatch) m = parseInt(mMatch[1], 10);
  return h * 3600 + m * 60;
}

function getProgressPct(progress, durationStr) {
  const durSec = parseDuration(durationStr);
  if (!durSec || !progress) return null;
  return Math.min(100, Math.max(0, (progress / durSec) * 100));
}

function getSeriesContinueInfo(data, watchHistory) {
  if (!data?.seasons?.length || !watchHistory?.length) return null;

  const prefix = String(data._id);
  let latest = null;
  let maxDate = 0;

  for (let i = 0; i < watchHistory.length; i++) {
    const h = watchHistory[i];
    if (h.movieId.startsWith(`${prefix}_S`)) {
      const d = new Date(h.watchedAt || 0).getTime();
      if (d > maxDate) {
        maxDate = d;
        latest = h;
      }
    }
  }

  if (!latest) return null;

  const match = latest.movieId.match(/^(.+)_S(\d+)_E(\d+)$/);
  if (!match) return null;

  const [, , sNum, eNum] = match;
  const season = data.seasons.find((s) => String(s.seasonNumber) === sNum);
  const ep = season?.episodes?.find((e) => String(e.episodeNumber) === eNum);
  const progressPct = ep ? getProgressPct(latest.progress, ep.duration) : null;

  return { historyItem: latest, progressPct, sNum, eNum, season, ep };
}

// ── Skeleton Loader ───────────────────────────────────────────────────────────
const DetailsSkeleton = () => {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 600, useNativeDriver: true })
      ])
    ).start();
  }, [anim]);

  const baseColor = 'rgba(255, 255, 255, 0.25)'; // Slightly brighter gray for more visibility

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.View style={{ height: HERO_H, backgroundColor: baseColor, opacity: anim }} />
      <View style={styles.infoSection}>
        <Animated.View style={{ height: 32, width: '70%', backgroundColor: baseColor, borderRadius: 4, marginBottom: 16, opacity: anim }} />
        <View style={styles.metaRow}>
          <Animated.View style={{ height: 24, width: 60, backgroundColor: baseColor, borderRadius: 12, opacity: anim }} />
          <Animated.View style={{ height: 24, width: 80, backgroundColor: baseColor, borderRadius: 12, opacity: anim }} />
          <Animated.View style={{ height: 24, width: 50, backgroundColor: baseColor, borderRadius: 12, opacity: anim }} />
        </View>
        <Animated.View style={{ height: 48, width: '100%', backgroundColor: baseColor, borderRadius: 8, marginBottom: 24, opacity: anim }} />
        <Animated.View style={{ height: 16, width: '100%', backgroundColor: baseColor, borderRadius: 4, marginBottom: 10, opacity: anim }} />
        <Animated.View style={{ height: 16, width: '90%', backgroundColor: baseColor, borderRadius: 4, marginBottom: 10, opacity: anim }} />
        <Animated.View style={{ height: 16, width: '80%', backgroundColor: baseColor, borderRadius: 4, opacity: anim }} />

        {/* Skeleton for More Like This */}
        <View style={{ marginTop: 32 }}>
          <Animated.View style={{ height: 20, width: 120, backgroundColor: baseColor, borderRadius: 4, marginBottom: 14, opacity: anim }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Animated.View key={i} style={{ width: CARD_W, height: CARD_W * 1.5, backgroundColor: baseColor, borderRadius: 10, opacity: anim }} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const DetailsScreen = ({ route, navigation }) => {
  const { id, type } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { watchlist, isInWatchlist, toggleWatchlist } = useWatchlist();
  const { user, refreshUser } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [resolvedType, setResolvedType] = useState(type);
  const [selectedSeason, setSelectedSeason] = useState(0);
  const scrollRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    variant: "added",
  });
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [trailerModalVisible, setTrailerModalVisible] = useState(false);

  const historyMap = React.useMemo(() => {
    const map = new Map();
    if (user?.watchHistory) {
      user.watchHistory.forEach((h) => {
        map.set(h.movieId, h);
      });
    }
    return map;
  }, [user?.watchHistory]);

  const isActuallySeries = data ? (resolvedType === "series" && data.seasons?.length > 0) : false;

  const continueInfo = React.useMemo(() => {
    if (!isActuallySeries || !data) return null;
    return getSeriesContinueInfo(data, user?.watchHistory);
  }, [data, user?.watchHistory, isActuallySeries]);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleWatchlistToggle = useCallback(async () => {
    const result = await toggleWatchlist(id, resolvedType);
    if (result?.success) {
      const added = result.action === "added";
      setToast({
        visible: true,
        message: added ? "Added to My List" : "Removed from My List",
        variant: added ? "added" : "removed",
      });
    } else if (result?.error === "Not logged in") {
      setToast({
        visible: true,
        message: "Sign in to save titles to your list",
        variant: "info",
      });
    }
  }, [toggleWatchlist, id, resolvedType]);

  // Track whether we need to refresh on the NEXT focus event (e.g. returning from Player)
  const hasRefreshedRef = useRef(false);
  const isMountedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // On first mount: refresh once to get latest watch history
      if (!isMountedRef.current) {
        isMountedRef.current = true;
        refreshUser();
        return;
      }
      // On subsequent focus (returning from Player or any other screen):
      // only refresh once per departure → return cycle
      if (!hasRefreshedRef.current) {
        hasRefreshedRef.current = true;
        refreshUser();
      }

      return () => {
        // When screen loses focus (user navigated away), reset so next return triggers a refresh
        hasRefreshedRef.current = false;
      };
    }, [refreshUser]),
  );

  const [fontsLoaded] = useFonts({
    Coolvetica: require("../../assets/fonts/Coolvetica-Rg.otf"),
    Code: require("../../assets/fonts/CODE-Bold.otf"),
    TT: require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
    "TT Medium": require("../../assets/fonts/TT-Chocolates-Trial-Medium.otf"),
  });

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // First attempt with the passed type
      let currentType = type;
      let endpoint =
        currentType === "series" ? `/series/${id}` : `/movies/${id}`;
      let detailRes;

      try {
        detailRes = await client.get(endpoint);
      } catch (err) {
        // If 404, try the other collection (fallback for mis-typed items)
        if (err.response?.status === 404) {
          const otherType = currentType === "series" ? "movie" : "series";
          const otherEndpoint =
            otherType === "series" ? `/series/${id}` : `/movies/${id}`;
          console.log(
            `[Details] 404 on ${endpoint}, trying fallback: ${otherEndpoint}`,
          );
          detailRes = await client.get(otherEndpoint);
          currentType = otherType; // Update type if fallback succeeds
        } else {
          throw err;
        }
      }

      const detail =
        currentType === "series" ? detailRes.data.series : detailRes.data.movie;
      if (!detail) throw new Error("Item data is empty");

      setData(detail);
      setResolvedType(currentType);

      // Fetch recommendations from the dedicated endpoint — server-side filtering
      // by genres + tags + year, no limit of 50, searches ALL items in the DB
      const tags = (detail.tags || []).join(',');
      const genres = (detail.genres || []).join(',');
      const year = detail.year || '';
      const recRes = await client.get('/recommendations', {
        params: { tags, genres, year, excludeId: detail._id, limit: 9 }
      });
      setRecommendations(recRes.data?.recommendations || []);
    } catch (e) {
      console.error(
        "DetailsScreen fetch error:",
        e?.response?.data || e.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = useCallback(() => {
    if (!data.isFree && (!user || user.plan === "free")) {
      navigation.navigate("Plan");
      return false;
    }
    return true;
  }, [data, user, navigation]);

  const handleAdAndPlay = async (params) => {
    // Check if user has an active premium plan
    const isPremiumUser = user && user.plan && user.plan !== "free";

    if (!isPremiumUser) {
      try {
        // Only show the Monetag ad to free/unsubscribed users
        await WebBrowser.openBrowserAsync('https://omg10.com/4/11234522');
      } catch (e) {
        console.log("Error opening ad link:", e);
      }
    }

    // Navigate to the player (immediately for premium, or after ad for free users)
    navigation.navigate("Player", params);
  };

  const handleWatch = useCallback(() => {
    if (!checkAccess()) return;
    const isSeriesContent =
      resolvedType === "series" || (data.seasons && data.seasons.length > 0);

    if (!isSeriesContent || !data.seasons) {
      handleAdAndPlay({
        title: data.title,
        chatId: data.telegram?.chatId,
        messageId: data.telegram?.messageId,
        movieId: String(data._id),
      });
      return;
    }

    const continueInfo = getSeriesContinueInfo(data, user?.watchHistory);
    if (
      continueInfo?.ep &&
      continueInfo?.season &&
      continueInfo.progressPct > 0 &&
      continueInfo.progressPct < 95
    ) {
      const sIndex = data.seasons.findIndex(
        (s) => s._id === continueInfo.season._id,
      );
      const eIndex = continueInfo.season.episodes.findIndex(
        (e) => e._id === continueInfo.ep._id,
      );
      handleAdAndPlay({
        title: `${data.title} · S${continueInfo.sNum}E${continueInfo.eNum} – ${continueInfo.ep.title || ""}`,
        chatId: continueInfo.ep.telegramChatId,
        messageId: continueInfo.ep.telegramMessageId,
        seriesData: data,
        seasonIndex: sIndex >= 0 ? sIndex : 0,
        episodeIndex: eIndex >= 0 ? eIndex : 0,
        movieId: continueInfo.historyItem.movieId,
      });
      return;
    }

    const ep = data.seasons?.[selectedSeason]?.episodes?.[0];
    if (ep) {
      handleAdAndPlay({
        title: `${data.title} · S${data.seasons[selectedSeason].seasonNumber}E${ep.episodeNumber}`,
        chatId: ep.telegramChatId,
        messageId: ep.telegramMessageId,
        seriesData: data,
        seasonIndex: selectedSeason,
        episodeIndex: 0,
        movieId: `${data._id}_S${data.seasons[selectedSeason].seasonNumber}_E${ep.episodeNumber}`,
      });
    }
  }, [
    data,
    resolvedType,
    selectedSeason,
    navigation,
    user?.watchHistory,
    checkAccess,
  ]);

  const handleEpisodePlay = useCallback(
    (ep, season) => {
      if (!checkAccess()) return;
      const sIndex = data.seasons.findIndex((s) => s._id === season._id);
      const eIndex = season.episodes.findIndex((e) => e._id === ep._id);
      handleAdAndPlay({
        title: `${data.title} · S${season.seasonNumber}E${ep.episodeNumber} – ${ep.title}`,
        chatId: ep.telegramChatId,
        messageId: ep.telegramMessageId,
        seriesData: data,
        seasonIndex: sIndex >= 0 ? sIndex : 0,
        episodeIndex: eIndex >= 0 ? eIndex : 0,
        movieId: `${data._id}_S${season.seasonNumber}_E${ep.episodeNumber}`,
      });
    },
    [data, navigation],
  );

  const handleRecPress = useCallback(
    (item) => {
      navigation.push("Details", { id: item._id, type });
    },
    [navigation, type],
  );

  // ── Loading / Error ─────────────────────────────────────────────────────────
  if (loading || !data) {
    return <DetailsSkeleton />;
  }

  const currentSeason = data.seasons?.[selectedSeason];
  const totalEpisodes =
    data.seasons?.reduce((s, se) => s + (se.episodes?.length || 0), 0) || 0;

  const headerOpacity = scrollY.interpolate({
    inputRange: [HERO_H - 120, HERO_H - 60],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [HERO_H - 60, HERO_H - 10],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── Sticky Header ── */}
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            height: insets.top + 60,
            paddingTop: insets.top,
            backgroundColor: "rgba(10, 10, 10, 0.95)",
            opacity: headerOpacity,
          },
        ]}
      >
        <Animated.Text style={[styles.stickyTitle, { opacity: titleOpacity }]} numberOfLines={1}>
          {data.title}
        </Animated.Text>
      </Animated.View>

      {/* Global Back Button (always visible, outside ScrollView) */}
      <TouchableOpacity
        style={[styles.fixedBackBtn, { top: insets.top + 10 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Feather name="chevron-left" size={26} color="#fff" />
      </TouchableOpacity>

      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* ── Hero Backdrop ── */}
        <View style={{ height: HERO_H }}>
          <Image
            source={{ uri: data.backdrop || data.poster }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          {/* Top gradient */}
          <LinearGradient
            colors={["rgba(0,0,0,0.6)", "transparent"]}
            style={[StyleSheet.absoluteFill, { height: "40%" }]}
          />
          {/* Bottom gradient */}
          <LinearGradient
            colors={["transparent", "#0a0a0a"]}
            style={[StyleSheet.absoluteFill, { top: "50%" }]}
          />
          {/* Trailer Button */}
          {data.trailerEmbedId ? (
            <TouchableOpacity
              style={styles.trailerBtn}
              activeOpacity={0.8}
              onPress={() => setTrailerModalVisible(true)}
            >
              <View style={styles.trailerPlayCircle}>
                <MaterialIcons name="play-arrow" size={26} color="#fff" />
              </View>
              <Text style={styles.trailerLabel}>Trailer</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Info Section ── */}
        <View style={styles.infoSection}>
          {/* Title */}
          <Text style={styles.title}>{data.title}</Text>

          {/* Genres */}
          {data.genres?.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.genreRow}
            >
              {data.genres.map((g, i) => (
                <View
                  key={i}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <Text style={styles.genreChipText}>{g}</Text>
                  {i < data.genres.length - 1 && (
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        marginHorizontal: 8,
                      }}
                    >
                      •
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Meta Row */}
          <View style={styles.metaRow}>
            {data.year && <MetaBadge label={String(data.year)} />}
            {data.quality && <MetaBadge label={data.quality} icon="hd" />}
            {data.rating ? <MetaBadge label={`★ ${data.rating}`} /> : null}
            {data.duration && (
              <MetaBadge label={data.duration} icon="schedule" />
            )}
            {isActuallySeries && (
              <MetaBadge
                label={`${data.seasons?.length || 0} Season${data.seasons?.length !== 1 ? "s" : ""} · ${totalEpisodes} Ep`}
              />
            )}
            {(
              <View style={[styles.metaBadge, { borderColor: "#E50914" }]}>
                <Text style={[styles.metaBadgeText, { color: "#E50914" }]}>
                  {data.hasAmharicDub ? "በትርጉም" : "HD"}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {(() => {
              const isSeriesContent = isActuallySeries;
              let watchProgressPct = null;
              let watchLabel = "Watch Now";

              if (!isSeriesContent && user?.watchHistory) {
                const historyItem = historyMap.get(String(data._id));
                if (historyItem) {
                  watchProgressPct = getProgressPct(
                    historyItem.progress,
                    data.duration,
                  );
                  if (watchProgressPct > 0) watchLabel = "Resume";
                }
              } else if (isSeriesContent && user?.watchHistory) {
                if (continueInfo?.progressPct > 0) {
                  watchProgressPct = continueInfo.progressPct;
                  watchLabel = "Resume";
                }
              }

              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.watchBtn,
                    pressed && styles.watchBtnPressed,
                    { overflow: "hidden" },
                  ]}
                  onPress={handleWatch}
                >
                  <MaterialIcons name="play-arrow" size={20} color="#000" />
                  <Text style={styles.watchBtnText}>
                    {!data.isFree && (!user || user.plan === "free")
                      ? "Upgrade to Watch"
                      : watchLabel}
                  </Text>
                  {watchProgressPct !== null && watchProgressPct > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        backgroundColor: "rgba(0,0,0,0.1)",
                      }}
                    >
                      <View
                        style={{
                          height: "100%",
                          width: `${watchProgressPct}%`,
                          backgroundColor: "#E50914",
                        }}
                      />
                    </View>
                  )}
                </Pressable>
              );
            })()}

            <Pressable
              style={({ pressed }) => [
                styles.iconBtn,
                isInWatchlist(id) && styles.iconBtnActive,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleWatchlistToggle}
            >
              {isInWatchlist(id) ? (
                <AddedToListIcon size={22} color="#E50914" />
              ) : (
                <AddToListIcon size={22} color="#fff" />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setShareModalVisible(true)}
            >
              <Feather name="share-2" size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Description */}
          <Text style={styles.description}>{data.description}</Text>

          {/* ── Cast ── */}
          {data.cast && data.cast.length > 0 && (
            <View style={styles.castSection}>
              <Text style={styles.sectionHeader}>Cast</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.castScroll}
              >
                {data.cast.map((actor, i) => (
                  <View key={i} style={styles.castCard}>
                    {actor.image ? (
                      <Image
                        source={{ uri: actor.image }}
                        style={styles.castAvatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.castAvatar, styles.castAvatarPlaceholder]}>
                        <MaterialIcons name="person" size={28} color="#555" />
                      </View>
                    )}
                    <Text style={styles.castName} numberOfLines={2}>
                      {actor.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Series: Season Tabs + Episodes ── */}
          {isActuallySeries && data.seasons?.length > 0 && (
            <View style={styles.seasonsSection}>
              <Text style={styles.sectionHeader}>Episodes</Text>

              {/* Season Selector */}
              {data.seasons.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.seasonTabRow}
                >
                  {data.seasons.map((season, idx) => (
                    <Pressable
                      key={idx}
                      style={[
                        styles.seasonTab,
                        selectedSeason === idx && styles.seasonTabActive,
                      ]}
                      onPress={() => setSelectedSeason(idx)}
                    >
                      <Text
                        style={[
                          styles.seasonTabText,
                          selectedSeason === idx && styles.seasonTabTextActive,
                        ]}
                      >
                        Season {season.seasonNumber}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {/* Episode List */}
              {currentSeason?.episodes?.map((ep) => {
                const epMovieId = `${data._id}_S${currentSeason.seasonNumber}_E${ep.episodeNumber}`;
                const historyItem = historyMap.get(epMovieId);
                const progressPct = historyItem
                  ? getProgressPct(historyItem.progress, ep.duration)
                  : null;

                return (
                  <Pressable
                    key={ep.episodeNumber}
                    style={({ pressed }) => [
                      styles.episodeRow,
                      pressed && { backgroundColor: "rgba(255,255,255,0.06)" },
                    ]}
                    onPress={() => handleEpisodePlay(ep, currentSeason)}
                  >
                    <View style={styles.epNumCircle}>
                      <Text style={styles.epNum}>{ep.episodeNumber}</Text>
                    </View>
                    <View style={styles.epInfo}>
                      <Text style={styles.epTitle} numberOfLines={1}>
                        {ep.title || `Episode ${ep.episodeNumber}`}
                      </Text>
                      {ep.duration && (
                        <Text style={styles.epDuration}>{ep.duration}</Text>
                      )}
                      {progressPct !== null && progressPct > 0 && (
                        <View
                          style={{
                            height: 3,
                            backgroundColor: "rgba(255,255,255,0.2)",
                            marginTop: 6,
                            borderRadius: 2,
                            overflow: "hidden",
                          }}
                        >
                          <View
                            style={{
                              height: "100%",
                              width: `${progressPct}%`,
                              backgroundColor: "#E50914",
                            }}
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.epPlayBtn}>
                      {!data.isFree && (!user || user.plan === "free") ? (
                        <Feather
                          name="lock"
                          size={18}
                          color="rgba(255,255,255,0.5)"
                        />
                      ) : (
                        <MaterialIcons
                          name="play-arrow"
                          size={20}
                          color="#fff"
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ── More Like This ── */}
          {recommendations.length > 0 && (
            <View style={styles.recSection}>
              <View style={styles.recHeaderRow}>
                <Text style={styles.sectionHeader}>You May Also Like</Text>
              </View>

              <View style={styles.recGrid}>
                {recommendations.map((item) => (
                  <RecommendCard
                    key={item._id}
                    item={item}
                    type={resolvedType}
                    onPress={handleRecPress}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onHide={hideToast}
      />
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        title={data.title}
        itemId={id}
        type={resolvedType}
      />

      {/* ── Trailer Modal ── */}
      <Modal
        visible={trailerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTrailerModalVisible(false)}
        supportedOrientations={['portrait', 'landscape']}
      >
        <View style={styles.trailerModalOverlay}>
          <TouchableOpacity
            style={styles.trailerModalCloseArea}
            activeOpacity={1}
            onPress={() => setTrailerModalVisible(false)}
          />
          <View style={styles.trailerModalContainer}>
            <View style={styles.trailerModalHeader}>
              <Text style={styles.trailerModalTitle}>Trailer: {data.title}</Text>
              <TouchableOpacity onPress={() => setTrailerModalVisible(false)} style={styles.trailerModalCloseBtn}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.trailerModalContent}>
              {trailerModalVisible && data.trailerEmbedId && (
                <View style={{ width: '100%', height: W * (9/16), backgroundColor: '#000' }}>
                  <YoutubePlayer
                    height={W * (9/16)}
                    width={W}
                    play={true}
                    forceAndroidAutoplay={true}
                    videoId={data.trailerEmbedId}
                    webViewStyle={{ opacity: 0.99 }}
                    webViewProps={{
                      androidLayerType: "hardware",
                    }}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};



const CARD_W = (W - 40 - 16) / 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },
  scroll: { flex: 1 },
  centered: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Sticky Header ──
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#937879",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  stickyTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Code",
    maxWidth: "65%",
    textAlign: "center",
  },
  fixedBackBtn: {
    position: "absolute",
    left: 20,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Info ──
  infoSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginTop: -2,
  },
  title: {
    color: "#fff",
    fontSize: 29,
    fontFamily: "Code",
    lineHeight: 32,
    marginBottom: 10,
  },

  // ── Meta ──
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 18,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaBadgeText: {
    color: "#ccc",
    fontSize: 11,
    fontFamily: "TT",
  },

  // ── Action buttons ──
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  watchBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ffffffff",
    paddingVertical: 11,
    borderRadius: 12,
  },
  watchBtnPressed: { backgroundColor: "#857b7bff" },
  watchBtnText: {
    color: "#000000ff",
    fontSize: 15,
    fontFamily: "Coolvetica",
    letterSpacing: 0.3,
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: {
    borderColor: "rgba(229,9,20,0.5)",
    backgroundColor: "rgba(229,9,20,0.1)",
  },

  // ── Trailer Button ──
  trailerBtn: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trailerPlayCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailerLabel: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'TT Medium',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  trailerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  trailerModalCloseArea: {
    ...StyleSheet.absoluteFillObject,
  },
  trailerModalContainer: {
    width: '100%',
    backgroundColor: '#000',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  trailerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
  },
  trailerModalTitle: {
    color: '#fff',
    fontFamily: 'TT Medium',
    fontSize: 14,
  },
  trailerModalCloseBtn: {
    padding: 4,
  },
  trailerModalContent: {
    width: '100%',
    backgroundColor: '#000',
  },

  // ── Description ──
  description: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontFamily: "TT Medium",
    lineHeight: 22,
    marginBottom: 20,
  },

  // ── Cast ──
  castSection: {
    marginBottom: 24,
  },
  castScroll: {
    gap: 12,
    paddingRight: 4,
  },
  castCard: {
    alignItems: 'center',
    width: 72,
  },
  castAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 6,
    backgroundColor: '#1e1e1e',
  },
  castAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  castName: {
    color: '#ccc',
    fontSize: 11,
    fontFamily: 'TT',
    textAlign: 'center',
    lineHeight: 15,
  },

  // ── Genres ──
  genreRow: { marginBottom: 16 },
  genreChip: {
    borderRadius: 20,
    marginRight: 8,
  },
  genreChipText: { color: "#ddd", fontSize: 12, fontFamily: "TT" },

  // ── Section header ──
  sectionHeader: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Coolvetica",
    marginBottom: 14,
  },

  // ── Season tabs ──
  seasonsSection: { marginBottom: 24 },
  seasonTabRow: { marginBottom: 12 },
  seasonTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginRight: 8,
  },
  seasonTabActive: {
    backgroundColor: "#E50914",
    borderColor: "#E50914",
  },
  seasonTabText: { color: "#aaa", fontSize: 13, fontFamily: "TT" },
  seasonTabTextActive: { color: "#fff", fontFamily: "TT Medium" },

  // ── Episode row ──
  episodeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  epNumCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  epNum: { color: "#aaa", fontSize: 12, fontFamily: "TT Medium" },
  epInfo: { flex: 1, marginRight: 8 },
  epTitle: {
    color: "#eee",
    fontSize: 14,
    fontFamily: "TT Medium",
    marginBottom: 2,
  },
  epDuration: { color: "#777", fontSize: 11, fontFamily: "TT" },
  epPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(229,9,20,0.2)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Recommendations ──
  recSection: { marginTop: 8 },
  recHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  recAlgoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(229,9,20,0.1)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  recAlgoText: { color: "#E50914", fontSize: 10, fontFamily: "TT Medium" },
  recGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recCard: {
    width: CARD_W,
    height: CARD_W * 1.5,
    borderRadius: 7,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  recPoster: {
    ...StyleSheet.absoluteFillObject,
  },
  recMeta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
  },
  recTitle: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "TT Medium",
    marginBottom: 2,
    lineHeight: 14,
  },
  recRating: { color: "#FFD700", fontSize: 10, fontFamily: "TT" },
  recSeriesBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(229,9,20,0.85)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recSeriesBadgeText: { color: "#fff", fontSize: 9, fontFamily: "TT Medium" },
});

export default DetailsScreen;

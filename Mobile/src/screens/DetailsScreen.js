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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Feather from "@expo/vector-icons/Feather";
import client from "../api/client";
import { useWatchlist } from "../context/WatchlistContext";

const { width: W, height: H } = Dimensions.get("window");
const HERO_H = H * 0.32;

// ── Recommendation algorithm ──────────────────────────────────────────────────
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
  const yearDiff = Math.abs((target.year || 2020) - (candidate.year || 2020));
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
    {icon && <MaterialIcons name={icon} size={12} color="#aaa" style={{ marginRight: 3 }} />}
    <Text style={styles.metaBadgeText}>{label}</Text>
  </View>
);

const GenreChip = ({ label }) => (
  <View style={styles.genreChip}>
    <Text style={styles.genreChipText}>{label}</Text>
  </View>
);

const RecommendCard = ({ item, type, onPress }) => (
  <TouchableOpacity style={styles.recCard} onPress={onPress} activeOpacity={0.8}>
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
      <Text style={styles.recTitle} numberOfLines={2}>{item.title}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <MaterialIcons name="star" size={10} color="#FFD700" />
        <Text style={styles.recRating}>{item.rating || "—"}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

// ── Main Component ────────────────────────────────────────────────────────────
const DetailsScreen = ({ route, navigation }) => {
  const { id, type } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [resolvedType, setResolvedType] = useState(type);
  const { watchlist, isInWatchlist, toggleWatchlist } = useWatchlist();
  const [selectedSeason, setSelectedSeason] = useState(0);
  const scrollRef = useRef(null);

  const [fontsLoaded] = useFonts({
    "Coolvetica": require("../../assets/fonts/Coolvetica-Rg.otf"),
    "Code": require("../../assets/fonts/CODE-Bold.otf"),
    "TT": require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
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
      let endpoint = currentType === "series" ? `/series/${id}` : `/movies/${id}`;
      let detailRes;

      try {
        detailRes = await client.get(endpoint);
      } catch (err) {
        // If 404, try the other collection (fallback for mis-typed items)
        if (err.response?.status === 404) {
          const otherType = currentType === "series" ? "movie" : "series";
          const otherEndpoint = otherType === "series" ? `/series/${id}` : `/movies/${id}`;
          console.log(`[Details] 404 on ${endpoint}, trying fallback: ${otherEndpoint}`);
          detailRes = await client.get(otherEndpoint);
          currentType = otherType; // Update type if fallback succeeds
        } else {
          throw err;
        }
      }

      const detail = currentType === "series" ? detailRes.data.series : detailRes.data.movie;
      if (!detail) throw new Error("Item data is empty");

      setData(detail);
      setResolvedType(currentType);

      // Fetch recommendations based on the resolved type
      const listRes = await client.get(currentType === "series" ? "/series" : "/movies");
      const allItems = currentType === "series"
        ? (listRes.data.series || listRes.data || [])
        : (listRes.data.movies || listRes.data || []);

      setRecommendations(getRecommendations(detail, allItems, 9));
    } catch (e) {
      console.error("DetailsScreen fetch error:", e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };


  const handleWatch = useCallback(() => {
    if (resolvedType === "movie" || !data.seasons) {
      navigation.navigate("Player", {
        title: data.title,
        chatId: data.telegram?.chatId,
        messageId: data.telegram?.messageId,
      });
    } else {
      const ep = data.seasons?.[selectedSeason]?.episodes?.[0];
      if (ep) {
        navigation.navigate("Player", {
          title: `${data.title} · S${data.seasons[selectedSeason].seasonNumber}E${ep.episodeNumber}`,
          chatId: ep.telegramChatId,
          messageId: ep.telegramMessageId,
        });
      }
    }
  }, [data, resolvedType, selectedSeason, navigation]);

  const handleEpisodePlay = useCallback(
    (ep, season) => {
      navigation.navigate("Player", {
        title: `${data.title} · S${season.seasonNumber}E${ep.episodeNumber} – ${ep.title}`,
        chatId: ep.telegramChatId,
        messageId: ep.telegramMessageId,
      });
    },
    [data, navigation]
  );

  const handleRecPress = useCallback(
    (item) => {
      navigation.push("Details", { id: item._id, type });
    },
    [navigation, type]
  );

  // ── Loading / Error ─────────────────────────────────────────────────────────
  if (loading || !data) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  const currentSeason = data.seasons?.[selectedSeason];
  const totalEpisodes = data.seasons?.reduce((s, se) => s + (se.episodes?.length || 0), 0) || 0;
  const isActuallySeries = resolvedType === "series" && data.seasons?.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
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

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Info Section ── */}
        <View style={styles.infoSection}>
          {/* Title */}
          <Text style={styles.title}>{data.title}</Text>

          {/* Genres */}
          {data.genres?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreRow}>
              {data.genres.map((g, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.genreChipText}>{g}</Text>
                  {i < data.genres.length - 1 && (
                    <Text style={{ color: 'rgba(255,255,255,0.4)', marginHorizontal: 8 }}>•</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Meta Row */}
          <View style={styles.metaRow}>
            {data.year && <MetaBadge label={String(data.year)} />}
            {data.quality && <MetaBadge label={data.quality} icon="hd" />}
            {data.rating ? (
              <MetaBadge label={`★ ${data.rating}`} />
            ) : null}
            {data.duration && <MetaBadge label={data.duration} icon="schedule" />}
            {isActuallySeries && (
              <MetaBadge
                label={`${data.seasons?.length || 0} Season${data.seasons?.length !== 1 ? "s" : ""} · ${totalEpisodes} Ep`}
              />
            )}
            {data.hasAmharicDub && (
              <View style={[styles.metaBadge, { borderColor: "#E50914" }]}>
                <Text style={[styles.metaBadgeText, { color: "#E50914" }]}>በትርጉም</Text>
              </View>
            )}

          </View>



          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.watchBtn, pressed && styles.watchBtnPressed]}
              onPress={handleWatch}
            >
              <MaterialIcons name="play-arrow" size={22} color="#000000ff" />
              <Text style={styles.watchBtnText}>Watch Now</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.iconBtn,
                isInWatchlist(id) && styles.iconBtnActive,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => toggleWatchlist(id, resolvedType)}
            >
              <MaterialIcons
                name={isInWatchlist(id) ? "bookmark" : "bookmark-border"}
                size={22}
                color={isInWatchlist(id) ? "#E50914" : "#fff"}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            >
              <Feather name="share-2" size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Description */}
          <Text style={styles.description}>{data.description}</Text>

          {/* ── Series: Season Tabs + Episodes ── */}
          {type === "series" && data.seasons?.length > 0 && (
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
              {currentSeason?.episodes?.map((ep, i) => (
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
                  </View>
                  <View style={styles.epPlayBtn}>
                    <MaterialIcons name="play-arrow" size={20} color="#fff" />
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* ── More Like This ── */}
          {recommendations.length > 0 && (
            <View style={styles.recSection}>
              <View style={styles.recHeaderRow}>
                <Text style={styles.sectionHeader}>More Like This</Text>
              </View>

              <View style={styles.recGrid}>
                {recommendations.map((item) => (
                  <RecommendCard
                    key={item._id}
                    item={item}
                    type={resolvedType}
                    onPress={() => handleRecPress(item)}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD_W = (W - 48) / 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },
  scroll: { flex: 1 },
  centered: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Hero ──
  backBtn: {
    position: "absolute",
    top: 50,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
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
    paddingVertical: 13,
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

  // ── Description ──
  description: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontFamily: "TT Medium",
    lineHeight: 22,
    marginBottom: 20,
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
  epTitle: { color: "#eee", fontSize: 14, fontFamily: "TT Medium", marginBottom: 2 },
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
    borderRadius: 10,
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

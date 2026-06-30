import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  FlatList,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
} from "react-native";
import { useFonts } from "expo-font";
import { useMovies } from "../context/MovieContext";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Rect,
  Stop,
} from "react-native-svg";
import client from "../api/client";

const { width, height } = Dimensions.get("window");

const SkeletonLoader = () => {
  const pulseAnim = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000000ff", paddingTop: 40 }}>
      <Animated.View style={{ opacity: pulseAnim }}>
        {/* Hero Skeleton */}
        <View style={{ width: "100%", height: height * 0.6, backgroundColor: "#1c1c1c", marginBottom: 30 }} />

        {/* Section Title 1 */}
        <View style={{ width: 140, height: 24, backgroundColor: "#1c1c1c", borderRadius: 4, marginLeft: 20, marginBottom: 15 }} />
        {/* Horizontal Scroll 1 */}
        <View style={{ flexDirection: "row", paddingLeft: 20, marginBottom: 30 }}>
          <View style={{ width: width * 0.28, height: width * 0.42, backgroundColor: "#1c1c1c", borderRadius: 12, marginRight: 12 }} />
          <View style={{ width: width * 0.28, height: width * 0.42, backgroundColor: "#1c1c1c", borderRadius: 12, marginRight: 12 }} />
          <View style={{ width: width * 0.28, height: width * 0.42, backgroundColor: "#1c1c1c", borderRadius: 12, marginRight: 12 }} />
          <View style={{ width: width * 0.28, height: width * 0.42, backgroundColor: "#1c1c1c", borderRadius: 12, marginRight: 12 }} />
        </View>

        {/* Section Title 2 */}
        <View style={{ width: 180, height: 24, backgroundColor: "#1c1c1c", borderRadius: 4, marginLeft: 20, marginBottom: 15 }} />
        {/* Horizontal Scroll 2 */}
        <View style={{ flexDirection: "row", paddingLeft: 20 }}>
          <View style={{ width: width * 0.28, height: width * 0.42, backgroundColor: "#1c1c1c", borderRadius: 12, marginRight: 12 }} />
          <View style={{ width: width * 0.28, height: width * 0.42, backgroundColor: "#1c1c1c", borderRadius: 12, marginRight: 12 }} />
          <View style={{ width: width * 0.28, height: width * 0.42, backgroundColor: "#1c1c1c", borderRadius: 12, marginRight: 12 }} />
          <View style={{ width: width * 0.28, height: width * 0.42, backgroundColor: "#1c1c1c", borderRadius: 12, marginRight: 12 }} />
        </View>
      </Animated.View>
    </View>
  );
};

// ── Memoized card — defined OUTSIDE HomeScreen so it never remounts on parent re-render
const ContentCard = React.memo(({ item, hideNewBadge, variant, onPress }) => {
  const isLandscape = variant === "landscape";
  const imageUri = isLandscape
    ? item.mylist || item.backdrop || item.poster
    : item.poster;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isLandscape && styles.cardLandscape,
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
    >
      <View style={{ borderRadius: 12, overflow: "hidden" }}>
        <Image
          source={{ uri: imageUri }}
          style={[styles.poster, isLandscape && styles.posterLandscape]}
        />
      </View>
      {(item.isNew || item.isNewSeason || item.isNewEpisode) && !hideNewBadge && (
        <View style={styles.cardOverlay}>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>
              {item.isNewEpisode ? "NEW EP." : item.isNewSeason ? "NEW S." : "NEW"}
            </Text>
          </View>
        </View>
      )}
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
    </Pressable>
  );
});

// ── Memoized section row — defined OUTSIDE HomeScreen
const Section = React.memo(({ title, data, variant = "portrait", icon, onItemPress }) => {
  if (!data || data.length === 0) return null;
  const isNewRelease = title === "New Releases";

  const renderItem = useCallback(
    ({ item }) => (
      <ContentCard
        item={item}
        hideNewBadge={isNewRelease}
        variant={variant}
        onPress={() => onItemPress(item)}
      />
    ),
    [isNewRelease, variant, onItemPress]
  );

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      </View>
      <FlatList
        horizontal
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        removeClippedSubviews
        maxToRenderPerBatch={5}
        initialNumToRender={5}
        windowSize={3}
        getItemLayout={variant === "landscape"
          ? (_, index) => ({ length: 220, offset: 220 * index, index })
          : (_, index) => ({ length: 110, offset: 110 * index, index })
        }
      />
    </View>
  );
});
const HomeScreen = () => {
  const [fontsLoaded] = useFonts({
    "Broche-Cut": require("../../assets/fonts/Broche-Cut.ttf"),
    Coolvetica: require("../../assets/fonts/Coolvetica-Rg.otf"),
    Code: require("../../assets/fonts/CODE-Bold.otf"),
    TT: require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
  });

  const { movies, series, featuredItems, loading, error } = useMovies();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [heroItem, setHeroItem] = useState(null);

  const filterGenres = [
    "All",
    "Movies",
    "Series",
    "Free",
    "Action",
    "Comedy",
    "Drama",
    "Horror",
    "Sci-Fi",
    "Animation",
  ];
  const displayGenres = [
    "Action",
    "Comedy",
    "Drama",
    "Horror",
    "Sci-Fi",
    "Animation",
  ];

  // Shuffle genre rows once per session (changes every time user opens app)
  // New Releases and Trending are always pinned above these rows
  const shuffledGenres = useMemo(() => {
    const arr = [...displayGenres];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []); // empty deps = computed once per component mount (i.e. per session)

  // Pick a random hero item once when featuredItems are loaded
  useMemo(() => {
    if (featuredItems.length > 0 && !heroItem) {
      const randomIndex = Math.floor(Math.random() * featuredItems.length);
      setHeroItem(featuredItems[randomIndex]);
    }
  }, [featuredItems]);

  const filteredMovies = useMemo(() => {
    let list = movies;
    if (selectedGenre === "Series") return [];
    if (selectedGenre === "Free") list = list.filter((m) => m.isFree);
    else if (selectedGenre !== "All" && selectedGenre !== "Movies") {
      list = list.filter((m) =>
        m.genres?.some((g) => g.toLowerCase() === selectedGenre.toLowerCase()),
      );
    }
    return list;
  }, [movies, selectedGenre]);

  const filteredSeries = useMemo(() => {
    let list = series;
    if (selectedGenre === "Movies") return [];
    if (selectedGenre === "Free") list = list.filter((s) => s.isFree);
    else if (selectedGenre !== "All" && selectedGenre !== "Series") {
      list = list.filter((s) =>
        s.genres?.some((g) => g.toLowerCase() === selectedGenre.toLowerCase()),
      );
    }
    return list;
  }, [series, selectedGenre]);

  // ── Page-Level Deduplication ────────────────────────────────────────────────
  // Builds all section data upfront with a global "seen" Set.
  // New Releases is seeded first, Trending second, then each genre row
  // only receives items whose _id hasn't appeared in any earlier row.
  const deduplicatedSections = useMemo(() => {
    const seen = new Set();
    const allFiltered = [...filteredMovies, ...filteredSeries];

    // Helper: filter out seen items, cap at ROW_LIMIT, then register them
    const ROW_LIMIT = 10;
    const dedup = (items) => {
      const unique = items.filter((item) => !seen.has(item._id)).slice(0, ROW_LIMIT);
      unique.forEach((item) => seen.add(item._id));
      return unique;
    };

    // 1. New Releases (always top)
    const newReleases = dedup(
      allFiltered
        .filter((item) => item.isNew || item.isNewSeason || item.isNewEpisode)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    );

    // 2. Trending (always second)
    const trending = dedup(
      [...allFiltered].sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0))
    );

    // 3. Genre rows (shuffled order, each row deduplicated against previous rows)
    const genreRows = shuffledGenres.map((genre) => {
      const genreLower = genre.toLowerCase();
      let candidates;
      if (selectedGenre === "Series") {
        candidates = filteredSeries.filter((s) =>
          s.genres?.some((g) => g.toLowerCase() === genreLower)
        );
      } else if (selectedGenre === "Free") {
        candidates = allFiltered.filter((item) =>
          item.genres?.some((g) => g.toLowerCase() === genreLower)
        );
      } else {
        candidates = filteredMovies.filter((m) =>
          m.genres?.some((g) => g.toLowerCase() === genreLower)
        );
      }
      return { genre, data: dedup(candidates) };
    });

    return { newReleases, trending, genreRows };
  }, [filteredMovies, filteredSeries, shuffledGenres, selectedGenre]);

  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return <SkeletonLoader />;
  }

  // Navigate handler — stable reference so ContentCard never re-renders on parent updates
  const handleItemPress = useCallback(
    (item) => {
      navigation.navigate("Details", {
        id: item._id,
        type: item.seasons ? "series" : "movie",
      });
    },
    [navigation]
  );


  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero Section */}
        {heroItem && (
          <View style={styles.hero}>
            <Image
              source={{
                uri:
                  heroItem.featurePhone || heroItem.backdrop || heroItem.poster,
              }}
              style={styles.heroImage}
            />
            {/* Top Navigation Bar */}
            <View style={styles.topHeader}>
              <View style={styles.headerLeft}>
                <Image
                  source={require("../../assets/img/unnamed-removebg-preview.png")}
                  style={styles.logoImage}
                />
              </View>
            </View>

            {/* Cinematic Gradient Shadows */}
            <View style={StyleSheet.absoluteFill}>
              <Svg height="100%" width="100%">
                <Defs>
                  {/* Bottom Shadow */}
                  <SvgGradient id="gradBottom" x1="0" y1="0" x2="0" y2="1">
                    <Stop
                      offset="0"
                      stopColor="transparent"
                      stopOpacity="0.5"
                    />
                    <Stop offset="0.5" stopColor="black" stopOpacity="0.2" />
                    <Stop offset="1" stopColor="black" stopOpacity="1" />
                  </SvgGradient>
                  {/* Top Shadow */}
                  <SvgGradient id="gradTop" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="black" stopOpacity="0.7" />
                    <Stop
                      offset="0.3"
                      stopColor="transparent"
                      stopOpacity="0"
                    />
                  </SvgGradient>
                </Defs>
                {/* Apply Gradients */}
                <Rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="url(#gradTop)"
                />
                <Rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="url(#gradBottom)"
                />
              </Svg>
            </View>

            <View style={styles.heroOverlay}>
              <View
                style={[
                  styles.featuredBadge,
                  (heroItem.isNew || heroItem.isNewSeason || heroItem.isNewEpisode) && styles.newReleaseBadge,
                ]}
              >
                <Text style={styles.featuredText}>
                  {heroItem.isNewEpisode
                    ? "NEW EPISODE"
                    : heroItem.isNewSeason
                    ? "NEW SEASON"
                    : heroItem.isNew
                    ? "NEW RELEASE"
                    : " "}
                </Text>
              </View>
              <Text style={styles.heroTitle}>{heroItem.title}</Text>

              <View style={styles.heroMetaRow}>
                <Text style={styles.heroMetaText}>
                  {heroItem.year || "2024"}
                </Text>
                <View style={styles.metaDivider} />
                <View style={styles.qualityBadge}>
                  <Text style={styles.qualityText}>
                    {heroItem.quality || "HD"}
                  </Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.heroRating}>
                  <MaterialIcons name="star" size={14} color="#FFD700" />
                  <Text style={styles.heroMetaText}>
                    {heroItem.rating || "8.5"}
                  </Text>
                </View>
                <View style={styles.metaDivider} />
                <Text style={styles.heroMetaTergum}>{"በትርጉም"}</Text>
              </View>

              <Text style={styles.heroSubtitle}>
                {heroItem.genres?.join(" • ")}
              </Text>
              <View style={styles.heroActions}>
                <Pressable
                  onPress={async () => {
                    try {
                      if (!heroItem.isFree && (!user || user.plan === "free")) {
                        navigation.navigate("Plan");
                        return;
                      }

                      let currentType = heroItem.seasons ? "series" : "movie";
                      let endpoint =
                        currentType === "series"
                          ? `/series/${heroItem._id}`
                          : `/movies/${heroItem._id}`;
                      let res;
                      try {
                        res = await client.get(endpoint);
                      } catch (err) {
                        if (err.response?.status === 404) {
                          currentType =
                            currentType === "series" ? "movie" : "series";
                          endpoint =
                            currentType === "series"
                              ? `/series/${heroItem._id}`
                              : `/movies/${heroItem._id}`;
                          res = await client.get(endpoint);
                        } else {
                          throw err;
                        }
                      }

                      const data =
                        currentType === "series"
                          ? res.data.series
                          : res.data.movie;
                      if (currentType === "movie" || !data.seasons) {
                        navigation.navigate("Player", {
                          title: data.title,
                          chatId: data.telegram?.chatId,
                          messageId: data.telegram?.messageId,
                          movieId: String(data._id),
                        });
                      } else {
                        const ep = data.seasons?.[0]?.episodes?.[0];
                        if (ep) {
                          navigation.navigate("Player", {
                            title: `${data.title} · S${data.seasons[0].seasonNumber}E${ep.episodeNumber}`,
                            chatId: ep.telegramChatId,
                            messageId: ep.telegramMessageId,
                            seriesData: data,
                            seasonIndex: 0,
                            episodeIndex: 0,
                            movieId: `${data._id}_S${data.seasons[0].seasonNumber}_E${ep.episodeNumber}`,
                          });
                        }
                      }
                    } catch (e) {
                      console.error("Error fetching watch data", e);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.playBtn,
                    pressed && { backgroundColor: "#B20710" }, // Darker red on press
                  ]}
                >
                  <MaterialIcons name="play-arrow" size={20} color="#fff" />
                  <Text style={styles.playBtnText}>
                    {!heroItem.isFree && (!user || user.plan === "free")
                      ? "Upgrade to Watch"
                      : "Watch Now"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    navigation.navigate("Details", {
                      id: heroItem._id,
                      type: heroItem.seasons ? "series" : "movie",
                    })
                  }
                  style={({ pressed }) => [
                    styles.listBtn,
                    pressed && { backgroundColor: "rgba(255,255,255,0.4)" },
                  ]}
                >
                  <EvilIcons name="exclamation" size={20} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Genre Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.genreScroll}
          contentContainerStyle={styles.genreContent}
        >
          {filterGenres.map((genre) => (
            <Pressable
              key={genre}
              onPress={() => setSelectedGenre(genre)}
              style={({ pressed }) => [
                styles.genreChip,
                selectedGenre === genre && styles.genreChipActive,
                pressed && { backgroundColor: "rgba(255,255,255,0.2)" },
              ]}
            >
              <Text
                style={[
                  styles.genreText,
                  selectedGenre === genre && styles.genreTextActive,
                ]}
              >
                {genre}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Dynamic Genre Sections when 'Movies' or 'Series' or 'All' is selected */}
        {selectedGenre === "All" ||
          selectedGenre === "Movies" ||
          selectedGenre === "Series" ||
          selectedGenre === "Free" ? (
          <>
            <Section
              title="New Releases"
              data={deduplicatedSections.newReleases}
              onItemPress={handleItemPress}
            />

            {/* Consistently show a single Trending row based on the current tab */}
            <Section
              title={
                selectedGenre === "Movies"
                  ? "Trending Movies This Week"
                  : selectedGenre === "Series"
                    ? "Trending Series This Week"
                    : "Trending This Week"
              }
              variant="landscape"
              icon={
                <MaterialIcons name="trending-up" size={24} color="#E50914" />
              }
              data={deduplicatedSections.trending}
              onItemPress={handleItemPress}
            />

            {/* Render Genre Specific Sections — order shuffled each session, no duplicates */}
            {deduplicatedSections.genreRows.map(({ genre, data }) => (
              <Section
                key={genre}
                title={`${genre} ${selectedGenre === "Series" ? "Series" : selectedGenre === "Free" ? "Content" : "Movies"}`}
                data={data}
                onItemPress={handleItemPress}
              />
            ))}
          </>
        ) : (
          // Single filter mode (Action, Comedy, etc.)
          <>
            <Section title={`${selectedGenre} Movies`} data={filteredMovies} onItemPress={handleItemPress} />
            <Section title={`${selectedGenre} Series`} data={filteredSeries} onItemPress={handleItemPress} />
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080808" },
  centered: {
    flex: 1,
    backgroundColor: "#080808",
    justifyContent: "center",
    alignItems: "center",
  },

  // Hero Styles
  hero: {
    width: width,
    height: width * 1.4,
    backgroundColor: "#000",
  },
  topHeader: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 15,
    zIndex: 100,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  logoImage: {
    width: 36,
    height: 36,
    resizeMode: "contain",
  },
  homeHeaderText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "There",
    letterSpacing: 0.5,
  },
  avatarMini: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  homeProfilleText: {
    color: "#fff",
    fontFamily: "TT",
    fontSize: 12,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "100%",
    padding: 20,
    paddingBottom: 20,
    justifyContent: "flex-end",
  },
  featuredBadge: {
    backgroundColor: "rgba(0, 8, 8, 0)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
    borderWidth: 0,
    borderColor: "rgba(255,255,255,0)",
  },
  newReleaseBadge: {
    backgroundColor: "#E50914",
    borderColor: "#E50914",
  },
  featuredText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Broche-Cut",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 32,
    fontFamily: "Code",
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  heroMetaText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Coolvetica",
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  heroMetaTergum: { color: "#fff", paddingHorizontal: 6 },
  qualityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(33, 226, 65, 0.6)",
  },
  qualityText: { color: "#1af03d", fontSize: 10, fontWeight: "800" },
  heroRating: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "Coolvetica",
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    gap: 12,
  },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E50914",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  playBtnText: {
    color: "#fff",
    fontSize: 15,
    letterSpacing: 0.6,
    fontFamily: "Coolvetica",
  },
  listBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
  },

  // Genre Styles
  genreScroll: { marginTop: 5, marginBottom: 5 },
  genreContent: { paddingHorizontal: 15, gap: 10, paddingVertical: 10 },
  genreChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  genreChipActive: {
    backgroundColor: "#E50914",
    borderColor: "#E50914",
  },
  genreText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontFamily: "Coolvetica",
  },
  genreTextActive: { color: "#fff" },

  // Section Styles
  sectionContainer: { marginTop: 15, marginBottom: 10 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    letterSpacing: -0.2,
    fontFamily: "Coolvetica",
  },
  seeAllText: { color: "#E50914", fontSize: 13, fontWeight: "600" },
  list: { paddingLeft: 15 },

  // Card Styles
  card: { width: 130, marginRight: 12 },
  cardLandscape: { width: 240 },
  poster: { width: 130, height: 190, borderRadius: 12 },
  posterLandscape: { width: 240, height: 135 },
  cardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    justifyContent: "flex-start",
  },
  newBadge: {
    backgroundColor: "#E50914",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "TT Medium"
  },
  pressedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 10,
  },
  title: {
    color: "rgba(255,255,255,1)",
    fontSize: 13,
    marginTop: 7,
    fontFamily: "TT",
    textAlign: "left",
  },
});

export default HomeScreen;

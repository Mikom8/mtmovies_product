import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  Pressable,
  FlatList,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Animated,
  Keyboard,
} from "react-native";
import { useFonts } from "expo-font";
import { useMovies } from "../context/MovieContext";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import NetworkErrorView from "../components/NetworkErrorView";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const SPACING = 12;
const CARD_W = (width - SPACING * (COLUMN_COUNT + 1)) / COLUMN_COUNT;
const CARD_H = CARD_W * 1.5;

// Animated tab indicator
const TABS = ["All", "Movies", "TV Shows"];

const SearchScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    "Broche-Cut": require("../../assets/fonts/Broche-Cut.ttf"),
    Coolvetica: require("../../assets/fonts/Coolvetica-Rg.otf"),
    Code: require("../../assets/fonts/CODE-Bold.otf"),
    TT: require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
    "TT Medium": require("../../assets/fonts/TT-Chocolates-Trial-Medium.otf"),
  });

  const { movies, series, loading, error, refresh } = useMovies();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const tabIndicatorX = useRef(new Animated.Value(0)).current;
  const TAB_W = (width - 32) / TABS.length;

  const switchTab = (tab) => {
    const idx = TABS.indexOf(tab);
    Animated.spring(tabIndicatorX, {
      toValue: idx * TAB_W,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
    setActiveTab(tab);
  };

  // Popular Searches — no limit
  const popularItems = useMemo(() => {
    if (loading || (!movies.length && !series.length)) return [];
    return [...movies, ...series].sort(
      (a, b) => (b.stats?.views || 0) - (a.stats?.views || 0)
    );
  }, [movies, series, loading]);

  // Real-time Search across everything — no limit
  const allResults = useMemo(() => {
    if (!query.trim()) return { all: [], movies: [], series: [] };
    const q = query.toLowerCase().trim();
    const match = (item) => {
      const matchTitle = item.title && item.title.toLowerCase().includes(q);
      const matchDesc = item.description && item.description.toLowerCase().includes(q);
      const matchGenres = item.genres && item.genres.some((g) => g.toLowerCase().includes(q));
      const matchTags = item.tags && item.tags.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchGenres || matchTags;
    };
    const matchedMovies = movies.filter(match);
    const matchedSeries = series.filter(match);
    return {
      all: [...matchedMovies, ...matchedSeries],
      movies: matchedMovies,
      series: matchedSeries,
    };
  }, [query, movies, series]);

  const searchResults = useMemo(() => {
    if (activeTab === "Movies") return allResults.movies;
    if (activeTab === "TV Shows") return allResults.series;
    return allResults.all;
  }, [activeTab, allResults]);

  if (!fontsLoaded) return null;

  const handleClear = () => {
    setQuery("");
    setActiveTab("All");
    Keyboard.dismiss();
  };

  const renderPopularItem = ({ item }) => {
    const isSeries = !!item.seasons;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.popularRow,
          pressed && { backgroundColor: "rgba(255,255,255,0.05)" },
        ]}
        onPress={() =>
          navigation.navigate("Details", {
            id: item._id,
            type: isSeries ? "series" : "movie",
          })
        }
      >
        <Image
          source={{ uri: item.mylist || item.backdrop || item.poster }}
          style={styles.popularBackdrop}
          resizeMode="cover"
        />
        <View style={styles.popularInfo}>
          <Text style={styles.popularTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.popularMeta}>
            {item.year ? item.year : "2024"}
            {isSeries ? " · Series" : " · Movie"}
          </Text>
        </View>
        <View style={styles.popularPlayBtn}>
          <MaterialIcons name="play-arrow" size={22} color="#fff" />
        </View>
      </Pressable>
    );
  };

  const renderResultItem = ({ item }) => {
    const isSeries = !!item.seasons;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        ]}
        onPress={() =>
          navigation.navigate("Details", {
            id: item._id,
            type: isSeries ? "series" : "movie",
          })
        }
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.poster }}
            style={styles.poster}
            resizeMode="cover"
          />
          {isSeries && (
            <View style={styles.seriesBadge}>
              <Text style={styles.seriesText}>SERIES</Text>
            </View>
          )}
        </View>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Feather name="search" size={36} color="rgba(255,255,255,0.4)" />
      </View>
      <Text style={styles.emptyTitle}>No results found</Text>
      <Text style={styles.emptySubtitle}>
        We couldn't find any {activeTab === "Movies" ? "movies" : activeTab === "TV Shows" ? "TV shows" : "results"} for "{query}".
      </Text>
    </View>
  );

  if (error) {
    return (
      <View style={styles.container}>
        <NetworkErrorView onRetry={refresh} isRetrying={loading} />
      </View>
    );
  }

  const isSearching = !!query.trim();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.inputWrapper}>
          <Feather
            name="search"
            size={20}
            color="rgba(255,255,255,0.5)"
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search movies, TV shows, genres..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={query}
            onChangeText={setQuery}
            style={styles.input}
            keyboardAppearance="dark"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {!!query && (
            <Pressable onPress={handleClear} style={styles.clearBtn}>
              <Feather name="x" size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )}
        </View>

        {/* Tabs - only shown when searching */}
        {isSearching && (
          <View style={styles.tabsContainer}>
            {TABS.map((tab) => (
              <Pressable
                key={tab}
                style={styles.tabBtn}
                onPress={() => switchTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.tabTextActive,
                  ]}
                >
                  {tab}
                  {tab === "Movies" && allResults.movies.length > 0 && (
                    <Text style={styles.tabCount}> {allResults.movies.length}</Text>
                  )}
                  {tab === "TV Shows" && allResults.series.length > 0 && (
                    <Text style={styles.tabCount}> {allResults.series.length}</Text>
                  )}
                  {tab === "All" && allResults.all.length > 0 && (
                    <Text style={styles.tabCount}> {allResults.all.length}</Text>
                  )}
                </Text>
              </Pressable>
            ))}
            <Animated.View
              style={[
                styles.tabIndicator,
                { width: TAB_W, transform: [{ translateX: tabIndicatorX }] },
              ]}
            />
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : !isSearching ? (
        // Popular Searches view
        <View style={{ flex: 1 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Searches</Text>
          </View>
          <FlatList
            data={popularItems}
            renderItem={renderPopularItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.popularList}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
          />
        </View>
      ) : searchResults.length === 0 ? (
        renderEmptyState()
      ) : (
        // Grid search results with tabs
        <View style={{ flex: 1 }}>
          <FlatList
            data={searchResults}
            renderItem={renderResultItem}
            keyExtractor={(item) => item._id}
            numColumns={COLUMN_COUNT}
            key={activeTab} // force re-render on tab switch to reset numColumns
            contentContainerStyle={styles.listContainer}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  searchBarContainer: {
    paddingTop: 60,
    paddingBottom: 0,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontFamily: "TT",
  },
  clearBtn: {
    padding: 6,
  },
  tabsContainer: {
    flexDirection: "row",
    position: "relative",
    marginBottom: 0,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  tabText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    fontFamily: "TT Medium",
  },
  tabTextActive: {
    color: "#fff",
  },
  tabCount: {
    color: "#E50914",
    fontSize: 12,
    fontFamily: "Code",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    backgroundColor: "#E50914",
    borderRadius: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Coolvetica",
    letterSpacing: 0.5,
  },
  popularList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  popularRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  popularBackdrop: {
    width: 110,
    height: 62,
    borderRadius: 6,
    backgroundColor: "#1a1a1a",
  },
  popularInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  popularTitle: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "TT Medium",
  },
  popularMeta: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontFamily: "TT",
    marginTop: 4,
  },
  popularPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  listContainer: {
    padding: SPACING,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: "flex-start",
    gap: SPACING,
    marginBottom: 16,
  },
  card: {
    width: CARD_W,
  },
  imageContainer: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  poster: {
    width: "100%",
    height: "100%",
  },
  seriesBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "#E50914",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  seriesText: {
    color: "#fff",
    fontSize: 8,
    fontFamily: "Code",
    letterSpacing: 0.5,
  },
  itemTitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontFamily: "TT Medium",
    marginTop: 6,
    paddingHorizontal: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Coolvetica",
    marginBottom: 10,
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    fontSize: 14,
    fontFamily: "TT",
    lineHeight: 20,
  },
});

export default SearchScreen;

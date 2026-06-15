import React, { useState, useMemo } from "react";
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
} from "react-native";
import { useFonts } from "expo-font";
import { useMovies } from "../context/MovieContext";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';
import client from "../api/client";

const { width } = Dimensions.get("window");

const HomeScreen = () => {
  const [fontsLoaded] = useFonts({
    "Broche-Cut": require("../../assets/fonts/Broche-Cut.ttf"),
    "Coolvetica": require("../../assets/fonts/Coolvetica-Rg.otf"),
    "Code": require("../../assets/fonts/CODE-Bold.otf"),
    "TT": require("../../assets/fonts/TT-Chocolates-Trial-Light.otf")
  });

  const { movies, series, featuredItems, loading, error } = useMovies();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [heroItem, setHeroItem] = useState(null);

  const filterGenres = ["All", "Movies", "Series", "Free", "Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Animation"];
  const displayGenres = ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Animation"];

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
    if (selectedGenre === "Free") list = list.filter(m => m.isFree);
    else if (selectedGenre !== "All" && selectedGenre !== "Movies") {
      list = list.filter(m => m.genres?.some(g => g.toLowerCase() === selectedGenre.toLowerCase()));
    }
    return list;
  }, [movies, selectedGenre]);

  const filteredSeries = useMemo(() => {
    let list = series;
    if (selectedGenre === "Movies") return [];
    if (selectedGenre === "Free") list = list.filter(s => s.isFree);
    else if (selectedGenre !== "All" && selectedGenre !== "Series") {
      list = list.filter(s => s.genres?.some(g => g.toLowerCase() === selectedGenre.toLowerCase()));
    }
    return list;
  }, [series, selectedGenre]);

  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  const renderContentItem = ({ item, hideNewBadge = false, variant = "portrait" }) => {
    const isLandscape = variant === "landscape";
    const imageUri = isLandscape ? (item.mylist || item.backdrop || item.poster) : item.poster;

    return (
      <Pressable
        style={({ pressed }) => [styles.card, isLandscape && styles.cardLandscape, pressed && { opacity: 0.85 }]}
        onPress={() =>
          navigation.navigate("Details", {
            id: item._id,
            type: item.seasons ? "series" : "movie",
          })
        }
      >
        <View style={{ borderRadius: 12, overflow: 'hidden' }}>
          <Image source={{ uri: imageUri }} style={[styles.poster, isLandscape && styles.posterLandscape]} />
        </View>
        {item.isNew && !hideNewBadge && (
          <View style={styles.cardOverlay}>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          </View>
        )}
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
      </Pressable>
    );
  };


  const Section = ({ title, data, variant = "portrait", icon }) => {
    if (!data || data.length === 0) return null;
    const isNewRelease = title === "New Releases";
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {icon}
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        </View>
        <FlatList
          horizontal
          data={data}
          renderItem={({ item }) => renderContentItem({ item, hideNewBadge: isNewRelease, variant })}
          keyExtractor={(item) => item._id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero Section */}
        {heroItem && (
          <View style={styles.hero}>
            <Image
              source={{
                uri: heroItem.featurePhone || heroItem.backdrop || heroItem.poster,
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
                    <Stop offset="0" stopColor="transparent" stopOpacity="0.5" />
                    <Stop offset="0.5" stopColor="black" stopOpacity="0.2" />
                    <Stop offset="1" stopColor="black" stopOpacity="1" />
                  </SvgGradient>
                  {/* Top Shadow */}
                  <SvgGradient id="gradTop" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="black" stopOpacity="0.7" />
                    <Stop offset="0.3" stopColor="transparent" stopOpacity="0" />
                  </SvgGradient>
                </Defs>
                {/* Apply Gradients */}
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#gradTop)" />
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#gradBottom)" />
              </Svg>
            </View>

            <View style={styles.heroOverlay}>
              <View style={[styles.featuredBadge, heroItem.isNew && styles.newReleaseBadge]}>
                <Text style={styles.featuredText}>
                  {heroItem.isNew ? "NEW RELEASE" : " "}
                </Text>
              </View>
              <Text style={styles.heroTitle}>{heroItem.title}</Text>

              <View style={styles.heroMetaRow}>
                <Text style={styles.heroMetaText}>{heroItem.year || "2024"}</Text>
                <View style={styles.metaDivider} />
                <View style={styles.qualityBadge}>
                  <Text style={styles.qualityText}>{heroItem.quality || "HD"}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.heroRating}>
                  <MaterialIcons name="star" size={14} color="#FFD700" />
                  <Text style={styles.heroMetaText}>{heroItem.rating || "8.5"}</Text>
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
                      let currentType = heroItem.seasons ? "series" : "movie";
                      let endpoint = currentType === "series" ? `/series/${heroItem._id}` : `/movies/${heroItem._id}`;
                      let res;
                      try {
                        res = await client.get(endpoint);
                      } catch (err) {
                        if (err.response?.status === 404) {
                          currentType = currentType === "series" ? "movie" : "series";
                          endpoint = currentType === "series" ? `/series/${heroItem._id}` : `/movies/${heroItem._id}`;
                          res = await client.get(endpoint);
                        } else {
                          throw err;
                        }
                      }

                      const data = currentType === "series" ? res.data.series : res.data.movie;
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
                    pressed && { backgroundColor: '#B20710' } // Darker red on press
                  ]}
                >
                  <MaterialIcons name="play-arrow" size={20} color="#fff" />
                  <Text style={styles.playBtnText}>Watch Now</Text>
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
                    pressed && { backgroundColor: 'rgba(255,255,255,0.4)' }
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
          {filterGenres.map(genre => (
            <Pressable
              key={genre}
              onPress={() => setSelectedGenre(genre)}
              style={({ pressed }) => [
                styles.genreChip,
                selectedGenre === genre && styles.genreChipActive,
                pressed && { backgroundColor: 'rgba(255,255,255,0.2)' }
              ]}
            >
              <Text style={[styles.genreText, selectedGenre === genre && styles.genreTextActive]}>
                {genre}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Dynamic Genre Sections when 'Movies' or 'Series' or 'All' is selected */}
        {(selectedGenre === "All" || selectedGenre === "Movies" || selectedGenre === "Series" || selectedGenre === "Free") ? (
          <>
            <Section
              title="New Releases"
              data={
                [...filteredMovies, ...filteredSeries]
                  .filter(item => item.isNew)
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              }
            />

            {/* Consistently show a single Trending row based on the current tab */}
            <Section
              title={
                selectedGenre === "Movies" ? "Trending Movies This Week" :
                  selectedGenre === "Series" ? "Trending Series This Week" :
                    "Trending This Week"
              }
              variant="landscape"
              icon={<MaterialIcons name="trending-up" size={24} color="#E50914" />}
              data={
                [...filteredMovies, ...filteredSeries]
                  .sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0))
              }
            />

            {/* Render Genre Specific Sections */}
            {displayGenres.map(genre => (
              <Section
                key={genre}
                title={`${genre} ${selectedGenre === "Series" ? "Series" : selectedGenre === "Free" ? "Content" : "Movies"}`}
                data={
                  selectedGenre === "Series"
                    ? filteredSeries.filter(s => s.genres?.some(g => g.toLowerCase() === genre.toLowerCase()))
                    : selectedGenre === "Free"
                      ? [...filteredMovies, ...filteredSeries].filter(item => item.genres?.some(g => g.toLowerCase() === genre.toLowerCase()))
                      : filteredMovies.filter(m => m.genres?.some(g => g.toLowerCase() === genre.toLowerCase()))
                }
              />
            ))}
          </>
        ) : (
          // Single filter mode (Action, Comedy, etc.)
          <>
            <Section title={`${selectedGenre} Movies`} data={filteredMovies} />
            <Section title={`${selectedGenre} Series`} data={filteredSeries} />
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
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    zIndex: 100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  logoImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  homeHeaderText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'There',
    letterSpacing: 0.5,
  },
  avatarMini: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  homeProfilleText: {
    color: '#fff',
    fontFamily: 'TT',
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
    height: '100%',
    padding: 20,
    paddingBottom: 20,
    justifyContent: 'flex-end',
  },
  featuredBadge: {
    backgroundColor: 'rgba(0, 8, 8, 0)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0)',
  },
  newReleaseBadge: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  featuredText: { color: '#fff', fontSize: 10, fontFamily: 'Broche-Cut', letterSpacing: 1.2 },
  heroTitle: { color: "#fff", fontSize: 32, fontFamily: 'Code', letterSpacing: 1, marginBottom: 8 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  heroMetaText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', fontFamily: 'Coolvetica' },
  metaDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  heroMetaTergum: { color: '#fff', paddingHorizontal: 6 },
  qualityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(33, 226, 65, 0.6)',
  },
  qualityText: { color: '#1af03d', fontSize: 10, fontWeight: '800' },
  heroRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroSubtitle: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: '500', fontFamily: 'Coolvetica' },
  heroActions: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 12 },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  playBtnText: { color: '#fff', fontSize: 15, letterSpacing: 0.6, fontFamily: 'Coolvetica' },
  listBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  genreChipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  genreText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'Coolvetica' },
  genreTextActive: { color: '#fff' },

  // Section Styles
  sectionContainer: { marginTop: 15, marginBottom: 10 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    letterSpacing: -0.2,
    fontFamily: 'Coolvetica'
  },
  seeAllText: { color: '#E50914', fontSize: 13, fontWeight: '600' },
  list: { paddingLeft: 15 },

  // Card Styles
  card: { width: 130, marginRight: 12 },
  cardLandscape: { width: 240 },
  poster: { width: 130, height: 190, borderRadius: 12 },
  posterLandscape: { width: 240, height: 135 },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    justifyContent: 'flex-start',
  },
  newBadge: {
    backgroundColor: '#E50914',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  pressedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 10,
  },
  title: {
    color: "rgba(255,255,255,1)",
    fontSize: 13,
    marginTop: 7,
    fontFamily: 'TT',
    textAlign: 'left'
  },
});

export default HomeScreen;

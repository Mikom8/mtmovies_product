import React, { useState, useMemo } from 'react';
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
  Platform,
  Keyboard,
} from 'react-native';
import { useFonts } from 'expo-font';
import { useMovies } from '../context/MovieContext';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const SPACING = 12;
const CARD_W = (width - (SPACING * (COLUMN_COUNT + 1))) / COLUMN_COUNT;
const CARD_H = CARD_W * 1.5;

const SearchScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    "Broche-Cut": require("../../assets/fonts/Broche-Cut.ttf"),
    "Coolvetica": require("../../assets/fonts/Coolvetica-Rg.otf"),
    "Code": require("../../assets/fonts/CODE-Bold.otf"),
    "TT": require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
    "TT Medium": require("../../assets/fonts/TT-Chocolates-Trial-Medium.otf")
  });

  const { movies, series, loading } = useMovies();
  const [query, setQuery] = useState('');

  // 1. Popular Searches (Trending items sorted by views count)
  const popularItems = useMemo(() => {
    if (loading || (!movies.length && !series.length)) return [];
    return [...movies, ...series]
      .sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0))
      .slice(0, 10);
  }, [movies, series, loading]);

  // 2. Real-time Search Results Filtering
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return [...movies, ...series].filter(item => {
      const matchTitle = item.title && item.title.toLowerCase().includes(q);
      const matchDesc = item.description && item.description.toLowerCase().includes(q);
      const matchGenres = item.genres && item.genres.some(g => g.toLowerCase().includes(q));
      const matchTags = item.tags && item.tags.some(t => t.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchGenres || matchTags;
    });
  }, [query, movies, series]);

  if (!fontsLoaded) return null;

  const handleClear = () => {
    setQuery('');
    Keyboard.dismiss();
  };

  const renderPopularItem = ({ item }) => {
    const isSeries = !!item.seasons;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.popularRow,
          pressed && { backgroundColor: 'rgba(255,255,255,0.05)' }
        ]}
        onPress={() => navigation.navigate('Details', {
          id: item._id,
          type: isSeries ? 'series' : 'movie'
        })}
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
            {item.year ? item.year : '2024'}{isSeries ? ' · Series' : ' · Movie'}
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
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
        ]}
        onPress={() => navigation.navigate('Details', {
          id: item._id,
          type: isSeries ? 'series' : 'movie'
        })}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.poster }}
            style={styles.poster}
            resizeMode="cover"
          />
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
        We couldn't find any matches for "{query}". Try checking the spelling or searching for another title.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Modern Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.inputWrapper}>
          <Feather name="search" size={20} color="rgba(255,255,255,0.5)" style={styles.searchIcon} />
          <TextInput
            placeholder="Search movies, TV shows, genres..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={query}
            onChangeText={setQuery}
            style={styles.input}
            keyboardAppearance="dark"
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!query && (
            <Pressable onPress={handleClear} style={styles.clearBtn}>
              <Feather name="x" size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : !query.trim() ? (
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
        // No results empty state
        renderEmptyState()
      ) : (
        // Grid search results
        <View style={{ flex: 1 }}>
          <FlatList
            data={searchResults}
            renderItem={renderResultItem}
            keyExtractor={(item) => item._id}
            numColumns={COLUMN_COUNT}
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
    backgroundColor: '#0a0a0a',
  },
  searchBarContainer: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'TT',
  },
  clearBtn: {
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Coolvetica',
    letterSpacing: 0.5,
  },
  popularList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  popularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  popularBackdrop: {
    width: 110,
    height: 62,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
  },
  popularInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  popularTitle: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'TT Medium',
  },
  popularMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'TT',
    marginTop: 4,
  },
  popularPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  listContainer: {
    padding: SPACING,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
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
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  qualityBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(33, 226, 65, 0.6)',
  },
  qualityText: {
    color: '#1af03d',
    fontSize: 9,
    fontWeight: '800',
  },
  seriesBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#E50914',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  seriesText: {
    color: '#fff',
    fontSize: 8,
    fontFamily: 'Code',
    letterSpacing: 0.5,
  },
  itemTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontFamily: 'TT Medium',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Coolvetica',
    marginBottom: 10,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'TT',
    lineHeight: 20,
  },
});

export default SearchScreen;

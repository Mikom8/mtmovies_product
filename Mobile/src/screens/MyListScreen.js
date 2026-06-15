import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  FlatList,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { useFonts } from 'expo-font';
import { useWatchlist } from '../context/WatchlistContext';
import { useMovies } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const SPACING = 12;
const CARD_W = (width - (SPACING * (COLUMN_COUNT + 1))) / COLUMN_COUNT;
const CARD_H = CARD_W * 1.5;

function parseDuration(str) {
  if (!str) return 0;
  let h = 0, m = 0;
  const hMatch = str.match(/(\d+)h/);
  const mMatch = str.match(/(\d+)m/);
  if (hMatch) h = parseInt(hMatch[1], 10);
  if (mMatch) m = parseInt(mMatch[1], 10);
  return h * 3600 + m * 60;
}

const MyListScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    "Broche-Cut": require("../../assets/fonts/Broche-Cut.ttf"),
    "Coolvetica": require("../../assets/fonts/Coolvetica-Rg.otf"),
    "Code": require("../../assets/fonts/CODE-Bold.otf"),
    "TT": require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
    "TT Medium": require("../../assets/fonts/TT-Chocolates-Trial-Medium.otf")
  });

  const { watchlist, loading } = useWatchlist();
  const { movies, series } = useMovies();
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('watchlist'); // 'watchlist' | 'history'

  useFocusEffect(
    useCallback(() => {
      if (refreshUser) {
        refreshUser();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  if (!fontsLoaded) return null;

  // Helper to resolve details (uses populated backend details, falls back to local cached lists if unavailable)
  const resolveItemDetails = (item) => {
    if (item.itemDetails) return item.itemDetails;

    // Local fallback
    if (item.itemType === 'series') {
      return series.find(s => s._id === item.itemId);
    } else {
      return movies.find(m => m._id === item.itemId);
    }
  };

  const resolvedWatchlist = watchlist
    .map(item => ({
      ...item,
      details: resolveItemDetails(item)
    }))
    .filter(item => item.details !== undefined && item.details !== null);

  const resolvedHistory = (user?.watchHistory || [])
    .map(h => {
      const isSeries = h.movieId.includes('_');
      const baseId = isSeries ? h.movieId.split('_')[0] : h.movieId;
      let details;
      if (isSeries) {
        details = series.find(s => String(s._id) === String(baseId));
      } else {
        details = movies.find(m => String(m._id) === String(baseId));
      }
      return {
        ...h,
        details,
        itemType: isSeries ? 'series' : 'movie',
        itemId: baseId
      };
    })
    .filter(item => item.details !== undefined && item.details !== null)
    .sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));

  const renderItem = ({ item }) => {
    const detail = item.details;
    const isSeries = item.itemType === 'series' || !!detail.seasons;

    let progressPct = null;
    let title = detail.title;

    if (activeTab === 'history') {
      if (isSeries && item.movieId.includes('_')) {
        const parts = item.movieId.split('_');
        if (parts.length >= 3) {
          const sNum = parts[1].replace('S', '');
          const eNum = parts[2].replace('E', '');
          const season = detail.seasons?.find(s => String(s.seasonNumber) === sNum);
          const ep = season?.episodes?.find(e => String(e.episodeNumber) === eNum);
          if (ep) {
            title = `${detail.title} S${sNum}E${eNum}`;
            const durSec = parseDuration(ep.duration);
            if (durSec > 0) progressPct = Math.min(100, Math.max(0, (item.progress / durSec) * 100));
          }
        }
      } else {
        const durSec = parseDuration(detail.duration);
        if (durSec > 0) progressPct = Math.min(100, Math.max(0, (item.progress / durSec) * 100));
      }
    }

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
        ]}
        onPress={() => {
          if (activeTab === 'history') {
            if (isSeries && item.movieId.includes('_')) {
              const parts = item.movieId.split('_');
              if (parts.length >= 3) {
                const sNum = parts[1].replace('S', '');
                const eNum = parts[2].replace('E', '');
                const sIndex = detail.seasons?.findIndex(s => String(s.seasonNumber) === sNum);
                const season = detail.seasons?.[sIndex >= 0 ? sIndex : 0];
                const eIndex = season?.episodes?.findIndex(e => String(e.episodeNumber) === eNum);
                const ep = season?.episodes?.[eIndex >= 0 ? eIndex : 0];

                if (ep) {
                  navigation.navigate('Player', {
                    title: `${detail.title} · S${sNum}E${eNum} – ${ep.title}`,
                    chatId: ep.telegramChatId,
                    messageId: ep.telegramMessageId,
                    seriesData: detail,
                    seasonIndex: sIndex >= 0 ? sIndex : 0,
                    episodeIndex: eIndex >= 0 ? eIndex : 0,
                    movieId: item.movieId,
                  });
                }
              }
            } else {
              navigation.navigate('Player', {
                title: detail.title,
                chatId: detail.telegram?.chatId,
                messageId: detail.telegram?.messageId,
                movieId: item.movieId,
              });
            }
          } else {
            navigation.navigate('Details', {
              id: item.itemId,
              type: isSeries ? 'series' : 'movie'
            });
          }
        }}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: detail.poster || detail.backdrop }}
            style={styles.poster}
            resizeMode="cover"
          />
          {activeTab === 'history' && progressPct !== null && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progressPct}%` }]} />
            </View>
          )}
        </View>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {title}
        </Text>
      </Pressable>
    );
  };

  const renderEmptyState = () => {
    const isHistory = activeTab === 'history';
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Feather name={isHistory ? "clock" : "bookmark"} size={40} color="#E50914" />
        </View>
        <Text style={styles.emptyTitle}>{isHistory ? "No watch history" : "Your list is empty"}</Text>
        <Text style={styles.emptySubtitle}>
          {isHistory
            ? "Your recently watched movies and TV shows will appear here."
            : "Tap the bookmark icon on any movie or TV show to save it here for later."}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.browseBtn,
            pressed && { backgroundColor: '#B20710' }
          ]}
          onPress={() => navigation.navigate('Main', { screen: 'HomeTab' })}
        >
          <Text style={styles.browseText}>Browse Home</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Premium Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { backgroundColor: 'rgba(255,255,255,0.1)' }
          ]}
          onPress={() => navigation.goBack()}
        >
          <Feather name="chevron-left" size={26} color="#fff" />
        </Pressable>
        <View style={styles.titleWrapper}>
          <Text style={styles.headerTitle}>My Activity</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'watchlist' && styles.tabBtnActive]}
          onPress={() => setActiveTab('watchlist')}
        >
          <Text style={[styles.tabText, activeTab === 'watchlist' && styles.tabTextActive]}>My List</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Watch History</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : (activeTab === 'watchlist' ? resolvedWatchlist : resolvedHistory).length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={activeTab === 'watchlist' ? resolvedWatchlist : resolvedHistory}
          renderItem={renderItem}
          keyExtractor={(item) => activeTab === 'watchlist' ? item.itemId : item.movieId}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  titleWrapper: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Coolvetica',
    letterSpacing: 0.5,
  },
  countText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'TT',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(229,9,20,0.15)',
    borderColor: '#E50914',
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'TT Medium',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#E50914',
  },
  listContainer: {
    padding: SPACING,
    paddingBottom: 40,
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
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#E50914',
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
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(229,9,20,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.2)',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Coolvetica',
    marginBottom: 10,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'TT',
    lineHeight: 20,
    marginBottom: 30,
  },
  browseBtn: {
    backgroundColor: '#E50914',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Coolvetica',
    letterSpacing: 0.5,
  },
});

export default MyListScreen;

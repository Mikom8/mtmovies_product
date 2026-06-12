import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// ─── Empty State Animation ───────────────────────────────────────────────────
const EmptyState = ({ navigation }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -12, duration: 1800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.emptyContainer}>
      {/* Animated Icon */}
      <Animated.View style={[styles.emptyIconWrap, { transform: [{ translateY: floatAnim }] }]}>
        <Animated.View style={[styles.emptyIconGlow]} />
        <View style={styles.emptyIconCircle}>
          <Feather name="download" size={52} color="#E50914" />
        </View>
      </Animated.View>

      <Text style={styles.emptyTitle}>No Downloads Yet</Text>
      <Text style={styles.emptySubtitle}>
        Download movies and shows to watch them offline anytime.
      </Text>

      <Pressable
        style={({ pressed }) => [styles.browseBtn, pressed && { backgroundColor: '#B20710' }]}
        onPress={() => navigation.navigate('Main', { screen: 'HomeTab' })}
      >
        <Feather name="film" size={16} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.browseBtnText}>Browse Content</Text>
      </Pressable>
    </View>
  );
};

// ─── Download Item Card ───────────────────────────────────────────────────────
const DownloadItem = ({ item, onDelete, onPlay }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (item.progress < 1) {
      Animated.timing(progressAnim, {
        toValue: item.progress,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }
  }, [item.progress]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={() => item.progress >= 1 && onPlay(item)}
    >
      {/* Poster */}
      <View style={styles.posterContainer}>
        <Image source={{ uri: item.poster }} style={styles.poster} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={StyleSheet.absoluteFill}
        />
        {item.progress >= 1 && (
          <View style={styles.playOverlay}>
            <Feather name="play-circle" size={32} color="#fff" />
          </View>
        )}
        {item.progress < 1 && (
          <View style={styles.downloadingBadge}>
            <Feather name="download" size={10} color="#fff" />
            <Text style={styles.downloadingText}>{Math.round(item.progress * 100)}%</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardMeta}>{item.year} • {item.size}</Text>
        <Text style={styles.cardQuality}>{item.quality}</Text>

        {item.progress < 1 ? (
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        ) : (
          <Text style={styles.readyText}>Ready to watch</Text>
        )}
      </View>

      {/* Delete */}
      <Pressable
        style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
        onPress={() => onDelete(item)}
        hitSlop={8}
      >
        <Feather name="trash-2" size={18} color="rgba(255,255,255,0.4)" />
      </Pressable>
    </Pressable>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const DownloadsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [downloads, setDownloads] = useState([]);
  // Example: uncomment below to preview with dummy data
  // const [downloads, setDownloads] = useState([
  //   { id: '1', title: 'Inception', year: '2010', size: '1.4 GB', quality: 'HD 1080p', progress: 1, poster: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg' },
  //   { id: '2', title: 'Interstellar', year: '2014', size: '2.1 GB', quality: 'HD 1080p', progress: 0.62, poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
  // ]);

  const [fontsLoaded] = useFonts({
    "Coolvetica": require("../../assets/fonts/Coolvetica-Rg.otf"),
    "TT": require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
    "TT Medium": require("../../assets/fonts/TT-Chocolates-Trial-Medium.otf"),
    "Code": require("../../assets/fonts/CODE-Bold.otf"),
  });

  if (!fontsLoaded) return null;

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Download',
      `Remove "${item.title}" from your downloads?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setDownloads(prev => prev.filter(d => d.id !== item.id)),
        },
      ]
    );
  };

  const handlePlay = (item) => {
    // TODO: navigate to player with local file URI when download integration is added
    Alert.alert('Play', `Playing "${item.title}" (local file playback coming soon)`);
  };

  const totalSize = downloads
    .filter(d => d.progress >= 1)
    .reduce((acc, d) => {
      const num = parseFloat(d.size);
      return acc + (isNaN(num) ? 0 : num);
    }, 0)
    .toFixed(1);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Downloads</Text>
          {downloads.length > 0 && (
            <Text style={styles.headerSub}>{downloads.length} file{downloads.length !== 1 ? 's' : ''} • {totalSize} GB used</Text>
          )}
        </View>
        {downloads.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.6 }]}
            onPress={() =>
              Alert.alert('Delete All', 'Remove all downloads?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete All', style: 'destructive', onPress: () => setDownloads([]) },
              ])
            }
          >
            <Feather name="trash" size={16} color="#E50914" />
            <Text style={styles.clearBtnText}>Clear all</Text>
          </Pressable>
        )}
      </View>

      {/* Content */}
      {downloads.length === 0 ? (
        <EmptyState navigation={navigation} />
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <DownloadItem item={item} onDelete={handleDelete} onPlay={handlePlay} />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

export default DownloadsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Coolvetica',
    letterSpacing: 0.5,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'TT',
    marginTop: 2,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(229,9,20,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.25)',
  },
  clearBtnText: {
    color: '#E50914',
    fontSize: 13,
    fontFamily: 'TT Medium',
  },

  // ─── List ─────────────────────────────────────────────────────────
  listContent: {
    padding: 16,
  },
  separator: {
    height: 12,
  },

  // ─── Card ─────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  posterContainer: {
    width: 72,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  downloadingBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(229,9,20,0.8)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  downloadingText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'Code',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'TT Medium',
    marginBottom: 4,
  },
  cardMeta: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontFamily: 'TT',
    marginBottom: 4,
  },
  cardQuality: {
    color: '#E50914',
    fontSize: 11,
    fontFamily: 'Code',
    marginBottom: 8,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: 2,
  },
  readyText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontFamily: 'TT',
  },
  deleteBtn: {
    marginLeft: 10,
    padding: 6,
  },

  // ─── Empty State ───────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  emptyIconWrap: {
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 100,
    backgroundColor: 'rgba(229,9,20,0.12)',
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 100,
    backgroundColor: 'rgba(229,9,20,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Coolvetica',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontFamily: 'TT',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  featurePills: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(229,9,20,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.2)',
  },
  pillText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: 'TT Medium',
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  browseBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Coolvetica',
    letterSpacing: 0.5,
  },
});

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Share,
  Linking,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Svg, { Path, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Custom Instagram SVG Icon (Placeholder as requested)
const InstagramIcon = ({ size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
      fill="#E1306C"
    />
  </Svg>
);

// Custom Telegram SVG Icon
const TelegramIcon = ({ size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .54-1.43.53-.48-.01-1.4-.27-2.09-.49-.84-.27-1.51-.42-1.45-.89.03-.25.38-.51 1.07-.78 4.2-1.83 7.01-3.04 8.42-3.63 4.01-1.67 4.84-1.96 5.39-1.97.12 0 .39.03.57.17.15.12.2.28.22.4.01.07.03.22.01.35z"
      fill="#0088cc"
    />
  </Svg>
);

const ShareModal = ({ visible, onClose, item, type, onShowToast }) => {
  if (!item) return null;

  // Direct deep link using scheme as requested
  const shareUrl = `mtmovies://details?id=${item._id}&type=${type || 'movie'}`;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(shareUrl);
    onShowToast?.('Link copied to clipboard!', 'info');
    onClose();
  };

  const handleTelegram = async () => {
    const message = `Check out "${item.title}" on MTMovies!\n\n${shareUrl}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Watch "${item.title}" on MTMovies!`)}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      onShowToast?.('Could not open Telegram', 'removed');
    }
    onClose();
  };

  const handleInstagram = () => {
    // Placeholder as requested by user
    onShowToast?.('Instagram sharing placeholder clicked!', 'info');
    onClose();
  };

  const handleDownloadOrShare = async () => {
    try {
      await Share.share({
        title: item.title,
        message: `Watch "${item.title}" on MTMovies!\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      console.log('Share error', error);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Drag Handle indicator */}
              <View style={styles.handle} />

              {/* Header preview card */}
              <View style={styles.itemPreview}>
                <Image
                  source={{ uri: item.poster || item.backdrop }}
                  style={styles.previewPoster}
                  resizeMode="cover"
                />
                <View style={styles.previewMeta}>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.previewSub}>
                    {type === 'series' ? 'Series' : 'Movie'} • {item.year || '2024'}
                  </Text>
                </View>
              </View>

              <Text style={styles.shareHeading}>Share to</Text>

              {/* Share Options Row */}
              <View style={styles.optionsGrid}>
                {/* Telegram */}
                <TouchableOpacity style={styles.optionItem} onPress={handleTelegram} activeOpacity={0.7}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 136, 204, 0.12)' }]}>
                    <TelegramIcon size={28} />
                  </View>
                  <Text style={styles.optionLabel}>Telegram</Text>
                </TouchableOpacity>

                {/* Instagram (Placeholder) */}
                <TouchableOpacity style={styles.optionItem} onPress={handleInstagram} activeOpacity={0.7}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(225, 48, 108, 0.12)' }]}>
                    <InstagramIcon size={28} />
                  </View>
                  <Text style={styles.optionLabel}>Instagram</Text>
                </TouchableOpacity>

                {/* Copy Link */}
                <TouchableOpacity style={styles.optionItem} onPress={handleCopyLink} activeOpacity={0.7}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                    <Feather name="link" size={22} color="#fff" />
                  </View>
                  <Text style={styles.optionLabel}>Copy Link</Text>
                </TouchableOpacity>

                {/* Download / Native Share */}
                <TouchableOpacity style={styles.optionItem} onPress={handleDownloadOrShare} activeOpacity={0.7}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(229, 9, 20, 0.15)' }]}>
                    <Feather name="share" size={22} color="#E50914" />
                  </View>
                  <Text style={styles.optionLabel}>More...</Text>
                </TouchableOpacity>
              </View>

              {/* Close Button */}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.closeText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default ShareModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  itemPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    borderRadius: 14,
    marginBottom: 20,
  },
  previewPoster: {
    width: 44,
    height: 60,
    borderRadius: 8,
  },
  previewMeta: {
    marginLeft: 12,
    flex: 1,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Code',
    marginBottom: 4,
  },
  previewSub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontFamily: 'TT Medium',
  },
  shareHeading: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontFamily: 'Code',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  optionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  optionItem: {
    alignItems: 'center',
    width: width * 0.2,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionLabel: {
    color: '#eee',
    fontSize: 12,
    fontFamily: 'TT Medium',
    textAlign: 'center',
  },
  closeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Code',
  },
});

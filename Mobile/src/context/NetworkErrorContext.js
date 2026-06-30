import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

const { width } = Dimensions.get('window');
const NetworkErrorContext = createContext({ showNetworkError: () => { }, hideNetworkError: () => { } });
export const useNetworkError = () => useContext(NetworkErrorContext);

export const NetworkErrorProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [retryCallback, setRetryCallback] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const showNetworkError = useCallback((onRetry) => {
    setRetryCallback(() => onRetry);
    setVisible(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const hideNetworkError = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      setVisible(false);
      setIsRetrying(false);
    });
  }, [fadeAnim]);

  const handleRetry = useCallback(async () => {
    if (!retryCallback) return;
    setIsRetrying(true);
    try {
      await retryCallback();
      hideNetworkError();
    } catch (e) {
      setIsRetrying(false);
    }
  }, [retryCallback, hideNetworkError]);

  const handleFeedback = useCallback(() => {
    // Placeholder: future feedback/bug-report modal
    console.log('Feedback button pressed');
  }, []);

  return (
    <NetworkErrorContext.Provider value={{ showNetworkError, hideNetworkError }}>
      {children}
      {visible && (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <View style={styles.iconCircle}>
            <Feather name="wifi-off" size={40} color="#E50914" />
          </View>
          <Text style={styles.title}>No Connection</Text>
          <Text style={styles.message}>
            Looks like you are offline.{'\n'}
            Please check your network and try again.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, isRetrying && styles.retryBtnDisabled]}
            onPress={handleRetry}
            activeOpacity={0.8}
            disabled={isRetrying}
          >
            <Feather name="refresh-cw" size={16} color="#fff" />
            <Text style={styles.retryText}>{isRetrying ? 'Retrying...' : 'Retry'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.feedbackBtn} onPress={handleFeedback} activeOpacity={0.7}>
            <Feather name="flag" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.feedbackText}>Report an issue</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>If this keeps happening, the server might be temporarily down.</Text>
        </Animated.View>
      )}
    </NetworkErrorContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080808',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderWidth: 1, borderColor: 'rgba(229, 9, 20, 0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  title: { color: '#fff', fontSize: 24, fontFamily: 'TT Medium', marginBottom: 12, textAlign: 'center' },
  message: { color: 'rgba(255,255,255,0.55)', fontSize: 15, fontFamily: 'TT Medium', textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E50914', paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 12, width: width * 0.7, justifyContent: 'center', marginBottom: 14,
  },
  retryBtnDisabled: { backgroundColor: 'rgba(229, 9, 20, 0.5)' },
  retryText: { color: '#fff', fontSize: 16, fontFamily: 'TT Medium' },
  feedbackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 32,
  },
  feedbackText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'TT Medium' },
  hint: {
    color: 'rgba(255,255,255,0.25)', fontSize: 12, fontFamily: 'TT Medium',
    textAlign: 'center', lineHeight: 18, position: 'absolute', bottom: 50, paddingHorizontal: 24,
  },
});

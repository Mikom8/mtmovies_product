import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

const { width } = Dimensions.get('window');

const NetworkErrorView = ({ onRetry, isRetrying }) => {
  return (
    <View style={styles.container}>
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
        onPress={onRetry}
        activeOpacity={0.8}
        disabled={isRetrying}
      >
        <Feather name="refresh-cw" size={16} color="#fff" />
        <Text style={styles.retryText}>{isRetrying ? 'Retrying...' : 'Retry'}</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>If this keeps happening, the server might be temporarily down.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    borderRadius: 12, width: width * 0.7, justifyContent: 'center', marginBottom: 24,
  },
  retryBtnDisabled: { backgroundColor: 'rgba(229, 9, 20, 0.5)' },
  retryText: { color: '#fff', fontSize: 16, fontFamily: 'TT Medium' },
  hint: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'TT', textAlign: 'center' },
});

export default NetworkErrorView;

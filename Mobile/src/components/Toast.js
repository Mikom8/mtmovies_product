import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const Toast = ({ message, visible, onHide, variant = 'success', icon }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!visible) return;

    opacity.setValue(0);
    scale.setValue(0.88);
    translateY.setValue(12);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 6, speed: 14 }),
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.94, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -6, duration: 220, useNativeDriver: true }),
      ]).start(() => onHide?.());
    }, 2200);

    return () => clearTimeout(timer);
  }, [visible, message, onHide, opacity, scale, translateY]);

  if (!visible) return null;

  const iconName = icon ? icon :
    variant === 'added' ? 'bookmark' :
    variant === 'removed' ? 'bookmark-border' :
    'info-outline';

  const iconColor =
    variant === 'added' ? '#E50914' :
    variant === 'removed' ? '#fff' :
    '#aaa';

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.toast,
          variant === 'added' && styles.toastAdded,
          { opacity, transform: [{ scale }, { translateY }] },
        ]}
      >
        <View style={[styles.iconWrap, variant === 'added' && styles.iconWrapAdded]}>
          <MaterialIcons name={iconName} size={18} color={iconColor} />
        </View>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(14, 14, 14, 0.7)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
    maxWidth: '88%',
  },
  toastAdded: {
    borderColor: 'rgba(229, 9, 20, 0.35)',
    backgroundColor: 'rgba(18, 10, 12, 0.7)',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapAdded: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
  },
  message: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'TT Medium',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
});

export default Toast;

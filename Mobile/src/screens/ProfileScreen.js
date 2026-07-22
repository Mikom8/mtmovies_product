import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import Ripple from 'react-native-material-ripple';
import { useFonts } from "expo-font";
import { useAuth } from "../context/AuthContext";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const AnimatedPressable = ({
  children,
  style,
  onPress,
  scaleTo = 0.96,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 10,
    }).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

/* ------------------------------------------------------------------ */
/*  RevealOnMount — fade + rise entrance used to stagger every section */
/* ------------------------------------------------------------------ */
const RevealOnMount = ({ delay = 0, children, style }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 520,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });

  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [modalMounted, setModalMounted] = useState(false);
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    "Broche-Cut": require("../../assets/fonts/Broche-Cut.ttf"),
    Coolvetica: require("../../assets/fonts/Coolvetica-Rg.otf"),
    Code: require("../../assets/fonts/CODE-Bold.otf"),
    TT: require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
    "TT Medium": require("../../assets/fonts/TT-Chocolates-Trial-Medium.otf"),
  });

  /* ------------------------- scroll-driven parallax ------------------------- */
  const scrollY = useRef(new Animated.Value(0)).current;

  const avatarScale = scrollY.interpolate({
    inputRange: [-120, 0, 160],
    outputRange: [1.2, 1, 0.62],
    extrapolate: "clamp",
  });
  const avatarTranslateY = scrollY.interpolate({
    inputRange: [-120, 0, 160],
    outputRange: [10, 0, -18],
    extrapolate: "clamp",
  });
  const infoOpacity = scrollY.interpolate({
    inputRange: [0, 110],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const infoTranslateY = scrollY.interpolate({
    inputRange: [0, 110],
    outputRange: [0, -14],
    extrapolate: "clamp",
  });
  const glowOpacity = scrollY.interpolate({
    inputRange: [-100, 0, 160],
    outputRange: [0.55, 0.35, 0.08],
    extrapolate: "clamp",
  });

  // compact sticky bar that fades in as the big header collapses
  const stickyOpacity = scrollY.interpolate({
    inputRange: [90, 150],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const stickyTranslateY = scrollY.interpolate({
    inputRange: [90, 150],
    outputRange: [-12, 0],
    extrapolate: "clamp",
  });

  /* ------------------------- ambient badge pulse ------------------------- */
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  /* ------------------------- animated logout modal ------------------------- */
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showLogoutModal) {
      setModalMounted(true);
      Animated.spring(modalAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 16,
        bounciness: 8,
      }).start();
    } else if (modalMounted) {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => setModalMounted(false));
    }
  }, [showLogoutModal]);

  const closeModal = useCallback(() => setShowLogoutModal(false), []);
  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  if (!fontsLoaded) return null;

  if (!user) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconCircle}>
          <Feather name="user" size={50} color="#d8000bff" />
        </View>
        <Text style={styles.promptTitle}>Welcome Back</Text>
        <Text style={styles.promptSubtitle}>
          Join MTMovies to watch your favorite movies and Tv shows.
        </Text>
        <View style={styles.authButtons}>
          <AnimatedPressable
            style={[styles.ctaBtn, styles.primaryBtn]}
            onPress={() => navigation.navigate("Login", { mode: "signup" })}
          >
            <Text style={styles.ctaText}>Create Account</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[styles.ctaBtn, styles.secondaryBtn]}
            onPress={() => navigation.navigate("Login", { mode: "signin" })}
          >
            <Text style={styles.secondaryText}>Log In</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  const planInfo = {
    free: { label: "FREE PLAN", price: "0 Birr/mo" },
    basic: { label: "BASIC PLAN", price: "150 Birr/mo" },
    popular: { label: "POPULAR PLAN", price: "250 Birr/mo" },
    family: { label: "FAMILY PLAN", price: "350 Birr/mo" },
  };

  const isExpired = user.plan && user.plan !== "free" && user.planExpiresAt && new Date() > new Date(user.planExpiresAt);
  const isFree = user.plan === "free" || !user.plan || isExpired;

  const currentPlan = planInfo[isFree ? "free" : user.plan] || {
    label: (user.plan || "FREE").toUpperCase() + " PLAN",
    price: "Custom",
  };

  const SettingRow = ({
    icon,
    lib: IconLib = Feather,
    title,
    meta,
    color = "#fff",
    fontFamily,
    onPress,
    isLast,
  }) => (
    <AnimatedPressable
      scaleTo={0.985}
      style={[styles.row, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, { backgroundColor: `${color}18` }]}>
          <IconLib name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.rowTitle, fontFamily && { fontFamily }]}>{title}</Text>
      </View>
      <View style={styles.rowRight}>
        {meta && <Text style={styles.rowMeta}>{meta}</Text>}
        <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.3)" />
      </View>
    </AnimatedPressable>
  );

  return (
    <View style={styles.mainContainer}>

      {/* compact sticky bar (appears once the big header collapses) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickyBar,
          { opacity: stickyOpacity, transform: [{ translateY: stickyTranslateY }], top: insets.top - 10 },
        ]}
      >
        <View
          style={[
            styles.stickybarWrapper
          ]}
        >

          <Image
            source={{
              uri:
                user.avatar ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
            }}
            style={styles.stickyAvatar}
          />
          <Text style={styles.stickyName} numberOfLines={1}>
            {user.name || "MT User"}
          </Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Premium Header */}
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.avatarWrapper,
              { transform: [{ scale: avatarScale }, { translateY: avatarTranslateY }] },
            ]}
          >
            <View style={styles.avatarRing}>
              <Image
                source={{
                  uri:
                    user.avatar ||
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
                }}
                style={styles.avatar}
              />
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.infoRow,
              { opacity: infoOpacity, transform: [{ translateY: infoTranslateY }] },
            ]}
          >
            <Text style={styles.name}>{user.name || "MT User"}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.badgeRow,
              { opacity: infoOpacity, transform: [{ translateY: infoTranslateY }] },
            ]}
          >
            <Animated.View
              style={[
                styles.premiumBadge,
                isFree && styles.freeBadge,
              ]}
            >
              <Feather
                name="star"
                size={12}
                color={isFree ? "#888" : "#FFD700"}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.premiumText, isFree && styles.freeText]}>
                {currentPlan.label}
              </Text>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Menu Sections */}
        <RevealOnMount delay={60} style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="user"
              title="Personal Info"
              meta="Edit profile"
              color="#4dabf7"
              fontFamily="Coolvetica"
              onPress={() => navigation.navigate("PersonalInfo")}
            />
            <SettingRow
              icon="bell"
              title="Notifications"
              color="#4dabf7"
              fontFamily="Coolvetica"
              isLast
            />
          </View>
        </RevealOnMount>

        <RevealOnMount delay={140} style={styles.section}>
          <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="credit-card"
              title="Plan Details"
              meta={`${!isFree ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) + " Plan" : isExpired ? "Expired" : "Free Plan"}`}
              color={isFree ? (isExpired ? "#E50914" : "#888") : "#62980c"}
              fontFamily="Coolvetica"
              isLast
              onPress={() => {
                if (isFree) {
                  navigation.navigate("Plan");
                } else {
                  navigation.navigate("SubscriptionDetails");
                }
              }}
            />
          </View>
        </RevealOnMount>

        <RevealOnMount delay={220} style={styles.section}>
          <Text style={styles.sectionLabel}>APP SETTINGS</Text>
          <View style={styles.sectionCard}>
            <SettingRow icon="download" title="Downloads" color="#845ef7" fontFamily="Coolvetica" />
            <SettingRow
              icon="settings"
              title="Playback"
              meta="Auto-play ON"
              color="#845ef7"
              fontFamily="Coolvetica"
            />
            <SettingRow icon="info" title="About MTMovies" color="#845ef7" fontFamily="Coolvetica" />
            <SettingRow
              icon="message-circle"
              title="Contact Us"
              color="#845ef7"
              fontFamily="Coolvetica"
              isLast
            />
          </View>
        </RevealOnMount>

        <RevealOnMount delay={300}>
          <AnimatedPressable
            style={styles.signoutBtn}
            scaleTo={0.97}
            onPress={() => setShowLogoutModal(true)}
          >
            <Feather name="log-out" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.signoutText}>Log Out</Text>
          </AnimatedPressable>

          <Text style={styles.versionText}>MTMovies © {new Date().getFullYear()}</Text>
        </RevealOnMount>
      </Animated.ScrollView>

      {/* Animated Logout Modal */}
      <Modal
        visible={modalMounted}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <Animated.View style={[styles.modalOverlay, { opacity: modalAnim }]}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.modalContent,
                  {
                    opacity: modalAnim,
                    transform: [
                      {
                        scale: modalAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.88, 1],
                        }),
                      },
                      {
                        translateY: modalAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [24, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.modalIconContainer}>
                  <Feather name="log-out" size={32} color="#E50914" />
                </View>
                <Text style={styles.modalTitle}>Log Out</Text>
                <Text style={styles.modalSubtitle}>Are you sure you want to log out?</Text>

                <View style={styles.modalActionRow}>
                  <Ripple
                    rippleColor="#fff"
                    rippleFades={false}
                    rippleOpacity={0.1} style={styles.modalCancelBtn} onPress={closeModal}>
                    <Text style={styles.modalCancelText}>Stay</Text>
                  </Ripple>

                  <Ripple
                    rippleColor="#fff"
                    rippleFades={false}
                    rippleOpacity={0.1} style={styles.modalConfirmBtn} onPress={handleLogout}>
                    <Text style={styles.modalConfirmText}>Sign Out</Text>
                  </Ripple>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  scrollContent: {
    paddingBottom: 110,
    paddingTop: 10,
  },
  centered: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(216,0,11,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  promptTitle: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Coolvetica",
    marginBottom: 12,
  },
  promptSubtitle: {
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    fontSize: 15,
    fontFamily: "TT",
    lineHeight: 22,
    marginBottom: 32,
  },
  authButtons: {
    width: "100%",
    gap: 16,
  },
  ctaBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: "#d8000bff",
    shadowColor: "#d8000bff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  secondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  ctaText: { color: "#fff", fontSize: 16, fontFamily: "Code" },
  secondaryText: { color: "#fff", fontSize: 16, fontFamily: "TT Medium" },

  /* ambient glow behind header */
  glowWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 340,
    zIndex: 0,
  },
  glowRed: {
    position: "absolute",
    top: -140,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#d8000b",
    opacity: 0.35,
  },
  glowPurple: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#5b21b6",
    opacity: 0.22,
  },

  /* sticky compact header */
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  stickybarWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    padding: 10,
    borderRadius: 16,
    gap: 2,
    borderWidth: 1,
    borderColor: "rgb(224, 224, 224, 0.6)",
    backgroundColor: "rgba(10,10,10,0.85)",
  },
  stickyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "#d8000bff",
  },
  stickyName: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Coolvetica",
    maxWidth: width * 0.6,
  },

  header: {
    paddingTop: Platform.OS === "ios" ? 40 : 70,
    paddingBottom: 30,
    position: "relative",
    zIndex: 1,
  },
  avatarWrapper: {
    alignItems: "center",
    position: "relative",
    marginBottom: 16,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#d8000bff",
    shadowColor: "#d8000bff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  infoRow: {
    alignItems: "center",
  },
  name: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Coolvetica",
    letterSpacing: 0.5,
  },
  email: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontFamily: "TT",
    marginTop: 4,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,215,0,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
  },
  premiumText: {
    color: "#FFD700",
    fontSize: 11,
    fontFamily: "TT",
    letterSpacing: 1,
  },
  freeBadge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
  },
  freeText: {
    color: "#888",
    fontFamily: "TT",
  },

  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily: "TT",
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowTitle: {
    color: "rgba(255,255,255,0.89)",
    fontSize: 16,
    letterSpacing: 0.3,
    fontWeight: "600",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowMeta: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    marginRight: 8,
    fontFamily: "TT",
  },

  signoutBtn: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "rgba(216,0,11,0.1)",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(216,0,11,0.2)",
  },
  signoutText: {
    color: "#ff4d4d",
    fontFamily: "TT",
    fontSize: 16,
  },
  versionText: {
    color: "rgba(255,255,255,0.39)",
    textAlign: "center",
    fontFamily: "Code",
    marginTop: 30,
    marginBottom: 20,
    fontSize: 12,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: "#1a1a1a",
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(216,0,11,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 22,
    marginBottom: 12,
    fontFamily: "TT Medium",
  },
  modalSubtitle: {
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    fontFamily: "TT",
  },
  modalActionRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalCancelText: {
    color: "#fff",
    fontFamily: "TT Medium",
    fontSize: 16,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: "#d8000bff",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#d8000bff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalConfirmText: {
    color: "#fff",
    fontFamily: "TT Medium",
    fontSize: 16,
  },
});

export default ProfileScreen;
import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { useFonts } from "expo-font";
import { useAuth } from "../context/AuthContext";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";

const { width, height } = Dimensions.get("window");

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [fontsLoaded] = useFonts({
    "Broche-Cut": require("../../assets/fonts/Broche-Cut.ttf"),
    Coolvetica: require("../../assets/fonts/Coolvetica-Rg.otf"),
    Code: require("../../assets/fonts/CODE-Bold.otf"),
    TT: require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
    "TT Medium": require("../../assets/fonts/TT-Chocolates-Trial-Medium.otf"),
  });

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
          <Pressable
            style={({ pressed }) => [
              styles.ctaBtn,
              styles.primaryBtn,
              pressed && { backgroundColor: "#B20710" },
            ]}
            onPress={() => navigation.navigate("Login", { mode: "signup" })}
          >
            <Text style={styles.ctaText}>Create Account</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.ctaBtn,
              styles.secondaryBtn,
              pressed && { backgroundColor: "rgba(255,255,255,0.1)" },
            ]}
            onPress={() => navigation.navigate("Login", { mode: "signin" })}
          >
            <Text style={styles.secondaryText}>Log In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Map backend plan names to display labels and prices
  const planInfo = {
    free: { label: "FREE PLAN", price: "0 Birr/mo" },
    basic: { label: "BASIC PLAN", price: "150 Birr/mo" },
    popular: { label: "POPULAR PLAN", price: "250 Birr/mo" }, // Adjusted to a more realistic price than the '2' in dashboard
    family: { label: "FAMILY PLAN", price: "350 Birr/mo" },
  };

  const currentPlan = planInfo[user.plan] || {
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
  }) => (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: "rgba(255,255,255,0.08)" },
      ]}
      onPress={onPress}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
          <IconLib name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.rowTitle, fontFamily && { fontFamily }]}>
          {title}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {meta && <Text style={styles.rowMeta}>{meta}</Text>}
        <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.3)" />
      </View>
    </Pressable>
  );

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Header */}
        <View style={styles.header}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri:
                  user.avatar ||
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
              }}
              style={styles.avatar}
            />
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.name}>{user.name || "MT User"}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.premiumBadge,
                user.plan === "free" && styles.freeBadge,
              ]}
            >
              <Feather
                name="star"
                size={12}
                color={user.plan === "free" ? "#888" : "#FFD700"}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.premiumText,
                  user.plan === "free" && styles.freeText,
                ]}
              >
                {currentPlan.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="user"
              title="Personal Info"
              meta="Edit profile"
              color="#4dabf7"
              fontFamily="Coolvetica"
            />
            <SettingRow
              icon="shield"
              title="Security"
              meta="Password"
              color="#4dabf7"
              fontFamily="Coolvetica"
            />
            <SettingRow
              icon="bell"
              title="Notifications"
              color="#4dabf7"
              fontFamily="Coolvetica"
            />
            <SettingRow
              icon="bookmark"
              lib={MaterialIcons}
              title="My Activity"
              color="#ff00ee"
              fontFamily="Coolvetica"
              onPress={() => navigation.navigate("MyList")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="credit-card"
              title="Plan Details"
              meta={`${user.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : "Free"} Plan`}
              color="#62980c"
              fontFamily="Coolvetica"
              onPress={() => {
                if (!user.plan || user.plan === "free") {
                  navigation.navigate("Plan");
                } else {
                  navigation.navigate("SubscriptionDetails");
                }
              }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>APP SETTINGS</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="download"
              title="Downloads"
              color="#845ef7"
              fontFamily="Coolvetica"
            />
            <SettingRow
              icon="settings"
              title="Playback"
              meta="Auto-play ON"
              color="#845ef7"
              fontFamily="Coolvetica"
            />
            <SettingRow
              icon="help-circle"
              title="Help Center"
              color="#adb5bd"
              fontFamily="Coolvetica"
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.signoutBtn,
            pressed && { backgroundColor: "rgba(216,0,11,0.2)" },
          ]}
          onPress={() => setShowLogoutModal(true)}
        >
          <Feather
            name="log-out"
            size={18}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.signoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.versionText}>
          MTMovies © {new Date().getFullYear()}
        </Text>
      </ScrollView>

      {/* Modern Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowLogoutModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalIconContainer}>
                  <Feather name="log-out" size={32} color="#E50914" />
                </View>
                <Text style={styles.modalTitle}>Log Out</Text>
                <Text style={styles.modalSubtitle}>
                  Are you sure you want to log out?
                </Text>

                <View style={styles.modalActionRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalCancelBtn,
                      pressed && { backgroundColor: "rgba(255,255,255,0.1)" },
                    ]}
                    onPress={() => setShowLogoutModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Stay</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.modalConfirmBtn,
                      pressed && { backgroundColor: "#B20710" },
                    ]}
                    onPress={handleLogout}
                  >
                    <Text style={styles.modalConfirmText}>Sign Out</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
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

  header: {
    paddingTop: Platform.OS === "ios" ? 40 : 70,
    paddingBottom: 30,
    position: "relative",
  },
  avatarWrapper: {
    alignItems: "center",
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#d8000bff",
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
  centered: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
});

export default ProfileScreen;

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import Feather from "@expo/vector-icons/Feather";
import { useFonts } from "expo-font";

const { width } = Dimensions.get("window");

const PersonalInfoScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [fontsLoaded] = useFonts({
    "Broche-Cut": require("../../assets/fonts/Broche-Cut.ttf"),
    Coolvetica: require("../../assets/fonts/Coolvetica-Rg.otf"),
    Code: require("../../assets/fonts/CODE-Bold.otf"),
    TT: require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
    "TT Medium": require("../../assets/fonts/TT-Chocolates-Trial-Medium.otf"),
  });

  if (!fontsLoaded) return null;

  const SettingRow = ({
    icon,
    lib: IconLib = Feather,
    title,
    meta,
    color = "#fff",
    fontFamily,
    onPress,
    hideArrow = false,
  }) => (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && { backgroundColor: "rgba(255,255,255,0.08)" },
      ]}
      onPress={onPress}
      disabled={!onPress}
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
        {!hideArrow && (
          <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.3)" />
        )}
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { backgroundColor: "rgba(255,255,255,0.1)" },
          ]}
          onPress={() => navigation.goBack()}
        >
          <Feather name="chevron-left" size={26} color="#fff" />
        </Pressable>
        <View style={styles.titleWrapper}>
          <Text style={styles.headerTitle}>Personal Info</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PROFILE DETAILS</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="user"
              title="Name"
              meta={user?.name || "No name"}
              color="#adb5bd"
              fontFamily="Coolvetica"
              hideArrow={true}
            />
            <SettingRow
              icon="mail"
              title="Email"
              meta={user?.email || "No email"}
              color="#adb5bd"
              fontFamily="Coolvetica"
              hideArrow={true}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SECURITY SETTINGS</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="shield"
              title="Security"
              meta="Password"
              color="#4dabf7"
              fontFamily="Coolvetica"
              onPress={() => {
                // Future implementation for security settings
              }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  titleWrapper: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Coolvetica",
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
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
});

export default PersonalInfoScreen;

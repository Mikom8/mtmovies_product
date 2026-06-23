import React from "react";
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from "react-native";
import { useAuth } from "../context/AuthContext";
import Feather from "@expo/vector-icons/Feather";

const SubscriptionDetailsScreen = ({ navigation }) => {
  const { user } = useAuth();

  const planInfo = {
    free: { label: "FREE PLAN", price: "0 Birr/mo" },
    basic: { label: "BASIC PLAN", price: "150 Birr/mo" },
    popular: { label: "POPULAR PLAN", price: "250 Birr/mo" },
    family: { label: "FAMILY PLAN", price: "350 Birr/mo" },
  };

  const currentPlan = planInfo[user?.plan] || {
    label: (user?.plan || "FREE").toUpperCase() + " PLAN",
    price: "Custom",
  };

  const expiresAtDate = user?.planExpiresAt ? new Date(user.planExpiresAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : "Never";

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Plan Details</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="star" size={24} color="#FFD700" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>{currentPlan.label}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Price</Text>
            <Text style={styles.infoValue}>{currentPlan.price}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Billing Cycle</Text>
            <Text style={styles.infoValue}>Monthly</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Next Payment Due</Text>
            <Text style={styles.infoValue}>{expiresAtDate}</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          If you wish to cancel or change your subscription, please contact support or perform a new payment to upgrade.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.upgradeBtn, pressed && { backgroundColor: "#B20710" }]}
          onPress={() => navigation.navigate("Plan")}
        >
          <Text style={styles.upgradeBtnText}>Upgrade Plan</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#fff", fontSize: 18, fontFamily: "TT Medium" },
  scroll: { padding: 20 },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  cardTitle: { color: "#FFD700", fontSize: 20, fontFamily: "Coolvetica", letterSpacing: 1 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  infoLabel: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontFamily: "TT" },
  infoValue: { color: "#fff", fontSize: 15, fontFamily: "TT Medium" },
  statusBadge: { backgroundColor: "rgba(98, 152, 12, 0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: "#62980c", fontSize: 13, fontFamily: "TT Medium" },
  disclaimer: { color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "TT", marginTop: 24, textAlign: "center", lineHeight: 20 },
  upgradeBtn: {
    backgroundColor: "#E50914",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 30,
  },
  upgradeBtnText: { color: "#fff", fontSize: 16, fontFamily: "Code" },
});

export default SubscriptionDetailsScreen;

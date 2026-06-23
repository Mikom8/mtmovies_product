import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import Toast from "../components/Toast";
import Feather from "@expo/vector-icons/Feather";
import { useFonts } from "expo-font";

const { width } = Dimensions.get("window");

const PersonalInfoScreen = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  const [isNameModalVisible, setNameModalVisible] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const [toast, setToast] = useState({
    visible: false,
    message: "",
    variant: "added",
  });

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const [fontsLoaded] = useFonts({
    "Broche-Cut": require("../../assets/fonts/Broche-Cut.ttf"),
    Coolvetica: require("../../assets/fonts/Coolvetica-Rg.otf"),
    Code: require("../../assets/fonts/CODE-Bold.otf"),
    TT: require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
    "TT Medium": require("../../assets/fonts/TT-Chocolates-Trial-Medium.otf"),
  });

  if (!fontsLoaded) return null;

  const handleNameUpdate = async () => {
    if (!newName.trim()) {
      setToast({
        visible: true,
        message: "Name cannot be empty",
        variant: "error",
      });
      return;
    }
    if (newName === user?.name) {
      setNameModalVisible(false);
      return;
    }
    setIsUpdating(true);
    try {
      await client.put("/users/profile", { name: newName });
      await refreshUser();
      setNameModalVisible(false);
      setToast({
        visible: true,
        message: "Name updated successfully",
        variant: "added",
      });
    } catch (error) {
      setToast({
        visible: true,
        message: "Failed to update name",
        variant: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const SettingRow = ({
    icon,
    lib: IconLib = Feather,
    title,
    meta,
    color = "#fff",
    fontFamily,
    onPress,
    hideArrow = false,
    rightIcon = "chevron-right",
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
          <Feather name={rightIcon} size={16} color="rgba(255,255,255,0.3)" />
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
              hideArrow={false}
              rightIcon="edit-2"
              onPress={() => {
                setNewName(user?.name || "");
                setNameModalVisible(true);
              }}
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

      {/* Name Edit Modal */}
      <Modal
        visible={isNameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isUpdating && setNameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter new name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus
            />
            <Text style={styles.modalHelperText}>
              Name can only be changed once in 30 days.
            </Text>
            <View style={styles.modalActionRow}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setNameModalVisible(false)}
                disabled={isUpdating}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalConfirmBtn,
                  (!newName.trim() || isUpdating) && { opacity: 0.5 }
                ]}
                onPress={handleNameUpdate}
                disabled={!newName.trim() || isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onHide={hideToast}
      />
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    marginBottom: 20,
    fontFamily: "Coolvetica",
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    fontSize: 16,
    fontFamily: "TT",
    marginBottom: 8,
  },
  modalHelperText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontFamily: "TT",
    marginBottom: 24,
    textAlign: "center",
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 14,
    borderRadius: 12,
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
    backgroundColor: "#E50914",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#fff",
    fontFamily: "TT Medium",
    fontSize: 16,
  },
});

export default PersonalInfoScreen;

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

  // Password modal state
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({ oldPassword: "", newPassword: "", confirmPassword: "", general: "" });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Compute cooldown state
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const lastChanged = user?.lastNameChangedAt ? new Date(user.lastNameChangedAt) : null;
  const elapsed = lastChanged ? Date.now() - lastChanged.getTime() : THIRTY_DAYS_MS;
  const nameChangeLocked = elapsed < THIRTY_DAYS_MS;
  const daysLeft = nameChangeLocked
    ? Math.ceil((THIRTY_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000))
    : 0;

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
        icon: "edit",
      });
    } catch (error) {
      const serverMsg = error?.response?.data?.message;
      setNameModalVisible(false);
      setToast({
        visible: true,
        message: serverMsg || "Failed to update name",
        variant: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const openPasswordModal = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({ oldPassword: "", newPassword: "", confirmPassword: "", general: "" });
    setPasswordModalVisible(true);
  };

  const handlePasswordChange = async () => {
    // Client-side validation first
    const errs = { oldPassword: "", newPassword: "", confirmPassword: "", general: "" };
    if (!oldPassword.trim()) errs.oldPassword = "Current password is required.";
    if (!newPassword.trim()) errs.newPassword = "New password is required.";
    else if (newPassword.length < 6) errs.newPassword = "Password must be at least 6 characters.";
    if (newPassword && confirmPassword !== newPassword) errs.confirmPassword = "Passwords do not match.";
    if (errs.oldPassword || errs.newPassword || errs.confirmPassword) {
      setPasswordErrors(errs);
      return;
    }
    setIsChangingPassword(true);
    try {
      await client.put("/users/password", { oldPassword, newPassword });
      setPasswordModalVisible(false);
      setToast({ visible: true, message: "Password changed successfully", variant: "added", icon: "lock" });
    } catch (error) {
      const data = error?.response?.data;
      if (data?.field && data.field !== "general") {
        setPasswordErrors((prev) => ({ ...prev, [data.field]: data.message }));
      } else {
        setPasswordErrors((prev) => ({ ...prev, general: data?.message || "Something went wrong." }));
      }
    } finally {
      setIsChangingPassword(false);
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
          <Feather name={rightIcon} size={16} color="rgba(255,255,255,0.6)" />
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
              color={nameChangeLocked ? "#666" : "#adb5bd"}
              fontFamily="Coolvetica"
              hideArrow={nameChangeLocked}
              rightIcon="edit-2"
              onPress={nameChangeLocked ? null : () => {
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
              onPress={openPasswordModal}
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
              {nameChangeLocked
                ? `You can change your name again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`
                : "Name can only be changed once in 30 days."}
            </Text>
            <View style={styles.modalActionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && { backgroundColor: "rgba(255,255,255,0.1)" }
                ]}
                onPress={() => setNameModalVisible(false)}
                disabled={isUpdating}
                android_ripple={{ color: "rgba(255,255,255,0.55)", borderless: false }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalConfirmBtn,
                  (!newName.trim() || isUpdating) && { opacity: 0.5 }
                ]}
                onPress={handleNameUpdate}
                disabled={!newName.trim() || isUpdating}
                android_ripple={{ color: "rgba(0,0,0,0.55)", borderless: false }}
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

      {/* Password Change Modal */}
      <Modal
        visible={isPasswordModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isChangingPassword && setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>

            {/* General error */}
            {!!passwordErrors.general && (
              <View style={styles.fieldErrorBox}>
                <Feather name="alert-circle" size={13} color="#ff6b6b" />
                <Text style={styles.fieldErrorText}>{passwordErrors.general}</Text>
              </View>
            )}

            {/* Old Password */}
            {!!passwordErrors.oldPassword && (
              <View style={styles.fieldErrorBox}>
                <Feather name="alert-circle" size={13} color="#ff6b6b" />
                <Text style={styles.fieldErrorText}>{passwordErrors.oldPassword}</Text>
              </View>
            )}
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={oldPassword}
                onChangeText={(t) => { setOldPassword(t); setPasswordErrors((p) => ({ ...p, oldPassword: "" })); }}
                placeholder="Current password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry={!showOld}
                autoFocus
              />
              <Pressable onPress={() => setShowOld((v) => !v)} style={styles.eyeBtn}>
                <Feather name={showOld ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.4)" />
              </Pressable>
            </View>

            {/* New Password */}
            {!!passwordErrors.newPassword && (
              <View style={styles.fieldErrorBox}>
                <Feather name="alert-circle" size={13} color="#ff6b6b" />
                <Text style={styles.fieldErrorText}>{passwordErrors.newPassword}</Text>
              </View>
            )}
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setPasswordErrors((p) => ({ ...p, newPassword: "" })); }}
                placeholder="New password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry={!showNew}
              />
              <Pressable onPress={() => setShowNew((v) => !v)} style={styles.eyeBtn}>
                <Feather name={showNew ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.4)" />
              </Pressable>
            </View>

            {/* Confirm Password */}
            {!!passwordErrors.confirmPassword && (
              <View style={styles.fieldErrorBox}>
                <Feather name="alert-circle" size={13} color="#ff6b6b" />
                <Text style={styles.fieldErrorText}>{passwordErrors.confirmPassword}</Text>
              </View>
            )}
            <View style={[styles.passwordInputWrapper, { marginBottom: 24 }]}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setPasswordErrors((p) => ({ ...p, confirmPassword: "" })); }}
                placeholder="Confirm new password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry={!showConfirm}
              />
              <Pressable onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn}>
                <Feather name={showConfirm ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.4)" />
              </Pressable>
            </View>

            <View style={styles.modalActionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && { backgroundColor: "rgba(255,255,255,0.1)" }
                ]}
                onPress={() => setPasswordModalVisible(false)}
                disabled={isChangingPassword}
                android_ripple={{ color: "rgba(255,255,255,0.25)", borderless: false }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalConfirmBtn,
                  isChangingPassword && { opacity: 0.5 }
                ]}
                onPress={handlePasswordChange}
                disabled={isChangingPassword}
                android_ripple={{ color: "rgba(0,0,0,0.25)", borderless: false }}
              >
                {isChangingPassword ? (
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
        icon={toast.icon}
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
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginRight: 8,
    fontFamily: "TT Medium",
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
    overflow: "hidden",
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
    overflow: "hidden",
  },
  modalConfirmText: {
    color: "#fff",
    fontFamily: "TT Medium",
    fontSize: 16,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    marginBottom: 12,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    color: "#fff",
    fontSize: 15,
    fontFamily: "TT",
  },
  eyeBtn: {
    padding: 8,
  },
  fieldErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,107,107,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.25)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  fieldErrorText: {
    color: "#ff6b6b",
    fontSize: 12,
    fontFamily: "TT",
    flexShrink: 1,
  },
});

export default PersonalInfoScreen;

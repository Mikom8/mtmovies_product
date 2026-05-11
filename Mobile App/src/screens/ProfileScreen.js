import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import Feather from '@expo/vector-icons/Feather';

const { width, height } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconCircle}>
          <Feather name="user" size={50} color="#E50914" />
        </View>
        <Text style={styles.promptTitle}>Premium Streaming</Text>
        <Text style={styles.promptSubtitle}>Join MTMovies to sync your watch history and access premium content across all devices.</Text>
        <View style={styles.authButtons}>
          <TouchableOpacity
            style={[styles.ctaBtn, styles.primaryBtn]}
            onPress={() => navigation.navigate('Login', { mode: 'signup' })}
          >
            <Text style={styles.ctaText}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctaBtn, styles.secondaryBtn]}
            onPress={() => navigation.navigate('Login', { mode: 'signin' })}
          >
            <Text style={styles.secondaryText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const SettingRow = ({ icon, title, meta, color = '#fff' }) => (
    <TouchableOpacity style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
          <Feather name={icon} size={18} color={color} />
        </View>
        <Text style={styles.rowTitle}>{title}</Text>
      </View>
      <View style={styles.rowRight}>
        {meta && <Text style={styles.rowMeta}>{meta}</Text>}
        <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.3)" />
      </View>
    </TouchableOpacity>
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
              source={{ uri: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' }}
              style={styles.avatar}
            />
          </View>

          <Text style={styles.name}>{user.name || 'MT User'}</Text>
          <Text style={styles.email}>{user.email}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.premiumBadge}>
              <Feather name="star" size={12} color="#FFD700" style={{ marginRight: 4 }} />
              <Text style={styles.premiumText}>PREMIUM MEMBER</Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.sectionCard}>
            <SettingRow icon="user" title="Personal Info" meta="Edit profile" color="#4dabf7" />
            <SettingRow icon="shield" title="Security" meta="Password" color="#4dabf7" />
            <SettingRow icon="bell" title="Notifications" color="#4dabf7" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
          <View style={styles.sectionCard}>
            <SettingRow icon="credit-card" title="Plan Details" meta="200 Birr/mo" color="#62980cff" />
            <SettingRow icon="activity" title="Billing History" color="#62980cff" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>APP SETTINGS</Text>
          <View style={styles.sectionCard}>
            <SettingRow icon="download" title="Downloads" color="#845ef7" />
            <SettingRow icon="settings" title="Playback" meta="Auto-play ON" color="#845ef7" />
            <SettingRow icon="help-circle" title="Help Center" color="#adb5bd" />
          </View>
        </View>

        <TouchableOpacity style={styles.signoutBtn} onPress={() => setShowLogoutModal(true)}>
          <Feather name="log-out" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.signoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>MTMovies © {new Date().getFullYear()}</Text>
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
                <Text style={styles.modalSubtitle}>Are you sure you want to log out?</Text>

                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setShowLogoutModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Stay</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalConfirmBtn}
                    onPress={handleLogout}
                  >
                    <Text style={styles.modalConfirmText}>Sign Out</Text>
                  </TouchableOpacity>
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
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    paddingBottom: 50,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(229,9,20,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  promptTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
  },
  promptSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
  },
  authButtons: {
    width: '100%',
    gap: 16,
  },
  ctaBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#E50914',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 30,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#E50914',
  },
  editBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#E50914',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0a0a0a',
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  email: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
  },

  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginRight: 8,
  },

  signoutBtn: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: 'rgba(229,9,20,0.1)',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.2)',
  },
  signoutText: {
    color: '#ff4d4d',
    fontWeight: '800',
    fontSize: 16,
  },
  versionText: {
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 12,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: '#1a1a1a',
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(229,9,20,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#E50914',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});

export default ProfileScreen;

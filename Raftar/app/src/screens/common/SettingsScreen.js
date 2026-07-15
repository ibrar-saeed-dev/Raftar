import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../../components/common/Button';
import { updateSettings } from '../../redux/slices/userSlice';
import { logout } from '../../redux/slices/authSlice';
import { COLORS } from '../../utils/constants';
import storage from '../../services/storage';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { settings } = useSelector(state => state.user);

  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    notifications: true,
    darkMode: true,
    language: 'en',
    locationServices: true,
    soundEnabled: true,
    vibrationEnabled: true,
    autoAcceptRides: false,
    maxDistance: 10,
    shareRideData: false,
    emailNotifications: true,
    smsNotifications: true
  });

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await storage.getSettings();
      if (savedSettings) {
        setPreferences({ ...preferences, ...savedSettings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const checkPermissions = async () => {
    // Check location permission
    const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
    setPreferences(prev => ({
      ...prev,
      locationServices: locationStatus === 'granted'
    }));

    // Check notification permission
    const { status: notificationStatus } = await Notifications.getPermissionsAsync();
    setPreferences(prev => ({
      ...prev,
      notifications: notificationStatus === 'granted'
    }));
  };

  const handleToggle = async (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    
    // Save to storage
    await storage.setSettings({ ...preferences, [key]: value });
    
    // Update backend if needed
    if (['notifications', 'darkMode', 'language'].includes(key)) {
      await dispatch(updateSettings({ [key]: value }));
    }

    // Handle specific toggles
    if (key === 'locationServices') {
      handleLocationToggle(value);
    }
    if (key === 'notifications') {
      handleNotificationToggle(value);
    }
  };

  const handleLocationToggle = async (enabled) => {
    if (enabled) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed for ride tracking and finding nearby rides.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        setPreferences(prev => ({ ...prev, locationServices: false }));
      }
    }
  };

  const handleNotificationToggle = async (enabled) => {
    if (enabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Notification permission is needed for ride alerts and updates.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        setPreferences(prev => ({ ...prev, notifications: false }));
      }
    }
  };

  const handleLanguageChange = (language) => {
    handleToggle('language', language);
    // Implement language change logic
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await dispatch(logout());
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }]
            });
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Implement account deletion
            Alert.alert('Account Deletion', 'Please contact support to delete your account.');
          }
        }
      ]
    );
  };

  const renderSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderToggleItem = (label, key, icon) => (
    <View style={styles.settingItem}>
      <View style={styles.settingItemLeft}>
        {icon && <Icon name={icon} size={24} color="#888" style={styles.settingIcon} />}
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Switch
        value={preferences[key]}
        onValueChange={(value) => handleToggle(key, value)}
        trackColor={{ false: '#333', true: '#FFD700' }}
        thumbColor={preferences[key] ? '#FFF' : '#666'}
      />
    </View>
  );

  const renderMenuItem = (label, icon, onPress, badge) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Icon name={icon} size={24} color="#888" style={styles.menuIcon} />
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <Icon name="chevron-right" size={24} color="#666" />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0) || 'U'}
            </Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'No email set'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.editProfile}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Preferences Section */}
      {renderSection('Preferences', (
        <>
          {renderToggleItem('Push Notifications', 'notifications', 'notifications')}
          {renderToggleItem('Dark Mode', 'darkMode', 'dark-mode')}
          {renderToggleItem('Location Services', 'locationServices', 'location-on')}
          {renderToggleItem('Sound Effects', 'soundEnabled', 'volume-up')}
          {renderToggleItem('Vibration', 'vibrationEnabled', 'vibration')}
          {renderToggleItem('Auto Accept Rides', 'autoAcceptRides', 'autorenew')}
        </>
      ))}

      {/* Language Section */}
      {renderSection('Language', (
        <View style={styles.languageContainer}>
          {['English', 'Urdu', 'Arabic'].map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.languageOption,
                preferences.language === lang.toLowerCase() && styles.languageOptionActive
              ]}
              onPress={() => handleLanguageChange(lang.toLowerCase())}
            >
              <Text style={[
                styles.languageText,
                preferences.language === lang.toLowerCase() && styles.languageTextActive
              ]}>
                {lang}
              </Text>
              {preferences.language === lang.toLowerCase() && (
                <Icon name="check" size={20} color="#FFD700" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Notifications Section */}
      {renderSection('Notification Settings', (
        <>
          {renderToggleItem('Email Notifications', 'emailNotifications', 'email')}
          {renderToggleItem('SMS Notifications', 'smsNotifications', 'sms')}
          {renderToggleItem('Share Ride Data', 'shareRideData', 'share')}
        </>
      ))}

      {/* Account Section */}
      {renderSection('Account', (
        <>
          {renderMenuItem('Payment Methods', 'payment', () => navigation.navigate('PaymentMethods'))}
          {renderMenuItem('Ride History', 'history', () => navigation.navigate('RideHistory'))}
          {renderMenuItem('Wallet', 'account-balance-wallet', () => navigation.navigate('Wallet'))}
          {renderMenuItem('Referral Program', 'share', () => navigation.navigate('Referral'))}
          {renderMenuItem('Saved Places', 'bookmark', () => navigation.navigate('SavedPlaces'))}
        </>
      ))}

      {/* Support Section */}
      {renderSection('Support', (
        <>
          {renderMenuItem('Help Center', 'help', () => navigation.navigate('HelpCenter'))}
          {renderMenuItem('FAQ', 'question-answer', () => navigation.navigate('FAQ'))}
          {renderMenuItem('Contact Support', 'support-agent', () => navigation.navigate('Support'))}
          {renderMenuItem('Report Issue', 'report-problem', () => navigation.navigate('ReportIssue'))}
          {renderMenuItem('Rate Us', 'star', () => navigation.navigate('RateUs'))}
        </>
      ))}

      {/* Legal Section */}
      {renderSection('Legal', (
        <>
          {renderMenuItem('Privacy Policy', 'privacy-tip', () => navigation.navigate('Privacy'))}
          {renderMenuItem('Terms of Service', 'description', () => navigation.navigate('Terms'))}
          {renderMenuItem('About Raftar', 'info', () => navigation.navigate('About'))}
        </>
      ))}

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appBuild}>Build 100</Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <Button
          title="Clear Cache"
          onPress={handleClearCache}
          variant="outline"
          size="medium"
          style={styles.actionButton}
        />
        
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          size="medium"
          style={styles.actionButton}
        />

        <TouchableOpacity onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccount}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#121212',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileText: {
    marginLeft: 12,
  },
  profileName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileEmail: {
    color: '#888',
    fontSize: 14,
  },
  editProfile: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    color: '#FFF',
    fontSize: 16,
  },
  languageContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 4,
  },
  languageOption: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  languageOptionActive: {
    backgroundColor: '#2A2A2A',
  },
  languageText: {
    color: '#888',
    fontSize: 14,
  },
  languageTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    color: '#FFF',
    fontSize: 16,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    color: '#121212',
    fontSize: 12,
    fontWeight: 'bold',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 16,
  },
  appVersion: {
    color: '#666',
    fontSize: 14,
  },
  appBuild: {
    color: '#444',
    fontSize: 12,
    marginTop: 4,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  deleteAccount: {
    color: '#FF6B6B',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 12,
    textDecorationLine: 'underline',
  },
});

export default SettingsScreen;
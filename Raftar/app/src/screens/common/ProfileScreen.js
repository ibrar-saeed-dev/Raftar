import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Switch,
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconIonic from 'react-native-vector-icons/Ionicons';
import IconFA from 'react-native-vector-icons/FontAwesome5';
import IconMCI from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { logout } from '../../redux/slices/authSlice';
import { updateProfile } from '../../redux/slices/userSlice';

const { width, height } = Dimensions.get('window');

const ProfileScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phoneNumber: user?.phoneNumber || '',
    email: user?.email || '',
    cnic: user?.cnic || '',
    bio: user?.bio || 'Ride smarter, travel better 🚀'
  });
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('English');
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        email: user.email || '',
        cnic: user.cnic || '',
        bio: user.bio || 'Ride smarter, travel better 🚀'
      });
    }
    animateEntrance();
  }, [user]);

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setIsImageLoading(true);
        try {
          await dispatch(updateProfile({ profilePhoto: result.assets[0].uri })).unwrap();
          Alert.alert('Success', 'Profile photo updated successfully');
        } catch (error) {
          Alert.alert('Error', 'Failed to update profile photo');
        } finally {
          setIsImageLoading(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!profileData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      await dispatch(updateProfile(profileData)).unwrap();
      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
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
              routes: [{ name: 'Auth' }],
            });
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      icon: 'history',
      iconType: 'material',
      label: 'Ride History',
      count: 12,
      color: '#FF6B6B',
      onPress: () => navigation.navigate('RideHistory')
    },
    {
      icon: 'attach-money',
      iconType: 'material',
      label: 'My Spending',
      color: '#FF6B6B',
      onPress: () => navigation.navigate('Spending')
    },
    {
      icon: 'credit-card',
      iconType: 'material',
      label: 'Payment Methods',
      count: 2,
      color: '#4ECDC4',
      onPress: () => navigation.navigate('PaymentMethods')
    },
    {
      icon: 'headset',
      iconType: 'material-community',
      label: 'Help & Support',
      color: '#FFD93D',
      onPress: () => navigation.navigate('Support')
    },
    {
      icon: 'information-circle',
      iconType: 'ionicon',
      label: 'About Raftar',
      color: '#A8E6CF',
      onPress: () => navigation.navigate('About')
    },
    {
      icon: 'shield-check',
      iconType: 'material-community',
      label: 'Privacy Policy',
      color: '#B39DDB',
      onPress: () => navigation.navigate('Privacy')
    },
    {
      icon: 'document-text',
      iconType: 'ionicon',
      label: 'Terms & Conditions',
      color: '#FF8A80',
      onPress: () => navigation.navigate('Terms')
    }
  ];

  const stats = [
    { label: 'Rides', value: user?.stats?.totalRides?.toString() || '0', icon: 'car', color: '#FF6B6B', iconType: 'ionicon' },
    { label: 'Rating', value: user?.stats?.rating?.toString() || '0', icon: 'star', color: '#FFD93D' },
    { label: 'Points', value: '2.3k', icon: 'emoji-events', color: '#FFD700' }
  ];

  const getIcon = (icon, iconType, size, color) => {
    switch (iconType) {
      case 'material':
        return <Icon name={icon} size={size} color={color} />;
      case 'ionicon':
        return <IconIonic name={icon} size={size} color={color} />;
      case 'material-community':
        return <IconMCI name={icon} size={size} color={color} />;
      case 'fontawesome':
        return <IconFA name={icon} size={size} color={color} />;
      default:
        return <Icon name="circle" size={size} color={color} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity 
              style={styles.moreButton}
              onPress={() => Alert.alert('More options coming soon')}
            >
              <Icon name="more-vert" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={800}
            style={styles.profileCard}
          >
            <LinearGradient
              colors={['#1E1E1E', '#2A2A2A']}
              style={styles.profileGradient}
            >
              <View style={styles.profileHeader}>
                {/* Left side - Image */}
                <View style={styles.profileImageSection}>
                  <TouchableOpacity 
                    style={styles.profileImageContainer} 
                    onPress={pickImage}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ 
                        uri: user?.profilePhoto || 
                             'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face'
                      }}
                      style={styles.profileImage}
                    />
                    {isImageLoading && (
                      <View style={styles.imageLoadingOverlay}>
                        <ActivityIndicator size="large" color="#FFD700" />
                      </View>
                    )}
                    <View style={styles.cameraIcon}>
                      <Icon name="camera-alt" size={14} color="#121212" />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.verificationBadge}>
                    <Icon name="verified" size={16} color="#4ECDC4" />
                    <Text style={styles.verificationText}>Verified</Text>
                  </View>
                </View>

                {/* Right side - Info */}
                <View style={styles.profileInfoSection}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user?.name || 'Guest User'}
                  </Text>
                  <Text style={styles.userPhone}>{user?.phoneNumber || 'N/A'}</Text>
                  <Text style={styles.userBio} numberOfLines={2}>
                    {profileData.bio}
                  </Text>
                  <View style={styles.userMeta}>
                    <View style={styles.metaItem}>
                      <Icon name="email" size={14} color="#888" />
                      <Text style={styles.metaText}>{user?.email || 'No email'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Icon name="credit-card" size={14} color="#888" />
                      <Text style={styles.metaText}>{user?.cnic || 'No CNIC'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animatable.View>

          {/* Stats Section */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={800} 
            delay={200}
            style={styles.statsContainer}
          >
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                  {getIcon(stat.icon, stat.iconType || 'material', 20, stat.color)}
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </Animatable.View>

          {/* Edit Profile Section */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={800} 
            delay={300}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Profile Information</Text>
              <TouchableOpacity 
                onPress={() => setIsEditing(!isEditing)}
                style={styles.editButtonContainer}
              >
                <LinearGradient
                  colors={isEditing ? ['#FF6B6B', '#FF8E53'] : ['#FFD700', '#FFC107']}
                  style={styles.editButtonGradient}
                >
                  <Text style={styles.editButton}>
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Text>
                  <Icon 
                    name={isEditing ? 'close' : 'edit'} 
                    size={16} 
                    color="#121212" 
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {isEditing ? (
              <View style={styles.editForm}>
                <Input
                  label="Full Name *"
                  value={profileData.name}
                  onChangeText={(text) => setProfileData({ ...profileData, name: text })}
                  placeholder="Enter your name"
                  icon="person"
                />
                <Input
                  label="Email"
                  value={profileData.email}
                  onChangeText={(text) => setProfileData({ ...profileData, email: text })}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  icon="email"
                />
                <Input
                  label="CNIC"
                  value={profileData.cnic}
                  onChangeText={(text) => setProfileData({ ...profileData, cnic: text })}
                  placeholder="XXXXX-XXXXXXX-X"
                  icon="credit-card"
                />
                <Input
                  label="Bio"
                  value={profileData.bio}
                  onChangeText={(text) => setProfileData({ ...profileData, bio: text })}
                  placeholder="Write something about yourself"
                  icon="description"
                  multiline
                  numberOfLines={3}
                />
                <Button
                  title="Save Changes"
                  onPress={handleSave}
                  loading={loading}
                  size="large"
                  style={styles.saveButton}
                />
              </View>
            ) : (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{user?.name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{user?.phoneNumber}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user?.email || 'Not set'}</Text>
                </View>
                <View style={[styles.infoRow, styles.lastInfoRow]}>
                  <Text style={styles.infoLabel}>CNIC</Text>
                  <Text style={styles.infoValue}>{user?.cnic || 'Not set'}</Text>
                </View>
              </View>
            )}
          </Animatable.View>

          {/* Preferences */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={800} 
            delay={400}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Preferences</Text>
            
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <View style={styles.preferenceIcon}>
                  <Icon name="notifications" size={22} color="#FFD700" />
                </View>
                <View>
                  <Text style={styles.preferenceLabel}>Push Notifications</Text>
                  <Text style={styles.preferenceSub}>Receive ride updates and offers</Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#333', true: '#FFD700' }}
                thumbColor={notifications ? '#FFF' : '#666'}
                ios_backgroundColor="#333"
              />
            </View>

            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <View style={styles.preferenceIcon}>
                  <Icon name="dark-mode" size={22} color="#FFD700" />
                </View>
                <View>
                  <Text style={styles.preferenceLabel}>Dark Mode</Text>
                  <Text style={styles.preferenceSub}>Dark theme for better viewing</Text>
                </View>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#333', true: '#FFD700' }}
                thumbColor={darkMode ? '#FFF' : '#666'}
                ios_backgroundColor="#333"
              />
            </View>

            <TouchableOpacity style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <View style={styles.preferenceIcon}>
                  <Icon name="language" size={22} color="#FFD700" />
                </View>
                <View>
                  <Text style={styles.preferenceLabel}>Language</Text>
                  <Text style={styles.preferenceSub}>{language}</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          </Animatable.View>

          {/* Menu */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={800} 
            delay={500}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Settings</Text>
            
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                    {getIcon(item.icon, item.iconType, 22, item.color)}
                  </View>
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </View>
                <View style={styles.menuItemRight}>
                  {item.count && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{item.count}</Text>
                    </View>
                  )}
                  <Icon name="chevron-right" size={20} color="#444" />
                </View>
              </TouchableOpacity>
            ))}
          </Animatable.View>

          {/* Logout Button */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={800} 
            delay={600}
            style={styles.logoutContainer}
          >
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                style={styles.logoutGradient}
              >
                <Icon name="logout" size={22} color="#FFF" />
                <Text style={styles.logoutText}>Logout</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.versionText}>Version 2.0.0 • Made with ❤️</Text>
          </Animatable.View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  moreButton: {
    padding: 4,
  },
  profileCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  profileGradient: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageSection: {
    alignItems: 'center',
    marginRight: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 45,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FFD700',
    borderRadius: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#121212',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verificationText: {
    color: '#4ECDC4',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  profileInfoSection: {
    flex: 1,
  },
  userName: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userPhone: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
  },
  userBio: {
    color: '#AAA',
    fontSize: 12,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  userMeta: {
    gap: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#666',
    fontSize: 11,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#1E1E1E',
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButtonContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  editButton: {
    color: '#121212',
    fontSize: 13,
    fontWeight: '600',
  },
  editForm: {
    gap: 12,
  },
  saveButton: {
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  lastInfoRow: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
  },
  infoValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  preferenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  preferenceLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  preferenceSub: {
    color: '#666',
    fontSize: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  menuBadgeText: {
    color: '#121212',
    fontSize: 11,
    fontWeight: 'bold',
  },
  logoutContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  logoutButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  logoutText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default ProfileScreen;
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Animated,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconIonic from 'react-native-vector-icons/Ionicons';
import IconFA from 'react-native-vector-icons/FontAwesome5';
import IconMCI from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import * as Location from 'expo-location';
import api from '../../services/api';
import CarpoolMapPreview from '../../components/common/CarpoolMapPreview';

const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeService, setActiveService] = useState(null);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    animateEntrance();
    getLocation();
    checkActiveRides();
  }, []);

  const checkActiveRides = async () => {
    try {
      const response = await api.get('/rides/active');
      if (response.data?.success && response.data.rides?.length > 0) {
        // Filter out ghost 'searching' rides, only auto-navigate to rides that are in progress
        const activeRide = response.data.rides.find(r => r.status === 'accepted' || r.status === 'started');
        if (activeRide) {
          console.log('[HomeScreen] Found active in-progress ride:', activeRide._id, 'Status:', activeRide.status);
          dispatch({ type: 'ride/getRideDetails/fulfilled', payload: { ride: activeRide } });
          navigation.navigate('RideTracking', { rideId: activeRide._id });
        } else {
          dispatch({ type: 'ride/clearCurrentRide' });
        }
      } else {
        dispatch({ type: 'ride/clearCurrentRide' });
      }
    } catch (error) {
      console.error('[HomeScreen] Check active rides error:', error);
    }
  };



  useEffect(() => {
    const socketService = require('../../services/socket').default;
    
    const handleJoinAccepted = (data) => {
      Alert.alert('Carpool Update', 'Your carpool request was accepted!');
    };
    const handleJoinRejected = (data) => {
      Alert.alert('Carpool Update', 'Your carpool request was rejected.');
    };
    const handleCarpoolStarted = (data) => {
      Alert.alert('Carpool Started', 'Your carpool is now in progress!');
      // Assuming RideTracking handles carpool tracking if adapted, or create a simple fallback.
      // navigation.navigate('RideTracking', { rideId: data.carpoolId });
    };
    const handleCarpoolCompleted = (data) => {
      Alert.alert('Carpool Completed', `Your carpool has finished. Fare: Rs. ${data.fare}`);
    };

    socketService.on('join-accepted', handleJoinAccepted);
    socketService.on('join-rejected', handleJoinRejected);
    socketService.on('carpool-started', handleCarpoolStarted);
    socketService.on('carpool-completed', handleCarpoolCompleted);

    return () => {
      socketService.off('join-accepted', handleJoinAccepted);
      socketService.off('join-rejected', handleJoinRejected);
      socketService.off('carpool-started', handleCarpoolStarted);
      socketService.off('carpool-completed', handleCarpoolCompleted);
    };
  }, [navigation]);

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

  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await getLocation();
    setRefreshing(false);
  };

  const serviceOptions = [
    {
      id: 'ride',
      title: 'Book a Ride',
      icon: 'car',
      iconType: 'material-community',
      color: '#FF6B6B',
      gradient: ['#FF6B6B', '#FF8E53'],
      screen: 'BookRide',
      description: 'Get a ride instantly',
      badge: 'Popular'
    },
    {
      id: 'carpool',
      title: 'Book a Carpool',
      icon: 'people',
      iconType: 'ionicon',
      color: '#4ECDC4',
      gradient: ['#4ECDC4', '#44B39D'],
      screen: 'BookCarpool',
      description: 'Share ride with others',
      badge: 'Save'
    },
    {
      id: 'parcel',
      title: 'Send a Parcel',
      icon: 'local-shipping',
      iconType: 'material',
      color: '#A8E6CF',
      gradient: ['#A8E6CF', '#88D8B0'],
      screen: 'SendParcel',
      description: 'Fast delivery service',
      badge: 'New'
    },
    {
      id: 'intercity',
      title: 'Intercity',
      icon: 'map-marker-distance',
      iconType: 'material-community',
      color: '#B39DDB',
      gradient: ['#B39DDB', '#9575CD'],
      screen: 'BookIntercity',
      description: 'Travel to other cities',
      badge: 'New'
    }
  ];

  const quickActions = [
    { id: 'history', icon: 'history', iconType: 'material', label: 'History', color: '#FF6B6B', screen: 'RideHistory' },
    { id: 'spending', icon: 'attach-money', iconType: 'material', label: 'Spending', color: '#FFD700', screen: 'Spending' },
    { id: 'wallet', icon: 'wallet', iconType: 'material', label: 'Wallet', color: '#4ECDC4', screen: 'Wallet' },
    { id: 'support', icon: 'headset', iconType: 'material-community', label: 'Support', color: '#A8E6CF', screen: 'Support' },
    { id: 'promo', icon: 'gift', iconType: 'material-community', label: 'Offers', color: '#FF8A80', screen: 'Offers' },
    { id: 'settings', icon: 'settings', iconType: 'ionicon', label: 'Settings', color: '#B39DDB', screen: 'Settings' }
  ];

  // recentRides replaced by state hook at the top

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
        return <Icon name={icon} size={size} color={color} />;
    }
  };

  const renderServiceCard = ({ item, index }) => (
    <Animatable.View 
      animation="fadeInUp" 
      duration={600} 
      delay={index * 100}
      style={styles.serviceCardWrapper}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.serviceCard}
        onPress={() => {
          setActiveService(item.id);
          navigation.navigate(item.screen);
        }}
      >
        <LinearGradient
          colors={item.gradient}
          style={styles.serviceGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {item.badge && (
            <View style={[styles.badge, { backgroundColor: item.color }]}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
          <View style={[styles.serviceIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            {getIcon(item.icon, item.iconType, 32, '#FFF')}
          </View>
          <Text style={styles.serviceTitle}>{item.title}</Text>
          <Text style={styles.serviceDescription}>{item.description}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderQuickAction = ({ item }) => (
    <TouchableOpacity 
      style={styles.quickActionItem} 
      activeOpacity={0.7}
      onPress={() => item.screen ? navigation.navigate(item.screen) : null}
    >
      <LinearGradient
        colors={[item.color + '30', item.color + '10']}
        style={[styles.quickActionIcon, { borderColor: item.color + '40' }]}
      >
        {getIcon(item.icon, item.iconType, 24, item.color)}
      </LinearGradient>
      <Text style={styles.quickActionLabel}>{item.label}</Text>
    </TouchableOpacity>
  );





  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      
      <Animated.View style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#FFD700"
              colors={['#FFD700']}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.greetingContainer}>
                <Text style={styles.greeting}>Good Morning 👋</Text>
                <Text style={styles.userName}>{user?.name || 'Guest User'}</Text>
              </View>
              <View style={styles.locationContainer}>
                <Icon name="location-on" size={16} color="#FFD700" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {location ? 
                    `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` :
                    'Fetching location...'
                  }
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Icon name="notifications" size={24} color="#FFF" />
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>3</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Image
                  source={{ 
                    uri: user?.profilePhoto || 
                         'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'
                  }}
                  style={styles.profileImage}
                />
                <View style={styles.onlineDot} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <TouchableOpacity 
            style={styles.searchBar}
            onPress={() => navigation.navigate('BookRide')}
            activeOpacity={0.8}
          >
            <Icon name="search" size={22} color="#666" />
            <Text style={styles.searchText}>Where are you going?</Text>
            <View style={styles.searchRight}>
              <Icon name="mic" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <FlatList
              data={quickActions}
              renderItem={renderQuickAction}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsList}
            />
          </View>

          {/* Services Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🚗 Our Services</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.servicesGrid}>
              {serviceOptions.map((service, index) => (
                <View key={service.id} style={styles.serviceGridItem}>
                  {renderServiceCard({ item: service, index })}
                </View>
              ))}
            </View>
          </View>

          {/* Promo Banner */}
          <Animatable.View animation="fadeInUp" duration={600} delay={400}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              style={styles.promoBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.promoContent}>
                <View style={styles.promoLeft}>
                  <Text style={styles.promoTitle}>🎉 Ride Smarter,</Text>
                  <Text style={styles.promoTitle}>Save More</Text>
                  <Text style={styles.promoText}>
                    Get up to 20% off on your first 5 rides
                  </Text>
                  <TouchableOpacity style={styles.promoButton}>
                    <LinearGradient
                      colors={['#FFF', '#F5F5F5']}
                      style={styles.promoButtonGradient}
                    >
                      <Text style={styles.promoButtonText}>Claim Now</Text>
                      <Icon name="arrow-forward" size={18} color="#FF6B6B" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <View style={styles.promoRight}>
                  <View style={styles.promoIconContainer}>
                    <Icon name="local-offer" size={50} color="#FFF" />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animatable.View>

          {/* Current Location */}
          <Animatable.View animation="fadeInUp" duration={600} delay={500} style={styles.locationCard}>
            <LinearGradient
              colors={['#1E1E1E', '#2A2A2A']}
              style={styles.locationGradient}
            >
              <View style={styles.locationHeader}>
                <View style={styles.locationIconContainer}>
                  <Icon name="my-location" size={22} color="#FFD700" />
                </View>
                <Text style={styles.locationTitle}>Current Location</Text>
                <TouchableOpacity style={styles.refreshLocation} onPress={getLocation}>
                  <Icon name="refresh" size={20} color="#FFD700" />
                </TouchableOpacity>
              </View>
              <Text style={styles.locationText}>
                {location ? 
                  `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}` :
                  'Fetching location...'
                }
              </Text>
            </LinearGradient>
          </Animatable.View>





          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity style={styles.fab} activeOpacity={0.9}>
          <LinearGradient
            colors={['#FFD700', '#FFC107']}
            style={styles.fabGradient}
          >
            <Icon name="add" size={30} color="#121212" />
          </LinearGradient>
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerLeft: {
    flex: 1,
  },
  greetingContainer: {
    marginBottom: 4,
  },
  greeting: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
    maxWidth: width * 0.4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    marginRight: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#121212',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileButton: {
    position: 'relative',
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ECDC4',
    borderWidth: 2,
    borderColor: '#121212',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 20,
  },
  searchText: {
    flex: 1,
    color: '#666',
    fontSize: 15,
    marginLeft: 12,
  },
  searchRight: {
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#2A2A2A',
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  quickActionsList: {
    paddingHorizontal: 16,
  },
  quickActionItem: {
    alignItems: 'center',
    marginHorizontal: 10,
    width: 64,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
  },
  quickActionLabel: {
    color: '#FFF',
    fontSize: 11,
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  seeAll: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceGridItem: {
    width: '48%',
    marginBottom: 12,
  },
  serviceCardWrapper: {
    flex: 1,
  },
  serviceCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  serviceGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 180,
    position: 'relative',
  },
  serviceIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  serviceDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  promoBanner: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  promoContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoLeft: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  promoText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  promoButton: {
    borderRadius: 25,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  promoButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  promoButtonText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    fontSize: 14,
  },
  promoRight: {
    marginLeft: 20,
  },
  promoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  locationGradient: {
    padding: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
  },
  refreshLocation: {
    padding: 4,
  },
  locationText: {
    color: '#888',
    fontSize: 13,
    marginLeft: 46,
  },
  recentRideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  rideIconContainer: {
    marginRight: 14,
  },
  rideIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rideInfo: {
    flex: 1,
  },
  rideRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  rideFrom: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rideTo: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rideTime: {
    color: '#666',
    fontSize: 12,
  },
  ridePriceContainer: {
    alignItems: 'flex-end',
  },
  ridePrice: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rideStatus: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rideStatusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;
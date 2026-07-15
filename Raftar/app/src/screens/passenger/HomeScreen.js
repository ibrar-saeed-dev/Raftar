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
  Alert,
  Platform,
  TextInput,
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

const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeService, setActiveService] = useState(null);

  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Modern Yellow Theme Colors
  const YELLOW_PRIMARY = '#F9C349';
  const YELLOW_DARK = '#F8B82A';
  const YELLOW_LIGHT = '#FFF3D6';
  const YELLOW_GRADIENT_START = '#F8B82A';
  const YELLOW_GRADIENT_END = '#F9C349';
  const BLACK_PRIMARY = '#1A1A2E';
  const GRAY_LIGHT = '#F5F5F5';
  const GRAY_MEDIUM = '#E0E0E0';
  const WHITE = '#FFFFFF';

  useEffect(() => {
    animateEntrance();
    getCurrentLocation();
    checkActiveRides();
  }, []);

  const checkActiveRides = async () => {
    try {
      const response = await api.get('/rides/active');
      if (response.data?.success && response.data.rides?.length > 0) {
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
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      })
    ]).start();
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLocationLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      
      let addressStr = 'Current Location';
      try {
        let geo = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
        if (geo.length > 0) {
          addressStr = `${geo[0].name || geo[0].street || ''}, ${geo[0].city || ''}`.replace(/^, /, '');
        }
      } catch(e) {}

      setPickup({
        address: addressStr,
        location: {
          type: 'Point',
          coordinates: [loc.coords.longitude, loc.coords.latitude]
        }
      });
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await getCurrentLocation();
    setRefreshing(false);
  };

  const handleWhereToPress = () => {
    navigation.navigate('BookRide', {
      pickup: pickup,
      destination: destination
    });
  };

  const handlePickupPress = () => {
    navigation.navigate('BookRide', {
      pickup: pickup,
      destination: destination,
      focusField: 'pickup'
    });
  };

  const handleDestinationPress = () => {
    navigation.navigate('BookRide', {
      pickup: pickup,
      destination: destination,
      focusField: 'destination'
    });
  };

  const getPickupDisplay = () => {
    if (pickup) {
      return pickup.address.length > 30 ? pickup.address.substring(0, 30) + '...' : pickup.address;
    }
    return 'Select pickup location';
  };

  const getDestinationDisplay = () => {
    if (destination) {
      return destination.address.length > 30 ? destination.address.substring(0, 30) + '...' : destination.address;
    }
    return 'Where to?';
  };

  const serviceOptions = [
    {
      id: 'ride',
      title: 'Ride',
      icon: 'car-sports',
      iconType: 'material-community',
      screen: 'BookRide',
      description: 'Go anywhere',
      iconBg: YELLOW_LIGHT,
      iconColor: YELLOW_PRIMARY,
    },
    {
      id: 'carpool',
      title: 'Carpool',
      icon: 'people',
      iconType: 'ionicon',
      screen: 'BookCarpool',
      description: 'Share & save',
      iconBg: '#E8F5E9',
      iconColor: '#4CAF50',
    },
    {
      id: 'parcel',
      title: 'Parcel',
      icon: 'package-variant-closed',
      iconType: 'material-community',
      screen: 'SendParcel',
      description: 'Send items',
      iconBg: '#FFF3E0',
      iconColor: '#FF9800',
    },
    {
      id: 'intercity',
      title: 'Intercity',
      icon: 'bus',
      iconType: 'material-community',
      screen: 'BookIntercity',
      description: 'City to city',
      iconBg: '#F3E5F5',
      iconColor: '#9C27B0',
    }
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
        return <Icon name={icon} size={size} color={color} />;
    }
  };

  const renderServiceCard = ({ item, index }) => (
    <Animatable.View 
      animation="fadeInUp" 
      duration={500} 
      delay={index * 100}
      style={styles.serviceCardWrapper}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.serviceCard}
        onPress={() => {
          setActiveService(item.id);
          navigation.navigate(item.screen);
        }}
      >
        <View style={styles.serviceCardContent}>
          <View style={[styles.serviceIconContainer, { backgroundColor: item.iconBg }]}>
            {getIcon(item.icon, item.iconType, 28, item.iconColor)}
          </View>
          <Text style={styles.serviceTitle}>{item.title}</Text>
          <Text style={styles.serviceDescription}>{item.description}</Text>
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
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
              tintColor={YELLOW_PRIMARY}
              colors={[YELLOW_PRIMARY]}
            />
          }
        >
          {/* Modern Yellow Header */}
          <LinearGradient
            colors={[YELLOW_GRADIENT_START, YELLOW_GRADIENT_END]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
                <View style={styles.logoContainer}>
                  <IconMCI name="car-sports" size={28} color="#FFFFFF" />
                  <Text style={styles.headerTitle}>Raftar</Text>
                </View>
                
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity 
                  style={styles.headerIconButton}
                  onPress={handleNotificationPress}
                  activeOpacity={0.7}
                >
                  <IconIonic name="notifications-outline" size={24} color="#FFFFFF" />
                  <View style={styles.notificationDot} />
                </TouchableOpacity>
               
              </View>
            </View>

            

           
          </LinearGradient>

          

          {/* Location Card - Modern Design */}
          <View style={styles.locationCard}>
            <View style={styles.locationCardHeader}>
              <Text style={styles.locationCardTitle}>Your Trip</Text>
              <TouchableOpacity onPress={getCurrentLocation}>
                <Text style={styles.locationCardAction}>Use Current</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.locationItem}
              onPress={handlePickupPress}
              activeOpacity={0.7}
            >
              <View style={[styles.locationDot, { backgroundColor: YELLOW_PRIMARY }]} />
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {locationLoading ? 'Loading...' : getPickupDisplay()}
                </Text>
              </View>
              {pickup && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setPickup(null)}
                >
                  <IconIonic name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <View style={styles.locationDivider} />

            <TouchableOpacity 
              style={styles.locationItem}
              onPress={handleDestinationPress}
              activeOpacity={0.7}
            >
              <View style={[styles.locationDot, { backgroundColor: '#FF6B6B' }]} />
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Destination</Text>
                <Text style={[styles.locationText, !destination && styles.locationPlaceholder]}>
                  {getDestinationDisplay()}
                </Text>
              </View>
              {destination && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setDestination(null)}
                >
                  <IconIonic name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {pickup && destination && (
              <TouchableOpacity 
                style={styles.bookNowButton}
                onPress={handleWhereToPress}
              >
                <LinearGradient
                  colors={[YELLOW_GRADIENT_START, YELLOW_GRADIENT_END]}
                  style={styles.bookNowGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.bookNowText}>Find a Ride</Text>
                  <Icon name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Services Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Our Services</Text>
              <TouchableOpacity>
                <Text style={styles.sectionSeeAll}>See All</Text>
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

          {/* Promo Banner - Yellow Theme */}
          <View style={styles.promoContainer}>
            <LinearGradient
              colors={[YELLOW_GRADIENT_START, YELLOW_GRADIENT_END]}
              style={styles.promoBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.promoContent}>
                <View style={styles.promoTextContainer}>
                  <Text style={styles.promoTitle}>🚗 First Ride Free</Text>
                  <Text style={styles.promoDescription}>Get your first ride absolutely free. Use code FIRSTFREE</Text>
                  <TouchableOpacity style={styles.promoButton}>
                    <Text style={styles.promoButtonText}>Claim Offer</Text>
                    <Icon name="arrow-forward" size={16} color={YELLOW_PRIMARY} />
                  </TouchableOpacity>
                </View>
                <View style={styles.promoIconContainer}>
                  <IconMCI name="rocket-launch" size={48} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    marginTop:34
  },
  headerGradient: {
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom:30
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
 
  
  
  headerIconButton: {
    padding: 6,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
 
  
 
  locationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -27,
    marginBottom: 20,
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  locationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  locationCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  locationCardAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFB800',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 15,
    color: '#1A1A2E',
    fontWeight: '500',
  },
  locationPlaceholder: {
    color: '#999',
    fontWeight: '400',
  },
  locationDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  clearButton: {
    padding: 2,
    marginLeft: 8,
  },
  bookNowButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  bookNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  bookNowText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  sectionSeeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFB800',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceGridItem: {
    width: '48%',
    marginBottom: 14,
  },
  serviceCardWrapper: {
    flex: 1,
  },
  serviceCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  serviceCardContent: {
    padding: 20,
    alignItems: 'center',
    minHeight: 130,
    justifyContent: 'center',
  },
  serviceIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 1,
    textAlign: 'center',
    color: '#1A1A2E',
  },
  serviceDescription: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '400',
    color: '#888',
  },
  promoContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  promoBanner: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  promoDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
    lineHeight: 16,
  },
  promoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 4,
  },
  promoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFB800',
  },
  promoIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 30,
  },
});

export default HomeScreen;
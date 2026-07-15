import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconIonic from 'react-native-vector-icons/Ionicons';
import IconFA from 'react-native-vector-icons/FontAwesome5';
import CustomPlacesAutocomplete from '../../components/common/CustomPlacesAutocomplete';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { createCarpoolBooking, getAvailableCarpools, joinCarpool, createCarpoolRequest } from '../../redux/slices/bookingSlice';
import { GOOGLE_MAPS_API_KEY } from '../../config/constants';
import api from '../../services/api';
import socketService from '../../services/socket';
import CarpoolMapPreview from '../../components/common/CarpoolMapPreview';

const { width, height } = Dimensions.get('window');

const BookCarpoolScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { loading, availableCarpools } = useSelector(state => state.booking);
  
  const isIntercity = route.params?.isIntercity || false;
  
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedCarpool, setSelectedCarpool] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCarpools, setShowCarpools] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const mapRef = useRef(null);
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);
  const pickerMapRef = useRef(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [locationLoading, setLocationLoading] = useState(true);

  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapPickerType, setMapPickerType] = useState('pickup');
  const [mapPickerCoords, setMapPickerCoords] = useState(null);
  const [mapPickerAddress, setMapPickerAddress] = useState('Loading address...');

  const [schedule, setSchedule] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // New state for carpool lists
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'create'
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'accepted'
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedCarpools, setAcceptedCarpools] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    animateEntrance();
    getCurrentLocation();
    fetchMyCarpools();
  }, []);

  const fetchMyCarpools = async () => {
    setListLoading(true);
    try {
      const response = await api.get(`/bookings/passenger-carpools?isIntercity=${isIntercity}`);
      if (response.data?.success) {
        setPendingRequests(response.data.pendingRequests || []);
        setAcceptedCarpools(response.data.acceptedCarpools || []);
      }
    } catch (error) {
      console.error('Fetch my carpools error:', error);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    const handleJoinAccepted = (data) => {
      fetchMyCarpools();
      Alert.alert('Request Accepted!', 'A driver has accepted your carpool request.');
    };
    
    socketService.on('join-accepted', handleJoinAccepted);
    
    return () => {
      socketService.off('join-accepted', handleJoinAccepted);
    };
  }, []);

  useEffect(() => {
    if (pickup && dropoff) {
      fetchRoute();
      searchCarpools();
    } else {
      setRouteCoords([]);
    }
  }, [pickup, dropoff, schedule]);

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location is needed to set pickup.');
        setLocationLoading(false);
        return;
      }
      
      let loc = await Location.getCurrentPositionAsync({});
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
        location: { coordinates: [loc.coords.longitude, loc.coords.latitude] }
      });
      pickupRef.current?.setAddressText(addressStr);
    } catch (e) {
      console.log('Location error', e);
    } finally {
      setLocationLoading(false);
    }
  };

  const openMapPicker = async (type) => {
    setMapPickerType(type);
    setMapPickerVisible(true);
    let coords = type === 'pickup' && pickup ? 
      { latitude: pickup.location.coordinates[1], longitude: pickup.location.coordinates[0] } :
      type === 'dropoff' && dropoff ? 
      { latitude: dropoff.location.coordinates[1], longitude: dropoff.location.coordinates[0] } : null;

    if (!coords) {
       try {
         let loc = await Location.getCurrentPositionAsync({});
         coords = loc.coords;
       } catch (e) {
         coords = { latitude: 33.6844, longitude: 73.0479 };
       }
    }
    setMapPickerCoords(coords);
    setMapPickerAddress('Loading address...');
  };

  const onPickerRegionChangeComplete = async (region) => {
    setMapPickerCoords(region);
    try {
      let geo = await Location.reverseGeocodeAsync({
        latitude: region.latitude,
        longitude: region.longitude
      });
      if (geo.length > 0) {
        setMapPickerAddress(`${geo[0].name || geo[0].street || ''}, ${geo[0].city || ''}`.replace(/^, /, ''));
      } else {
        setMapPickerAddress('Unknown Location');
      }
    } catch(e) {
      setMapPickerAddress('Unknown Location');
    }
  };

  const confirmMapPicker = () => {
    if (!mapPickerCoords) return;
    const data = {
      address: mapPickerAddress,
      location: {
        type: 'Point',
        coordinates: [mapPickerCoords.longitude, mapPickerCoords.latitude]
      }
    };
    if (mapPickerType === 'pickup') {
      setPickup(data);
      pickupRef.current?.setAddressText(data.address);
    } else {
      setDropoff(data);
      dropoffRef.current?.setAddressText(data.address);
    }
    setMapPickerVisible(false);
  };

  const decodePolyline = (t, e) => {
    for (var n, o, u = 0, l = 0, r = 0, d = [], h = 0, i = 0, a = null, c = Math.pow(10, e || 5); u < t.length; ) {
      a = null, h = 0, i = 0;
      do a = t.charCodeAt(u++) - 63, i |= (31 & a) << h, h += 5; while (a >= 32);
      n = 1 & i ? ~(i >> 1) : i >> 1, h = i = 0;
      do a = t.charCodeAt(u++) - 63, i |= (31 & a) << h, h += 5; while (a >= 32);
      o = 1 & i ? ~(i >> 1) : i >> 1, l += n, r += o, d.push([l / c, r / c]);
    }
    return d.map(p => ({ latitude: p[0], longitude: p[1] }));
  };

  const fetchRoute = async () => {
    if (!pickup?.location?.coordinates || !dropoff?.location?.coordinates || !GOOGLE_MAPS_API_KEY) return;
    
    const [startLng, startLat] = pickup.location.coordinates;
    const [endLng, endLat] = dropoff.location.coordinates;

    try {
      const resp = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${startLat},${startLng}&destination=${endLat},${endLng}&key=${GOOGLE_MAPS_API_KEY}`);
      const respJson = await resp.json();
      if (respJson.routes.length) {
        const points = decodePolyline(respJson.routes[0].overview_polyline.points);
        setRouteCoords(points);
        
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(points, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
      } else {
        setRouteCoords([
          { latitude: startLat, longitude: startLng },
          { latitude: endLat, longitude: endLng }
        ]);
      }
    } catch (error) {
      setRouteCoords([
        { latitude: startLat, longitude: startLng },
        { latitude: endLat, longitude: endLng }
      ]);
    }
  };

  const searchCarpools = async () => {
    if (!pickup || !dropoff) return;
    
    setSearching(true);
    try {
      await dispatch(getAvailableCarpools({
        pickup: JSON.stringify(pickup.location.coordinates),
        dropoff: JSON.stringify(dropoff.location.coordinates),
        isIntercity
      }));
      setShowCarpools(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to find carpools. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handlePostRequest = async () => {
    if (!pickup || !dropoff) {
      Alert.alert('Missing Info', 'Please select both pickup and destination locations.');
      return;
    }
    
    if (schedule <= new Date()) {
      Alert.alert('Invalid Date', 'Please select a future date and time for your carpool.');
      return;
    }

    try {
      setSearching(true);
      await dispatch(createCarpoolRequest({
        pickup,
        dropoff,
        timeWindow: {
          start: schedule,
          end: new Date(schedule.getTime() + 60 * 60 * 1000) // 1 hour window
        },
        isIntercity
      })).unwrap();

      Alert.alert('Success', 'Carpool request posted!', [
        { text: 'OK', onPress: () => {
          setViewMode('list');
          fetchMyCarpools();
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to post carpool request');
    } finally {
      setSearching(false);
    }
  };

  const handleJoinCarpool = async (carpool) => {
    setSelectedCarpool(carpool);
    setShowJoinModal(true);
  };

  const confirmJoinCarpool = async () => {
    if (!selectedCarpool) return;
    
    try {
      await dispatch(joinCarpool({ 
        carpoolId: selectedCarpool._id,
        pickup,
        dropoff
      })).unwrap();
      
      Alert.alert(
        'Success! 🎉',
        'You have successfully joined the carpool!',
        [
          {
            text: 'View Details',
            onPress: () => {
              setShowJoinModal(false);
              navigation.navigate('CarpoolDetails', { carpoolId: selectedCarpool._id });
            }
          },
          {
            text: 'OK',
            onPress: () => setShowJoinModal(false)
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to join carpool');
      setShowJoinModal(false);
    }
  };



  const renderCarpoolItem = ({ item }) => {
    const isFull = item.carpool.seatsAvailable === 0;
    const isExpired = new Date(item.timeWindow.start) < new Date();
    
    return (
      <Animatable.View 
        animation="fadeInUp" 
        duration={400} 
        delay={item.index * 100}
      >
        <TouchableOpacity
          style={[styles.carpoolCard, isFull && styles.carpoolCardFull]}
          onPress={() => !isFull && !isExpired && handleJoinCarpool(item)}
          disabled={isFull || isExpired}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isFull ? ['#2A2A2A', '#1E1E1E'] : ['#1E1E1E', '#2A2A2A']}
            style={styles.carpoolGradient}
          >
            <View style={styles.carpoolHeader}>
              <View style={styles.carpoolUser}>
                <LinearGradient
                  colors={['#FFD700', '#FFC107']}
                  style={styles.userAvatar}
                >
                  <Text style={styles.userInitial}>
                    {item.driverId?.userId?.name?.charAt(0) || 'U'}
                  </Text>
                </LinearGradient>
                <View>
                  <Text style={styles.carpoolName}>{item.driverId?.userId?.name || 'Driver'}</Text>
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={12} color="#FFD700" />
                    <Text style={styles.ratingText}>{item.driverId?.stats?.rating || 0}</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.seatsBadge, isFull && styles.seatsBadgeFull]}>
                <Icon name="people" size={16} color={isFull ? '#666' : '#FFF'} />
                <Text style={[styles.seatsText, isFull && styles.seatsTextFull]}>
                  {item.carpool.seatsAvailable} seats
                </Text>
              </View>
            </View>
            
            <View style={styles.carpoolRoute}>
              <View style={styles.routePoint}>
                <View style={styles.routeDot}>
                  <View style={[styles.dot, { backgroundColor: '#4ECDC4' }]} />
                </View>
                <Text style={styles.routeText} numberOfLines={1}>
                  {item.pickup.address}
                </Text>
              </View>
              <View style={styles.routeLineContainer}>
                <View style={styles.routeLine} />
                <View style={styles.routeTime}>
                  <Text style={styles.routeTimeText}>
                    {item.timeWindow?.start ? new Date(item.timeWindow.start).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={styles.routePoint}>
                <View style={styles.routeDot}>
                  <View style={[styles.dot, { backgroundColor: '#FF6B6B' }]} />
                </View>
                <Text style={styles.routeText} numberOfLines={1}>
                  {item.dropoff.address}
                </Text>
              </View>
            </View>
            
            <View style={styles.carpoolFooter}>
              <View style={styles.carpoolMeta}>
                <View style={styles.metaItem}>
                  <Icon name="access-time" size={14} color="#666" />
                  <Text style={styles.metaText}>
                    {item.timeWindow?.start ? new Date(item.timeWindow.start).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="person" size={14} color="#666" />
                  <Text style={styles.metaText}>
                    {item.passengers?.length || 0} riders
                  </Text>
                </View>
              </View>
              <Text style={[styles.carpoolPrice, isFull && styles.carpoolPriceFull]}>
                Rs. {item.carpool?.pricePerSeat || 'N/A'}
              </Text>
            </View>

            {isFull && (
              <View style={styles.fullBadge}>
                <Text style={styles.fullBadgeText}>FULL</Text>
              </View>
            )}
            {isExpired && !isFull && (
              <View style={styles.expiredBadge}>
                <Text style={styles.expiredBadgeText}>EXPIRED</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  const handleCancelCarpool = async (carpoolId) => {
    Alert.alert(
      'Cancel Carpool Request',
      'Are you sure you want to cancel this carpool request?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/bookings/carpool/request/${carpoolId}`);
              if (res.data?.success) {
                Alert.alert('Success', 'Carpool request cancelled.');
                fetchMyCarpools();
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to cancel carpool request');
            }
          }
        }
      ]
    );
  };

  const handleLeaveCarpool = async (carpoolId) => {
    Alert.alert(
      'Leave Carpool',
      'Are you sure you want to leave this carpool?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Leave', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.post(`/bookings/carpool/${carpoolId}/leave`);
              if (res.data?.success) {
                Alert.alert('Success', 'Left carpool successfully.');
                fetchMyCarpools();
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to leave carpool');
            }
          }
        }
      ]
    );
  };

  const renderMyCarpool = ({ item }) => {
    const isAccepted = item.status === 'accepted' || item.status === 'confirmed' || item.status === 'in-progress';
    const driver = item.driverId?.userId || item.driverId;

    return (
      <Animatable.View animation="fadeInUp" duration={400} style={{ marginBottom: 16 }}>
        <View style={[styles.recentRideCard, { borderColor: '#4ECDC4', borderWidth: 1, flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
              {item.carpool?.departureTime ? new Date(item.carpool.departureTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 
               item.timeWindow?.start ? new Date(item.timeWindow.start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Invalid Date'}
            </Text>
            <View style={[
              styles.rideStatus,
              { backgroundColor: item.status === 'searching' ? '#FFD700' : '#4ECDC4' }
            ]}>
              <Text style={[styles.rideStatusText, item.status === 'searching' && { color: '#000' }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {driver && isAccepted && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#333' }}>
              {driver.profileImage ? (
                <Image source={{ uri: driver.profileImage }} style={{ width: 30, height: 30, borderRadius: 15 }} />
              ) : (
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' }}>
                  <Icon name="person" size={18} color="#FFF" />
                </View>
              )}
              <View style={{ marginLeft: 10 }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Driver: {driver.name || 'Unknown'}</Text>
                {driver.phoneNumber && <Text style={{ color: '#CCC', fontSize: 12 }}>{driver.phoneNumber}</Text>}
              </View>
            </View>
          )}

          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Icon name="my-location" size={16} color="#4ECDC4" />
              <Text style={{ color: '#CCC', marginLeft: 8, flex: 1 }} numberOfLines={1}>{item.pickup?.address || 'Pickup'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="location-on" size={16} color="#FF6B6B" />
              <Text style={{ color: '#CCC', marginLeft: 8, flex: 1 }} numberOfLines={1}>{item.dropoff?.address || 'Dropoff'}</Text>
            </View>
          </View>

          <CarpoolMapPreview 
            pickup={item.pickup} 
            dropoff={item.dropoff} 
            style={{ height: 160, marginBottom: 12 }} 
          />

          {(item.status !== 'completed' && item.status !== 'cancelled') && (
            <View style={{ alignItems: 'flex-end' }}>
              <TouchableOpacity 
                onPress={() => item.driverId && !item.passengerId ? handleLeaveCarpool(item._id) : handleCancelCarpool(item._id)} 
                style={{ padding: 8 }}
              >
                <Text style={{ color: '#FF6B6B', fontSize: 14, fontWeight: 'bold' }}>
                  {item.driverId && !item.passengerId ? 'Leave Carpool' : 'Cancel Request'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animatable.View>
    );
  };

  const renderListView = () => (
    <View style={styles.listContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isIntercity ? 'Intercity Carpools' : 'My Carpools'}</Text>
        <View style={{width: 24}} />
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]} 
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'accepted' && styles.activeTab]} 
          onPress={() => setActiveTab('accepted')}
        >
          <Text style={[styles.tabText, activeTab === 'accepted' && styles.activeTabText]}>Accepted</Text>
        </TouchableOpacity>
      </View>

      {listLoading ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'pending' ? pendingRequests : acceptedCarpools}
          renderItem={renderMyCarpool}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>
              No {activeTab} carpools right now.
            </Text>
          }
          refreshing={listLoading}
          onRefresh={fetchMyCarpools}
        />
      )}

      <View style={styles.floatingBtnContainer}>
        <Button 
          title="Create New Carpool"
          onPress={() => setViewMode('create')}
          style={styles.createNewBtn}
          textStyle={{fontWeight: 'bold', fontSize: 16}}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {viewMode === 'list' ? renderListView() : (
          <Animated.View style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setViewMode('list')}
            >
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isIntercity ? 'Intercity Carpool' : 'Create Request'}</Text>
            <TouchableOpacity style={styles.helpButton}>
              <Icon name="help-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Map Section */}
            <Animatable.View animation="fadeIn" duration={600} style={styles.mapContainer}>
              {locationLoading ? (
                <View style={styles.mapLoading}>
                  <ActivityIndicator size="large" color="#FFD700" />
                  <Text style={styles.mapLoadingText}>Finding your location...</Text>
                </View>
              ) : (
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={{
                    latitude: pickup?.location?.coordinates[1] || 33.6844,
                    longitude: pickup?.location?.coordinates[0] || 73.0479,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  {pickup?.location?.coordinates && (
                    <Marker
                      coordinate={{
                        latitude: pickup.location.coordinates[1],
                        longitude: pickup.location.coordinates[0],
                      }}
                      title="Pickup"
                    >
                      <View style={styles.pickupMarker}>
                        <View style={styles.markerInner} />
                      </View>
                    </Marker>
                  )}
                  {dropoff?.location?.coordinates && (
                    <Marker
                      coordinate={{
                        latitude: dropoff.location.coordinates[1],
                        longitude: dropoff.location.coordinates[0],
                      }}
                      title="Dropoff"
                    >
                      <Icon name="flag" size={24} color="#FF6B6B" />
                    </Marker>
                  )}
                  {routeCoords.length > 0 && (
                    <Polyline
                      coordinates={routeCoords}
                      strokeWidth={4}
                      strokeColor="#4ECDC4"
                    />
                  )}
                </MapView>
              )}
            </Animatable.View>

            {/* Location Section */}
            <Animatable.View 
              animation="fadeInUp" 
              duration={600} 
              delay={100}
              style={styles.locationSection}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📍 Where are you going?</Text>
                <TouchableOpacity 
                  style={styles.useCurrentButton}
                  onPress={getCurrentLocation}
                >
                  <Icon name="my-location" size={16} color="#FFD700" />
                  <Text style={styles.useCurrentText}>Current</Text>
                </TouchableOpacity>
              </View>
              
              <View style={[styles.locationInputWrapper, { zIndex: 20, elevation: 20 }]}>
                <View style={styles.locationDot}>
                  <View style={[styles.dot, { backgroundColor: '#4ECDC4' }]} />
                </View>
                <View style={styles.locationInputContainer}>
                  <CustomPlacesAutocomplete
                    ref={pickupRef}
                    placeholder="Pickup Location"
                    onPress={(data, details = null) => {
                      setPickup({
                        address: data.description,
                        location: {
                          type: 'Point',
                          coordinates: [
                            details.geometry.location.lng,
                            details.geometry.location.lat
                          ]
                        },
                        placeId: data.place_id
                      });
                    }}
                    styles={{
                      textInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12 },
                      textInput: { color: '#FFF', flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, backgroundColor: 'transparent' },
                      container: styles.autocompleteContainer,
                      listView: styles.autocompleteList,
                      row: styles.autocompleteRow,
                      description: styles.autocompleteDescription
                    }}
                    placeholderTextColor="#666"
                    renderRightButton={() => (
                      <TouchableOpacity onPress={() => openMapPicker('pickup')} style={styles.mapIconBtn}>
                        <Icon name="map" size={22} color="#4ECDC4" />
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>

              <View style={styles.locationDivider} />

              <View style={[styles.locationInputWrapper, { zIndex: 10, elevation: 10 }]}>
                <View style={styles.locationDot}>
                  <View style={[styles.dot, { backgroundColor: '#FF6B6B' }]} />
                </View>
                <View style={styles.locationInputContainer}>
                  <CustomPlacesAutocomplete
                    ref={dropoffRef}
                    placeholder="Destination"
                    onPress={(data, details = null) => {
                      setDropoff({
                        address: data.description,
                        location: {
                          type: 'Point',
                          coordinates: [
                            details.geometry.location.lng,
                            details.geometry.location.lat
                          ]
                        },
                        placeId: data.place_id
                      });
                    }}
                    styles={{
                      textInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12 },
                      textInput: { color: '#FFF', flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, backgroundColor: 'transparent' },
                      container: styles.autocompleteContainer,
                      listView: styles.autocompleteList,
                      row: styles.autocompleteRow,
                      description: styles.autocompleteDescription
                    }}
                    placeholderTextColor="#666"
                    renderRightButton={() => (
                      <TouchableOpacity onPress={() => openMapPicker('dropoff')} style={styles.mapIconBtn}>
                        <Icon name="map" size={22} color="#FF6B6B" />
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
              
              <View style={styles.locationDivider} />
              
              <View style={styles.detailRow}>
                <View style={styles.detailLeft}>
                  <View style={styles.detailIcon}>
                    <Icon name="event" size={20} color="#FFD700" />
                  </View>
                  <Text style={styles.detailLabel}>Schedule</Text>
                </View>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {schedule.toLocaleString([], {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </Text>
                  <Icon name="edit" size={16} color="#FFD700" />
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={schedule}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      const newDate = new Date(schedule);
                      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                      setSchedule(newDate);
                      setShowTimePicker(true);
                    }
                  }}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={schedule}
                  mode="time"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowTimePicker(false);
                    if (selectedDate) {
                      const newDate = new Date(schedule);
                      newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                      setSchedule(newDate);
                    }
                  }}
                />
              )}
            </Animatable.View>



            {/* Available Carpools */}
            {showCarpools && (
              <Animatable.View 
                animation="fadeInUp" 
                duration={600} 
                delay={300}
                style={styles.section}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>🚗 Available Carpools</Text>
                  <Text style={styles.carpoolCount}>
                    {availableCarpools.length} found
                  </Text>
                </View>
                
                {searching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFD700" />
                    <Text style={styles.loadingText}>Searching for carpools...</Text>
                  </View>
                ) : availableCarpools.length > 0 ? (
                  <FlatList
                    data={availableCarpools}
                    renderItem={renderCarpoolItem}
                    keyExtractor={item => item._id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.carpoolsList}
                  />
                ) : (
                  <View style={styles.noCarpools}>
                    <Icon name="search-off" size={60} color="#444" />
                    <Text style={styles.noCarpoolsText}>No carpools found</Text>
                    <Text style={styles.noCarpoolsSubtext}>
                      We couldn't find a driver going that way right now.
                    </Text>
                  </View>
                )}

              </Animatable.View>
            )}

            {/* Always allow posting a request */}
            <Animatable.View animation="fadeInUp" duration={600} delay={400}>
              <TouchableOpacity
                style={[styles.requestButton, { marginHorizontal: 16, marginBottom: 20, opacity: (!pickup || !dropoff || searching) ? 0.6 : 1 }]}
                onPress={handlePostRequest}
                disabled={!pickup || !dropoff || searching}
              >
                <LinearGradient
                  colors={(!pickup || !dropoff) ? ['#555', '#444'] : ['#FFD700', '#FFC107']}
                  style={styles.requestButtonGradient}
                >
                  <Icon name="add-circle" size={20} color={(!pickup || !dropoff) ? '#999' : '#121212'} />
                  <Text style={[styles.requestButtonText, (!pickup || !dropoff) && { color: '#999' }]}>Post Carpool Request</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animatable.View>

            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Map Picker Modal */}
          <Modal
            visible={mapPickerVisible}
            animationType="slide"
            transparent={false}
          >
            <View style={styles.mapPickerContainer}>
              <View style={styles.mapPickerHeader}>
                <TouchableOpacity onPress={() => setMapPickerVisible(false)} style={styles.mapPickerClose}>
                  <Icon name="close" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.mapPickerTitle}>
                  Select {mapPickerType === 'pickup' ? 'Pickup' : 'Destination'}
                </Text>
                <View style={{ width: 40 }} />
              </View>
              {mapPickerCoords && (
                <View style={styles.mapWrapper}>
                  <MapView
                    ref={pickerMapRef}
                    style={styles.pickerMap}
                    initialRegion={{
                      latitude: mapPickerCoords.latitude,
                      longitude: mapPickerCoords.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    onRegionChangeComplete={onPickerRegionChangeComplete}
                  />
                  <View style={styles.mapMarkerFixed}>
                    <Icon name="location-on" size={40} color={mapPickerType === 'pickup' ? '#4ECDC4' : '#FF6B6B'} />
                  </View>
                </View>
              )}
              <View style={styles.mapPickerFooter}>
                <Text style={styles.mapPickerAddressText}>{mapPickerAddress}</Text>
                <TouchableOpacity style={styles.mapPickerConfirmBtn} onPress={confirmMapPicker}>
                  <Text style={styles.mapPickerConfirmText}>Confirm Location</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Join Carpool Modal */}
          <Modal
            visible={showJoinModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowJoinModal(false)}
          >
            <View style={styles.modalOverlay}>
              <TouchableOpacity 
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={() => setShowJoinModal(false)}
              />
              <Animatable.View 
                animation="slideInUp" 
                duration={400}
                style={styles.modalContent}
              >
                <LinearGradient
                  colors={['#1E1E1E', '#2A2A2A']}
                  style={styles.modalGradient}
                >
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderLeft}>
                      <LinearGradient
                        colors={['#FFD700', '#FFC107']}
                        style={styles.modalIcon}
                      >
                        <Icon name="people" size={24} color="#121212" />
                      </LinearGradient>
                      <View>
                        <Text style={styles.modalTitle}>Join Carpool</Text>
                        <Text style={styles.modalSubtitle}>
                          with {selectedCarpool?.driverId?.userId?.name || 'Driver'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      onPress={() => setShowJoinModal(false)}
                      style={styles.modalClose}
                    >
                      <Icon name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalBody}>
                    <View style={styles.modalRoute}>
                      <View style={styles.modalRoutePoint}>
                        <View style={[styles.modalDot, { backgroundColor: '#4ECDC4' }]} />
                        <Text style={styles.modalRouteText}>
                          {selectedCarpool?.pickup?.address}
                        </Text>
                      </View>
                      <View style={styles.modalRouteLine} />
                      <View style={styles.modalRoutePoint}>
                        <View style={[styles.modalDot, { backgroundColor: '#FF6B6B' }]} />
                        <Text style={styles.modalRouteText}>
                          {selectedCarpool?.dropoff?.address}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalDetails}>
                      <View style={styles.modalDetailItem}>
                        <Icon name="access-time" size={18} color="#666" />
                        <Text style={styles.modalDetailText}>
                          {selectedCarpool?.timeWindow?.start ? new Date(selectedCarpool.timeWindow.start).toLocaleString() : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.modalDetailItem}>
                        <Icon name="people" size={18} color="#666" />
                        <Text style={styles.modalDetailText}>
                          {selectedCarpool?.carpool?.seatsAvailable} seats available
                        </Text>
                      </View>
                      <View style={styles.modalDetailItem}>
                        <Icon name="attach-money" size={18} color="#666" />
                        <Text style={styles.modalDetailText}>
                          Rs. {selectedCarpool?.carpool?.pricePerSeat || 'N/A'} per person
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.modalJoinButton}
                      onPress={confirmJoinCarpool}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#FFD700', '#FFC107']}
                        style={styles.modalJoinGradient}
                      >
                        <Icon name="check" size={20} color="#121212" />
                        <Text style={styles.modalJoinText}>Confirm Join</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </Animatable.View>
            </View>
          </Modal>
        </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  tabContainer: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#333', 
    backgroundColor: '#1E1E1E' 
  },
  tab: { 
    flex: 1, 
    paddingVertical: 16, 
    alignItems: 'center' 
  },
  activeTab: { 
    borderBottomWidth: 2, 
    borderBottomColor: '#FFD700' 
  },
  tabText: { 
    color: '#888', 
    fontWeight: 'bold' 
  },
  activeTabText: { 
    color: '#FFD700' 
  },
  floatingBtnContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  createNewBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
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
    paddingBottom: 15,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  helpButton: {
    padding: 4,
  },
  mapContainer: {
    height: 250,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  mapLoading: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  map: {
    flex: 1,
  },
  pickupMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(78, 205, 196, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ECDC4',
  },
  locationSection: {
    backgroundColor: '#1E1E1E',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    zIndex: 100,
    elevation: 100,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  useCurrentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  useCurrentText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '500',
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationDot: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  locationInputContainer: {
    flex: 1,
  },
  locationTextInput: {
    backgroundColor: '#2A2A2A',
    color: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  autocompleteContainer: {
    flex: 1,
  },
  autocompleteList: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 1000,
    maxHeight: 200,
  },
  autocompleteRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  autocompleteDescription: {
    color: '#FFF',
    fontSize: 14,
  },
  locationDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#FFF',
    fontSize: 16,
  },
  seatSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 25,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  seatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatCount: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  dateTimeText: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
  },
  carpoolCount: {
    color: '#888',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  carpoolsList: {
    gap: 12,
  },
  carpoolCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  carpoolCardFull: {
    opacity: 0.6,
  },
  carpoolGradient: {
    padding: 16,
  },
  carpoolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  carpoolUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    color: '#121212',
    fontSize: 18,
    fontWeight: 'bold',
  },
  carpoolName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#888',
    fontSize: 12,
  },
  seatsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  seatsBadgeFull: {
    backgroundColor: '#2A2A2A',
  },
  seatsText: {
    color: '#FFF',
    fontSize: 12,
  },
  seatsTextFull: {
    color: '#666',
  },
  carpoolRoute: {
    marginBottom: 12,
    paddingLeft: 4,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeDot: {
    width: 16,
    alignItems: 'center',
  },
  routeLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#333',
  },
  routeTime: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  routeTimeText: {
    color: '#888',
    fontSize: 10,
  },
  routeText: {
    color: '#AAA',
    fontSize: 13,
    flex: 1,
  },
  carpoolFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingTop: 12,
  },
  carpoolMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#666',
    fontSize: 12,
  },
  carpoolPrice: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  carpoolPriceFull: {
    color: '#666',
  },
  fullBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fullBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  expiredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#666',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expiredBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  noCarpools: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  noCarpoolsText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  noCarpoolsSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  createButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  createButtonText: {
    color: '#121212',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    maxHeight: height * 0.8,
  },
  modalGradient: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    gap: 20,
  },
  modalRoute: {
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  modalRoutePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalRouteLine: {
    width: 2,
    height: 12,
    backgroundColor: '#444',
    marginLeft: 3,
  },
  modalRouteText: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
  },
  modalDetails: {
    gap: 8,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 10,
  },
  modalDetailText: {
    color: '#FFF',
    fontSize: 14,
  },
  modalJoinButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  modalJoinGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  modalJoinText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapIconBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  mapPickerContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  mapPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E1E1E',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  mapPickerClose: {
    padding: 4,
  },
  mapPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  mapWrapper: {
    flex: 1,
  },
  pickerMap: {
    flex: 1,
  },
  mapMarkerFixed: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    zIndex: 10,
  },
  mapPickerFooter: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  mapPickerAddressText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  mapPickerConfirmBtn: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  mapPickerConfirmText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  requestButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  requestButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BookCarpoolScreen;
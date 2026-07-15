import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
  Linking,
  Switch
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconIonic from 'react-native-vector-icons/Ionicons';
import IconFA from 'react-native-vector-icons/FontAwesome5';
import CustomPlacesAutocomplete from '../../components/common/CustomPlacesAutocomplete';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { createRide } from '../../redux/slices/rideSlice';
import api from '../../services/api';
import { GOOGLE_MAPS_API_KEY } from '../../config/constants';

const { width, height } = Dimensions.get('window');

const BookRideScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { currentRide } = useSelector(state => state.ride);
  
  const [loading, setLoading] = useState(false);
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('car');
  const [fareMode, setFareMode] = useState('ai');
  const [offerPrice, setOfferPrice] = useState('');
  const [estimatedFare, setEstimatedFare] = useState(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showFareModal, setShowFareModal] = useState(false);
  const [searchingDriver, setSearchingDriver] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const mapRef = useRef(null);
  const [routeCoords, setRouteCoords] = useState([]);
  
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Map Picker State
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapPickerType, setMapPickerType] = useState('pickup'); // 'pickup' or 'dropoff'
  const [mapPickerCoords, setMapPickerCoords] = useState(null);
  const [mapPickerAddress, setMapPickerAddress] = useState('Loading address...');
  const pickerMapRef = useRef(null);

  // Guest Booking State
  const [isGuestBooking, setIsGuestBooking] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestRelation, setGuestRelation] = useState('');
  const [guestNote, setGuestNote] = useState('');

  useEffect(() => {
    animateEntrance();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (pickup && dropoff) {
      calculateFare();
      fetchRoute();
    } else {
      setRouteCoords([]);
    }
  }, [pickup, dropoff, selectedVehicle]);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'We need your location to set the pickup point. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
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
        location: {
          coordinates: [loc.coords.longitude, loc.coords.latitude]
        }
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
      console.log('Error fetching directions:', error);
      setRouteCoords([
        { latitude: startLat, longitude: startLng },
        { latitude: endLat, longitude: endLng }
      ]);
    }
  };

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

  const vehicleTypes = [
    { 
      id: 'bike', 
      label: 'Bike', 
      icon: 'motorcycle',
      iconType: 'material',
      price: 100,
      capacity: '1 Person',
      time: '5-10 min',
      color: '#FF6B6B'
    },
    { 
      id: 'rickshaw', 
      label: 'Rickshaw', 
      icon: 'bicycle',
      iconType: 'material-community',
      price: 150,
      capacity: '3 Persons',
      time: '10-15 min',
      color: '#FFD93D'
    },
    { 
      id: 'car', 
      label: 'Car', 
      icon: 'directions-car',
      iconType: 'material',
      price: 200,
      capacity: '4 Persons',
      time: '8-12 min',
      color: '#4ECDC4'
    }
  ];

  const calculateFare = async () => {
    if (!pickup || !dropoff) return;
    try {
      const response = await api.post('/rides/calculate-fare', {
        pickup: pickup.location,
        dropoff: dropoff.location,
        vehicleType: selectedVehicle
      });
      setEstimatedFare(response.data.fare);
    } catch (error) {
      console.error('Error calculating fare:', error);
    }
  };

  const handleBookRide = async () => {
    if (!pickup || !dropoff) {
      Alert.alert('Error', 'Please select pickup and dropoff locations');
      return;
    }

    if (!pickup.location?.coordinates || !dropoff.location?.coordinates) {
      Alert.alert('Error', 'Invalid location format. Please select addresses from the dropdown suggestions.');
      return;
    }

    if (fareMode === 'offer' && (!offerPrice || parseFloat(offerPrice) <= 0)) {
      Alert.alert('Error', 'Please enter a valid offer price');
      return;
    }

    if (isGuestBooking && !guestPhone) {
      Alert.alert('Error', 'Please enter the guest\'s phone number');
      return;
    }

    setLoading(true);
    try {
      const rideData = {
        pickup: {
          address: pickup.address,
          location: {
            type: 'Point',
            coordinates: pickup.location.coordinates
          },
          placeId: pickup.placeId
        },
        dropoff: {
          address: dropoff.address,
          location: {
            type: 'Point',
            coordinates: dropoff.location.coordinates
          },
          placeId: dropoff.placeId
        },
        vehicleType: selectedVehicle,
        type: 'solo',
        fare: {
          type: fareMode,
          amount: fareMode === 'ai' ? (estimatedFare?.total ?? estimatedFare ?? 0) : parseFloat(offerPrice),
          offered: fareMode === 'offer' ? parseFloat(offerPrice) : null
        },
        ...(isGuestBooking && {
          guest: {
            isGuestBooking: true,
            name: guestName,
            phoneNumber: guestPhone,
            relation: guestRelation,
            note: guestNote
          }
        })
      };

      const result = await dispatch(createRide(rideData)).unwrap();
      if (result.success) {
        setSearchingDriver(true);
        // Simulate driver search
        setTimeout(() => {
          setSearchingDriver(false);
          navigation.navigate('RideTracking', { 
            rideId: result.ride._id,
            rideData: result.ride
          });
        }, 3000);
      }
    } catch (error) {
      Alert.alert('Booking Failed', error.message || 'Unable to book ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (icon, iconType, size, color) => {
    switch (iconType) {
      case 'material':
        return <Icon name={icon} size={size} color={color} />;
      case 'material-community':
        return <IconIonic name={icon} size={size} color={color} />;
      default:
        return <Icon name={icon} size={size} color={color} />;
    }
  };

  const renderVehicleCard = (vehicle) => (
    <TouchableOpacity
      key={vehicle.id}
      style={[
        styles.vehicleCard,
        selectedVehicle === vehicle.id && styles.vehicleCardSelected
      ]}
      onPress={() => setSelectedVehicle(vehicle.id)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={selectedVehicle === vehicle.id ? 
          [vehicle.color + '30', vehicle.color + '10'] : 
          ['#2A2A2A', '#1E1E1E']}
        style={styles.vehicleGradient}
      >
        <View style={[
          styles.vehicleIconContainer,
          { backgroundColor: selectedVehicle === vehicle.id ? vehicle.color + '20' : '#2A2A2A' }
        ]}>
          {getIcon(vehicle.icon, vehicle.iconType, 28, 
            selectedVehicle === vehicle.id ? vehicle.color : '#666'
          )}
        </View>
        <Text style={[
          styles.vehicleLabel,
          selectedVehicle === vehicle.id && { color: vehicle.color }
        ]}>
          {vehicle.label}
        </Text>
        <Text style={styles.vehiclePrice}>Rs.{vehicle.price}</Text>
        <View style={styles.vehicleMeta}>
          <View style={styles.vehicleMetaItem}>
            <Icon name="person" size={12} color="#666" />
            <Text style={styles.vehicleMetaText}>{vehicle.capacity}</Text>
          </View>
          <View style={styles.vehicleMetaItem}>
            <Icon name="access-time" size={12} color="#666" />
            <Text style={styles.vehicleMetaText}>{vehicle.time}</Text>
          </View>
        </View>
        {selectedVehicle === vehicle.id && (
          <View style={styles.selectedBadge}>
            <Icon name="check-circle" size={16} color={vehicle.color} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
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
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Book a Ride</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Active Ride Banner */}
          {currentRide && (currentRide.status === 'searching' || currentRide.status === 'accepted' || currentRide.status === 'started') && (
            <TouchableOpacity 
              style={styles.activeRideBanner}
              onPress={() => navigation.navigate('RideTracking', { rideId: currentRide._id })}
              activeOpacity={0.8}
            >
              <View style={styles.activeRideBannerContent}>
                <Icon name="directions-car" size={24} color="#121212" />
                <Text style={styles.activeRideBannerText}>
                  Active Ride ({currentRide.status})
                </Text>
              </View>
              <Icon name="arrow-forward" size={24} color="#121212" />
            </TouchableOpacity>
          )}

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
              <View style={styles.locationHeader}>
                <Text style={styles.locationTitle}>Where to?</Text>
                <TouchableOpacity style={styles.locationAction}>
                  <Icon name="my-location" size={20} color="#FFD700" />
                  <Text style={styles.locationActionText}>Use Current</Text>
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

              {pickup && dropoff && estimatedFare && (
                <View style={styles.farePreview}>
                  <View style={styles.farePreviewLeft}>
                    <Icon name="info" size={16} color="#FFD700" />
                    <Text style={styles.farePreviewText}>
                      Estimated Fare: Rs.{estimatedFare?.total ?? estimatedFare}
                    </Text>
                  </View>
                  <View style={styles.farePreviewDistance}>
                    <Icon name="near-me" size={14} color="#666" />
                    <Text style={styles.distanceText}>2.5 km</Text>
                  </View>
                </View>
              )}
            </Animatable.View>

            {/* Vehicle Selection */}
            <Animatable.View 
              animation="fadeInUp" 
              duration={600} 
              delay={200}
              style={styles.section}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Select Vehicle</Text>
                <TouchableOpacity onPress={() => setShowVehicleModal(true)}>
                  <Text style={styles.seeAll}>View All</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.vehicleScrollContent}
              >
                {vehicleTypes.map(vehicle => renderVehicleCard(vehicle))}
              </ScrollView>
            </Animatable.View>

            {/* Guest Booking */}
            <Animatable.View 
              animation="fadeInUp" 
              duration={600} 
              delay={250}
              style={styles.section}
            >
              <View style={styles.guestToggleContainer}>
                <View style={styles.guestToggleLeft}>
                  <Icon name="person-add" size={24} color="#FFD700" />
                  <Text style={styles.guestToggleText}>Book for someone else</Text>
                </View>
                <Switch
                  value={isGuestBooking}
                  onValueChange={setIsGuestBooking}
                  trackColor={{ false: '#767577', true: '#FFD700' }}
                  thumbColor={isGuestBooking ? '#121212' : '#f4f3f4'}
                />
              </View>

              {isGuestBooking && (
                <View style={styles.guestInputContainer}>
                  <TextInput
                    style={styles.guestInput}
                    placeholder="Guest Phone Number *"
                    placeholderTextColor="#666"
                    keyboardType="phone-pad"
                    value={guestPhone}
                    onChangeText={setGuestPhone}
                  />
                  <TextInput
                    style={styles.guestInput}
                    placeholder="Guest Name (Optional)"
                    placeholderTextColor="#666"
                    value={guestName}
                    onChangeText={setGuestName}
                  />
                  <TextInput
                    style={styles.guestInput}
                    placeholder="Relation (e.g. Mother, Friend)"
                    placeholderTextColor="#666"
                    value={guestRelation}
                    onChangeText={setGuestRelation}
                  />
                  <TextInput
                    style={[styles.guestInput, { height: 80, textAlignVertical: 'top' }]}
                    placeholder="Comment / Note for Driver"
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={3}
                    value={guestNote}
                    onChangeText={setGuestNote}
                  />
                </View>
              )}
            </Animatable.View>

            {/* Fare Mode */}
            <Animatable.View 
              animation="fadeInUp" 
              duration={600} 
              delay={300}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>Choose Fare Mode</Text>
              <View style={styles.fareModeContainer}>
                <TouchableOpacity
                  style={[
                    styles.fareMode,
                    fareMode === 'ai' && styles.fareModeSelected
                  ]}
                  onPress={() => setFareMode('ai')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={fareMode === 'ai' ? 
                      ['#FFD700', '#FFC107'] : 
                      ['#2A2A2A', '#1E1E1E']}
                    style={styles.fareModeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.fareModeContent}>
                      <Icon 
                        name="auto-awesome" 
                        size={28} 
                        color={fareMode === 'ai' ? '#121212' : '#888'} 
                      />
                      <Text style={[
                        styles.fareModeText,
                        fareMode === 'ai' && { color: '#121212' }
                      ]}>
                        AI Price
                      </Text>
                      {estimatedFare && (
                        <Text style={[
                          styles.fareAmount,
                          fareMode === 'ai' && { color: '#121212' }
                        ]}>
                          Rs.{estimatedFare?.total ?? estimatedFare}
                        </Text>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.fareMode,
                    fareMode === 'offer' && styles.fareModeSelected
                  ]}
                  onPress={() => setFareMode('offer')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={fareMode === 'offer' ? 
                      ['#4ECDC4', '#44B39D'] : 
                      ['#2A2A2A', '#1E1E1E']}
                    style={styles.fareModeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.fareModeContent}>
                      <Icon 
                        name="attach-money" 
                        size={28} 
                        color={fareMode === 'offer' ? '#121212' : '#888'} 
                      />
                      <Text style={[
                        styles.fareModeText,
                        fareMode === 'offer' && { color: '#121212' }
                      ]}>
                        Offer Price
                      </Text>
                      {fareMode === 'offer' && (
                        <TextInput
                          style={[
                            styles.offerInput,
                            fareMode === 'offer' && { 
                              backgroundColor: 'rgba(255,255,255,0.2)',
                              color: '#121212'
                            }
                          ]}
                          placeholder="Enter amount"
                          placeholderTextColor={fareMode === 'offer' ? 'rgba(0,0,0,0.5)' : '#666'}
                          keyboardType="numeric"
                          value={offerPrice}
                          onChangeText={setOfferPrice}
                        />
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animatable.View>

            {/* Book Button */}
            <Animatable.View 
              animation="fadeInUp" 
              duration={600} 
              delay={400}
              style={styles.bookButtonContainer}
            >
              <TouchableOpacity
                style={styles.bookButton}
                onPress={handleBookRide}
                disabled={loading || searchingDriver}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FFD700', '#FFC107']}
                  style={styles.bookButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading || searchingDriver ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#121212" size="small" />
                      <Text style={styles.loadingText}>
                        {searchingDriver ? 'Finding Driver...' : 'Booking...'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.bookButtonText}>Book Ride</Text>
                      <Icon name="arrow-forward" size={24} color="#121212" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animatable.View>

            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Vehicle Modal */}
          <Modal
            visible={showVehicleModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowVehicleModal(false)}
          >
            <View style={styles.modalOverlay}>
              <TouchableOpacity 
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={() => setShowVehicleModal(false)}
              />
              <Animatable.View 
                animation="slideInUp" 
                duration={400}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Vehicle</Text>
                  <TouchableOpacity 
                    onPress={() => setShowVehicleModal(false)}
                    style={styles.modalClose}
                  >
                    <Icon name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  {vehicleTypes.map(vehicle => (
                    <TouchableOpacity
                      key={vehicle.id}
                      style={[
                        styles.modalVehicleItem,
                        selectedVehicle === vehicle.id && styles.modalVehicleSelected
                      ]}
                      onPress={() => {
                        setSelectedVehicle(vehicle.id);
                        setShowVehicleModal(false);
                      }}
                    >
                      <View style={[
                        styles.modalVehicleIcon,
                        { backgroundColor: vehicle.color + '20' }
                      ]}>
                        {getIcon(vehicle.icon, vehicle.iconType, 28, vehicle.color)}
                      </View>
                      <View style={styles.modalVehicleInfo}>
                        <Text style={styles.modalVehicleLabel}>{vehicle.label}</Text>
                        <Text style={styles.modalVehicleCapacity}>
                          {vehicle.capacity} • {vehicle.time}
                        </Text>
                      </View>
                      <Text style={styles.modalVehiclePrice}>Rs.{vehicle.price}</Text>
                      {selectedVehicle === vehicle.id && (
                        <Icon name="check-circle" size={24} color={vehicle.color} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animatable.View>
            </View>
          </Modal>
          {/* Map Picker Modal */}
          <Modal visible={mapPickerVisible} animationType="slide">
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity onPress={() => setMapPickerVisible(false)} style={styles.pickerBackBtn}>
                  <Icon name="arrow-back" size={24} color="#121212" />
                </TouchableOpacity>
                <Text style={styles.pickerModalTitle}>Select {mapPickerType === 'pickup' ? 'Pickup' : 'Dropoff'}</Text>
                <View style={{ width: 32 }} />
              </View>
              {mapPickerCoords && (
                <MapView
                  key={`${mapPickerType}-${mapPickerVisible}`}
                  ref={pickerMapRef}
                  style={styles.pickerMap}
                  initialRegion={{
                    latitude: mapPickerCoords.latitude,
                    longitude: mapPickerCoords.longitude,
                    latitudeDelta: 0.002,
                    longitudeDelta: 0.002,
                  }}
                  onRegionChangeComplete={onPickerRegionChangeComplete}
                  showsUserLocation
                />
              )}
              <View style={styles.pickerCenterPin}>
                <Icon name="location-on" size={40} color={mapPickerType === 'pickup' ? "#4ECDC4" : "#FF6B6B"} />
              </View>
              <View style={styles.pickerBottomCard}>
                <Text style={styles.pickerAddressLabel}>Selected Location</Text>
                <Text style={styles.pickerAddressText}>{mapPickerAddress}</Text>
                <TouchableOpacity style={styles.pickerConfirmBtn} onPress={confirmMapPicker}>
                  <Text style={styles.pickerConfirmText}>Confirm Location</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </Animated.View>
      </KeyboardAvoidingView>
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
    paddingBottom: 15,
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerRight: {
    width: 32,
  },
  locationSection: {
    backgroundColor: '#1E1E1E',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    zIndex: 100,
    elevation: 100,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  locationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationActionText: {
    color: '#FFD700',
    fontSize: 13,
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  autocompleteContainer: {
    flex: 1,
    zIndex: 999,
  },
  autocompleteList: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    width: '100%',
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
  farePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  farePreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  farePreviewText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '500',
  },
  farePreviewDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    color: '#666',
    fontSize: 12,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  seeAll: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '500',
  },
  vehicleScrollContent: {
    paddingHorizontal: 4,
  },
  vehicleCard: {
    width: 150,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  vehicleCardSelected: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  vehicleGradient: {
    padding: 16,
    alignItems: 'center',
  },
  vehicleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  vehiclePrice: {
    color: '#888',
    fontSize: 12,
    marginBottom: 6,
  },
  vehicleMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleMetaText: {
    color: '#666',
    fontSize: 10,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  fareModeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  fareMode: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fareModeSelected: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  fareModeGradient: {
    padding: 16,
  },
  fareModeContent: {
    alignItems: 'center',
  },
  fareModeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
  },
  fareAmount: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  offerInput: {
    backgroundColor: '#2A2A2A',
    color: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
    width: '100%',
    fontSize: 14,
    textAlign: 'center',
  },
  bookButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  bookButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  bookButtonText: {
    color: '#121212',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '500',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalClose: {
    padding: 4,
  },
  modalVehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalVehicleSelected: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  modalVehicleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalVehicleInfo: {
    flex: 1,
  },
  modalVehicleLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalVehicleCapacity: {
    color: '#666',
    fontSize: 12,
  },
  modalVehiclePrice: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  mapIconBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  activeRideBanner: {
    backgroundColor: '#FFD700',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
  },
  activeRideBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeRideBannerText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  pickerModalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  pickerBackBtn: {
    padding: 4,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#121212',
  },
  pickerMap: {
    flex: 1,
  },
  pickerCenterPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    zIndex: 10,
  },
  pickerBottomCard: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  pickerAddressLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  pickerAddressText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  pickerConfirmBtn: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pickerConfirmText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333'
  },
  guestToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestToggleText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  guestInputContainer: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333'
  },
  guestInput: {
    backgroundColor: '#2A2A2A',
    color: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    fontSize: 14,
  }
});

export default BookRideScreen;
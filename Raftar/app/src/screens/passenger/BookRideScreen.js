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
import IconMC from 'react-native-vector-icons/MaterialCommunityIcons';
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
  const [isGuestBooking, setIsGuestBooking] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestRelation, setGuestRelation] = useState('');
  const [guestNote, setGuestNote] = useState('');

  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapPickerType, setMapPickerType] = useState('pickup');
  const [mapPickerCoords, setMapPickerCoords] = useState(null);
  const [mapPickerAddress, setMapPickerAddress] = useState('Loading address...');
  const pickerMapRef = useRef(null);

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
          'We need your location to set the pickup point.',
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
      icon: 'motorbike',
      iconType: 'material-community',
      price: 100,
      capacity: '1 Person',
      time: '5-10 min',
      color: '#FF6B6B'
    },
    { 
      id: 'rickshaw', 
      label: 'Rickshaw', 
      icon: 'rickshaw',
      iconType: 'material-community',
      price: 150,
      capacity: '3 Persons',
      time: '10-15 min',
      color: '#FF9F43'
    },
    { 
      id: 'car', 
      label: 'Car', 
      icon: 'car',
      iconType: 'material-community',
      price: 200,
      capacity: '4 Persons',
      time: '8-12 min',
      color: '#F9C349'
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
        return <IconMC name={icon} size={size} color={color} />;
      case 'fontawesome':
        return <IconFA name={icon} size={size} color={color} />;
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
      activeOpacity={0.9}
    >
      <View style={[
        styles.vehicleCardContent,
        selectedVehicle === vehicle.id && { borderColor: vehicle.color }
      ]}>
        <View style={[
          styles.vehicleIconContainer,
          { backgroundColor: selectedVehicle === vehicle.id ? vehicle.color + '15' : '#F5F5F5' }
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
        <Text style={styles.vehiclePrice}>₨ {vehicle.price}</Text>
        <View style={styles.vehicleMeta}>
          <View style={styles.vehicleMetaItem}>
            <Icon name="person" size={12} color="#999" />
            <Text style={styles.vehicleMetaText}>{vehicle.capacity}</Text>
          </View>
          <View style={styles.vehicleMetaItem}>
            <Icon name="access-time" size={12} color="#999" />
            <Text style={styles.vehicleMetaText}>{vehicle.time}</Text>
          </View>
        </View>
        {selectedVehicle === vehicle.id && (
          <View style={[styles.selectedBadge, { backgroundColor: vehicle.color }]}>
            <Icon name="check" size={12} color="#FFF" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
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
              <Icon name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Book a Ride</Text>
            <TouchableOpacity style={styles.notificationButton}>
              <Icon name="notifications-none" size={24} color="#000" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          {/* Active Ride Banner */}
          {currentRide && (currentRide.status === 'searching' || currentRide.status === 'accepted' || currentRide.status === 'started') && (
            <Animatable.View animation="fadeIn" duration={500} style={styles.activeRideBanner}>
              <View style={styles.activeRideBannerContent}>
                <View style={styles.activeRideIcon}>
                  <Icon name="directions-car" size={20} color="#F9C349" />
                </View>
                <View>
                  <Text style={styles.activeRideBannerTitle}>Active Ride</Text>
                  <Text style={styles.activeRideBannerStatus}>{currentRide.status}</Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => navigation.navigate('RideTracking', { rideId: currentRide._id })}
              >
                <Icon name="arrow-forward" size={24} color="#F9C349" />
              </TouchableOpacity>
            </Animatable.View>
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
                  <ActivityIndicator size="large" color="#F9C349" />
                  <Text style={styles.mapLoadingText}>Finding your location...</Text>
                </View>
              ) : (
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={{
                    latitude: pickup?.location?.coordinates[1] || 33.6844,
                    longitude: pickup?.location?.coordinates[0] || 73.0479,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
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
                      <View style={styles.dropoffMarker}>
                        <Icon name="flag" size={18} color="#FFF" />
                      </View>
                    </Marker>
                  )}
                  {routeCoords.length > 0 && (
                    <Polyline
                      coordinates={routeCoords}
                      strokeWidth={4}
                      strokeColor="#F9C349"
                    />
                  )}
                </MapView>
              )}
              <TouchableOpacity style={styles.mapOverlayBtn} onPress={() => openMapPicker('pickup')}>
                <Icon name="edit-location" size={20} color="#F9C349" />
              </TouchableOpacity>
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
                <TouchableOpacity style={styles.locationAction} onPress={getCurrentLocation}>
                  <Icon name="my-location" size={20} color="#F9C349" />
                  <Text style={styles.locationActionText}>Current</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.locationInputWrapper}>
                <View style={styles.locationDot}>
                  <View style={[styles.dot, { backgroundColor: '#4ECDC4' }]} />
                  <View style={styles.dotLine} />
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
                      textInputContainer: styles.pickupInputContainer,
                      textInput: styles.pickupTextInput,
                      container: styles.autocompleteContainer,
                      listView: styles.autocompleteList,
                      row: styles.autocompleteRow,
                      description: styles.autocompleteDescription
                    }}
                    placeholderTextColor="#999"
                    renderRightButton={() => (
                      <TouchableOpacity onPress={() => openMapPicker('pickup')} style={styles.mapIconBtn}>
                        <Icon name="map" size={22} color="#4ECDC4" />
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>

              <View style={styles.locationDivider} />

              <View style={styles.locationInputWrapper}>
                <View style={styles.locationDot}>
                  <View style={[styles.dot, { backgroundColor: '#FF6B6B' }]} />
                </View>
                <View style={styles.locationInputContainer}>
                  <CustomPlacesAutocomplete
                    ref={dropoffRef}
                    placeholder="Where to?"
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
                      textInputContainer: styles.dropoffInputContainer,
                      textInput: styles.dropoffTextInput,
                      container: styles.autocompleteContainer,
                      listView: styles.autocompleteList,
                      row: styles.autocompleteRow,
                      description: styles.autocompleteDescription
                    }}
                    placeholderTextColor="#999"
                    renderRightButton={() => (
                      <TouchableOpacity onPress={() => openMapPicker('dropoff')} style={styles.mapIconBtn}>
                        <Icon name="map" size={22} color="#FF6B6B" />
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>

              {pickup && dropoff && estimatedFare && (
                <Animatable.View animation="fadeIn" duration={400} style={styles.farePreview}>
                  <View style={styles.farePreviewLeft}>
                    <View style={styles.farePreviewIcon}>
                      <Icon name="info" size={14} color="#F9C349" />
                    </View>
                    <Text style={styles.farePreviewText}>
                      Estimated Fare: ₨ {estimatedFare?.total ?? estimatedFare}
                    </Text>
                  </View>
                  <View style={styles.farePreviewDistance}>
                    <Icon name="near-me" size={14} color="#999" />
                    <Text style={styles.distanceText}>2.5 km</Text>
                  </View>
                </Animatable.View>
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
                  <Text style={styles.seeAll}>See All</Text>
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
              <TouchableOpacity 
                style={styles.guestToggleContainer}
                onPress={() => setIsGuestBooking(!isGuestBooking)}
                activeOpacity={0.7}
              >
                <View style={styles.guestToggleLeft}>
                  <View style={styles.guestToggleIcon}>
                    <Icon name="person-add" size={20} color="#F9C349" />
                  </View>
                  <Text style={styles.guestToggleText}>Book for someone else</Text>
                </View>
                <Switch
                  value={isGuestBooking}
                  onValueChange={setIsGuestBooking}
                  trackColor={{ false: '#E0E0E0', true: '#F9C349' }}
                  thumbColor={isGuestBooking ? '#FFFFFF' : '#FFFFFF'}
                  ios_backgroundColor="#E0E0E0"
                />
              </TouchableOpacity>

              {isGuestBooking && (
                <Animatable.View animation="fadeIn" duration={300} style={styles.guestInputContainer}>
                  <View style={styles.guestInputWrapper}>
                    <Icon name="phone" size={20} color="#F9C349" style={styles.guestInputIcon} />
                    <TextInput
                      style={styles.guestInput}
                      placeholder="Guest Phone Number *"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                      value={guestPhone}
                      onChangeText={setGuestPhone}
                    />
                  </View>
                  <View style={styles.guestInputWrapper}>
                    <Icon name="person" size={20} color="#F9C349" style={styles.guestInputIcon} />
                    <TextInput
                      style={styles.guestInput}
                      placeholder="Guest Name (Optional)"
                      placeholderTextColor="#999"
                      value={guestName}
                      onChangeText={setGuestName}
                    />
                  </View>
                  <View style={styles.guestInputWrapper}>
                    <Icon name="people" size={20} color="#F9C349" style={styles.guestInputIcon} />
                    <TextInput
                      style={styles.guestInput}
                      placeholder="Relation (e.g. Mother, Friend)"
                      placeholderTextColor="#999"
                      value={guestRelation}
                      onChangeText={setGuestRelation}
                    />
                  </View>
                  <View style={[styles.guestInputWrapper, styles.guestInputWrapperNote]}>
                    <Icon name="notes" size={20} color="#F9C349" style={styles.guestInputIcon} />
                    <TextInput
                      style={[styles.guestInput, styles.guestInputNote]}
                      placeholder="Comment / Note for Driver"
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={3}
                      value={guestNote}
                      onChangeText={setGuestNote}
                    />
                  </View>
                </Animatable.View>
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
                  <View style={[
                    styles.fareModeContent,
                    fareMode === 'ai' && { backgroundColor: '#F9C349' }
                  ]}>
                    <View style={styles.fareModeIcon}>
                      <Icon 
                        name="auto-awesome" 
                        size={24} 
                        color={fareMode === 'ai' ? '#000' : '#999'} 
                      />
                    </View>
                    <Text style={[
                      styles.fareModeText,
                      fareMode === 'ai' && { color: '#000' }
                    ]}>
                      AI Price
                    </Text>
                    {estimatedFare && (
                      <Text style={[
                        styles.fareAmount,
                        fareMode === 'ai' && { color: '#000' }
                      ]}>
                        ₨ {estimatedFare?.total ?? estimatedFare}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.fareMode,
                    fareMode === 'offer' && styles.fareModeSelected
                  ]}
                  onPress={() => setFareMode('offer')}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.fareModeContent,
                    fareMode === 'offer' && { backgroundColor: '#F9C349' }
                  ]}>
                    <View style={styles.fareModeIcon}>
                      <Icon 
                        name="attach-money" 
                        size={24} 
                        color={fareMode === 'offer' ? '#000' : '#999'} 
                      />
                    </View>
                    <Text style={[
                      styles.fareModeText,
                      fareMode === 'offer' && { color: '#000' }
                    ]}>
                      Offer Price
                    </Text>
                    {fareMode === 'offer' && (
                      <TextInput
                        style={[
                          styles.offerInput,
                          fareMode === 'offer' && { 
                            backgroundColor: 'rgba(255,255,255,0.3)',
                            color: '#000'
                          }
                        ]}
                        placeholder="Enter amount"
                        placeholderTextColor={fareMode === 'offer' ? 'rgba(0,0,0,0.4)' : '#999'}
                        keyboardType="numeric"
                        value={offerPrice}
                        onChangeText={setOfferPrice}
                      />
                    )}
                  </View>
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
                {loading || searchingDriver ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#000" size="small" />
                    <Text style={styles.loadingText}>
                      {searchingDriver ? 'Finding Driver...' : 'Booking...'}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.bookButtonText}>Book Ride</Text>
                    <Icon name="arrow-forward" size={24} color="#000" />
                  </>
                )}
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
                    <Icon name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
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
                        { backgroundColor: vehicle.color + '15' }
                      ]}>
                        {getIcon(vehicle.icon, vehicle.iconType, 28, vehicle.color)}
                      </View>
                      <View style={styles.modalVehicleInfo}>
                        <Text style={styles.modalVehicleLabel}>{vehicle.label}</Text>
                        <Text style={styles.modalVehicleCapacity}>
                          {vehicle.capacity} • {vehicle.time}
                        </Text>
                      </View>
                      <Text style={styles.modalVehiclePrice}>₨ {vehicle.price}</Text>
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
                  <Icon name="arrow-back" size={24} color="#000" />
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
                <Icon name="location-on" size={44} color={mapPickerType === 'pickup' ? "#4ECDC4" : "#FF6B6B"} />
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
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    marginTop:34
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  notificationButton: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F9C349',
  },
  activeRideBanner: {
    backgroundColor: '#FFF8E1',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F9C349',
  },
  activeRideBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeRideIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9C34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeRideBannerTitle: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  activeRideBannerStatus: {
    color: '#666',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  mapContainer: {
    height: 200,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  mapLoading: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    color: '#999',
    marginTop: 12,
    fontSize: 14,
  },
  map: {
    flex: 1,
  },
  mapOverlayBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  pickupMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(78, 205, 196, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  markerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ECDC4',
  },
  dropoffMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  locationSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  locationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F9C34915',
    borderRadius: 20,
  },
  locationActionText: {
    color: '#F9C349',
    fontSize: 13,
    fontWeight: '500',
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDot: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E0E0E0',
    marginTop: 4,
  },
  locationInputContainer: {
    flex: 1,
  },
  pickupInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  pickupTextInput: {
    color: '#000',
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  dropoffInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  dropoffTextInput: {
    color: '#000',
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  autocompleteContainer: {
    flex: 1,
    zIndex: 999,
  },
  autocompleteList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    width: '100%',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  autocompleteRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  autocompleteDescription: {
    color: '#000',
    fontSize: 14,
  },
  locationDivider: {
    height: 0,
    marginVertical: 0,
  },
  farePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  farePreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  farePreviewIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F9C34915',
    justifyContent: 'center',
    alignItems: 'center',
  },
  farePreviewText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '500',
  },
  farePreviewDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: '#999',
    fontSize: 12,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  seeAll: {
    color: '#F9C349',
    fontSize: 14,
    fontWeight: '500',
  },
  vehicleScrollContent: {
    paddingHorizontal: 2,
    gap: 12,
  },
  vehicleCard: {
    width: 140,
    marginRight: 12,
  },
  vehicleCardSelected: {
    transform: [{ scale: 1.02 }],
  },
  vehicleCardContent: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  vehicleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleLabel: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  vehiclePrice: {
    color: '#999',
    fontSize: 13,
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
    color: '#999',
    fontSize: 10,
  },
  selectedBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  guestToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestToggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9C34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guestToggleText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '500',
  },
  guestInputContainer: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginTop: 10,
  },
  guestInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  guestInputWrapperNote: {
    alignItems: 'flex-start',
    paddingTop: 12,
    minHeight: 80,
  },
  guestInputIcon: {
    marginRight: 10,
  },
  guestInput: {
    color: '#000',
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  guestInputNote: {
    paddingTop: 0,
    minHeight: 60,
  },
  fareModeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  fareMode: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  fareModeSelected: {
    borderColor: '#F9C349',
  },
  fareModeContent: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  fareModeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  fareModeText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  fareAmount: {
    color: '#F9C349',
    fontSize: 18,
    fontWeight: '700',
  },
  offerInput: {
    backgroundColor: '#FFFFFF',
    color: '#000',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
    width: '100%',
    fontSize: 14,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bookButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  bookButton: {
    backgroundColor: '#F9C349',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#F9C349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  bookButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#000',
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  modalClose: {
    padding: 4,
  },
  modalVehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalVehicleSelected: {
    borderColor: '#F9C349',
    backgroundColor: '#F9C34915',
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
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  modalVehicleCapacity: {
    color: '#999',
    fontSize: 12,
  },
  modalVehiclePrice: {
    color: '#F9C349',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  mapIconBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  pickerModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerBackBtn: {
    padding: 4,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  pickerMap: {
    flex: 1,
  },
  pickerCenterPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -22,
    marginTop: -44,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pickerBottomCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  pickerAddressLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerAddressText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  pickerConfirmBtn: {
    backgroundColor: '#F9C349',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pickerConfirmText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookRideScreen;
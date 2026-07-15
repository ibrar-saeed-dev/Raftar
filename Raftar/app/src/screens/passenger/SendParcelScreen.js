import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconIonic from 'react-native-vector-icons/Ionicons';
import IconFA from 'react-native-vector-icons/FontAwesome5';
import CustomPlacesAutocomplete from '../../components/common/CustomPlacesAutocomplete';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { createRide } from '../../redux/slices/rideSlice';
import { GOOGLE_MAPS_API_KEY } from '../../config/constants';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

const SendParcelScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { loading } = useSelector(state => state.ride);
  
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [parcelDetails, setParcelDetails] = useState({
    size: 'bike',
    weight: '',
    description: '',
    receiverName: '',
    receiverPhone: '',
    codAmount: '',
    instructions: '',
    fragile: false,
    urgent: false
  });
  const [fareMode, setFareMode] = useState('ai');
  const [offerPrice, setOfferPrice] = useState('');
  const [estimatedFare, setEstimatedFare] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdParcelId, setCreatedParcelId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchingDriver, setSearchingDriver] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState([]);
  const mapRef = useRef(null);

  // Map Picker State
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerType, setMapPickerType] = useState('pickup');
  const [mapPickerCoords, setMapPickerCoords] = useState(null);
  const [mapPickerAddress, setMapPickerAddress] = useState('Loading address...');
  const pickupRef = useRef();
  const dropoffRef = useRef();
  const pickerMapRef = useRef(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true })
    ]).start();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (pickup && dropoff) {
      fetchRoute();
    } else {
      setRouteCoords([]);
    }
  }, [pickup, dropoff]);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
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
        },
        placeId: ''
      });
      pickupRef.current?.setAddressText(addressStr);
    } catch (e) {
      console.log('Location error', e);
    } finally {
      setLocationLoading(false);
    }
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

  const parcelSizes = [
    { id: 'bike', label: 'Bike', icon: 'motorcycle', iconType: 'material', price: 100, dimensions: 'Small parcels', capacity: 'Small' },
    { id: 'rickshaw', label: 'Rickshaw', icon: 'bicycle', iconType: 'material-community', price: 150, dimensions: 'Medium parcels', capacity: 'Medium' },
    { id: 'car', label: 'Car', icon: 'directions-car', iconType: 'material', price: 200, dimensions: 'Large parcels', capacity: 'Large' }
  ];

  const handleChange = (field, value) => {
    setParcelDetails({ ...parcelDetails, [field]: value });
  };

  const openMapPicker = async (type) => {
    setMapPickerType(type);
    setShowMapPicker(true);
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
    
    setTimeout(() => {
      if (pickerMapRef.current && coords) {
        pickerMapRef.current.animateToRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 100);
      }
    }, 500);
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
    const newLoc = {
      address: mapPickerAddress,
      location: {
        type: 'Point',
        coordinates: [mapPickerCoords.longitude, mapPickerCoords.latitude]
      },
      placeId: ''
    };
    if (mapPickerType === 'pickup') {
      setPickup(newLoc);
      pickupRef.current?.setAddressText(newLoc.address);
    } else {
      setDropoff(newLoc);
      dropoffRef.current?.setAddressText(newLoc.address);
    }
    setShowMapPicker(false);
  };

  const validateForm = () => {
    if (!pickup) { Alert.alert('Error', 'Please enter pickup address'); return false; }
    if (!dropoff) { Alert.alert('Error', 'Please enter delivery address'); return false; }
    if (!parcelDetails.receiverName || parcelDetails.receiverName.trim().length < 2) { Alert.alert('Error', 'Please enter receiver name'); return false; }
    if (!parcelDetails.receiverPhone || parcelDetails.receiverPhone.length < 10) { Alert.alert('Error', 'Please enter a valid receiver phone number'); return false; }
    if (parcelDetails.weight && isNaN(parseFloat(parcelDetails.weight))) { Alert.alert('Error', 'Please enter a valid weight'); return false; }
    if (parcelDetails.codAmount && isNaN(parseFloat(parcelDetails.codAmount))) { Alert.alert('Error', 'Please enter a valid COD amount'); return false; }
    if (fareMode === 'offer' && (!offerPrice || parseFloat(offerPrice) <= 0)) { Alert.alert('Error', 'Please enter a valid offer price'); return false; }
    return true;
  };

  const handleCreateParcel = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const rideData = {
        pickup: {
          address: pickup.address,
          location: { type: 'Point', coordinates: pickup.location.coordinates },
          placeId: pickup.placeId || ''
        },
        dropoff: {
          address: dropoff.address,
          location: { type: 'Point', coordinates: dropoff.location.coordinates },
          placeId: dropoff.placeId || ''
        },
        vehicleType: parcelDetails.size,
        type: 'parcel',
        fare: {
          type: fareMode,
          amount: fareMode === 'ai' ? 100 : parseFloat(offerPrice),
          offered: fareMode === 'offer' ? parseFloat(offerPrice) : null
        },
        parcel: {
          ...parcelDetails,
          size: parcelDetails.size === 'car' ? 'large' : parcelDetails.size === 'rickshaw' ? 'medium' : 'small',
          weight: parseFloat(parcelDetails.weight) || 0,
          codAmount: parseFloat(parcelDetails.codAmount) || 0,
          senderName: user?.name || 'Guest',
          senderPhone: user?.phoneNumber || ''
        }
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
      Alert.alert('Error', error.message || 'Failed to create parcel delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = (icon, iconType, size, color) => {
    switch (iconType) {
      case 'material': return <Icon name={icon} size={size} color={color} />;
      case 'ionicon': return <IconIonic name={icon} size={size} color={color} />;
      default: return <Icon name={icon} size={size} color={color} />;
    }
  };

  const renderParcelSize = (size) => {
    const isSelected = parcelDetails.size === size.id;
    return (
      <TouchableOpacity
        key={size.id}
        style={[styles.sizeCard, isSelected && styles.sizeCardSelected]}
        onPress={() => handleChange('size', size.id)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isSelected ? ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)'] : ['#2A2A2A', '#1E1E1E']}
          style={styles.sizeGradient}
        >
          <View style={[styles.sizeIconContainer, isSelected && { backgroundColor: 'rgba(255, 215, 0, 0.2)' }]}>
            {getIcon(size.icon, size.iconType, 32, isSelected ? '#FFD700' : '#666')}
          </View>
          <Text style={[styles.sizeLabel, isSelected && styles.sizeLabelSelected]}>{size.label}</Text>
          <Text style={[styles.sizePrice, isSelected && styles.sizePriceSelected]}>Rs. {size.price}</Text>
          <Text style={styles.sizeDimensions}>{size.dimensions}</Text>
          {isSelected && (
            <View style={styles.selectedCheck}>
              <Icon name="check-circle" size={20} color="#FFD700" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

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
            <Text style={styles.headerTitle}>Send Parcel</Text>
            <TouchableOpacity style={styles.historyButton}>
              <Icon name="history" size={24} color="#FFF" />
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

            {/* Pickup & Delivery Section */}
            <Animatable.View 
              animation="fadeInUp" 
              duration={600} 
              delay={100}
              style={styles.section}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📦 Pickup & Delivery</Text>
                <TouchableOpacity style={styles.quickFillButton}>
                  <Icon name="my-location" size={16} color="#FFD700" />
                  <Text style={styles.quickFillText}>Use Current</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.locationInputWrapper}>
                <View style={styles.locationDot}>
                  <View style={[styles.dot, { backgroundColor: '#4ECDC4' }]} />
                </View>
                <View style={styles.locationInputContainer}>
                  <CustomPlacesAutocomplete
                    ref={pickupRef}
                    placeholder="Pickup Address"
                    onPress={(data, details = null) => {
                      setPickup({
                        address: data.description,
                        location: {
                          coordinates: [
                            details.geometry.location.lng,
                            details.geometry.location.lat
                          ]
                        },
                        placeId: data.place_id
                      });
                    }}
                    styles={{
                      textInput: styles.locationTextInput,
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

              <View style={styles.locationInputWrapper}>
                <View style={styles.locationDot}>
                  <View style={[styles.dot, { backgroundColor: '#FF6B6B' }]} />
                </View>
                <View style={styles.locationInputContainer}>
                  <CustomPlacesAutocomplete
                    ref={dropoffRef}
                    placeholder="Delivery Address"
                    onPress={(data, details = null) => {
                      setDropoff({
                        address: data.description,
                        location: {
                          coordinates: [
                            details.geometry.location.lng,
                            details.geometry.location.lat
                          ]
                        },
                        placeId: data.place_id
                      });
                    }}
                    styles={{
                      textInput: styles.locationTextInput,
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
            </Animatable.View>

            {/* Parcel Details Section */}
            <Animatable.View 
              animation="fadeInUp" 
              duration={600} 
              delay={200}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>📋 Parcel Details</Text>
              
              <Text style={styles.sizeTitle}>Select Vehicle for Delivery</Text>
              <View style={styles.sizeContainer}>
                {parcelSizes.map(renderParcelSize)}
              </View>

              <View style={styles.inputGrid}>
                <View style={styles.inputHalf}>
                  <Input
                    label="Weight (kg)"
                    value={parcelDetails.weight}
                    onChangeText={(value) => handleChange('weight', value)}
                    placeholder="0.0"
                    keyboardType="numeric"
                    icon="scale"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Input
                    label="COD Amount"
                    value={parcelDetails.codAmount}
                    onChangeText={(value) => handleChange('codAmount', value)}
                    placeholder="0.00"
                    keyboardType="numeric"
                    icon="attach-money"
                  />
                </View>
              </View>

              <Input
                label="Description"
                value={parcelDetails.description}
                onChangeText={(value) => handleChange('description', value)}
                placeholder="Describe your parcel (e.g., Books, Electronics, Documents)"
                icon="description"
                multiline
                numberOfLines={3}
              />

              <Input
                label="Special Instructions"
                value={parcelDetails.instructions}
                onChangeText={(value) => handleChange('instructions', value)}
                placeholder="Any special instructions for delivery"
                icon="info"
                multiline
                numberOfLines={2}
              />

              <View style={styles.optionsRow}>
                <TouchableOpacity 
                  style={[styles.optionButton, parcelDetails.fragile && styles.optionButtonActive]}
                  onPress={() => handleChange('fragile', !parcelDetails.fragile)}
                >
                  <Icon name="warning" size={20} color={parcelDetails.fragile ? '#FFD700' : '#666'} />
                  <Text style={[styles.optionText, parcelDetails.fragile && styles.optionTextActive]}>
                    Fragile
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.optionButton, parcelDetails.urgent && styles.optionButtonActive]}
                  onPress={() => handleChange('urgent', !parcelDetails.urgent)}
                >
                  <Icon name="flash-on" size={20} color={parcelDetails.urgent ? '#FFD700' : '#666'} />
                  <Text style={[styles.optionText, parcelDetails.urgent && styles.optionTextActive]}>
                    Urgent
                  </Text>
                </TouchableOpacity>
              </View>
            </Animatable.View>

            {/* Receiver Details Section */}
            <Animatable.View 
              animation="fadeInUp" 
              duration={600} 
              delay={300}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>👤 Receiver Details</Text>
              
              <Input
                label="Receiver Name *"
                value={parcelDetails.receiverName}
                onChangeText={(value) => handleChange('receiverName', value)}
                placeholder="Enter receiver name"
                icon="person"
              />

              <Input
                label="Receiver Phone *"
                value={parcelDetails.receiverPhone}
                onChangeText={(value) => handleChange('receiverPhone', value)}
                placeholder="03XX-XXXXXXX"
                icon="phone"
                keyboardType="phone-pad"
              />
            </Animatable.View>

            {/* Fare Mode */}
            <Animatable.View 
              animation="fadeInUp" 
              duration={600} 
              delay={350}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>💵 Delivery Fare</Text>
              <View style={{flexDirection: 'row', gap: 12, marginTop: 12}}>
                <TouchableOpacity
                  style={[
                    {flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#2A2A2A', alignItems: 'center'},
                    fareMode === 'ai' && {borderWidth: 2, borderColor: '#FFD700'}
                  ]}
                  onPress={() => setFareMode('ai')}
                >
                  <Icon name="auto-awesome" size={24} color={fareMode === 'ai' ? '#FFD700' : '#888'} />
                  <Text style={{color: '#FFF', marginTop: 8}}>Standard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    {flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#2A2A2A', alignItems: 'center'},
                    fareMode === 'offer' && {borderWidth: 2, borderColor: '#4ECDC4'}
                  ]}
                  onPress={() => setFareMode('offer')}
                >
                  <Icon name="attach-money" size={24} color={fareMode === 'offer' ? '#4ECDC4' : '#888'} />
                  <Text style={{color: '#FFF', marginTop: 8}}>Offer Price</Text>
                </TouchableOpacity>
              </View>
              {fareMode === 'offer' && (
                <View style={{marginTop: 16}}>
                  <Input
                    label="Your Offer (Rs.)"
                    value={offerPrice}
                    onChangeText={setOfferPrice}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    icon="payments"
                  />
                </View>
              )}
            </Animatable.View>

            {/* Summary Section */}
            {pickup && dropoff && (
              <Animatable.View 
                animation="fadeInUp" 
                duration={600} 
                delay={400}
                style={styles.summarySection}
              >
                <LinearGradient
                  colors={['#1E1E1E', '#2A2A2A']}
                  style={styles.summaryGradient}
                >
                  <Text style={styles.summaryTitle}>📊 Delivery Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Parcel Size</Text>
                    <Text style={styles.summaryValue}>
                      {parcelSizes.find(s => s.id === parcelDetails.size)?.label || 'Medium'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Weight</Text>
                    <Text style={styles.summaryValue}>
                      {parcelDetails.weight ? `${parcelDetails.weight} kg` : 'Not specified'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>COD Amount</Text>
                    <Text style={styles.summaryValue}>
                      {parcelDetails.codAmount ? `Rs. ${parcelDetails.codAmount}` : 'Not specified'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Fragile</Text>
                    <Text style={styles.summaryValue}>
                      {parcelDetails.fragile ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryRowLast]}>
                    <Text style={styles.summaryLabel}>Urgent</Text>
                    <Text style={styles.summaryValue}>
                      {parcelDetails.urgent ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </LinearGradient>
              </Animatable.View>
            )}

            {/* Send Button */}
            <Animatable.View 
              animation="fadeInUp" 
              duration={600} 
              delay={500}
              style={styles.sendButtonContainer}
            >
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleCreateParcel}
                disabled={isSubmitting || loading || searchingDriver}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FFD700', '#FFC107']}
                  style={styles.sendButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isSubmitting || loading || searchingDriver ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#121212" size="small" />
                      <Text style={styles.loadingText}>
                        {searchingDriver ? 'Finding Driver...' : 'Sending...'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Icon name="send" size={24} color="#121212" />
                      <Text style={styles.sendButtonText}>Send Parcel</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animatable.View>

            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Map Picker Modal */}
          <Modal visible={showMapPicker} animationType="slide">
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity onPress={() => setShowMapPicker(false)} style={styles.pickerBackBtn}>
                  <Icon name="arrow-back" size={24} color="#121212" />
                </TouchableOpacity>
                <Text style={styles.pickerModalTitle}>Select {mapPickerType === 'pickup' ? 'Pickup' : 'Dropoff'}</Text>
                <View style={{ width: 32 }} />
              </View>
              {mapPickerCoords && (
                <MapView
                  key={`${mapPickerType}-${showMapPicker}`}
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
              <View style={styles.pickerCenterPin} pointerEvents="none">
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  historyButton: {
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
  quickFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickFillText: {
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
  sizeTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
  },
  sizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  sizeCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  sizeCardSelected: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  sizeGradient: {
    padding: 14,
    alignItems: 'center',
    position: 'relative',
  },
  sizeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sizeLabel: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  sizeLabelSelected: {
    color: '#FFD700',
  },
  sizePrice: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  sizePriceSelected: {
    color: '#FFD700',
  },
  sizeDimensions: {
    color: '#444',
    fontSize: 10,
    marginTop: 2,
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  inputGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  optionText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#FFD700',
  },
  summarySection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  summaryGradient: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  summaryTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    color: '#888',
    fontSize: 14,
  },
  summaryValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  sendButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sendButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  sendButtonText: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: width * 0.9,
    borderRadius: 30,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalSuccessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalDetails: {
    width: '100%',
    gap: 8,
    marginBottom: 24,
  },
  modalDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  modalDetailText: {
    color: '#FFF',
    fontSize: 14,
  },
  modalActions: {
    width: '100%',
    gap: 10,
  },
  modalActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalActionGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalActionText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSecondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSecondaryText: {
    color: '#666',
    fontSize: 16,
  },
  mapIconBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
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
});

export default SendParcelScreen;
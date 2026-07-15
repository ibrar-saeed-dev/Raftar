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
  FlatList,
  Linking
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconIonic from 'react-native-vector-icons/Ionicons';
import CustomPlacesAutocomplete from '../../components/common/CustomPlacesAutocomplete';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createRide, acceptCounterOffer } from '../../redux/slices/rideSlice';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { GOOGLE_MAPS_API_KEY } from '../../config/constants';
import Button from '../../components/common/Button';

const { width, height } = Dimensions.get('window');

const BookIntercityScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const socket = useSocket();
  
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'create' or 'mode_select'
  const [intercityMode, setIntercityMode] = useState('private'); // 'private' or 'carpool'
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'accepted'
  
  const [myRides, setMyRides] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('car');
  const [fareMode, setFareMode] = useState('ai');
  const [offerPrice, setOfferPrice] = useState('');
  const [estimatedFare, setEstimatedFare] = useState(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [searchingDriver, setSearchingDriver] = useState(false);
  
  const [schedule, setSchedule] = useState(new Date(Date.now() + 3600000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const mapRef = useRef(null);
  const [routeCoords, setRouteCoords] = useState([]);
  
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Map Picker State
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapPickerType, setMapPickerType] = useState('pickup');
  const [mapPickerCoords, setMapPickerCoords] = useState(null);
  const [mapPickerAddress, setMapPickerAddress] = useState('Loading address...');
  const pickerMapRef = useRef(null);

  useEffect(() => {
    animateEntrance();
    fetchMyIntercityRides();
    
    if (socket) {
      const refreshList = () => {
        fetchMyIntercityRides();
      };
      socket.on('counter-offer-received', refreshList);
      socket.on('ride-accepted', refreshList);
      return () => {
        socket.off('counter-offer-received', refreshList);
        socket.off('ride-accepted', refreshList);
      };
    }
  }, [socket]);

  useEffect(() => {
    if (viewMode === 'create' && locationLoading) {
      getCurrentLocation();
    }
  }, [viewMode]);

  useEffect(() => {
    if (pickup && dropoff) {
      calculateFare();
      fetchRoute();
    } else {
      setRouteCoords([]);
    }
  }, [pickup, dropoff, selectedVehicle]);

  const fetchMyIntercityRides = async () => {
    setListLoading(true);
    try {
      const response = await api.get('/rides/active');
      if (response.data?.success) {
        const active = response.data.rides.filter(r => r.type === 'intercity');
        setMyRides(active);
      }
    } catch (error) {
      console.error('Fetch intercity rides error:', error);
    } finally {
      setListLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is needed.', [
          { text: 'Cancel' },
          { text: 'Settings', onPress: () => Linking.openSettings() }
        ]);
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
        location: { coordinates: [loc.coords.longitude, loc.coords.latitude] },
        placeId: 'current_location'
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
      },
      placeId: `map_${Date.now()}`
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
        setRouteCoords([{ latitude: startLat, longitude: startLng }, { latitude: endLat, longitude: endLng }]);
      }
    } catch (error) {
      setRouteCoords([{ latitude: startLat, longitude: startLng }, { latitude: endLat, longitude: endLng }]);
    }
  };

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true })
    ]).start();
  };

  const vehicleTypes = [
    { 
      id: 'car', 
      label: 'Car', 
      icon: 'directions-car',
      iconType: 'material',
      price: 200,
      capacity: '4 Persons',
      color: '#4ECDC4'
    },
    { 
      id: 'rickshaw', 
      label: 'Rickshaw', 
      icon: 'bicycle',
      iconType: 'material-community',
      price: 150,
      capacity: '3 Persons',
      color: '#FFD93D'
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

  const handleBookIntercity = async () => {
    if (!pickup || !dropoff) {
      Alert.alert('Error', 'Please select pickup and dropoff locations');
      return;
    }

    if (schedule <= new Date()) {
      Alert.alert('Invalid Date', 'Please select a future date and time for intercity travel.');
      return;
    }

    if (fareMode === 'offer' && (!offerPrice || parseFloat(offerPrice) <= 0)) {
      Alert.alert('Error', 'Please enter a valid offer price');
      return;
    }

    setLoading(true);
    try {
      const rideData = {
        pickup: {
          address: pickup.address,
          location: { type: 'Point', coordinates: pickup.location.coordinates },
          placeId: pickup.placeId
        },
        dropoff: {
          address: dropoff.address,
          location: { type: 'Point', coordinates: dropoff.location.coordinates },
          placeId: dropoff.placeId
        },
        vehicleType: selectedVehicle,
        type: 'intercity',
        scheduledTime: schedule,
        fare: {
          type: fareMode,
          amount: fareMode === 'ai' ? (estimatedFare?.total ?? estimatedFare ?? 0) : parseFloat(offerPrice),
          offered: fareMode === 'offer' ? parseFloat(offerPrice) : null
        }
      };

      const result = await dispatch(createRide(rideData)).unwrap();
      if (result.success) {
        Alert.alert('Success', 'Intercity request posted!', [
          { text: 'OK', onPress: () => {
            setViewMode('list');
            fetchMyIntercityRides();
          }}
        ]);
      }
    } catch (error) {
      Alert.alert('Booking Failed', error.message || 'Unable to book ride.');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (icon, iconType, size, color) => {
    switch (iconType) {
      case 'material': return <Icon name={icon} size={size} color={color} />;
      case 'material-community': return <IconIonic name={icon} size={size} color={color} />;
      default: return <Icon name={icon} size={size} color={color} />;
    }
  };

  const handleAcceptOffer = async (rideId, driverId, amount) => {
    try {
      await dispatch(acceptCounterOffer({ rideId, driverId, amount })).unwrap();
      Alert.alert('Success', 'Ride accepted!');
      if (socket) {
        socket.emit('join-ride', rideId);
      }
      fetchMyIntercityRides();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to accept offer');
    }
  };

  const renderMyRide = ({ item }) => {
    const isAccepted = item.status === 'accepted' || item.status === 'started';
    return (
      <Animatable.View animation="fadeInUp" duration={400} style={{ marginBottom: 16 }}>
        <TouchableOpacity
          style={[styles.recentRideCard, { borderColor: isAccepted ? '#4ECDC4' : '#FFD700', borderWidth: 1 }]}
          onPress={() => navigation.navigate('RideTracking', { rideId: item._id })}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
              {item.scheduledTime ? new Date(item.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No Date'}
            </Text>
            <View style={[styles.rideStatus, { backgroundColor: isAccepted ? '#4ECDC4' : '#FFD700' }]}>
              <Text style={[styles.rideStatusText, !isAccepted && { color: '#000' }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Icon name="my-location" size={16} color="#4ECDC4" />
              <Text style={{ color: '#CCC', marginLeft: 8, flex: 1 }} numberOfLines={1}>{item.pickup?.address}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="location-on" size={16} color="#FF6B6B" />
              <Text style={{ color: '#CCC', marginLeft: 8, flex: 1 }} numberOfLines={1}>{item.dropoff?.address}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12, marginBottom: item.bids?.length > 0 ? 12 : 0 }}>
             <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>Rs. {item.fare?.accepted || item.fare?.offered || 0}</Text>
             <Text style={{ color: '#888' }}>{(item.vehicleType || 'Economy').toUpperCase()}</Text>
          </View>

          {item.bids && item.bids.length > 0 && !isAccepted && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: '#4ECDC4', fontWeight: 'bold', marginBottom: 8 }}>Available Offers:</Text>
              {item.bids.map((bid, index) => (
                <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2A2A2A', padding: 10, borderRadius: 8, marginBottom: 6 }}>
                  <View>
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Rs. {bid.fare}</Text>
                    <Text style={{ color: '#888', fontSize: 12 }}>Driver Offer</Text>
                  </View>
                  <Button 
                    title="Accept" 
                    size="small" 
                    onPress={() => handleAcceptOffer(item._id, bid.driverId?._id || bid.driverId, bid.fare)}
                    style={{ paddingHorizontal: 15, paddingVertical: 5 }} 
                  />
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  const pendingList = myRides.filter(r => r.status === 'searching' || r.status === 'scheduled');
  const acceptedList = myRides.filter(r => r.status === 'accepted' || r.status === 'started');

  const renderListView = () => (
    <View style={styles.listContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Intercity Rides</Text>
        <View style={{width: 24}} />
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.activeTab]} onPress={() => setActiveTab('pending')}>
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'accepted' && styles.activeTab]} onPress={() => setActiveTab('accepted')}>
          <Text style={[styles.tabText, activeTab === 'accepted' && styles.activeTabText]}>Accepted</Text>
        </TouchableOpacity>
      </View>

      {listLoading ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'pending' ? pendingList : acceptedList}
          renderItem={renderMyRide}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>
              No {activeTab} intercity rides right now.
            </Text>
          }
          refreshing={listLoading}
          onRefresh={fetchMyIntercityRides}
        />
      )}

      <View style={styles.floatingBtnContainer}>
        <Button 
          title="Book New Intercity"
          onPress={() => setViewMode('mode_select')}
          style={styles.createNewBtn}
          textStyle={{fontWeight: 'bold', fontSize: 16}}
        />
      </View>
    </View>
  );

  const renderModeSelect = () => (
    <View style={styles.listContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => setViewMode('list')}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Mode</Text>
        <View style={{width: 24}} />
      </View>
      <View style={{ padding: 20, gap: 20, flex: 1, justifyContent: 'center' }}>
        <TouchableOpacity 
          style={[styles.vehicleCardMode, { padding: 30, alignItems: 'center' }]} 
          onPress={() => setViewMode('create')}
        >
          <Icon name="directions-car" size={60} color="#FFD700" />
          <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 10 }}>Private Ride</Text>
          <Text style={{ color: '#888', textAlign: 'center', marginTop: 10 }}>Book a complete vehicle for your intercity travel.</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.vehicleCardMode, { padding: 30, alignItems: 'center' }]} 
          onPress={() => navigation.navigate('BookCarpool', { isIntercity: true })}
        >
          <Icon name="people" size={60} color="#4ECDC4" />
          <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 10 }}>Carpool</Text>
          <Text style={{ color: '#888', textAlign: 'center', marginTop: 10 }}>Share seats with others to save cost.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCreateView = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => setViewMode('mode_select')}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Private Intercity</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animatable.View animation="fadeIn" duration={600} style={styles.mapContainer}>
          {locationLoading ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#FFD700" />
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
                <Marker coordinate={{ latitude: pickup.location.coordinates[1], longitude: pickup.location.coordinates[0] }}>
                  <View style={styles.pickupMarker}><View style={styles.markerInner} /></View>
                </Marker>
              )}
              {dropoff?.location?.coordinates && (
                <Marker coordinate={{ latitude: dropoff.location.coordinates[1], longitude: dropoff.location.coordinates[0] }}>
                  <Icon name="flag" size={24} color="#FF6B6B" />
                </Marker>
              )}
              {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#4ECDC4" />}
            </MapView>
          )}
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={600} delay={100} style={styles.locationSection}>
          <View style={styles.locationHeader}>
            <Text style={styles.locationTitle}>Where to?</Text>
            <TouchableOpacity style={styles.locationAction} onPress={getCurrentLocation}>
              <Icon name="my-location" size={20} color="#FFD700" />
              <Text style={styles.locationActionText}>Use Current</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.locationInputWrapper, { zIndex: 20, elevation: 20 }]}>
            <View style={styles.locationDot}><View style={[styles.dot, { backgroundColor: '#4ECDC4' }]} /></View>
            <View style={styles.locationInputContainer}>
              <CustomPlacesAutocomplete
                ref={pickupRef}
                placeholder="Pickup City/Location"
                onPress={(data, details = null) => {
                  setPickup({
                    address: data.description,
                    location: { type: 'Point', coordinates: [details.geometry.location.lng, details.geometry.location.lat] },
                    placeId: data.place_id
                  });
                }}
                styles={{ textInputContainer: { backgroundColor: '#2A2A2A', borderRadius: 12 }, textInput: { color: '#FFF', flex: 1, padding: 12, fontSize: 14 } }}
                renderRightButton={() => <TouchableOpacity onPress={() => openMapPicker('pickup')}><Icon name="map" size={22} color="#4ECDC4" /></TouchableOpacity>}
              />
            </View>
          </View>
          <View style={styles.locationDivider} />
          <View style={[styles.locationInputWrapper, { zIndex: 10, elevation: 10 }]}>
            <View style={styles.locationDot}><View style={[styles.dot, { backgroundColor: '#FF6B6B' }]} /></View>
            <View style={styles.locationInputContainer}>
              <CustomPlacesAutocomplete
                ref={dropoffRef}
                placeholder="Destination City/Location"
                onPress={(data, details = null) => {
                  setDropoff({
                    address: data.description,
                    location: { type: 'Point', coordinates: [details.geometry.location.lng, details.geometry.location.lat] },
                    placeId: data.place_id
                  });
                }}
                styles={{ textInputContainer: { backgroundColor: '#2A2A2A', borderRadius: 12 }, textInput: { color: '#FFF', flex: 1, padding: 12, fontSize: 14 } }}
                renderRightButton={() => <TouchableOpacity onPress={() => openMapPicker('dropoff')}><Icon name="map" size={22} color="#FF6B6B" /></TouchableOpacity>}
              />
            </View>
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={{ color: '#888', marginBottom: 10, fontWeight: 'bold' }}>Schedule Time</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                <Icon name="calendar-today" size={20} color="#FFD700" />
                <Text style={{ color: '#FFF', marginLeft: 10 }}>{schedule.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowTimePicker(true)}>
                <Icon name="access-time" size={20} color="#FFD700" />
                <Text style={{ color: '#FFF', marginLeft: 10 }}>{schedule.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={schedule}
                mode="date"
                minimumDate={new Date()}
                onChange={(e, date) => { setShowDatePicker(false); if(date) { const newDate = new Date(schedule); newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate()); setSchedule(newDate); } }}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={schedule}
                mode="time"
                onChange={(e, date) => { setShowTimePicker(false); if(date) { const newDate = new Date(schedule); newDate.setHours(date.getHours(), date.getMinutes()); setSchedule(newDate); } }}
              />
            )}
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.section}>
          <Text style={styles.sectionTitle}>Select Vehicle</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {vehicleTypes.map(vehicle => (
              <TouchableOpacity key={vehicle.id} style={[styles.vehicleCard, selectedVehicle === vehicle.id && styles.vehicleCardSelected]} onPress={() => setSelectedVehicle(vehicle.id)}>
                <LinearGradient colors={selectedVehicle === vehicle.id ? [vehicle.color + '30', vehicle.color + '10'] : ['#2A2A2A', '#1E1E1E']} style={styles.vehicleGradient}>
                  <View style={[styles.vehicleIconContainer, { backgroundColor: selectedVehicle === vehicle.id ? vehicle.color + '20' : '#2A2A2A' }]}>
                    {getIcon(vehicle.icon, vehicle.iconType, 28, selectedVehicle === vehicle.id ? vehicle.color : '#666')}
                  </View>
                  <Text style={[styles.vehicleLabel, selectedVehicle === vehicle.id && { color: vehicle.color }]}>{vehicle.label}</Text>
                  <Text style={styles.vehiclePrice}>Rs.{vehicle.price}</Text>
                  {selectedVehicle === vehicle.id && <View style={styles.selectedBadge}><Icon name="check-circle" size={16} color={vehicle.color} /></View>}
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={600} delay={300} style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Fare Mode</Text>
          <View style={styles.fareModeContainer}>
            <TouchableOpacity style={[styles.fareMode, fareMode === 'ai' && styles.fareModeSelected]} onPress={() => setFareMode('ai')}>
              <LinearGradient colors={fareMode === 'ai' ? ['#FFD700', '#FFC107'] : ['#2A2A2A', '#1E1E1E']} style={styles.fareModeGradient}>
                <View style={styles.fareModeContent}>
                  <Icon name="auto-awesome" size={28} color={fareMode === 'ai' ? '#121212' : '#888'} />
                  <Text style={[styles.fareModeText, fareMode === 'ai' && { color: '#121212' }]}>AI Price</Text>
                  {estimatedFare && <Text style={[styles.fareAmount, fareMode === 'ai' && { color: '#121212' }]}>Rs.{estimatedFare?.total ?? estimatedFare}</Text>}
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.fareMode, fareMode === 'offer' && styles.fareModeSelected]} onPress={() => setFareMode('offer')}>
              <LinearGradient colors={fareMode === 'offer' ? ['#4ECDC4', '#44B39D'] : ['#2A2A2A', '#1E1E1E']} style={styles.fareModeGradient}>
                <View style={styles.fareModeContent}>
                  <Icon name="attach-money" size={28} color={fareMode === 'offer' ? '#121212' : '#888'} />
                  <Text style={[styles.fareModeText, fareMode === 'offer' && { color: '#121212' }]}>Offer Price</Text>
                  {fareMode === 'offer' && (
                    <TextInput style={[styles.offerInput, { backgroundColor: 'rgba(255,255,255,0.2)', color: '#121212' }]} placeholder="Amount" placeholderTextColor="rgba(0,0,0,0.5)" keyboardType="numeric" value={offerPrice} onChangeText={setOfferPrice} />
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={600} delay={400} style={styles.bookButtonContainer}>
          <TouchableOpacity style={styles.bookButton} onPress={handleBookIntercity} disabled={loading}>
            <LinearGradient colors={['#FFD700', '#FFC107']} style={styles.bookButtonGradient}>
              {loading ? <ActivityIndicator color="#121212" /> : <><Text style={styles.bookButtonText}>Post Intercity Ride</Text><Icon name="arrow-forward" size={24} color="#121212" /></>}
            </LinearGradient>
          </TouchableOpacity>
        </Animatable.View>
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Map Picker Modal */}
      <Modal visible={mapPickerVisible} animationType="slide">
        <View style={{ flex: 1 }}>
          <MapView ref={pickerMapRef} style={{ flex: 1 }} initialRegion={{ latitude: mapPickerCoords?.latitude || 33.6844, longitude: mapPickerCoords?.longitude || 73.0479, latitudeDelta: 0.05, longitudeDelta: 0.05 }} onRegionChangeComplete={onPickerRegionChangeComplete} />
          <View style={{ position: 'absolute', top: '50%', left: '50%', marginTop: -24, marginLeft: -12 }}>
            <Icon name="location-on" size={48} color={mapPickerType === 'pickup' ? '#4ECDC4' : '#FF6B6B'} />
          </View>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1E1E1E', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <Text style={{ color: '#FFF', fontSize: 16, marginBottom: 15 }}>{mapPickerAddress}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Cancel" variant="outline" onPress={() => setMapPickerVisible(false)} style={{ flex: 1 }} />
              <Button title="Confirm" onPress={confirmMapPicker} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {viewMode === 'list' && renderListView()}
        {viewMode === 'mode_select' && renderModeSelect()}
        {viewMode === 'create' && renderCreateView()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  container: { flex: 1, backgroundColor: '#121212' },
  listContainer: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  headerRight: { width: 40 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#2A2A2A' },
  activeTab: { borderBottomColor: '#FFD700' },
  tabText: { color: '#888', fontWeight: 'bold' },
  activeTabText: { color: '#FFD700' },
  floatingBtnContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  createNewBtn: { borderRadius: 12 },
  recentRideCard: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16 },
  rideStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  rideStatusText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 40 },
  mapContainer: { height: 200, marginHorizontal: 20, marginTop: 10, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1E1E1E' },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { width: '100%', height: '100%' },
  pickupMarker: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(78, 205, 196, 0.3)', justifyContent: 'center', alignItems: 'center' },
  markerInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4ECDC4', borderWidth: 2, borderColor: '#FFF' },
  locationSection: { backgroundColor: '#1E1E1E', margin: 20, borderRadius: 16, padding: 16 },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  locationTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  locationAction: { flexDirection: 'row', alignItems: 'center' },
  locationActionText: { color: '#FFD700', marginLeft: 4, fontWeight: 'bold' },
  locationInputWrapper: { flexDirection: 'row', alignItems: 'center' },
  locationDot: { width: 24, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  locationInputContainer: { flex: 1, marginLeft: 12 },
  locationDivider: { height: 24, width: 2, backgroundColor: '#333', marginLeft: 11, marginVertical: 4 },
  datePickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', padding: 12, borderRadius: 12 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 16 },
  vehicleCard: { width: 120, height: 150, marginRight: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1E1E1E' },
  vehicleCardSelected: { transform: [{ scale: 1.05 }] },
  vehicleGradient: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  vehicleIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  vehicleLabel: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  vehiclePrice: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  vehicleCardMode: { backgroundColor: '#1E1E1E', borderRadius: 16, overflow: 'hidden' },
  selectedBadge: { position: 'absolute', top: 12, right: 12 },
  fareModeContainer: { flexDirection: 'row', gap: 12 },
  fareMode: { flex: 1, height: 140, borderRadius: 16, overflow: 'hidden' },
  fareModeSelected: { transform: [{ scale: 1.02 }] },
  fareModeGradient: { flex: 1, padding: 16 },
  fareModeContent: { flex: 1, justifyContent: 'space-between' },
  fareModeText: { fontSize: 16, fontWeight: 'bold', color: '#888', marginTop: 8 },
  fareAmount: { fontSize: 20, fontWeight: 'bold', color: '#888' },
  offerInput: { borderRadius: 8, padding: 12, fontSize: 16, marginTop: 8, fontWeight: 'bold' },
  bookButtonContainer: { paddingHorizontal: 20, marginTop: 10 },
  bookButton: { borderRadius: 16, overflow: 'hidden' },
  bookButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 12 },
  bookButtonText: { color: '#121212', fontSize: 18, fontWeight: 'bold' },
  bottomSpacer: { height: 100 }
});

export default BookIntercityScreen;

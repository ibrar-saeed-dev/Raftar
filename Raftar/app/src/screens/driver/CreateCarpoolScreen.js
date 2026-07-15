import React, { useState, useEffect } from 'react';
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
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CustomPlacesAutocomplete from '../../components/common/CustomPlacesAutocomplete';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { createCarpoolBooking, acceptCarpoolRequest, rejectCarpoolRequest, startCarpool, completeCarpool } from '../../redux/slices/bookingSlice';
import { GOOGLE_MAPS_API_KEY } from '../../config/constants';

const { width } = Dimensions.get('window');

const CreateCarpoolScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  const isIntercity = route.params?.isIntercity || false;
  
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [seats, setSeats] = useState(4);
  const [pricePerSeat, setPricePerSeat] = useState(100);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Map Picker State
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapPickerType, setMapPickerType] = useState('pickup');
  const [mapPickerCoords, setMapPickerCoords] = useState(null);
  const [mapPickerAddress, setMapPickerAddress] = useState('');

  const pickupRef = React.useRef(null);
  const dropoffRef = React.useRef(null);
  const pickerMapRef = React.useRef(null);

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

  const handleCreateCarpool = async () => {
    if (!pickup || !dropoff) {
      Alert.alert('Error', 'Please enter pickup and dropoff locations');
      return;
    }

    setIsCreating(true);
    try {
      const departureTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
                                     time.getHours(), time.getMinutes());
      if (departureTime <= new Date()) {
        setIsCreating(false);
        Alert.alert('Invalid Date', 'Please select a future date and time for your carpool.');
        return;
      }
                                     
      const bookingData = {
        pickup: {
          address: pickup.address,
          location: pickup.location,
          placeId: pickup.placeId
        },
        dropoff: {
          address: dropoff.address,
          location: dropoff.location,
          placeId: dropoff.placeId
        },
        seats,
        pricePerSeat,
        timeWindow: {
          start: departureTime,
          end: new Date(departureTime.getTime() + 60 * 60 * 1000)
        },
        isIntercity
      };
      
      const result = await dispatch(createCarpoolBooking(bookingData)).unwrap();
      
      if (result.success) {
        Alert.alert(
          'Success! 🚗',
          `Your ${isIntercity ? 'intercity ' : ''}carpool has been created successfully and is now visible to passengers!`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create carpool');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Location Section */}
          <Animatable.View animation="fadeInUp" duration={600} delay={100} style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Carpool Route</Text>
            
            <View style={styles.locationInputWrapper}>
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
                      location: { coordinates: [details.geometry.location.lng, details.geometry.location.lat] },
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
                  placeholder="Destination"
                  onPress={(data, details = null) => {
                    setDropoff({
                      address: data.description,
                      location: { coordinates: [details.geometry.location.lng, details.geometry.location.lat] },
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

          {/* Details Section */}
          <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Ride Details</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Icon name="people" size={20} color="#FFD700" />
                <Text style={styles.detailLabel}>Available Seats</Text>
              </View>
              <View style={styles.selector}>
                <TouchableOpacity onPress={() => setSeats(Math.max(1, seats - 1))}>
                  <Icon name="remove-circle-outline" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.selectorText}>{seats}</Text>
                <TouchableOpacity onPress={() => setSeats(Math.min(4, seats + 1))}>
                  <Icon name="add-circle-outline" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Icon name="attach-money" size={20} color="#FFD700" />
                <Text style={styles.detailLabel}>Price Per Seat (Rs.)</Text>
              </View>
              <View style={styles.selector}>
                <TouchableOpacity onPress={() => setPricePerSeat(Math.max(0, pricePerSeat - 50))}>
                  <Icon name="remove-circle-outline" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.selectorText}>{pricePerSeat}</Text>
                <TouchableOpacity onPress={() => setPricePerSeat(pricePerSeat + 50)}>
                  <Icon name="add-circle-outline" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowDatePicker(true)}>
              <Icon name="calendar-today" size={20} color="#FFD700" />
              <Text style={styles.dateTimeText}>
                {date.toLocaleDateString()} at {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Icon name="edit" size={20} color="#666" />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
                minimumDate={new Date()}
              />
            )}
            {/* Would need a time picker too in a real app, keeping simple for now by just setting time to now + 1 hour or similar, or showing another picker */}
          </Animatable.View>

          {/* Create Button */}
          <Animatable.View animation="fadeInUp" duration={600} delay={300} style={styles.createButtonContainer}>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateCarpool} disabled={isCreating}>
              <LinearGradient colors={['#FFD700', '#FFC107']} style={styles.createButtonGradient}>
                {isCreating ? (
                  <ActivityIndicator color="#121212" size="small" />
                ) : (
                  <>
                    <Icon name="directions-car" size={24} color="#121212" />
                    <Text style={styles.createButtonText}>Publish Carpool</Text>
                  </>
                )}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40, paddingTop: 20 },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  locationInputWrapper: { flexDirection: 'row', alignItems: 'center' },
  locationDot: { width: 20, alignItems: 'center', marginRight: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  locationInputContainer: { flex: 1 },
  locationTextInput: { backgroundColor: '#2A2A2A', color: '#FFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14 },
  autocompleteContainer: { flex: 1 },
  autocompleteList: { backgroundColor: '#2A2A2A', borderRadius: 12, position: 'absolute', top: 50, left: 0, right: 0, zIndex: 1000, maxHeight: 200 },
  autocompleteRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  autocompleteDescription: { color: '#FFF', fontSize: 14 },
  locationDivider: { height: 1, backgroundColor: '#2A2A2A', marginVertical: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2A2A2A', padding: 16, borderRadius: 12, marginBottom: 12 },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailLabel: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  selectorText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', width: 30, textAlign: 'center' },
  dateTimeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2A2A2A', padding: 16, borderRadius: 12 },
  dateTimeText: { color: '#FFF', fontSize: 16, flex: 1, marginLeft: 12 },
  createButtonContainer: { marginHorizontal: 16, marginTop: 10 },
  createButton: { borderRadius: 16, overflow: 'hidden' },
  createButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
  createButtonText: { color: '#121212', fontSize: 18, fontWeight: 'bold' },
  bottomSpacer: { height: 100 },
  mapIconBtn: { padding: 10, position: 'absolute', right: 0 },
  mapPickerContainer: { flex: 1, backgroundColor: '#121212' },
  mapPickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#1E1E1E' },
  mapPickerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  mapPickerClose: { padding: 8 },
  mapWrapper: { flex: 1 },
  pickerMap: { flex: 1 },
  mapMarkerFixed: { left: '50%', marginLeft: -20, marginTop: -40, position: 'absolute', top: '50%' },
  mapPickerFooter: { backgroundColor: '#1E1E1E', padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  mapPickerAddressText: { color: '#FFF', fontSize: 16, marginBottom: 16 },
  mapPickerConfirmBtn: { backgroundColor: '#FFD700', padding: 16, borderRadius: 12, alignItems: 'center' },
  mapPickerConfirmText: { color: '#121212', fontSize: 18, fontWeight: 'bold' }
});

export default CreateCarpoolScreen;

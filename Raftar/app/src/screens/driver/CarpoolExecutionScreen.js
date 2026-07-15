import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../../services/api';
import RatingComponent from '../../components/common/RatingComponent';

const CarpoolExecutionScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { carpool } = route.params;

  const [driverLocation, setDriverLocation] = useState(null);
  const [passengers, setPassengers] = useState(carpool.carpool.passengers.filter(p => p.status !== 'pending' && p.status !== 'rejected'));

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setDriverLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      // Simple interval to update driver location
      const locInterval = setInterval(async () => {
        let l = await Location.getCurrentPositionAsync({});
        const newLoc = { latitude: l.coords.latitude, longitude: l.coords.longitude };
        setDriverLocation(newLoc);
        await api.post('/rides/location', { location: { coordinates: [newLoc.longitude, newLoc.latitude] } }).catch(()=>{});
      }, 5000);
      
      return () => clearInterval(locInterval);
    })();
  }, []);

  const handlePickup = async (passengerId) => {
    try {
      await api.post(`/bookings/carpool/${carpool._id}/pickup/${passengerId}`);
      setPassengers(passengers.map(p => p.user._id === passengerId ? { ...p, status: 'picked_up' } : p));
      Alert.alert('Success', 'Passenger picked up');
    } catch (e) {
      Alert.alert('Error', 'Failed to pick up');
    }
  };

  const handleDropoff = async (passengerId) => {
    try {
      await api.post(`/bookings/carpool/${carpool._id}/dropoff/${passengerId}`);
      setPassengers(passengers.map(p => p.user._id === passengerId ? { ...p, status: 'dropped_off' } : p));
      
      const allDone = passengers.every(p => p.user._id === passengerId ? true : (p.status === 'dropped_off' || p.status === 'pending' || p.status === 'rejected'));
      if (allDone) {
        Alert.alert('Carpool Completed', 'All passengers dropped off. Please rate them before leaving.');
      } else {
        Alert.alert('Success', 'Passenger dropped off');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to drop off');
    }
  };

  const renderPassenger = ({ item }) => {
    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.user.name || 'Passenger'}</Text>
        <Text style={styles.status}>Status: {item.status}</Text>
        <View style={styles.actions}>
          {item.status === 'accepted' && (
            <TouchableOpacity style={styles.btn} onPress={() => handlePickup(item.user._id)}>
              <Text style={styles.btnText}>Pick Up</Text>
            </TouchableOpacity>
          )}
          {item.status === 'picked_up' && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#FF6B6B' }]} onPress={() => handleDropoff(item.user._id)}>
              <Text style={styles.btnText}>Drop Off</Text>
            </TouchableOpacity>
          )}
        </View>
        {item.status === 'dropped_off' && (
          <RatingComponent
            bookingId={carpool._id}
            tripType="carpool"
            ratedUser={item.user._id}
            ratedUserRole="passenger"
            onDone={() => {
              const allDone = passengers.every(p => p.status === 'dropped_off' || p.status === 'pending' || p.status === 'rejected');
              if (allDone) {
                navigation.goBack();
              } else {
                Alert.alert('Success', 'Rating submitted');
              }
            }}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        {driverLocation ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker coordinate={driverLocation} title="You">
              <Icon name="directions-car" size={30} color="#FFD700" />
            </Marker>
            {/* Can add passenger markers here */}
          </MapView>
        ) : (
          <Text style={{color: '#FFF'}}>Loading Map...</Text>
        )}
      </View>
      
      <View style={styles.listContainer}>
        <Text style={styles.title}>Passengers</Text>
        <FlatList
          data={passengers}
          renderItem={renderPassenger}
          keyExtractor={item => item.user._id}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  mapContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { width: '100%', height: '100%' },
  listContainer: { flex: 1, backgroundColor: '#1E1E1E', padding: 16 },
  title: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  card: { backgroundColor: '#2A2A2A', padding: 16, borderRadius: 8, marginBottom: 12 },
  name: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  status: { color: '#CCC', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 12 },
  btn: { backgroundColor: '#4ECDC4', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4 },
  btnText: { color: '#121212', fontWeight: 'bold' }
});

export default CarpoolExecutionScreen;

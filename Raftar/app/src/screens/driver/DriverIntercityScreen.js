import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
import api from '../../services/api';
import { useDispatch } from 'react-redux';
import { useSocket } from '../../context/SocketContext';
import Button from '../../components/common/Button';
import { counterOffer } from '../../redux/slices/driverSlice';

const DriverIntercityScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const socket = useSocket();

  const [viewMode, setViewMode] = useState('mode_select'); // 'mode_select' or 'private'
  const [activeTab, setActiveTab] = useState('available'); // 'available' or 'upcoming'
  const [loading, setLoading] = useState(false);
  const [availableRequests, setAvailableRequests] = useState([]);
  const [myUpcomingRides, setMyUpcomingRides] = useState([]);

  // Counter offer state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');

  useEffect(() => {
    if (viewMode === 'private') {
      fetchData();
    }

    if (socket && viewMode === 'private') {
      const handleNewRide = () => {
        if (activeTab === 'available') fetchData();
      };
      socket.on('new-ride-request', handleNewRide);
      return () => socket.off('new-ride-request', handleNewRide);
    }
  }, [activeTab, viewMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'available') {
        const response = await api.get('/drivers/ride-requests?type=intercity');
        if (response.data?.success) {
          setAvailableRequests(response.data.rides);
        }
      } else {
        const response = await api.get('/rides/active');
        if (response.data?.success) {
          const active = response.data.rides.filter(r => r.type === 'intercity' && (r.status === 'accepted' || r.status === 'started'));
          setMyUpcomingRides(active);
        }
      }
    } catch (error) {
      console.error('Fetch intercity error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCounterOffer = async (rideId) => {
    if (!counterAmount || parseFloat(counterAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    try {
      await dispatch(counterOffer({ rideId, amount: parseFloat(counterAmount) })).unwrap();
      if (socket) {
        socket.emit('join-ride', rideId);
      }
      Alert.alert('Offer Sent', 'Waiting for passenger to accept your offer');
      setShowCounterOffer(false);
      setCounterAmount('');
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send counter offer');
    }
  };

  const handleAccept = (item) => {
    Alert.alert(
      'Accept Ride',
      'Are you sure you want to accept this intercity ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const amount = item.fare?.offered || item.fare?.accepted || 0;
              await dispatch(counterOffer({ rideId: item._id, amount })).unwrap();
              if (socket) {
                socket.emit('join-ride', item._id);
              }
              Alert.alert('Offer Sent', 'Waiting for passenger to accept');
              fetchData();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to accept');
            }
          }
        }
      ]
    );
  };

  const formatDistance = (distance) => {
    if (!distance) return '';
    return distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(1)} km`;
  };

  const renderAvailableRequest = ({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.riderInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.passengerId?.name?.charAt(0) || '?'}</Text>
          </View>
          <View>
            <Text style={styles.riderName}>{item.passengerId?.name}</Text>
            <Text style={styles.riderRating}>⭐ {item.passengerId?.stats?.rating || 0}</Text>
          </View>
        </View>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
        </View>
      </View>

      {item.scheduledTime && (
        <View style={{ paddingHorizontal: 15, paddingBottom: 10 }}>
          <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: 'bold' }}>
            Scheduled for: {new Date(item.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}

      <View style={styles.routeInfo}>
        <View style={styles.routePoint}>
          <Icon name="my-location" size={16} color="#4ECDC4" />
          <Text style={styles.routeText} numberOfLines={1}>{item.pickup?.address}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <Icon name="location-on" size={16} color="#FF6B6B" />
          <Text style={styles.routeText} numberOfLines={1}>{item.dropoff?.address}</Text>
        </View>
      </View>

      <View style={styles.requestFooter}>
        <View style={styles.fareInfo}>
          <Text style={styles.fareLabel}>Fare</Text>
          <Text style={styles.fareAmount}>Rs. {item.fare?.offered || item.fare?.accepted || 0}</Text>
        </View>
        <View style={styles.vehicleInfo}>
          <Icon name="directions-car" size={16} color="#888" />
          <Text style={styles.vehicleText}>{item.vehicleType || 'Car'}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Button title="Accept" onPress={() => handleAccept(item)} size="small" style={styles.acceptButton} />
        <Button title="Counter" onPress={() => { setSelectedRequest(item); setShowCounterOffer(true); }} variant="outline" size="small" style={styles.counterButton} />
      </View>
    </View>
  );

  const renderUpcomingRide = ({ item }) => (
    <Animatable.View animation="fadeInUp" duration={400} style={styles.cardWrapper}>
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ActiveRide', { ride: item })}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>
            {item.scheduledTime ? new Date(item.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No Date'}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.locations}>
          <View style={styles.locationRow}>
            <Icon name="my-location" size={16} color="#4ECDC4" />
            <Text style={styles.locationText} numberOfLines={1}>{item.pickup?.address}</Text>
          </View>
          <View style={styles.locationRow}>
            <Icon name="location-on" size={16} color="#FF6B6B" />
            <Text style={styles.locationText} numberOfLines={1}>{item.dropoff?.address}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
           <Text style={styles.fareText}>Rs. {item.fare?.accepted || item.fare?.offered || 0}</Text>
           <Text style={styles.passengerText}>Passenger: {item.passengerId?.name || 'Unknown'}</Text>
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderModeSelect = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Mode</Text>
        <View style={{width: 24}} />
      </View>
      <View style={{ padding: 20, gap: 20, flex: 1, justifyContent: 'center' }}>
        <TouchableOpacity 
          style={[styles.vehicleCardMode, { padding: 30, alignItems: 'center' }]} 
          onPress={() => setViewMode('private')}
        >
          <Icon name="directions-car" size={60} color="#FFD700" />
          <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 10 }}>Private Ride</Text>
          <Text style={{ color: '#888', textAlign: 'center', marginTop: 10 }}>Accept private intercity ride requests.</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.vehicleCardMode, { padding: 30, alignItems: 'center' }]} 
          onPress={() => navigation.navigate('ManageCarpools', { isIntercity: true })}
        >
          <Icon name="people" size={60} color="#4ECDC4" />
          <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 10 }}>Carpool</Text>
          <Text style={{ color: '#888', textAlign: 'center', marginTop: 10 }}>Offer shared seats to passengers.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPrivateList = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => setViewMode('mode_select')}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Private Intercity</Text>
        <View style={{width: 24}} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'available' && styles.activeTab]} onPress={() => setActiveTab('available')}>
          <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>Available Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]} onPress={() => setActiveTab('upcoming')}>
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>My Upcoming</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'available' ? availableRequests : myUpcomingRides}
          renderItem={activeTab === 'available' ? renderAvailableRequest : renderUpcomingRide}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {activeTab === 'available' ? 'No intercity requests available.' : 'You have no upcoming intercity rides.'}
            </Text>
          }
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#FFD700" />}
        />
      )}

      {showCounterOffer && selectedRequest && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Counter Offer</Text>
            <Text style={styles.modalSubtitle}>Original fare: Rs. {selectedRequest.fare?.offered || selectedRequest.fare?.accepted || 0}</Text>
            <View style={styles.modalInput}>
              <Text style={styles.modalInputLabel}>Your Offer</Text>
              <TextInput style={styles.modalInputField} value={counterAmount} onChangeText={setCounterAmount} placeholder="Enter amount" placeholderTextColor="#666" keyboardType="numeric" autoFocus />
            </View>
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => { setShowCounterOffer(false); setCounterAmount(''); }} variant="outline" size="small" style={styles.modalCancelButton} />
              <Button title="Send Offer" onPress={() => handleCounterOffer(selectedRequest._id)} size="small" style={styles.modalSendButton} />
            </View>
          </View>
        </View>
      )}
    </View>
  );

  return viewMode === 'mode_select' ? renderModeSelect() : renderPrivateList();
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#2A2A2A' },
  activeTab: { borderBottomColor: '#FFD700' },
  tabText: { color: '#888', fontWeight: 'bold' },
  activeTabText: { color: '#FFD700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vehicleCardMode: { backgroundColor: '#1E1E1E', borderRadius: 16, overflow: 'hidden' },
  cardWrapper: { marginBottom: 16 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, borderColor: '#4ECDC4', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dateText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  statusBadge: { backgroundColor: '#4ECDC4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#121212', fontSize: 12, fontWeight: 'bold' },
  locations: { marginBottom: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  locationText: { color: '#CCC', marginLeft: 8, flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12 },
  fareText: { color: '#FFD700', fontWeight: 'bold' },
  passengerText: { color: '#888' },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40 },
  
  // Request Card Styles
  requestCard: { backgroundColor: '#1E1E1E', borderRadius: 15, marginHorizontal: 20, marginBottom: 15, paddingVertical: 15, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 15 },
  riderInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  riderName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  riderRating: { color: '#888', fontSize: 13, marginTop: 2 },
  distanceBadge: { backgroundColor: '#2A2A2A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  distanceText: { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },
  routeInfo: { paddingHorizontal: 15, marginBottom: 15 },
  routePoint: { flexDirection: 'row', alignItems: 'center' },
  routeText: { color: '#CCC', marginLeft: 10, flex: 1, fontSize: 14 },
  routeLine: { width: 2, height: 20, backgroundColor: '#333', marginLeft: 7, marginVertical: 4 },
  requestFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#2A2A2A', marginBottom: 15 },
  fareInfo: {},
  fareLabel: { color: '#888', fontSize: 12 },
  fareAmount: { color: '#4ECDC4', fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  vehicleInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  vehicleText: { color: '#CCC', fontSize: 13, marginLeft: 5 },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, gap: 10 },
  acceptButton: { flex: 1 },
  counterButton: { flex: 1 },
  
  // Modal Styles
  modalOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#1E1E1E', width: '80%', borderRadius: 15, padding: 20, elevation: 5 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  modalSubtitle: { color: '#888', fontSize: 14, marginBottom: 20 },
  modalInput: { marginBottom: 20 },
  modalInputLabel: { color: '#CCC', fontSize: 14, marginBottom: 10 },
  modalInputField: { backgroundColor: '#2A2A2A', borderRadius: 8, color: '#FFF', padding: 15, fontSize: 18, fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  modalCancelButton: { flex: 1 },
  modalSendButton: { flex: 1 }
});

export default DriverIntercityScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { acceptCarpoolRequest, acceptPassengerCarpoolRequest, rejectCarpoolRequest, startCarpool } from '../../redux/slices/bookingSlice';
import api from '../../services/api';
import CarpoolMapPreview from '../../components/common/CarpoolMapPreview';

const ManageCarpoolsScreen = () => {
  const [acceptedCarpools, setAcceptedCarpools] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'accepted'
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();

  const isIntercity = route.params?.isIntercity || false;

  useEffect(() => {
    fetchDriverCarpools();
  }, []);

  const fetchDriverCarpools = async () => {
    setLoading(true);
    try {
      // Create a quick endpoint or just filter on client side. For now, we will do a direct API call to get driver's carpools.
      const response = await api.get(`/bookings/driver-carpools?isIntercity=${isIntercity}`);
      setAcceptedCarpools(response.data.acceptedCarpools || []);
      setPendingRequests(response.data.pendingRequests || []);
    } catch (error) {
      console.log('Fetch driver carpools error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (carpoolId, passengerId, isRequest = false) => {
    try {
      if (isRequest) {
        await dispatch(acceptPassengerCarpoolRequest(carpoolId)).unwrap();
      } else {
        await dispatch(acceptCarpoolRequest({ carpoolId, passengerId })).unwrap();
      }
      fetchDriverCarpools();
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to accept');
    }
  };

  const handleReject = async (carpoolId, passengerId) => {
    try {
      await dispatch(rejectCarpoolRequest({ carpoolId, passengerId })).unwrap();
      fetchDriverCarpools();
    } catch (e) {
      Alert.alert('Error', 'Failed to reject');
    }
  };

  const handleStart = async (carpoolId) => {
    try {
      await dispatch(startCarpool(carpoolId)).unwrap();
      const carpool = acceptedCarpools.find(c => c._id === carpoolId);
      navigation.navigate('CarpoolExecution', { carpool });
    } catch (e) {
      Alert.alert('Error', 'Failed to start');
    }
  };

  const handleCancel = async (carpoolId) => {
    Alert.alert(
      'Cancel Carpool',
      'Are you sure you want to cancel this carpool?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/bookings/carpool/${carpoolId}`);
              if (res.data?.success) {
                Alert.alert('Success', 'Carpool cancelled.');
                fetchDriverCarpools();
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to cancel carpool');
            }
          }
        }
      ]
    );
  };

  const renderPassenger = (passenger, carpoolId) => {
    const user = passenger.user || {};
    return (
      <View style={styles.passengerItem} key={user._id || Math.random()}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={20} color="#FFF" />
            </View>
          )}
          <View style={{marginLeft: 10}}>
            <Text style={styles.passengerText}>{user.name || 'Unknown Passenger'}</Text>
            {user.phoneNumber && <Text style={styles.passengerSubText}>{user.phoneNumber}</Text>}
            <Text style={styles.passengerSubText}>Status: {passenger.status}</Text>
          </View>
        </View>
        {passenger.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4ECDC4' }]} onPress={() => handleAccept(carpoolId, user._id)}>
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF6B6B' }]} onPress={() => handleReject(carpoolId, user._id)}>
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderCarpool = ({ item }) => {
    const isRequest = !!item.passengerId;
    const requestedBy = isRequest ? item.passengerId : null;

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {item.carpool?.departureTime ? new Date(item.carpool.departureTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Invalid Date'}
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={[styles.statusBadge, {marginRight: 8}]}>{item.status.toUpperCase()}</Text>
            {item.status !== 'completed' && item.status !== 'cancelled' && (
              <TouchableOpacity onPress={() => handleCancel(item._id)}>
                <Icon name="cancel" size={24} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isRequest && requestedBy && (
          <View style={styles.requesterSection}>
            <Text style={styles.subtitle}>Requested by:</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              {requestedBy.profileImage ? (
                <Image source={{ uri: requestedBy.profileImage }} style={styles.avatarSmall} />
              ) : (
                <View style={styles.avatarPlaceholderSmall}><Icon name="person" size={16} color="#FFF" /></View>
              )}
              <Text style={styles.requesterName}>
                {requestedBy.name || 'Passenger'} (⭐ {requestedBy.stats?.rating || requestedBy.rating || 0})
              </Text>
            </View>
          </View>
        )}

        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <Icon name="my-location" size={16} color="#4ECDC4" />
            <Text style={styles.routeText} numberOfLines={1}>{item.pickup?.address}</Text>
          </View>
          <View style={styles.routePoint}>
            <Icon name="location-on" size={16} color="#FF6B6B" />
            <Text style={styles.routeText} numberOfLines={1}>{item.dropoff?.address}</Text>
          </View>
        </View>
        
        <CarpoolMapPreview 
          pickup={item.pickup} 
          dropoff={item.dropoff} 
          style={{ height: 160, marginBottom: 12 }} 
        />

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Icon name="airline-seat-recline-normal" size={16} color="#FFD700" />
            <Text style={styles.statText}>{item.carpool?.seatsAvailable} / {item.carpool?.totalSeats} Seats</Text>
          </View>
          <View style={styles.stat}>
            <Icon name="attach-money" size={16} color="#FFD700" />
            <Text style={styles.statText}>Rs. {item.carpool?.pricePerSeat || 0}</Text>
          </View>
        </View>

          {!isRequest && (
            <View style={styles.passengersList}>
              <Text style={styles.subtitle}>Passengers:</Text>
              {!item.carpool?.passengers || item.carpool.passengers.length === 0 ? (
                <Text style={styles.noData}>No passengers yet</Text>
              ) : (
                item.carpool.passengers.map(p => renderPassenger(p, item._id))
              )}
            </View>
          )}
          
          {item.status === 'searching' && isRequest ? (
            <TouchableOpacity style={styles.startBtn} onPress={() => handleAccept(item._id, item.passengerId?._id, isRequest)}>
              <Text style={styles.startBtnText}>Accept Request</Text>
            </TouchableOpacity>
          ) : item.status === 'available' || item.status === 'full' || item.status === 'accepted' ? (
            <TouchableOpacity style={styles.startBtn} onPress={() => handleStart(item._id)}>
              <Text style={styles.startBtnText}>Start Carpool</Text>
            </TouchableOpacity>
          ) : item.status === 'in-progress' ? (
            <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('CarpoolExecution', { carpool: item })}>
              <Text style={styles.startBtnText}>Continue Execution</Text>
            </TouchableOpacity>
          ) : null}
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFD700" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{isIntercity ? 'Intercity Carpools' : 'Manage Carpools'}</Text>
        <View style={{width: 24}} />
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]} 
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'accepted' && styles.activeTab]} 
          onPress={() => setActiveTab('accepted')}
        >
          <Text style={[styles.tabText, activeTab === 'accepted' && styles.activeTabText]}>Accepted Carpools</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'pending' ? pendingRequests : acceptedCarpools}
        renderItem={renderCarpool}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No {activeTab} carpools right now.</Text>}
        refreshing={loading}
        onRefresh={fetchDriverCarpools}
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('CreateCarpool', { isIntercity })}
      >
        <Icon name="add" size={24} color="#121212" />
        <Text style={styles.fabText}>Create</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, backgroundColor: '#1E1E1E' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  screenTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333', backgroundColor: '#1E1E1E' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#FFD700' },
  tabText: { color: '#888', fontWeight: 'bold' },
  activeTabText: { color: '#FFD700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  list: { padding: 16 },
  card: { backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  statusBadge: { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },
  routeContainer: { marginBottom: 12 },
  routePoint: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  routeText: { color: '#CCC', fontSize: 14, marginLeft: 8, flex: 1 },
  mapContainer: { height: 120, borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  map: { flex: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  stat: { flexDirection: 'row', alignItems: 'center' },
  statText: { color: '#FFF', fontSize: 14, marginLeft: 6 },
  subtitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  requesterSection: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  requesterName: { color: '#FFF', fontSize: 14, marginLeft: 8 },
  noData: { color: '#888', fontStyle: 'italic', fontSize: 14 },
  passengerItem: { backgroundColor: '#2A2A2A', padding: 12, borderRadius: 8, marginBottom: 8 },
  passengerText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  passengerSubText: { color: '#CCC', fontSize: 12, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' },
  avatarSmall: { width: 24, height: 24, borderRadius: 12 },
  avatarPlaceholderSmall: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' },
  actionButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  startBtn: { backgroundColor: '#FFD700', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  startBtnText: { color: '#121212', fontWeight: 'bold', fontSize: 16 },
  empty: { color: '#888', textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#FFD700', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  fabText: { color: '#121212', fontWeight: 'bold', marginLeft: 8, fontSize: 16 }
});

export default ManageCarpoolsScreen;

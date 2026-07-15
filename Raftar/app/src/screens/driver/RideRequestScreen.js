import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TextInput } from 'react-native';
import Button from '../../components/common/Button';
import CarpoolMapPreview from '../../components/common/CarpoolMapPreview';
import { getRideRequests, acceptRide, counterOffer, removeRideRequest } from '../../redux/slices/driverSlice';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const RideRequestScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { rideRequests, loading, profile } = useSelector(state => state.driver);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [activeRide, setActiveRide] = useState(null);

  const socket = useSocket();

  useFocusEffect(
    React.useCallback(() => {
      fetchRideRequests();
      checkActiveRide();
    }, [])
  );

  useEffect(() => {
    if (socket) {
      const handleNewRide = (ride) => {
        console.log('[RideRequests] Received new ride via socket:', ride._id);
        fetchRideRequests();
      };
      
      const handleRideTaken = (data) => {
        console.log("DRIVER RECEIVED ride-taken:", JSON.stringify(data));
        console.log('Driver: "Ride was taken by someone (or myself)"');
        dispatch(removeRideRequest(data.rideId));
      };

      socket.on('new-ride-request', handleNewRide);
      socket.on('ride-taken', handleRideTaken);
      
      return () => {
        socket.off('new-ride-request', handleNewRide);
        socket.off('ride-taken', handleRideTaken);
      };
    }
  }, [socket]);

  const checkActiveRide = async () => {
    try {
      const response = await api.get('/drivers/current-ride');
      if (response.data?.success && response.data.ride) {
        const status = response.data.ride.status;
        if (['searching', 'accepted', 'arrived', 'started'].includes(status)) {
          setActiveRide(response.data.ride);
        } else {
          setActiveRide(null);
        }
      } else {
        setActiveRide(null);
      }
    } catch (error) {
      console.log('Error checking active ride:', error);
    }
  };

  const getBannerTitle = (status) => {
    if (status === 'searching') return 'Pending Offer';
    if (status === 'accepted') return 'Ride Accepted';
    return 'Active Ride in Progress';
  };

  const getBannerColor = (status) => {
    if (status === 'searching') return '#A29BFE'; // Purple
    return '#FFD700'; // Gold
  };

  const getBannerTextColor = (status) => {
    if (status === 'searching') return '#FFF';
    return '#000';
  };

  const fetchRideRequests = async () => {
    await dispatch(getRideRequests());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRideRequests();
    await checkActiveRide();
    setRefreshing(false);
  };

  const handleAccept = async (item) => {
    Alert.alert(
      'Accept Ride',
      'Are you sure you want to accept this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const amount = item.fare?.offered || item.fare?.accepted || 0;
              await dispatch(counterOffer({ rideId: item._id, amount })).unwrap();
              if (socket) {
                console.log("Driver joining room ride-" + item._id);
                socket.emit('join-ride', item._id);
              }
              navigation.navigate('ActiveRide', { ride: { ...item, status: 'searching' } });
              fetchRideRequests();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to send offer');
            }
          }
        }
      ]
    );
  };

  const handleDecline = (rideId) => {
    dispatch(removeRideRequest(rideId));
  };

  const handleCounterOffer = async (rideId) => {
    if (!counterAmount || parseFloat(counterAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      await dispatch(counterOffer({ rideId, amount: parseFloat(counterAmount) })).unwrap();
      if (socket) {
        console.log("Driver joining room ride-" + rideId);
        socket.emit('join-ride', rideId);
      }
      navigation.navigate('ActiveRide', { ride: { ...selectedRequest, status: 'searching' } });
      setShowCounterOffer(false);
      setCounterAmount('');
      fetchRideRequests();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send counter offer');
    }
  };

  const formatDistance = (distance) => {
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)} m`;
    }
    return `${distance.toFixed(1)} km`;
  };

  const renderRideRequest = (item) => (
    <View key={item._id} style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.riderInfo}>
          <View style={[styles.avatar, item.type === 'parcel' && { backgroundColor: '#FFD700' }]}>
            <Text style={styles.avatarText}>
              {item.type === 'parcel' ? '📦' : (item.passengerId?.name?.charAt(0) || '?')}
            </Text>
          </View>
          <View>
            <Text style={styles.riderName}>
              {item.type === 'parcel' ? 'Parcel Delivery' : item.passengerId?.name}
            </Text>
            <Text style={styles.riderRating}>
              {item.type === 'parcel' 
                ? `${item.parcel?.weight || 0}kg • ${item.parcel?.size || 'Medium'}` 
                : `⭐ ${item.passengerId?.stats?.rating || item.passengerId?.rating || 0} (${item.passengerId?.stats?.totalRatings || 0} ratings)`}
            </Text>
          </View>
        </View>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>
            {formatDistance(item.distance || 0)}
          </Text>
        </View>
      </View>

      {item.type === 'intercity' && item.scheduledTime && (
        <View style={{ paddingHorizontal: 15, paddingBottom: 10 }}>
          <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: 'bold' }}>
            Scheduled for: {new Date(item.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}
      {item.type === 'parcel' && item.parcel?.description && (
        <View style={{ paddingHorizontal: 15, paddingBottom: 10 }}>
          <Text style={{ color: '#888', fontSize: 13, fontStyle: 'italic' }}>
            "{item.parcel.description}"
          </Text>
        </View>
      )}

      <View style={styles.routeInfo}>
        <View style={styles.routePoint}>
          <Icon name="location-on" size={16} color="#4ECDC4" />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.pickup?.address}
          </Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <Icon name="flag" size={16} color="#FF6B6B" />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.dropoff?.address}
          </Text>
        </View>
      </View>

      <CarpoolMapPreview 
        pickup={item.pickup} 
        dropoff={item.dropoff} 
        style={{ height: 160, marginBottom: 12, borderRadius: 8, overflow: 'hidden' }} 
      />

      <View style={styles.requestFooter}>
        <View style={styles.fareInfo}>
          <Text style={styles.fareLabel}>Fare</Text>
          <Text style={styles.fareAmount}>Rs. {item.fare?.offered || item.fare?.accepted || 0}</Text>
        </View>
        <View style={styles.vehicleInfo}>
          <Icon name={item.type === 'parcel' ? 'local-shipping' : 'directions-car'} size={16} color="#888" />
          <Text style={styles.vehicleText}>
            {item.type === 'parcel' ? 'Parcel' : (item.vehicleType || 'Economy')}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Button
          title="Accept"
          onPress={() => handleAccept(item)}
          size="small"
          style={styles.acceptButton}
        />
        <Button
          title="Counter"
          onPress={() => {
            setSelectedRequest(item);
            setShowCounterOffer(true);
          }}
          variant="outline"
          size="small"
          style={styles.counterButton}
        />
        <Button
          title="Decline"
          onPress={() => handleDecline(item._id)}
          variant="danger"
          size="small"
          style={styles.declineButton}
        />
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Ride Requests</Text>
        <Text style={styles.subtitle}>
          {rideRequests.length} ride{rideRequests.length !== 1 ? 's' : ''} available
        </Text>
      </View>

      {/* Active Ride Banner */}
      {activeRide && (
        <TouchableOpacity 
          style={[styles.activeRideBanner, { backgroundColor: getBannerColor(activeRide.status) }]} 
          onPress={() => navigation.navigate('ActiveRide', { ride: activeRide })}
        >
          <View style={styles.activeRideBannerContent}>
            <View>
              <Text style={[styles.activeRideBannerTitle, { color: getBannerTextColor(activeRide.status) }]}>
                {getBannerTitle(activeRide.status)}
              </Text>
              <Text style={[styles.activeRideBannerSubtitle, { color: activeRide.status === 'searching' ? '#EEE' : '#333' }]}>
                Passenger: {activeRide.passengerId?.name || 'Unknown'} • Status: {activeRide.status.toUpperCase()}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={getBannerTextColor(activeRide.status)} />
          </View>
        </TouchableOpacity>
      )}

      {rideRequests.length > 0 ? (
        rideRequests.map(renderRideRequest)
      ) : (
        <View style={styles.emptyState}>
          <Icon name="directions-car" size={64} color="#333" />
          <Text style={styles.emptyTitle}>No Requests</Text>
          <Text style={styles.emptyText}>
            There are currently no ride or parcel requests in your area.
            Make sure you're online and in a busy location.
          </Text>
        </View>
      )}

      {/* Counter Offer Modal */}
      {showCounterOffer && selectedRequest && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Counter Offer</Text>
            <Text style={styles.modalSubtitle}>
              Original fare: Rs. {selectedRequest.fare?.offered || selectedRequest.fare?.accepted || 0}
            </Text>
            <View style={styles.modalInput}>
              <Text style={styles.modalInputLabel}>Your Offer</Text>
              <TextInput
                style={styles.modalInputField}
                value={counterAmount}
                onChangeText={setCounterAmount}
                placeholder="Enter amount"
                placeholderTextColor="#666"
                keyboardType="numeric"
                autoFocus
              />
            </View>
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowCounterOffer(false);
                  setCounterAmount('');
                }}
                variant="outline"
                size="small"
                style={styles.modalCancelButton}
              />
              <Button
                title="Send Offer"
                onPress={() => handleCounterOffer(selectedRequest._id)}
                size="small"
                style={styles.modalSendButton}
              />
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  activeRideBanner: {
    backgroundColor: '#FFD700',
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  activeRideBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeRideBannerTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activeRideBannerSubtitle: {
    color: '#333',
    fontSize: 14,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  requestCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  riderName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  riderRating: {
    color: '#888',
    fontSize: 12,
  },
  distanceBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: '#FFF',
    fontSize: 12,
  },
  routeInfo: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 8,
  },
  routeLine: {
    width: 2,
    height: 12,
    backgroundColor: '#333',
    marginLeft: 7,
  },
  routeText: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  fareInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fareLabel: {
    color: '#888',
    fontSize: 12,
  },
  fareAmount: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleText: {
    color: '#888',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  acceptButton: {
    flex: 1,
  },
  counterButton: {
    flex: 1,
  },
  declineButton: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 20,
  },
  modalInput: {
    marginBottom: 20,
  },
  modalInputLabel: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 8,
  },
  modalInputField: {
    backgroundColor: '#2A2A2A',
    color: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalSendButton: {
    flex: 1,
  },
});

export default RideRequestScreen;
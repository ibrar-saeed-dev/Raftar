import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  Platform,
  Modal
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { startRide, completeRide, cancelRide } from '../../redux/slices/driverSlice';
import { sendChatMessage } from '../../redux/slices/rideSlice';
import Button from '../../components/common/Button';
import { API_URL, GOOGLE_MAPS_API_KEY, VOIP_CALLING_ENABLED } from '../../config/constants';
import RatingComponent from '../../components/common/RatingComponent';
import { useSocket } from '../../context/SocketContext';
import CallService from '../../services/CallService';

const ActiveRideScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { ride } = route.params;
  const socket = useSocket();

  const [location, setLocation] = useState(null);
  const [driverToPickupCoords, setDriverToPickupCoords] = useState([]);
  const [pickupToDropoffCoords, setPickupToDropoffCoords] = useState([]);
  const [distanceToPickup, setDistanceToPickup] = useState(null);
  
  // Also react to route param changes if navigated again
  const [rideState, setRideState] = useState(ride?.status === 'searching' ? 'pending' : (ride?.status || 'accepted'));
  
  useEffect(() => {
    if (VOIP_CALLING_ENABLED && socket) {
      CallService.init(socket);
    }
  }, [socket]);

  useEffect(() => {
    if (ride?.status && ride.status !== 'searching') {
      setRideState(ride.status);
    }
  }, [ride]);

  const [loading, setLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(ride?.chat || []);
  const { user } = useSelector(state => state.auth);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const msg = {
      rideId: ride._id,
      senderId: user.id,
      message: message.trim(),
      type: 'text',
      timestamp: new Date()
    };
    
    await dispatch(sendChatMessage(msg));
    setMessages(prev => [...prev, msg]);
    setMessage('');
  };

  const mapRef = useRef(null);
  const locationInterval = useRef(null);

  useEffect(() => {
    setupLocationAndSocket();
    
    return () => {
      if (locationInterval.current) clearInterval(locationInterval.current);
    };
  }, [socket]);

  const setupLocationAndSocket = async () => {
    if (socket) {
      socket.emit('join-ride', ride._id);
    }

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission to access location was denied');
      return;
    }

    // Try last known position first for instant map render
    let lastLoc = await Location.getLastKnownPositionAsync({});
    if (lastLoc) {
      setLocation(lastLoc.coords);
      fetchRoutes(lastLoc.coords);
    }

    // Then fetch high accuracy position
    let loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
    if (!lastLoc) {
      fetchRoutes(loc.coords);
    }

    // Start emitting location every 5 seconds
    locationInterval.current = setInterval(async () => {
      try {
        const currentLoc = await Location.getCurrentPositionAsync({});
        setLocation(currentLoc.coords);
        
        if (socket) {
          socket.emit('driver-location', {
            rideId: ride._id,
            location: {
              latitude: currentLoc.coords.latitude,
              longitude: currentLoc.coords.longitude,
            }
          });
        }
      } catch (err) {
        console.log('Location interval error:', err);
      }
    }, 5000);
  };

  useEffect(() => {
    const handleBidAccepted = (data) => {
      if (data.rideId === ride._id) {
        Alert.alert('Success', 'Passenger accepted your offer!');
        setRideState('accepted');
      }
    };

    const handleRideCancelled = (data) => {
      if (data.rideId === ride._id) {
        Alert.alert('Ride Cancelled', 'The passenger has cancelled this ride.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'DriverHome' }],
        });
      }
    };

    const handleNewMessage = (data) => {
      if (data.senderId !== user.id) {
        setMessages(prev => [...prev, data]);
      }
    };

    if (socket) {
      socket.on('bid-accepted', handleBidAccepted);
      socket.on('ride-cancelled', handleRideCancelled);
      socket.on('new-message', handleNewMessage);
    }

    return () => {
      if (socket) {
        socket.off('bid-accepted', handleBidAccepted);
        socket.off('ride-cancelled', handleRideCancelled);
        socket.off('new-message', handleNewMessage);
      }
    };
  }, [socket, ride._id]);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // in metres
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

  const fetchRoutes = async (drvLoc) => {
    if (!ride.pickup?.location?.coordinates || !ride.dropoff?.location?.coordinates || !GOOGLE_MAPS_API_KEY) return;
    
    const [startLng, startLat] = ride.pickup.location.coordinates;
    const [endLng, endLat] = ride.dropoff.location.coordinates;
    const drvLat = drvLoc.latitude;
    const drvLng = drvLoc.longitude;

    // Calculate straight-line distance locally
    const dist = getDistance(drvLat, drvLng, startLat, startLng);
    setDistanceToPickup(dist);

    try {
      const resp1 = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${drvLat},${drvLng}&destination=${startLat},${startLng}&key=${GOOGLE_MAPS_API_KEY}`);
      const respJson1 = await resp1.json();
      if (respJson1.routes?.length) {
        const points = decodePolyline(respJson1.routes[0].overview_polyline.points);
        setDriverToPickupCoords(points);
        
        if (mapRef.current && rideState === 'accepted') {
          mapRef.current.fitToCoordinates(points, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
      } else {
        setDriverToPickupCoords([{ latitude: drvLat, longitude: drvLng }, { latitude: startLat, longitude: startLng }]);
      }

      const resp2 = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${startLat},${startLng}&destination=${endLat},${endLng}&key=${GOOGLE_MAPS_API_KEY}`);
      const respJson2 = await resp2.json();
      if (respJson2.routes?.length) {
        setPickupToDropoffCoords(decodePolyline(respJson2.routes[0].overview_polyline.points));
      } else {
        setPickupToDropoffCoords([{ latitude: startLat, longitude: startLng }, { latitude: endLat, longitude: endLng }]);
      }
    } catch (error) {
      console.log('Error fetching directions:', error);
      setDriverToPickupCoords([{ latitude: drvLat, longitude: drvLng }, { latitude: startLat, longitude: startLng }]);
      setPickupToDropoffCoords([{ latitude: startLat, longitude: startLng }, { latitude: endLat, longitude: endLng }]);
    }
  };

  const handleStatusAction = async () => {
    if (rideState === 'accepted') {
      if (distanceToPickup && distanceToPickup > 200) {
        Alert.alert(
          'Confirm Arrival',
          'You are more than 200m away from the pickup location. Are you sure you have arrived?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Yes, Arrived', onPress: () => setRideState('arrived') }
          ]
        );
      } else {
        setRideState('arrived');
      }
    } else if (rideState === 'arrived') {
      setLoading(true);
      try {
        await dispatch(startRide(ride._id)).unwrap();
        setRideState('started');
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to start ride');
      } finally {
        setLoading(false);
      }
    } else if (rideState === 'started') {
      setLoading(true);
      try {
        await dispatch(completeRide(ride._id)).unwrap();
        console.log('Driver: "Ride completed"');
        setRideState('completed');
        if (locationInterval.current) clearInterval(locationInterval.current);
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to complete ride');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride? This may affect your rating.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await dispatch(cancelRide(ride._id)).unwrap();
              navigation.reset({
                index: 0,
                routes: [{ name: 'DriverHome' }],
              });
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to cancel ride');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{ color: '#FFF', marginTop: 10 }}>Getting location...</Text>
      </View>
    );
  }

  const pickupCoords = ride.pickup?.location?.coordinates ? 
    { latitude: ride.pickup.location.coordinates[1], longitude: ride.pickup.location.coordinates[0] } : null;
    
  const dropoffCoords = ride.dropoff?.location?.coordinates ? 
    { latitude: ride.dropoff.location.coordinates[1], longitude: ride.dropoff.location.coordinates[0] } : null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.floatingBackButton}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: 'DriverHome' }],
            });
          }
        }}
      >
        <Icon name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
      >
        <Marker coordinate={location} title="You">
          <View style={styles.driverMarker}>
            <Icon name="directions-car" size={24} color="#FFF" />
          </View>
        </Marker>

        {pickupCoords && (
          <Marker coordinate={pickupCoords} title="Pickup">
            <View style={styles.pickupMarker}>
              <View style={styles.markerInner} />
            </View>
          </Marker>
        )}

        {dropoffCoords && (
          <Marker coordinate={dropoffCoords} title="Dropoff">
            <View style={styles.dropoffMarker}>
              <Icon name="flag" size={16} color="#FFF" />
            </View>
          </Marker>
        )}

        {rideState === 'accepted' && driverToPickupCoords.length > 0 && (
          <Polyline
            coordinates={driverToPickupCoords}
            strokeWidth={4}
            strokeColor="#1E90FF"
          />
        )}

        {(rideState === 'accepted' || rideState === 'arrived') && pickupToDropoffCoords.length > 0 && (
          <Polyline
            coordinates={pickupToDropoffCoords}
            strokeWidth={4}
            strokeColor="#999"
            lineDashPattern={[10, 10]}
          />
        )}

        {(rideState === 'started' || rideState === 'completed') && pickupToDropoffCoords.length > 0 && (
          <Polyline
            coordinates={pickupToDropoffCoords}
            strokeWidth={4}
            strokeColor="#1E90FF"
          />
        )}
      </MapView>

      <View style={styles.bottomCard}>
        {rideState === 'completed' ? (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>
              {ride.type === 'parcel' ? 'Parcel Delivered' : 'Ride Completed'}
            </Text>
            <View style={styles.fareContainer}>
              <Text style={styles.fareLabel}>Total Fare</Text>
              <Text style={styles.fareValue}>Rs. {ride.fare?.final || ride.fare?.accepted || 0}</Text>
              <Text style={styles.fareMethod}>Payment: Cash</Text>
            </View>
            <RatingComponent
              bookingId={ride?._id}
              tripType={ride?.type || 'ride'}
              ratedUser={ride?.passengerId?._id || ride?.passengerId}
              ratedUserRole="passenger"
              onDone={() => navigation.navigate('DriverHome')}
            />
          </View>
        ) : (
          <>
            <View style={styles.passengerInfo}>
              <View style={styles.passengerLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{ride.passengerId?.name?.charAt(0) || '?'}</Text>
                </View>
                <View style={styles.passengerDetailsText}>
                  <Text style={styles.passengerName}>
                    {ride.type === 'parcel' ? (ride.parcel?.receiverName || 'Receiver') : ride.passengerId?.name}
                  </Text>
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={14} color="#FFD700" />
                    <Text style={styles.passengerRating}>{ride.passengerId?.rating || '5.0'}</Text>
                  </View>
                  <Text style={styles.agreedFare}>
                    {ride.type === 'parcel' ? 'Parcel Delivery' : 'Fare'}: Rs. {ride.fare?.accepted || ride.fare?.offered || 0}
                  </Text>
                </View>
              </View>
              <View style={styles.contactActions}>
                {(rideState === 'pending' || rideState === 'accepted') && (
                  <TouchableOpacity style={[styles.contactButton, { backgroundColor: '#FF6B6B' }]} onPress={handleCancel}>
                    <Icon name="close" size={20} color="#FFF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.contactButton} onPress={() => setIsChatOpen(true)}>
                  <Icon name="chat" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactButton} onPress={async () => {
                  if (VOIP_CALLING_ENABLED) {
                    const calleeId = ride.passengerId?._id || ride.passengerId;
                    const calleeName = ride.passengerId?.name || 'Passenger';
                    navigation.navigate('InCall'); // Pre-navigate
                    await CallService.startCall(ride._id, calleeId, calleeName);
                  } else {
                    Alert.alert('Notice', 'In-app calling is disabled right now');
                  }
                }}>
                  <Icon name="phone" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            {ride.guest?.isGuestBooking && rideState !== 'pending' && (
              <View style={styles.guestInfoContainer}>
                <View style={styles.guestHeader}>
                  <Icon name="person-pin" size={18} color="#FFD700" />
                  <Text style={styles.guestTitle}>Guest Booking</Text>
                </View>
                
                {!!ride.guest.name && (
                  <Text style={styles.guestDetailText}>
                    Name: <Text style={{color: '#FFF'}}>{ride.guest.name}</Text> {ride.guest.relation ? `(${ride.guest.relation})` : ''}
                  </Text>
                )}
                {!ride.guest.name && !!ride.guest.relation && (
                  <Text style={styles.guestDetailText}>
                    Relation: <Text style={{color: '#FFF'}}>{ride.guest.relation}</Text>
                  </Text>
                )}
                
                {!!ride.guest.phoneNumber && (
                  <TouchableOpacity 
                    style={styles.guestPhoneRow}
                    onPress={() => Linking.openURL(`tel:${ride.guest.phoneNumber}`)}
                  >
                    <Icon name="phone" size={16} color="#4ECDC4" />
                    <Text style={styles.guestPhoneText}>Call Guest: {ride.guest.phoneNumber}</Text>
                  </TouchableOpacity>
                )}
                
                {!!ride.guest.note && (
                  <View style={styles.guestNoteBox}>
                    <Icon name="info-outline" size={14} color="#888" style={{marginTop: 2, marginRight: 6}} />
                    <Text style={styles.guestNoteText}>{ride.guest.note}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.addresses}>
              <View style={styles.addressRow}>
                <View style={[styles.dot, { backgroundColor: '#4ECDC4' }]} />
                <Text style={styles.addressText} numberOfLines={1}>{ride.pickup?.address}</Text>
              </View>
              <View style={styles.addressLine} />
              <View style={styles.addressRow}>
                <View style={[styles.dot, { backgroundColor: '#FF6B6B' }]} />
                <Text style={styles.addressText} numberOfLines={1}>{ride.dropoff?.address}</Text>
              </View>
            </View>

            <Button
              title={
                rideState === 'pending' ? 'Waiting for Passenger...' :
                rideState === 'accepted' ? 'Arrived at Pickup' :
                rideState === 'arrived' ? (ride.type === 'parcel' ? 'Pick Up Parcel' : 'Start Ride') :
                (ride.type === 'parcel' ? 'Deliver Parcel' : 'Complete Ride')
              }
              onPress={handleStatusAction}
              loading={loading}
              disabled={rideState === 'pending'}
              style={styles.actionButton}
              color={
                rideState === 'pending' ? '#666' :
                rideState === 'accepted' ? '#A29BFE' :
                rideState === 'arrived' ? '#4ECDC4' :
                '#FF6B6B'
              }
            />
          </>
        )}
      </View>

      {/* Chat Modal */}
      <Modal
        visible={isChatOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsChatOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.chatModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatContentWrapper}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Chat</Text>
              <TouchableOpacity onPress={() => setIsChatOpen(false)}>
                <Icon name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.chatMessages}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageBubble,
                    msg.senderId === user.id ? styles.sentMessage : styles.receivedMessage
                  ]}
                >
                  <Text style={styles.messageText}>{msg.message}</Text>
                  <Text style={styles.messageTime}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.chatInput}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#666"
                value={message}
                onChangeText={setMessage}
                multiline
              />
              <TouchableOpacity onPress={handleSendMessage}>
                <Icon name="send" size={24} color="#FFD700" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  map: {
    flex: 1,
  },
  floatingBackButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarker: {
    backgroundColor: '#1E1E1E',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
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
  dropoffMarker: {
    backgroundColor: '#FF6B6B',
    padding: 4,
    borderRadius: 12,
  },
  bottomCard: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  passengerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  passengerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  passengerName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  agreedFare: {
    color: '#FFD700',
    fontSize: 14,
    marginTop: 2,
  },
  passengerDetailsText: {
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  passengerRating: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  addresses: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  guestInfoContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  guestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  guestTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  guestDetailText: {
    color: '#CCC',
    fontSize: 14,
    marginBottom: 6,
  },
  guestPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  guestPhoneText: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  guestNoteBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  guestNoteText: {
    color: '#AAA',
    fontSize: 13,
    flex: 1,
    fontStyle: 'italic',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  addressText: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
  },
  addressLine: {
    width: 2,
    height: 15,
    backgroundColor: '#444',
    marginLeft: 4,
    marginVertical: 4,
  },
  actionButton: {
    marginTop: 5,
  },
  summaryContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryTitle: {
    color: '#4ECDC4',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  fareContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  fareLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 5,
  },
  fareValue: {
    color: '#FFD700',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  fareMethod: {
    color: '#FFF',
    fontSize: 16,
  },
  doneButton: {
    width: '100%',
  },
  chatModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  chatContentWrapper: {
    height: '50%',
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 15,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chatTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatMessages: {
    flex: 1,
    marginBottom: 10,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  sentMessage: {
    backgroundColor: '#FFD700',
    alignSelf: 'flex-end',
  },
  receivedMessage: {
    backgroundColor: '#2A2A2A',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#FFF',
    fontSize: 14,
  },
  messageTime: {
    color: '#888',
    fontSize: 10,
    marginTop: 5,
  },
  chatInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  input: {
    flex: 1,
    color: '#FFF',
    paddingHorizontal: 10,
    maxHeight: 100,
  }
});

export default ActiveRideScreen;

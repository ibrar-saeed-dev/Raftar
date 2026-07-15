import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { toggleOnlineStatus, getDriverStats, getDriverProfile } from '../../redux/slices/driverSlice';
import { useSocket } from '../../context/SocketContext';

const DriverDashboardScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { driver, stats, loading } = useSelector(state => state.driver);
  const { user } = useSelector(state => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [recentRides, setRecentRides] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const socket = useSocket();

  useEffect(() => {
    fetchDriverStats();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchRecentRides();
      checkActiveRide();
    }, [])
  );

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

  const fetchRecentRides = async () => {
    try {
      const response = await api.get('/history/driver');
      if (response.data?.success) {
        setRecentRides(response.data.history.slice(0, 3));
      }
      const earningsRes = await api.get('/drivers/earnings');
      if (earningsRes.data?.success) {
        setEarnings(earningsRes.data.earnings);
      }
    } catch (error) {
      console.log('Error fetching driver dashboard data:', error);
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

  //... (inside render)
  // I will just let the render block update the styles below.

  useEffect(() => {
    if (!socket) return;
    
    const handleBidAccepted = (data) => {
      console.log("[DriverDashboard] Received bid-accepted! Navigating to ActiveRide.");
      Alert.alert('Success', 'Passenger accepted your offer!');
      navigation.navigate('ActiveRide', { ride: data.ride });
    };

    const handleJoinRequest = (data) => {
      Alert.alert('New Carpool Request', 'A passenger wants to join your carpool!', [
        { text: 'Manage', onPress: () => navigation.navigate('ManageCarpools') },
        { text: 'Cancel', style: 'cancel' }
      ]);
    };

    const handleCarpoolRequest = (data) => {
      console.log('Received passenger carpool request:', data);
      Alert.alert(
        'Passenger Carpool Request',
        'A passenger is looking for a carpool along your route!',
        [
          { text: 'View Requests', onPress: () => navigation.navigate('DriverCarpoolRequests') },
          { text: 'Dismiss', style: 'cancel' }
        ]
      );
    };

    socket.on('bid-accepted', handleBidAccepted);
    socket.on('join-request', handleJoinRequest);
    socket.on('carpool-request', handleCarpoolRequest);
    return () => {
      socket.off('bid-accepted', handleBidAccepted);
      socket.off('join-request', handleJoinRequest);
      socket.off('carpool-request', handleCarpoolRequest);
    };
  }, [navigation, socket]);

  const fetchDriverStats = async () => {
    await dispatch(getDriverStats());
  };

  const handleToggleOnline = async () => {
    console.log('[DriverDashboard] Tapping Go Online...');
    try {
      console.log('[DriverDashboard] Checking driver profile... GET /api/drivers/profile');
      const profileAction = await dispatch(getDriverProfile());
      
      if (profileAction.error) {
        console.log('[DriverDashboard] Profile check failed (404). Navigating to DriverRegistration.');
        navigation.navigate('DriverRegistration');
        return;
      }
      
      const currentDriver = profileAction.payload.driver;
      console.log(`[DriverDashboard] Profile found. Status: ${currentDriver.status}`);
      
      if (currentDriver.status === 'pending') {
        console.log('[DriverDashboard] Status is pending. Locking toggle.');
        Alert.alert('Verification Pending', 'Your profile is under review by the admin. Please wait for approval.');
        return;
      }
      
      if (currentDriver.status === 'rejected') {
        Alert.alert('Verification Rejected', 'Your profile was rejected. Please contact support.');
        return;
      }
      
      if (currentDriver.status === 'approved' || currentDriver.status === 'active') {
        if (!driver?.isOnline) {
          // Going Online
          console.log('[DriverDashboard] Getting driver location...');
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Location permission is required to go online.');
            return;
          }
          const location = await Location.getCurrentPositionAsync({});
          const coords = [location.coords.longitude, location.coords.latitude];
          console.log('[DriverDashboard] Sending coordinates to backend:', coords);
          
          await api.post('/rides/location', {
            location: { coordinates: coords }
          });
          
          console.log('[DriverDashboard] Location updated. Toggling online status.');
          await dispatch(toggleOnlineStatus(true));
          
          // Start location interval
          window.locationInterval = setInterval(async () => {
            const loc = await Location.getCurrentPositionAsync({});
            await api.post('/rides/location', {
              location: { coordinates: [loc.coords.longitude, loc.coords.latitude] }
            }).catch(() => {});
          }, 10000);
        } else {
          // Going Offline
          console.log('[DriverDashboard] Toggling offline status.');
          if (window.locationInterval) clearInterval(window.locationInterval);
          await dispatch(toggleOnlineStatus(false));
        }
      } else {
        Alert.alert('Notice', `Your profile status is: ${currentDriver.status}`);
      }
    } catch (error) {
      console.error('[DriverDashboard] Error toggling online:', error);
      Alert.alert('Error', 'Failed to toggle online status');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDriverStats();
    await fetchRecentRides();
    await checkActiveRide();
    setRefreshing(false);
  };

  const statsCards = [
    {
      title: 'Today\'s Earnings',
      value: `Rs. ${earnings?.today?.toLocaleString() || 0}`,
      icon: 'attach-money',
      color: '#4ECDC4'
    },
    {
      title: 'Weekly Earnings',
      value: `Rs. ${earnings?.weekly?.toLocaleString() || 0}`,
      icon: 'trending-up',
      color: '#FFD700'
    },
    {
      title: 'Wallet Balance',
      value: `Rs. ${stats?.walletBalance?.toLocaleString() || 0}`,
      icon: 'account-balance-wallet',
      color: '#45B7D1'
    },
    {
      title: 'Rating',
      value: `⭐ ${stats?.profile?.rating || driver?.stats?.rating || 0}`,
      icon: 'star',
      color: '#96CEB4'
    }
  ];

  const quickActions = [
    {
      title: 'Requests',
      icon: 'directions-car',
      screen: 'RideRequest',
      color: '#FFD700'
    },
    {
      title: 'Earnings',
      icon: 'monetization-on',
      screen: 'Earnings',
      color: '#4ECDC4'
    },
    {
      title: 'Create Carpool',
      icon: 'add-circle',
      screen: 'CreateCarpool',
      color: '#FF6B6B'
    },
    {
      title: 'Manage Carpools',
      icon: 'people',
      screen: 'ManageCarpools',
      color: '#A29BFE'
    },
    {
      title: 'Intercity',
      icon: 'location-city',
      screen: 'DriverIntercity',
      color: '#B39DDB'
    }
  ];

  if (loading) {
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
      {/* Online Status Toggle */}
      <View style={styles.statusContainer}>
        <View style={styles.statusInfo}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={[styles.statusValue, driver?.isOnline ? styles.onlineText : styles.offlineText]}>
            {driver?.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.statusButton, driver?.isOnline ? styles.onlineButton : styles.offlineButton]}
          onPress={handleToggleOnline}
        >
          <Text style={styles.statusButtonText}>
            {driver?.isOnline ? 'Go Offline' : 'Go Online'}
          </Text>
        </TouchableOpacity>
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

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        {statsCards.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
              <Icon name={stat.icon} size={24} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statTitle}>{stat.title}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.actionCard, { borderColor: action.color }]}
            onPress={() => navigation.navigate(action.screen)}
          >
            <Icon name={action.icon} size={32} color={action.color} />
            <Text style={styles.actionTitle}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>


    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    margin: 15,
    padding: 20,
    borderRadius: 15,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    color: '#888',
    fontSize: 16,
    marginRight: 10,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineText: {
    color: '#4ECDC4',
  },
  offlineText: {
    color: '#FF6B6B',
  },
  statusButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  onlineButton: {
    backgroundColor: '#FF6B6B',
  },
  offlineButton: {
    backgroundColor: '#4ECDC4',
  },
  statusButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  activeRideBanner: {
    backgroundColor: '#FFD700',
    marginHorizontal: 20,
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
  statCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    margin: '1%',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statTitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    margin: '1%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  actionTitle: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 10,
  },
  recentActivity: {
    backgroundColor: '#1E1E1E',
    margin: 15,
    padding: 20,
    borderRadius: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  activityText: {
    color: '#FFF',
    flex: 1,
    marginLeft: 10,
  },
  activityTime: {
    color: '#888',
    fontSize: 12,
  },
  noActivityText: {
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default DriverDashboardScreen;
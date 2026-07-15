import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../../utils/constants';
import api from '../../services/api';

const RideHistoryScreen = () => {
  const navigation = useNavigation();
  const { user } = useSelector(state => state.auth);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const endpoint = user?.role === 'driver' ? '/history/driver' : '/history/passenger';
      const response = await api.get(endpoint);
      if (response.data?.success) {
        setHistory(response.data.history);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: '#4ECDC4',
      cancelled: '#FF6B6B',
      started: '#FFD700',
      accepted: '#45B7D1',
      pending: '#FF9F43'
    };
    return colors[status] || '#888';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderRideItem = ({ item }) => (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={() => navigation.navigate(item.tripType === 'Carpool' ? (user?.role === 'driver' ? 'ManageCarpools' : 'BookCarpool') : 'RideTracking', { rideId: item._id, carpoolId: item._id })}
    >
      <View style={styles.rideHeader}>
        <View style={styles.rideType}>
          <Icon 
            name={item.tripType === 'Parcel' ? 'local-shipping' : (item.tripType === 'Carpool' ? 'people' : 'directions-car')} 
            size={20} 
            color="#FFD700" 
          />
          <Text style={styles.rideTypeText}>{item.tripType}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.rideRoute}>
        <View style={styles.routePoint}>
          <Icon name="location-on" size={16} color="#4ECDC4" />
          <Text style={styles.routeText} numberOfLines={1}>{item.pickup?.address || 'Unknown Pickup'}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <Icon name="flag" size={16} color="#FF6B6B" />
          <Text style={styles.routeText} numberOfLines={1}>{item.dropoff?.address || 'Unknown Dropoff'}</Text>
        </View>
      </View>

      <View style={styles.rideFooter}>
        <View>
          <Text style={styles.rideDate}>{formatDate(item.date)}</Text>
          <Text style={{ color: '#CCC', fontSize: 13, marginTop: 4 }}>
            {user?.role === 'driver' ? `Passenger: ${item.passengerName}` : `Driver: ${item.driverName}`}
          </Text>
          {item.ratingGiven ? (
            <Text style={{ color: '#FFD700', fontSize: 13, marginTop: 2 }}>
              ⭐ You Rated: {item.ratingGiven}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.rideFare, item.status === 'cancelled' && { color: '#888' }]}>
          Rs. {item.status === 'cancelled' ? 0 : (item.fare || item.earnings || 0)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        renderItem={renderRideItem}
        keyExtractor={item => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="history" size={64} color="#333" />
            <Text style={styles.emptyTitle}>No Ride History</Text>
            <Text style={styles.emptyText}>
              Your ride history will appear here once you've completed some rides.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  rideCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rideTypeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  rideRoute: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
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
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingTop: 12,
  },
  rideDate: {
    color: '#888',
    fontSize: 12,
  },
  rideFare: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
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
    paddingHorizontal: 40,
  },
});

export default RideHistoryScreen;
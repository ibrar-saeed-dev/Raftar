import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const SpendingScreen = () => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [earnings, setEarnings] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/history/passenger/spending');
      if (response.data?.success) {
        setEarnings(response.data.spending);
        setChartData(response.data.chartData);
      }
    } catch (error) {
      console.log('Failed to fetch spending:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return `Rs. ${amount?.toLocaleString() || 0}`;
  };

  const getChartData = () => {
    if (chartData && chartData.labels?.length > 0) {
      return {
        labels: chartData.labels,
        datasets: [
          {
            data: chartData.data,
            color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
            strokeWidth: 2
          }
        ]
      };
    }
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          data: [0, 0, 0, 0, 0, 0, 0],
          color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Spending</Text>
        <Text style={styles.subtitle}>Your spending summary</Text>
      </View>

      {/* Total Earnings */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Lifetime Spending</Text>
        <Text style={styles.totalAmount}>{formatCurrency(earnings?.total || 0)}</Text>
        <Text style={styles.totalRides}>{earnings?.rides?.total || 0} lifetime trips completed</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {['daily', 'weekly', 'monthly'].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodText,
              selectedPeriod === period && styles.periodTextActive
            ]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <LineChart
          data={getChartData()}
          width={width - 40}
          height={200}
          chartConfig={{
            backgroundColor: '#1E1E1E',
            backgroundGradientFrom: '#1E1E1E',
            backgroundGradientTo: '#1E1E1E',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#FF6B6B',
            },
          }}
          bezier
          style={styles.chart}
          withDots={true}
          withShadow={false}
          withInnerLines={false}
          withOuterLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
        />
      </View>

      {/* Earnings Breakdown */}
      <View style={styles.breakdownSection}>
        <Text style={styles.sectionTitle}>Spending Summary</Text>
        
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Today</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(earnings?.today || 0)}</Text>
              <Text style={{color: '#666', fontSize: 12, marginTop: 4}}>{earnings?.rides?.today || 0} trips</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>This Week</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(earnings?.weekly || 0)}</Text>
              <Text style={{color: '#666', fontSize: 12, marginTop: 4}}>{earnings?.rides?.weekly || 0} trips</Text>
            </View>
          </View>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>This Month</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(earnings?.monthly || 0)}</Text>
              <Text style={{color: '#666', fontSize: 12, marginTop: 4}}>{earnings?.rides?.monthly || 0} trips</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Total Rides</Text>
              <Text style={styles.breakdownValue}>{earnings?.rides?.total || 0}</Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* Earnings By Category */}
      <View style={styles.breakdownSection}>
        <Text style={styles.sectionTitle}>By Trip Type</Text>
        
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Rides</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(earnings?.breakdown?.ride || 0)}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Carpools</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(earnings?.breakdown?.carpool || 0)}</Text>
            </View>
          </View>
          <View style={[styles.breakdownRow, {marginBottom: 0}]}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Parcels</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(earnings?.breakdown?.parcel || 0)}</Text>
            </View>
          </View>
        </View>
      </View>

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
  totalCard: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  totalLabel: {
    color: '#888',
    fontSize: 14,
  },
  totalAmount: {
    color: '#FF6B6B',
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  totalRides: {
    color: '#888',
    fontSize: 14,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#2A2A2A',
  },
  periodText: {
    color: '#888',
    fontSize: 14,
  },
  periodTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  breakdownSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  breakdownCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  breakdownItem: {
    flex: 1,
  },
  breakdownLabel: {
    color: '#888',
    fontSize: 12,
  },
  breakdownValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
});

export default SpendingScreen;

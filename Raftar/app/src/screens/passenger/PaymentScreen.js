import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Button from '../../components/common/Button';
import { processPayment } from '../../redux/slices/paymentSlice';

const PaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { amount, rideId, bookingId } = route.params || {};
  const { user } = useSelector(state => state.auth);
  const { loading } = useSelector(state => state.payment);
  
  const [selectedMethod, setSelectedMethod] = useState('wallet');
  const [processing, setProcessing] = useState(false);

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: 'money', color: '#4ECDC4' },
    { id: 'easypaisa', label: 'Easypaisa', icon: 'phone-android', color: '#FF9F43' },
    { id: 'jazzcash', label: 'JazzCash', icon: 'phone-android', color: '#A29BFE' },
    { id: 'raast', label: 'Raast', icon: 'account-balance', color: '#45B7D1' },
    { id: 'wallet', label: 'Wallet', icon: 'account-balance-wallet', color: '#FFD700' }
  ];

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const paymentData = {
        amount,
        rideId,
        bookingId,
        paymentMethod: selectedMethod
      };
      
      await dispatch(processPayment(paymentData)).unwrap();
      Alert.alert('Success', 'Payment completed successfully');
      navigation.navigate('RideTracking', { rideId });
    } catch (error) {
      Alert.alert('Payment Failed', error.message || 'Please try again');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment</Text>
        <Text style={styles.amount}>Rs. {amount?.toLocaleString() || 0}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodCard,
              selectedMethod === method.id && styles.methodCardSelected
            ]}
            onPress={() => setSelectedMethod(method.id)}
          >
            <View style={[styles.methodIcon, { backgroundColor: method.color + '20' }]}>
              <Icon name={method.icon} size={24} color={method.color} />
            </View>
            <Text style={styles.methodLabel}>{method.label}</Text>
            {selectedMethod === method.id && (
              <Icon name="check-circle" size={24} color="#FFD700" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {selectedMethod === 'wallet' && (
        <View style={styles.walletInfo}>
          <Text style={styles.walletBalance}>
            Balance: Rs. {user?.wallet?.balance?.toLocaleString() || 0}
          </Text>
          {user?.wallet?.balance < amount && (
            <Text style={styles.walletWarning}>
              Insufficient balance. Please add funds or choose another method.
            </Text>
          )}
        </View>
      )}

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Payment Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amount</Text>
          <Text style={styles.summaryValue}>Rs. {amount?.toLocaleString() || 0}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Payment Method</Text>
          <Text style={styles.summaryValue}>
            {paymentMethods.find(m => m.id === selectedMethod)?.label}
          </Text>
        </View>
        <View style={styles.summaryTotal}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>Rs. {amount?.toLocaleString() || 0}</Text>
        </View>
      </View>

      <Button
        title={processing ? 'Processing...' : 'Pay Now'}
        onPress={handlePayment}
        loading={processing}
        size="large"
        style={styles.payButton}
        disabled={selectedMethod === 'wallet' && user?.wallet?.balance < amount}
      />
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
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardSelected: {
    borderColor: '#FFD700',
    backgroundColor: '#2A2A2A',
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  methodLabel: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  walletInfo: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  walletBalance: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  walletWarning: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 8,
  },
  summary: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  summaryTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  summaryLabel: {
    color: '#888',
    fontSize: 14,
  },
  summaryValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#2A2A2A',
  },
  summaryTotalLabel: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryTotalValue: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  payButton: {
    marginBottom: 30,
  },
});

export default PaymentScreen;
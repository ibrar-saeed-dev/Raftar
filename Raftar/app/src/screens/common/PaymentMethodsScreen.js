import React, { useState, useEffect } from 'react';
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
import Icon from 'react-native-vector-icons/MaterialIcons';
import Button from '../../components/common/Button';
import { getPaymentMethods, addPaymentMethod, removePaymentMethod } from '../../redux/slices/paymentSlice';

const PaymentMethodsScreen = () => {
  const dispatch = useDispatch();
  const { paymentMethods, loading } = useSelector(state => state.payment);
  const [addingMethod, setAddingMethod] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    await dispatch(getPaymentMethods());
  };

  const handleAddCard = () => {
    // Navigate to add card screen or use Stripe
    Alert.alert('Add Card', 'This will open the card addition flow');
  };

  const handleRemoveMethod = (methodId) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await dispatch(removePaymentMethod(methodId));
            fetchPaymentMethods();
          }
        }
      ]
    );
  };

  const getMethodIcon = (type) => {
    switch (type) {
      case 'card':
        return 'credit-card';
      case 'easypaisa':
        return 'phone-android';
      case 'jazzcash':
        return 'phone-android';
      default:
        return 'payment';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Methods</Text>
        <Button
          title="Add New"
          onPress={handleAddCard}
          size="small"
          style={styles.addButton}
        />
      </View>

      {paymentMethods.length > 0 ? (
        paymentMethods.map((method) => (
          <View key={method.id} style={styles.methodCard}>
            <View style={styles.methodInfo}>
              <View style={styles.methodIcon}>
                <Icon name={getMethodIcon(method.type)} size={24} color="#FFD700" />
              </View>
              <View>
                <Text style={styles.methodName}>{method.name || method.type}</Text>
                <Text style={styles.methodDetails}>
                  {method.last4 ? `****${method.last4}` : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handleRemoveMethod(method.id)}
              style={styles.removeButton}
            >
              <Icon name="delete" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Icon name="payment" size={64} color="#333" />
          <Text style={styles.emptyTitle}>No Payment Methods</Text>
          <Text style={styles.emptyText}>
            Add a payment method to start booking rides
          </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: 16,
  },
  methodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  methodDetails: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
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
  },
});

export default PaymentMethodsScreen;
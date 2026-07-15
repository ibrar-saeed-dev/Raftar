import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Button from '../../components/common/Button';
import { getWalletBalance, addToWallet, withdrawFromWallet, getTransactions } from '../../redux/slices/paymentSlice';

const WalletScreen = () => {
  const dispatch = useDispatch();
  const { walletBalance, transactions, loading } = useSelector(state => state.payment);
  const [amount, setAmount] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    await dispatch(getWalletBalance());
    await dispatch(getTransactions());
  };

  const handleAddFunds = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      await dispatch(addToWallet({ amount: parseFloat(amount), paymentMethod: 'card' })).unwrap();
      Alert.alert('Success', 'Funds added successfully');
      setShowAddModal(false);
      setAmount('');
      fetchWalletData();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add funds');
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > walletBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      await dispatch(withdrawFromWallet({ amount: parseFloat(amount) })).unwrap();
      Alert.alert('Success', 'Withdrawal request submitted');
      setShowWithdrawModal(false);
      setAmount('');
      fetchWalletData();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to process withdrawal');
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${amount?.toLocaleString() || 0}`;
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'credit':
        return 'arrow-downward';
      case 'debit':
        return 'arrow-upward';
      default:
        return 'circle';
    }
  };

  const getTransactionColor = (type) => {
    return type === 'credit' ? '#4ECDC4' : '#FF6B6B';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>{formatCurrency(walletBalance)}</Text>
        <View style={styles.balanceActions}>
          <TouchableOpacity
            style={[styles.balanceAction, styles.addAction]}
            onPress={() => setShowAddModal(true)}
          >
            <Icon name="add" size={20} color="#FFF" />
            <Text style={styles.balanceActionText}>Add Funds</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.balanceAction, styles.withdrawAction]}
            onPress={() => setShowWithdrawModal(true)}
          >
            <Icon name="remove" size={20} color="#FFF" />
            <Text style={styles.balanceActionText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#FFD700" />
        ) : transactions.length > 0 ? (
          transactions.slice(0, 10).map((transaction, index) => (
            <View key={index} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(transaction.type) + '20' }]}>
                  <Icon name={getTransactionIcon(transaction.type)} size={20} color={getTransactionColor(transaction.type)} />
                </View>
                <View>
                  <Text style={styles.transactionTitle}>{transaction.description || transaction.type}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <Text style={[
                styles.transactionAmount,
                { color: transaction.type === 'credit' ? '#4ECDC4' : '#FF6B6B' }
              ]}>
                {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyTransactions}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        )}
      </View>

      {/* Add Funds Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Funds</Text>
            <Text style={styles.modalSubtitle}>Enter amount to add to your wallet</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>Rs.</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#666"
                keyboardType="numeric"
                autoFocus
              />
            </View>
            <View style={styles.quickAmounts}>
              {[100, 500, 1000, 2000].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={styles.quickAmount}
                  onPress={() => setAmount(value.toString())}
                >
                  <Text style={styles.quickAmountText}>Rs. {value}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowAddModal(false);
                  setAmount('');
                }}
                variant="outline"
                size="medium"
                style={styles.modalCancelButton}
              />
              <Button
                title="Add Funds"
                onPress={handleAddFunds}
                size="medium"
                style={styles.modalConfirmButton}
              />
            </View>
          </View>
        </View>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Funds</Text>
            <Text style={styles.modalSubtitle}>Amount to withdraw from wallet</Text>
            <Text style={styles.balanceText}>Available: {formatCurrency(walletBalance)}</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>Rs.</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#666"
                keyboardType="numeric"
                autoFocus
              />
            </View>
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowWithdrawModal(false);
                  setAmount('');
                }}
                variant="outline"
                size="medium"
                style={styles.modalCancelButton}
              />
              <Button
                title="Withdraw"
                onPress={handleWithdraw}
                variant="danger"
                size="medium"
                style={styles.modalConfirmButton}
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
  balanceCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  balanceLabel: {
    color: '#888',
    fontSize: 14,
  },
  balanceAmount: {
    color: '#FFD700',
    fontSize: 40,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  balanceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  addAction: {
    backgroundColor: '#FFD700',
  },
  withdrawAction: {
    backgroundColor: '#2A2A2A',
  },
  balanceActionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  transactionsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  transactionDate: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyTransactions: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
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
    marginBottom: 16,
  },
  balanceText: {
    color: '#FFD700',
    fontSize: 16,
    marginBottom: 16,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  currencySymbol: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 24,
    paddingVertical: 12,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  quickAmount: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickAmountText: {
    color: '#FFF',
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalConfirmButton: {
    flex: 1,
  },
});

export default WalletScreen;
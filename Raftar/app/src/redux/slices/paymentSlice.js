import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const processPayment = createAsyncThunk(
  'payment/process',
  async (paymentData, { rejectWithValue }) => {
    try {
      const response = await api.post('/payments/process', paymentData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.error || 'Payment failed');
    }
  }
);

export const getWalletBalance = createAsyncThunk(
  'payment/getWalletBalance',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/payments/wallet/balance');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.error || 'Failed to get wallet balance');
    }
  }
);

export const addToWallet = createAsyncThunk(
  'payment/addToWallet',
  async ({ amount, paymentMethod }, { rejectWithValue }) => {
    try {
      const response = await api.post('/payments/wallet/add', { amount, paymentMethod });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.error || 'Failed to add to wallet');
    }
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState: {
    walletBalance: 0,
    transactions: [],
    currentPayment: null,
    loading: false,
    error: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(processPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPayment = action.payload.payment;
        state.transactions.unshift(action.payload.payment);
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getWalletBalance.fulfilled, (state, action) => {
        state.walletBalance = action.payload.balance || 0;
      })
      .addCase(addToWallet.fulfilled, (state, action) => {
        state.walletBalance = action.payload.balance;
      });
  }
});

export const { clearError } = paymentSlice.actions;
export default paymentSlice.reducer;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');
const Payment = require('../models/Payment');

exports.processStripePayment = async (amount, currency, paymentMethodId, metadata) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency || 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      metadata
    });

    return {
      success: paymentIntent.status === 'succeeded',
      transactionId: paymentIntent.id,
      status: paymentIntent.status
    };
  } catch (error) {
    console.error('Stripe payment error:', error);
    throw error;
  }
};

exports.processEasypaisa = async (amount, phoneNumber, reference) => {
  try {
    // Easypaisa API integration
    const response = await axios.post(process.env.EASYPAISA_IPG_URL, {
      merchantId: process.env.EASYPAISA_MERCHANT_ID,
      password: process.env.EASYPAISA_PASSWORD,
      amount,
      phoneNumber,
      orderRef: reference,
      timestamp: new Date().toISOString()
    });

    return {
      success: response.data.status === 'success',
      transactionId: response.data.transactionId,
      reference: response.data.reference
    };
  } catch (error) {
    console.error('Easypaisa payment error:', error);
    throw error;
  }
};

exports.processJazzCash = async (amount, phoneNumber, reference) => {
  try {
    // JazzCash API integration
    const response = await axios.post(process.env.JAZZCASH_IPG_URL, {
      merchantId: process.env.JAZZCASH_MERCHANT_ID,
      password: process.env.JAZZCASH_PASSWORD,
      amount,
      phoneNumber,
      orderRef: reference,
      timestamp: new Date().toISOString()
    });

    return {
      success: response.data.status === 'success',
      transactionId: response.data.transactionId,
      reference: response.data.reference
    };
  } catch (error) {
    console.error('JazzCash payment error:', error);
    throw error;
  }
};

exports.processRaast = async (amount, accountId, reference) => {
  try {
    // Raast API integration
    const response = await axios.post(process.env.RAAST_API_URL + '/payment', {
      apiKey: process.env.RAAST_API_KEY,
      amount,
      accountId,
      orderRef: reference,
      timestamp: new Date().toISOString()
    });

    return {
      success: response.data.status === 'success',
      transactionId: response.data.transactionId,
      reference: response.data.reference
    };
  } catch (error) {
    console.error('Raast payment error:', error);
    throw error;
  }
};

exports.processWalletPayment = async (userId, amount, reference) => {
  try {
    // Check wallet balance
    const balance = await Payment.aggregate([
      {
        $match: {
          userId: userId,
          type: { $in: ['ride', 'wallet_add'] },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const currentBalance = balance.length > 0 ? balance[0].total : 0;
    
    if (currentBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Create wallet transaction
    const transaction = new Payment({
      userId,
      amount: -amount,
      type: 'wallet_payment',
      paymentMethod: 'wallet',
      status: 'completed',
      metadata: { reference }
    });

    await transaction.save();

    return {
      success: true,
      transactionId: transaction._id,
      newBalance: currentBalance - amount
    };
  } catch (error) {
    console.error('Wallet payment error:', error);
    throw error;
  }
};

exports.getWalletBalance = async (userId) => {
  try {
    const balance = await Payment.aggregate([
      {
        $match: {
          userId: userId,
          type: { $in: ['ride', 'wallet_add', 'wallet_payment'] },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    return balance.length > 0 ? balance[0].total : 0;
  } catch (error) {
    console.error('Get wallet balance error:', error);
    throw error;
  }
};
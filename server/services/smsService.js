const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// In production, use Redis to store OTPs with TTL
const otpStore = new Map();

exports.sendOTP = async (phoneNumber, otp) => {
  try {
    // Store OTP with expiry
    otpStore.set(phoneNumber, {
      otp,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Send SMS
    await client.messages.create({
      body: `Your Raftar verification code is: ${otp}`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    return true;
  } catch (error) {
    console.error('Send OTP error:', error);
    // For development, log OTP
    console.log(`OTP for ${phoneNumber}: ${otp}`);
    throw error;
  }
};

exports.verifyOTP = async (phoneNumber, otp) => {
  try {
    const stored = otpStore.get(phoneNumber);
    
    if (!stored) {
      return false;
    }

    if (Date.now() > stored.expires) {
      otpStore.delete(phoneNumber);
      return false;
    }

    if (stored.otp !== otp) {
      return false;
    }

    otpStore.delete(phoneNumber);
    return true;
  } catch (error) {
    console.error('Verify OTP error:', error);
    return false;
  }
};

exports.sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    // Twilio WhatsApp integration
    await client.messages.create({
      body: message,
      to: `whatsapp:${phoneNumber}`,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
    });
    return true;
  } catch (error) {
    console.error('WhatsApp error:', error);
    return false;
  }
};

exports.sendBulkSMS = async (phoneNumbers, message) => {
  try {
    const promises = phoneNumbers.map(phone => 
      client.messages.create({
        body: message,
        to: phone,
        from: process.env.TWILIO_PHONE_NUMBER
      })
    );
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Bulk SMS error:', error);
    return false;
  }
};
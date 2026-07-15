const twilio = require('twilio');
const nodemailer = require('nodemailer');
const User = require('../models/User');

// Initialize Twilio Client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Email transporter - Fixed: Using nodemailer.createTransport (not createTransporter)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

exports.sendNotification = async (userId, type, data) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User not found: ${userId}`);
      return false;
    }

    // Send SMS
    if (user.phoneNumber) {
      await sendSMS(user.phoneNumber, type, data);
    }

    // Send Email
    if (user.email) {
      await sendEmail(user.email, type, data);
    }

    // Send Push Notification (if device token available)
    if (user.deviceToken) {
      await sendPushNotification(user.deviceToken, type, data);
    }

    return true;
  } catch (error) {
    console.error('Notification error:', error);
    return false;
  }
};

const sendSMS = async (phoneNumber, type, data) => {
  let message = '';
  
  switch (type) {
    case 'NEW_RIDE_REQUEST':
      message = `New ride request! From: ${data.pickup} to ${data.dropoff}. Fare: Rs.${data.fare}`;
      break;
    case 'RIDE_ACCEPTED':
      message = `Your ride has been accepted! Driver: ${data.driver?.name}`;
      break;
    case 'RIDE_STARTED':
      message = `Your ride has started!`;
      break;
    case 'RIDE_COMPLETED':
      message = `Ride completed! Fare: Rs.${data.fare}`;
      break;
    case 'DRIVER_APPROVED':
      message = `Congratulations! Your driver application has been approved.`;
      break;
    case 'DRIVER_REJECTED':
      message = `Your driver application was rejected. Reason: ${data.reason}`;
      break;
    case 'SOS_ALERT':
      message = `SOS Alert! Your emergency contact has been notified.`;
      break;
    case 'PARCEL_PICKED_UP':
      message = `Your parcel has been picked up! Tracking ID: ${data.parcelId}`;
      break;
    case 'PARCEL_DELIVERED':
      message = `Your parcel has been delivered! Thank you for using Raftar.`;
      break;
    default:
      message = data.message || 'Notification from Raftar';
  }

  try {
    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('Twilio not configured. SMS not sent.');
      return;
    }

    await twilioClient.messages.create({
      body: message,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    console.log(`SMS sent to ${phoneNumber}`);
  } catch (error) {
    console.log('SMS error suppressed:', error.message);
    // Don't throw, just log the error
  }
};

const sendEmail = async (email, type, data) => {
  let subject = '';
  let html = '';

  switch (type) {
    case 'RIDE_COMPLETED':
      subject = 'Ride Completed - Raftar';
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #121212; color: #FFFFFF; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1E1E1E; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px solid #FFD700; padding-bottom: 20px; }
            .logo { color: #FFD700; font-size: 32px; font-weight: bold; }
            .content { padding: 20px 0; }
            .fare { font-size: 24px; color: #FFD700; font-weight: bold; }
            .footer { text-align: center; border-top: 1px solid #333; padding-top: 20px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🚗 Raftar</div>
            </div>
            <div class="content">
              <h2>Your ride has been completed!</h2>
              <p>Fare: <span class="fare">Rs.${data.fare}</span></p>
              <p>Thank you for using Raftar!</p>
              <p>Rate your driver to help improve our service.</p>
            </div>
            <div class="footer">
              <p>© 2024 Raftar. All rights reserved.</p>
              <p>Need help? Contact us at support@raftar.com</p>
            </div>
          </div>
        </body>
        </html>
      `;
      break;
    
    case 'DRIVER_APPROVED':
      subject = 'Driver Application Approved - Raftar';
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #121212; color: #FFFFFF; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1E1E1E; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px solid #FFD700; padding-bottom: 20px; }
            .logo { color: #FFD700; font-size: 32px; font-weight: bold; }
            .content { padding: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #FFD700; color: #121212; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .footer { text-align: center; border-top: 1px solid #333; padding-top: 20px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🚗 Raftar</div>
            </div>
            <div class="content">
              <h2>Congratulations!</h2>
              <p>Your driver application has been approved.</p>
              <p>You can now start accepting rides.</p>
              <br>
              <a href="https://raftar.com/driver/dashboard" class="button">Go to Dashboard</a>
            </div>
            <div class="footer">
              <p>© 2024 Raftar. All rights reserved.</p>
              <p>Need help? Contact us at support@raftar.com</p>
            </div>
          </div>
        </body>
        </html>
      `;
      break;
    
    case 'DRIVER_REJECTED':
      subject = 'Driver Application Update - Raftar';
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #121212; color: #FFFFFF; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1E1E1E; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px solid #FF6B6B; padding-bottom: 20px; }
            .logo { color: #FFD700; font-size: 32px; font-weight: bold; }
            .content { padding: 20px 0; }
            .reason { background-color: #2A2A2A; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; border-top: 1px solid #333; padding-top: 20px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🚗 Raftar</div>
            </div>
            <div class="content">
              <h2>Driver Application Update</h2>
              <p>We regret to inform you that your driver application has been rejected.</p>
              <div class="reason">
                <strong>Reason:</strong> ${data.reason || 'Please contact support for more information.'}
              </div>
              <p>You can reapply after addressing the issues mentioned above.</p>
            </div>
            <div class="footer">
              <p>© 2024 Raftar. All rights reserved.</p>
              <p>Need help? Contact us at support@raftar.com</p>
            </div>
          </div>
        </body>
        </html>
      `;
      break;
    
    case 'SOS_ALERT':
      subject = '🚨 SOS Alert - Raftar Emergency';
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #121212; color: #FFFFFF; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1E1E1E; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px solid #FF6B6B; padding-bottom: 20px; }
            .logo { color: #FFD700; font-size: 32px; font-weight: bold; }
            .content { padding: 20px 0; }
            .alert { background-color: #FF6B6B20; padding: 20px; border-radius: 10px; border: 2px solid #FF6B6B; }
            .footer { text-align: center; border-top: 1px solid #333; padding-top: 20px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🚨 Raftar</div>
            </div>
            <div class="content">
              <div class="alert">
                <h2>⚠️ SOS Alert!</h2>
                <p>An emergency alert has been triggered by a Raftar user.</p>
                <p><strong>Location:</strong> ${data.location || 'Unknown'}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p>Please check on the user immediately.</p>
            </div>
            <div class="footer">
              <p>© 2024 Raftar. All rights reserved.</p>
              <p>This is an automated alert. Please respond immediately.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      break;
    
    default:
      subject = 'Notification from Raftar';
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #121212; color: #FFFFFF; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1E1E1E; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px solid #FFD700; padding-bottom: 20px; }
            .logo { color: #FFD700; font-size: 32px; font-weight: bold; }
            .content { padding: 20px 0; }
            .footer { text-align: center; border-top: 1px solid #333; padding-top: 20px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🚗 Raftar</div>
            </div>
            <div class="content">
              <h2>${data.title || 'Notification'}</h2>
              <p>${data.message || 'You have a new notification from Raftar'}</p>
            </div>
            <div class="footer">
              <p>© 2024 Raftar. All rights reserved.</p>
              <p>Need help? Contact us at support@raftar.com</p>
            </div>
          </div>
        </body>
        </html>
      `;
  }

  try {
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email not configured. Email not sent.');
      return;
    }

    await transporter.sendMail({
      from: `"Raftar" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: html
    });
    console.log(`Email sent to ${email}`);
  } catch (error) {
    console.error('Email error:', error);
    // Don't throw, just log the error
  }
};

const sendPushNotification = async (deviceToken, type, data) => {
  // Implement push notification using FCM or APNS
  console.log('Push notification placeholder:', { deviceToken, type, data });
  // In production, integrate with Firebase Cloud Messaging or Apple Push Notification Service
};

exports.sendBulkNotification = async (userIds, type, data) => {
  const results = await Promise.allSettled(
    userIds.map(id => exports.sendNotification(id, type, data))
  );
  
  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.filter(r => r.status === 'rejected' || r.value === false).length;
  
  console.log(`Bulk notification: ${succeeded} succeeded, ${failed} failed`);
  return { succeeded, failed };
};

exports.sendSOSAlert = async (rideId, contacts, location) => {
  const messages = contacts.map(contact => ({
    to: contact.phone,
    message: `SOS Alert! Emergency from Raftar user. Location: ${location.address || location.coordinates || 'Unknown'}`
  }));

  // Send SOS messages
  for (const msg of messages) {
    try {
      await sendSMS(msg.to, 'SOS_ALERT', { message: msg.message });
    } catch (error) {
      console.error(`Failed to send SOS to ${msg.to}:`, error);
    }
  }

  // Also notify emergency services
  try {
    await sendSMS('1122', 'SOS_ALERT', {
      message: `Emergency alert from Raftar. Location: ${location.address || location.coordinates || 'Unknown'}`
    });
  } catch (error) {
    console.error('Failed to notify emergency services:', error);
  }

  console.log(`SOS alerts sent for ride ${rideId} to ${contacts.length} contacts`);
};

// Test email configuration
exports.testEmail = async () => {
  try {
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

// Send welcome email
exports.sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to Raftar!';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #121212; color: #FFFFFF; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1E1E1E; border-radius: 10px; }
        .header { text-align: center; border-bottom: 2px solid #FFD700; padding-bottom: 20px; }
        .logo { color: #FFD700; font-size: 32px; font-weight: bold; }
        .content { padding: 20px 0; }
        .features { display: flex; justify-content: space-around; margin: 20px 0; }
        .feature { text-align: center; flex: 1; }
        .footer { text-align: center; border-top: 1px solid #333; padding-top: 20px; color: #888; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚗 Raftar</div>
        </div>
        <div class="content">
          <h2>Welcome ${name}!</h2>
          <p>Thank you for joining Raftar. Your ride-sharing journey starts now!</p>
          <div class="features">
            <div class="feature">
              <h3>🚗 Book Rides</h3>
              <p>Get to your destination safely</p>
            </div>
            <div class="feature">
              <h3>👥 Carpool</h3>
              <p>Share rides and save money</p>
            </div>
            <div class="feature">
              <h3>📦 Send Parcels</h3>
              <p>Fast and reliable delivery</p>
            </div>
          </div>
          <p>Ready to start? Book your first ride now!</p>
        </div>
        <div class="footer">
          <p>© 2024 Raftar. All rights reserved.</p>
          <p>Need help? Contact us at support@raftar.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Raftar" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: html
    });
    console.log(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Welcome email error:', error);
    return false;
  }
};
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useDispatch } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import OTPTextInput from 'react-native-otp-textinput';
import Button from '../../components/common/Button';
import { verifyOTP, sendOTP } from '../../redux/slices/authSlice';
import api from '../../services/api';

const OTPScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const otpInput = useRef(null);
  
  const { phoneNumber } = route.params || {};
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!phoneNumber) {
      navigation.goBack();
    }
    startTimer();
  }, []);

  const startTimer = () => {
    setCanResend(false);
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      await dispatch(verifyOTP({ phoneNumber, otp })).unwrap();
      // Navigation handled by AppNavigator
    } catch (error) {
      Alert.alert('Verification Failed', error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    
    try {
      await api.post('/auth/send-otp', { phoneNumber });
      Alert.alert('Success', 'OTP resent successfully');
      startTimer();
    } catch (error) {
      Alert.alert('Error', 'Failed to resend OTP');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="verified" size={60} color="#FFD700" />
          </View>
          <Text style={styles.title}>Verify Your Phone</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to {'\n'}
            <Text style={styles.phoneNumber}>{phoneNumber}</Text>
          </Text>
        </View>

        <View style={styles.otpContainer}>
          <OTPTextInput
            ref={otpInput}
            handleTextChange={setOtp}
            inputCount={6}
            autoFocus
            tintColor="#FFD700"
            offTintColor="#333"
            textInputStyle={styles.otpInput}
            containerStyle={styles.otpContainerStyle}
          />
        </View>

        <Button
          title="Verify"
          onPress={handleVerifyOTP}
          loading={loading}
          size="large"
          style={styles.verifyButton}
        />

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>
            Didn't receive the code? 
          </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResendOTP}>
              <Text style={styles.resendLink}> Resend</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}> Resend in {resendTimer}s</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.changeNumber}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.changeNumberText}>Change Phone Number</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneNumber: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  otpContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  otpContainerStyle: {
    width: '100%',
    justifyContent: 'center',
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#2A2A2A',
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  verifyButton: {
    marginBottom: 20,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    color: '#888',
    fontSize: 14,
  },
  resendLink: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timerText: {
    color: '#666',
    fontSize: 14,
  },
  changeNumber: {
    alignSelf: 'center',
    marginTop: 20,
  },
  changeNumberText: {
    color: '#888',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default OTPScreen;
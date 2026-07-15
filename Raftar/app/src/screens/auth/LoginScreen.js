import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { login } from '../../redux/slices/authSlice';

const LoginScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector(state => state.auth);
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!phoneNumber || phoneNumber.length < 10) {
      newErrors.phoneNumber = 'Valid phone number is required';
    }
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    
    try {
      await dispatch(login({ phoneNumber, password })).unwrap();
      // Navigation will be handled by AppNavigator
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    }
  };

  const handleOTPLogin = () => {
    navigation.navigate('OTP', { phoneNumber });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.logoText}>Raftar</Text>
          <Text style={styles.subtitle}>Your Ride, Your Way</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="03XX-XXXXXXX"
            icon="phone"
            keyboardType="phone-pad"
            error={errors.phoneNumber}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            icon="lock"
            secureTextEntry
            error={errors.password}
          />

          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            title="Login"
            onPress={handleLogin}
            loading={loading}
            size="large"
            style={styles.loginButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Login with OTP"
            onPress={handleOTPLogin}
            variant="outline"
            size="large"
            style={styles.otpButton}
          />

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.socialLogin}>
            <Text style={styles.socialLoginText}>Or continue with</Text>
            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialButton}>
                <Icon name="account-circle" size={24} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Icon name="facebook" size={24} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Icon name="apple" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFD700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 18,
    color: '#888',
    marginTop: 8,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#FFD700',
    fontSize: 14,
  },
  loginButton: {
    marginTop: 10,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  otpButton: {
    marginBottom: 10,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#888',
    fontSize: 14,
  },
  registerLink: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  socialLogin: {
    marginTop: 30,
    alignItems: 'center',
  },
  socialLoginText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 15,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  version: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default LoginScreen;
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { register, clearError } from '../../redux/slices/authSlice';
import { validatePhoneNumber, validateEmail, validateCNIC, validatePassword, validateName } from '../../utils/validators';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    cnic: '',
    gender: 'male',
    role: 'passenger'
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
    // Clear global error on any change
    if (error) {
      dispatch(clearError());
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow access to your photo library to set a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setProfilePhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const validate = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    }
    
    // Phone number validation
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format (e.g., 03XXXXXXXXX)';
    }
    
    // Email validation (optional)
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Invalid email address format';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // CNIC validation (optional)
    if (formData.cnic && !validateCNIC(formData.cnic)) {
      newErrors.cnic = 'Invalid CNIC format (XXXXX-XXXXXXX-X)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    // Clear previous errors
    dispatch(clearError());
    
    // Validate form
    if (!validate()) {
      // Scroll to first error
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        Alert.alert('Validation Error', errors[firstError]);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare user data for registration
      const userData = {
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim() || undefined,
        password: formData.password,
        role: formData.role,
        cnic: formData.cnic.trim() || undefined,
        gender: formData.gender,
        profilePhoto: profilePhoto?.uri || undefined
      };

      // Dispatch register action
      const result = await dispatch(register(userData)).unwrap();
      
      if (result && result.success) {
        // Show success message
        Alert.alert(
          'Registration Successful',
          'Your account has been created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigation will be handled by AppNavigator based on auth state
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle specific error messages
      let errorMessage = 'Registration failed. Please try again.';
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      }

      // Check for specific error cases
      if (errorMessage.toLowerCase().includes('already exists')) {
        errorMessage = 'This phone number is already registered. Please login instead.';
      } else if (errorMessage.toLowerCase().includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
          >
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.profileImageContainer} 
            onPress={pickImage}
            disabled={isSubmitting}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto.uri }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Icon name="person-add" size={40} color="#666" />
                <Text style={styles.profilePlaceholderText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.profileHint}>Tap to add profile photo</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name *"
            value={formData.name}
            onChangeText={(value) => handleChange('name', value)}
            placeholder="Enter your full name"
            icon="person"
            error={errors.name}
            editable={!isSubmitting}
          />

          <Input
            label="Phone Number *"
            value={formData.phoneNumber}
            onChangeText={(value) => handleChange('phoneNumber', value)}
            placeholder="03XX-XXXXXXX"
            icon="phone"
            keyboardType="phone-pad"
            error={errors.phoneNumber}
            editable={!isSubmitting}
          />

          <Input
            label="Email (Optional)"
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
            placeholder="Enter your email"
            icon="email"
            keyboardType="email-address"
            error={errors.email}
            editable={!isSubmitting}
            autoCapitalize="none"
          />

          <Input
            label="Password *"
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
            placeholder="Create a password (min 6 characters)"
            icon="lock"
            secureTextEntry
            error={errors.password}
            editable={!isSubmitting}
          />

          <Input
            label="Confirm Password *"
            value={formData.confirmPassword}
            onChangeText={(value) => handleChange('confirmPassword', value)}
            placeholder="Confirm your password"
            icon="lock-outline"
            secureTextEntry
            error={errors.confirmPassword}
            editable={!isSubmitting}
          />

          <Input
            label="CNIC (Optional)"
            value={formData.cnic}
            onChangeText={(value) => handleChange('cnic', value)}
            placeholder="XXXXX-XXXXXXX-X"
            icon="credit-card"
            error={errors.cnic}
            editable={!isSubmitting}
          />

          <View style={styles.roleSection}>
            <Text style={styles.roleLabel}>Register as *</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'passenger' && styles.roleButtonActive
                ]}
                onPress={() => handleChange('role', 'passenger')}
                disabled={isSubmitting}
              >
                <Icon 
                  name="person" 
                  size={24} 
                  color={formData.role === 'passenger' ? '#FFD700' : '#666'} 
                />
                <Text style={[
                  styles.roleText,
                  formData.role === 'passenger' && styles.roleTextActive
                ]}>Passenger</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'driver' && styles.roleButtonActive
                ]}
                onPress={() => handleChange('role', 'driver')}
                disabled={isSubmitting}
              >
                <Icon 
                  name="directions-car" 
                  size={24} 
                  color={formData.role === 'driver' ? '#FFD700' : '#666'} 
                />
                <Text style={[
                  styles.roleText,
                  formData.role === 'driver' && styles.roleTextActive
                ]}>Driver</Text>
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Icon name="error-outline" size={20} color="#FF6B6B" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            title={isSubmitting ? 'Creating Account...' : 'Create Account'}
            onPress={handleRegister}
            loading={isSubmitting}
            size="large"
            style={styles.registerButton}
            disabled={isSubmitting}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login')}
              disabled={isSubmitting}
            >
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingTop: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    alignItems: 'center',
  },
  profilePlaceholderText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  profileHint: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
  form: {
    flex: 1,
  },
  roleSection: {
    marginBottom: 20,
  },
  roleLabel: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  roleButtonActive: {
    borderColor: '#FFD700',
    backgroundColor: '#2A2A2A',
  },
  roleText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  roleTextActive: {
    color: '#FFD700',
  },
  registerButton: {
    marginTop: 10,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#888',
    fontSize: 14,
  },
  loginLink: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A1A1A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
});

export default RegisterScreen;
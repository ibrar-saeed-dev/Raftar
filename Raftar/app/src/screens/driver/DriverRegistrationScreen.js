import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { registerDriver, getDriverProfile } from '../../redux/slices/driverSlice';

const DriverRegistrationScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { loading } = useSelector(state => state.driver);

  const [vehicle, setVehicle] = useState({
    type: 'car',
    model: '',
    year: '',
    color: '',
    plateNumber: ''
  });

  const [documents, setDocuments] = useState({
    cnicFront: null,
    cnicBack: null,
    drivingLicense: null,
    vehicleRegistration: null,
    selfie: null
  });

  const pickImage = async (field) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setDocuments(prev => ({
        ...prev,
        [field]: {
          uri: result.assets[0].uri,
          name: `${field}.jpg`,
          type: 'image/jpeg'
        }
      }));
    }
  };

  const handleSubmit = async () => {
    if (!vehicle.model || !vehicle.plateNumber) {
      Alert.alert('Missing Info', 'Please fill all vehicle details');
      return;
    }
    
    if (!documents.cnicFront || !documents.drivingLicense || !documents.selfie) {
      Alert.alert('Missing Documents', 'Please upload at least CNIC Front, Driving License, and Selfie.');
      return;
    }

    try {
      const payload = {
        vehicleDetails: vehicle,
        documents: documents
      };

      console.log('[DriverRegistration] Submitting payload to registerDriver...', Object.keys(payload));
      const res = await dispatch(registerDriver(payload));
      
      if (res.error) {
        Alert.alert('Registration Failed', res.payload || 'Failed to submit form');
        console.error('[DriverRegistration] Registration error:', res.error);
        return;
      }
      
      console.log('[DriverRegistration] Success! Checking profile again...');
      await dispatch(getDriverProfile());
      
      Alert.alert(
        'Success', 
        'Your profile has been submitted for review. Verification is pending.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('[DriverRegistration] Catch block error:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const renderImagePicker = (field, label, icon) => (
    <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(field)}>
      {documents[field] ? (
        <Image source={{ uri: documents[field].uri }} style={styles.previewImage} />
      ) : (
        <View style={styles.placeholder}>
          <Icon name={icon} size={40} color="#666" />
          <Text style={styles.placeholderText}>Upload {label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Driver Onboarding</Text>
      <Text style={styles.subtitle}>Complete your profile to start earning</Text>

      {/* Vehicle Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Vehicle Type (car, bike, rickshaw)"
          placeholderTextColor="#666"
          value={vehicle.type}
          onChangeText={text => setVehicle({ ...vehicle, type: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Make & Model (e.g. Toyota Corolla)"
          placeholderTextColor="#666"
          value={vehicle.model}
          onChangeText={text => setVehicle({ ...vehicle, model: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Year"
          placeholderTextColor="#666"
          keyboardType="numeric"
          value={vehicle.year}
          onChangeText={text => setVehicle({ ...vehicle, year: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Color"
          placeholderTextColor="#666"
          value={vehicle.color}
          onChangeText={text => setVehicle({ ...vehicle, color: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="License Plate Number"
          placeholderTextColor="#666"
          value={vehicle.plateNumber}
          onChangeText={text => setVehicle({ ...vehicle, plateNumber: text })}
        />
      </View>

      {/* Documents */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Documents & Photos</Text>
        <View style={styles.grid}>
          {renderImagePicker('selfie', 'Selfie / Profile Photo', 'face')}
          {renderImagePicker('drivingLicense', 'Driving License', 'badge')}
          {renderImagePicker('vehicleRegistration', 'Registration (Book)', 'description')}
          {renderImagePicker('cnicFront', 'CNIC Front', 'credit-card')}
          {renderImagePicker('cnicBack', 'CNIC Back', 'credit-card')}
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#121212" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Application</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imagePicker: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  placeholderText: {
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  submitButton: {
    backgroundColor: '#FFD700',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#121212',
    fontSize: 18,
    fontWeight: 'bold',
  }
});

export default DriverRegistrationScreen;

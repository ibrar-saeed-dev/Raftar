import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { GOOGLE_MAPS_API_KEY } from '../../config/constants';

const CustomPlacesAutocomplete = forwardRef(({ 
  placeholder, 
  onPress, 
  styles: customStyles, 
  placeholderTextColor,
  renderRightButton
}, ref) => {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimeout = useRef(null);

  useImperativeHandle(ref, () => ({
    setAddressText: (text) => {
      setQuery(text);
    }
  }));

  const fetchPredictions = async (text) => {
    if (!text.trim()) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_API_KEY}&components=country:pk`, {
        method: 'GET'
      });

      const data = await response.json();
      if (data.status === 'OK' && data.predictions) {
        setPredictions(data.predictions);
        setShowDropdown(true);
      } else if (data.status !== 'ZERO_RESULTS') {
        console.error('Places API Autocomplete Error:', data.error_message || data.status);
        setPredictions([]);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error('Error fetching autocomplete:', error);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text) => {
    setQuery(text);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  };

  const handleSelectPrediction = async (prediction) => {
    setQuery(prediction.description);
    setShowDropdown(false);
    setPredictions([]);
    
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${GOOGLE_MAPS_API_KEY}`, {
        method: 'GET'
      });
      
      const placeDetails = await response.json();
      
      if (placeDetails.status === 'OK' && placeDetails.result) {
        const result = {
          description: placeDetails.result.formatted_address || prediction.description,
          place_id: placeDetails.result.place_id || prediction.place_id
        };
        
        const details = {
          geometry: {
            location: {
              lat: placeDetails.result.geometry?.location?.lat,
              lng: placeDetails.result.geometry?.location?.lng
            }
          }
        };
        
        onPress(result, details);
      } else {
        console.error('Places API Details Error:', placeDetails.error_message || placeDetails.status);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };

  return (
    <View style={[styles.container, customStyles?.container]}>
      <View style={[styles.inputContainer, customStyles?.textInputContainer]}>
        <TextInput
          style={[styles.input, customStyles?.textInput]}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor || '#666'}
          value={query}
          onChangeText={handleTextChange}
        />
        {renderRightButton && renderRightButton()}
        {loading && <ActivityIndicator size="small" color="#FFD700" style={[styles.loader, renderRightButton && { right: 40 }]} />}
      </View>
      
      {showDropdown && predictions.length > 0 && (
        <View style={[styles.dropdown, customStyles?.listView]}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.predictionRow, customStyles?.row]}
                onPress={() => handleSelectPrediction(item)}
              >
                <Text style={[styles.predictionText, customStyles?.description]}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    zIndex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
  },
  loader: {
    position: 'absolute',
    right: 12,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    elevation: 5,
    zIndex: 1000,
  },
  predictionRow: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  predictionText: {
    fontSize: 14,
    color: '#333',
  }
});

export default CustomPlacesAutocomplete;

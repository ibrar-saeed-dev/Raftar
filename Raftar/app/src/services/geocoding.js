import { GOOGLE_MAPS_API_KEY } from '../config/constants';

class GeocodingService {
  async geocodeAddress(address) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
          formattedAddress: data.results[0].formatted_address,
          placeId: data.results[0].place_id,
        };
      }
      throw new Error('Address not found');
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        return {
          address: data.results[0].formatted_address,
          placeId: data.results[0].place_id,
          components: data.results[0].address_components,
        };
      }
      throw new Error('Location not found');
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw error;
    }
  }

  async getAutocompleteSuggestions(input) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          input
        )}&key=${GOOGLE_MAPS_API_KEY}&components=country:pk`
      );
      const data = await response.json();
      
      if (data.status === 'OK') {
        return data.predictions.map(prediction => ({
          id: prediction.place_id,
          description: prediction.description,
          placeId: prediction.place_id,
        }));
      }
      return [];
    } catch (error) {
      console.error('Autocomplete error:', error);
      return [];
    }
  }

  async getPlaceDetails(placeId) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?placeid=${placeId}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK') {
        const result = data.result;
        return {
          address: result.formatted_address,
          location: result.geometry.location,
          phone: result.formatted_phone_number,
          website: result.website,
          rating: result.rating,
          reviews: result.reviews,
          photos: result.photos,
        };
      }
      throw new Error('Place not found');
    } catch (error) {
      console.error('Place details error:', error);
      throw error;
    }
  }

  async calculateDistance(origin, destination) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK') {
        const element = data.rows[0].elements[0];
        if (element.status === 'OK') {
          return {
            distance: element.distance.value / 1000, // in km
            duration: element.duration.value / 60, // in minutes
            distanceText: element.distance.text,
            durationText: element.duration.text,
          };
        }
      }
      throw new Error('Distance calculation failed');
    } catch (error) {
      console.error('Distance calculation error:', error);
      throw error;
    }
  }
}

export default new GeocodingService();
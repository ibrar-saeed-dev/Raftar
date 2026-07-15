import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { GOOGLE_MAPS_API_KEY } from '../../config/constants';

const decodePolyline = (t, e) => {
  for (var n, o, u = 0, l = 0, r = 0, d = [], h = 0, i = 0, a = null, c = Math.pow(10, e || 5); u < t.length; ) {
    a = null, h = 0, i = 0;
    do a = t.charCodeAt(u++) - 63, i |= (31 & a) << h, h += 5; while (a >= 32);
    n = 1 & i ? ~(i >> 1) : i >> 1, h = i = 0;
    do a = t.charCodeAt(u++) - 63, i |= (31 & a) << h, h += 5; while (a >= 32);
    o = 1 & i ? ~(i >> 1) : i >> 1, l += n, r += o, d.push([l / c, r / c]);
  }
  return d.map(p => ({ latitude: p[0], longitude: p[1] }));
};

const CarpoolMapPreview = ({ pickup, dropoff, style }) => {
  const [routeCoords, setRouteCoords] = useState([]);
  const mapRef = useRef(null);

  const pLoc = pickup?.location?.coordinates || [0,0];
  const dLoc = dropoff?.location?.coordinates || [0,0];
  
  const region = {
    latitude: (pLoc[1] + dLoc[1]) / 2,
    longitude: (pLoc[0] + dLoc[0]) / 2,
    latitudeDelta: Math.abs(pLoc[1] - dLoc[1]) * 1.5 || 0.05,
    longitudeDelta: Math.abs(pLoc[0] - dLoc[0]) * 1.5 || 0.05,
  };

  useEffect(() => {
    const fetchRoute = async () => {
      if (!pLoc[0] || !dLoc[0] || !GOOGLE_MAPS_API_KEY) return;
      try {
        const startLng = pLoc[0];
        const startLat = pLoc[1];
        const endLng = dLoc[0];
        const endLat = dLoc[1];

        const resp = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${startLat},${startLng}&destination=${endLat},${endLng}&key=${GOOGLE_MAPS_API_KEY}`);
        const respJson = await resp.json();
        
        if (respJson.routes && respJson.routes.length) {
          const points = decodePolyline(respJson.routes[0].overview_polyline.points);
          setRouteCoords(points);
          if (mapRef.current) {
            mapRef.current.fitToCoordinates(points, {
              edgePadding: { top: 30, right: 30, bottom: 30, left: 30 },
              animated: true,
            });
          }
        }
      } catch (error) {
        console.log('Error fetching carpool route:', error);
      }
    };

    fetchRoute();
  }, [pickup, dropoff]);

  if (!pLoc[1] || !dLoc[1]) {
    return (
      <View style={[styles.container, style, styles.center]}>
        <ActivityIndicator color="#FFD700" />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView 
        ref={mapRef}
        style={styles.map} 
        initialRegion={region} 
        scrollEnabled={true} 
        zoomEnabled={true}
        pitchEnabled={false}
      >
        <Marker coordinate={{ latitude: pLoc[1], longitude: pLoc[0] }} pinColor="#4ECDC4" title="Pickup" />
        <Marker coordinate={{ latitude: dLoc[1], longitude: dLoc[0] }} pinColor="#FF6B6B" title="Dropoff" />
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={3}
            strokeColor="#4ECDC4"
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A'
  }
});

export default CarpoolMapPreview;

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { StatusBar } from 'react-native';

import IncomingCallScreen from '../screens/common/IncomingCallScreen';
import InCallScreen from '../screens/common/InCallScreen';
import SharedRideViewScreen from '../screens/common/SharedRideViewScreen';
import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');
const linking = {
  prefixes: [prefix, 'raftar://'],
  config: {
    screens: {
      SharedRideView: 'share/:token',
    }
  }
};

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, loading } = useSelector(state => state.auth);

  if (loading) {
    return null; // Show splash screen
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainNavigator} />
              <Stack.Screen 
                name="IncomingCall" 
                component={IncomingCallScreen} 
                options={{ presentation: 'fullScreenModal' }} 
              />
              <Stack.Screen 
                name="InCall" 
                component={InCallScreen} 
                options={{ presentation: 'fullScreenModal' }} 
              />
            </>
          )}
          <Stack.Screen name="SharedRideView" component={SharedRideViewScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

export default AppNavigator;
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Passenger Screens
import HomeScreen from '../screens/passenger/HomeScreen';
import BookRideScreen from '../screens/passenger/BookRideScreen';
import BookCarpoolScreen from '../screens/passenger/BookCarpoolScreen';
import SendParcelScreen from '../screens/passenger/SendParcelScreen';
import BookIntercityScreen from '../screens/passenger/BookIntercityScreen';
import RideTrackingScreen from '../screens/passenger/RideTrackingScreen';
import PaymentScreen from '../screens/passenger/PaymentScreen';
import SpendingScreen from '../screens/passenger/SpendingScreen';

import DriverDashboardScreen from '../screens/driver/DriverDashboardScreen';
import RideRequestScreen from '../screens/driver/RideRequestScreen';
import EarningsScreen from '../screens/driver/EarningsScreen';
import DriverRegistrationScreen from '../screens/driver/DriverRegistrationScreen';
import ActiveRideScreen from '../screens/driver/ActiveRideScreen';
import CreateCarpoolScreen from '../screens/driver/CreateCarpoolScreen';
import ManageCarpoolsScreen from '../screens/driver/ManageCarpoolsScreen';
import CarpoolExecutionScreen from '../screens/driver/CarpoolExecutionScreen';
import DriverCarpoolRequestsScreen from '../screens/driver/DriverCarpoolRequestsScreen';
import DriverIntercityScreen from '../screens/driver/DriverIntercityScreen';

// Common Screens
import ProfileScreen from '../screens/common/ProfileScreen';
import SettingsScreen from '../screens/common/SettingsScreen';
import PaymentMethodsScreen from '../screens/common/PaymentMethodsScreen';
import WalletScreen from '../screens/common/WalletScreen';
import HelpCenterScreen from '../screens/common/HelpCenterScreen';
import RideHistoryScreen from '../screens/common/RideHistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Passenger Stack Navigator
const PassengerStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#121212' },
        headerTitleStyle: { color: '#FFD700' },
        headerTintColor: '#FFD700',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="PassengerHome" component={HomeScreen} options={{ title: 'Raftar' }} />
      <Stack.Screen name="BookRide" component={BookRideScreen} options={{ title: 'Book a Ride' }} />
      <Stack.Screen name="BookCarpool" component={BookCarpoolScreen} options={{ title: 'Book Carpool' }} />
      <Stack.Screen name="SendParcel" component={SendParcelScreen} options={{ title: 'Send Parcel' }} />
      <Stack.Screen name="BookIntercity" component={BookIntercityScreen} options={{ title: 'Intercity Travel' }} />
      <Stack.Screen name="RideTracking" component={RideTrackingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
      <Stack.Screen name="Spending" component={SpendingScreen} options={{ title: 'My Spending' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ title: 'Payment Methods' }} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ title: 'Help Center' }} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} options={{ title: 'Ride History' }} />
    </Stack.Navigator>
  );
};

// Driver Stack Navigator
const DriverStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#121212' },
        headerTitleStyle: { color: '#FFD700' },
        headerTintColor: '#FFD700',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="DriverHome" component={DriverDashboardScreen} options={{ title: 'Driver Dashboard' }} />
      <Stack.Screen name="DriverRegistration" component={DriverRegistrationScreen} options={{ title: 'Driver Onboarding' }} />
      <Stack.Screen name="RideRequest" component={RideRequestScreen} options={{ title: 'Ride Requests' }} />
      <Stack.Screen name="ActiveRide" component={ActiveRideScreen} options={{ title: 'Active Ride', headerShown: false }} />
      <Stack.Screen name="CreateCarpool" component={CreateCarpoolScreen} options={{ title: 'Create Carpool' }} />
      <Stack.Screen name="ManageCarpools" component={ManageCarpoolsScreen} options={{ title: 'Manage Carpools' }} />
      <Stack.Screen name="DriverCarpoolRequests" component={DriverCarpoolRequestsScreen} options={{ title: 'Carpool Requests' }} />
      <Stack.Screen name="CarpoolExecution" component={CarpoolExecutionScreen} options={{ title: 'Carpool Tracking', headerShown: false }} />
      <Stack.Screen name="DriverIntercity" component={DriverIntercityScreen} options={{ title: 'Intercity Rides' }} />
      <Stack.Screen name="Earnings" component={EarningsScreen} options={{ title: 'Earnings' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ title: 'Help Center' }} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} options={{ title: 'Ride History' }} />
    </Stack.Navigator>
  );
};

// Profile Stack Navigator
const ProfileStackNavigator = () => {
  const { user } = useSelector(state => state.auth);
  const isDriver = user?.role === 'driver';

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#121212' },
        headerTitleStyle: { color: '#FFD700' },
        headerTintColor: '#FFD700',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ title: 'Payment Methods' }} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ title: 'Help Center' }} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} options={{ title: 'Ride History' }} />
      {!isDriver && (
        <Stack.Screen name="Spending" component={SpendingScreen} options={{ title: 'My Spending' }} />
      )}
    </Stack.Navigator>
  );
};

const MainNavigator = () => {
  const { user } = useSelector(state => state.auth);
  const isDriver = user?.role === 'driver';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home';
          } else if (route.name === 'Ride') {
            iconName = focused ? 'car' : 'car';
          } else if (route.name === 'Carpool') {
            iconName = focused ? 'people' : 'people';
          } else if (route.name === 'Parcel') {
            iconName = focused ? 'local-shipping' : 'local-shipping';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person';
          } else if (route.name === 'Dashboard') {
            iconName = focused ? 'dashboard' : 'dashboard';
          } else if (route.name === 'Earnings') {
            iconName = focused ? 'monetization-on' : 'monetization-on';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopWidth: 1,
          borderTopColor: '#2A2A2A',
        },
        headerShown: false,
      })}
    >
      {isDriver ? (
        <>
          <Tab.Screen name="Dashboard" component={DriverStackNavigator} />
          <Tab.Screen name="Earnings" component={EarningsScreen} />
          <Tab.Screen name="Profile" component={ProfileStackNavigator} />
        </>
      ) : (
        <>
          <Tab.Screen name="Home" component={PassengerStackNavigator} />
          <Tab.Screen name="Profile" component={ProfileStackNavigator} />
        </>
      )}
    </Tab.Navigator>
  );
};

export default MainNavigator;
import React, { useEffect, useRef } from 'react';
import { 
  createBottomTabNavigator, 
  BottomTabNavigationOptions 
} from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { 
  Animated, 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconIonic from 'react-native-vector-icons/Ionicons';
import IconFA from 'react-native-vector-icons/FontAwesome5';
import IconMC from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

// Passenger Screens
import HomeScreen from '../screens/passenger/HomeScreen';
import BookRideScreen from '../screens/passenger/BookRideScreen';
import BookCarpoolScreen from '../screens/passenger/BookCarpoolScreen';
import SendParcelScreen from '../screens/passenger/SendParcelScreen';
import BookIntercityScreen from '../screens/passenger/BookIntercityScreen';
import RideTrackingScreen from '../screens/passenger/RideTrackingScreen';
import PaymentScreen from '../screens/passenger/PaymentScreen';
import SpendingScreen from '../screens/passenger/SpendingScreen';

// Driver Screens
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
import Notifications from '../screens/common/Notifications';
import AboutRaftar from '../screens/common/AboutRaftar';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const { width } = Dimensions.get('window');

// Modern Color Palette
const COLORS = {
  primary: '#F8B82A',
  primaryDark: '#E6A520',
  primaryLight: '#FFF8E6',
  primaryGradientStart: '#F8B82A',
  primaryGradientEnd: '#F9C349',
  white: '#FFFFFF',
  black: '#000000',
  dark: '#121212',
  gray: '#F5F5F5',
  grayBorder: '#EEEEEE',
  grayText: '#888888',
  grayLight: '#999999',
  darkGray: '#1A1A1A',
  tabInactive: '#999999',
  tabActive: '#F8B82A',
};

// Custom Tab Bar Button with Enhanced Animation
const CustomTabBarButton = ({ children, onPress, accessibilityState, label }) => {
  const focused = accessibilityState?.selected || false;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.15 : 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: focused ? -8 : 0,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.6,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(glowAnim, {
        toValue: focused ? 1 : 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.customTabButton}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Glow Effect */}
        <Animated.View 
          style={[
            styles.tabGlow, 
            { 
              opacity: glowAnim,
              transform: [{ scale: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1.2]
              })}]
            }
          ]} 
        />
        
        {/* Icon Container */}
        <Animated.View style={{ opacity: opacityAnim }}>
          {children}
        </Animated.View>
        
        {/* Label with animation */}
        {focused && (
          <Animated.View 
            style={[
              styles.tabLabelContainer,
              {
                opacity: glowAnim,
                transform: [{ scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1]
                })}]
              }
            ]}
          >
            <LinearGradient
              colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
              style={styles.tabLabelGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.tabLabelText}>{label}</Text>
            </LinearGradient>
          </Animated.View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Common screen options for all stacks with modern transitions
const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: COLORS.white },
  ...TransitionPresets.SlideFromRightIOS,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};

// Passenger Stack Navigator
const PassengerStackNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={screenOptions}
      initialRouteName="PassengerHome"
    >
      <Stack.Screen 
        name="PassengerHome" 
        component={HomeScreen}
        options={{
          cardStyle: { backgroundColor: COLORS.white },
        }}
      />
      <Stack.Screen name="BookRide" component={BookRideScreen} />
      <Stack.Screen name="BookCarpool" component={BookCarpoolScreen} />
      <Stack.Screen name="SendParcel" component={SendParcelScreen} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="BookIntercity" component={BookIntercityScreen} />
      <Stack.Screen name="RideTracking" component={RideTrackingScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Spending" component={SpendingScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="About" component={AboutRaftar} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
    </Stack.Navigator>
  );
};

// Driver Stack Navigator
const DriverStackNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={screenOptions}
      initialRouteName="DriverHome"
    >
      <Stack.Screen name="DriverHome" component={DriverDashboardScreen} />
      <Stack.Screen name="DriverRegistration" component={DriverRegistrationScreen} />
      <Stack.Screen name="RideRequest" component={RideRequestScreen} />
      <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
      <Stack.Screen name="CreateCarpool" component={CreateCarpoolScreen} />
      <Stack.Screen name="ManageCarpools" component={ManageCarpoolsScreen} />
      <Stack.Screen name="DriverCarpoolRequests" component={DriverCarpoolRequestsScreen} />
      <Stack.Screen name="CarpoolExecution" component={CarpoolExecutionScreen} />
      <Stack.Screen name="DriverIntercity" component={DriverIntercityScreen} />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="About" component={AboutRaftar} />
    </Stack.Navigator>
  );
};

// Driver Earnings Stack Navigator (NEW)
const DriverEarningsStackNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={screenOptions}
      initialRouteName="EarningsMain"
    >
      <Stack.Screen name="EarningsMain" component={EarningsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="About" component={AboutRaftar} />
    </Stack.Navigator>
  );
};

// Profile Stack Navigator
const ProfileStackNavigator = () => {
  const { user } = useSelector(state => state.auth || { user: null });
  const isDriver = user?.role === 'driver';

  return (
    <Stack.Navigator 
      screenOptions={screenOptions}
      initialRouteName="ProfileMain"
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
      <Stack.Screen name="About" component={AboutRaftar} />
      {!isDriver && (
        <Stack.Screen name="Spending" component={SpendingScreen} />
      )}
    </Stack.Navigator>
  );
};

const MainNavigator = () => {
  const { user } = useSelector(state => state.auth || { user: null });
  const isDriver = user?.role === 'driver';

  // Define tab screens based on user role with modern icons
  const getTabScreens = () => {
    if (isDriver) {
      return (
        <>
          <Tab.Screen 
            name="Dashboard" 
            component={DriverStackNavigator}
            options={{
              tabBarLabel: 'Home',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                  {focused ? (
                    <LinearGradient
                      colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                      style={styles.iconGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <IconMC 
                        name="view-dashboard" 
                        size={24} 
                        color={COLORS.white} 
                      />
                    </LinearGradient>
                  ) : (
                    <View style={styles.iconInactiveContainer}>
                      <IconMC 
                        name="view-dashboard-outline" 
                        size={24} 
                        color={COLORS.tabInactive} 
                      />
                    </View>
                  )}
                </View>
              ),
            }}
          />
          <Tab.Screen 
            name="Earnings" 
            component={DriverEarningsStackNavigator} // FIXED: Using Stack Navigator instead of direct component
            options={{
              tabBarLabel: 'Earnings',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                  {focused ? (
                    <LinearGradient
                      colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                      style={styles.iconGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <IconFA 
                        name="wallet" 
                        size={22} 
                        color={COLORS.white} 
                      />
                    </LinearGradient>
                  ) : (
                    <View style={styles.iconInactiveContainer}>
                      <IconFA 
                        name="wallet" 
                        size={22} 
                        color={COLORS.tabInactive} 
                      />
                    </View>
                  )}
                </View>
              ),
            }}
          />
          <Tab.Screen 
            name="Profile" 
            component={ProfileStackNavigator}
            options={{
              tabBarLabel: 'Profile',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                  {focused ? (
                    <LinearGradient
                      colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                      style={styles.iconGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <IconIonic 
                        name="person" 
                        size={24} 
                        color={COLORS.white} 
                      />
                    </LinearGradient>
                  ) : (
                    <View style={styles.iconInactiveContainer}>
                      <IconIonic 
                        name="person-outline" 
                        size={24} 
                        color={COLORS.tabInactive} 
                      />
                    </View>
                  )}
                </View>
              ),
            }}
          />
        </>
      );
    } else {
      return (
        <>
          <Tab.Screen 
            name="Home" 
            component={PassengerStackNavigator}
            options={{
              tabBarLabel: 'Home',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                  {focused ? (
                    <LinearGradient
                      colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                      style={styles.iconGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <IconIonic 
                        name="home" 
                        size={24} 
                        color={COLORS.white} 
                      />
                    </LinearGradient>
                  ) : (
                    <View style={styles.iconInactiveContainer}>
                      <IconIonic 
                        name="home-outline" 
                        size={24} 
                        color={COLORS.tabInactive} 
                      />
                    </View>
                  )}
                </View>
              ),
            }}
          />
          <Tab.Screen 
            name="Ride" 
            component={BookRideScreen}
            options={{
              tabBarLabel: 'Ride',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                  {focused ? (
                    <LinearGradient
                      colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                      style={styles.iconGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <IconMC 
                        name="car" 
                        size={24} 
                        color={COLORS.white} 
                      />
                    </LinearGradient>
                  ) : (
                    <View style={styles.iconInactiveContainer}>
                      <IconMC 
                        name="car-outline" 
                        size={24} 
                        color={COLORS.tabInactive} 
                      />
                    </View>
                  )}
                </View>
              ),
            }}
          />
          <Tab.Screen 
            name="History" 
            component={RideHistoryScreen}
            options={{
              tabBarLabel: 'History',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                  {focused ? (
                    <LinearGradient
                      colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                      style={styles.iconGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <IconIonic 
                        name="time" 
                        size={24} 
                        color={COLORS.white} 
                      />
                    </LinearGradient>
                  ) : (
                    <View style={styles.iconInactiveContainer}>
                      <IconIonic 
                        name="time-outline" 
                        size={24} 
                        color={COLORS.tabInactive} 
                      />
                    </View>
                  )}
                </View>
              ),
            }}
          />
          <Tab.Screen 
            name="Profile" 
            component={ProfileStackNavigator}
            options={{
              tabBarLabel: 'Profile',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                  {focused ? (
                    <LinearGradient
                      colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                      style={styles.iconGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <IconIonic 
                        name="person" 
                        size={24} 
                        color={COLORS.white} 
                      />
                    </LinearGradient>
                  ) : (
                    <View style={styles.iconInactiveContainer}>
                      <IconIonic 
                        name="person-outline" 
                        size={24} 
                        color={COLORS.tabInactive} 
                      />
                    </View>
                  )}
                </View>
              ),
            }}
          />
        </>
      );
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.tabActive,
        tabBarInactiveTintColor: COLORS.tabInactive,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 85 : 75,
          paddingBottom: Platform.OS === 'ios' ? 20 : 12,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          borderTopLeftRadius: 25,
          borderTopRightRadius: 25,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          letterSpacing: 0.3,
        },
        tabBarButton: (props) => {
          const route = props.children?.props?.route;
          const label = route?.name || '';
          return <CustomTabBarButton {...props} label={label} />;
        },
        headerShown: false,
      }}
    >
      {getTabScreens()}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  customTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconContainerFocused: {
    marginTop: -8,
  },
  iconInactiveContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tabGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(248, 184, 42, 0.12)',
    top: -6,
  },
  tabLabelContainer: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabLabelGradient: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

export default MainNavigator;
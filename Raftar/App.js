import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './app/src/redux/store';
import AppNavigator from './app/src/navigation/AppNavigator';
import { SocketProvider } from './app/src/context/SocketContext';
import { ThemeProvider } from './app/src/context/ThemeContext';
import { NotificationProvider } from './app/src/context/NotificationContext';
import notificationService from './app/src/services/notificationService';

export default function App() {
  useEffect(() => {
    // Initialize notifications
    const initNotifications = async () => {
      await notificationService.registerForPushNotifications();
      notificationService.setupNotificationListeners();
    };
    
    initNotifications();

    // Cleanup on unmount
    return () => {
      notificationService.cleanup();
    };
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SocketProvider>
            <NotificationProvider>
              {/* AppNavigator contains NavigationContainer */}
              <AppNavigator />
            </NotificationProvider>
          </SocketProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
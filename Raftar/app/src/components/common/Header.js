import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Header = ({
  title,
  showBack = false,
  showMenu = false,
  rightComponent,
  onBackPress,
  onMenuPress
}) => {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <View style={styles.container}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
          {showMenu && (
            <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
              <Icon name="menu" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>{title}</Text>
        </View>
        {rightComponent && (
          <View style={styles.rightSection}>
            {rightComponent}
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default Header;
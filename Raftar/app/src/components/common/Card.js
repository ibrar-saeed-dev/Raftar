import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

const Card = ({
  children,
  style,
  onPress,
  elevation = 2,
  variant = 'default'
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return styles.elevated;
      case 'outlined':
        return styles.outlined;
      default:
        return styles.default;
    }
  };

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[
        styles.card,
        getVariantStyle(),
        style,
        { elevation }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {children}
    </Component>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
  },
  default: {
    backgroundColor: '#1E1E1E',
  },
  elevated: {
    backgroundColor: '#1E1E1E',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
});

export default Card;
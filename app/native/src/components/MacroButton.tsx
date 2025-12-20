import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import { Button, TriggerResult } from '../types';
import { apiClient } from '../utils/api';

interface MacroButtonProps {
  button: Button;
  isRunning: boolean;
  result: TriggerResult | null;
  onPress: (button: Button) => void;
  onLongPress?: (button: Button) => void;
  size?: number;
}

const MacroButton = ({ button, isRunning, result, onPress, onLongPress, size }: MacroButtonProps) => {
  const sizeStyle = size 
    ? { 
        width: size, 
        height: size,
        flex: 0, // Disable flex when size is set
      } 
    : { flex: 1 }; // Use flex in portrait mode
  
  return (
    <TouchableOpacity
      style={[
        styles.buttonCard,
        sizeStyle,
        isRunning && styles.buttonCardRunning,

      ]}
      onPress={() => !isRunning && onPress(button)}
      onLongPress={() => onLongPress && onLongPress(button)}
      activeOpacity={0.8}
      disabled={isRunning}
    >
      {/* Type Badge */}
      <View style={styles.buttonHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{button.type}</Text>
        </View>
      </View>

      
      {/* Icon & Label */}
      <View style={styles.buttonContent}>
        {button.icon ? (
          <Image
            source={{ uri: apiClient.getIconUrl(button.icon) }}
            style={styles.buttonIcon}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.buttonIconPlaceholder}>
            <Text style={styles.buttonIconPlaceholderText}>⚡</Text>
          </View>
        )}
        <Text style={styles.buttonLabel} numberOfLines={2}>
          {button.label}
        </Text>
      </View>


    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonCard: {
    backgroundColor: '#171717',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 20,
    marginHorizontal: 0,
    justifyContent: 'space-between',
  },
  buttonCardRunning: {
    borderColor: '#F59E0B',
    backgroundColor: '#1C1917',
  },
  buttonCardSuccess: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B',
  },
  buttonCardError: {
    borderColor: '#EF4444',
    backgroundColor: '#450A0A',
  },
  buttonHeader: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#525252',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#262626',
  },
  statusDotRunning: {
    backgroundColor: '#F59E0B',
  },
  statusDotSuccess: {
    backgroundColor: '#10B981',
  },
  statusDotError: {
    backgroundColor: '#EF4444',
  },
  buttonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    width: 48,
    height: 48,
    marginBottom: 12,
  },
  buttonIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonIconPlaceholderText: {
    fontSize: 24,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E5E5E5',
    textAlign: 'center',
  },
  resultMessage: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultMessageSuccess: {
    color: '#6EE7B7',
  },
  resultMessageError: {
    color: '#FCA5A5',
  },
});

export default MacroButton;


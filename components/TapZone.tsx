import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';

interface TapZoneProps {
  onTap: (tapTime: number) => void;
  isActive: boolean;
}

export function TapZone({ onTap, isActive }: TapZoneProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (!isActive) return;

    // Capture tap time immediately for accuracy
    const tapTime = performance.now();

    // Visual feedback
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Report tap
    onTap(tapTime);
  }, [isActive, onTap, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] },
        !isActive && styles.inactive,
      ]}
    >
      <Pressable
        style={styles.pressable}
        onPressIn={handlePressIn}
        disabled={!isActive}
      >
        <View style={styles.innerCircle}>
          <Text style={styles.tapText}>
            {isActive ? 'TAP' : 'START TO PLAY'}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: 16,
  },
  inactive: {
    opacity: 0.5,
  },
  pressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#4a4a6a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 4,
    textAlign: 'center',
  },
});

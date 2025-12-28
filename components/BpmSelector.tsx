import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface BpmSelectorProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  disabled?: boolean;
}

const MIN_BPM = 60;
const MAX_BPM = 120;
const BPM_STEP = 5;

export function BpmSelector({ bpm, onBpmChange, disabled = false }: BpmSelectorProps) {
  const decreaseBpm = () => {
    const newBpm = Math.max(MIN_BPM, bpm - BPM_STEP);
    onBpmChange(newBpm);
  };

  const increaseBpm = () => {
    const newBpm = Math.min(MAX_BPM, bpm + BPM_STEP);
    onBpmChange(newBpm);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>BPM</Text>
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, disabled && styles.buttonDisabled]}
          onPress={decreaseBpm}
          disabled={disabled || bpm <= MIN_BPM}
        >
          <Text style={styles.buttonText}>-</Text>
        </TouchableOpacity>

        <View style={styles.bpmDisplay}>
          <Text style={styles.bpmValue}>{bpm}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, disabled && styles.buttonDisabled]}
          onPress={increaseBpm}
          disabled={disabled || bpm >= MAX_BPM}
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2a2a4a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
  bpmDisplay: {
    minWidth: 80,
    alignItems: 'center',
  },
  bpmValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
});

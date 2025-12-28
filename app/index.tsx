import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { BpmSelector } from '../components/BpmSelector';
import { TapZone } from '../components/TapZone';
import { AccuracyDisplay } from '../components/AccuracyDisplay';
import { Metronome } from '../lib/metronome';
import {
  calculateTimingOffset,
  calculateAverageOffset,
  bpmToIntervalMs,
} from '../lib/timing';

const clickSound = require('../assets/click.mp3');

export default function GameScreen() {
  const [bpm, setBpm] = useState(90);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastOffset, setLastOffset] = useState<number | null>(null);
  const [offsets, setOffsets] = useState<number[]>([]);
  const [currentBeat, setCurrentBeat] = useState(0);

  const metronomeRef = useRef<Metronome | null>(null);

  // Initialize metronome
  useEffect(() => {
    const metronome = new Metronome(clickSound);
    metronomeRef.current = metronome;

    metronome.initialize();
    metronome.setCallbacks({
      onBeat: (beatNumber) => {
        setCurrentBeat(beatNumber);
      },
    });

    return () => {
      metronome.cleanup();
    };
  }, []);

  // Update BPM when changed
  useEffect(() => {
    metronomeRef.current?.setBpm(bpm);
  }, [bpm]);

  const handleStart = useCallback(async () => {
    if (!metronomeRef.current) return;

    // Reset state
    setLastOffset(null);
    setOffsets([]);
    setCurrentBeat(0);

    await metronomeRef.current.start();
    setIsPlaying(true);
  }, []);

  const handleStop = useCallback(() => {
    if (!metronomeRef.current) return;

    metronomeRef.current.stop();
    setIsPlaying(false);
  }, []);

  const handleTap = useCallback(
    (tapTime: number) => {
      if (!metronomeRef.current) return;

      const startTime = metronomeRef.current.getStartTime();
      if (startTime === null) return;

      const beatIntervalMs = bpmToIntervalMs(bpm);
      const result = calculateTimingOffset(tapTime, startTime, beatIntervalMs);

      setLastOffset(result.offsetMs);
      setOffsets((prev) => [...prev, result.offsetMs]);
    },
    [bpm]
  );

  const averageOffset = calculateAverageOffset(offsets);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>The Pocket</Text>
        <Text style={styles.subtitle}>Timing Prototype</Text>
      </View>

      {/* BPM Control */}
      <BpmSelector bpm={bpm} onBpmChange={setBpm} disabled={isPlaying} />

      {/* Start/Stop Button */}
      <TouchableOpacity
        style={[styles.startButton, isPlaying && styles.stopButton]}
        onPress={isPlaying ? handleStop : handleStart}
      >
        <Text style={styles.startButtonText}>
          {isPlaying ? 'STOP' : 'START'}
        </Text>
      </TouchableOpacity>

      {/* Beat indicator */}
      {isPlaying && (
        <View style={styles.beatIndicator}>
          <Text style={styles.beatText}>Beat {currentBeat + 1}</Text>
        </View>
      )}

      {/* Accuracy Display */}
      <AccuracyDisplay
        lastOffset={lastOffset}
        averageOffset={averageOffset}
        tapCount={offsets.length}
      />

      {/* Tap Zone */}
      <TapZone onTap={handleTap} isActive={isPlaying} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  startButton: {
    alignSelf: 'center',
    paddingHorizontal: 48,
    paddingVertical: 16,
    backgroundColor: '#4ade80',
    borderRadius: 30,
    marginVertical: 16,
  },
  stopButton: {
    backgroundColor: '#f87171',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 2,
  },
  beatIndicator: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  beatText: {
    fontSize: 16,
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
});

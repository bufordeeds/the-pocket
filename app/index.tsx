import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BpmSelector } from '../components/BpmSelector';
import { TapZone } from '../components/TapZone';
import { AccuracyDisplay } from '../components/AccuracyDisplay';
import { CalibrationOverlay } from '../components/CalibrationOverlay';
import { Metronome } from '../lib/metronome';
import {
  calculateTimingOffset,
  calculateAverageOffset,
  bpmToIntervalMs,
} from '../lib/timing';

const clickSound = require('../assets/click.mp3');

// Default audio latency - will be replaced by calibration
const DEFAULT_AUDIO_LATENCY_MS = 0;

export default function GameScreen() {
  const [bpm, setBpm] = useState(90);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCountingIn, setIsCountingIn] = useState(false);
  const [countInBeats, setCountInBeats] = useState(0);
  const [lastOffset, setLastOffset] = useState<number | null>(null);
  const [offsets, setOffsets] = useState<number[]>([]);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [audioLatency, setAudioLatency] = useState(DEFAULT_AUDIO_LATENCY_MS);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);

  const metronomeRef = useRef<Metronome | null>(null);

  // Initialize metronome
  useEffect(() => {
    const metronome = new Metronome(clickSound);
    metronomeRef.current = metronome;

    metronome.initialize();
    metronome.setAudioLatency(audioLatency);
    metronome.setCallbacks({
      onBeat: (beatNumber) => {
        setCurrentBeat(beatNumber);
      },
      onCountIn: (beatsRemaining) => {
        setCountInBeats(beatsRemaining);
      },
      onCountInComplete: () => {
        setIsCountingIn(false);
        setCountInBeats(0);
      },
    });

    return () => {
      metronome.cleanup();
    };
  }, []);

  // Update audio latency when changed
  useEffect(() => {
    metronomeRef.current?.setAudioLatency(audioLatency);
  }, [audioLatency]);

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
    setIsCountingIn(true);

    await metronomeRef.current.start();
    setIsPlaying(true);
  }, []);

  const handleStop = useCallback(() => {
    if (!metronomeRef.current) return;

    metronomeRef.current.stop();
    setIsPlaying(false);
    setIsCountingIn(false);
    setCountInBeats(0);
  }, []);

  const handleTap = useCallback(
    (tapTime: number) => {
      if (!metronomeRef.current) return;

      // Don't count taps during count-in
      if (metronomeRef.current.isCountingIn()) return;

      // Use adjusted start time that accounts for audio latency
      const startTime = metronomeRef.current.getAdjustedStartTime();
      if (startTime === null) return;

      const beatIntervalMs = bpmToIntervalMs(bpm);
      const result = calculateTimingOffset(tapTime, startTime, beatIntervalMs);

      setLastOffset(result.offsetMs);
      setOffsets((prev) => [...prev, result.offsetMs]);
    },
    [bpm]
  );

  const handleCalibrationComplete = useCallback((latencyMs: number) => {
    setAudioLatency(latencyMs);
    setIsCalibrated(true);
    setIsCalibrating(false);
  }, []);

  const handleCalibrationCancel = useCallback(() => {
    setIsCalibrating(false);
  }, []);

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

      {/* Calibration Button */}
      {!isPlaying && (
        <View style={styles.calibrationSection}>
          {isCalibrated ? (
            <Text style={styles.calibratedText}>
              Latency: {audioLatency}ms
            </Text>
          ) : (
            <Text style={styles.notCalibratedText}>
              Not calibrated
            </Text>
          )}
          <TouchableOpacity
            style={styles.calibrateButton}
            onPress={() => setIsCalibrating(true)}
          >
            <Text style={styles.calibrateButtonText}>
              {isCalibrated ? 'Recalibrate' : 'Calibrate'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Start/Stop Button */}
      <TouchableOpacity
        style={[styles.startButton, isPlaying && styles.stopButton]}
        onPress={isPlaying ? handleStop : handleStart}
      >
        <Text style={styles.startButtonText}>
          {isPlaying ? 'STOP' : 'START'}
        </Text>
      </TouchableOpacity>

      {/* Count-in or Beat indicator */}
      {isPlaying && (
        <View style={styles.beatIndicator}>
          {isCountingIn ? (
            <Text style={styles.countInText}>{countInBeats}</Text>
          ) : (
            <Text style={styles.beatText}>Beat {currentBeat + 1}</Text>
          )}
        </View>
      )}

      {/* Accuracy Display */}
      <AccuracyDisplay
        lastOffset={lastOffset}
        averageOffset={averageOffset}
        tapCount={offsets.length}
      />

      {/* Tap Zone */}
      <TapZone onTap={handleTap} isActive={isPlaying && !isCountingIn} />

      {/* Calibration Overlay */}
      {isCalibrating && (
        <CalibrationOverlay
          audioSource={clickSound}
          onCalibrationComplete={handleCalibrationComplete}
          onCancel={handleCalibrationCancel}
        />
      )}
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
    minHeight: 50,
  },
  beatText: {
    fontSize: 16,
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
  countInText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#facc15',
  },
  calibrationSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  calibratedText: {
    fontSize: 12,
    color: '#4ade80',
    marginBottom: 8,
  },
  notCalibratedText: {
    fontSize: 12,
    color: '#f87171',
    marginBottom: 8,
  },
  calibrateButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2a2a4a',
    borderRadius: 8,
  },
  calibrateButtonText: {
    fontSize: 14,
    color: '#888',
  },
});

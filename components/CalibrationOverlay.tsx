import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Metronome } from '../lib/metronome';
import {
  calculateTimingOffset,
  calculateAverageOffset,
  bpmToIntervalMs,
} from '../lib/timing';

interface CalibrationOverlayProps {
  audioSource: any;
  onCalibrationComplete: (latencyMs: number) => void;
  onCancel: () => void;
}

const CALIBRATION_BPM = 90;
const STABILITY_THRESHOLD_MS = 2; // Average must not move more than this
const CONFIRMATION_BEATS = 16; // Hold stable for this many beats
const MIN_TAPS_BEFORE_LOCK = 8; // Need at least this many taps before we can lock

export function CalibrationOverlay({
  audioSource,
  onCalibrationComplete,
  onCancel,
}: CalibrationOverlayProps) {
  const [phase, setPhase] = useState<'ready' | 'counting' | 'tapping' | 'locked' | 'done'>('ready');
  const [countIn, setCountIn] = useState(0);
  const [offsets, setOffsets] = useState<number[]>([]);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [detectedLatency, setDetectedLatency] = useState<number | null>(null);
  const [lockedAverage, setLockedAverage] = useState<number | null>(null);
  const [confirmationTaps, setConfirmationTaps] = useState(0);

  const metronomeRef = useRef<Metronome | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const previousAvgRef = useRef<number | null>(null);

  // Initialize metronome
  useEffect(() => {
    const metronome = new Metronome(audioSource);
    metronomeRef.current = metronome;
    metronome.initialize();
    metronome.setBpm(CALIBRATION_BPM);
    metronome.setAudioLatency(0); // No latency compensation during calibration

    metronome.setCallbacks({
      onCountIn: (beatsRemaining) => {
        setCountIn(beatsRemaining);
      },
      onCountInComplete: () => {
        setPhase('tapping');
        setCountIn(0);
      },
      onBeat: (beatNumber) => {
        setCurrentBeat(beatNumber);
      },
    });

    return () => {
      metronome.cleanup();
    };
  }, [audioSource]);

  // Check calibration progress
  useEffect(() => {
    if (offsets.length < MIN_TAPS_BEFORE_LOCK) return;

    const avgOffset = calculateAverageOffset(offsets);
    const prevAvg = previousAvgRef.current;

    if (phase === 'tapping') {
      // Check if average has stabilized
      if (prevAvg !== null) {
        const drift = Math.abs(avgOffset - prevAvg);
        if (drift <= STABILITY_THRESHOLD_MS) {
          // Average is stable - lock it and start confirmation
          setLockedAverage(avgOffset);
          setConfirmationTaps(1);
          setPhase('locked');
        }
      }
      previousAvgRef.current = avgOffset;
    } else if (phase === 'locked') {
      // Check if we're still stable during confirmation
      const drift = Math.abs(avgOffset - (lockedAverage ?? avgOffset));
      if (drift > STABILITY_THRESHOLD_MS) {
        // Drifted too much - go back to tapping phase
        setPhase('tapping');
        setLockedAverage(null);
        setConfirmationTaps(0);
        previousAvgRef.current = avgOffset;
      }
    }
  }, [offsets, phase, lockedAverage]);

  // Track confirmation beats in locked phase
  useEffect(() => {
    if (phase === 'locked' && confirmationTaps >= CONFIRMATION_BEATS) {
      metronomeRef.current?.stop();
      setDetectedLatency(Math.round(lockedAverage ?? 0));
      setPhase('done');
    }
  }, [phase, confirmationTaps, lockedAverage]);

  const startCalibration = useCallback(async () => {
    if (!metronomeRef.current) return;
    setPhase('counting');
    setOffsets([]);
    setLockedAverage(null);
    setConfirmationTaps(0);
    previousAvgRef.current = null;
    await metronomeRef.current.start();
  }, []);

  const handleTap = useCallback(() => {
    if ((phase !== 'tapping' && phase !== 'locked') || !metronomeRef.current) return;

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

    // Calculate offset (no latency adjustment - we're measuring raw offset)
    const startTime = metronomeRef.current.getStartTime();
    if (startTime === null) return;

    const beatIntervalMs = bpmToIntervalMs(CALIBRATION_BPM);
    const result = calculateTimingOffset(tapTime, startTime, beatIntervalMs);

    setOffsets((prev) => [...prev, result.offsetMs]);

    // Increment confirmation counter when locked
    if (phase === 'locked') {
      setConfirmationTaps((prev) => prev + 1);
    }
  }, [phase, scaleAnim]);

  const applyCalibration = useCallback(() => {
    if (detectedLatency !== null) {
      onCalibrationComplete(detectedLatency);
    }
  }, [detectedLatency, onCalibrationComplete]);

  const avgOffset = offsets.length > 0 ? calculateAverageOffset(offsets) : 0;

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Calibration</Text>

        {phase === 'ready' && (
          <>
            <Text style={styles.instructions}>
              Tap along with the beat to calibrate audio latency for your device.
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={startCalibration}>
              <Text style={styles.startButtonText}>START</Text>
            </TouchableOpacity>
          </>
        )}

        {phase === 'counting' && (
          <View style={styles.countingContainer}>
            <Text style={styles.countInText}>{countIn}</Text>
            <Text style={styles.getReady}>Get ready...</Text>
          </View>
        )}

        {(phase === 'tapping' || phase === 'locked') && (
          <>
            <View style={styles.progressContainer}>
              {phase === 'tapping' ? (
                <>
                  <Text style={styles.progressText}>Finding your timing...</Text>
                  <Text style={styles.avgText}>
                    Avg: {avgOffset >= 0 ? '+' : ''}{Math.round(avgOffset)}ms
                  </Text>
                  <Text style={styles.hintText}>
                    Keep tapping until average stabilizes
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.lockedText}>Locked!</Text>
                  <Text style={styles.avgText}>
                    {Math.round(lockedAverage ?? 0)}ms
                  </Text>
                  <Text style={styles.confirmationText}>
                    Confirming: {confirmationTaps} / {CONFIRMATION_BEATS}
                  </Text>
                </>
              )}
            </View>

            <Animated.View style={[styles.tapZone, { transform: [{ scale: scaleAnim }] }]}>
              <Pressable style={styles.tapPressable} onPressIn={handleTap}>
                <View style={[
                  styles.tapCircle,
                  phase === 'locked' && styles.tapCircleLocked
                ]}>
                  <Text style={[
                    styles.tapText,
                    phase === 'locked' && styles.tapTextLocked
                  ]}>TAP</Text>
                  <Text style={styles.beatText}>Beat {currentBeat + 1}</Text>
                </View>
              </Pressable>
            </Animated.View>
          </>
        )}

        {phase === 'done' && (
          <View style={styles.doneContainer}>
            <Text style={styles.doneText}>Calibration Complete!</Text>
            <Text style={styles.latencyResult}>
              Detected latency: {detectedLatency}ms
            </Text>
            <TouchableOpacity style={styles.applyButton} onPress={applyCalibration}>
              <Text style={styles.applyButtonText}>APPLY</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cancel button */}
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 15, 26, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  instructions: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  startButton: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    backgroundColor: '#4ade80',
    borderRadius: 30,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 2,
  },
  countingContainer: {
    alignItems: 'center',
  },
  countInText: {
    fontSize: 72,
    fontWeight: '700',
    color: '#facc15',
  },
  getReady: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  progressText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  avgText: {
    fontSize: 18,
    color: '#888',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  hintText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  lockedText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4ade80',
  },
  confirmationText: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  tapZone: {
    width: 200,
    height: 200,
  },
  tapPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#888',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(136, 136, 136, 0.1)',
  },
  tapCircleLocked: {
    borderColor: '#4ade80',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  tapText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 4,
  },
  tapTextLocked: {
    color: '#4ade80',
  },
  beatText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  doneContainer: {
    alignItems: 'center',
  },
  doneText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4ade80',
    marginBottom: 16,
  },
  latencyResult: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 32,
  },
  applyButton: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    backgroundColor: '#4ade80',
    borderRadius: 30,
  },
  applyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 2,
  },
  cancelButton: {
    marginTop: 32,
    padding: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
});

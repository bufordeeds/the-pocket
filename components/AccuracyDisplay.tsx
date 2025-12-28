import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getAccuracyRating } from '../lib/timing';

interface AccuracyDisplayProps {
  lastOffset: number | null;
  averageOffset: number;
  tapCount: number;
}

export function AccuracyDisplay({
  lastOffset,
  averageOffset,
  tapCount,
}: AccuracyDisplayProps) {
  const getOffsetColor = (offset: number): string => {
    const absOffset = Math.abs(offset);
    if (absOffset <= 20) return '#4ade80'; // green
    if (absOffset <= 50) return '#facc15'; // yellow
    if (absOffset <= 100) return '#fb923c'; // orange
    return '#f87171'; // red
  };

  const formatOffset = (offset: number): string => {
    const sign = offset >= 0 ? '+' : '';
    return `${sign}${Math.round(offset)}ms`;
  };

  const getDirectionLabel = (offset: number): string => {
    if (Math.abs(offset) <= 20) return '';
    return offset < 0 ? 'EARLY' : 'LATE';
  };

  const rating = lastOffset !== null ? getAccuracyRating(lastOffset) : null;

  return (
    <View style={styles.container}>
      {/* Last tap result */}
      <View style={styles.lastTapSection}>
        {lastOffset !== null ? (
          <>
            <Text
              style={[
                styles.offsetValue,
                { color: getOffsetColor(lastOffset) },
              ]}
            >
              {formatOffset(lastOffset)}
            </Text>
            <Text style={styles.directionLabel}>
              {getDirectionLabel(lastOffset)}
            </Text>
            <Text
              style={[
                styles.ratingLabel,
                { color: getOffsetColor(lastOffset) },
              ]}
            >
              {rating?.label}
            </Text>
          </>
        ) : (
          <Text style={styles.placeholder}>Tap on the beat</Text>
        )}
      </View>

      {/* Stats */}
      {tapCount > 0 && (
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>
              {formatOffset(averageOffset)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Taps</Text>
            <Text style={styles.statValue}>{tapCount}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    minHeight: 140,
  },
  lastTapSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  offsetValue: {
    fontSize: 56,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  directionLabel: {
    fontSize: 14,
    color: '#888',
    letterSpacing: 3,
    marginTop: 4,
  },
  ratingLabel: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
  },
  placeholder: {
    fontSize: 20,
    color: '#555',
    fontStyle: 'italic',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 18,
    color: '#aaa',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
});

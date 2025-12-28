/**
 * Core timing calculations for rhythm accuracy detection.
 * Uses performance.now() for high-precision timing.
 */

export interface TimingResult {
  offsetMs: number; // negative = early, positive = late
  nearestBeatTime: number;
  tapTime: number;
}

/**
 * Calculate the offset between a tap and the nearest expected beat.
 * @param tapTime - The timestamp of the tap (from performance.now())
 * @param startTime - When the metronome started
 * @param beatIntervalMs - Milliseconds between beats (60000 / BPM)
 * @returns The timing result with offset in milliseconds
 */
export function calculateTimingOffset(
  tapTime: number,
  startTime: number,
  beatIntervalMs: number
): TimingResult {
  const elapsed = tapTime - startTime;

  // Find which beat we're closest to
  const beatNumber = Math.round(elapsed / beatIntervalMs);
  const nearestBeatTime = startTime + beatNumber * beatIntervalMs;

  // Calculate offset: negative = early, positive = late
  const offsetMs = tapTime - nearestBeatTime;

  return {
    offsetMs,
    nearestBeatTime,
    tapTime,
  };
}

/**
 * Convert BPM to beat interval in milliseconds
 */
export function bpmToIntervalMs(bpm: number): number {
  return 60000 / bpm;
}

/**
 * Get a human-readable accuracy rating based on offset
 */
export function getAccuracyRating(offsetMs: number): {
  rating: 'perfect' | 'good' | 'okay' | 'miss';
  label: string;
} {
  const absOffset = Math.abs(offsetMs);

  if (absOffset <= 20) {
    return { rating: 'perfect', label: 'Perfect!' };
  } else if (absOffset <= 50) {
    return { rating: 'good', label: 'Good' };
  } else if (absOffset <= 100) {
    return { rating: 'okay', label: 'Okay' };
  } else {
    return { rating: 'miss', label: 'Miss' };
  }
}

/**
 * Calculate running average of timing offsets
 */
export function calculateAverageOffset(offsets: number[]): number {
  if (offsets.length === 0) return 0;
  const sum = offsets.reduce((acc, val) => acc + val, 0);
  return sum / offsets.length;
}

/**
 * Calculate standard deviation of timing offsets (consistency measure)
 */
export function calculateConsistency(offsets: number[]): number {
  if (offsets.length < 2) return 0;

  const avg = calculateAverageOffset(offsets);
  const squaredDiffs = offsets.map((val) => Math.pow(val - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / offsets.length;

  return Math.sqrt(avgSquaredDiff);
}

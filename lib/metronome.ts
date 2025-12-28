/**
 * Metronome engine with precise timing using performance.now()
 * Uses a tight interval loop to check for beats rather than trusting setTimeout.
 */

import { Audio, AVPlaybackSource } from 'expo-av';
import { bpmToIntervalMs } from './timing';

export interface MetronomeState {
  isPlaying: boolean;
  bpm: number;
  startTime: number | null;
  currentBeat: number;
  isCountingIn: boolean;
  countInBeatsRemaining: number;
}

export interface MetronomeCallbacks {
  onBeat?: (beatNumber: number, beatTime: number) => void;
  onCountIn?: (beatsRemaining: number) => void;
  onCountInComplete?: () => void;
}

const TICK_INTERVAL_MS = 10; // Check every 10ms for beat timing
const AUDIO_LOOKAHEAD_MS = 50; // Schedule audio slightly ahead
const DEFAULT_COUNT_IN_BEATS = 4;

export class Metronome {
  private state: MetronomeState = {
    isPlaying: false,
    bpm: 90,
    startTime: null,
    currentBeat: 0,
    isCountingIn: false,
    countInBeatsRemaining: 0,
  };

  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private sound: Audio.Sound | null = null;
  private callbacks: MetronomeCallbacks = {};
  private nextScheduledBeat: number = 0;
  private audioSource: AVPlaybackSource;
  private countInBeats: number = DEFAULT_COUNT_IN_BEATS;
  private audioLatencyMs: number = 0;

  constructor(audioSource: AVPlaybackSource) {
    this.audioSource = audioSource;
  }

  setAudioLatency(latencyMs: number): void {
    this.audioLatencyMs = latencyMs;
  }

  getAudioLatency(): number {
    return this.audioLatencyMs;
  }

  async initialize(): Promise<void> {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  }

  setCallbacks(callbacks: MetronomeCallbacks): void {
    this.callbacks = callbacks;
  }

  setBpm(bpm: number): void {
    this.state.bpm = Math.max(40, Math.min(200, bpm));
  }

  getBpm(): number {
    return this.state.bpm;
  }

  getState(): MetronomeState {
    return { ...this.state };
  }

  getStartTime(): number | null {
    return this.state.startTime;
  }

  /**
   * Get the effective start time adjusted for audio latency.
   * This is what tap times should be compared against.
   */
  getAdjustedStartTime(): number | null {
    if (this.state.startTime === null) return null;
    return this.state.startTime + this.audioLatencyMs;
  }

  isCountingIn(): boolean {
    return this.state.isCountingIn;
  }

  getBeatIntervalMs(): number {
    return bpmToIntervalMs(this.state.bpm);
  }

  isPlaying(): boolean {
    return this.state.isPlaying;
  }

  async start(): Promise<void> {
    if (this.state.isPlaying) return;

    this.state.isPlaying = true;
    this.state.currentBeat = -this.countInBeats; // Negative beats for count-in
    this.state.isCountingIn = true;
    this.state.countInBeatsRemaining = this.countInBeats;
    this.nextScheduledBeat = -this.countInBeats;

    // Start time aligned so beat 0 happens after count-in
    const now = performance.now();
    this.state.startTime = now + this.countInBeats * this.getBeatIntervalMs();

    // Play first count-in beat immediately
    await this.playClick();
    this.callbacks.onCountIn?.(this.state.countInBeatsRemaining);
    this.nextScheduledBeat = -this.countInBeats + 1;

    // Start the tick loop
    this.tickInterval = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  stop(): void {
    if (!this.state.isPlaying) return;

    this.state.isPlaying = false;
    this.state.startTime = null;
    this.state.currentBeat = 0;
    this.state.isCountingIn = false;
    this.state.countInBeatsRemaining = 0;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private async tick(): Promise<void> {
    if (!this.state.isPlaying || this.state.startTime === null) return;

    const now = performance.now();
    const beatIntervalMs = this.getBeatIntervalMs();
    const nextBeatTime = this.state.startTime + this.nextScheduledBeat * beatIntervalMs;

    // Schedule beat if it's coming up within lookahead window
    if (now >= nextBeatTime - AUDIO_LOOKAHEAD_MS) {
      this.state.currentBeat = this.nextScheduledBeat;
      this.nextScheduledBeat++;

      // Play sound
      await this.playClick();

      // Check if we're still in count-in or playing
      if (this.state.currentBeat < 0) {
        // Still counting in
        this.state.countInBeatsRemaining = Math.abs(this.state.currentBeat);
        this.callbacks.onCountIn?.(this.state.countInBeatsRemaining);
      } else {
        // Regular beat - first one triggers count-in complete
        if (this.state.isCountingIn) {
          this.state.isCountingIn = false;
          this.state.countInBeatsRemaining = 0;
          this.callbacks.onCountInComplete?.();
        }
        this.callbacks.onBeat?.(this.state.currentBeat, nextBeatTime);
      }
    }
  }

  private async playClick(): Promise<void> {
    try {
      // Unload previous sound if exists
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // Create and play new sound
      const { sound } = await Audio.Sound.createAsync(this.audioSource, {
        shouldPlay: true,
        volume: 1.0,
      });

      this.sound = sound;
    } catch (error) {
      console.warn('Failed to play click:', error);
    }
  }

  async cleanup(): Promise<void> {
    this.stop();
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}

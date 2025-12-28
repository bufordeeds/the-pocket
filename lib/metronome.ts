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
}

export interface MetronomeCallbacks {
  onBeat?: (beatNumber: number, beatTime: number) => void;
}

const TICK_INTERVAL_MS = 10; // Check every 10ms for beat timing
const AUDIO_LOOKAHEAD_MS = 50; // Schedule audio slightly ahead

export class Metronome {
  private state: MetronomeState = {
    isPlaying: false,
    bpm: 90,
    startTime: null,
    currentBeat: 0,
  };

  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private sound: Audio.Sound | null = null;
  private callbacks: MetronomeCallbacks = {};
  private nextScheduledBeat: number = 0;
  private audioSource: AVPlaybackSource;

  constructor(audioSource: AVPlaybackSource) {
    this.audioSource = audioSource;
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

  getBeatIntervalMs(): number {
    return bpmToIntervalMs(this.state.bpm);
  }

  isPlaying(): boolean {
    return this.state.isPlaying;
  }

  async start(): Promise<void> {
    if (this.state.isPlaying) return;

    this.state.isPlaying = true;
    this.state.currentBeat = 0;
    this.nextScheduledBeat = 0;

    // Start time is set to align with first beat
    this.state.startTime = performance.now();

    // Play first beat immediately
    await this.playClick();
    this.callbacks.onBeat?.(0, this.state.startTime);
    this.nextScheduledBeat = 1;

    // Start the tick loop
    this.tickInterval = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  stop(): void {
    if (!this.state.isPlaying) return;

    this.state.isPlaying = false;
    this.state.startTime = null;
    this.state.currentBeat = 0;

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

      // Play sound and notify
      await this.playClick();
      this.callbacks.onBeat?.(this.state.currentBeat, nextBeatTime);
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

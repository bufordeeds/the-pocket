# Pocket Metronome - Technical Specification

## Overview

A mobile rhythm game module that trains drummers to maintain internal tempo. The metronome plays for a set number of beats, then goes silent while the player continues tapping. Scoring is based on timing accuracy and consistency.

---

## Core Gameplay

### Game Flow

```
[Configure] → [Countdown] → [Guided Phase] → [Silent Phase] → [Results]
```

1. **Configure:** Player selects BPM, difficulty, beat count
2. **Countdown:** "3, 2, 1" visual with metronome establishing tempo
3. **Guided Phase:** Metronome clicks audibly, player taps along (calibration)
4. **Silent Phase:** Metronome stops, player continues tapping
5. **Results:** Performance breakdown and score

### Scoring Algorithm

```
Tap Score = Base Points × Accuracy Multiplier × Streak Bonus

Accuracy Multiplier:
- Perfect (±15ms): 1.0
- Great (±30ms): 0.8
- Good (±50ms): 0.6
- OK (±100ms): 0.3
- Miss (>100ms or no tap): 0.0

Drift Penalty:
- Calculate cumulative drift from expected beat times
- Penalize systematic early/late tendency

Consistency Bonus:
- Standard deviation of tap intervals vs expected interval
- Lower deviation = higher bonus
```

### Difficulty Progression

| Level | BPM Range | Guided Beats | Silent Beats | Time Signatures |
| ----- | --------- | ------------ | ------------ | --------------- |
| 1-10  | 60-80     | 8            | 8            | 4/4 only        |
| 11-20 | 70-100    | 8            | 12           | 4/4 only        |
| 21-30 | 80-120    | 4            | 16           | 4/4, 3/4        |
| 31-40 | 60-140    | 4            | 16           | 4/4, 3/4, 6/8   |
| 41-50 | 50-160    | 4            | 24           | All + 5/4, 7/8  |

### Game Modes

**Practice Mode**

-   Custom BPM selection (40-200)
-   Custom beat counts
-   Optional visual pulse during silent phase
-   Detailed per-tap feedback

**Challenge Mode**

-   Preset levels with increasing difficulty
-   Star rating system (1-3 stars)
-   Unlock progression

**Daily Drill**

-   Randomized BPM within skill-appropriate range
-   5 rounds, varied configurations
-   Daily streak tracking

**Endless Mode**

-   Continuous play, BPM shifts between rounds
-   Survival style - 3 misses and you're out
-   High score leaderboard

---

## User Interface

### Screen Flow

```
[Home]
  ├── [Mode Select]
  │     ├── Practice → [Config] → [Game] → [Results]
  │     ├── Challenge → [Level Select] → [Game] → [Results]
  │     ├── Daily Drill → [Game] → [Results]
  │     └── Endless → [Game] → [Results]
  ├── [Progress/Stats]
  └── [Settings]
```

### Game Screen Layout

```
┌─────────────────────────────┐
│  BPM: 90    Beat: 4/8       │  ← Status bar
│                             │
│                             │
│         ◯ ◯ ◯ ◯             │  ← Beat indicator dots
│         ● ○ ○ ○             │    (fills as beats pass)
│                             │
│                             │
│    ┌─────────────────┐      │
│    │                 │      │
│    │   TAP ZONE      │      │  ← Large tap target
│    │                 │      │    (pulses on beat during
│    │                 │      │     guided phase)
│    └─────────────────┘      │
│                             │
│  [Perfect] +100  🔥 x12     │  ← Feedback + streak
└─────────────────────────────┘
```

### Visual Feedback

**During Guided Phase:**

-   Tap zone pulses on each beat
-   Metronome click plays
-   Beat dots fill in sequence

**During Silent Phase:**

-   Pulse stops (or optional subtle pulse in Practice mode)
-   Screen color subtly shifts to indicate silent mode
-   Beat dots continue filling based on YOUR taps

**Tap Feedback:**

-   Ripple effect on tap
-   Color indicates accuracy (green/yellow/orange/red)
-   Text popup: "Perfect!", "Great!", "Good!", "Early", "Late"

### Results Screen

```
┌─────────────────────────────┐
│        ⭐ ⭐ ⭐              │
│        PERFECT!             │
│                             │
│   Score: 2,450              │
│   Best Streak: 16           │
│                             │
│   ┌─────────────────────┐   │
│   │ Timing Analysis     │   │
│   │                     │   │
│   │  Early ████░░ Late  │   │  ← Distribution graph
│   │                     │   │
│   │  Avg: +12ms (late)  │   │
│   │  Drift: -0.3 BPM    │   │
│   └─────────────────────┘   │
│                             │
│   Consistency: 94%          │
│                             │
│  [Retry]  [Next]  [Home]    │
└─────────────────────────────┘
```

---

## Technical Architecture

### Recommended Stack

**Framework:** React Native with Expo

-   Cross-platform (iOS + Android)
-   Good audio support via expo-av
-   Your existing React/JS skills transfer directly

**Audio Engine:** expo-av + custom precise timing

-   Web Audio API concepts apply
-   Need to account for audio latency calibration

**State Management:** Zustand

-   Lightweight, simple for game state
-   Easy persistence for progress/settings

**Storage:** AsyncStorage + SQLite (expo-sqlite)

-   AsyncStorage for settings, simple data
-   SQLite for detailed tap history, analytics

**Animations:** React Native Reanimated

-   60fps animations for smooth visual feedback
-   Gesture handling with react-native-gesture-handler

### Project Structure

```
/src
  /components
    TapZone.tsx
    BeatIndicator.tsx
    MetronomeVisual.tsx
    ScorePopup.tsx
    ResultsChart.tsx
  /screens
    HomeScreen.tsx
    GameScreen.tsx
    ResultsScreen.tsx
    ProgressScreen.tsx
    SettingsScreen.tsx
  /game
    gameEngine.ts        # Core game loop logic
    scoringEngine.ts     # Accuracy calculations
    metronome.ts         # Audio timing system
    haptics.ts           # Vibration feedback
  /hooks
    useMetronome.ts
    useGameState.ts
    useTapDetection.ts
  /stores
    gameStore.ts         # Zustand store
    progressStore.ts
  /utils
    audioLatency.ts      # Calibration utilities
    statistics.ts        # Timing analysis
  /constants
    difficulties.ts
    scoring.ts
  /types
    index.ts
```

### Critical Technical Considerations

**1. Audio Latency Calibration**

Mobile devices have varying audio output latency (50-200ms). Must calibrate:

```typescript
// Calibration flow
1. Play a click
2. User taps when they hear it
3. Measure tap time vs scheduled play time
4. Calculate average offset over multiple samples
5. Apply offset to all timing calculations
```

**2. Precise Timing**

JavaScript's setTimeout is not precise enough. Use:

```typescript
// High-resolution timing approach
const startTime = performance.now();
const expectedBeatTime = startTime + beatNumber * beatInterval;

// On tap
const tapTime = performance.now();
const expectedTime = getExpectedBeatTime(beatNumber);
const accuracy = tapTime - expectedTime; // negative = early, positive = late
```

**3. Audio Scheduling**

Schedule audio slightly ahead to ensure on-time playback:

```typescript
// Schedule next click 100ms before it should play
const scheduleAhead = 100; // ms
const nextBeatTime = getNextBeatTime();
setTimeout(() => playClick(), nextBeatTime - performance.now() - scheduleAhead);
```

---

## Data Models

### User Progress

```typescript
interface UserProgress {
	id: string;
	currentLevel: number;
	totalScore: number;
	levelsCompleted: LevelCompletion[];
	dailyStreak: number;
	lastPlayedDate: string;
	calibrationOffset: number;
	preferences: UserPreferences;
	stats: GlobalStats;
}

interface LevelCompletion {
	levelId: number;
	stars: 1 | 2 | 3;
	highScore: number;
	bestStreak: number;
	completedAt: string;
}

interface GlobalStats {
	totalTaps: number;
	perfectTaps: number;
	averageAccuracy: number;
	averageDrift: number; // tendency to speed up or slow down
	totalPlayTime: number;
	favoriteMode: string;
}
```

### Game Session

```typescript
interface GameSession {
	id: string;
	mode: 'practice' | 'challenge' | 'daily' | 'endless';
	config: GameConfig;
	taps: TapEvent[];
	startedAt: number;
	endedAt: number;
	score: number;
	stars: number;
}

interface GameConfig {
	bpm: number;
	timeSignature: [number, number]; // [beats, noteValue] e.g., [4, 4]
	guidedBeats: number;
	silentBeats: number;
	levelId?: number;
}

interface TapEvent {
	timestamp: number; // When tap occurred
	expectedTime: number; // When tap should have occurred
	accuracy: number; // Difference in ms
	beatNumber: number; // Which beat this was for
	phase: 'guided' | 'silent';
	rating: 'perfect' | 'great' | 'good' | 'ok' | 'miss';
}
```

---

## MVP Scope (v0.1)

### Include

-   [ ] Practice mode only
-   [ ] Single tap zone
-   [ ] BPM selection (60-120)
-   [ ] 4/4 time signature only
-   [ ] 8 guided beats, 8 silent beats
-   [ ] Basic accuracy scoring
-   [ ] Visual beat indicator
-   [ ] Tap feedback (color + text)
-   [ ] Simple results screen with accuracy %
-   [ ] Basic audio metronome click

### Exclude from MVP

-   Challenge mode / levels
-   Daily drill
-   Endless mode
-   Complex time signatures
-   Audio latency calibration wizard
-   Detailed analytics
-   Progress persistence
-   Haptic feedback
-   Themes / customization

---

## Future Modules (Roadmap)

### Module 2: Independence Trainer

-   Multi-zone tap interface (2-4 zones)
-   Maintain steady pattern with one hand
-   Play varied pattern with other hand
-   Visual notation display

### Module 3: Rudiment Runner

-   Alternating hand patterns (R L R L)
-   Common rudiments: paradiddles, flams, drags
-   Speed progression within single exercise
-   Hand indication in UI

### Module 4: Groove Trainer

-   Intentionally play ahead/behind the beat
-   "Push" vs "Lay back" training
-   Genre-specific feel (jazz swing, funk pocket, etc.)
-   More nuanced scoring for feel

### Module 5: Practice Pad Input

-   Microphone audio detection
-   Onset detection for stick hits
-   Calibration for ambient noise
-   Works with any practice pad

---

## Development Phases

### Phase 1: Foundation (Week 1)

-   [ ] Project setup (Expo + TypeScript)
-   [ ] Basic navigation structure
-   [ ] Tap zone component with gesture handling
-   [ ] Simple metronome audio playback

### Phase 2: Core Game Loop (Week 2)

-   [ ] Game engine with guided/silent phases
-   [ ] Timing accuracy calculation
-   [ ] Basic scoring system
-   [ ] Beat indicator visualization

### Phase 3: Polish & Feedback (Week 3)

-   [ ] Tap feedback animations
-   [ ] Results screen with basic stats
-   [ ] Sound design (satisfying clicks)
-   [ ] Visual polish

### Phase 4: Testing & Refinement (Week 4)

-   [ ] Test on multiple devices
-   [ ] Timing calibration adjustments
-   [ ] UX improvements based on self-testing
-   [ ] Bug fixes

---

## Open Questions

1. **App Name?** Ideas:

    - Pocket Tempo
    - DrumSense
    - Beat Keeper
    - Tempo Trainer
    - The Pocket (drummer slang for being "in the pocket")

2. **Monetization (future)?**

    - Free with ads?
    - One-time purchase?
    - Freemium (basic free, advanced modes paid)?

3. **Sound design?**

    - Classic metronome click?
    - Multiple sound options (wood block, hi-hat, beep)?
    - Different sounds for downbeat vs other beats?

4. **Offline-first?**
    - Should work completely offline
    - Cloud sync for progress later?

---

## Next Steps

1. Confirm this spec aligns with your vision
2. Finalize app name
3. Initialize Expo project
4. Build tap zone + basic metronome prototype

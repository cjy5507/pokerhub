/**
 * Poker Sound Effects System
 * Uses Web Audio API to generate all sounds programmatically
 */

type SoundType =
  | 'dealCard'
  | 'chipBet'
  | 'chipPot'
  | 'fold'
  | 'check'
  | 'call'
  | 'raise'
  | 'allIn'
  | 'timerWarning'
  | 'timerUrgent'
  | 'win'
  | 'newHand'
  | 'yourTurn'
  | 'communityCard';

/**
 * Singleton sound manager for poker game audio
 */
export class PokerSoundManager {
  private static instance: PokerSoundManager;
  private context: AudioContext | null = null;
  private muted = false;
  private volume = 0.5;
  private initialized = false;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): PokerSoundManager {
    if (!PokerSoundManager.instance) {
      PokerSoundManager.instance = new PokerSoundManager();
    }
    return PokerSoundManager.instance;
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.context;
  }

  /**
   * Resume AudioContext on user gesture (required by browsers)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    this.initialized = true;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  get currentVolume(): number {
    return this.volume;
  }

  /**
   * Play a sound effect
   */
  private play(soundFn: (ctx: AudioContext, destination: GainNode) => void): void {
    if (this.muted || this.volume === 0) return;

    try {
      const ctx = this.ensureContext();
      const gainNode = ctx.createGain();
      gainNode.gain.value = this.volume;
      gainNode.connect(ctx.destination);

      soundFn(ctx, gainNode);
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  /**
   * Card dealing sound - crisp snap
   */
  dealCard(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;

      // White noise for snap
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      noise.start(now);
      noise.stop(now + 0.05);
    });
  }

  /**
   * Chip betting sound - metallic click
   */
  chipBet(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;

      // High frequency for metallic click
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.08);
    });
  }

  /**
   * Chips going to pot - multiple clicks
   */
  chipPot(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;
      const clicks = [0, 0.04, 0.08, 0.12];

      clicks.forEach((offset) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 1000 + Math.random() * 400;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.06);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(now + offset);
        osc.stop(now + offset + 0.06);
      });
    });
  }

  /**
   * Fold sound - soft whoosh
   */
  fold(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;

      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.15);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      noise.start(now);
      noise.stop(now + 0.15);
    });
  }

  /**
   * Check sound - light tap
   */
  check(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 600;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.05);
    });
  }

  /**
   * Call sound - chip variant
   */
  call(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.06);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.1);
    });
  }

  /**
   * Raise sound - louder chip sound
   */
  raise(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;

      // Two overlapping oscillators for richness
      [0, 0.02].forEach((offset) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1300, now + offset);
        osc.frequency.exponentialRampToValueAtTime(1000, now + offset + 0.08);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.12);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });
    });
  }

  /**
   * All-in sound - dramatic bass + chips
   */
  allIn(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;

      // Deep bass
      const bass = ctx.createOscillator();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(80, now);
      bass.frequency.exponentialRampToValueAtTime(60, now + 0.2);

      const bassGain = ctx.createGain();
      bassGain.gain.setValueAtTime(0.4, now);
      bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      bass.connect(bassGain);
      bassGain.connect(dest);

      // Chip cascade
      [0, 0.05, 0.1, 0.15, 0.2].forEach((offset) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 1200 + Math.random() * 300;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.06);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(now + offset);
        osc.stop(now + offset + 0.06);
      });

      bass.start(now);
      bass.stop(now + 0.25);
    });
  }

  /**
   * Timer warning - ticking clock
   */
  timerWarning(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 800;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.08);
    });
  }

  /**
   * Timer urgent - faster ticking
   */
  timerUrgent(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 1000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.05);
    });
  }

  /**
   * Win sound - celebratory chime
   */
  win(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord)

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = ctx.createGain();
        const startTime = now + i * 0.08;
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    });
  }

  /**
   * New hand - shuffle sound
   */
  newHand(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;

      // Multiple rapid card snaps
      for (let i = 0; i < 6; i++) {
        const bufferSize = ctx.sampleRate * 0.03;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
          data[j] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1800;

        const gain = ctx.createGain();
        const startTime = now + i * 0.03;
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.03);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        noise.start(startTime);
        noise.stop(startTime + 0.03);
      }
    });
  }

  /**
   * Your turn - notification ding
   */
  yourTurn(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 800;

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 1200;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(dest);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.15);
      osc2.stop(now + 0.15);
    });
  }

  /**
   * Community card - card flip sound
   */
  communityCard(): void {
    this.play((ctx, dest) => {
      const now = ctx.currentTime;

      // Two-stage flip sound
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1500, now);
      filter.frequency.exponentialRampToValueAtTime(2500, now + 0.04);
      filter.frequency.exponentialRampToValueAtTime(1800, now + 0.08);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      noise.start(now);
      noise.stop(now + 0.08);
    });
  }
}

/**
 * Default singleton instance
 */
export const pokerSounds = PokerSoundManager.getInstance();

// Module-level flag to prevent listener leaks across re-renders
let _soundListenersAttached = false;

/**
 * React hook for poker sounds with automatic AudioContext initialization
 */
export function usePokerSounds(): PokerSoundManager {
  const soundManager = PokerSoundManager.getInstance();

  // Auto-initialize on first user interaction (once per app lifecycle)
  if (typeof window !== 'undefined' && !_soundListenersAttached) {
    _soundListenersAttached = true;

    const initializeOnInteraction = () => {
      soundManager.initialize().catch(console.warn);
      window.removeEventListener('click', initializeOnInteraction);
      window.removeEventListener('touchstart', initializeOnInteraction);
      window.removeEventListener('keydown', initializeOnInteraction);
    };

    window.addEventListener('click', initializeOnInteraction, { once: true });
    window.addEventListener('touchstart', initializeOnInteraction, { once: true });
    window.addEventListener('keydown', initializeOnInteraction, { once: true });
  }

  return soundManager;
}

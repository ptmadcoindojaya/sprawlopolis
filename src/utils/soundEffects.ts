/**
 * Procedural Cozy Tabletop Sound Effects Synthesizer (Pure Web Audio API)
 * Zero external audio files (.mp3/.wav) — 0 KB asset overhead & immune to load errors.
 */

const MUTE_STORAGE_KEY = 'sprawlopolis_sound_muted';

class CozySoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private reverbBuffer: AudioBuffer | null = null;
  private muted: boolean = false;

  constructor() {
    this.muted = this.readStoredMute();
  }

  private readStoredMute(): boolean {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, muted ? 'true' : 'false');
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  public toggleMuted(): boolean {
    const next = !this.muted;
    this.setMuted(next);
    if (!next) {
      // Unlock & confirm with a tiny soft tap when unmuting SFX
      this.playCardSelect();
    }
    return next;
  }

  /**
   * Returns (and lazily creates/resumes) the shared Web Audio API context.
   * Independent of SFX mute state so ambient music can share the same context.
   */
  public getSharedContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Ignore resume failure if not yet triggered by user gesture
      });
    }

    return this.ctx;
  }

  private ensureSfxContext(): AudioContext | null {
    if (this.muted) return null;
    return this.getSharedContext();
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /**
   * Generates a warm, silky procedural impulse response (~1.5s) for cozy reverb tails
   */
  public getWarmReverbBuffer(ctx: AudioContext): AudioBuffer {
    if (this.reverbBuffer && this.reverbBuffer.sampleRate === ctx.sampleRate) {
      return this.reverbBuffer;
    }
    const duration = 1.5;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const decay = Math.pow(1 - t, 2.7);
        const white = Math.random() * 2 - 1;
        // One-pole lowpass to keep reverb tail warm and wooden rather than metallic
        lp = lp * 0.72 + white * 0.28;
        data[i] = lp * decay;
      }
    }

    this.reverbBuffer = buffer;
    return buffer;
  }

  /**
   * Soft papery/wooden tap when picking a card from hand
   */
  public playCardSelect(): void {
    const ctx = this.ensureSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Warm woody tap body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.048);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.11, now + 0.006);
    oscGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.055);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);

    // 2. Crisp brief cardstock flick
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1900, now);
    filter.Q.setValueAtTime(1.4, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.001, now);
    nGain.gain.linearRampToValueAtTime(0.055, now + 0.004);
    nGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.028);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.032);
  }

  /**
   * Gentle cardstock swish when rotating a card (0° / 180°)
   */
  public playCardRotate(): void {
    const ctx = this.ensureSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Soft papery brush sweep
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1250, now);
    filter.frequency.exponentialRampToValueAtTime(2700, now + 0.075);
    filter.Q.setValueAtTime(1.8, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.001, now);
    nGain.gain.linearRampToValueAtTime(0.075, now + 0.018);
    nGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.088);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.095);

    // 2. Delicate pivot click
    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now + 0.01);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);

    oGain.gain.setValueAtTime(0.001, now + 0.01);
    oGain.gain.linearRampToValueAtTime(0.05, now + 0.015);
    oGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.052);

    osc.connect(oGain);
    oGain.connect(ctx.destination);
    osc.start(now + 0.01);
    osc.stop(now + 0.058);
  }

  /**
   * Warm, satisfying wooden tabletop thud when placing a card onto the city grid
   */
  public playCardPlace(): void {
    const ctx = this.ensureSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Deep warm wooden board thump
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(175, now);
    bass.frequency.exponentialRampToValueAtTime(56, now + 0.11);

    bassGain.gain.setValueAtTime(0.001, now);
    bassGain.gain.linearRampToValueAtTime(0.24, now + 0.008);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.start(now);
    bass.stop(now + 0.14);

    // 2. Warm hollow woodblock knock
    const knock = ctx.createOscillator();
    const knockGain = ctx.createGain();
    knock.type = 'triangle';
    knock.frequency.setValueAtTime(340, now);
    knock.frequency.exponentialRampToValueAtTime(145, now + 0.058);

    knockGain.gain.setValueAtTime(0.001, now);
    knockGain.gain.linearRampToValueAtTime(0.11, now + 0.005);
    knockGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.068);

    knock.connect(knockGain);
    knockGain.connect(ctx.destination);
    knock.start(now);
    knock.stop(now + 0.075);

    // 3. Soft tabletop dust/cardboard settle puff
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(780, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.001, now);
    nGain.gain.linearRampToValueAtTime(0.075, now + 0.007);
    nGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.065);

    noise.connect(lp);
    lp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.072);
  }

  /**
   * Soft ascending marimba / bell chime when score increases during play
   */
  public playScoreUp(isVictory: boolean = false): void {
    if (isVictory) {
      this.playGameWin();
      return;
    }

    const ctx = this.ensureSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [659.25, 783.99]; // E5 -> G5
    const spacing = 0.08;
    const peakVol = 0.07;

    notes.forEach((freq, idx) => {
      const start = now + idx * spacing;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0008, start);
      gain.gain.linearRampToValueAtTime(peakVol, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.24);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.26);

      const overtone = ctx.createOscillator();
      const overGain = ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, start);

      overGain.gain.setValueAtTime(0.0005, start);
      overGain.gain.linearRampToValueAtTime(peakVol * 0.22, start + 0.008);
      overGain.gain.exponentialRampToValueAtTime(0.0005, start + 0.12);

      overtone.connect(overGain);
      overGain.connect(ctx.destination);
      overtone.start(start);
      overtone.stop(start + 0.14);
    });
  }

  /**
   * Cheerful ascending Cmaj9 marimba/bell arpeggio with a warm procedural reverb tail
   * played once when the player reaches/exceeds the target score at Game Over.
   */
  public playGameWin(): void {
    const ctx = this.ensureSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Shared dry + warm reverb bus for this celebratory arpeggio
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1, now);

    const dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(0.85, now);

    const convolver = ctx.createConvolver();
    convolver.buffer = this.getWarmReverbBuffer(ctx);
    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.42, now);

    masterGain.connect(dryGain);
    dryGain.connect(ctx.destination);
    masterGain.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(ctx.destination);

    // Warm Cmaj9 ascending notes: C5, E5, G5, B5, D6, G6 (gentle sparkle finale)
    const arpeggio = [
      { freq: 523.25, delay: 0.0, vol: 0.11, decay: 0.65 },  // C5
      { freq: 659.25, delay: 0.1, vol: 0.115, decay: 0.7 },  // E5
      { freq: 783.99, delay: 0.2, vol: 0.12, decay: 0.75 },  // G5
      { freq: 987.77, delay: 0.31, vol: 0.115, decay: 0.85 }, // B5
      { freq: 1174.66, delay: 0.43, vol: 0.125, decay: 1.05 } // D6 (maj9 top!)
    ];

    // Soft warm C4 foundation bloom underneath
    const padOsc = ctx.createOscillator();
    const padFilter = ctx.createBiquadFilter();
    const padGain = ctx.createGain();
    padOsc.type = 'triangle';
    padOsc.frequency.setValueAtTime(261.63, now); // C4
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(680, now);

    padGain.gain.setValueAtTime(0.0008, now);
    padGain.gain.linearRampToValueAtTime(0.075, now + 0.08);
    padGain.gain.exponentialRampToValueAtTime(0.0008, now + 1.55);

    padOsc.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(masterGain);
    padOsc.start(now);
    padOsc.stop(now + 1.6);

    arpeggio.forEach(({ freq, delay, vol, decay }) => {
      const start = now + delay;

      // Warm marimba fundamental
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0008, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + decay);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(start);
      osc.stop(start + decay + 0.04);

      // Gentle bell shimmer overtone
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = 'triangle';
      bell.frequency.setValueAtTime(freq * 2, start);

      bellGain.gain.setValueAtTime(0.0004, start);
      bellGain.gain.linearRampToValueAtTime(vol * 0.24, start + 0.008);
      bellGain.gain.exponentialRampToValueAtTime(0.0004, start + decay * 0.45);

      bell.connect(bellGain);
      bellGain.connect(masterGain);
      bell.start(start);
      bell.stop(start + decay * 0.5);
    });
  }

  /**
   * Warm, comforting 4-note descending electric piano phrase
   * played once when the game ends short of the target score.
   */
  public playGameLose(): void {
    const ctx = this.ensureSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1, now);

    const warmLp = ctx.createBiquadFilter();
    warmLp.type = 'lowpass';
    warmLp.frequency.setValueAtTime(1150, now);
    warmLp.Q.setValueAtTime(0.6, now);

    const dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(0.8, now);

    const convolver = ctx.createConvolver();
    convolver.buffer = this.getWarmReverbBuffer(ctx);
    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.36, now);

    masterGain.connect(warmLp);
    warmLp.connect(dryGain);
    dryGain.connect(ctx.destination);
    warmLp.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(ctx.destination);

    // Gentle descending warm Rhodes phrase: G4 -> F4 -> D4 -> C4 (soft, cozy, encouraging)
    const notes = [
      { freq: 392.0, delay: 0.0, vol: 0.095, decay: 0.55 },   // G4
      { freq: 349.23, delay: 0.23, vol: 0.09, decay: 0.55 },  // F4
      { freq: 293.66, delay: 0.46, vol: 0.085, decay: 0.65 }, // D4
      { freq: 261.63, delay: 0.72, vol: 0.1, decay: 1.15 }    // C4 warm rest
    ];

    // Subtle soft warm harmony on the final landing note (E4 very quiet -> warm C major consolation)
    const resolveOsc = ctx.createOscillator();
    const resolveGain = ctx.createGain();
    resolveOsc.type = 'sine';
    resolveOsc.frequency.setValueAtTime(329.63, now + 0.74); // E4
    resolveGain.gain.setValueAtTime(0.0005, now + 0.74);
    resolveGain.gain.linearRampToValueAtTime(0.038, now + 0.8);
    resolveGain.gain.exponentialRampToValueAtTime(0.0005, now + 1.85);
    resolveOsc.connect(resolveGain);
    resolveGain.connect(masterGain);
    resolveOsc.start(now + 0.74);
    resolveOsc.stop(now + 1.9);

    notes.forEach(({ freq, delay, vol, decay }) => {
      const start = now + delay;

      // Electric piano body (sine)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0008, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + decay);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(start);
      osc.stop(start + decay + 0.05);

      // Soft tine overtone (triangle at 2x, quick gentle fade)
      const tine = ctx.createOscillator();
      const tineGain = ctx.createGain();
      tine.type = 'triangle';
      tine.frequency.setValueAtTime(freq * 2, start);

      tineGain.gain.setValueAtTime(0.0004, start);
      tineGain.gain.linearRampToValueAtTime(vol * 0.22, start + 0.012);
      tineGain.gain.exponentialRampToValueAtTime(0.0004, start + 0.18);

      tine.connect(tineGain);
      tineGain.connect(masterGain);
      tine.start(start);
      tine.stop(start + 0.22);
    });
  }
}

const soundEngine = new CozySoundEngine();

export function getSharedAudioContext(): AudioContext | null {
  return soundEngine.getSharedContext();
}

export function getWarmReverbBuffer(ctx: AudioContext): AudioBuffer {
  return soundEngine.getWarmReverbBuffer(ctx);
}

export function playCardSelect(): void {
  soundEngine.playCardSelect();
}

export function playCardRotate(): void {
  soundEngine.playCardRotate();
}

export function playCardPlace(): void {
  soundEngine.playCardPlace();
}

export function playScoreUp(isVictory?: boolean): void {
  soundEngine.playScoreUp(isVictory);
}

export function playGameWin(): void {
  soundEngine.playGameWin();
}

export function playGameLose(): void {
  soundEngine.playGameLose();
}

export function isSoundMuted(): boolean {
  return soundEngine.isMuted();
}

export function setSoundMuted(muted: boolean): void {
  soundEngine.setMuted(muted);
}

export function toggleSoundMuted(): boolean {
  return soundEngine.toggleMuted();
}

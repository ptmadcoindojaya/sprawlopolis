/**
 * Cozy Generative Tabletop Backsound & Soft City Breeze Ambience (Pure Web Audio API)
 * Zero external audio assets (.mp3/.wav) — ultra-lightweight procedural synthesis.
 *
 * Volume is deliberately calibrated very low (~10–15% of SFX) so it feels soothing
 * like Dorfromantik / Mini Motorways without ever masking card placement SFX.
 */

import { getSharedAudioContext, getWarmReverbBuffer } from './soundEffects';

const MUSIC_STORAGE_KEY = 'sprawlopolis_music_enabled';

// Warm F Major Pentatonic scale spanning cozy lower-mid to delicate upper register
// (F3, G3, A3, C4, D4, F4, G4, A4, C5, D5, F5)
const F_MAJOR_PENTATONIC = [
  174.61, // F3
  196.0,  // G3
  220.0,  // A3
  261.63, // C4
  293.66, // D4
  349.23, // F4
  392.0,  // G4
  440.0,  // A4
  523.25, // C5
  587.33, // D5
  698.46  // F5
];

// Gentle C Major Pentatonic alternate motif (C4, D4, E4, G4, A4, C5, D5, E5)
const C_MAJOR_PENTATONIC = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.0,  // G4
  440.0,  // A4
  523.25, // C5
  587.33, // D5
  659.25  // E5
];

class CozyAmbientMusicEngine {
  private enabled: boolean = true;
  private isRunning: boolean = false;
  private hasAutoStartListener: boolean = false;

  // Audio graph nodes for active session
  private masterGain: GainNode | null = null;
  private melodyFilter: BiquadFilterNode | null = null;
  private melodyReverb: ConvolverNode | null = null;
  private melodyDry: GainNode | null = null;
  private melodyWet: GainNode | null = null;

  // Breeze / soft city ambience nodes
  private breezeBuffer: AudioBuffer | null = null;
  private breezeSource: AudioBufferSourceNode | null = null;
  private breezeFilter: BiquadFilterNode | null = null;
  private breezeGain: GainNode | null = null;
  private filterLfo: OscillatorNode | null = null;
  private filterLfoGain: GainNode | null = null;
  private ampLfo: OscillatorNode | null = null;
  private ampLfoGain: GainNode | null = null;

  // Generative melody scheduler state
  private noteTimer: ReturnType<typeof setTimeout> | null = null;
  private fadeStopTimer: ReturnType<typeof setTimeout> | null = null;
  private lastNoteIndex: number = 5;
  private phraseStep: number = 0;
  private useCScale: boolean = false;

  constructor() {
    this.enabled = this.readStoredEnabled();
  }

  private readStoredEnabled(): boolean {
    try {
      const stored = localStorage.getItem(MUSIC_STORAGE_KEY);
      // Default to ON (starts gently on first click/interaction)
      return stored !== 'false';
    } catch {
      return true;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try {
      localStorage.setItem(MUSIC_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      // Ignore storage restrictions
    }

    if (enabled) {
      this.start();
    } else {
      this.stop();
    }
  }

  public toggleEnabled(): boolean {
    const next = !this.enabled;
    this.setEnabled(next);
    return next;
  }

  /**
   * Registers one-time user interaction listeners to smoothly start music
   * on the first click/tap/keypress while respecting browser autoplay policies.
   */
  public attachAutoStart(): void {
    if (typeof window === 'undefined' || this.hasAutoStartListener) return;
    this.hasAutoStartListener = true;
    window.addEventListener('pointerdown', this.handleFirstGesture, { passive: true });
    window.addEventListener('keydown', this.handleFirstGesture, { passive: true });
  }

  private detachAutoStart(): void {
    if (typeof window === 'undefined' || !this.hasAutoStartListener) return;
    this.hasAutoStartListener = false;
    window.removeEventListener('pointerdown', this.handleFirstGesture);
    window.removeEventListener('keydown', this.handleFirstGesture);
  }

  private handleFirstGesture = (): void => {
    this.detachAutoStart();
    if (this.enabled && !this.isRunning) {
      this.start();
    }
  };

  /**
   * Generates a seamless looping stereo pink-tinted noise buffer for soft afternoon breeze
   */
  private getBreezeBuffer(ctx: AudioContext): AudioBuffer {
    if (this.breezeBuffer && this.breezeBuffer.sampleRate === ctx.sampleRate) {
      return this.breezeBuffer;
    }

    const durationSec = 4;
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      // Paul Kellet pink noise approximation for silky, non-hissing breeze
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;

      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
        b6 = white * 0.115926;
        data[i] = pink;
      }

      // Crossfade last 0.15s with first 0.15s for a completely seamless loop
      const fadeSamples = Math.floor(ctx.sampleRate * 0.15);
      for (let i = 0; i < fadeSamples; i++) {
        const ratio = i / fadeSamples;
        const tailIdx = length - fadeSamples + i;
        data[tailIdx] = data[tailIdx] * (1 - ratio) + data[i] * ratio;
      }
    }

    this.breezeBuffer = buffer;
    return buffer;
  }

  public start(): void {
    if (!this.enabled) return;

    // Cancel any pending fade-out teardown
    if (this.fadeStopTimer) {
      clearTimeout(this.fadeStopTimer);
      this.fadeStopTimer = null;
    }

    const ctx = getSharedAudioContext();
    if (!ctx) return;

    // If already running, just ensure master volume is smoothly faded up and trigger a welcome note
    if (this.isRunning && this.masterGain) {
      const now = ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(this.masterGain.gain.value, 0.0001), now);
      this.masterGain.gain.linearRampToValueAtTime(1.0, now + 0.45);
      if (!this.noteTimer) {
        this.scheduleNextNote(120);
      }
      return;
    }

    this.isRunning = true;
    const now = ctx.currentTime;

    // 1. Master ambience bus with crisp yet gentle fade-in
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(1.0, now + 0.48);
    masterGain.connect(ctx.destination);
    this.masterGain = masterGain;

    // 2. Warm melody bus (clear low-pass + lush reverb shimmer so electric piano / kalimba stays crisp)
    const melodyFilter = ctx.createBiquadFilter();
    melodyFilter.type = 'lowpass';
    melodyFilter.frequency.setValueAtTime(2250, now);
    melodyFilter.Q.setValueAtTime(0.65, now);

    const melodyDry = ctx.createGain();
    melodyDry.gain.setValueAtTime(0.88, now);

    const melodyReverb = ctx.createConvolver();
    melodyReverb.buffer = getWarmReverbBuffer(ctx);

    const melodyWet = ctx.createGain();
    melodyWet.gain.setValueAtTime(0.52, now);

    melodyFilter.connect(melodyDry);
    melodyDry.connect(masterGain);
    melodyFilter.connect(melodyReverb);
    melodyReverb.connect(melodyWet);
    melodyWet.connect(masterGain);

    this.melodyFilter = melodyFilter;
    this.melodyDry = melodyDry;
    this.melodyReverb = melodyReverb;
    this.melodyWet = melodyWet;

    // 3. Soft filtered breeze / distant city air ambience with slow LFO breathing
    const breezeSource = ctx.createBufferSource();
    breezeSource.buffer = this.getBreezeBuffer(ctx);
    breezeSource.loop = true;

    const breezeFilter = ctx.createBiquadFilter();
    breezeFilter.type = 'bandpass';
    breezeFilter.frequency.setValueAtTime(480, now);
    breezeFilter.Q.setValueAtTime(0.7, now);

    const breezeGain = ctx.createGain();
    // Audible yet airy background breeze that supports the melody without hissing
    breezeGain.gain.setValueAtTime(0.048, now);

    // Slow LFO modulating breeze filter cutoff (gentle sunlit wind sway)
    const filterLfo = ctx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.setValueAtTime(0.09, now);
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.setValueAtTime(175, now);
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(breezeFilter.frequency);

    // Ultra-slow LFO gently breathing the breeze loudness
    const ampLfo = ctx.createOscillator();
    ampLfo.type = 'sine';
    ampLfo.frequency.setValueAtTime(0.06, now);
    const ampLfoGain = ctx.createGain();
    ampLfoGain.gain.setValueAtTime(0.014, now);
    ampLfo.connect(ampLfoGain);
    ampLfoGain.connect(breezeGain.gain);

    breezeSource.connect(breezeFilter);
    breezeFilter.connect(breezeGain);
    breezeGain.connect(masterGain);

    breezeSource.start(now);
    filterLfo.start(now);
    ampLfo.start(now);

    this.breezeSource = breezeSource;
    this.breezeFilter = breezeFilter;
    this.breezeGain = breezeGain;
    this.filterLfo = filterLfo;
    this.filterLfoGain = filterLfoGain;
    this.ampLfo = ampLfo;
    this.ampLfoGain = ampLfoGain;

    // 4. Immediately play a welcoming note once AudioContext is running so toggle feedback is instant
    const startMelody = () => {
      if (!this.isRunning || !this.enabled) return;
      this.scheduleNextNote(90);
    };

    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(startMelody)
        .catch(() => {
          startMelody();
        });
    } else {
      startMelody();
    }
  }

  private scheduleNextNote(customDelayMs?: number): void {
    if (!this.isRunning || !this.enabled) return;

    if (this.noteTimer) {
      clearTimeout(this.noteTimer);
      this.noteTimer = null;
    }

    // Cozy flowing spacing between 1.5s and 2.65s so the music feels alive and present
    const delayMs =
      customDelayMs !== undefined ? customDelayMs : 1500 + Math.random() * 1150;

    this.noteTimer = setTimeout(() => {
      this.noteTimer = null;
      if (!this.isRunning || !this.enabled) return;
      this.triggerGenerativeNote();
      this.scheduleNextNote();
    }, delayMs);
  }

  private triggerGenerativeNote(): void {
    const ctx = getSharedAudioContext();
    if (!ctx || !this.melodyFilter) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      return;
    }
    if (ctx.state !== 'running') return;

    // Switch softly between F Major Pentatonic & C Major Pentatonic every ~12 notes
    this.phraseStep += 1;
    if (this.phraseStep % 12 === 0) {
      this.useCScale = !this.useCScale;
    }

    const scale = this.useCScale ? C_MAJOR_PENTATONIC : F_MAJOR_PENTATONIC;

    // Pick a nearby melodic step (-2..+2) so the melody meanders calmly rather than jumping wildly
    const stepChoices = [-2, -1, -1, 1, 1, 2];
    const delta = stepChoices[Math.floor(Math.random() * stepChoices.length)];
    const clampedIdx = Math.max(
      0,
      Math.min(scale.length - 1, this.lastNoteIndex + delta)
    );
    this.lastNoteIndex = clampedIdx;

    const freq = scale[clampedIdx];
    const now = ctx.currentTime;

    // Warm, clearly audible tabletop level (~0.078–0.105) that stays well below SFX peaks without clipping
    const noteVol = 0.078 + Math.random() * 0.027;
    const releaseSec = 2.6 + Math.random() * 1.2;

    this.playWarmKalimbaTone(ctx, freq, now, noteVol, releaseSec);

    // ~42% chance to layer a soft warm companion note (gentle dyad or low root)
    if (Math.random() < 0.42) {
      const harmonyIdx = Math.max(0, clampedIdx - 2);
      const harmonyFreq = scale[harmonyIdx];
      if (harmonyFreq !== freq) {
        const stagger = 0.12 + Math.random() * 0.14;
        this.playWarmKalimbaTone(
          ctx,
          harmonyFreq,
          now + stagger,
          noteVol * 0.68,
          releaseSec * 1.05
        );
      }
    }

    // Soft warm sustained low-mid chord swell every 3rd step for rich cozy presence
    if (this.phraseStep === 1 || this.phraseStep % 3 === 0) {
      const rootFreq = this.useCScale ? 130.81 : 174.61; // C3 or F3
      this.playWarmPadSwell(ctx, rootFreq, now, 0.026, 3.8);
    }
  }

  private playWarmPadSwell(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    peakVol: number,
    durationSec: number
  ): void {
    if (!this.melodyFilter) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakVol, startTime + 0.85);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(this.melodyFilter);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.08);
  }

  private playWarmKalimbaTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    peakVol: number,
    releaseSec: number
  ): void {
    if (!this.melodyFilter) return;

    // Soft stereo panner (gentle cozy width)
    const dest: AudioNode =
      typeof ctx.createStereoPanner === 'function'
        ? (() => {
            const panner = ctx.createStereoPanner();
            panner.pan.setValueAtTime((Math.random() - 0.5) * 0.45, startTime);
            panner.connect(this.melodyFilter!);
            return panner;
          })()
        : this.melodyFilter;

    // Warm electric piano / kalimba body
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakVol, startTime + 0.028);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + releaseSec);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + releaseSec + 0.06);

    // Delicate wooden kalimba pluck overtone
    const tine = ctx.createOscillator();
    const tineGain = ctx.createGain();
    tine.type = 'triangle';
    tine.frequency.setValueAtTime(freq * 2, startTime);

    tineGain.gain.setValueAtTime(0.0001, startTime);
    tineGain.gain.linearRampToValueAtTime(peakVol * 0.24, startTime + 0.01);
    tineGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.24);

    tine.connect(tineGain);
    tineGain.connect(dest);
    tine.start(startTime);
    tine.stop(startTime + 0.28);
  }

  public stop(): void {
    if (this.noteTimer) {
      clearTimeout(this.noteTimer);
      this.noteTimer = null;
    }

    if (!this.isRunning) return;
    this.isRunning = false;

    const ctx = getSharedAudioContext();
    if (ctx && this.masterGain) {
      const now = ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(this.masterGain.gain.value, 0.0001), now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.35);

      if (this.fadeStopTimer) clearTimeout(this.fadeStopTimer);
      this.fadeStopTimer = setTimeout(() => {
        this.fadeStopTimer = null;
        this.teardownNodes();
      }, 380);
    } else {
      this.teardownNodes();
    }
  }

  private teardownNodes(): void {
    const safeStop = (node: AudioScheduledSourceNode | null) => {
      if (!node) return;
      try {
        node.stop();
      } catch {
        // Already stopped
      }
      try {
        node.disconnect();
      } catch {
        // Ignore
      }
    };

    const safeDisconnect = (node: AudioNode | null) => {
      if (!node) return;
      try {
        node.disconnect();
      } catch {
        // Ignore
      }
    };

    safeStop(this.breezeSource);
    safeStop(this.filterLfo);
    safeStop(this.ampLfo);

    safeDisconnect(this.filterLfoGain);
    safeDisconnect(this.ampLfoGain);
    safeDisconnect(this.breezeFilter);
    safeDisconnect(this.breezeGain);
    safeDisconnect(this.melodyFilter);
    safeDisconnect(this.melodyDry);
    safeDisconnect(this.melodyReverb);
    safeDisconnect(this.melodyWet);
    safeDisconnect(this.masterGain);

    this.breezeSource = null;
    this.filterLfo = null;
    this.ampLfo = null;
    this.filterLfoGain = null;
    this.ampLfoGain = null;
    this.breezeFilter = null;
    this.breezeGain = null;
    this.melodyFilter = null;
    this.melodyDry = null;
    this.melodyReverb = null;
    this.melodyWet = null;
    this.masterGain = null;
  }

  /**
   * Full cleanup on React unmount (clears all timers, listeners, and audio nodes)
   */
  public dispose(): void {
    this.detachAutoStart();
    if (this.noteTimer) {
      clearTimeout(this.noteTimer);
      this.noteTimer = null;
    }
    if (this.fadeStopTimer) {
      clearTimeout(this.fadeStopTimer);
      this.fadeStopTimer = null;
    }
    this.isRunning = false;
    this.teardownNodes();
  }
}

export const ambientMusic = new CozyAmbientMusicEngine();

export function isAmbientMusicEnabled(): boolean {
  return ambientMusic.isEnabled();
}

export function toggleAmbientMusic(): boolean {
  return ambientMusic.toggleEnabled();
}

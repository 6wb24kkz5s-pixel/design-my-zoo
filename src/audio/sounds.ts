// Sound effects, made by the iPad itself (nothing is downloaded). They are off until the child turns them on,
// and the choice is remembered. Read-aloud speech was dropped, so this is the only sound in the game.

import type { KeyValueStore } from '../logic/save';
import type { Catalogue, Zoo } from '../logic/zoo';

export type SoundName = 'pop' | 'splash' | 'bloop' | 'chime';

/** Where the on / off choice is remembered. */
export const SOUND_KEY = 'design-my-zoo:sound';

/** Sound is off unless it was turned on before. */
export function loadSoundSetting(store: KeyValueStore | null): boolean {
  try {
    return store?.getItem(SOUND_KEY) === 'on';
  } catch {
    return false;
  }
}

export function saveSoundSetting(store: KeyValueStore | null, on: boolean): void {
  try {
    store?.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // Storage is blocked: the choice just is not remembered.
  }
}

/** How much there is in a zoo: items, animals and painted squares. */
function amountIn(zoo: Zoo): number {
  return (
    zoo.items.length +
    zoo.animals.length +
    Object.keys(zoo.ground).length +
    Object.keys(zoo.fences).length +
    Object.keys(zoo.roofs).length
  );
}

/**
 * Which sound a change to the zoo makes, if any: a splash for anything put on water, a pop for anything
 * else put down or moved, and a bloop when things are taken away (the Bin, the eraser, "New zoo").
 */
export function soundForChange(before: Zoo, after: Zoo, catalogue: Catalogue): SoundName | null {
  if (before === after) return null;
  const was = amountIn(before);
  const now = amountIn(after);
  if (now < was) return 'bloop';

  if (after.items.length > before.items.length) {
    const added = after.items.find((item) => !before.items.some((old) => old.id === item.id));
    const wet = added && (catalogue.isWaterKind(added.kind) || catalogue.placeOn(added.kind) === 'water');
    return wet ? 'splash' : 'pop';
  }
  return 'pop';
}

/** Plays the sounds. Nothing happens, and nothing is set up, until sound has been turned on. */
export class SoundPlayer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = false;

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  /**
   * iPads only allow sound after a touch. Call this from a tap (like pressing the sound button) so
   * the sounds that follow are allowed to play.
   */
  unlock(): void {
    const context = this.ensure();
    if (context?.state === 'suspended') void context.resume();
  }

  play(name: SoundName | null): void {
    if (!this.enabled || name === null) return;
    const context = this.ensure();
    if (!context || !this.master) return;
    if (context.state === 'suspended') void context.resume();

    const now = context.currentTime;
    switch (name) {
      case 'pop':
        this.tone(context, now, 480, 820, 0.09, 0.5);
        break;
      case 'splash':
        this.noise(context, now, 0.32, 0.4, 1500);
        this.tone(context, now, 700, 300, 0.2, 0.18);
        break;
      case 'bloop':
        this.tone(context, now, 420, 170, 0.16, 0.5);
        break;
      case 'chime':
        this.tone(context, now, 660, 660, 0.45, 0.32);
        this.tone(context, now + 0.13, 990, 990, 0.55, 0.28);
        break;
    }
  }

  private ensure(): AudioContext | null {
    if (this.context) return this.context;
    const Context: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    try {
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = 0.35; // quiet: there may be thirty iPads in the room
      this.master.connect(this.context.destination);
    } catch {
      this.context = null;
    }
    return this.context;
  }

  /** A short beep that slides from one pitch to another and fades out. */
  private tone(context: AudioContext, when: number, from: number, to: number, seconds: number, volume: number): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(from, when);
    oscillator.frequency.exponentialRampToValueAtTime(to, when + seconds);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
    oscillator.connect(gain).connect(this.master as GainNode);
    oscillator.start(when);
    oscillator.stop(when + seconds + 0.03);
  }

  /** A burst of hiss, like water, that fades out. */
  private noise(context: AudioContext, when: number, seconds: number, volume: number, pitch: number): void {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = pitch;
    filter.Q.value = 0.7;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
    source.connect(filter).connect(gain).connect(this.master as GainNode);
    source.start(when);
  }
}

import * as Tone from "tone";

export class DrumSynth {
  private kick: Tone.MembraneSynth;
  private snare: Tone.NoiseSynth;
  private hihat: Tone.MetalSynth;
  private clap: Tone.NoiseSynth;
  private tom: Tone.MembraneSynth;
  private rim: Tone.MembraneSynth;

  constructor() {
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 },
    }).toDestination();

    this.snare = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
    }).toDestination();

    this.hihat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination();

    this.clap = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0 },
    }).toDestination();

    this.tom = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.3 },
    }).toDestination();

    this.rim = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.05, sustain: 0.01, release: 0.05 },
    }).toDestination();
  }

  triggerKick(velocity: number = 0.8): void {
    this.kick.triggerAttackRelease("C2", "8n", Tone.now(), velocity);
  }

  triggerSnare(velocity: number = 0.8): void {
    this.snare.triggerAttackRelease("16n", Tone.now(), velocity);
  }

  triggerHihat(velocity: number = 0.8): void {
    this.hihat.triggerAttackRelease("32n", Tone.now(), velocity * 0.3);
  }

  triggerClap(velocity: number = 0.8): void {
    this.clap.triggerAttackRelease("16n", Tone.now(), velocity);
  }

  triggerTom(velocity: number = 0.8): void {
    this.tom.triggerAttackRelease("G2", "8n", Tone.now(), velocity);
  }

  triggerRim(velocity: number = 0.8): void {
    this.rim.triggerAttackRelease("C4", "16n", Tone.now(), velocity);
  }

  dispose(): void {
    this.kick.dispose();
    this.snare.dispose();
    this.hihat.dispose();
    this.clap.dispose();
    this.tom.dispose();
    this.rim.dispose();
  }
}

export class BassSynth {
  private synth: Tone.MonoSynth;

  constructor() {
    this.synth = new Tone.MonoSynth({
      oscillator: { type: "square" },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.5 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.5,
        baseFrequency: 200,
        octaves: 2,
      },
    }).toDestination();
  }

  trigger(pitch: string, duration: string, velocity: number = 0.8): void {
    this.synth.triggerAttackRelease(pitch, duration, Tone.now(), velocity);
  }

  setFilter(frequency: number): void {
    (this.synth as any).filter?.frequency?.rampTo?.(frequency, 0.1);
  }

  dispose(): void {
    this.synth.dispose();
  }
}

export class LeadSynth {
  private synth: Tone.PolySynth;

  constructor() {
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 },
    }).toDestination();
  }

  trigger(pitch: string, duration: string, velocity: number = 0.8): void {
    this.synth.triggerAttackRelease(pitch, duration, Tone.now(), velocity);
  }

  dispose(): void {
    this.synth.dispose();
  }
}

export class PadSynth {
  private synth: Tone.PolySynth;

  constructor() {
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.5, decay: 0.5, sustain: 0.8, release: 1 },
    }).toDestination();
  }

  trigger(pitch: string, duration: string, velocity: number = 0.8): void {
    this.synth.triggerAttackRelease(pitch, duration, Tone.now(), velocity);
  }

  dispose(): void {
    this.synth.dispose();
  }
}

export type View = "channel-rack" | "piano-roll" | "mixer" | "drum-machine";

export interface Project {
  id: string;
  name: string;
  bpm: number;
  key: string;
  scale: string;
  durationBars: number;
  createdAt: string;
  updatedAt: string;
  tracks: Track[];
  patterns: Pattern[];
  master: MasterChannel;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
}

export interface MasterChannel {
  volume: number;
  effects: Effect[];
}

export interface Track {
  id: string;
  name: string;
  type: "drums" | "synth" | "sampler" | "audio" | "vocal";
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  effects: Effect[];
  clips: Clip[];
}

export interface Clip {
  id: string;
  startBeat: number;
  durationBeats: number;
  sourceType: "midi" | "audio" | "pattern";
  sourceId: string;
  gain: number;
  fadeIn: number;
  fadeOut: number;
}

export interface Pattern {
  id: string;
  name: string;
  steps: DrumStep[];
  notes: MidiNote[];
}

export interface DrumStep {
  step: number;
  active: boolean;
  velocity: number;
}

export interface MidiNote {
  pitch: string;
  startBeat: number;
  duration: number;
  velocity: number;
}

export interface Effect {
  id: string;
  type: "reverb" | "delay" | "eq" | "compressor" | "filter";
  enabled: boolean;
  params: Record<string, number>;
}

export interface AudioAsset {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  createdAt: string;
}

export interface UserSettings {
  id: string;
  theme: "dark" | "light";
  volume: number;
  inputDevice?: string;
  outputDevice?: string;
}

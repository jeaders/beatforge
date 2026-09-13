import * as Tone from "tone";
import type { Project, Track, Effect } from "../types";
import { db } from "../db";

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private trackSynths: Map<string, any> = new Map();
  private trackOutputs: Map<string, Tone.ToneAudioNode> = new Map();
  private trackPlayers: Map<string, Tone.Player[]> = new Map();
  private trackChannels: Map<string, Tone.Channel> = new Map();
  private effectInstances: Map<string, Tone.ToneAudioNode & { dispose: () => void }> = new Map();
  private _currentProject: Project | null = null;
  private playheadCallback?: (beat: number) => void;
  private isInitialized = false;

  private masterGain: Tone.Gain;
  private compressor: Tone.Compressor;
  private limiter: Tone.Limiter;

  private constructor() {
    this.masterGain = new Tone.Gain(0.8).toDestination();
    this.compressor = new Tone.Compressor({ threshold: -20, ratio: 4 });
    this.limiter = new Tone.Limiter(-1);

    this.masterGain.chain(this.compressor, this.limiter, Tone.Destination);
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    await Tone.start();
    this.isInitialized = true;
    Tone.getTransport().bpm.value = 120;
    Tone.getTransport().loop = true;
    Tone.getTransport().loopStart = 0;
    Tone.getTransport().loopEnd = "4m";
  }

  isReady(): boolean {
    return this.isInitialized && Tone.getContext().state !== "suspended";
  }

  setBPM(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }

  getBPM(): number {
    return Tone.getTransport().bpm.value;
  }

  play(project: Project): void {
    this.stop();
    this._currentProject = project;
    this.scheduleProject(project);
    Tone.getTransport().start();
  }

  stop(): void {
    Tone.getTransport().cancel();
    this._currentProject = null;
  }

  pause(): void {
    Tone.getTransport().pause();
  }

  getCurrentBeat(): number {
    return Tone.getTransport().seconds * (Tone.getTransport().bpm.value / 60);
  }

  setLoop(startBeat: number, endBeat: number): void {
    const bpm = Tone.getTransport().bpm.value;
    Tone.getTransport().loopStart = (startBeat * 60) / bpm;
    Tone.getTransport().loopEnd = (endBeat * 60) / bpm;
    Tone.getTransport().loop = true;
  }

  clearLoop(): void {
    Tone.getTransport().loop = false;
  }

  onPlayhead(callback: (beat: number) => void): () => void {
    this.playheadCallback = callback;
    return () => {
      if (this.playheadCallback === callback) {
        this.playheadCallback = undefined;
      }
    };
  }

  rebuildTracks(project: Project): void {
    this.disposeAllTracks();
    for (const track of project.tracks) {
      this.buildTrack(track, project);
    }
  }

  buildTrack(track: Track, _project: Project, _onNotePlay?: (note: any) => void): void {
    this.disposeTrack(track.id);

    const channel = new Tone.Channel({
      volume: Tone.gainToDb(track.volume),
      pan: track.pan,
    });

    channel.mute = track.muted;
    channel.solo = track.solo;

    this.trackChannels.set(track.id, channel);
    this.trackOutputs.set(track.id, channel);

    this.buildEffectsChain(track.effects, channel);

    if (track.type === "drums") {
      this.buildDrumTrack(track, channel);
    } else if (track.type === "synth" || track.type === "vocal") {
      this.buildSynthTrack(track, channel, _onNotePlay);
    } else if (track.type === "audio") {
      this.buildAudioTrack(track, _project, channel);
    } else if (track.type === "sampler") {
      this.buildSamplerTrack(track, channel, _onNotePlay);
    }
  }

  private buildEffectsChain(effects: Effect[], input: Tone.ToneAudioNode): void {
    let current: Tone.ToneAudioNode = input;

    for (const effect of effects) {
      if (!effect.enabled) continue;
      const instance = this.createEffect(effect);
      if (instance) {
        try {
          current.connect(instance);
        } catch {
          // ignore duplicate/wet connects during hot rebuilds
        }
        current = instance;
        this.effectInstances.set(effect.id, instance as Tone.ToneAudioNode & { dispose: () => void });
      }
    }

    try {
      current.connect(this.masterGain);
    } catch {
      // already connected
    }
  }

  private createEffect(effect: Effect): (Tone.ToneAudioNode & { dispose: () => void }) | null {
    switch (effect.type) {
      case "reverb": {
        const reverb = new Tone.Reverb({ decay: effect.params.decay ?? 2, wet: effect.params.wet ?? 0.3 });
        reverb.generate();
        return reverb as Tone.ToneAudioNode & { dispose: () => void };
      }
      case "delay": {
        return new Tone.FeedbackDelay({
          delayTime: effect.params.delayTime ?? "8n",
          feedback: effect.params.feedback ?? 0.2,
          wet: effect.params.wet ?? 0.1,
        }) as Tone.ToneAudioNode & { dispose: () => void };
      }
      case "eq": {
        return new Tone.EQ3({
          low: effect.params.low ?? 0,
          mid: effect.params.mid ?? 0,
          high: effect.params.high ?? 0,
        }) as Tone.ToneAudioNode & { dispose: () => void };
      }
      case "compressor": {
        return new Tone.Compressor({
          threshold: effect.params.threshold ?? -24,
          ratio: effect.params.ratio ?? 4,
          attack: effect.params.attack ?? 0.003,
          release: effect.params.release ?? 0.25,
        }) as Tone.ToneAudioNode & { dispose: () => void };
      }
      case "filter": {
        const filterTypes: Record<number, BiquadFilterType> = { 0: "lowpass", 1: "highpass", 2: "bandpass", 3: "notch" };
        const filterType = filterTypes[effect.params.filterType ?? 0] ?? "lowpass";
        const filter = new Tone.Filter({
          frequency: effect.params.frequency ?? 800,
          type: filterType,
          Q: effect.params.Q ?? 1,
        });
        return filter as Tone.ToneAudioNode & { dispose: () => void };
      }
      default:
        return null;
    }
  }

  private buildDrumTrack(track: Track, destination: Tone.ToneAudioNode): void {
    const trackName = track.name.toLowerCase();
    let synth: any;

    if (trackName.includes("kick") || trackName.includes("cassa")) {
      synth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 },
      }).connect(destination);
    } else if (trackName.includes("snare") || trackName.includes("rullante")) {
      synth = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
      }).connect(destination);
    } else if (trackName.includes("hihat") || trackName.includes("hi-hat") || trackName.includes("chiuso")) {
      synth = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
      }).connect(destination);
    } else if (trackName.includes("clap") || trackName.includes("mano")) {
      synth = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0 },
      }).connect(destination);
    } else if (trackName.includes("tom")) {
      synth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.3 },
      }).connect(destination);
    } else if (trackName.includes("rim") || trackName.includes("rimshot")) {
      synth = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 2,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.01, release: 0.05 },
      }).connect(destination);
    } else if (trackName.includes("cowbell")) {
      synth = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.3, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
      }).connect(destination);
    } else {
      synth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 },
      }).connect(destination);
    }

    this.trackSynths.set(track.id, synth);
  }

  private buildSynthTrack(track: Track, destination: Tone.ToneAudioNode, _onNotePlay?: (note: any) => void): void {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 },
    }).connect(destination);

    this.trackSynths.set(track.id, synth);
  }

  private buildSamplerTrack(track: Track, destination: Tone.ToneAudioNode, _onNotePlay?: (note: any) => void): void {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3 },
    }).connect(destination);

    this.trackSynths.set(track.id, synth);
  }

  private buildAudioTrack(track: Track, _project: Project, destination: Tone.ToneAudioNode): void {
    const players: Tone.Player[] = [];
    for (const clip of track.clips) {
      if (clip.sourceType === "audio") {
        const player = new Tone.Player(undefined, () => {}).connect(destination);
        player.sync().start(clip.startBeat * 60 / (Tone.getTransport().bpm.value / 60) / 4);
        players.push(player);
      }
    }
    this.trackPlayers.set(track.id, players);
  }

  private disposeTrack(trackId: string): void {
    const synth = this.trackSynths.get(trackId);
    if (synth) {
      try { synth.dispose(); } catch {}
      this.trackSynths.delete(trackId);
    }
    const players = this.trackPlayers.get(trackId);
    if (players) {
      players.forEach((p) => { try { p.dispose(); } catch {} });
      this.trackPlayers.delete(trackId);
    }
    const channel = this.trackChannels.get(trackId);
    if (channel) {
      try { channel.dispose(); } catch {}
      this.trackChannels.delete(trackId);
    }
  }

  private disposeAllTracks(): void {
    this.trackSynths.forEach((synth) => { try { synth.dispose(); } catch {} });
    this.trackPlayers.forEach((players) => { players.forEach((p) => { try { p.dispose(); } catch {} }); });
    this.trackChannels.forEach((channel) => { try { channel.dispose(); } catch {} });
    this.trackSynths.clear();
    this.trackPlayers.clear();
    this.trackChannels.clear();
  }

  private scheduleProject(project: Project): void {
    const bpm = Tone.getTransport().bpm.value;
    const beatsPerSecond = bpm / 60;
    const totalBeats = project.durationBars * 4;
    const loopBeats = totalBeats;

    Tone.getTransport().loopStart = 0;
    Tone.getTransport().loopEnd = `${loopBeats}m`;
    Tone.getTransport().loop = true;

    Tone.getTransport().scheduleRepeat((_time: number) => {
      const seconds = Tone.getTransport().seconds;
      const beat = seconds * beatsPerSecond;
      if (this.playheadCallback) {
        this.playheadCallback(beat % totalBeats);
      }
    }, "16n");

    for (const track of project.tracks) {
      if (track.muted) continue;
      this.scheduleTrack(track, project, loopBeats);
    }
  }

  private scheduleTrack(track: Track, _project: Project, loopBeats: number): void {
    if (track.type === "drums") {
      this.scheduleDrumTrack(track, loopBeats);
    } else if (track.type === "synth" || track.type === "sampler" || track.type === "vocal") {
      this.scheduleMidiTrack(track, loopBeats);
    } else if (track.type === "audio") {
      this.scheduleAudioTrack(track, loopBeats);
    }
  }

  private scheduleDrumTrack(track: Track, loopBeats: number): void {
    const patternClip = track.clips.find((c) => c.sourceType === "pattern");
    if (!patternClip) return;

    const synth = this.trackSynths.get(track.id);
    if (!synth) return;

    const patternData = this._currentProject?.patterns.find((p) => p.id === patternClip.sourceId);
    if (!patternData) return;

    const steps = patternData.steps;
    const bpm = Tone.getTransport().bpm.value;
    const stepDuration = (60 / bpm) / 4;
    const trackName = track.name.toLowerCase();

    const getDrumPitch = (): string => {
      if (trackName.includes("snare") || trackName.includes("rullante")) return "C2";
      if (trackName.includes("hihat") || trackName.includes("hi-hat") || trackName.includes("chiuso")) return "C2";
      if (trackName.includes("clap") || trackName.includes("mano")) return "C2";
      if (trackName.includes("tom")) return "G2";
      if (trackName.includes("rim") || trackName.includes("rimshot")) return "C4";
      if (trackName.includes("cowbell")) return "C2";
      return "C2";
    };

    const pitch = getDrumPitch();
    const loopEndTime = (loopBeats * 60) / bpm;

    for (let loop = 0; loop < 4; loop++) {
      const loopOffset = loop * loopBeats;
      steps.forEach((step: any, stepIndex: number) => {
        if (!step.active) return;
        const startTime = (loopOffset + (stepIndex / steps.length) * loopBeats) * 60 / bpm;

        Tone.getTransport().scheduleRepeat(
          (time) => {
            if (!track.muted) {
              if (synth instanceof Tone.NoiseSynth || synth instanceof Tone.MetalSynth) {
                synth.triggerAttackRelease("16n", time, step.velocity);
              } else {
                synth.triggerAttackRelease(pitch, "8n", time, step.velocity);
              }
            }
          },
          stepDuration,
          startTime,
          startTime + loopEndTime
        );
      });
    }
  }

  private scheduleMidiTrack(track: Track, loopBeats: number): void {
    const synth = this.trackSynths.get(track.id) as Tone.PolySynth | undefined;
    if (!synth) return;

    const midiClips = track.clips.filter((c) => c.sourceType === "midi");

    midiClips.forEach((clip) => {
      for (let loop = 0; loop < 4; loop++) {
        const loopOffset = loop * loopBeats;
        const startTime = loopOffset + clip.startBeat;
        const duration = clip.durationBeats;

        Tone.getTransport().schedule(
          (time) => {
            if (!track.muted) {
              synth.triggerAttackRelease(clip.sourceId, `${duration}i`, time, clip.gain);
            }
          },
          `${Math.floor(startTime / 4)}:${(startTime % 4) * 4}`
        );
      }
    });
  }

  private scheduleAudioTrack(track: Track, loopBeats: number): void {
    track.clips
      .filter((c) => c.sourceType === "audio")
      .forEach((clip) => {
        for (let loop = 0; loop < 4; loop++) {
          const loopOffset = loop * loopBeats;
          const startTime = loopOffset + clip.startBeat;

          Tone.getTransport().schedule(
            (_time: number) => {
              if (!track.muted) {
              }
            },
            `${Math.floor(startTime / 4)}:${(startTime % 4) * 4}`
          );
        }
      });
  }

  triggerNote(trackId: string, pitch: string, duration: string, velocity: number = 0.8): void {
    const synth = this.trackSynths.get(trackId);
    if (synth && "triggerAttackRelease" in synth) {
      (synth as Tone.PolySynth).triggerAttackRelease(pitch, duration, Tone.now(), velocity);
    }
  }

  triggerDrum(_trackId: string, _drumName: string): void {
    const synth = this.trackSynths.get(_trackId);
    if (synth && "triggerAttackRelease" in synth) {
      (synth as Tone.MonoSynth).triggerAttackRelease("C2", "8n", Tone.now(), 1);
    }
  }

  triggerGlobalDrum(sound: string, velocity: number = 0.8): void {
    const now = Tone.now();
    const trackName = sound.toLowerCase();

    if (trackName.includes("kick") || trackName.includes("cassa")) {
      const synth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 },
      }).toDestination();
      synth.triggerAttackRelease("C2", "8n", now, velocity);
      setTimeout(() => synth.dispose(), 1000);
    } else if (trackName.includes("snare") || trackName.includes("rullante")) {
      const synth = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
      }).toDestination();
      synth.triggerAttackRelease("16n", now, velocity);
      setTimeout(() => synth.dispose(), 500);
    } else if (trackName.includes("hihat") || trackName.includes("hi-hat") || trackName.includes("chiuso")) {
      const synth = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
      }).toDestination();
      synth.triggerAttackRelease("32n", now, velocity * 0.3);
      setTimeout(() => synth.dispose(), 500);
    } else if (trackName.includes("clap") || trackName.includes("mano")) {
      const synth = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0 },
      }).toDestination();
      synth.triggerAttackRelease("16n", now, velocity);
      setTimeout(() => synth.dispose(), 500);
    } else if (trackName.includes("tom")) {
      const synth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.3 },
      }).toDestination();
      synth.triggerAttackRelease("G2", "8n", now, velocity);
      setTimeout(() => synth.dispose(), 1000);
    } else if (trackName.includes("rim") || trackName.includes("rimshot")) {
      const synth = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 2,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.01, release: 0.05 },
      }).toDestination();
      synth.triggerAttackRelease("C4", "16n", now, velocity);
      setTimeout(() => synth.dispose(), 500);
    } else if (trackName.includes("cowbell")) {
      const synth = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.3, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
      }).toDestination();
      synth.triggerAttackRelease("32n", now, velocity * 0.3);
      setTimeout(() => synth.dispose(), 500);
    }
  }

  async exportWAV(project: Project, durationBeats: number): Promise<Blob> {
    const sampleRate = 44100;
    const durationSeconds = (durationBeats * 60) / project.bpm;
    const offlineContext = new OfflineAudioContext(2, sampleRate * durationSeconds, sampleRate);

    const masterGain = offlineContext.createGain();
    masterGain.gain.value = project.master.volume;
    masterGain.connect(offlineContext.destination);

    const tracksToRender = project.tracks.filter((track) => !track.muted);

    if (tracksToRender.length === 0) {
      const buffer = await offlineContext.startRendering();
      return this.audioBufferToWav(buffer);
    }

    const trackBuffers = await Promise.all(
      tracksToRender.map(async (track) => {
        const trackDuration = durationSeconds;
        const trackContext = new OfflineAudioContext(2, sampleRate * trackDuration, sampleRate);
        const trackGain = trackContext.createGain();
        trackGain.gain.value = track.volume;
        trackGain.connect(trackContext.destination);

        for (const clip of track.clips) {
          const clipGain = trackContext.createGain();
          clipGain.gain.value = clip.gain;
          clipGain.connect(trackGain);

          if (clip.sourceType === "audio") {
            const asset = await db.audioAssets.get(clip.sourceId);
            if (asset?.blob instanceof Blob) {
              const arrayBuffer = await asset.blob.arrayBuffer();
              const audioBuffer = await trackContext.decodeAudioData(arrayBuffer);
              const source = trackContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(clipGain);
              const startTime = (clip.startBeat * 60) / project.bpm;
              source.start(startTime);
            }
          }
        }

        return trackContext.startRendering();
      })
    );

    const mixedContext = new OfflineAudioContext(2, sampleRate * durationSeconds, sampleRate);
    const mixedGain = mixedContext.createGain();
    mixedGain.gain.value = 1;
    mixedGain.connect(mixedContext.destination);

    for (const buffer of trackBuffers) {
      const source = mixedContext.createBufferSource();
      source.buffer = buffer;
      source.connect(mixedGain);
      source.start();
    }

    const mixedBuffer = await mixedContext.startRendering();
    return this.audioBufferToWav(mixedBuffer);
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = buffer.length * blockAlign;
    const bufferLength = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, bufferLength - 8, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  }

  setMasterVolume(volume: number): void {
    this.masterGain.gain.value = volume;
  }

  setTrackVolume(trackId: string, volume: number): void {
    const channel = this.trackChannels.get(trackId);
    if (channel) {
      channel.volume.value = Tone.gainToDb(volume);
    }
  }

  setTrackPan(trackId: string, pan: number): void {
    const channel = this.trackChannels.get(trackId);
    if (channel) {
      channel.pan.value = pan;
    }
  }

  setTrackMute(trackId: string, muted: boolean): void {
    const channel = this.trackChannels.get(trackId);
    if (channel) {
      channel.mute = muted;
    }
  }

  setTrackSolo(trackId: string, solo: boolean): void {
    const channel = this.trackChannels.get(trackId);
    if (channel) {
      channel.solo = solo;
    }
  }

  triggerMetronome(beat: number): void {
    const now = Tone.now();
    const isDownbeat = beat % 4 === 0;
    const synth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.01, release: 0.1 },
    }).toDestination();
    synth.triggerAttackRelease(isDownbeat ? "C2" : "G2", "32n", now, 0.6);
    setTimeout(() => synth.dispose(), 500);
  }
}

export const audioEngine = AudioEngine.getInstance();

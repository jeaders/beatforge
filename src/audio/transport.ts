import * as Tone from "tone";

export class TransportManager {
  private static instance: TransportManager | null = null;
  private callbacks: Set<() => void> = new Set();
  private animationFrame: number | null = null;
  private lastBeat = 0;

  private constructor() {}

  static getInstance(): TransportManager {
    if (!TransportManager.instance) {
      TransportManager.instance = new TransportManager();
    }
    return TransportManager.instance;
  }

  subscribe(callback: () => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  startTicker(): void {
    const tick = () => {
      const currentBeat = this.getCurrentBeat();
      if (Math.abs(currentBeat - this.lastBeat) > 0.01) {
        this.lastBeat = currentBeat;
        this.callbacks.forEach((cb) => cb());
      }
      this.animationFrame = requestAnimationFrame(tick);
    };
    this.animationFrame = requestAnimationFrame(tick);
  }

  stopTicker(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  getCurrentBeat(): number {
    return Tone.getTransport().seconds * (Tone.getTransport().bpm.value / 60) / 4;
  }

  getCurrentTime(): number {
    return Tone.getTransport().seconds;
  }

  setBPM(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }

  getBPM(): number {
    return Tone.getTransport().bpm.value;
  }
}

export const transport = TransportManager.getInstance();

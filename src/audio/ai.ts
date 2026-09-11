import { MusicRNN } from "@magenta/music";

export interface AIDrumPattern {
  id: string;
  name: string;
  steps: { step: number; active: boolean; velocity: number }[];
  notes: { pitch: number; start: number; duration: number }[];
}

export class BeatAI {
  private rnn: MusicRNN | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.rnn = new MusicRNN("https://storage.googleapis.com/magentadata/models/checkpoints/music_rnn/drum_kit_rnn");
    await this.rnn.initialize();
    this.initialized = true;
  }

  async generateDrumPattern(bars: number = 2, temperature: number = 1.2): Promise<AIDrumPattern> {
    if (!this.rnn) {
      await this.init();
    }

    const stepsPerBar = 16;
    const totalSteps = bars * stepsPerBar;
    const pattern = new Array(totalSteps).fill(0);

    const quantizedNoteSequence = {
      notes: [
        { pitch: 36, quantizedStartStep: 0, quantizedEndStep: 1, velocity: 80 },
        { pitch: 38, quantizedStartStep: 4, quantizedEndStep: 5, velocity: 80 },
        { pitch: 42, quantizedStartStep: 8, quantizedEndStep: 9, velocity: 70 },
        { pitch: 38, quantizedStartStep: 12, quantizedEndStep: 13, velocity: 80 },
      ],
      totalQuantizedSteps: stepsPerBar,
      quantizationInfo: { stepsPerQuarter: 4 },
    };

    const generated = await this.rnn!.continueSequence(quantizedNoteSequence, totalSteps - stepsPerBar, temperature);
    const notes = generated.notes ?? [];
    notes.forEach((note: any) => {
      const start = note.quantizedStartStep ?? 0;
      if (start < totalSteps) {
        pattern[start] = note.pitch ?? 36;
      }
    });

    return {
      id: crypto.randomUUID(),
      name: `AI Beat ${new Date().toLocaleTimeString()}`,
      steps: pattern.map((pitch, i) => ({
        step: i,
        active: pitch > 0,
        velocity: pitch > 0 ? 0.7 + Math.random() * 0.3 : 0.8,
      })),
      notes: [],
    };
  }

  async generateMelody(bars: number = 4, temperature: number = 1.0): Promise<{ pitch: number; start: number; duration: number }[]> {
    if (!this.rnn) {
      await this.init();
    }

    const stepsPerBar = 16;
    const totalSteps = bars * stepsPerBar;

    const quantizedNoteSequence = {
      notes: [
        { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 4, velocity: 80 },
        { pitch: 64, quantizedStartStep: 4, quantizedEndStep: 8, velocity: 80 },
        { pitch: 67, quantizedStartStep: 8, quantizedEndStep: 12, velocity: 80 },
        { pitch: 72, quantizedStartStep: 12, quantizedEndStep: 16, velocity: 80 },
      ],
      totalQuantizedSteps: stepsPerBar,
      quantizationInfo: { stepsPerQuarter: 4 },
    };

    const generated = await this.rnn!.continueSequence(quantizedNoteSequence, totalSteps - stepsPerBar, temperature);
    const notes = generated.notes ?? [];
    return notes.map((note: any) => ({
      pitch: note.pitch ?? 60,
      start: note.quantizedStartStep ?? 0,
      duration: Math.max(1, (note.quantizedEndStep ?? 1) - (note.quantizedStartStep ?? 0)),
    }));
  }

  isReady(): boolean {
    return this.initialized;
  }
}

export const beatAI = new BeatAI();

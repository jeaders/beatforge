declare module '@magenta/music' {
  export class MusicRNN {
    constructor(checkpointUrl: string);
    initialize(): Promise<void>;
    continueSequence(
      noteSequence: any,
      howManySteps: number,
      temperature?: number,
      chordProgression?: string[],
      brushOff?: number
    ): Promise<any>;
  }
}

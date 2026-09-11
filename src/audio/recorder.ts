import * as Tone from "tone";

export class AudioRecorder {
  private recorder: Tone.Recorder | null = null;
  private mediaStream: MediaStream | null = null;
  private recordingCallback: ((blob: Blob) => void) | null = null;

  async startRecording(onComplete: (blob: Blob) => void): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.recordingCallback = onComplete;

      const mic = new Tone.UserMedia().toDestination();
      this.recorder = new Tone.Recorder(mic);
      this.recorder.start();
    } catch (error) {
      console.error("Error starting recording:", error);
      throw new Error("Impossibile accedere al microfono. Verifica i permessi.");
    }
  }

  stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.recorder) {
        resolve(null);
        return;
      }

      this.recorder.stop().then((blob) => {
        if (this.recordingCallback) {
          this.recordingCallback(blob);
        }
        this.cleanup();
        resolve(blob);
      }).catch(() => {
        this.cleanup();
        resolve(null);
      });
    });
  }

  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.recorder = null;
  }

  dispose(): void {
    this.cleanup();
    this.recordingCallback = null;
  }
}

export const audioRecorder = new AudioRecorder();

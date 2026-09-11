import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Project } from "../types";

export class AudioExporter {
  async exportWAV(project: Project): Promise<void> {
    const sampleRate = 44100;
    const durationSeconds = (project.durationBars * 4 * 60) / project.bpm;
    const offlineContext = new OfflineAudioContext(2, sampleRate * durationSeconds, sampleRate);

    const masterGain = offlineContext.createGain();
    masterGain.gain.value = project.master.volume;
    masterGain.connect(offlineContext.destination);

    for (const track of project.tracks) {
      if (track.muted) continue;
      const trackGain = offlineContext.createGain();
      trackGain.gain.value = track.volume;
      trackGain.connect(masterGain);

      for (const clip of track.clips) {
        const clipGain = offlineContext.createGain();
        clipGain.gain.value = clip.gain;
        clipGain.connect(trackGain);
      }
    }

    const buffer = await offlineContext.startRendering();
    const wavBlob = this.audioBufferToWav(buffer);
    saveAs(wavBlob, `${project.name}.wav`);
  }

  async exportProject(project: Project): Promise<void> {
    const zip = new JSZip();
    zip.file("project.json", JSON.stringify(project, null, 2));

    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (clip.sourceType === "audio") {
        }
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${project.name}.beatforge.zip`);
  }

  async exportStems(project: Project): Promise<void> {
    const zip = new JSZip();
    const sampleRate = 44100;
    const durationSeconds = (project.durationBars * 4 * 60) / project.bpm;

    for (const track of project.tracks) {
      const offlineContext = new OfflineAudioContext(2, sampleRate * durationSeconds, sampleRate);
      const trackGain = offlineContext.createGain();
      trackGain.gain.value = track.volume;
      trackGain.connect(offlineContext.destination);

      for (const clip of track.clips) {
        const clipGain = offlineContext.createGain();
        clipGain.gain.value = clip.gain;
        clipGain.connect(trackGain);
      }

      try {
        const buffer = await offlineContext.startRendering();
        const wavBlob = this.audioBufferToWav(buffer);
        zip.file(`stems/${track.name}.wav`, wavBlob);
      } catch (e) {
        console.error(`Failed to export stem for ${track.name}`, e);
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${project.name}_stems.zip`);
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
}

export const audioExporter = new AudioExporter();

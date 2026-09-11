import { useState, useEffect, useCallback } from "react";
import { useProjectStore } from "./stores/projectStore";
import { audioEngine } from "./audio/engine";
import { transport } from "./audio/transport";
import { db } from "./db";
import ProjectManager from "./components/ProjectManager";
import Toolbar from "./components/Toolbar";
import ChannelRack from "./components/channel-rack/ChannelRack";
import PianoRoll from "./components/piano-roll/PianoRoll";
import Mixer from "./components/mixer/Mixer";
import DrumMachine from "./components/drum-machine/DrumMachine";
import type { View } from "./types";
import "./App.css";

function App() {
  const [view, setView] = useState<View>("channel-rack");
  const [isInitialized, setIsInitialized] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [initError, setInitError] = useState<string | null>(null);
  const { currentProject, isPlaying, loadProject, togglePlay, stopPlayback, addClip } = useProjectStore();

  const rebuildTracks = useCallback(() => {
    if (!currentProject) return;
    currentProject.tracks.forEach((track) => {
      audioEngine.buildTrack(track, currentProject);
    });
  }, [currentProject]);

  useEffect(() => {
    const initAudio = async () => {
      try {
        await audioEngine.init();
        setIsInitialized(true);
        transport.startTicker();
      } catch (error) {
        console.error("Failed to initialize audio:", error);
        setInitError("Impossibile inizializzare l'audio. Riprova.");
      }
    };
    initAudio();
    return () => { transport.stopTicker(); };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      audioEngine.stop();
      setCurrentBeat(0);
      return;
    }
    if (!currentProject) return;
    audioEngine.setBPM(currentProject.bpm);
    if (currentProject.loopEnabled) {
      audioEngine.setLoop(currentProject.loopStart, currentProject.loopEnd);
    }
    rebuildTracks();
    const unsub = audioEngine.onPlayhead((beat) => { setCurrentBeat(beat); });
    audioEngine.play(currentProject);
    return unsub;
  }, [isPlaying, currentProject, rebuildTracks]);

  useEffect(() => {
    if (currentProject && isInitialized) { rebuildTracks(); }
  }, [currentProject?.tracks, currentProject?.patterns, isInitialized, rebuildTracks]);

  const handleSelectProject = async (project: any) => {
    await loadProject(project);
    setShowProjectManager(false);
  };

  const handleSave = async () => {
    const current = useProjectStore.getState().currentProject;
    if (!current) return;
    await db.projects.put(current);
    alert("Progetto salvato!");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.code === "Escape") { e.preventDefault(); stopPlayback(); }
      else if (e.ctrlKey && e.code === "KeyS") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, stopPlayback, handleSave]);

  const handleExportWAV = async () => {
    const current = useProjectStore.getState().currentProject;
    if (!current) return;
    await audioEngine.exportWAV(current, current.durationBars * 4);
  };

  const handleStartRecording = async () => {
    try {
      await audioEngine.init();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      setIsRecording(true);
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      const mediaRecorder = new MediaRecorder(destination.stream);
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const current = useProjectStore.getState().currentProject;
        if (current) {
          const audioContext = new AudioContext();
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const durationBeats = (audioBuffer.duration * current.bpm) / 60 / 4;
          const vocalTrack = current.tracks.find((t) => t.type === "vocal") || current.tracks.find((t) => t.type === "audio");
          if (vocalTrack) {
            const asset = { id: `asset-${Date.now()}`, name: `Registrazione ${new Date().toLocaleTimeString()}`, blob, duration: audioBuffer.duration, createdAt: new Date().toISOString() };
            await db.audioAssets.put(asset);
            addClip(vocalTrack.id, { startBeat: 0, durationBeats, sourceType: "audio", sourceId: asset.id, gain: 0.8, fadeIn: 0, fadeOut: 0 });
          }
        }
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      };
      mediaRecorder.start();
      (window as any).__mediaRecorder = mediaRecorder;
      (window as any).__recordingStream = stream;
    } catch (error) {
      console.error("Recording error:", error);
      alert("Impossibile accedere al microfono. Verifica i permessi.");
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    const recorder = (window as any).__mediaRecorder;
    const stream = (window as any).__recordingStream;
    if (recorder && recorder.state !== "inactive") { recorder.stop(); }
    if (stream) { stream.getTracks().forEach((track: MediaStreamTrack) => track.stop()); }
    setIsRecording(false);
  };

  if (showProjectManager || !currentProject) {
    return <ProjectManager onSelect={handleSelectProject} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      <Toolbar
        project={currentProject}
        isPlaying={isPlaying}
        isRecording={isRecording}
        onPlayPause={togglePlay}
        onStop={stopPlayback}
        onSave={handleSave}
        onExportWAV={handleExportWAV}
        onShowProjects={() => setShowProjectManager(true)}
        currentView={view}
        onViewChange={setView}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        currentBeat={currentBeat}
      />
      <div className="flex-1 overflow-hidden relative">
        {view === "channel-rack" && <ChannelRack currentBeat={currentBeat} isPlaying={isPlaying} />}
        {view === "piano-roll" && <PianoRoll currentBeat={currentBeat} isPlaying={isPlaying} />}
        {view === "mixer" && <Mixer />}
        {view === "drum-machine" && <DrumMachine />}
      </div>
      {initError && (
        <div className="px-4 py-2 bg-red-900/80 border-t border-red-700 text-red-200 text-xs flex items-center justify-between">
          <span>{initError}</span>
          <button onClick={() => setInitError(null)} className="text-red-300 hover:text-white">×</button>
        </div>
      )}
      <div className="h-8 px-4 flex items-center justify-between text-[11px] text-[#7c869a] border-t border-[#2a3347] bg-[#111318]">
        <div className="flex items-center gap-4">
          <span>BPM: {currentProject.bpm}</span>
          <span>Tonalità: {currentProject.key} {currentProject.scale}</span>
          <span>Barre: {currentProject.durationBars}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Tracce: {currentProject.tracks.length}</span>
          <span>Pattern: {currentProject.patterns.length}</span>
          {isRecording && <span className="px-2 py-0.5 rounded bg-red-600 animate-pulse text-white">● Registrazione</span>}
          <span className={`px-2 py-0.5 rounded ${isInitialized ? "bg-emerald-600" : "bg-yellow-600"} text-white`}>
            {isInitialized ? "Audio Pronto" : "Inizializzazione..."}
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;

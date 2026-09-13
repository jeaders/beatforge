import { useState, useEffect } from "react";
import type { Project, View } from "../types";
import { useProjectStore } from "../stores/projectStore";

interface ToolbarProps {
  project: Project;
  isPlaying: boolean;
  isRecording: boolean;
  currentBeat: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSave: () => void;
  onExportWAV: () => void;
  onShowProjects: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  currentView: View;
  onViewChange: (view: View) => void;
}

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALES = ["Major", "Minor", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Locrian", "Blues", "Pentatonic", "Harmonic Minor"];

export default function Toolbar({
  project,
  isPlaying,
  isRecording,
  currentBeat,
  onPlayPause,
  onStop,
  onSave,
  onExportWAV,
  onShowProjects,
  onStartRecording,
  onStopRecording,
  currentView,
  onViewChange,
}: Readonly<ToolbarProps>) {
  const [bpm, setBpm] = useState(project.bpm);
  const [key, setKey] = useState(project.key);
  const [scale, setScale] = useState(project.scale);

  useEffect(() => {
    setBpm(project.bpm);
    setKey(project.key);
    setScale(project.scale);
  }, [project]);

  const totalBeats = project.durationBars * 4;
  const progress = totalBeats > 0 ? (currentBeat % totalBeats) / totalBeats : 0;

  const views: { id: View; label: string }[] = [
    { id: "channel-rack", label: "Channel" },
    { id: "piano-roll", label: "Note" },
    { id: "mixer", label: "Mixer" },
    { id: "drum-machine", label: "Drums" },
    { id: "browser", label: "Browser" },
    { id: "arrangement", label: "Arrangement" },
    { id: "automation", label: "Automation" },
  ];

  const handleBpmChange = (delta: number) => {
    const next = Math.max(40, Math.min(300, bpm + delta));
    setBpm(next);
    useProjectStore.getState().updateProject({ bpm: next });
  };

  return (
    <div className="glass-strong border-b border-[#1f2637] px-3 sm:px-4 py-2 z-20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={onShowProjects}
            className="transport-btn flex-shrink-0"
            title="Progetti"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-sm sm:text-base font-semibold text-white truncate">{project.name}</h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 bg-[#111318] rounded-lg p-1 border border-[#2a3347]">
            <button
              onClick={() => handleBpmChange(-1)}
              className="transport-btn w-8 h-8 text-xs"
            >
              -
            </button>
            <div className="flex flex-col items-center px-2 min-w-[48px]">
              <span className="text-[10px] text-[#7c869a] uppercase tracking-wider">BPM</span>
              <span className="text-sm font-bold text-white leading-tight">{bpm}</span>
            </div>
            <button
              onClick={() => handleBpmChange(1)}
              className="transport-btn w-8 h-8 text-xs"
            >
              +
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-[#111318] rounded-lg p-1 border border-[#2a3347]">
            <select
              value={key}
              onChange={(e) => { setKey(e.target.value); useProjectStore.getState().updateProject({ key: e.target.value }); }}
              className="bg-transparent text-white text-xs border-none outline-none cursor-pointer"
            >
              {KEYS.map((k) => (
                <option key={k} value={k} className="bg-[#1c2130]">{k}</option>
              ))}
            </select>
            <select
              value={scale}
              onChange={(e) => { setScale(e.target.value); useProjectStore.getState().updateProject({ scale: e.target.value }); }}
              className="bg-transparent text-white text-xs border-none outline-none cursor-pointer"
            >
              {SCALES.map((s) => (
                <option key={s} value={s.toLowerCase()} className="bg-[#1c2130]">{s}</option>
              ))}
            </select>
          </div>

          <div className="hidden lg:flex items-center gap-1 bg-[#111318] rounded-lg px-2 py-1 border border-[#2a3347]">
            <span className="text-[10px] text-[#7c869a]">4/4</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={onPlayPause}
            className={`transport-btn w-9 h-9 sm:w-10 sm:h-10 ${isPlaying ? "active" : ""}`}
            title={isPlaying ? "Pausa" : "Play"}
          >
            {isPlaying ? (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={onStop}
            className="transport-btn w-9 h-9 sm:w-10 sm:h-10"
            title="Stop"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
          </button>

          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={`transport-btn w-9 h-9 sm:w-10 sm:h-10 ${isRecording ? "active" : ""}`}
            title={isRecording ? "Stop Registrazione" : "Registra"}
            style={isRecording ? { background: "linear-gradient(180deg, rgba(248,113,113,.25), rgba(248,113,113,.08))", borderColor: "rgba(248,113,113,.5)" } : undefined}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? "bg-red-400 animate-pulse" : "bg-red-500"}`} />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onSave}
            className="transport-btn px-3 w-auto gap-1.5 text-xs sm:text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span className="hidden lg:inline">Salva</span>
          </button>
          <button
            onClick={onExportWAV}
            className="transport-btn px-3 w-auto gap-1.5 text-xs sm:text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden lg:inline">WAV</span>
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 bg-[#1c2130] rounded-full overflow-hidden">
          {isPlaying && (
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-100 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          )}
        </div>
        {isPlaying && (
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50" />
        )}
      </div>

      <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`view-tab whitespace-nowrap flex items-center gap-1.5 ${
              currentView === view.id ? "active" : ""
            }`}
          >
            <span>{view.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

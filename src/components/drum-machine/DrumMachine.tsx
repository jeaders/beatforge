import { useState, useEffect, useCallback, useRef } from "react";
import { audioEngine } from "../../audio/engine";
import type { DrumStep } from "../../types";

interface DrumPad {
  name: string;
  key: string;
  sound: string;
  color: string;
  glow: string;
}

const DRUM_PADS: DrumPad[] = [
  { name: "Kick", key: "Q", sound: "kick", color: "#ef4444", glow: "rgba(239, 68, 68, 0.45)" },
  { name: "Snare", key: "W", sound: "snare", color: "#f97316", glow: "rgba(249, 115, 22, 0.45)" },
  { name: "HH Closed", key: "E", sound: "hihat", color: "#eab308", glow: "rgba(234, 179, 8, 0.45)" },
  { name: "HH Open", key: "R", sound: "hihat_open", color: "#facc15", glow: "rgba(250, 204, 21, 0.45)" },
  { name: "Clap", key: "T", sound: "clap", color: "#22c55e", glow: "rgba(34, 197, 94, 0.45)" },
  { name: "Tom", key: "Y", sound: "tom", color: "#06b6d4", glow: "rgba(6, 182, 212, 0.45)" },
  { name: "Rim", key: "U", sound: "rim", color: "#3b82f6", glow: "rgba(59, 130, 246, 0.45)" },
  { name: "Cowbell", key: "I", sound: "cowbell", color: "#a855f7", glow: "rgba(168, 85, 247, 0.45)" },
];

const TOTAL_STEPS = 16;
const BEAT_GROUP_SIZE = 4;

function createEmptySteps(): DrumStep[] {
  return Array.from({ length: TOTAL_STEPS }, (_, i) => ({
    step: i,
    active: false,
    velocity: 0.8,
  }));
}

function createPattern(name: string) {
  return {
    id: crypto.randomUUID(),
    name,
    steps: createEmptySteps(),
    notes: [],
  };
}

export default function DrumMachine() {
  const [patterns, setPatterns] = useState(() => [createPattern("Pattern 1")]);
  const [selectedPatternId, setSelectedPatternId] = useState<string>(patterns[0].id);
  const [activePad, setActivePad] = useState<string | null>(null);
  const [bpm, setBpm] = useState(120);
  const [swing, setSwing] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const schedulerRef = useRef<number | null>(null);
  const playheadRef = useRef(0);

  const selectedPattern = patterns.find((p) => p.id === selectedPatternId) ?? patterns[0];

  const triggerPad = useCallback((sound: string) => {
    audioEngine.triggerGlobalDrum(sound);
    setActivePad(sound);
    setTimeout(() => setActivePad(null), 100);
  }, []);

  const toggleStep = useCallback((stepIndex: number) => {
    setPatterns((prev) =>
      prev.map((p) =>
        p.id === selectedPatternId
          ? {
              ...p,
              steps: p.steps.map((s, i) =>
                i === stepIndex ? { ...s, active: !s.active } : s
              ),
            }
          : p
      )
    );
  }, [selectedPatternId]);

  const clearPattern = useCallback(() => {
    setPatterns((prev) =>
      prev.map((p) =>
        p.id === selectedPatternId
          ? { ...p, steps: createEmptySteps() }
          : p
      )
    );
  }, [selectedPatternId]);

  const randomizePattern = useCallback(() => {
    setPatterns((prev) =>
      prev.map((p) =>
        p.id === selectedPatternId
          ? {
              ...p,
              steps: p.steps.map((s) => ({
                ...s,
                active: Math.random() > 0.65,
                velocity: 0.5 + Math.random() * 0.5,
              })),
            }
          : p
      )
    );
  }, [selectedPatternId]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toUpperCase();
      const pad = DRUM_PADS.find((p) => p.key === key);
      if (pad) {
        triggerPad(pad.sound);
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerPad]);

  useEffect(() => {
    if (!isPlaying) {
      if (schedulerRef.current) {
        clearInterval(schedulerRef.current);
        schedulerRef.current = null;
      }
      return;
    }

    const stepMs = (60 / bpm / 4) * 1000;
    let step = 0;

    schedulerRef.current = window.setInterval(() => {
      playheadRef.current = step;
      step = (step + 1) % TOTAL_STEPS;
    }, stepMs);

    return () => {
      if (schedulerRef.current) {
        clearInterval(schedulerRef.current);
        schedulerRef.current = null;
      }
      playheadRef.current = 0;
    };
  }, [isPlaying, bpm, selectedPattern]);

  const currentStep = playheadRef.current;

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="text-lg font-semibold text-white">Drum Machine</h2>
          <p className="text-xs text-[#7c869a] mt-0.5">Usa i tasti Q W E R T Y U I per suonare i pad</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPatternId}
            onChange={(e) => setSelectedPatternId(e.target.value)}
            className="bg-[#1c2130] text-white rounded-lg border border-[#2a3347] focus:border-cyan-400 focus:outline-none text-xs px-3 py-1.5"
          >
            {patterns.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => setPatterns((prev) => [...prev, createPattern(`Pattern ${prev.length + 1}`)])}
            className="transport-btn px-3 w-auto text-xs"
          >
            + Pattern
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {DRUM_PADS.map((pad) => (
              <button
                key={pad.sound}
                onClick={() => triggerPad(pad.sound)}
                className={`drum-pad ${activePad === pad.sound ? "triggered" : ""}`}
                style={{
                  borderColor: pad.color,
                  color: pad.color,
                  boxShadow: activePad === pad.sound ? `0 0 22px ${pad.glow}` : undefined,
                }}
              >
                <span className="text-white font-semibold text-sm sm:text-base">{pad.name}</span>
                <span className="text-[#7c869a] text-xs bg-[#111318] px-2 py-0.5 rounded">{pad.key}</span>
              </button>
            ))}
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#7c869a]">BPM</span>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(Math.max(40, Math.min(300, Number(e.target.value))))}
                  className="w-16 bg-[#111318] text-white text-xs rounded border border-[#2a3347] px-2 py-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#7c869a]">Swing</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={swing}
                  onChange={(e) => setSwing(parseFloat(e.target.value))}
                  className="w-24"
                />
                <span className="text-xs text-white w-8">{Math.round(swing * 100)}%</span>
              </div>
              <div className="flex gap-2">
                <button onClick={clearPattern} className="transport-btn px-3 w-auto text-xs">Clear</button>
                <button onClick={randomizePattern} className="transport-btn px-3 w-auto text-xs">Rand</button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`transport-btn px-3 w-auto text-xs ${isPlaying ? "active" : ""}`}
                >
                  {isPlaying ? "Stop" : "Play"}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {DRUM_PADS.map((pad) => (
                <div key={pad.sound} className="flex items-center gap-2">
                  <div className="w-16 sm:w-20 text-[10px] sm:text-xs text-[#c9d1dc] font-medium flex-shrink-0 truncate">
                    {pad.name}
                  </div>
                  <div className="flex gap-1 flex-1">
                    {Array.from({ length: TOTAL_STEPS }, (_, stepIndex) => {
                      const step = selectedPattern.steps[stepIndex];
                      const isCurrentStep = stepIndex === currentStep && isPlaying;
                      const isEvenBeat = Math.floor(stepIndex / BEAT_GROUP_SIZE) % 2 === 0;
                      return (
                        <button
                          key={stepIndex}
                          onClick={() => toggleStep(stepIndex)}
                          className={`step-btn ${step.active ? "active" : ""} ${isCurrentStep ? "current" : ""}`}
                          style={{
                            backgroundColor: step.active ? colorMix(pad.color, step.velocity) : undefined,
                            borderColor: isEvenBeat ? "rgba(42,51,71,0.8)" : "rgba(31,38,55,0.8)",
                          }}
                        >
                          {step.active && (
                            <div
                              className="absolute inset-0 rounded-md pointer-events-none"
                              style={{ background: `linear-gradient(180deg, transparent, rgba(255,255,255,${step.velocity * 0.12}))` }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function colorMix(hex: string, intensity: number) {
  const alpha = 0.25 + intensity * 0.55;
  return hex + Math.round(alpha * 255).toString(16).padStart(2, "0");
}

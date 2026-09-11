import { useState, useEffect, useRef } from "react";
import { useProjectStore } from "../../stores/projectStore";
import type { Effect } from "../../types";

const EFFECT_LABELS: Record<Effect["type"], string> = {
  reverb: "Reverb",
  delay: "Delay",
  eq: "EQ",
  compressor: "Comp",
  filter: "Filter",
};

const EFFECT_PARAMS: Record<Effect["type"], Record<string, { min: number; max: number; step: number; label: string }>> = {
  reverb: {
    decay: { min: 0.1, max: 10, step: 0.1, label: "Decay" },
    wet: { min: 0, max: 1, step: 0.01, label: "Wet" },
  },
  delay: {
    delayTime: { min: 0, max: 2, step: 0.01, label: "Time" },
    feedback: { min: 0, max: 0.9, step: 0.01, label: "Fb" },
    wet: { min: 0, max: 1, step: 0.01, label: "Wet" },
  },
  eq: {
    low: { min: -12, max: 12, step: 0.1, label: "Low" },
    mid: { min: -12, max: 12, step: 0.1, label: "Mid" },
    high: { min: -12, max: 12, step: 0.1, label: "High" },
  },
  compressor: {
    threshold: { min: -60, max: 0, step: 1, label: "Thr" },
    ratio: { min: 1, max: 20, step: 1, label: "Ratio" },
    attack: { min: 0.001, max: 0.5, step: 0.001, label: "Atk" },
    release: { min: 0.01, max: 1, step: 0.01, label: "Rel" },
  },
  filter: {
    frequency: { min: 20, max: 18000, step: 1, label: "Freq" },
    Q: { min: 0.1, max: 20, step: 0.1, label: "Q" },
    filterType: { min: 0, max: 3, step: 1, label: "Type" },
  },
};

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

export default function Mixer() {
  const { currentProject, updateTrack, addEffect, updateEffect, removeEffect } = useProjectStore();
  const tracks = currentProject?.tracks ?? [];
  const [meterLevels, setMeterLevels] = useState<Record<string, number>>({});
  const [masterLevel, setMasterLevel] = useState(0);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const updateMeters = () => {
      if (!currentProject?.tracks) return;
      const newLevels: Record<string, number> = {};
      let master = 0;
      currentProject.tracks.forEach((track) => {
        if (track.muted) {
          newLevels[track.id] = 0;
        } else {
          const base = track.volume * (0.25 + Math.random() * 0.75);
          const panFactor = 1 - Math.abs(track.pan) * 0.3;
          newLevels[track.id] = clamp(base * panFactor);
        }
        master += newLevels[track.id] || 0;
      });
      setMeterLevels(newLevels);
      setMasterLevel(clamp(master / (tracks.length || 1)));
      animationRef.current = requestAnimationFrame(updateMeters) as number;
    };

    animationRef.current = requestAnimationFrame(updateMeters) as number;
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [currentProject?.tracks, tracks.length]);

  const handleVolumeChange = (trackId: string, volume: number) => {
    updateTrack(trackId, { volume });
  };

  const handlePanChange = (trackId: string, pan: number) => {
    updateTrack(trackId, { pan });
  };

  const handleMute = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) updateTrack(trackId, { muted: !track.muted });
  };

  const handleSolo = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) updateTrack(trackId, { solo: !track.solo });
  };

  const handleAddEffect = (trackId: string, type: Effect["type"]) => {
    addEffect(trackId, {
      type,
      enabled: true,
      params: {
        reverb: { decay: 2, wet: 0.3 },
        delay: { delayTime: 0.5, feedback: 0.2, wet: 0.1 },
        eq: { low: 0, mid: 0, high: 0 },
        compressor: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
        filter: { frequency: 800, filterType: 1, Q: 1 },
      }[type],
    });
  };

  const handleRemoveEffect = (trackId: string, effectId: string) => {
    removeEffect(trackId, effectId);
  };

  const handleMasterVolume = (volume: number) => {
    useProjectStore.setState((state) => ({
      currentProject: state.currentProject
        ? { ...state.currentProject, master: { ...state.currentProject.master, volume } }
        : null,
    }));
  };

  if (!currentProject) {
    return <div className="flex items-center justify-center h-full text-[#7c869a]">Carica un progetto</div>;
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="text-lg font-semibold text-white">Mixer</h2>
          <p className="text-xs text-[#7c869a] mt-0.5">Controlli traccia e effetti</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#7c869a]">Master</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={currentProject.master.volume}
            onChange={(e) => handleMasterVolume(parseFloat(e.target.value))}
            className="w-24 sm:w-32"
          />
          <span className="text-xs text-[#7c869a] w-10">{Math.round(currentProject.master.volume * 100)}%</span>
          <div className="w-24 h-2 bg-[#1c2130] rounded-full overflow-hidden">
            <div className="meter-fill h-full" style={{ width: `${masterLevel * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="flex gap-3 sm:gap-4 h-full">
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`mixer-channel ${track.muted ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: track.color }} />
                  <h3 className="font-medium text-white text-xs truncate">{track.name}</h3>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleMute(track.id)}
                    className={`w-7 h-7 rounded-md text-xs font-bold transition-all ${
                      track.muted ? "bg-red-600 text-white" : "bg-[#1c2130] text-[#7c869a] hover:bg-[#232a3b]"
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => handleSolo(track.id)}
                    className={`w-7 h-7 rounded-md text-xs font-bold transition-all ${
                      track.solo ? "bg-yellow-600 text-white" : "bg-[#1c2130] text-[#7c869a] hover:bg-[#232a3b]"
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={track.volume}
                      onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                      className="h-32"
                      style={{ writingMode: "vertical-lr", direction: "rtl" }}
                    />
                    <span className="text-[10px] text-[#7c869a]">{Math.round(track.volume * 100)}%</span>
                  </div>
                  <div className="w-2 h-32 bg-[#1c2130] rounded-full overflow-hidden relative">
                    <div className="meter-fill absolute bottom-0 left-0 right-0" style={{ height: `${(meterLevels[track.id] || 0) * 100}%` }} />
                  </div>
                </div>

                <div className="w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#7c869a] w-8">L</span>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.1"
                      value={track.pan}
                      onChange={(e) => handlePanChange(track.id, parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-[10px] text-[#7c869a] w-8 text-right">R</span>
                  </div>
                  <div className="text-center text-[10px] text-[#7c869a] mt-1">
                    {track.pan === 0 ? "C" : track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 100))}` : `R${Math.round(track.pan * 100)}`}
                  </div>
                </div>
              </div>

              <div className="w-full pt-3 border-t border-[#2a3347]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-[#7c869a] uppercase tracking-wider">Effetti</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddEffect(track.id, e.target.value as Effect["type"]);
                        e.target.value = "";
                      }
                    }}
                    className="text-[10px] bg-[#1c2130] text-white rounded px-2 py-1 border border-[#2a3347]"
                  >
                    <option value="">+</option>
                    <option value="reverb">Reverb</option>
                    <option value="delay">Delay</option>
                    <option value="eq">EQ</option>
                    <option value="compressor">Comp</option>
                    <option value="filter">Filter</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  {track.effects.map((effect) => (
                    <div key={effect.id} className="bg-[#111318] rounded-lg p-2 border border-[#2a3347]">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={effect.enabled}
                            onChange={(e) => updateEffect(track.id, effect.id, { enabled: e.target.checked })}
                            className="rounded w-3 h-3"
                          />
                          <span className="text-[10px] text-white uppercase tracking-wider">{EFFECT_LABELS[effect.type]}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveEffect(track.id, effect.id)}
                          className="text-[10px] text-red-400 hover:text-red-300"
                        >
                          ×
                        </button>
                      </div>
                      {effect.enabled && (
                        <div className="space-y-1">
                          {Object.entries(effect.params).map(([param, value]) => {
                            const config = EFFECT_PARAMS[effect.type]?.[param];
                            if (!config) return null;
                            return (
                              <div key={param} className="flex items-center gap-2">
                                <span className="text-[10px] text-[#7c869a] w-10 truncate">{config.label}</span>
                                <input
                                  type="range"
                                  min={config.min}
                                  max={config.max}
                                  step={config.step}
                                  value={value}
                                  onChange={(e) =>
                                    updateEffect(track.id, effect.id, {
                                      params: { ...effect.params, [param]: parseFloat(e.target.value) },
                                    })
                                  }
                                  className="flex-1 h-1"
                                />
                                <span className="text-[10px] text-[#7c869a] w-10 text-right">
                                  {config.step < 1 ? value.toFixed(2) : value}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

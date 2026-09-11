import { useCallback, useMemo, useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import type { Track } from "../../types";

interface ChannelRackProps {
  currentBeat: number;
  isPlaying: boolean;
}

export default function ChannelRack({ currentBeat, isPlaying }: ChannelRackProps) {
  const {
    currentProject,
    updatePattern,
    updateTrack,
    addPattern,
    deleteTrack,
    deletePattern,
  } = useProjectStore();

  const tracks = useMemo(() => currentProject?.tracks ?? [], [currentProject]);
  const patterns = useMemo(() => currentProject?.patterns ?? [], [currentProject]);
  const drumTracks = useMemo(() => tracks.filter((t) => t.type === "drums"), [tracks]);
  const totalSteps = 16;
  const currentStepIndex = Math.floor(currentBeat) % totalSteps;

  const [swing, setSwing] = useState(0);
  const [hoveredStep, setHoveredStep] = useState<{
    patternId: string;
    stepIndex: number;
  } | null>(null);

  const getPatternForTrack = useCallback(
    (track: typeof drumTracks[0]) => {
      if (!currentProject) return null;
      const patternClip = track.clips.find((c) => c.sourceType === "pattern");
      if (!patternClip) return null;
      return patterns.find((p) => p.id === patternClip.sourceId) ?? null;
    },
    [currentProject, patterns]
  );

  const handleStepToggle = useCallback(
    (patternId: string, stepIndex: number) => {
      const pattern = patterns.find((p) => p.id === patternId);
      if (!pattern) return;
      const steps = [...pattern.steps];
      const step = steps[stepIndex];
      const newActive = !step.active;
      steps[stepIndex] = {
        ...step,
        active: newActive,
        velocity: newActive ? Math.max(step.velocity, 0.5) : step.velocity,
      };
      updatePattern(pattern.id, { steps });
    },
    [patterns, updatePattern]
  );

  const handleVelocityChange = useCallback(
    (patternId: string, stepIndex: number, velocity: number) => {
      const pattern = patterns.find((p) => p.id === patternId);
      if (!pattern) return;
      const steps = [...pattern.steps];
      steps[stepIndex] = { ...steps[stepIndex], velocity };
      updatePattern(pattern.id, { steps });
    },
    [patterns, updatePattern]
  );

  const handleClear = useCallback(() => {
    if (!currentProject) return;
    currentProject.patterns.forEach((pattern) => {
      const steps = pattern.steps.map((s) => ({ ...s, active: false }));
      updatePattern(pattern.id, { steps });
    });
  }, [currentProject, updatePattern]);

  const handleAddDrumTrack = useCallback(() => {
    if (!currentProject) return;
    const name = prompt("Nome traccia drums:", `Drums ${drumTracks.length + 1}`);
    if (!name) return;
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6"];
    const color = colors[drumTracks.length % colors.length];
    const patternId = crypto.randomUUID();
    addPattern({
      name: `${name} Pattern`,
      steps: Array.from({ length: totalSteps }, (_, i) => ({
        step: i,
        active: false,
        velocity: 1,
      })),
      notes: [],
    });
    useProjectStore.setState((state) => {
      if (!state.currentProject) return state;
      const newTrack: Track = {
        id: crypto.randomUUID(),
        name,
        type: "drums",
        color,
        muted: false,
        solo: false,
        volume: 0.8,
        pan: 0,
        effects: [],
        clips: [
          {
            id: crypto.randomUUID(),
            startBeat: 0,
            durationBeats: 4,
            sourceType: "pattern",
            sourceId: patternId,
            gain: 0.8,
            fadeIn: 0,
            fadeOut: 0,
          },
        ],
      };
      return {
        currentProject: {
          ...state.currentProject,
          tracks: [...state.currentProject.tracks, newTrack],
        },
      };
    });
  }, [currentProject, drumTracks.length, addPattern]);

  const handleRandomize = useCallback(() => {
    if (!currentProject) return;
    currentProject.patterns.forEach((pattern) => {
      const steps = pattern.steps.map((s) => ({
        ...s,
        active: Math.random() > 0.65,
        velocity: Math.random() * 0.5 + 0.5,
      }));
      updatePattern(pattern.id, { steps });
    });
  }, [currentProject, updatePattern]);

  const handleMute = useCallback(
    (trackId: string, muted: boolean) => {
      updateTrack(trackId, { muted });
    },
    [updateTrack]
  );

  const handleSolo = useCallback(
    (trackId: string, solo: boolean) => {
      updateTrack(trackId, { solo });
    },
    [updateTrack]
  );

  const handleDeleteTrack = useCallback(
    (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;
      if (!confirm(`Eliminare la traccia "${track.name}"?`)) return;
      const patternClip = track.clips.find((c) => c.sourceType === "pattern");
      if (patternClip) {
        deletePattern(patternClip.sourceId);
      }
      deleteTrack(trackId);
    },
    [tracks, deletePattern, deleteTrack]
  );

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Nessun progetto disponibile
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#111318]">
      {/* ─── HEADER ───────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-2.5 border-b border-[#2a3347] bg-[#161a21]/80 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight font-mono uppercase">
                Channel Rack
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 tabular-nums">
                {drumTracks.length} tracks &bull; {totalSteps} steps &bull; 1/16
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Swing */}
            <div className="flex items-center gap-2 bg-[#111318]/60 rounded-lg px-2.5 py-1.5 border border-[#2a3347]">
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                Swing
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={swing}
                onChange={(e) => setSwing(Number(e.target.value))}
                className="w-12 sm:w-16 h-1 accent-indigo-400 cursor-pointer"
              />
              <span className="text-[10px] text-gray-500 tabular-nums w-6 text-right">
                {swing}%
              </span>
            </div>

            <button
              onClick={handleAddDrumTrack}
              className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 active:scale-95 transition-all duration-150 text-[10px] sm:text-xs font-semibold uppercase tracking-wider shadow-lg shadow-indigo-900/30"
            >
              + Track
            </button>
            <button
              onClick={handleRandomize}
              className="px-2.5 py-1.5 bg-[#1e2330] text-gray-300 rounded-lg hover:bg-[#252b3b] active:scale-95 transition-all duration-150 text-[10px] sm:text-xs font-semibold uppercase tracking-wider border border-[#2a3347]"
            >
              Rand
            </button>
            <button
              onClick={handleClear}
              className="px-2.5 py-1.5 bg-[#1e2330] text-gray-300 rounded-lg hover:bg-red-900/30 hover:text-red-400 hover:border-red-500/40 active:scale-95 transition-all duration-150 text-[10px] sm:text-xs font-semibold uppercase tracking-wider border border-[#2a3347]"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* ─── STEP HEADER ───────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 sm:px-4 pt-2 pb-1">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Spacer for color bar + track info */}
          <div className="w-[88px] sm:w-[120px] flex-shrink-0" />
          {/* Mute/Solo spacer */}
          <div className="w-[54px] sm:w-[60px] flex-shrink-0" />
          {/* Step number markers */}
          <div className="flex-1 grid grid-cols-16 gap-1 sm:gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`text-center text-[9px] sm:text-[10px] font-mono tabular-nums ${
                  i % 4 === 0
                    ? "text-gray-400 font-bold"
                    : "text-gray-600"
                } ${i === currentStepIndex && isPlaying ? "text-indigo-300" : ""}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── TRACK LIST ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-3 pb-3 scrollbar-thin">
        {drumTracks.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-xs sm:text-sm">
            Crea una traccia di tipo "drums" per iniziare
          </div>
        )}

        <div className="space-y-1 sm:space-y-1.5">
          {drumTracks.map((track) => {
            const pattern = getPatternForTrack(track);
            if (!pattern) return null;

            const steps = pattern.steps;
            const isMuted = track.muted;

            return (
              <div
                key={track.id}
                className={`group relative flex items-center gap-2 sm:gap-3 rounded-xl transition-all duration-200 ${
                  isPlaying
                    ? "bg-[#161a21]/90 shadow-lg shadow-black/20"
                    : "bg-[#161a21]/40 hover:bg-[#161a21]/70"
                } ${isMuted ? "opacity-50" : ""}`}
              >
                {/* Track color indicator */}
                <div
                  className="w-1 sm:w-1.5 self-stretch min-h-[44px] sm:min-h-[52px] rounded-full flex-shrink-0 transition-all duration-200"
                  style={{ backgroundColor: track.color }}
                />

                {/* Track info */}
                <div className="w-[76px] sm:w-[108px] flex-shrink-0 flex flex-col justify-center gap-1 py-2">
                  <span
                    className={`text-[10px] sm:text-xs font-semibold truncate ${
                      isMuted ? "text-gray-600 line-through" : "text-gray-200"
                    }`}
                  >
                    {track.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMute(track.id, !track.muted)}
                      className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition-all duration-100 ${
                        track.muted
                          ? "bg-red-500/20 text-red-400 border border-red-500/40"
                          : "bg-[#111318] text-gray-500 border border-[#2a3347] hover:border-gray-500 hover:text-gray-300"
                      }`}
                    >
                      M
                    </button>
                    <button
                      onClick={() => handleSolo(track.id, !track.solo)}
                      className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition-all duration-100 ${
                        track.solo
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                          : "bg-[#111318] text-gray-500 border border-[#2a3347] hover:border-gray-500 hover:text-gray-300"
                      }`}
                    >
                      S
                    </button>
                  </div>
                </div>

                {/* Steps */}
                <div className="flex-1 grid grid-cols-16 gap-1 sm:gap-1.5 py-2 pr-1">
                  {Array.from({ length: totalSteps }, (_, stepIndex) => {
                    const s = steps[stepIndex];
                    const active = s.active && !isMuted;
                    const isCurrentStep = stepIndex === currentStepIndex && isPlaying;
                    const isHovered =
                      hoveredStep?.patternId === pattern.id &&
                      hoveredStep?.stepIndex === stepIndex;
                    const groupStart = stepIndex % 4 === 0;
                    const groupEnd = stepIndex % 4 === 3;

                    return (
                      <button
                        key={stepIndex}
                        onClick={() => handleStepToggle(pattern.id, stepIndex)}
                        onMouseEnter={() =>
                          setHoveredStep({ patternId: pattern.id, stepIndex })
                        }
                        onMouseLeave={() => setHoveredStep(null)}
                        className={`
                          relative h-9 sm:h-10 rounded-md transition-all duration-150
                          border cursor-pointer select-none
                          ${
                            active
                              ? "shadow-md"
                              : "border-[#2a3347] hover:border-[#3d4a63]"
                          }
                          ${
                            isCurrentStep
                              ? "ring-1 ring-indigo-400 ring-offset-1 ring-offset-[#111318] z-10"
                              : ""
                          }
                          ${
                            groupStart && !groupEnd
                              ? "mr-0 sm:mr-0.5"
                              : ""
                          }
                          ${
                            active
                              ? isCurrentStep
                                ? "bg-indigo-500/80 border-indigo-400"
                                : isMuted
                                ? "bg-gray-600/40 border-gray-500/40"
                                : "border-current"
                                : "bg-[#111318] hover:bg-[#1a1f2b]"
                          }
                          active:scale-95
                        `}
                        style={
                          active && !isMuted
                            ? {
                                backgroundColor: `color-mix(in srgb, ${track.color} ${70 + s.velocity * 30}%, transparent)`,
                                borderColor: `color-mix(in srgb, ${track.color} ${80 + s.velocity * 20}%, transparent)`,
                                boxShadow: `0 0 12px color-mix(in srgb, ${track.color} ${40 + s.velocity * 30}%, transparent)`,
                              }
                            : undefined
                        }
                      >
                        {/* Inner glow for active steps */}
                        {active && !isMuted && (
                          <div
                            className="absolute inset-0 rounded-md pointer-events-none"
                            style={{
                              background: `linear-gradient(to bottom, rgba(255,255,255,${s.velocity * 0.15}), transparent 60%)`,
                            }}
                          />
                        )}

                        {/* Playhead highlight */}
                        {isCurrentStep && active && (
                          <div className="absolute inset-0 rounded-md bg-white/10 pointer-events-none animate-pulse" />
                        )}

                        {/* Hover velocity slider */}
                        {isHovered && active && (
                          <div
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 
                                        bg-[#1a1f2b] border border-[#3d4a63] rounded-lg px-2 py-1.5 
                                        shadow-xl shadow-black/40 flex items-center gap-1.5 pointer-events-none"
                          >
                            <span className="text-[8px] text-gray-400 font-mono tabular-nums">
                              {Math.round(s.velocity * 100)}%
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={s.velocity}
                              onChange={(e) =>
                                handleVelocityChange(
                                  pattern.id,
                                  stepIndex,
                                  parseFloat(e.target.value)
                                )
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="w-14 h-1 accent-indigo-400 cursor-pointer"
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteTrack(track.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-150 text-[10px] leading-none"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── FOOTER ───────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-1.5 border-t border-[#2a3347] bg-[#161a21]/50">
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-gray-600 font-mono">
          <span>STEP 1/16</span>
          <span>BEAT {Math.floor(currentBeat) + 1}</span>
          <span>
            {isPlaying ? (
              <span className="text-red-400 animate-pulse">● REC</span>
            ) : (
              <span className="text-gray-600">■ STOP</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

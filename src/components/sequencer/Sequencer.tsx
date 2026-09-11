import { useCallback } from "react";
import { useProjectStore } from "../../stores/projectStore";

interface SequencerProps {
  currentBeat: number;
  isPlaying: boolean;
}

export default function Sequencer({ currentBeat, isPlaying }: SequencerProps) {
  const { currentProject, updatePattern } = useProjectStore();
  const drumTracks = currentProject?.tracks.filter((t) => t.type === "drums") ?? [];

  const getPatternForTrack = useCallback(
    (track: typeof drumTracks[0]) => {
      if (!currentProject) return null;
      const patternClip = track.clips.find((c) => c.sourceType === "pattern");
      if (!patternClip) return null;
      return currentProject.patterns.find((p) => p.id === patternClip.sourceId) ?? null;
    },
    [currentProject]
  );

  const handleStepToggle = useCallback(
    (patternId: string, stepIndex: number) => {
      const pattern = currentProject?.patterns.find((p) => p.id === patternId);
      if (!pattern) return;
      const steps = [...pattern.steps];
      const step = steps[stepIndex];
      steps[stepIndex] = { ...step, active: !step.active };
      updatePattern(pattern.id, { steps });
    },
    [currentProject, updatePattern]
  );

  const handleVelocityChange = useCallback(
    (patternId: string, stepIndex: number, velocity: number) => {
      const pattern = currentProject?.patterns.find((p) => p.id === patternId);
      if (!pattern) return;
      const steps = [...pattern.steps];
      steps[stepIndex] = { ...steps[stepIndex], velocity };
      updatePattern(pattern.id, { steps });
    },
    [currentProject, updatePattern]
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
  }, [currentProject, drumTracks.length]);

  if (!currentProject) {
    return <div className="flex items-center justify-center h-full text-gray-400">Nessun progetto disponibile</div>;
  }

  const totalSteps = 16;
  const currentStepIndex = Math.floor(currentBeat) % totalSteps;

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/50">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-white">Step Sequencer</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {drumTracks.length} tracce • {totalSteps} passi
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddDrumTrack}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-150 text-xs sm:text-sm font-medium"
            >
              + Traccia
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-150 text-xs sm:text-sm font-medium"
            >
              Cancella
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {drumTracks.length === 0 && (
          <div className="text-center py-8 text-gray-400 mb-4">
            Crea una traccia di tipo "drums" per iniziare
          </div>
        )}

        <div className="space-y-1.5 sm:space-y-2">
          {drumTracks.map((track) => {
            const pattern = getPatternForTrack(track);
            if (!pattern) return null;

            const steps = pattern.steps;
            const isCurrentTrack = isPlaying;

            return (
              <div
                key={track.id}
                className={`flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg transition-all duration-150 ${
                  isCurrentTrack ? "bg-gray-800/80 shadow-lg" : ""
                }`}
              >
                <div className="w-20 sm:w-24 text-[10px] sm:text-xs text-gray-300 font-medium flex-shrink-0 truncate">
                  {track.name}
                </div>
                <div className="flex gap-1 sm:gap-1.5 flex-1">
                  {Array.from({ length: totalSteps }, (_, stepIndex) => {
                    const s = steps[stepIndex];
                    const active = s.active;
                    const isCurrentStep = stepIndex === currentStepIndex;

                    return (
                      <button
                        key={stepIndex}
                        onClick={() => handleStepToggle(pattern.id, stepIndex)}
                        className={`h-8 sm:h-10 flex-1 rounded border transition-all duration-150 relative group ${
                          active
                            ? "bg-blue-500 border-blue-400 shadow-md shadow-blue-500/20"
                            : "bg-gray-700 border-gray-600 hover:border-gray-500"
                        } ${isCurrentStep ? "ring-1 ring-yellow-400 ring-offset-1 ring-offset-gray-900" : ""}`}
                      >
                        <div className="h-full flex items-center justify-center">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={s.velocity}
                            onChange={(e) => handleVelocityChange(pattern.id, stepIndex, parseFloat(e.target.value))}
                            className="w-4 sm:w-6 h-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {active && (
                          <div
                            className="absolute inset-0 rounded bg-gradient-to-t from-transparent to-white/10 pointer-events-none"
                            style={{ opacity: s.velocity }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

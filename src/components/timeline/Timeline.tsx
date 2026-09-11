import { useProjectStore } from "../../stores/projectStore";
import type { Track, Clip } from "../../types";

interface TimelineProps {
  currentBeat: number;
  isPlaying: boolean;
}

export default function Timeline({ currentBeat, isPlaying }: TimelineProps) {
  const { currentProject, selectedTrackId, setSelectedTrack } = useProjectStore();
  const tracks = currentProject?.tracks ?? [];
  const totalBeats = (currentProject?.durationBars ?? 4) * 4;

  if (!currentProject) {
    return <div className="flex items-center justify-center h-full text-gray-400">Carica un progetto per iniziare</div>;
  }

  const getClipColor = (clip: Clip, track: Track): string => {
    if (clip.sourceType === "pattern") return track.color;
    if (clip.sourceType === "midi") return "#3b82f6";
    return "#8b5cf6";
  };

  const getClipLabel = (clip: Clip): string => {
    if (clip.sourceType === "pattern") return "Pattern";
    if (clip.sourceType === "midi") return "MIDI";
    return "Audio";
  };

  const playheadPosition = totalBeats > 0 ? (currentBeat % totalBeats) / totalBeats : 0;

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/50">
        <h2 className="text-lg font-semibold text-white">Timeline</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {totalBeats} beats • {currentProject.durationBars} barre
        </p>
      </div>

      <div className="flex-1 overflow-auto relative">
        <div className="min-w-max">
          <div className="flex border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
            <div className="w-40 sm:w-48 min-w-[160px] sm:min-w-[192px] px-3 sm:px-4 py-2 font-semibold text-gray-300 border-r border-gray-700 text-xs sm:text-sm">
              Traccia
            </div>
            <div className="flex-1 relative h-8">
              {Array.from({ length: totalBeats }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-gray-700"
                  style={{ left: `${(i / totalBeats) * 100}%` }}
                >
                  {i % 4 === 0 && (
                    <span className="text-[10px] sm:text-xs text-gray-500 px-1">{i / 4 + 1}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {tracks.map((track) => (
            <div
              key={track.id}
              className={`flex border-b border-gray-700 hover:bg-gray-800/50 transition-colors ${
                selectedTrackId === track.id ? "bg-gray-800" : ""
              }`}
              onClick={() => setSelectedTrack(track.id)}
            >
              <div className="w-40 sm:w-48 min-w-[160px] sm:min-w-[192px] px-3 sm:px-4 py-2.5 sm:py-3 border-r border-gray-700 flex items-center gap-2 sm:gap-3">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: track.color }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-xs sm:text-sm truncate">{track.name}</div>
                  <div className="text-[10px] sm:text-xs text-gray-400 capitalize">{track.type}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${track.muted ? "bg-red-600 text-white" : "bg-gray-700 text-gray-400"}`}>
                    M
                  </span>
                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${track.solo ? "bg-yellow-600 text-white" : "bg-gray-700 text-gray-400"}`}>
                    S
                  </span>
                </div>
              </div>

              <div className="flex-1 relative h-14 sm:h-16">
                {track.clips.map((clip) => (
                  <div
                    key={clip.id}
                    className="absolute top-1 bottom-1 rounded-md cursor-move hover:opacity-80 transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      left: `${(clip.startBeat / totalBeats) * 100}%`,
                      width: `${Math.max((clip.durationBeats / totalBeats) * 100, 2)}%`,
                      backgroundColor: getClipColor(clip, track),
                    }}
                    title={`${getClipLabel(clip)} - ${clip.durationBeats.toFixed(2)} beats`}
                  >
                    <div className="px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs text-white font-medium truncate">
                      {getClipLabel(clip)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {isPlaying && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-30 shadow-lg shadow-red-500/50"
            style={{ left: `calc(${playheadPosition * 100}% + 160px)` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-500 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}

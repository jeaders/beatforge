import { useMemo } from "react";
import { useProjectStore } from "../stores/projectStore";
import type { Track, Clip } from "../types";

export default function Arrangement() {
  const { currentProject } = useProjectStore();
  const tracks = currentProject?.tracks ?? [];

  const totalBeats = useMemo(() => (currentProject?.durationBars ?? 4) * 4, [currentProject?.durationBars]);

  if (!currentProject) {
    return <div className="flex items-center justify-center h-full text-[#7c869a]">Carica un progetto</div>;
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="text-lg font-semibold text-white">Arrangement</h2>
          <p className="text-xs text-[#7c869a] mt-0.5">Visuale timeline del progetto</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="min-w-[600px]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-48 flex-shrink-0" />
            <div className="flex-1 flex">
              {Array.from({ length: totalBeats }, (_, i) => (
                <div key={i} className={`flex-1 text-center text-[10px] text-[#7c869a] ${i % 4 === 0 ? "font-bold text-white" : ""}`}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {tracks.map((track: Track) => (
            <div key={track.id} className="flex items-center gap-4 mb-2">
              <div className="w-48 flex-shrink-0 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: track.color }} />
                <span className="text-sm text-white truncate">{track.name}</span>
              </div>
              <div className="flex-1 h-12 bg-[#111318] rounded-lg relative border border-[#2a3347]">
                {track.clips.map((clip: Clip) => {
                  const left = (clip.startBeat / totalBeats) * 100;
                  const width = Math.max((clip.durationBeats / totalBeats) * 100, 1);
                  return (
                    <div
                      key={clip.id}
                      className="absolute top-1 bottom-1 rounded-md border border-white/10"
                      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: track.color }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

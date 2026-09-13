import { useMemo } from "react";
import { useProjectStore } from "../stores/projectStore";

export type AutomationPoint = { beat: number; value: number };

export default function Automation() {
  const { currentProject, updateProject } = useProjectStore();
  const automation = (currentProject as any)?.automation as AutomationPoint[] | undefined;
  const points = useMemo(() => automation ?? [], [automation]);

  const totalBeats = useMemo(() => (currentProject?.durationBars ?? 4) * 4, [currentProject?.durationBars]);

  if (!currentProject) {
    return <div className="flex items-center justify-center h-full text-[#7c869a]">Carica un progetto</div>;
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const beat = (x / rect.width) * totalBeats;
    const value = 1 - Math.max(0, Math.min(1, y / rect.height));
    const newPoint = { beat, value };
    const next = [...points, newPoint].sort((a, b) => a.beat - b.beat);
    (updateProject as any)({ automation: next });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="text-lg font-semibold text-white">Automation</h2>
          <p className="text-xs text-[#7c869a] mt-0.5">Clicca per aggiungere punti di automazione</p>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div
          className="w-full h-64 bg-[#111318] rounded-lg border border-[#2a3347] relative overflow-hidden cursor-crosshair"
          onClick={handleCanvasClick}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#1f2637] to-transparent opacity-30" />

          {points.map((point, index) => (
            <div
              key={index}
              className="absolute w-2 h-2 bg-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-cyan-500/50"
              style={{ left: `${(point.beat / totalBeats) * 100}%`, top: `${(1 - point.value) * 100}%` }}
            />
          ))}

          {points.length > 1 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <polyline
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                points={points.map((p) => `${(p.beat / totalBeats) * 100},${(1 - p.value) * 100}`).join(" ")}
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

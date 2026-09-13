import { useState, useMemo } from "react";

const INSTRUMENTS = [
  { name: "Kick 808", category: "Drums", color: "#ef4444", key: "C2", type: "drums" },
  { name: "Snare 808", category: "Drums", color: "#f97316", key: "D2", type: "drums" },
  { name: "Hi-Hat Closed", category: "Drums", color: "#eab308", key: "E2", type: "drums" },
  { name: "Hi-Hat Open", category: "Drums", color: "#facc15", key: "F2", type: "drums" },
  { name: "Clap", category: "Drums", color: "#22c55e", key: "G2", type: "drums" },
  { name: "Tom High", category: "Drums", color: "#06b6d4", key: "A2", type: "drums" },
  { name: "Tom Low", category: "Drums", color: "#3b82f6", key: "B2", type: "drums" },
  { name: "Rim", category: "Drums", color: "#a855f7", key: "C3", type: "drums" },
  { name: "Cowbell", category: "Drums", color: "#f472b6", key: "D3", type: "drums" },
  { name: "Bass", category: "Synth", color: "#3b82f6", key: "C2", type: "synth" },
  { name: "Lead", category: "Synth", color: "#10b981", key: "C4", type: "synth" },
  { name: "Pad", category: "Synth", color: "#f59e0b", key: "C4", type: "synth" },
  { name: "Piano", category: "Synth", color: "#6366f1", key: "C4", type: "synth" },
  { name: "Pluck", category: "Synth", color: "#ec4899", key: "C4", type: "synth" },
  { name: "Vox Male", category: "Vocal", color: "#f97316", key: "C3", type: "vocal" },
  { name: "Vox Female", category: "Vocal", color: "#fb923c", key: "C4", type: "vocal" },
];

const CATEGORIES = ["All", "Drums", "Synth", "Vocal"];

export default function Browser({ onAddTrack }: { onAddTrack: (track: { name: string; type: string; color: string }) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return INSTRUMENTS.filter((item) => {
      const matchesQuery = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      const matchesCategory = category === "All" || item.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="text-lg font-semibold text-white">Browser</h2>
          <p className="text-xs text-[#7c869a] mt-0.5">Scegli strumenti e suoni per il tuo progetto</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Cerca suoni..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  category === cat ? "bg-cyan-600 text-white" : "bg-[#1c2130] text-[#7c869a] hover:bg-[#232a3b]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((item) => (
            <button
              key={item.name}
              onClick={() => onAddTrack({ name: item.name, type: item.type, color: item.color })}
              className="card flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: item.color }}
              >
                {item.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-white">{item.name}</div>
                <div className="text-[11px] text-[#7c869a]">{item.category}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

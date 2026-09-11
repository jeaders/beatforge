import { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Project } from "../types";
import { useProjectStore } from "../stores/projectStore";
import { db } from "../db";

interface ProjectManagerProps {
  onSelect: (project: Project) => void;
}

const KEY_OPTIONS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALE_OPTIONS = [
  "major",
  "minor",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "locrian",
  "pentatonic_major",
  "pentatonic_minor",
  "blues",
  "harmonic_minor",
  "melodic_minor",
];

const PROJECT_COLORS = [
  "#22d3ee", "#818cf8", "#f472b6", "#34d399", "#facc15", "#fb923c", "#a855f7", "#f87171",
];

function getProjectColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

export default function ProjectManager({ onSelect }: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectBpm, setNewProjectBpm] = useState(120);
  const [newProjectKey, setNewProjectKey] = useState("C");
  const [newProjectScale, setNewProjectScale] = useState("major");
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadProjects();
    const t = setTimeout(() => setIsLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  const loadProjects = async () => {
    const allProjects = await db.projects.toArray();
    allProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(allProjects);
  };

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    const project = useProjectStore.getState().createProject(newProjectName.trim(), newProjectBpm);
    project.key = newProjectKey;
    project.scale = newProjectScale;
    await db.projects.put(project);
    setNewProjectName("");
    await loadProjects();
    onSelect(project);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Sei sicuro di voler eliminare questo progetto?")) return;
    await db.projects.delete(id);
    useProjectStore.getState().deleteProject(id);
    await loadProjects();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const project = JSON.parse(event.target?.result as string) as Project;
        project.id = uuidv4();
        project.createdAt = new Date().toISOString();
        project.updatedAt = new Date().toISOString();
        await db.projects.put(project);
        await loadProjects();
        onSelect(project);
      } catch (error) {
        alert("File progetto non valido");
      }
    };
    reader.readAsText(file);
  };

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, searchQuery]);

  return (
    <div className="panel">
      <div
        className={`w-full max-w-5xl mx-auto transition-all duration-500 ${
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* Hero header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mb-4 shadow-lg"
            style={{
              background: "linear-gradient(135deg, #22d3ee, #818cf8)",
              boxShadow: "0 20px 40px rgba(34,211,238,0.25)",
            }}
          >
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2 sm:mb-3 tracking-tight">
            BeatForge <span className="gradient-text">Personal</span>
          </h1>
          <p className="text-[#7c869a] text-sm sm:text-base">Crea beat, arrangiamenti e demo vocali nel browser</p>
        </div>

        {/* New project */}
        <div className="glass-strong rounded-2xl p-4 sm:p-5 mb-4 sm:mb-5">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Nuovo Progetto</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Nome progetto..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={newProjectBpm}
                onChange={(e) => setNewProjectBpm(Number(e.target.value))}
                min="40"
                max="300"
                className="w-20"
              />
              <select
                value={newProjectKey}
                onChange={(e) => setNewProjectKey(e.target.value)}
                className="bg-[#1c2130] text-white rounded-lg border border-[#2a3347] focus:border-cyan-400 focus:outline-none text-sm"
              >
                {KEY_OPTIONS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <select
                value={newProjectScale}
                onChange={(e) => setNewProjectScale(e.target.value)}
                className="bg-[#1c2130] text-white rounded-lg border border-[#2a3347] focus:border-cyan-400 focus:outline-none text-sm"
              >
                {SCALE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCreate}
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-lg hover:from-cyan-700 hover:to-indigo-700 transition-all duration-150 text-sm font-medium shadow-lg shadow-cyan-900/20 whitespace-nowrap active:scale-95"
            >
              Crea
            </button>
          </div>
        </div>

        {/* Recent projects */}
        <div className="glass rounded-2xl p-4 sm:p-5 mb-4 sm:mb-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">Progetti Recenti</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Cerca progetto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 sm:flex-none sm:w-48 text-sm"
              />
              <label className="px-3 py-1.5 bg-[#1c2130] text-white rounded-lg hover:bg-[#232a3b] cursor-pointer transition-all duration-150 text-xs sm:text-sm font-medium whitespace-nowrap active:scale-95">
                Importa
                <input type="file" accept=".beatforge.json" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-10 sm:py-14">
              <div className="text-4xl sm:text-5xl mb-3">🎵</div>
              <p className="text-[#7c869a] text-sm sm:text-base">
                {projects.length === 0 ? "Nessun progetto. Crea il tuo primo progetto!" : "Nessun progetto trovato"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredProjects.map((project, index) => {
                const color = getProjectColor(project.id);
                const updated = new Date(project.updatedAt);
                const dateStr = updated.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
                const timeStr = updated.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

                return (
                  <div
                    key={project.id}
                    onClick={() => onSelect(project)}
                    className="group relative glass rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-1 self-stretch min-h-[40px] rounded-full flex-shrink-0"
                          style={{ backgroundColor: color, boxShadow: `0 0 14px ${color}40` }}
                        />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-white text-sm truncate">{project.name}</h3>
                          <p className="text-[11px] text-[#7c869a] mt-1">
                            {project.bpm} BPM • {project.tracks.length} tracce
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(project.id, e)}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-2 py-1 text-red-400 hover:text-red-300 text-xs"
                        title="Elimina"
                      >
                        Elimina
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-[#7c869a]">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border"
                          style={{
                            borderColor: `${color}40`,
                            color,
                            background: `${color}15`,
                          }}
                        >
                          {project.key} {project.scale.replace(/_/g, " ")}
                        </span>
                        <span>{project.durationBars} barre</span>
                      </div>
                      <span>{dateStr} {timeStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-center text-[#7c869a] text-xs sm:text-sm">
          <p>BeatForge Personal - PWA Offline-First</p>
          <p className="mt-1">Funziona completamente nel browser senza account</p>
        </div>
      </div>
    </div>
  );
}

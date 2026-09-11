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
        className={`w-full max-w-3xl mx-auto transition-all duration-500 ${
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-cyan-500/30">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2 sm:mb-3 gradient-text">
            BeatForge Personal
          </h1>
          <p className="text-[#7c869a] text-sm sm:text-base">Crea beat, arrangiamenti e demo vocali nel browser</p>
        </div>

        <div className="card mb-4 sm:mb-6">
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
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-lg hover:from-cyan-700 hover:to-indigo-700 transition-all duration-150 text-sm font-medium shadow-lg shadow-cyan-900/20 whitespace-nowrap"
            >
              Crea
            </button>
          </div>
        </div>

        <div className="card mb-4 sm:mb-6">
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
              <label className="px-3 py-1.5 bg-[#1c2130] text-white rounded-lg hover:bg-[#232a3b] cursor-pointer transition-all duration-150 text-xs sm:text-sm font-medium whitespace-nowrap">
                Importa
                <input type="file" accept=".beatforge.json" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-4xl sm:text-5xl mb-3">🎵</div>
              <p className="text-[#7c869a] text-sm sm:text-base">
                {projects.length === 0 ? "Nessun progetto. Crea il tuo primo progetto!" : "Nessun progetto trovato"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProjects.map((project, index) => (
                <div
                  key={project.id}
                  onClick={() => onSelect(project)}
                  className="flex items-center justify-between p-3 sm:p-4 bg-[#161a21] rounded-lg hover:bg-[#1c2130] cursor-pointer transition-all duration-150 hover:scale-[1.01] border border-transparent hover:border-[#2a3347]"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white text-sm sm:text-base truncate">{project.name}</h3>
                    <div className="text-xs text-[#7c869a] mt-1">
                      <span>BPM: {project.bpm}</span>
                      <span className="mx-1.5 sm:mx-2">•</span>
                      <span>{project.tracks.length} tracce</span>
                      <span className="mx-1.5 sm:mx-2">•</span>
                      <span className="truncate">{new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    className="px-2 sm:px-3 py-1 text-red-400 hover:text-red-300 transition-colors text-xs sm:text-sm flex-shrink-0 ml-2"
                  >
                    Elimina
                  </button>
                </div>
              ))}
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

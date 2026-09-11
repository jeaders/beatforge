import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { Project, Track, Clip, Pattern, Effect, MasterChannel } from "../types";

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  isPlaying: boolean;
  currentBeat: number;
  selectedTrackId: string | null;
  metronomeEnabled: boolean;
  quantizeEnabled: boolean;
  quantizeValue: number;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;

  createProject: (name: string, bpm?: number) => Project;
  loadProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  updateProject: (updates: Partial<Project>) => void;
  setCurrentProject: (project: Project | null) => void;

  addTrack: (track: Omit<Track, "id">) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  deleteTrack: (id: string) => void;

  addClip: (trackId: string, clip: Omit<Clip, "id">) => void;
  updateClip: (trackId: string, clipId: string, updates: Partial<Clip>) => void;
  deleteClip: (trackId: string, clipId: string) => void;

  addPattern: (pattern: Omit<Pattern, "id">) => void;
  updatePattern: (id: string, updates: Partial<Pattern>) => void;
  deletePattern: (id: string) => void;

  togglePlay: () => void;
  stopPlayback: () => void;
  setCurrentBeat: (beat: number) => void;
  setSelectedTrack: (id: string | null) => void;
  setMetronome: (enabled: boolean) => void;
  setQuantize: (enabled: boolean, value?: number) => void;
  setLoop: (enabled: boolean, start?: number, end?: number) => void;

  addEffect: (trackId: string, effect: Omit<Effect, "id">) => void;
  updateEffect: (trackId: string, effectId: string, updates: Partial<Effect>) => void;
  removeEffect: (trackId: string, effectId: string) => void;
}

const createDefaultTrack = (name: string, type: Track["type"], color: string): Track => ({
  id: uuidv4(),
  name,
  type,
  color,
  muted: false,
  solo: false,
  volume: 0.8,
  pan: 0,
  effects: [],
  clips: [],
});

const createDefaultMaster = (): MasterChannel => ({
  volume: 0.8,
  effects: [],
});

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  isPlaying: false,
  currentBeat: 0,
  selectedTrackId: null,
  metronomeEnabled: false,
  quantizeEnabled: true,
  quantizeValue: 4,
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 16,

  createProject: (name, bpm = 120) => {
    const kickPatternId = uuidv4();
    const snarePatternId = uuidv4();
    const hihatPatternId = uuidv4();
    const clapPatternId = uuidv4();
    
    const project: Project = {
      id: uuidv4(),
      name,
      bpm,
      key: "C",
      scale: "major",
      durationBars: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tracks: [
        {
          ...createDefaultTrack("Kick 808", "drums", "#ef4444"),
          clips: [{ id: uuidv4(), startBeat: 0, durationBeats: 4, sourceType: "pattern", sourceId: kickPatternId, gain: 0.8, fadeIn: 0, fadeOut: 0 }],
        },
        {
          ...createDefaultTrack("Snare 808", "drums", "#f97316"),
          clips: [{ id: uuidv4(), startBeat: 0, durationBeats: 4, sourceType: "pattern", sourceId: snarePatternId, gain: 0.8, fadeIn: 0, fadeOut: 0 }],
        },
        {
          ...createDefaultTrack("Hi-Hat 808", "drums", "#eab308"),
          clips: [{ id: uuidv4(), startBeat: 0, durationBeats: 4, sourceType: "pattern", sourceId: hihatPatternId, gain: 0.8, fadeIn: 0, fadeOut: 0 }],
        },
        {
          ...createDefaultTrack("Clap 808", "drums", "#22c55e"),
          clips: [{ id: uuidv4(), startBeat: 0, durationBeats: 4, sourceType: "pattern", sourceId: clapPatternId, gain: 0.8, fadeIn: 0, fadeOut: 0 }],
        },
        createDefaultTrack("Bass", "synth", "#3b82f6"),
        createDefaultTrack("Chords", "synth", "#10b981"),
        createDefaultTrack("Voce", "vocal", "#f59e0b"),
      ],
      patterns: [
        {
          id: kickPatternId,
          name: "Kick Pattern",
          steps: Array.from({ length: 16 }, (_, i) => ({
            step: i,
            active: i % 4 === 0,
            velocity: 1,
          })),
          notes: [],
        },
        {
          id: snarePatternId,
          name: "Snare Pattern",
          steps: Array.from({ length: 16 }, (_, i) => ({
            step: i,
            active: i === 4 || i === 12,
            velocity: 0.9,
          })),
          notes: [],
        },
        {
          id: hihatPatternId,
          name: "Hi-Hat Pattern",
          steps: Array.from({ length: 16 }, (_, i) => ({
            step: i,
            active: i % 2 === 0,
            velocity: 0.6,
          })),
          notes: [],
        },
        {
          id: clapPatternId,
          name: "Clap Pattern",
          steps: Array.from({ length: 16 }, (_, i) => ({
            step: i,
            active: i === 4 || i === 12,
            velocity: 0.8,
          })),
          notes: [],
        },
      ],
      master: createDefaultMaster(),
      loopEnabled: false,
      loopStart: 0,
      loopEnd: 16,
    };
    set((state) => ({
      projects: [...state.projects, project],
      currentProject: project,
    }));
    return project;
  },

  loadProject: (project) => {
    set({ currentProject: project });
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
  },

  updateProject: (updates) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const updated = { ...currentProject, ...updates, updatedAt: new Date().toISOString() };
    set({ currentProject: updated });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  addTrack: (trackData) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const track: Track = { ...trackData, id: uuidv4() };
    const updated = {
      ...currentProject,
      tracks: [...currentProject.tracks, track],
      updatedAt: new Date().toISOString(),
    };
    set({ currentProject: updated });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },

  updateTrack: (id, updates) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      tracks: currentProject.tracks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      updatedAt: new Date().toISOString(),
    };
    set({ currentProject: updated });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },

  deleteTrack: (id) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      tracks: currentProject.tracks.filter((t) => t.id !== id),
      updatedAt: new Date().toISOString(),
    };
    set({ currentProject: updated });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },

  addClip: (trackId, clipData) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const clip: Clip = { ...clipData, id: uuidv4() };
    const updated = {
      ...currentProject,
      tracks: currentProject.tracks.map((t) =>
        t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
      ),
      updatedAt: new Date().toISOString(),
    };
    set({ currentProject: updated });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },

  updateClip: (trackId, clipId, updates) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      tracks: currentProject.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
            }
          : t
      ),
      updatedAt: new Date().toISOString(),
    };
    set({ currentProject: updated });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },

  deleteClip: (trackId, clipId) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      tracks: currentProject.tracks.map((t) =>
        t.id === trackId ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) } : t
      ),
      updatedAt: new Date().toISOString(),
    };
    set({ currentProject: updated });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },

  addPattern: (patternData) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const pattern: Pattern = { ...patternData, id: uuidv4() };
    const updated = {
      ...currentProject,
      patterns: [...currentProject.patterns, pattern],
      updatedAt: new Date().toISOString(),
    };
    set({ currentProject: updated });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },

  updatePattern: (id, updates) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      patterns: currentProject.patterns.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      updatedAt: new Date().toISOString(),
    };
    set({ currentProject: updated });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },

  deletePattern: (id) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      patterns: currentProject.patterns.filter((p) => p.id !== id),
      updatedAt: new Date().toISOString(),
    };
    set({ currentProject: updated });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  stopPlayback: () => set({ isPlaying: false, currentBeat: 0 }),
  setCurrentBeat: (beat) => set({ currentBeat: beat }),
  setSelectedTrack: (id) => set({ selectedTrackId: id }),
  setMetronome: (enabled) => set({ metronomeEnabled: enabled }),
  setQuantize: (enabled, value) =>
    set({ quantizeEnabled: enabled, quantizeValue: value ?? get().quantizeValue }),
  setLoop: (enabled, start, end) =>
    set({
      loopEnabled: enabled,
      loopStart: start ?? get().loopStart,
      loopEnd: end ?? get().loopEnd,
    }),

  addEffect: (trackId, effectData) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const effect: Effect = { ...effectData, id: uuidv4() };
    const updated = {
      ...currentProject,
      tracks: currentProject.tracks.map((t) =>
        t.id === trackId ? { ...t, effects: [...t.effects, effect] } : t
      ),
      updatedAt: new Date().toISOString(),
    };
    set({ currentProject: updated });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },

  updateEffect: (trackId, effectId, updates) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      tracks: currentProject.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              effects: t.effects.map((e) => (e.id === effectId ? { ...e, ...updates } : e)),
            }
          : t
      ),
      updatedAt: new Date().toISOString(),
    };
    set({ currentProject: updated });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },

  removeEffect: (trackId, effectId) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      tracks: currentProject.tracks.map((t) =>
        t.id === trackId ? { ...t, effects: t.effects.filter((e) => e.id !== effectId) } : t
      ),
      updatedAt: new Date().toISOString(),
    };
    set({ currentProject: updated });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },
}));

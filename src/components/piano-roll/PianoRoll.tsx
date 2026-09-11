import { useState, useCallback, useRef, useEffect } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { audioEngine } from "../../audio/engine";
import type { Clip } from "../../types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const PITCH_TO_MIDI: Record<string, number> = {
  C: 60, "C#": 61, D: 62, "D#": 63, E: 64, F: 65, "F#": 66, G: 67, "G#": 68, A: 69, "A#": 70, B: 71,
};
const TOTAL_NOTES = 36;
const START_OCTAVE = 3;

interface PianoRollProps {
  currentBeat: number;
  isPlaying: boolean;
}

export default function PianoRoll({ currentBeat, isPlaying }: PianoRollProps) {
  const { currentProject, selectedTrackId, setSelectedTrack, addClip, updateClip, deleteClip } = useProjectStore();
  const tracks = currentProject?.tracks.filter((t) => t.type === "synth" || t.type === "sampler") ?? [];
  const selectedTrack = tracks.find((t) => t.id === selectedTrackId) ?? tracks[0];
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<{ id: string; mode: "move" | "resize" } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; beat: number; duration: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState(true);
  const [snapValue, setSnapValue] = useState(0.25);

  const totalBeats = (currentProject?.durationBars ?? 4) * 4;
  const notesPerOctave = 12;

  useEffect(() => {
    if (selectedTrack && !tracks.find((t) => t.id === selectedTrack.id)) {
      setSelectedTrack(tracks[0]?.id ?? null);
    }
  }, [tracks, selectedTrack, setSelectedTrack]);

  const getPitchFromY = useCallback((y: number, containerHeight: number): string => {
    const noteHeight = containerHeight / TOTAL_NOTES;
    const noteIndex = Math.floor(y / noteHeight);
    const octave = Math.floor((TOTAL_NOTES - 1 - noteIndex) / notesPerOctave) + START_OCTAVE;
    const noteInOctave = (TOTAL_NOTES - 1 - noteIndex) % notesPerOctave;
    const noteName = NOTE_NAMES[noteInOctave];
    return `${noteName}${octave}`;
  }, []);

  const getBeatFromX = useCallback((x: number, containerWidth: number): number => {
    return (x / containerWidth) * totalBeats;
  }, [totalBeats]);

  const snapBeat = useCallback((beat: number): number => {
    if (!snap) return beat;
    return Math.round(beat / snapValue) * snapValue;
  }, [snap, snapValue]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!selectedTrack || !containerRef.current || isDragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pitch = getPitchFromY(y, rect.height);
    const beat = snapBeat(getBeatFromX(x, rect.width));
    const midiPitch = PITCH_TO_MIDI[pitch] ?? 60;

    const existingClip = selectedTrack.clips.find(
      (clip: Clip) =>
        clip.sourceType === "midi" &&
        clip.sourceId === selectedTrack.id &&
        Math.abs(clip.startBeat - beat) < 0.1 &&
        PITCH_TO_MIDI[clip.sourceId] === midiPitch
    );

    if (existingClip) {
      deleteClip(selectedTrack.id, existingClip.id);
    } else {
      addClip(selectedTrack.id, {
        startBeat: beat,
        durationBeats: snapValue,
        sourceType: "midi",
        sourceId: selectedTrack.id,
        gain: 0.8,
        fadeIn: 0,
        fadeOut: 0,
      });
      audioEngine.triggerNote(selectedTrack.id, pitch, "8n", 0.8);
    }
  }, [selectedTrack, getPitchFromY, getBeatFromX, addClip, deleteClip, snapBeat, isDragging]);

  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY, beat: 0, duration: 0 });
      setDragTarget(null);
    }
  }, []);

  const handleNoteMouseDown = useCallback((clipId: string) => (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!selectedTrack || !containerRef.current) return;
    const clip = selectedTrack.clips.find((c) => c.id === clipId);
    if (!clip) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isResize = x > rect.width * ((clip.startBeat + clip.durationBeats) / totalBeats) - 8;
    setDragTarget({ id: clip.id, mode: isResize ? "resize" : "move" });
    setDragStart({ x: e.clientX, y: e.clientY, beat: clip.startBeat, duration: clip.durationBeats });
    setIsDragging(true);
  }, [selectedTrack, totalBeats]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragTarget || !dragStart || !selectedTrack || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const beat = getBeatFromX(x, rect.width);

    if (dragTarget.mode === "move") {
      const newStart = Math.max(0, snapBeat(beat - (dragStart.beat - getBeatFromX(dragStart.x, rect.width))));
      updateClip(selectedTrack.id, dragTarget.id, { startBeat: newStart });
    } else {
      const newDuration = Math.max(snapValue, snapBeat(beat - dragStart.beat));
      updateClip(selectedTrack.id, dragTarget.id, { durationBeats: newDuration });
    }
  }, [isDragging, dragTarget, dragStart, selectedTrack, getBeatFromX, snapBeat, snapValue, updateClip]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragTarget(null);
    setDragStart(null);
  }, []);

  if (!currentProject) {
    return <div className="flex items-center justify-center h-full text-[#7c869a]">Carica un progetto</div>;
  }

  const playheadX = totalBeats > 0 ? (currentBeat % totalBeats) / totalBeats : 0;

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="text-lg font-semibold text-white">Piano Roll</h2>
          <p className="text-xs text-[#7c869a] mt-0.5">Clicca per aggiungere note • Trascina per muovere/ridimensionare</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedTrack?.id ?? ""}
            onChange={(e) => setSelectedTrack(e.target.value)}
            className="bg-[#1c2130] text-white rounded-lg border border-[#2a3347] focus:border-cyan-400 focus:outline-none text-xs sm:text-sm px-3 py-1.5"
          >
            {tracks.map((track) => (
              <option key={track.id} value={track.id}>{track.name}</option>
            ))}
          </select>
          <select
            value={String(snapValue)}
            onChange={(e) => setSnapValue(Number(e.target.value))}
            className="bg-[#1c2130] text-white rounded-lg border border-[#2a3347] focus:border-cyan-400 focus:outline-none text-xs sm:text-sm px-3 py-1.5"
          >
            <option value="0.25">1/16</option>
            <option value="0.5">1/8</option>
            <option value="1">1/4</option>
          </select>
          <button
            onClick={() => setSnap(!snap)}
            className={`transport-btn px-3 w-auto text-xs ${snap ? "active" : ""}`}
          >
            {snap ? "Snap ON" : "Snap OFF"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-3 sm:gap-4 p-3 sm:p-4 min-h-0">
        <div className="w-16 sm:w-24 bg-[#111318] rounded-lg overflow-hidden flex-shrink-0 border border-[#2a3347]">
          {Array.from({ length: TOTAL_NOTES }, (_, i) => {
            const noteInOctave = (TOTAL_NOTES - 1 - i) % notesPerOctave;
            const noteName = NOTE_NAMES[noteInOctave];
            const isBlack = noteName.includes("#");
            const octave = Math.floor((TOTAL_NOTES - 1 - i) / notesPerOctave) + START_OCTAVE;
            return (
              <div
                key={i}
                className={`piano-key h-5 sm:h-6 ${isBlack ? "black" : "white"}`}
                onClick={() => {
                  if (selectedTrack) {
                    audioEngine.triggerNote(selectedTrack.id, `${noteName}${octave}`, "8n", 0.8);
                  }
                }}
              >
                {noteName}{octave}
              </div>
            );
          })}
        </div>

        <div
          ref={containerRef}
          className="flex-1 relative bg-[#111318] rounded-lg overflow-hidden cursor-crosshair border border-[#2a3347]"
          onClick={handleCanvasClick}
          onMouseDown={handleContainerMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {Array.from({ length: TOTAL_NOTES }, (_, i) => {
            const noteInOctave = (TOTAL_NOTES - 1 - i) % notesPerOctave;
            const isBlack = noteInOctave === 1 || noteInOctave === 3 || noteInOctave === 6 || noteInOctave === 8 || noteInOctave === 10;
            return (
              <div
                key={i}
                className={`absolute left-0 right-0 border-b ${isBlack ? "bg-[#161a21]/60" : "bg-[#111318]"}`}
                style={{ top: `${(i / TOTAL_NOTES) * 100}%`, height: `${(1 / TOTAL_NOTES) * 100}%`, borderColor: "rgba(42,51,71,0.5)" }}
              />
            );
          })}

          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: totalBeats }, (_, i) => (
              <div
                key={i}
                className={`absolute top-0 bottom-0 border-l ${i % 4 === 0 ? "border-[#2a3347]" : "border-[#1f2637]"}`}
                style={{ left: `${(i / totalBeats) * 100}%` }}
              />
            ))}
          </div>

          {selectedTrack?.clips
            .filter((clip: Clip) => clip.sourceType === "midi")
            .map((clip: Clip) => {
              const midi = PITCH_TO_MIDI[clip.sourceId] ?? 60;
              const noteIndex = TOTAL_NOTES - 1 - (midi - (START_OCTAVE * 12));
              if (noteIndex < 0 || noteIndex >= TOTAL_NOTES) return null;
              const isActive = currentBeat >= clip.startBeat && currentBeat < clip.startBeat + clip.durationBeats;
              return (
                <div
                  key={clip.id}
                  className={`note ${isActive ? "bg-cyan-500 shadow-lg shadow-cyan-500/50 scale-105" : "bg-cyan-600 hover:bg-cyan-500"}`}
                  onMouseDown={handleNoteMouseDown(clip.id) as React.MouseEventHandler<HTMLDivElement>}
                  style={{
                    left: `${(clip.startBeat / totalBeats) * 100}%`,
                    top: `${(noteIndex / TOTAL_NOTES) * 100}%`,
                    width: `${Math.max((clip.durationBeats / totalBeats) * 100, 0.8)}%`,
                    height: `${(1 / TOTAL_NOTES) * 100}%`,
                  }}
                />
              );
            })}

          {isPlaying && (
            <div
              className="playhead"
              style={{ left: `${playheadX * 100}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

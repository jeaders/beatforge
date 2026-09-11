import { useState, useEffect, useRef } from "react";
import { beatAI } from "../audio/ai";
import { useProjectStore } from "../stores/projectStore";
import type { Pattern } from "../types";

interface AIAssistantProps {
  onApplyPattern?: (pattern: Pattern) => void;
}

export default function AIAssistant({ onApplyPattern }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("AI pronta");
  const [temperature, setTemperature] = useState(1.2);
  const [bars, setBars] = useState(2);
  const initializedRef = useRef(false);

  useEffect(() => {
    beatAI.init().then(() => {
      initializedRef.current = true;
      setStatus("AI pronta");
    }).catch(() => {
      setStatus("Errore inizializzazione AI");
    });
  }, []);

  const handleGenerateBeat = async () => {
    const state = useProjectStore.getState();
    if (!state.currentProject || !initializedRef.current) return;
    setIsLoading(true);
    setStatus("Generazione beat in corso...");
    try {
      const generated = await beatAI.generateDrumPattern(bars, temperature);
      const pattern: Pattern = {
        id: generated.id,
        name: generated.name,
        steps: generated.steps,
        notes: [],
      };

      const drumTracks = state.currentProject.tracks.filter((t: any) => t.type === "drums");
      if (drumTracks.length === 0) {
        state.addTrack({
          name: "AI Drums",
          type: "drums",
          color: "#22d3ee",
          muted: false,
          solo: false,
          volume: 0.8,
          pan: 0,
          effects: [],
          clips: [
            {
              id: crypto.randomUUID(),
              startBeat: 0,
              durationBeats: bars * 4,
              sourceType: "pattern",
              sourceId: pattern.id,
              gain: 0.8,
              fadeIn: 0,
              fadeOut: 0,
            },
          ],
        });
      }

      state.addPattern(pattern);
      onApplyPattern?.(pattern);
      setStatus("Beat generato!");
      setTimeout(() => setStatus("AI pronta"), 2000);
    } catch (error) {
      console.error("AI generation error:", error);
      setStatus("Errore generazione");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-gradient-to-br from-cyan-600 to-indigo-600 rounded-full shadow-lg shadow-cyan-900/30 flex items-center justify-center text-white hover:scale-105 transition-transform"
        title="AI Assistant"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="relative w-full sm:max-w-md bg-[#111318] border border-[#2a3347] rounded-t-2xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 animate-fade-in max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm sm:text-base">AI Beat Assistant</h3>
              <p className="text-[10px] sm:text-xs text-[#7c869a]">{status}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1c2130] text-[#7c869a] hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="bg-[#1c2130] rounded-xl p-3 sm:p-4 border border-[#2a3347]">
            <label className="text-[10px] sm:text-xs text-[#7c869a] uppercase tracking-wider block mb-2">Creatività</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-white w-12 text-right">{temperature.toFixed(1)}</span>
            </div>
            <p className="text-[10px] text-[#7c869a] mt-1">Basso = più prevedibile, Alto = più creativo</p>
          </div>

          <div className="bg-[#1c2130] rounded-xl p-3 sm:p-4 border border-[#2a3347]">
            <label className="text-[10px] sm:text-xs text-[#7c869a] uppercase tracking-wider block mb-2">Lunghezza</label>
            <div className="flex items-center gap-2">
              {[1, 2, 4, 8].map((b) => (
                <button
                  key={b}
                  onClick={() => setBars(b)}
                  className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    bars === b
                      ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/20"
                      : "bg-[#111318] text-[#7c869a] hover:bg-[#232a3b]"
                  }`}
                >
                  {b} bar{b > 1 ? "e" : ""}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerateBeat}
            disabled={isLoading}
            className="w-full py-3 sm:py-4 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-indigo-700 transition-all duration-150 shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generazione...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Genera Beat AI</span>
              </>
            )}
          </button>

          <div className="text-center text-[10px] sm:text-xs text-[#7c869a]">
            Powered by Magenta.js • Gratuito • Funziona offline dopo il primo caricamento
          </div>
        </div>
      </div>
    </div>
  );
}

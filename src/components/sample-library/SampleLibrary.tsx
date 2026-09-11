import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useProjectStore } from "../../stores/projectStore";
import { db } from "../../db";
import type { AudioAsset } from "../../types";

export default function SampleLibrary() {
  const [assets, setAssets] = useState<AudioAsset[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentProject, addClip } = useProjectStore();

  const loadAssets = async () => {
    const all = await db.audioAssets.toArray();
    setAssets(all);
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setImporting(true);
    try {
      for (const file of Array.from(files)) {
        const audioContext = new AudioContext();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const asset: AudioAsset = {
          id: uuidv4(),
          name: file.name.replace(/\.[^/.]+$/, ""),
          blob: file,
          duration: audioBuffer.duration,
          createdAt: new Date().toISOString(),
        };

        await db.audioAssets.put(asset);
      }
      await loadAssets();
    } catch (error) {
      console.error("Error importing audio:", error);
      alert("Errore nell'importazione del file audio");
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddToTrack = async (asset: AudioAsset) => {
    if (!currentProject) return;
    const track = currentProject.tracks[0];
    if (!track) return;

    const durationBeats = (asset.duration * currentProject.bpm) / 60 / 4;

    addClip(track.id, {
      startBeat: 0,
      durationBeats,
      sourceType: "audio",
      sourceId: asset.id,
      gain: 0.8,
      fadeIn: 0,
      fadeOut: 0,
    });

    alert(`${asset.name} aggiunto alla traccia "${track.name}"`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo campione?")) return;
    await db.audioAssets.delete(id);
    await loadAssets();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/50">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-white">Libreria Campioni</h2>
            <p className="text-xs text-gray-400 mt-0.5">Importa e gestisci i tuoi audio</p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-150 disabled:bg-gray-600 text-xs sm:text-sm font-medium flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {importing ? "Importazione..." : "Importa"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="mb-6">
          <h3 className="text-sm sm:text-base font-medium text-white mb-3">I tuoi campioni</h3>
          {assets.length === 0 ? (
            <div className="text-center py-8 sm:py-12 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-3xl sm:text-4xl mb-2">🎵</div>
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Nessun campione importato</p>
              <p className="text-xs text-gray-500">Importa file WAV, MP3 o OGG per iniziare</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {assets.map((asset) => (
                <div key={asset.id} className="bg-gray-800 rounded-lg p-3 sm:p-4 hover:bg-gray-700 transition-all duration-150 border border-gray-700 hover:border-gray-600 hover:scale-[1.02]">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white text-xs sm:text-sm truncate">{asset.name}</h4>
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                        {asset.duration.toFixed(2)}s
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="text-red-400 hover:text-red-300 ml-2 text-sm sm:text-base"
                    >
                      ×
                    </button>
                  </div>
                  <button
                    onClick={() => handleAddToTrack(asset)}
                    className="w-full mt-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all duration-150 text-xs sm:text-sm font-medium"
                  >
                    Aggiungi a traccia
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm sm:text-base font-medium text-white mb-3">Suoni predefiniti</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {["Kick", "Snare", "Hi-Hat", "Clap", "Tom", "Rim", "Perc", "FX"].map((name) => (
              <div
                key={name}
                className="bg-gray-800 rounded-lg p-3 sm:p-4 text-center hover:bg-gray-700 transition-all duration-150 cursor-pointer border border-gray-700 hover:border-gray-600 hover:scale-105"
                onClick={() => {
                  alert(`Campione "${name}" - Aggiungi i tuoi campioni personalizzati!`);
                }}
              >
                <div className="text-2xl sm:text-3xl mb-1.5 sm:mb-2">🥁</div>
                <div className="text-xs sm:text-sm text-gray-300">{name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

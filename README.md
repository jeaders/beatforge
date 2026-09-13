# BeatForge Personal

BeatForge è un beatmaker browser-based ispirato a FL Studio: crea beat, arrangiamenti e demo vocali direttamente nel browser, senza account, senza installazione, offline-first.

## Caratteristiche

- Multi-traccia con drum machine, synth, campionatori e tracce vocali
- Channel Rack con step sequencer a 16 step, velocity, mute/solo e swing
- Piano Roll con griglia, snap, aggiunta/rimozione note e drag&drop
- Mixer con canali, pan, mute/solo, effetti insert e meter animati
- Drum Machine pads + step sequencer con pattern multipli
- Browser strumenti per aggiungere velocemente drum, synth e vocal
- Arrangement view con timeline clips
- Automation base con punti editing
- Metronomo integrato
- Registrazione audio da microfono con inserimento diretto in traccia
- Loop, BPM, tonalità e scala configurabili
- Export WAV multi-traccia renderizzato in parallelo
- PWA installabile con Service Worker e caching offline
- Salvataggio progetti in IndexedDB via Dexie
- Tema scuro professionale in stile FL Studio con interfaccia responsive

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Tone.js per l'audio engine
- Zustand per lo stato globale
- Dexie per il database locale
- vite-plugin-pwa per offline support

## Struttura

```
src/
  audio/            # AudioEngine, transport, exporter, recorder, instruments, effects
  components/       # ProjectManager, Toolbar, ChannelRack, PianoRoll, Mixer, DrumMachine, Browser, Arrangement, Automation
  db/               # Schema Dexie
  stores/           # Zustand store
  types/            # Tipi TypeScript
  App.tsx           # Root e routing vista
  main.tsx          # Entry point
```

## Avvio

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Note

- L'audio richiede interazione utente prima dell'avvio
- Browser supportati: Chrome, Edge, Firefox, Safari

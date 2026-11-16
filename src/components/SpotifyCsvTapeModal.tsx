import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  Play,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Disc3,
  Sparkles,
  Radio,
  Check,
  CheckCheck,
  Copy,
  Music2,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { parseSpotifyCsv, type ParsedSpotifyTrack } from '../services/spotifyCsvParser';
import {
  findStrictBestMatch,
  cleanTitle,
  type FailedTrackReport,
} from '../services/trackMatcher';
import { streamResolver } from '../services/streamResolver';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import type { Track } from '../types/music';

interface SpotifyCsvTapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPlaylist?: (playlistId: string) => void;
}

// Demo CSV template for instant testing
const DEMO_SPOTIFY_CSV = `Track URI,Track Name,Artist Name(s),Album Name,Duration (ms)
spotify:track:4u7EnebtmKWzUH433cf5Qv,Bohemian Rhapsody,Queen,A Night At The Opera,354320
spotify:track:2b8O0cI44dYt42k1tGkS3e,Sultans of Swing,Dire Straits,Dire Straits,348640
spotify:track:37ZJ0p5Jm13um7xPp7rZqR,Hotel California,Eagles,Hotel California,391376
spotify:track:2WfaOiMkCvy7F5fcp2PxZ8,Sweet Child O' Mine,Guns N' Roses,Appetite For Destruction,356066
spotify:track:1w8OXn3aM3Yc3H5u3eQ3yR,Back In Black,AC/DC,Back In Black,255493`;

type ModalStep = 'input' | 'preview' | 'recording' | 'complete';

export const SpotifyCsvTapeModal: React.FC<SpotifyCsvTapeModalProps> = ({
  isOpen,
  onClose,
  onOpenPlaylist,
}) => {
  const { createPlaylist, addTracksToPlaylist } = useLibrary();
  const { playTrack, setFullScreenPlayerOpen } = usePlayer();

  const [step, setStep] = useState<ModalStep>('input');
  const [inputTab, setInputTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState('');
  const [tapeName, setTapeName] = useState('Mixtape Spotify');
  const [tapeType, setTapeType] = useState<'type1' | 'type2' | 'type4'>('type2');
  const [parsedTracks, setParsedTracks] = useState<ParsedSpotifyTrack[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Tape types explanation accordion
  const [showTypeExplanation, setShowTypeExplanation] = useState(false);

  // Recording phase state
  const [recordProgress, setRecordProgress] = useState<{
    current: number;
    total: number;
    currentTitle: string;
    currentArtist: string;
    successCount: number;
    failedCount: number;
  }>({
    current: 0,
    total: 0,
    currentTitle: '',
    currentArtist: '',
    successCount: 0,
    failedCount: 0,
  });

  const [resolvedTracks, setResolvedTracks] = useState<Track[]>([]);
  const [failedTracks, setFailedTracks] = useState<FailedTrackReport[]>([]);
  const [copiedMissing, setCopiedMissing] = useState(false);
  const [createdPlaylistId, setCreatedPlaylistId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isCancelledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessParsed = (
    tracks: ParsedSpotifyTrack[],
    suggestedName: string = 'Mixtape Spotify'
  ) => {
    if (tracks.length === 0) {
      setErrorMsg('No se detectaron canciones válidas en el archivo CSV.');
      return;
    }
    setErrorMsg(null);
    setParsedTracks(tracks);
    setTapeName(suggestedName);
    setSelectedIds(new Set(tracks.map((t) => t.id)));
    setStep('preview');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = parseSpotifyCsv(text, file.name);
      handleProcessParsed(res.tracks, res.suggestedName);
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = () => {
    if (!rawText.trim()) {
      setErrorMsg('Pega el texto de tu CSV o lista de Spotify.');
      return;
    }
    const res = parseSpotifyCsv(rawText);
    handleProcessParsed(res.tracks, res.suggestedName);
  };

  const handleLoadDemo = () => {
    setRawText(DEMO_SPOTIFY_CSV);
    const res = parseSpotifyCsv(DEMO_SPOTIFY_CSV, 'Rock Clásico Spotify');
    handleProcessParsed(res.tracks, 'Cinta: Rock Clásico Spotify');
  };

  const toggleSelectTrack = (id: string) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  };

  // Start the physical 80s tape recording process with strict exact matching
  const startTapeRecording = async () => {
    const activeTracks = parsedTracks.filter((t) => selectedIds.has(t.id));
    if (activeTracks.length === 0) {
      setErrorMsg('Selecciona al menos una canción para grabar en la cinta.');
      return;
    }

    setStep('recording');
    setErrorMsg(null);
    isCancelledRef.current = false;
    const finalResolved: Track[] = [];
    const unrecordedList: FailedTrackReport[] = [];

    setRecordProgress({
      current: 0,
      total: activeTracks.length,
      currentTitle: activeTracks[0].title,
      currentArtist: activeTracks[0].artist,
      successCount: 0,
      failedCount: 0,
    });

    for (let i = 0; i < activeTracks.length; i++) {
      if (isCancelledRef.current) break;

      const spTrack = activeTracks[i];
      setRecordProgress({
        current: i + 1,
        total: activeTracks.length,
        currentTitle: spTrack.title,
        currentArtist: spTrack.artist,
        successCount: finalResolved.length,
        failedCount: unrecordedList.length,
      });

      try {
        // Query search resolver: 1st pass with "Title Artist"
        const query1 = `${spTrack.title} ${spTrack.artist}`;
        const searchMatches = await streamResolver.search(query1, 'youtube', 1);

        let matchResult = findStrictBestMatch(spTrack, searchMatches);

        // 2nd pass: if no strict match found, try "Artist Title" with cleaned title
        if (!matchResult.matchedTrack) {
          const query2 = `${spTrack.artist} ${cleanTitle(spTrack.title)}`;
          const altMatches = await streamResolver.search(query2, 'youtube', 1);
          matchResult = findStrictBestMatch(spTrack, altMatches);
        }

        if (matchResult.matchedTrack) {
          finalResolved.push(matchResult.matchedTrack);
        } else {
          // STRICT RULE: Do not import anything if no exact match is confirmed
          unrecordedList.push({
            track: spTrack,
            reason: matchResult.reason || 'Sin coincidencia exacta verificada',
          });
        }
      } catch (err) {
        console.warn(`Error buscando "${spTrack.title}":`, err);
        unrecordedList.push({
          track: spTrack,
          reason: 'Error al consultar servidores de streaming',
        });
      }

      // Small throttle to ensure smooth network pacing and retro recording physics
      await new Promise((res) => setTimeout(res, 180));
    }

    setResolvedTracks(finalResolved);
    setFailedTracks(unrecordedList);

    if (finalResolved.length > 0) {
      // 1. Create the new Cassette Tape Playlist
      const biasLabel =
        tapeType === 'type1'
          ? 'TYPE I (FERRO 120µs)'
          : tapeType === 'type4'
          ? 'TYPE IV (METAL 70µs)'
          : 'TYPE II (CHROME 70µs)';
      const tapeDescription = `Cinta grabada desde Spotify CSV (${finalResolved.length} de ${activeTracks.length} grabadas) • Calidad Hi-Fi ${biasLabel}`;
      const newPlaylist = createPlaylist(tapeName, tapeDescription);

      // 2. Add all strictly resolved audio tracks to it
      addTracksToPlaylist(newPlaylist.id, finalResolved);
      setCreatedPlaylistId(newPlaylist.id);
      setStep('complete');
    } else {
      // All tracks failed strict matching
      setStep('complete');
    }
  };

  const handleCopyMissingTracks = () => {
    if (failedTracks.length === 0) return;
    const textLines = [
      `📋 Pistas de Spotify no grabadas en "${tapeName}":`,
      `Total omitidas por falta de coincidencia exacta: ${failedTracks.length}`,
      '',
      ...failedTracks.map(
        (f, idx) => `${idx + 1}. ${f.track.artist} - ${f.track.title} [Motivo: ${f.reason}]`
      ),
    ].join('\n');

    navigator.clipboard.writeText(textLines).then(() => {
      setCopiedMissing(true);
      setTimeout(() => setCopiedMissing(false), 3000);
    });
  };

  const handlePlayNow = () => {
    if (resolvedTracks.length > 0) {
      playTrack(resolvedTracks[0], resolvedTracks);
      setFullScreenPlayerOpen(true);
      onClose();
    }
  };

  const handleOpenInLibrary = () => {
    if (createdPlaylistId && onOpenPlaylist) {
      onOpenPlaylist(createdPlaylistId);
      onClose();
    } else {
      onClose();
    }
  };

  const resetModal = () => {
    setStep('input');
    setRawText('');
    setParsedTracks([]);
    setSelectedIds(new Set());
    setErrorMsg(null);
    setResolvedTracks([]);
    setFailedTracks([]);
    setCopiedMissing(false);
    setCreatedPlaylistId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md select-none animate-in fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl glass-panel p-5 sm:p-6 shadow-2xl relative border-2 border-[#2b3548] max-h-[90dvh] overflow-y-auto my-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/25 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/20">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                EXPORTIFY & SPOTIFY CSV
              </span>
              <span className="text-[10px] font-mono uppercase font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> COINCIDENCIA EXACTA
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-rock tracking-widest text-white leading-tight mt-0.5">
              GRABADORA DE CINTAS SPOTIFY
            </h2>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/35 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ==============================================================
            STEP 1: INPUT CSV (FILE OR PASTE)
           ============================================================== */}
        {step === 'input' && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Carga tu archivo exportado de Spotify (desde <strong>Exportify</strong>, <strong>TuneMyMusic</strong> o Soundiiz) o pega la lista de canciones. Mixtape buscará automáticamente los streams con <strong>coincidencia estricta y exacta</strong> (título, artista y duración), omitiendo cualquier resultado ambiguo para proteger la calidad de tu cinta.
            </p>

            {/* Input Mode Selector */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
              <button
                type="button"
                onClick={() => setInputTab('upload')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  inputTab === 'upload'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Subir archivo .CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setInputTab('paste')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  inputTab === 'paste'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Pegar texto CSV</span>
              </button>
            </div>

            {inputTab === 'upload' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400/80 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-2xl p-6 sm:p-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Haz clic aquí para seleccionar tu archivo CSV</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Compatible con archivos .csv y .txt de Spotify</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Pega aquí el contenido de tu CSV de Spotify...\nEjemplo:\nTrack Name,Artist Name(s),Album Name,Duration (ms)\nBohemian Rhapsody,Queen,A Night At The Opera,354320`}
                  className="w-full h-36 p-3 rounded-2xl bg-black/50 border border-white/10 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handlePasteSubmit}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
                >
                  Analizar canciones
                </button>
              </div>
            )}

            {/* Quick Demo Button */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-zinc-500">¿No tienes un CSV a mano?</span>
              <button
                type="button"
                onClick={handleLoadDemo}
                className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition underline cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cargar lista demo de prueba</span>
              </button>
            </div>
          </div>
        )}

        {/* ==============================================================
            STEP 2: PREVIEW DETECTED TRACKS & CONFIGURE CASSETTE TAPE
           ============================================================== */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Tape Name Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Nombre de la Cinta / Cassette:
              </label>
              <input
                type="text"
                value={tapeName}
                onChange={(e) => setTapeName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white font-stereo text-sm font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Tape Bias Type */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400">
                  Tipo de Cinta Magnética (Emulsión):
                </label>
                <button
                  type="button"
                  onClick={() => setShowTypeExplanation(!showTypeExplanation)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 transition cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>¿Diferencias entre tipos?</span>
                  {showTypeExplanation ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'type1', name: 'Type I (Ferro)', desc: 'EQ Normal 120µs', tag: 'Cálido' },
                  { id: 'type2', name: 'Type II (Chrome)', desc: 'High Bias 70µs', tag: 'Recomendada' },
                  { id: 'type4', name: 'Type IV (Metal)', desc: 'Metal Bias 70µs', tag: 'Audiófilo' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTapeType(t.id as any)}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                      tapeType === t.id
                        ? 'bg-amber-500/20 text-white border-amber-400 shadow-md ring-1 ring-amber-400/40'
                        : 'bg-black/30 text-zinc-400 border-white/10 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-bold font-mono">{t.name}</p>
                    <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{t.desc}</p>
                    <span className={`inline-block text-[8px] font-mono uppercase px-1.5 py-0.2 rounded mt-1 ${
                      tapeType === t.id ? 'bg-amber-400 text-black font-bold' : 'bg-white/5 text-zinc-500'
                    }`}>
                      {t.tag}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tape Type Quick Guide (Accordion) */}
              {showTypeExplanation && (
                <div className="p-3 rounded-xl bg-black/60 border border-amber-500/30 text-xs space-y-2 animate-in fade-in slide-in-from-top-1 text-zinc-300 font-mono">
                  <div className="border-b border-white/10 pb-1.5">
                    <p className="font-bold text-amber-300">📼 Type I - Normal / Ferro (120µs):</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Óxido de hierro. Calidez analógica clásica de los 70s/80s con medios ricos y soplido de cinta vintage. Ideal para voces y pop acústico.
                    </p>
                  </div>
                  <div className="border-b border-white/10 pb-1.5">
                    <p className="font-bold text-amber-300">💽 Type II - Chrome / CrO₂ (70µs):</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Dióxido de cromo. Alta fidelidad, agudos nítidos y transparentes, menor distorsión y soplido reducido. Es el estándar recomendado para rock, pop y electrónica.
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-amber-300">⚡ Type IV - Metal Puro (70µs):</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Partículas de hierro puro. Máximo rango dinámico de estudio, cero saturación en picos y pegada de graves contundente. Nivel audiófilo master.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Detected Tracks Header */}
            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <div className="flex items-center gap-2">
                <Music2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">
                  {selectedIds.size} de {parsedTracks.length} canciones seleccionadas
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedIds.size === parsedTracks.length) setSelectedIds(new Set());
                  else setSelectedIds(new Set(parsedTracks.map((t) => t.id)));
                }}
                className="text-xs font-mono text-amber-400 hover:underline cursor-pointer"
              >
                {selectedIds.size === parsedTracks.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </button>
            </div>

            {/* Scrollable Track List */}
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {parsedTracks.map((tr, idx) => {
                const isSelected = selectedIds.has(tr.id);
                return (
                  <div
                    key={tr.id}
                    onClick={() => toggleSelectTrack(tr.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-black/20 border-white/5 text-zinc-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="w-5 text-right font-mono text-[10px] text-zinc-500">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="text-xs font-semibold truncate leading-tight text-white">
                          {tr.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {tr.artist} {tr.album ? `• ${tr.album}` : ''}
                          {tr.durationMs
                            ? ` (${Math.floor(tr.durationMs / 60000)}:${String(
                                Math.floor((tr.durationMs % 60000) / 1000)
                              ).padStart(2, '0')})`
                            : ''}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-amber-400 border-amber-400 text-black'
                          : 'border-white/20'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-white/10 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs transition cursor-pointer"
              >
                ← Volver a cargar
              </button>

              <button
                type="button"
                onClick={startTapeRecording}
                disabled={selectedIds.size === 0}
                className="flex-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white" />
                <span>● Grabar en Cinta ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* ==============================================================
            STEP 3: ACTIVE RECORDING ANIMATION & STRICT MATCHING
           ============================================================== */}
        {step === 'recording' && (
          <div className="p-6 rounded-2xl bg-black/60 border-2 border-amber-500/50 space-y-5 text-center shadow-inner">
            {/* Blinking REC LED Header */}
            <div className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="text-sm font-mono-retro font-black uppercase tracking-widest text-red-400">
                ● GRABANDO EN CABEZAL DE CINTA HI-FI
              </span>
            </div>

            {/* Animated Cassette Spools */}
            <div className="flex items-center justify-center gap-8 py-3">
              <Disc3 className="w-14 h-14 text-amber-400 animate-spin" style={{ animationDuration: '1.2s' }} />
              <div className="space-y-1">
                <p className="text-xs font-mono uppercase text-zinc-400 font-bold">CASSETTE REC</p>
                <p className="text-base font-stereo font-black text-white truncate max-w-[220px]">
                  {recordProgress.currentTitle}
                </p>
                <p className="text-xs font-mono text-amber-400 truncate max-w-[220px]">
                  {recordProgress.currentArtist}
                </p>
              </div>
              <Disc3 className="w-14 h-14 text-amber-400 animate-spin" style={{ animationDuration: '1.2s' }} />
            </div>

            {/* Live Counters */}
            <div className="flex items-center justify-center gap-4 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ✓ Grabadas: {recordProgress.successCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ⚠ Omitidas: {recordProgress.failedCount}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 transition-all duration-200"
                  style={{
                    width: `${recordProgress.total > 0 ? (recordProgress.current / recordProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Pista {recordProgress.current} de {recordProgress.total}</span>
                <span>
                  {recordProgress.total > 0
                    ? Math.round((recordProgress.current / recordProgress.total) * 100)
                    : 0}%
                </span>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => {
                isCancelledRef.current = true;
                setStep('preview');
              }}
              className="py-1.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-xs font-mono transition cursor-pointer"
            >
              Cancelar grabación
            </button>
          </div>
        )}

        {/* ==============================================================
            STEP 4: COMPLETE RECORDING REPORT WINDOW
           ============================================================== */}
        {step === 'complete' && (
          <div className="space-y-4">
            {/* Header depending on results */}
            {resolvedTracks.length > 0 && failedTracks.length === 0 ? (
              // 100% SUCCESS
              <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-500/20 via-black/40 to-black/60 border-2 border-emerald-500/40 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-rock tracking-wider text-white">
                    ¡CINTA GRABADA AL 100%!
                  </h3>
                  <p className="text-sm font-semibold text-emerald-300 mt-0.5">
                    "{tapeName}"
                  </p>
                  <p className="text-xs text-zinc-300 font-mono mt-1">
                    Se han verificado y grabado {resolvedTracks.length} canciones con coincidencia exacta y calidad Hi-Fi en tu biblioteca.
                  </p>
                </div>
              </div>
            ) : resolvedTracks.length > 0 && failedTracks.length > 0 ? (
              // PARTIAL SUCCESS WITH FAILED REPORT
              <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/15 via-black/40 to-black/60 border-2 border-amber-500/40 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-rock tracking-wider text-white">
                      GRABACIÓN COMPLETADA CON REPORTE
                    </h3>
                    <p className="text-xs font-semibold text-amber-300">
                      "{tapeName}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center">
                    <p className="text-xs font-bold text-emerald-300">
                      ✓ {resolvedTracks.length} grabadas
                    </p>
                    <p className="text-[10px] text-zinc-400">Coincidencia exacta</p>
                  </div>
                  <div className="flex-1 p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-center">
                    <p className="text-xs font-bold text-amber-300">
                      ⚠ {failedTracks.length} omitidas
                    </p>
                    <p className="text-[10px] text-zinc-400">Sin resultado exacto</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  Para garantizar que tu cinta sólo contenga las versiones originales legítimas de tu lista de Spotify, Mixtape <strong>no grabó</strong> las canciones sin coincidencia exacta verificada de artista, título o duración.
                </p>
              </div>
            ) : (
              // ZERO TRACKS RECORDED
              <div className="p-5 rounded-2xl bg-gradient-to-b from-red-500/20 via-black/40 to-black/60 border-2 border-red-500/40 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-xl shadow-red-500/20">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-rock tracking-wider text-white">
                    NO SE PUDO GRABAR LA CINTA
                  </h3>
                  <p className="text-xs text-zinc-300 font-mono mt-1">
                    Ninguna de las {failedTracks.length} canciones seleccionadas superó la verificación estricta de título y artista. No se creó ninguna cinta vacía.
                  </p>
                </div>
              </div>
            )}

            {/* UNRECORDED TRACKS REPORT WINDOW (when failedTracks > 0) */}
            {failedTracks.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-black/60 border border-amber-500/35 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>Pistas no grabadas ({failedTracks.length}):</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyMissingTracks}
                    className="px-2.5 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    {copiedMissing ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar lista de omitidas</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Scrollable list of failed tracks */}
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {failedTracks.map((item, idx) => (
                    <div
                      key={item.track.id || idx}
                      className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate leading-tight">
                          {idx + 1}. {item.track.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {item.track.artist} {item.track.album ? `• ${item.track.album}` : ''}
                        </p>
                      </div>
                      <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                        {item.reason}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-zinc-500 font-mono">
                  💡 Tip: Puedes buscar manualmente estas canciones desde la pestaña de búsqueda para agregarlas individualmente a tu cinta.
                </p>
              </div>
            )}

            {/* Next Action Buttons */}
            {resolvedTracks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handlePlayNow}
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Escuchar cinta ahora ({resolvedTracks.length}) ▶</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenInLibrary}
                  className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/10 transition active:scale-95 cursor-pointer"
                >
                  Ver en Mixtapes & Cintas
                </button>
              </div>
            ) : (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={resetModal}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider shadow-lg transition active:scale-95 cursor-pointer"
                >
                  ← Volver a intentar con otra lista
                </button>
              </div>
            )}

            {resolvedTracks.length > 0 && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={resetModal}
                  className="text-xs font-mono text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  Grabar otra cinta desde CSV
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotifyCsvTapeModal;

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Smartphone,
  Laptop,
  Link2,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Camera,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { syncService } from '../services/syncService';
import { generateQrMatrix } from '../utils/qrCode';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
  const {
    playlists,
    likedTracks,
    syncState,
    linkSyncCode,
    syncNow,
    exportBackup,
    importBackup,
  } = useLibrary();

  const [activeTab, setActiveTab] = useState<'my-qr' | 'connect'>('my-qr');
  const [inputCode, setInputCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [isLinking, setIsLinking] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const shareUrl = useMemo(() => syncService.getShareUrl(), [syncState.syncCode]);
  const qrMatrix = useMemo(() => {
    try {
      return generateQrMatrix(shareUrl);
    } catch {
      return generateQrMatrix(syncState.syncCode);
    }
  }, [shareUrl, syncState.syncCode]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setFeedback(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const startCameraScanner = async () => {
    setCameraError(null);
    setFeedback(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Tu navegador no permite acceso directo a la cámara aquí. Escanea el QR con la app Cámara de tu teléfono o introduce el código TAPE-XXXX-XXXX abajo.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);

      // Use native BarcodeDetector if available (Chrome Android, Safari iOS 17+, Edge, macOS)
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      if (BarcodeDetectorClass) {
        const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });
        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawValue: string = barcodes[0].rawValue || '';
              if (rawValue) {
                handleScannedValue(rawValue);
              }
            }
          } catch {}
        }, 350);
      } else {
        setCameraError(
          'Escanea el código QR directamente con la cámara nativa de tu móvil, o escribe el código TAPE-XXXX-XXXX debajo.'
        );
        stopCamera();
      }
    } catch {
      setCameraError(
        'No se pudo acceder a la cámara. Puedes escanear el QR con la app Cámara normal de tu móvil o escribir el código TAPE-XXXX-XXXX.'
      );
    }
  };

  const handleScannedValue = async (raw: string) => {
    stopCamera();
    let extractedCode = raw.trim();
    try {
      if (raw.includes('sync=')) {
        const url = new URL(raw);
        const param = url.searchParams.get('sync');
        if (param) extractedCode = param;
      }
    } catch {}

    setInputCode(extractedCode);
    setIsLinking(true);
    const res = await linkSyncCode(extractedCode);
    setIsLinking(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        text: '¡Código QR escaneado y dispositivos vinculados! Tus listas y favoritos ya están sincronizados.',
      });
      setActiveTab('my-qr');
    } else {
      setFeedback({
        type: 'error',
        text: res.error || 'Código QR no reconocido como código de Mixtape.',
      });
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(syncState.syncCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!inputCode.trim()) {
      setFeedback({ type: 'error', text: 'Introduce el código TAPE-XXXX-XXXX del otro dispositivo.' });
      return;
    }

    setIsLinking(true);
    const res = await linkSyncCode(inputCode);
    setIsLinking(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        text: '¡Dispositivo vinculado con éxito! Tus listas, favoritos y ajustes se mantendrán sincronizados automáticamente.',
      });
      setInputCode('');
      setTimeout(() => setActiveTab('my-qr'), 1200);
    } else {
      setFeedback({ type: 'error', text: res.error || 'Código inválido.' });
    }
  };

  const handleManualSync = async () => {
    setFeedback(null);
    await syncNow();
    setFeedback({
      type: 'success',
      text: 'Sincronización completada con la nube en tiempo real.',
    });
  };

  const handleDownloadBackup = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mixtape-backup-${syncState.syncCode.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const res = importBackup(content);
      if (res.success) {
        setFeedback({
          type: 'success',
          text: 'Copia de seguridad importada y fusionada con tus listas.',
        });
      } else {
        setFeedback({
          type: 'error',
          text: res.error || 'Error al importar el archivo.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Listo para sincronizar';
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 10) return 'Hace unos segundos';
    if (diffSec < 60) return `Hace ${diffSec} seg`;
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `Hace ${mins} min`;
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const qrSize = qrMatrix.length;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-3 pb-6 safe-top bg-black/85 backdrop-blur-md select-none animate-in fade-in overflow-y-auto">
      <div className="retro-tape-chassis w-full max-w-lg rounded-3xl p-5 sm:p-6 border-2 border-[#2a3448] shadow-[0_25px_70px_rgba(0,0,0,0.95)] relative my-auto max-h-[84dvh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] border border-white/30 shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/70 border border-amber-500/40 font-mono-retro text-[10px] font-bold text-amber-400 mb-0.5">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>MULTI-DEVICE HI-FI SYNC</span>
            </div>
            <h2 className="font-rock text-2xl tracking-wider text-white uppercase leading-none">
              SINCRONIZACIÓN POR QR
            </h2>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/60 border border-white/10 mb-5">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('my-qr');
            }}
            className={`py-2.5 px-3 rounded-xl font-stereo text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${
              activeTab === 'my-qr'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Mi Código QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`py-2.5 px-3 rounded-xl font-stereo text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${
              activeTab === 'connect'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Vincular Otro</span>
          </button>
        </div>

        {feedback && (
          <div
            className={`mb-4 p-3 rounded-2xl border flex items-start gap-2.5 text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-red-500/15 border-red-500/40 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {activeTab === 'my-qr' ? (
          <div className="space-y-4">
            {/* QR Cassette Label Card */}
            <div className="bg-gradient-to-b from-[#161c28] to-[#0d1118] border border-amber-500/30 rounded-2xl p-4 flex flex-col items-center text-center shadow-inner">
              <p className="text-xs text-zinc-300 mb-3 max-w-sm">
                Escanea este código QR con tu <strong>móvil, tablet o PC</strong> para conectar ambos dispositivos. Tus listas y favoritos se sincronizarán solos en tiempo real.
              </p>

              {/* Crisp SVG QR Code with Quiet Zone */}
              <div className="p-3.5 bg-white rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.2)] border-4 border-amber-400/80 mb-3">
                <svg
                  viewBox={`0 0 ${qrSize + 4} ${qrSize + 4}`}
                  className="w-44 h-44 sm:w-48 sm:h-48 block"
                  shapeRendering="crispEdges"
                >
                  <rect width={qrSize + 4} height={qrSize + 4} fill="#ffffff" />
                  {qrMatrix.map((row, rIdx) =>
                    row.map((cell, cIdx) =>
                      cell ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx + 2}
                          y={rIdx + 2}
                          width={1}
                          height={1}
                          fill="#09090b"
                        />
                      ) : null
                    )
                  )}
                </svg>
              </div>

              {/* Sync Code Badge */}
              <div className="w-full max-w-xs">
                <span className="text-[10px] font-mono-retro uppercase tracking-widest text-zinc-400 block mb-1">
                  CÓDIGO DE CINTA COMPARTIDA
                </span>
                <div className="flex items-center gap-2">
                  <div className="retro-counter-display flex-1 py-2 px-3 rounded-xl font-mono-retro text-base sm:text-lg font-bold text-amber-400 tracking-widest border border-white/10 text-center">
                    {syncState.syncCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono-retro font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
                    title="Copiar código"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">COPIADO</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>COPIAR</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Copy Magic Link Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="mt-2.5 text-xs text-amber-400/90 hover:text-amber-300 underline font-mono flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>
                  {copiedLink
                    ? '¡Enlace directo copiado al portapapeles!'
                    : 'Copiar enlace directo de sincronización'}
                </span>
              </button>
            </div>

            {/* Live Sync Status Bar */}
            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center -space-x-1.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Laptop className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white">
                      {playlists.length} {playlists.length === 1 ? 'cinta' : 'cintas'} •{' '}
                      {likedTracks.length} favoritos
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {syncState.status === 'syncing'
                      ? 'Sincronizando con la nube...'
                      : `Última sincr.: ${formatLastSync(syncState.lastSyncedAt)}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncState.status === 'syncing'}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-bold flex items-center gap-1.5 border border-white/10 transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-amber-400 ${
                    syncState.status === 'syncing' ? 'animate-spin' : ''
                  }`}
                />
                <span>Sincronizar</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connect Another Device Box */}
            <div className="bg-gradient-to-b from-[#161c28] to-[#0d1118] border border-white/10 rounded-2xl p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Si ya tienes tus listas en otro dispositivo, abre allí <strong>Sincronización por QR</strong> y escanea su código o escribe aquí su código <strong>TAPE-XXXX-XXXX</strong>.
                </p>
              </div>

              {/* Camera QR Scanner Toggle */}
              {!isCameraOpen ? (
                <button
                  type="button"
                  onClick={startCameraScanner}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-stereo font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98"
                >
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Escanear QR con la Cámara</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400 bg-black aspect-video flex items-center justify-center">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-40 h-40 border-2 border-amber-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="w-full py-2 rounded-xl bg-white/10 text-zinc-300 text-xs font-mono"
                  >
                    Cerrar cámara
                  </button>
                </div>
              )}

              {cameraError && (
                <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
                  {cameraError}
                </p>
              )}

              {/* Manual Code Form */}
              <form onSubmit={handleConnectSubmit} className="space-y-3 pt-2 border-t border-white/10">
                <label className="block text-[11px] font-mono-retro font-bold uppercase tracking-wider text-zinc-300">
                  O introduce el Código de Cinta del otro dispositivo:
                </label>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Ej: TAPE-8F4A-92C1"
                  className="w-full px-4 py-3 rounded-xl bg-black/70 border border-white/15 focus:border-amber-400 focus:outline-none text-center font-mono-retro text-base font-bold text-amber-400 tracking-widest placeholder-zinc-600 uppercase"
                />
                <button
                  type="submit"
                  disabled={isLinking}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-black font-stereo font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-98 disabled:opacity-50"
                >
                  {isLinking ? 'VINCULANDO Y FUSIONANDO LISTAS...' : 'VINCULAR Y SINCRONIZAR AHORA'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Offline File Backup Footer */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-zinc-400 font-mono text-[11px]">
            Respaldo manual en archivo:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 flex items-center gap-1.5 text-[11px] font-mono transition"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Exportar .JSON</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 flex items-center gap-1.5 text-[11px] font-mono transition"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Importar .JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleUploadBackup}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

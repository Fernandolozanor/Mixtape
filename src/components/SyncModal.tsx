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
  ImageIcon,
} from 'lucide-react';
import jsQR from 'jsqr';
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
  const [scannedSuccess, setScannedSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const qrImageInputRef = useRef<HTMLInputElement | null>(null);

  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setScannedSuccess(false);
    isProcessingRef.current = false;
  };

  const setVideoElement = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.setAttribute('playsinline', 'true');
      el.setAttribute('webkit-playsinline', 'true');
      el.muted = true;
      el.play().catch(() => {});
    }
  };

  const shareUrl = useMemo(() => syncService.getShareUrl(), [syncState.syncCode]);
  const qrMatrix = useMemo(() => {
    if (!isOpen) return [];
    try {
      return generateQrMatrix(shareUrl);
    } catch {
      return generateQrMatrix(syncState.syncCode);
    }
  }, [isOpen, shareUrl, syncState.syncCode]);

  useEffect(() => {
    if (isOpen) {
      // Push latest library state whenever sync modal opens so room is ready immediately
      syncNow();
    } else {
      stopCamera();
      setFeedback(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Real-time automatic QR scanner loop (Native BarcodeDetector + high-speed downscaled jsQR)
  useEffect(() => {
    if (!isCameraOpen) {
      setScannedSuccess(false);
      return;
    }

    let isMounted = true;
    let animId: number | null = null;
    let lastScanTime = 0;
    let scanCanvas: HTMLCanvasElement | null = document.createElement('canvas');
    let ctx = scanCanvas.getContext('2d', { willReadFrequently: true });
    let cropCanvas: HTMLCanvasElement | null = document.createElement('canvas');
    let cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });

    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    let nativeDetector: any = null;
    if (BarcodeDetectorClass) {
      try {
        nativeDetector = new BarcodeDetectorClass({ formats: ['qr_code'] });
      } catch {}
    }

    const scanTick = async () => {
      if (!isMounted) return;

      const video = videoRef.current;
      const now = performance.now();

      // Scan every ~75ms (approx 13fps) while keeping UI smooth
      if (video && video.readyState >= 2 && video.videoWidth > 0 && now - lastScanTime >= 75) {
        lastScanTime = now;

        // 1. Try Native BarcodeDetector (instant GPU-accelerated scanning on supported browsers)
        if (nativeDetector) {
          try {
            const barcodes = await nativeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const rawVal: string = barcodes[0].rawValue || '';
              if (rawVal) {
                onQrDetected(rawVal);
                return;
              }
            }
          } catch {}
        }

        // 2. High-speed jsQR fallback
        if (ctx && scanCanvas) {
          try {
            const vw = video.videoWidth;
            const vh = video.videoHeight;

            // Pass 1: Center viewfinder crop at native 1:1 sensor resolution (razor-sharp, zero blur)
            if (cropCtx && cropCanvas) {
              const cropSize = Math.round(Math.min(vw, vh) * 0.72);
              const cropX = Math.round((vw - cropSize) / 2);
              const cropY = Math.round((vh - cropSize) / 2);
              const targetCrop = Math.min(cropSize, 640);

              if (cropCanvas.width !== targetCrop || cropCanvas.height !== targetCrop) {
                cropCanvas.width = targetCrop;
                cropCanvas.height = targetCrop;
              }

              cropCtx.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, targetCrop, targetCrop);
              const cropImgData = cropCtx.getImageData(0, 0, targetCrop, targetCrop);
              const qrCenter = jsQR(cropImgData.data, targetCrop, targetCrop, { inversionAttempts: 'attemptBoth' });

              if (qrCenter && qrCenter.data) {
                onQrDetected(qrCenter.data);
                return;
              }
            }

            // Pass 2: Full frame scaled (max 640px) if user holds QR off-center
            const maxDim = 640;
            const scale = Math.min(1, maxDim / Math.max(vw, vh));
            const sw = Math.round(vw * scale);
            const sh = Math.round(vh * scale);

            if (scanCanvas.width !== sw || scanCanvas.height !== sh) {
              scanCanvas.width = sw;
              scanCanvas.height = sh;
            }

            ctx.drawImage(video, 0, 0, sw, sh);
            const fullImgData = ctx.getImageData(0, 0, sw, sh);
            const qrFull = jsQR(fullImgData.data, sw, sh, { inversionAttempts: 'attemptBoth' });

            if (qrFull && qrFull.data) {
              onQrDetected(qrFull.data);
              return;
            }
          } catch {}
        }
      }

      if (isMounted) {
        animId = requestAnimationFrame(scanTick);
      }
    };

    animId = requestAnimationFrame(scanTick);

    return () => {
      isMounted = false;
      if (animId) cancelAnimationFrame(animId);
      scanCanvas = null;
      ctx = null;
      cropCanvas = null;
      cropCtx = null;
    };
  }, [isCameraOpen]);

  if (!isOpen) return null;

  const onQrDetected = (rawCode: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Haptic feedback (vibration on iPhone / Android)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([60, 40, 60]);
      } catch {}
    }

    // High quality chime sound
    playSuccessChime();

    // Visual emerald pulse & checkmark
    setScannedSuccess(true);

    // Brief 350ms delay so the user perceives the green scan confirmation before modal links
    setTimeout(() => {
      handleScannedValue(rawCode);
    }, 350);
  };

  const startCameraScanner = async () => {
    setCameraError(null);
    setFeedback(null);
    setScannedSuccess(false);
    isProcessingRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Este navegador o contexto no permite acceso a la cámara. Puedes subir una captura del QR con el botón de abajo o introducir el código TAPE-XXXX-XXXX.'
      );
      return;
    }

    let stream: MediaStream | null = null;
    try {
      // 1. Prefer back camera on mobile devices (ideal constraint won't throw on PCs with only webcams)
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      try {
        // 2. Graceful fallback: any video camera / webcam available
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err: any) {
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setCameraError(
            'Permiso de cámara denegado. Permite el acceso a la cámara en los ajustes de tu navegador o escribe el código TAPE-XXXX-XXXX.'
          );
        } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
          setCameraError('No se encontró ninguna cámara conectada en este equipo.');
        } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
          setCameraError('La cámara está siendo utilizada por otra aplicación.');
        } else {
          setCameraError(
            'No se pudo abrir la cámara. Puedes subir una captura del QR con el botón de abajo o escribir el código TAPE-XXXX-XXXX.'
          );
        }
        return;
      }
    }

    if (!stream) return;

    try {
      const track = stream.getVideoTracks()[0];
      if (track && 'applyConstraints' in track) {
        const capabilities = (track as any).getCapabilities?.() || {};
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          track.applyConstraints({
            advanced: [{ focusMode: 'continuous' } as any],
          }).catch(() => {});
        }
      }
    } catch {}

    streamRef.current = stream;
    setIsCameraOpen(true);
  };

  const handleDecodeQrFromImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError(null);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Scale down if image is too large to prevent mobile browser memory spikes
        const maxDim = 1200;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const qr = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
        if (qr && qr.data) {
          onQrDetected(qr.data);
        } else {
          setCameraError(
            'No se detectó ningún código QR en la imagen seleccionada. Asegúrate de que el código QR sea legible.'
          );
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleScannedValue = async (raw: string) => {
    stopCamera();
    let extractedCode = raw.trim();

    // Universal token matcher: extract TAPE-XXXX-XXXX directly even if inside full URL or query params
    const tokenMatch = raw.match(/TAPE-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}/i);
    if (tokenMatch) {
      extractedCode = tokenMatch[0].toUpperCase();
    } else {
      try {
        if (raw.includes('sync=')) {
          const url = new URL(raw);
          const param = url.searchParams.get('sync');
          if (param) extractedCode = param.trim();
        }
      } catch {}
    }

    setInputCode(extractedCode);
    setIsLinking(true);
    const res = await linkSyncCode(extractedCode);
    setIsLinking(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        text: '¡Código QR detectado y dispositivos vinculados! Tus listas y favoritos ya están sincronizados.',
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

              {/* Crisp SVG QR Code with ISO/IEC 18004 Quiet Zone (4 modules) */}
              <div className="p-4 bg-white rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.25)] border-4 border-amber-400/80 mb-3">
                <svg
                  viewBox={`0 0 ${qrSize + 8} ${qrSize + 8}`}
                  className="w-48 h-48 sm:w-56 sm:h-56 block"
                  shapeRendering="crispEdges"
                >
                  <rect width={qrSize + 8} height={qrSize + 8} fill="#ffffff" />
                  {qrMatrix.map((row, rIdx) =>
                    row.map((cell, cIdx) =>
                      cell ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx + 4}
                          y={rIdx + 4}
                          width={1}
                          height={1}
                          fill="#000000"
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
                      {playlists.filter((p) => p.mediaType !== 'vinyl' && !p.description?.toLowerCase().includes('vinilo')).length} cintas •{' '}
                      {playlists.filter((p) => p.mediaType === 'vinyl' || p.description?.toLowerCase().includes('vinilo')).length} vinilos •{' '}
                      {likedTracks.length} en Jukebox
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={startCameraScanner}
                    className="py-3 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-stereo font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Abrir Cámara</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => qrImageInputRef.current?.click()}
                    className="py-3 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-stereo font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98"
                  >
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span>Subir Foto del QR</span>
                  </button>
                  <input
                    ref={qrImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDecodeQrFromImage}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400/80 bg-black aspect-video flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    <video
                      ref={setVideoElement}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                      autoPlay
                      onLoadedMetadata={(e) => {
                        (e.target as HTMLVideoElement).play().catch(() => {});
                      }}
                    />

                    {/* Viewfinder Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div
                        className={`w-44 h-44 sm:w-48 sm:h-48 rounded-2xl relative transition-all duration-300 flex items-center justify-center ${
                          scannedSuccess
                            ? 'border-4 border-emerald-400 bg-emerald-500/25 shadow-[0_0_35px_rgba(52,211,153,0.9)] scale-105'
                            : 'border-2 border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]'
                        }`}
                      >
                        {scannedSuccess ? (
                          <div className="flex flex-col items-center justify-center gap-1.5 animate-in zoom-in-75 duration-200">
                            <div className="w-14 h-14 rounded-full bg-emerald-400 text-black flex items-center justify-center shadow-lg">
                              <Check className="w-8 h-8 stroke-[3]" />
                            </div>
                            <span className="text-[11px] font-mono-retro font-bold text-white bg-black/80 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-400/50">
                              ¡QR Reconocido!
                            </span>
                          </div>
                        ) : (
                          <>
                            {/* Reticle Target Corners */}
                            <div className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-amber-300" />
                            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-amber-300" />
                            <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-amber-300" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-amber-300" />

                            {/* Laser Scanning Line */}
                            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse shadow-[0_0_10px_#fbbf24]" />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Scanning Status Badge */}
                    <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
                      <div className="bg-black/75 backdrop-blur-sm px-3 py-1 rounded-full border border-white/15 text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                        {scannedSuccess ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-emerald-300 font-bold">¡Vinculando biblioteca...</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            <span>Enfoca el código QR de la otra pantalla</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={stopCamera}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 text-xs font-mono transition"
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

import { normalizeDeviceId } from '../context/AuthContext';

export interface ParsedWhatsAppRequest {
  username: string;
  deviceId: string;
  durationIdx: number | null; // 0 = Permanente, 1 = 30 Días, 2 = 7 Días, 3 = 24 Horas
  rawDeviceFound: boolean;
  rawUserFound: boolean;
}

const FILLER_WORDS = new Set([
  'hola',
  'buenas',
  'buenos',
  'dias',
  'días',
  'tardes',
  'noches',
  'gracias',
  'por',
  'favor',
  'porfa',
  'mixtape',
  'app',
  'aplicacion',
  'aplicación',
  'reproductor',
  'codigo',
  'código',
  'clave',
  'contrasena',
  'contraseña',
  'acceso',
  'id',
  'equipo',
  'dispositivo',
  'movil',
  'móvil',
  'telefono',
  'teléfono',
  'pc',
  'ordenador',
  'mi',
  'mio',
  'mío',
  'es',
  'este',
  'esta',
  'el',
  'la',
  'los',
  'las',
  'de',
  'del',
  'para',
  'un',
  'una',
  'saludo',
  'saludos',
  'abrazo',
  'te',
  'paso',
  'envio',
  'envío',
  'mando',
  'aqui',
  'aquí',
  'tienes',
  'puedes',
  'darme',
  'generar',
  'activar',
  'licencia',
  'usuario',
  'nombre',
]);

function cleanCandidateName(raw: string): string {
  return raw
    .replace(/[*_`~"]/g, '')
    // Strip leading/trailing emojis or punctuation
    .replace(/^[\s\-–—:,.!?¡¿()[\]<>@#•]+|[\s\-–—:,.!?¡¿()[\]<>@#•]+$/g, '')
    .replace(/\bEQ[\s\-_]?[0-9A-F]{4}[\s\-_]?[0-9A-F]{4}\b/gi, '')
    .replace(/\bMX-[0-9A-F]{4}-[0-9A-F]{4}(?:-[0-9A-Z]{6})?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDeviceId(text: string): string {
  // 1. Explicit EQ-XXXX-XXXX (with hyphens, spaces, underscores, or compact EQXXXXXXXX)
  const eqMatch = text.match(/\bEQ[\s\-_]?([0-9A-F]{4})[\s\-_]?([0-9A-F]{4})\b/i);
  if (eqMatch) {
    return normalizeDeviceId(`EQ-${eqMatch[1]}-${eqMatch[2]}`);
  }

  // 2. Hyphenated 4-4 hex NOT preceded by MX- (avoid matching license passwords)
  const hexPairRegex = /(?<!MX-)\b([0-9A-F]{4})-([0-9A-F]{4})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = hexPairRegex.exec(text)) !== null) {
    const combined = `${m[1]}${m[2]}`;
    // Require at least one digit so plain hyphenated words aren't false positives
    if (/\d/.test(combined)) {
      return normalizeDeviceId(`EQ-${m[1]}-${m[2]}`);
    }
  }

  // 3. Labeled 8-char hex (e.g. "ID: A1B2C3D4" or "código: 1234ABCD")
  const labeledHex = text.match(
    /(?:id(?:\s+de\s+equipo)?|c[oó]digo|equipo|dispositivo|device)\s*[:=\-]?\s*([0-9A-F]{8})\b/i
  );
  if (labeledHex && /\d/.test(labeledHex[1])) {
    return normalizeDeviceId(labeledHex[1]);
  }

  return '';
}

function extractDurationIdx(text: string): number | null {
  const lower = text.toLowerCase();
  if (/\b(permanente|sin caducidad|vitalicia|para siempre|ilimitad[ao])\b/i.test(lower)) {
    return 0;
  }
  if (/\b(30\s*d[ií]as|1\s*mes|un\s*mes|mensual)\b/i.test(lower)) {
    return 1;
  }
  if (/\b(7\s*d[ií]as|1\s*semana|una\s*semana|semanal)\b/i.test(lower)) {
    return 2;
  }
  if (/\b(24\s*h(?:oras)?|1\s*d[ií]a|un\s*d[ií]a)\b/i.test(lower)) {
    return 3;
  }
  return null;
}

function extractWhatsAppSender(text: string): string {
  // Format A: [27/11/26, 23:15:02] Carlos Gómez: ... or 27/11/2026, 23:15 - Carlos Gómez: ...
  const dateFirst = text.match(
    /(?:^|\n)\s*\[?\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s*m\.?)?\]?\s*[-–—]?\s*([^:\n]{2,45}?):/i
  );
  if (dateFirst && dateFirst[1]) {
    return cleanCandidateName(dateFirst[1]);
  }

  // Format B: [23:15, 27/11/2026] Carlos Gómez: ...
  const timeFirst = text.match(
    /(?:^|\n)\s*\[?\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s*m\.?)?,?\s+\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\]?\s*[-–—]?\s*([^:\n]{2,45}?):/i
  );
  if (timeFirst && timeFirst[1]) {
    return cleanCandidateName(timeFirst[1]);
  }

  return '';
}

function extractUsername(text: string, deviceId: string): string {
  // 1. Explicit label (e.g. "Usuario: carlos", "Nombre: Ana López")
  const explicit = text.match(
    /(?:^|\n|\s)(?:👤\s*)?\*?(?:usuario|user|nombre|alias|cuenta)\*?\s*[:=\-]\s*([^\n,|;]+)/i
  );
  if (explicit && explicit[1]) {
    const cleaned = cleanCandidateName(explicit[1]);
    if (cleaned.length >= 2) return cleaned;
  }

  // 2. Natural Spanish introduction ("soy Carlos", "me llamo Ana", "mi nombre es Luis")
  const intro = text.match(
    /\b(?:soy|me llamo|mi nombre es)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ0-9._-]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ0-9._-]+)?)/i
  );
  if (intro && intro[1]) {
    const stopWords = new Set(['y', 'mi', 'te', 'este', 'esta', 'el', 'la', 'de', 'para', 'del', 'con', 'aqui', 'aquí']);
    const words = intro[1]
      .split(/\s+/)
      .filter((w) => !stopWords.has(w.toLowerCase()) && !/^EQ/i.test(w));
    const cleaned = cleanCandidateName(words.slice(0, 2).join(' '));
    if (cleaned.length >= 2) return cleaned;
  }

  // 3. WhatsApp chat header sender (e.g. "[27/11/26, 23:15] Carlos: ...")
  const waSender = extractWhatsAppSender(text);
  const isPhoneOnly = /^\+?\d[\d\s\-()]{6,}$/.test(waSender);
  if (waSender && waSender.length >= 2 && !isPhoneOnly) {
    return waSender;
  }

  // 4. Sign-off ("Un saludo, Javier" / "Gracias, Marta")
  const signOff = text.match(
    /\b(?:un saludo|saludos|gracias|atentamente|atte\.?),?\s+([A-ZÁÉÍÓÚÑa-záéíóúñ0-9._-]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ0-9._-]+)?)\s*[.!]?\s*$/i
  );
  if (signOff && signOff[1]) {
    const cleaned = cleanCandidateName(signOff[1]);
    if (cleaned.length >= 2 && !FILLER_WORDS.has(cleaned.toLowerCase())) {
      return cleaned;
    }
  }

  // 5. Compact message like "Carlos EQ-1234-ABCD" or "EQ-1234-ABCD Ana"
  let stripped = text
    .replace(/\[?\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s*m\.?)?\]?/gi, ' ')
    .replace(/\[?\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s*m\.?)?,?\s+\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\]?/gi, ' ')
    .replace(/\bEQ[\s\-_]?[0-9A-F]{4}[\s\-_]?[0-9A-F]{4}\b/gi, ' ')
    .replace(/\bMX-[0-9A-F]{4}-[0-9A-F]{4}(?:-[0-9A-Z]{6})?\b/gi, ' ');

  if (deviceId) {
    const bareHex = deviceId.replace(/^EQ-/, '').replace(/-/g, '');
    stripped = stripped.replace(new RegExp(bareHex, 'gi'), ' ');
  }

  const remainingWords = stripped
    .replace(/[*_`~:,.!?¡¿()[\]<>@#•\-–—/\\]+/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !FILLER_WORDS.has(w.toLowerCase()) && !/^\d+$/.test(w));

  if (remainingWords.length >= 1 && remainingWords.length <= 3) {
    return remainingWords.join(' ');
  }

  // Last resort: use WhatsApp phone number if nothing else was found
  if (waSender) {
    return waSender;
  }

  return '';
}

/**
 * Parses a raw WhatsApp message pasted by the admin to automatically detect:
 * - Guest username
 * - Device Hardware ID (EQ-XXXX-XXXX)
 * - Optional requested duration
 */
export function parseWhatsAppLicenseRequest(rawText: string): ParsedWhatsAppRequest {
  const text = (rawText || '').trim();
  if (!text) {
    return {
      username: '',
      deviceId: '',
      durationIdx: null,
      rawDeviceFound: false,
      rawUserFound: false,
    };
  }

  const deviceId = extractDeviceId(text);
  const username = extractUsername(text, deviceId);
  const durationIdx = extractDurationIdx(text);

  return {
    username,
    deviceId,
    durationIdx,
    rawDeviceFound: Boolean(deviceId),
    rawUserFound: Boolean(username),
  };
}

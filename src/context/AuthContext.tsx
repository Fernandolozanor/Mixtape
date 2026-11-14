import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { openDB } from 'idb';
import { audioEngine } from '../services/audioEngine';

// SHA-256 pure TypeScript implementation (works synchronously in all browsers/contexts)
function sha256(ascii: string): string {
  const rightRotate = (value: number, amount: number) =>
    (value >>> amount) | (value << (32 - amount));

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const utf8Str = unescape(encodeURIComponent(ascii));
  const asciiBitLength = utf8Str[lengthProperty] * 8;

  let hash = (sha256 as any).h || [];
  const k = (sha256 as any).k || [];
  let primeCounter = k[lengthProperty];

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  (sha256 as any).h = hash.slice(0);
  (sha256 as any).k = k;
  hash = hash.slice(0);

  let str = utf8Str + '\x80';
  while ((str[lengthProperty] % 64) - 56) str += '\x00';
  for (i = 0; i < str[lengthProperty]; i++) {
    j = str.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15],
        w2 = w[i - 2];

      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      void i2;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? 0 : '') + b.toString(16);
    }
  }
  return result;
}

// One-way SHA-256 hash of Master Admin credentials (fernandolozanor + master password)
const MASTER_ADMIN_HASH = '2fe7dd0cdaf8a1caea16103bdafb2f97c958568f44ebd34fd89400c305fe9238';
const MASTER_SALT = 'MIXTAPE_MASTER_SALT_84';
const LICENSE_SIGN_SECRET = '80S_ANALOG_KEY_9941_TAPE_LOCK';

// 1-Hour Free Trial in milliseconds
export const TRIAL_DURATION_MS = 60 * 60 * 1000;

const STORAGE_KEYS = {
  DEVICE_ID: 'mixtape_device_id_v1',
  TRIAL_START: 'mixtape_trial_start_v1',
  SESSION: 'mixtape_auth_session_v1',
  GENERATED_HISTORY: 'mixtape_admin_generated_v1',
};

const AUTH_DB_NAME = 'mixtape_security_db';
const AUTH_STORE_NAME = 'security_kv';
const AUTH_CACHE_NAME = 'mixtape-security-vault-v1';

export interface AuthSession {
  username: string;
  role: 'admin' | 'user';
  deviceId: string;
  expiresAt: number | null; // null = permanent
  loginAt: number;
}

export interface GeneratedLicenseRecord {
  id: string;
  username: string;
  deviceId: string;
  password: string;
  durationLabel: string;
  createdAt: number;
}

interface AuthContextType {
  deviceId: string;
  session: AuthSession | null;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  trialRemainingSeconds: number;
  isAccessGranted: boolean;
  isLoginModalOpen: boolean;
  isAdminModalOpen: boolean;
  generatedLicenses: GeneratedLicenseRecord[];
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  startFreeTrial: () => void;
  setLoginModalOpen: (open: boolean) => void;
  setAdminModalOpen: (open: boolean) => void;
  generateUserPassword: (
    username: string,
    targetDeviceId: string,
    durationHours: number | null,
    durationLabel: string
  ) => { password: string; normalizedDeviceId: string } | { error: string };
  deleteLicenseRecord: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Normalize Device ID to EQ-XXXX-XXXX
export function normalizeDeviceId(raw: string): string {
  const withoutPrefix = raw.trim().toUpperCase().replace(/^EQ[-_\s]*/, '');
  const hex = withoutPrefix.replace(/[^0-9A-F]/g, '');
  if (hex.length !== 8) return raw.trim().toUpperCase();
  return `EQ-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

// Multi-layer storage helpers (localStorage + IndexedDB + CacheStorage) so trial/device ID cannot be trivially reset
async function getVaultValue(key: string): Promise<string | null> {
  try {
    const localVal = localStorage.getItem(key);
    if (localVal) return localVal;
  } catch {}

  try {
    const db = await openDB(AUTH_DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(AUTH_STORE_NAME)) {
          db.createObjectStore(AUTH_STORE_NAME);
        }
      },
    });
    const idbVal = await db.get(AUTH_STORE_NAME, key);
    if (idbVal) {
      try {
        localStorage.setItem(key, String(idbVal));
      } catch {}
      return String(idbVal);
    }
  } catch {}

  try {
    if ('caches' in window) {
      const cache = await caches.open(AUTH_CACHE_NAME);
      const res = await cache.match(`https://mixtape.local.vault/${key}`);
      if (res) {
        const text = await res.text();
        if (text) {
          try {
            localStorage.setItem(key, text);
          } catch {}
          return text;
        }
      }
    }
  } catch {}

  return null;
}

async function setVaultValue(key: string, value: string): Promise<void> {
  try {
    localStorage.setItem(key, value);
  } catch {}

  try {
    const db = await openDB(AUTH_DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(AUTH_STORE_NAME)) {
          db.createObjectStore(AUTH_STORE_NAME);
        }
      },
    });
    await db.put(AUTH_STORE_NAME, value, key);
  } catch {}

  try {
    if ('caches' in window) {
      const cache = await caches.open(AUTH_CACHE_NAME);
      await cache.put(
        `https://mixtape.local.vault/${key}`,
        new Response(value, { headers: { 'Content-Type': 'text/plain' } })
      );
    }
  } catch {}
}

function generateNewDeviceId(): string {
  const traits = [
    navigator.userAgent || '',
    screen.width || 0,
    screen.height || 0,
    screen.colorDepth || 0,
    navigator.hardwareConcurrency || 0,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    Math.random().toString(36),
    Date.now().toString(36),
  ].join('|');

  const digest = sha256(traits).toUpperCase();
  return `EQ-${digest.slice(0, 4)}-${digest.slice(4, 8)}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceId, setDeviceId] = useState<string>(() => {
    const existing = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (existing && /^EQ-[0-9A-F]{4}-[0-9A-F]{4}$/.test(existing)) {
      return existing;
    }
    const created = generateNewDeviceId();
    try {
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, created);
    } catch {}
    return created;
  });

  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!raw) return null;
      const parsed: AuthSession = JSON.parse(raw);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [trialStartedAt, setTrialStartedAt] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRIAL_START);
      return raw ? parseInt(raw, 10) : null;
    } catch {
      return null;
    }
  });

  const [now, setNow] = useState<number>(() => Date.now());
  const [isLoginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setAdminModalOpen] = useState<boolean>(false);
  const [generatedLicenses, setGeneratedLicenses] = useState<GeneratedLicenseRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.GENERATED_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Synchronize Device ID & Trial Start with IndexedDB + CacheStorage vault on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const storedDevice = await getVaultValue(STORAGE_KEYS.DEVICE_ID);
      if (storedDevice && /^EQ-[0-9A-F]{4}-[0-9A-F]{4}$/.test(storedDevice)) {
        if (mounted && storedDevice !== deviceId) {
          setDeviceId(storedDevice);
        }
        await setVaultValue(STORAGE_KEYS.DEVICE_ID, storedDevice);
      } else {
        await setVaultValue(STORAGE_KEYS.DEVICE_ID, deviceId);
      }

      const storedTrial = await getVaultValue(STORAGE_KEYS.TRIAL_START);
      if (storedTrial) {
        const parsed = parseInt(storedTrial, 10);
        if (!isNaN(parsed)) {
          if (mounted) setTrialStartedAt(parsed);
          await setVaultValue(STORAGE_KEYS.TRIAL_START, String(parsed));
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  //Verify that a non-admin session is still bound to this deviceId and not expired
  useEffect(() => {
    if (!session) return;
    if (session.role === 'user' && session.deviceId !== deviceId) {
      setSession(null);
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      return;
    }
    if (session.expiresAt && now > session.expiresAt) {
      setSession(null);
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  }, [session, deviceId, now]);

  // 1-second ticker for trial countdown and session expiration check
  useEffect(() => {
    if (session && !session.expiresAt) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const trialElapsedMs = trialStartedAt !== null ? Math.max(0, now - trialStartedAt) : 0;
  const trialRemainingSeconds =
    trialStartedAt !== null
      ? Math.max(0, Math.ceil((TRIAL_DURATION_MS - trialElapsedMs) / 1000))
      : Math.floor(TRIAL_DURATION_MS / 1000);

  const isTrialActive = !session && trialStartedAt !== null && trialRemainingSeconds > 0;
  const isTrialExpired = !session && trialStartedAt !== null && trialRemainingSeconds <= 0;
  const isAccessGranted = Boolean(session) || isTrialActive;

  // Pause audio immediately if trial expires or access is revoked
  useEffect(() => {
    if (!isAccessGranted) {
      audioEngine.pause();
    }
  }, [isAccessGranted]);

  const startFreeTrial = useCallback(() => {
    if (trialStartedAt !== null) return;
    const startTs = Date.now();
    setTrialStartedAt(startTs);
    setNow(startTs);
    setVaultValue(STORAGE_KEYS.TRIAL_START, String(startTs));
  }, [trialStartedAt]);

  const login = useCallback(
    (username: string, password: string): { success: boolean; error?: string } => {
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      if (!cleanUser || !cleanPass) {
        return { success: false, error: 'Introduce tu usuario y contraseña.' };
      }

      // 1. Check Master Admin credentials
      const adminAttemptHash = sha256(`${cleanUser}::${cleanPass}::${MASTER_SALT}`);
      if (adminAttemptHash === MASTER_ADMIN_HASH) {
        const adminSession: AuthSession = {
          username: 'Fernandolozanor',
          role: 'admin',
          deviceId,
          expiresAt: null,
          loginAt: Date.now(),
        };
        setSession(adminSession);
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(adminSession));
        setLoginModalOpen(false);
        return { success: true };
      }

      // 2. Check Device-Bound License Password: MX-XXXX-XXXX or MX-XXXX-XXXX-XXXXXX
      const upperPass = cleanPass.toUpperCase();
      const match = upperPass.match(/^MX-([0-9A-F]{4})-([0-9A-F]{4})(?:-([0-9A-Z]{6}))?$/);
      if (!match) {
        return {
          success: false,
          error: 'Usuario o contraseña incorrectos.',
        };
      }

      const [, b1, b2, expPart] = match;
      const expCode = expPart || '000000';
      const expectedSig = sha256(
        `MIXTAPE_LIC_V1::${cleanUser}::${deviceId}::${expCode}::${LICENSE_SIGN_SECRET}`
      )
        .toUpperCase()
        .slice(0, 8);

      if (b1 + b2 !== expectedSig) {
        return {
          success: false,
          error: `Esta credencial no es válida para este equipo (${deviceId}). Cada contraseña funciona únicamente en el dispositivo autorizado.`,
        };
      }

      let expiresAt: number | null = null;
      if (expCode !== '000000') {
        const expiryHours = parseInt(expCode, 36);
        if (isNaN(expiryHours)) {
          return { success: false, error: 'Formato de expiración inválido.' };
        }
        expiresAt = expiryHours * 3600 * 1000;
        if (Date.now() > expiresAt) {
          return {
            success: false,
            error: 'Tu clave de acceso temporal ha caducado. Solicita una renovación al administrador.',
          };
        }
      }

      const userSession: AuthSession = {
        username: username.trim(),
        role: 'user',
        deviceId,
        expiresAt,
        loginAt: Date.now(),
      };
      setSession(userSession);
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(userSession));
      setLoginModalOpen(false);
      return { success: true };
    },
    [deviceId]
  );

  const logout = useCallback(() => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    setAdminModalOpen(false);
  }, []);

  const generateUserPassword = useCallback(
    (
      username: string,
      targetDeviceId: string,
      durationHours: number | null,
      durationLabel: string
    ): { password: string; normalizedDeviceId: string } | { error: string } => {
      if (session?.role !== 'admin') {
        return { error: 'No autorizado.' };
      }

      const cleanUser = username.trim().toLowerCase();
      if (!cleanUser) {
        return { error: 'Introduce un nombre de usuario.' };
      }

      const normDev = normalizeDeviceId(targetDeviceId);
      if (!/^EQ-[0-9A-F]{4}-[0-9A-F]{4}$/.test(normDev)) {
        return {
          error: 'El ID de Equipo debe tener el formato EQ-XXXX-XXXX (8 caracteres hexadecimales).',
        };
      }

      let expCode = '000000';
      if (durationHours !== null && durationHours > 0) {
        const expiryHours = Math.ceil((Date.now() + durationHours * 3600 * 1000) / (3600 * 1000));
        expCode = expiryHours.toString(36).toUpperCase().padStart(6, '0');
      }

      const sig = sha256(
        `MIXTAPE_LIC_V1::${cleanUser}::${normDev}::${expCode}::${LICENSE_SIGN_SECRET}`
      )
        .toUpperCase()
        .slice(0, 8);

      const password =
        expCode === '000000'
          ? `MX-${sig.slice(0, 4)}-${sig.slice(4, 8)}`
          : `MX-${sig.slice(0, 4)}-${sig.slice(4, 8)}-${expCode}`;

      const record: GeneratedLicenseRecord = {
        id: 'lic_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        username: username.trim(),
        deviceId: normDev,
        password,
        durationLabel,
        createdAt: Date.now(),
      };

      setGeneratedLicenses((prev) => {
        const updated = [record, ...prev];
        try {
          localStorage.setItem(STORAGE_KEYS.GENERATED_HISTORY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      return { password, normalizedDeviceId: normDev };
    },
    [session]
  );

  const deleteLicenseRecord = useCallback((id: string) => {
    setGeneratedLicenses((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.GENERATED_HISTORY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        deviceId,
        session,
        isTrialActive,
        isTrialExpired,
        trialRemainingSeconds,
        isAccessGranted,
        isLoginModalOpen,
        isAdminModalOpen,
        generatedLicenses,
        login,
        logout,
        startFreeTrial,
        setLoginModalOpen,
        setAdminModalOpen,
        generateUserPassword,
        deleteLicenseRecord,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

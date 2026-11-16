import type { Playlist, Track, UserSettings } from '../types/music';
import { firebaseService } from './firebase';

const SYNC_CODE_KEY = 'mixtape_sync_code_v1';
const TOMBSTONES_KEY = 'mixtape_sync_tombstones_v1';
const SETTINGS_TS_KEY = 'mixtape_settings_updated_at_v1';
const LAST_SYNC_TS_KEY = 'mixtape_last_sync_ts_v1';
const DEVICE_NAME_KEY = 'mixtape_device_label_v1';

export interface SyncTombstones {
  playlists: Record<string, number>; // playlistId -> deletedAt timestamp
  liked: Record<string, number>;     // trackId -> deletedAt timestamp
}

export interface SyncSettingsBundle {
  userSettings?: Partial<UserSettings>;
  themeId?: string;
  kidsPin?: string;
  kidsMaxVol?: number;
  favoritesViewMode?: 'jukebox' | 'vinyl' | 'list';
  jukeboxCredits?: number;
  updatedAt: number;
}

export interface FullSyncSnapshot {
  v: 1;
  syncCode: string;
  senderId: string;
  senderLabel: string;
  timestamp: number;
  playlists: Playlist[];
  likedTracks: Track[];
  tombstones: SyncTombstones;
  settingsBundle?: SyncSettingsBundle;
}

// Compact wire format to minimize payload size for fast QR/cloud transmission
interface CompactTrack {
  i: string;          // id
  t: string;          // title
  a: string;          // artist
  al?: string;        // album
  d: number;          // duration
  th: string;         // thumbnail
  s: Track['source']; // source
  u?: string;         // audioUrl
  y?: string;         // youtubeId
  vf?: string;        // viewsFormatted
  at?: number;        // addedAt
  b?: number;         // bpm
}

interface CompactPlaylist {
  i: string;          // id
  n: string;          // name
  ds?: string;        // description
  c?: string;         // coverUrl
  ca: number;         // createdAt
  ua: number;         // updatedAt
  mt?: 'tape' | 'vinyl'; // mediaType (📼 cinta o 💽 vinilo)
  ar?: string;        // artist (for vinyl albums)
  yr?: string;        // year (for vinyl albums)
  tr: CompactTrack[]; // tracks
}

interface CompactWirePacket {
  v: 1;
  rev: string;
  chunkIdx: number;
  totalChunks: number;
  senderId: string;
  senderLabel: string;
  ts: number;
  data: string; // Base64 obfuscated JSON of CompactPayloadBody
}

interface CompactPayloadBody {
  p: CompactPlaylist[];
  l: CompactTrack[];
  tb: SyncTombstones;
  sb?: SyncSettingsBundle;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncStateInfo {
  syncCode: string;
  status: SyncStatus;
  lastSyncedAt: number | null;
  lastRemoteDevice: string | null;
  justLinkedFromUrl: boolean;
}

// Deterministic hash helper for deriving private topic names
function quickHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return hex1 + hex2;
}

function getTopicForSyncCode(syncCode: string): string {
  const norm = normalizeSyncCode(syncCode);
  const hA = quickHash(`MIXTAPE_ROOM_A::${norm}`);
  const hB = quickHash(`MIXTAPE_ROOM_B::${norm}::80S_DECK`);
  return `mixtape_sync_v1_${hA}${hB.slice(0, 8)}`;
}

// Symmetric XOR + UTF-8 Base64 encoding keyed by syncCode so cloud payloads are not plain text
function encodePayload(jsonStr: string, syncCode: string): string {
  const key = `MIXTAPE_KEY_${normalizeSyncCode(syncCode)}_HI_FI`;
  const bytes = new TextEncoder().encode(jsonStr);
  const keyBytes = new TextEncoder().encode(key);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  let binary = '';
  for (let i = 0; i < out.length; i++) {
    binary += String.fromCharCode(out[i]);
  }
  return btoa(binary);
}

function decodePayload(b64: string, syncCode: string): string {
  const key = `MIXTAPE_KEY_${normalizeSyncCode(syncCode)}_HI_FI`;
  const binary = atob(b64);
  const keyBytes = new TextEncoder().encode(key);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i) ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(out);
}

export function normalizeSyncCode(raw: string): string {
  const clean = raw
    .trim()
    .toUpperCase()
    .replace(/^TAPE[-_\s]*/, '')
    .replace(/[^0-9A-F]/g, '');
  if (clean.length === 8) {
    return `TAPE-${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
  }
  return raw.trim().toUpperCase();
}

export function isValidSyncCode(code: string): boolean {
  return /^TAPE-[0-9A-F]{4}-[0-9A-F]{4}$/.test(normalizeSyncCode(code));
}

export function generateRandomSyncCode(): string {
  const chars = '0123456789ABCDEF';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars[Math.floor(Math.random() * 16)];
    part2 += chars[Math.floor(Math.random() * 16)];
  }
  return `TAPE-${part1}-${part2}`;
}

function detectDeviceLabel(): string {
  try {
    const existing = localStorage.getItem(DEVICE_NAME_KEY);
    if (existing) return existing;
    const ua = navigator.userAgent || '';
    let label = 'Reproductor Web';
    if (/iPhone/i.test(ua)) label = 'iPhone';
    else if (/iPad/i.test(ua)) label = 'iPad';
    else if (/Android/i.test(ua)) label = 'Android';
    else if (/Macintosh|Mac OS/i.test(ua)) label = 'Mac';
    else if (/Windows/i.test(ua)) label = 'PC Windows';
    localStorage.setItem(DEVICE_NAME_KEY, label);
    return label;
  } catch {
    return 'Dispositivo';
  }
}

function toCompactTrack(t: Track): CompactTrack {
  return {
    i: t.id,
    t: t.title,
    a: t.artist,
    al: t.album,
    d: t.duration,
    th: t.thumbnail,
    s: t.source,
    u: t.audioUrl,
    y: t.youtubeId,
    vf: t.viewsFormatted,
    at: t.addedAt,
    b: t.bpm,
  };
}

function fromCompactTrack(c: CompactTrack): Track {
  return {
    id: c.i,
    title: c.t,
    artist: c.a,
    album: c.al,
    duration: c.d,
    thumbnail: c.th,
    source: c.s,
    audioUrl: c.u,
    youtubeId: c.y,
    viewsFormatted: c.vf,
    addedAt: c.at,
    bpm: c.b,
  };
}

function toCompactPlaylist(pl: Playlist): CompactPlaylist {
  const isVinyl =
    pl.mediaType === 'vinyl' ||
    pl.description?.toLowerCase().includes('vinilo') ||
    pl.description?.toLowerCase().includes('álbum') ||
    pl.description?.toLowerCase().includes('album');

  return {
    i: pl.id,
    n: pl.name,
    ds: pl.description,
    c: pl.coverUrl,
    ca: pl.createdAt,
    ua: pl.updatedAt,
    mt: isVinyl ? 'vinyl' : 'tape',
    ar: pl.artist,
    yr: pl.year,
    tr: (pl.tracks || []).map(toCompactTrack),
  };
}

function fromCompactPlaylist(cp: CompactPlaylist): Playlist {
  const isVinyl =
    cp.mt === 'vinyl' ||
    cp.ds?.toLowerCase().includes('vinilo') ||
    cp.ds?.toLowerCase().includes('álbum') ||
    cp.ds?.toLowerCase().includes('album');

  return {
    id: cp.i,
    name: cp.n,
    description: cp.ds,
    coverUrl: cp.c,
    createdAt: cp.ca,
    updatedAt: cp.ua,
    mediaType: isVinyl ? 'vinyl' : 'tape',
    artist: cp.ar,
    year: cp.yr,
    tracks: (cp.tr || []).map(fromCompactTrack),
  };
}

class SyncService {
  private syncCode: string;
  private senderId: string;
  private senderLabel: string;
  private status: SyncStatus = 'idle';
  private lastSyncedAt: number | null = null;
  private lastRemoteDevice: string | null = null;
  private justLinkedFromUrl = false;
  private eventSource: EventSource | null = null;
  private pushDebounceTimer: number | null = null;
  private chunkBuffer: Map<string, { chunks: Map<number, string>; total: number; meta: CompactWirePacket }> = new Map();
  private stateListeners: ((info: SyncStateInfo) => void)[] = [];
  private dataListeners: ((merged: {
    playlists: Playlist[];
    likedTracks: Track[];
    settingsBundle?: SyncSettingsBundle;
  }) => void)[] = [];

  constructor() {
    this.senderId = 'dev_' + Math.random().toString(36).slice(2, 10);
    this.senderLabel = detectDeviceLabel();

    const savedLastSync = localStorage.getItem(LAST_SYNC_TS_KEY);
    if (savedLastSync) {
      const parsed = parseInt(savedLastSync, 10);
      if (!isNaN(parsed)) this.lastSyncedAt = parsed;
    }

    // 1. Check if URL contains ?sync=TAPE-XXXX-XXXX from scanning a QR code
    const urlCode = this.checkUrlForSyncCode();
    if (urlCode) {
      this.syncCode = urlCode;
      this.justLinkedFromUrl = true;
      try {
        localStorage.setItem(SYNC_CODE_KEY, urlCode);
      } catch {}
    } else {
      const stored = localStorage.getItem(SYNC_CODE_KEY);
      if (stored && isValidSyncCode(stored)) {
        this.syncCode = normalizeSyncCode(stored);
      } else {
        this.syncCode = generateRandomSyncCode();
        try {
          localStorage.setItem(SYNC_CODE_KEY, this.syncCode);
        } catch {}
      }
    }

    // Start live SSE subscription
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.connectLiveStream();
      }, 300);
    }
  }

  private checkUrlForSyncCode(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const rawSync = params.get('sync');
      if (rawSync && isValidSyncCode(rawSync)) {
        const normalized = normalizeSyncCode(rawSync);
        // Clean URL parameter without reloading the page
        params.delete('sync');
        const newSearch = params.toString();
        const newUrl =
          window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
        return normalized;
      }
    } catch {}
    return null;
  }

  public getStateInfo(): SyncStateInfo {
    return {
      syncCode: this.syncCode,
      status: this.status,
      lastSyncedAt: this.lastSyncedAt,
      lastRemoteDevice: this.lastRemoteDevice,
      justLinkedFromUrl: this.justLinkedFromUrl,
    };
  }

  public clearJustLinkedFlag(): void {
    this.justLinkedFromUrl = false;
    this.notifyStateListeners();
  }

  public getShareUrl(): string {
    if (typeof window === 'undefined') return this.syncCode;
    const base = window.location.origin + window.location.pathname;
    return `${base}?sync=${encodeURIComponent(this.syncCode)}`;
  }

  public onStateChange(cb: (info: SyncStateInfo) => void): () => void {
    this.stateListeners.push(cb);
    cb(this.getStateInfo());
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== cb);
    };
  }

  public onRemoteDataMerged(
    cb: (merged: {
      playlists: Playlist[];
      likedTracks: Track[];
      settingsBundle?: SyncSettingsBundle;
    }) => void
  ): () => void {
    this.dataListeners.push(cb);
    return () => {
      this.dataListeners = this.dataListeners.filter((l) => l !== cb);
    };
  }

  private notifyStateListeners(): void {
    const info = this.getStateInfo();
    this.stateListeners.forEach((cb) => cb(info));
  }

  private setStatus(status: SyncStatus): void {
    this.status = status;
    this.notifyStateListeners();
  }

  // --- Tombstones (Track deletions so deleted items don't resurrect on merge) ---

  public getTombstones(): SyncTombstones {
    try {
      const raw = localStorage.getItem(TOMBSTONES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          playlists: parsed.playlists || {},
          liked: parsed.liked || {},
        };
      }
    } catch {}
    return { playlists: {}, liked: {} };
  }

  private saveTombstones(tb: SyncTombstones): void {
    try {
      localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(tb));
    } catch {}
  }

  public recordPlaylistDeleted(playlistId: string): void {
    const tb = this.getTombstones();
    tb.playlists[playlistId] = Date.now();
    this.saveTombstones(tb);
  }

  public recordLikedTrackDeleted(trackId: string): void {
    const tb = this.getTombstones();
    tb.liked[trackId] = Date.now();
    this.saveTombstones(tb);
  }

  public recordTrackLiked(trackId: string): void {
    const tb = this.getTombstones();
    if (tb.liked[trackId]) {
      delete tb.liked[trackId];
      this.saveTombstones(tb);
    }
  }

  public markSettingsUpdated(): void {
    try {
      localStorage.setItem(SETTINGS_TS_KEY, String(Date.now()));
    } catch {}
  }

  private getLocalSettingsBundle(): SyncSettingsBundle {
    let userSettings: Partial<UserSettings> | undefined;
    try {
      const raw = localStorage.getItem('pulse_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        const { firebaseConfig: _fb, ...rest } = parsed;
        userSettings = rest;
      }
    } catch {}

    const themeId = localStorage.getItem('pulse_theme') || undefined;
    const kidsPin = localStorage.getItem('mixtape_kids_pin') || undefined;
    const kidsMaxVolRaw = localStorage.getItem('mixtape_kids_max_vol');
    const kidsMaxVol = kidsMaxVolRaw ? parseFloat(kidsMaxVolRaw) : undefined;
    const favModeRaw = (localStorage.getItem('mixtape_favorites_view_mode') as 'jukebox' | 'vinyl' | 'list') || undefined;
    const jbCreditsRaw = localStorage.getItem('mixtape_jukebox_credits');
    const jukeboxCredits = jbCreditsRaw ? parseInt(jbCreditsRaw, 10) : undefined;
    const updatedAt = parseInt(localStorage.getItem(SETTINGS_TS_KEY) || '0', 10) || Date.now();

    return {
      userSettings,
      themeId,
      kidsPin,
      kidsMaxVol,
      favoritesViewMode: favModeRaw,
      jukeboxCredits,
      updatedAt,
    };
  }

  // --- Link to a new Sync Code (via QR Scan or Manual Code Input) ---

  public async linkSyncCode(
    newCodeRaw: string,
    currentPlaylists: Playlist[],
    currentLiked: Track[]
  ): Promise<{ success: boolean; error?: string }> {
    const norm = normalizeSyncCode(newCodeRaw);
    if (!isValidSyncCode(norm)) {
      return {
        success: false,
        error: 'El código debe tener el formato TAPE-XXXX-XXXX (8 caracteres hexadecimales).',
      };
    }

    this.syncCode = norm;
    try {
      localStorage.setItem(SYNC_CODE_KEY, norm);
    } catch {}

    this.notifyStateListeners();
    this.connectLiveStream();

    // First pull any existing cloud data on that room and merge with local data
    await this.pullNow(currentPlaylists, currentLiked);

    // Then push the unified state back so all devices on the room have the complete merged set
    const mergedPlaylists: Playlist[] = JSON.parse(
      localStorage.getItem('pulse_local_playlists') || '[]'
    );
    const mergedLiked: Track[] = JSON.parse(localStorage.getItem('pulse_local_liked') || '[]');
    await this.pushNow(mergedPlaylists, mergedLiked);

    return { success: true };
  }

  // --- Live EventSource (SSE) Listener ---

  private connectLiveStream(): void {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }

    if (typeof EventSource === 'undefined') return;

    const topic = getTopicForSyncCode(this.syncCode);
    try {
      const es = new EventSource(`https://ntfy.sh/${topic}/sse`);
      this.eventSource = es;

      es.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          if (envelope.event === 'message' && typeof envelope.message === 'string') {
            this.handleIncomingWireString(envelope.message);
          }
        } catch {}
      };

      es.onerror = () => {
        // Browser EventSource automatically reconnects
      };
    } catch {}
  }

  private handleIncomingWireString(rawMessage: string): void {
    try {
      const packet: CompactWirePacket = JSON.parse(rawMessage);
      if (!packet || packet.v !== 1 || packet.senderId === this.senderId) {
        return; // Ignore our own echoes
      }

      if (packet.totalChunks === 1) {
        this.applyDecodedChunkData(packet.data, packet.senderLabel);
      } else {
        let entry = this.chunkBuffer.get(packet.rev);
        if (!entry) {
          entry = { chunks: new Map(), total: packet.totalChunks, meta: packet };
          this.chunkBuffer.set(packet.rev, entry);
        }
        entry.chunks.set(packet.chunkIdx, packet.data);

        if (entry.chunks.size === entry.total) {
          let combined = '';
          for (let i = 0; i < entry.total; i++) {
            combined += entry.chunks.get(i) || '';
          }
          this.chunkBuffer.delete(packet.rev);
          this.applyDecodedChunkData(combined, packet.senderLabel);
        }
      }
    } catch {}
  }

  private applyDecodedChunkData(encodedData: string, senderLabel: string): void {
    try {
      const jsonStr = decodePayload(encodedData, this.syncCode);
      const body: CompactPayloadBody = JSON.parse(jsonStr);

      const remotePlaylists: Playlist[] = (body.p || []).map(fromCompactPlaylist);

      const remoteLiked: Track[] = (body.l || []).map(fromCompactTrack);
      const remoteTombstones: SyncTombstones = body.tb || { playlists: {}, liked: {} };

      const localPlaylists: Playlist[] = JSON.parse(
        localStorage.getItem('pulse_local_playlists') || '[]'
      );
      const localLiked: Track[] = JSON.parse(localStorage.getItem('pulse_local_liked') || '[]');

      const merged = this.mergeStates(
        localPlaylists,
        localLiked,
        this.getTombstones(),
        remotePlaylists,
        remoteLiked,
        remoteTombstones,
        body.sb
      );

      this.lastSyncedAt = Date.now();
      this.lastRemoteDevice = senderLabel || 'Otro dispositivo';
      localStorage.setItem(LAST_SYNC_TS_KEY, String(this.lastSyncedAt));
      this.setStatus('synced');

      this.dataListeners.forEach((cb) => cb(merged));
    } catch (e) {
      console.warn('Could not decode sync packet:', e);
    }
  }

  // --- Intelligent Conflict-Free State Merge ---

  private mergeStates(
    localPlaylists: Playlist[],
    localLiked: Track[],
    localTombstones: SyncTombstones,
    remotePlaylists: Playlist[],
    remoteLiked: Track[],
    remoteTombstones: SyncTombstones,
    remoteSettings?: SyncSettingsBundle
  ): {
    playlists: Playlist[];
    likedTracks: Track[];
    settingsBundle?: SyncSettingsBundle;
  } {
    // 1. Merge Tombstones (keep latest deletion timestamp)
    const mergedTombstones: SyncTombstones = {
      playlists: { ...localTombstones.playlists },
      liked: { ...localTombstones.liked },
    };

    for (const [id, ts] of Object.entries(remoteTombstones.playlists || {})) {
      if (!mergedTombstones.playlists[id] || ts > mergedTombstones.playlists[id]) {
        mergedTombstones.playlists[id] = ts;
      }
    }
    for (const [id, ts] of Object.entries(remoteTombstones.liked || {})) {
      if (!mergedTombstones.liked[id] || ts > mergedTombstones.liked[id]) {
        mergedTombstones.liked[id] = ts;
      }
    }
    this.saveTombstones(mergedTombstones);

    // 2. Merge Playlists by ID and updatedAt, respecting deletion tombstones
    const playlistMap = new Map<string, Playlist>();
    for (const pl of localPlaylists) {
      const deletedAt = mergedTombstones.playlists[pl.id];
      if (!deletedAt || pl.updatedAt > deletedAt) {
        playlistMap.set(pl.id, pl);
      }
    }
    for (const rPl of remotePlaylists) {
      const deletedAt = mergedTombstones.playlists[rPl.id];
      if (deletedAt && rPl.updatedAt <= deletedAt) {
        continue;
      }
      const existing = playlistMap.get(rPl.id);
      if (!existing) {
        playlistMap.set(rPl.id, rPl);
      } else if ((rPl.updatedAt || 0) > (existing.updatedAt || 0)) {
        playlistMap.set(rPl.id, {
          ...existing,
          ...rPl,
          mediaType:
            rPl.mediaType === 'vinyl' || existing.mediaType === 'vinyl'
              ? 'vinyl'
              : rPl.mediaType || existing.mediaType || 'tape',
          artist: rPl.artist || existing.artist,
          year: rPl.year || existing.year,
          coverUrl: rPl.coverUrl || existing.coverUrl,
        });
      } else if ((rPl.updatedAt || 0) === (existing.updatedAt || 0)) {
        // Merge tracks inside the playlist if timestamps match
        const trackIds = new Set(existing.tracks.map((t) => t.id));
        const combinedTracks = [...existing.tracks];
        for (const rt of rPl.tracks) {
          if (!trackIds.has(rt.id)) {
            combinedTracks.push(rt);
            trackIds.add(rt.id);
          }
        }
        playlistMap.set(rPl.id, {
          ...existing,
          mediaType:
            existing.mediaType === 'vinyl' || rPl.mediaType === 'vinyl'
              ? 'vinyl'
              : existing.mediaType || rPl.mediaType || 'tape',
          artist: existing.artist || rPl.artist,
          year: existing.year || rPl.year,
          coverUrl: existing.coverUrl || rPl.coverUrl,
          tracks: combinedTracks,
        });
      }
    }

    const mergedPlaylists = Array.from(playlistMap.values()).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    );

    // 3. Merge Liked Tracks by ID, respecting deletion tombstones
    const likedMap = new Map<string, Track>();
    for (const t of localLiked) {
      const deletedAt = mergedTombstones.liked[t.id];
      if (!deletedAt || (t.addedAt || 0) > deletedAt) {
        likedMap.set(t.id, t);
      }
    }
    for (const rt of remoteLiked) {
      const deletedAt = mergedTombstones.liked[rt.id];
      if (deletedAt && (rt.addedAt || 0) <= deletedAt) {
        continue;
      }
      if (!likedMap.has(rt.id)) {
        likedMap.set(rt.id, rt);
      }
    }

    const mergedLiked = Array.from(likedMap.values()).sort(
      (a, b) => (b.addedAt || 0) - (a.addedAt || 0)
    );

    localStorage.setItem('pulse_local_playlists', JSON.stringify(mergedPlaylists));
    localStorage.setItem('pulse_local_liked', JSON.stringify(mergedLiked));

    // 4. Merge Settings if remote settings are newer
    let winningSettings: SyncSettingsBundle | undefined;
    const localSettingsTs = parseInt(localStorage.getItem(SETTINGS_TS_KEY) || '0', 10);
    if (remoteSettings && remoteSettings.updatedAt > localSettingsTs) {
      winningSettings = remoteSettings;
      localStorage.setItem(SETTINGS_TS_KEY, String(remoteSettings.updatedAt));
      if (remoteSettings.themeId) {
        localStorage.setItem('pulse_theme', remoteSettings.themeId);
      }
      if (remoteSettings.kidsPin) {
        localStorage.setItem('mixtape_kids_pin', remoteSettings.kidsPin);
      }
      if (remoteSettings.kidsMaxVol !== undefined) {
        localStorage.setItem('mixtape_kids_max_vol', String(remoteSettings.kidsMaxVol));
      }
      if (remoteSettings.favoritesViewMode) {
        localStorage.setItem('mixtape_favorites_view_mode', remoteSettings.favoritesViewMode);
      }
      if (remoteSettings.jukeboxCredits !== undefined) {
        localStorage.setItem('mixtape_jukebox_credits', String(remoteSettings.jukeboxCredits));
      }
    }

    return {
      playlists: mergedPlaylists,
      likedTracks: mergedLiked,
      settingsBundle: winningSettings,
    };
  }

  // --- Debounced & Immediate Push to Cloud ---

  public schedulePush(playlists: Playlist[], likedTracks: Track[]): void {
    if (this.pushDebounceTimer) {
      window.clearTimeout(this.pushDebounceTimer);
    }
    this.pushDebounceTimer = window.setTimeout(() => {
      this.pushNow(playlists, likedTracks);
    }, 600);
  }

  public async pushNow(playlists: Playlist[], likedTracks: Track[]): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus('offline');
      return false;
    }

    this.setStatus('syncing');

    try {
      const body: CompactPayloadBody = {
        p: playlists.map(toCompactPlaylist),
        l: likedTracks.map(toCompactTrack),
        tb: this.getTombstones(),
        sb: this.getLocalSettingsBundle(),
      };

      const encoded = encodePayload(JSON.stringify(body), this.syncCode);
      const CHUNK_SIZE = 2800; // Safe size under 4KB per message
      const totalChunks = Math.max(1, Math.ceil(encoded.length / CHUNK_SIZE));
      const rev = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
      const topic = getTopicForSyncCode(this.syncCode);

      for (let idx = 0; idx < totalChunks; idx++) {
        const slice = encoded.slice(idx * CHUNK_SIZE, (idx + 1) * CHUNK_SIZE);
        const packet: CompactWirePacket = {
          v: 1,
          rev,
          chunkIdx: idx,
          totalChunks,
          senderId: this.senderId,
          senderLabel: this.senderLabel,
          ts: Date.now(),
          data: slice,
        };

        await fetch(`https://ntfy.sh/${topic}`, {
          method: 'POST',
          body: JSON.stringify(packet),
        });
      }

      // Also sync to Firebase if configured
      if (firebaseService.isConfigured()) {
        await Promise.all([
          firebaseService.savePlaylists(playlists),
          firebaseService.saveLikedTracks(likedTracks),
        ]);
      }

      this.lastSyncedAt = Date.now();
      localStorage.setItem(LAST_SYNC_TS_KEY, String(this.lastSyncedAt));
      this.setStatus('synced');
      return true;
    } catch (e) {
      console.warn('Cloud push error:', e);
      this.setStatus('error');
      return false;
    }
  }

  // --- Pull from Cloud on Startup / Focus / Manual Refresh ---

  public async pullNow(
    currentPlaylists: Playlist[],
    currentLiked: Track[]
  ): Promise<{
    playlists: Playlist[];
    likedTracks: Track[];
    settingsBundle?: SyncSettingsBundle;
  }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus('offline');
      return { playlists: currentPlaylists, likedTracks: currentLiked };
    }

    this.setStatus('syncing');
    const topic = getTopicForSyncCode(this.syncCode);

    try {
      const response = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=all`);
      if (!response.ok) {
        this.setStatus('idle');
        return { playlists: currentPlaylists, likedTracks: currentLiked };
      }

      const text = await response.text();
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      // Group packets by revision (rev) and pick the latest complete revision
      const revisions = new Map<
        string,
        { ts: number; total: number; senderLabel: string; chunks: Map<number, string> }
      >();

      for (const line of lines) {
        try {
          const env = JSON.parse(line);
          if (env.event !== 'message' || typeof env.message !== 'string') continue;
          const pkt: CompactWirePacket = JSON.parse(env.message);
          if (!pkt || pkt.v !== 1) continue;

          let revEntry = revisions.get(pkt.rev);
          if (!revEntry) {
            revEntry = {
              ts: pkt.ts || 0,
              total: pkt.totalChunks || 1,
              senderLabel: pkt.senderLabel || 'Dispositivo vinculado',
              chunks: new Map(),
            };
            revisions.set(pkt.rev, revEntry);
          }
          revEntry.chunks.set(pkt.chunkIdx, pkt.data);
        } catch {}
      }

      // Find the newest complete revision
      let newestRev: {
        ts: number;
        total: number;
        senderLabel: string;
        chunks: Map<number, string>;
      } | null = null;

      for (const entry of revisions.values()) {
        if (entry.chunks.size === entry.total) {
          if (!newestRev || entry.ts >= newestRev.ts) {
            newestRev = entry;
          }
        }
      }

      if (newestRev) {
        let combined = '';
        for (let i = 0; i < newestRev.total; i++) {
          combined += newestRev.chunks.get(i) || '';
        }
        const jsonStr = decodePayload(combined, this.syncCode);
        const body: CompactPayloadBody = JSON.parse(jsonStr);

        const remotePlaylists: Playlist[] = (body.p || []).map(fromCompactPlaylist);

        const remoteLiked: Track[] = (body.l || []).map(fromCompactTrack);
        const remoteTombstones: SyncTombstones = body.tb || { playlists: {}, liked: {} };

        const merged = this.mergeStates(
          currentPlaylists,
          currentLiked,
          this.getTombstones(),
          remotePlaylists,
          remoteLiked,
          remoteTombstones,
          body.sb
        );

        this.lastSyncedAt = Date.now();
        this.lastRemoteDevice = newestRev.senderLabel;
        localStorage.setItem(LAST_SYNC_TS_KEY, String(this.lastSyncedAt));
        this.setStatus('synced');
        this.dataListeners.forEach((cb) => cb(merged));
        return merged;
      }

      this.setStatus('synced');
      return { playlists: currentPlaylists, likedTracks: currentLiked };
    } catch (e) {
      console.warn('Cloud pull error:', e);
      this.setStatus('error');
      return { playlists: currentPlaylists, likedTracks: currentLiked };
    }
  }

  // --- Offline File Backup Export & Import (.json) ---

  public exportBackupJson(playlists: Playlist[], likedTracks: Track[]): string {
    const snapshot: FullSyncSnapshot = {
      v: 1,
      syncCode: this.syncCode,
      senderId: this.senderId,
      senderLabel: this.senderLabel,
      timestamp: Date.now(),
      playlists,
      likedTracks,
      tombstones: this.getTombstones(),
      settingsBundle: this.getLocalSettingsBundle(),
    };
    return JSON.stringify(snapshot, null, 2);
  }

  public importBackupJson(
    rawJson: string,
    currentPlaylists: Playlist[],
    currentLiked: Track[]
  ): { success: boolean; error?: string } {
    try {
      const parsed: FullSyncSnapshot = JSON.parse(rawJson);
      if (!parsed || !Array.isArray(parsed.playlists)) {
        return { success: false, error: 'Archivo de copia de seguridad no válido.' };
      }

      const merged = this.mergeStates(
        currentPlaylists,
        currentLiked,
        this.getTombstones(),
        parsed.playlists || [],
        parsed.likedTracks || [],
        parsed.tombstones || { playlists: {}, liked: {} },
        parsed.settingsBundle
      );

      this.dataListeners.forEach((cb) => cb(merged));
      this.schedulePush(merged.playlists, merged.likedTracks);
      return { success: true };
    } catch {
      return { success: false, error: 'No se pudo leer el archivo JSON.' };
    }
  }
}

export const syncService = new SyncService();

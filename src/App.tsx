import React, { useState } from 'react';
import { Clock, KeyRound, LogOut, ShieldCheck, QrCode, CheckCircle2, X, Settings } from 'lucide-react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { LibraryProvider, useLibrary } from './context/LibraryContext';
import { ThemeProvider } from './context/ThemeContext';
import { KidsModeProvider, useKidsMode } from './context/KidsModeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { HomeTab } from './components/HomeTab';
import { SearchTab } from './components/SearchTab';
import { LibraryTab } from './components/LibraryTab';
import { KidsTab } from './components/KidsTab';
import { PlaylistModal } from './components/PlaylistModal';
import { SettingsModal } from './components/SettingsModal';
import { SyncModal } from './components/SyncModal';
import { KidsModeModal } from './components/KidsModeModal';
import { ParentalExitModal } from './components/ParentalExitModal';
import { AccessGateModal } from './components/AccessGateModal';
import { AdminLicenseModal } from './components/AdminLicenseModal';
import { RetroTapeDeck } from './components/RetroTapeDeck';
import { ReggaetonPrankModal } from './components/ReggaetonPrankModal';
import { SpotifyCsvTapeModal } from './components/SpotifyCsvTapeModal';
import { isReggaetonTag, shouldTriggerReggaetonJoke } from './services/prankService';
import type { Track } from './types/music';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isSpotifyCsvModalOpen, setIsSpotifyCsvModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isKidsModalOpen, setIsKidsModalOpen] = useState(false);
  const [isParentalExitOpen, setIsParentalExitOpen] = useState(false);
  const [trackToAdd, setTrackToAdd] = useState<Track | null>(null);
  const [tracksToAdd, setTracksToAdd] = useState<Track[] | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [prankPendingAction, setPrankPendingAction] = useState<(() => void) | null>(null);

  const { currentTrack, isFullScreenPlayerOpen, setFullScreenPlayerOpen } = usePlayer();
  const { syncState, dismissJustLinkedBanner } = useLibrary();
  const { isKidsMode } = useKidsMode();
  const {
    deviceId,
    session,
    isTrialActive,
    trialRemainingSeconds,
    setLoginModalOpen,
    setAdminModalOpen,
    logout,
  } = useAuth();

  const formatTrialTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleOpenAddToPlaylist = (track?: Track | null) => {
    setTrackToAdd(track ?? currentTrack);
    setTracksToAdd(null);
    setIsPlaylistModalOpen(true);
  };

  const handleOpenAddMultipleToPlaylist = (tracks: Track[]) => {
    setTracksToAdd(tracks);
    setTrackToAdd(null);
    setIsPlaylistModalOpen(true);
  };

  const handleSearchGenre = (genre: string) => {
    const continueAction = () => {
      setSearchQuery(genre);
      setActiveTab('search');
    };

    if (isReggaetonTag(genre) && shouldTriggerReggaetonJoke()) {
      setPrankPendingAction(() => continueAction);
    } else {
      continueAction();
    }
  };

  // Check if activeTab points to a playlist
  const isPlaylistRoute = activeTab.startsWith('playlist:');
  const playlistIdFromRoute = isPlaylistRoute ? activeTab.replace('playlist:', '') : null;

  return (
    <div className="flex h-[100dvh] w-full max-w-full overflow-hidden bg-[#09090b] text-[#f4f4f5]">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedPlaylistId(null);
        }}
        openNewPlaylistModal={() => {
          setTrackToAdd(null);
          setIsPlaylistModalOpen(true);
        }}
        openSpotifyCsvModal={() => setIsSpotifyCsvModalOpen(true)}
        openSettingsModal={() => setIsSettingsModalOpen(true)}
        openKidsModal={() => setIsKidsModalOpen(true)}
        openExitKidsModal={() => setIsParentalExitOpen(true)}
        openSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Main View Area - Responsive with min-w-0 to prevent flex horizontal overflow */}
      <main className="flex-1 flex flex-col h-full w-full max-w-full min-w-0 overflow-y-auto overflow-x-hidden safe-top relative px-2.5 sm:px-6 md:px-10 pt-3 md:pt-6 pb-44 md:pb-8">
        {/* Banner shown when user scans a QR code to link this device */}
        {syncState.justLinkedFromUrl && (
          <div className="w-full max-w-5xl mx-auto mb-3 px-3.5 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>¡Dispositivo vinculado por QR ({syncState.syncCode})!</strong> Tus listas, favoritos y ajustes ya se sincronizan automáticamente.
              </span>
            </div>
            <button
              onClick={dismissJustLinkedBanner}
              className="p-1 rounded-lg text-emerald-300 hover:bg-emerald-500/20 shrink-0"
              aria-label="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Trial Countdown / Mobile Session Status Bar */}
        {isTrialActive ? (
          <div className="w-full max-w-5xl mx-auto mb-3.5 px-3.5 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 text-xs font-mono relative z-30 shrink-0 shadow-lg">
            <div className="flex items-center gap-2 text-emerald-300">
              <Clock className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
              <span>
                MODO PRUEBA: <strong>{formatTrialTime(trialRemainingSeconds)}</strong>
              </span>
              <span className="text-zinc-400 hidden sm:inline">• ID: {deviceId}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 active:bg-amber-500/35 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Sincronizar con QR"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 border border-white/20 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Abrir Ajustes"
              >
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>Ajustes</span>
              </button>
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Activar Cuenta
              </button>
            </div>
          </div>
        ) : session ? (
          <div className="w-full max-w-5xl mx-auto mb-3.5 px-3.5 py-2.5 rounded-2xl bg-[#111622]/95 border border-amber-500/30 flex md:hidden flex-wrap items-center justify-between gap-2 text-xs font-mono relative z-30 shrink-0 shadow-lg">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-white font-bold truncate">{session.username}</span>
              <span className="text-[10px] text-zinc-400">({deviceId})</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 active:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                title="Sincronizar dispositivos por QR"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 border border-white/20 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Abrir Ajustes"
              >
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>Ajustes</span>
              </button>
              {session.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 active:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Claves VIP</span>
                </button>
              )}
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-xl bg-white/10 text-zinc-300 hover:text-red-400 active:bg-red-500/20"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Subtle Ambient 80s Rock Tape on the right lateral side (Large screens, hidden in Kids Mode) */}
        {!isKidsMode && (
          <div className="fixed right-8 bottom-28 pointer-events-none opacity-25 hover:opacity-45 transition-opacity hidden xl:block z-0">
            <RetroTapeDeck variant="ambient-lateral" />
          </div>
        )}

        {isKidsMode ? (
          <KidsTab onOpenExitModal={() => setIsParentalExitOpen(true)} />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeTab
                onSearchGenre={handleSearchGenre}
                onOpenSyncModal={() => setIsSyncModalOpen(true)}
                onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
              />
            )}

            {activeTab === 'search' && (
              <SearchTab
                onSelectTrackForPlaylist={handleOpenAddToPlaylist}
                onSelectMultipleForPlaylist={handleOpenAddMultipleToPlaylist}
                onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
                onNavigateToPlaylist={(playlistId) => {
                  setSelectedPlaylistId(playlistId);
                  setActiveTab('library');
                }}
                initialQuery={searchQuery}
              />
            )}

            {activeTab === 'library' && (
              <LibraryTab
                openNewPlaylistModal={() => {
                  setTrackToAdd(null);
                  setIsPlaylistModalOpen(true);
                }}
                openSpotifyCsvModal={() => setIsSpotifyCsvModalOpen(true)}
                openSyncModal={() => setIsSyncModalOpen(true)}
                openSettingsModal={() => setIsSettingsModalOpen(true)}
                onNavigateToSearch={() => setActiveTab('search')}
                selectedPlaylistId={selectedPlaylistId}
                setSelectedPlaylistId={setSelectedPlaylistId}
              />
            )}

            {activeTab === 'favorites' && (
              <LibraryTab
                openNewPlaylistModal={() => {}}
                openSpotifyCsvModal={() => setIsSpotifyCsvModalOpen(true)}
                openSyncModal={() => setIsSyncModalOpen(true)}
                openSettingsModal={() => setIsSettingsModalOpen(true)}
                selectedPlaylistId="favorites"
                setSelectedPlaylistId={() => setActiveTab('library')}
                isFavoritesView={true}
              />
            )}

            {isPlaylistRoute && playlistIdFromRoute && (
              <LibraryTab
                openNewPlaylistModal={() => {}}
                openSpotifyCsvModal={() => setIsSpotifyCsvModalOpen(true)}
                openSyncModal={() => setIsSyncModalOpen(true)}
                openSettingsModal={() => setIsSettingsModalOpen(true)}
                selectedPlaylistId={playlistIdFromRoute}
                setSelectedPlaylistId={() => setActiveTab('library')}
              />
            )}
          </>
        )}
      </main>

      {/* Mini Player */}
      <MiniPlayer />

      {/* Full Screen Player Modal */}
      <FullScreenPlayer onOpenAddToPlaylist={() => handleOpenAddToPlaylist(currentTrack)} />

      {/* Mobile Bottom Navigation (Hidden when FullScreenPlayer is open to maximize playback space) */}
      {!isFullScreenPlayerOpen && (
        <BottomNav
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSelectedPlaylistId(null);
            setFullScreenPlayerOpen(false);
          }}
          openSettingsModal={() => {
            setFullScreenPlayerOpen(false);
            setIsSettingsModalOpen(true);
          }}
          openKidsModal={() => {
            setFullScreenPlayerOpen(false);
            setIsKidsModalOpen(true);
          }}
          openExitKidsModal={() => {
            setFullScreenPlayerOpen(false);
            setIsParentalExitOpen(true);
          }}
          openSyncModal={() => {
            setFullScreenPlayerOpen(false);
            setIsSyncModalOpen(true);
          }}
        />
      )}

      {/* Modals */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => {
          setIsPlaylistModalOpen(false);
          setTrackToAdd(null);
          setTracksToAdd(null);
        }}
        trackToAdd={trackToAdd}
        tracksToAdd={tracksToAdd}
      />

      <SpotifyCsvTapeModal
        isOpen={isSpotifyCsvModalOpen}
        onClose={() => setIsSpotifyCsvModalOpen(false)}
        onOpenPlaylist={(id) => {
          setSelectedPlaylistId(id);
          setActiveTab('library');
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onOpenKidsModal={() => setIsKidsModalOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      <KidsModeModal
        isOpen={isKidsModalOpen}
        onClose={() => setIsKidsModalOpen(false)}
      />

      <ParentalExitModal
        isOpen={isParentalExitOpen}
        onClose={() => setIsParentalExitOpen(false)}
      />

      {/* Access Control & Admin License Generator Modals */}
      <AccessGateModal />
      <AdminLicenseModal />

      {/* Reggaeton Joke / Prank Modal */}
      <ReggaetonPrankModal
        isOpen={!!prankPendingAction}
        onAccept={() => {
          const action = prankPendingAction;
          setPrankPendingAction(null);
          if (action) action();
        }}
      />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LibraryProvider>
          <PlayerProvider>
            <KidsModeProvider>
              <AppContent />
            </KidsModeProvider>
          </PlayerProvider>
        </LibraryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

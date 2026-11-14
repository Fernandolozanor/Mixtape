import React, { useState } from 'react';
import { Clock, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { LibraryProvider } from './context/LibraryContext';
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
import { KidsModeModal } from './components/KidsModeModal';
import { ParentalExitModal } from './components/ParentalExitModal';
import { AccessGateModal } from './components/AccessGateModal';
import { AdminLicenseModal } from './components/AdminLicenseModal';
import { RetroTapeDeck } from './components/RetroTapeDeck';
import type { Track } from './types/music';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isKidsModalOpen, setIsKidsModalOpen] = useState(false);
  const [isParentalExitOpen, setIsParentalExitOpen] = useState(false);
  const [trackToAdd, setTrackToAdd] = useState<Track | null>(null);
  const [tracksToAdd, setTracksToAdd] = useState<Track[] | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const { currentTrack, isFullScreenPlayerOpen, setFullScreenPlayerOpen } = usePlayer();
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
    setSearchQuery(genre);
    setActiveTab('search');
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
        openSettingsModal={() => setIsSettingsModalOpen(true)}
        openKidsModal={() => setIsKidsModalOpen(true)}
        openExitKidsModal={() => setIsParentalExitOpen(true)}
      />

      {/* Main View Area - Responsive with min-w-0 to prevent flex horizontal overflow */}
      <main className="flex-1 flex flex-col h-full w-full max-w-full min-w-0 overflow-y-auto overflow-x-hidden safe-top relative px-2.5 sm:px-6 md:px-10 pt-3 md:pt-6 pb-44 md:pb-8">
        {/* Top Trial Countdown / Mobile Session Status Bar */}
        {isTrialActive ? (
          <div className="w-full max-w-5xl mx-auto mb-3 px-3 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-emerald-300">
              <Clock className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
              <span>
                MODO PRUEBA: <strong>{formatTrialTime(trialRemainingSeconds)}</strong>
              </span>
              <span className="text-zinc-400 hidden sm:inline">• ID: {deviceId}</span>
            </div>
            <button
              onClick={() => setLoginModalOpen(true)}
              className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-[11px] uppercase tracking-wider transition"
            >
              Activar Cuenta
            </button>
          </div>
        ) : session ? (
          <div className="w-full max-w-5xl mx-auto mb-3 px-3 py-2 rounded-2xl bg-black/50 border border-white/10 flex md:hidden items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-white font-bold truncate">{session.username}</span>
              <span className="text-[10px] text-zinc-500">({deviceId})</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {session.role === 'admin' && (
                <button
                  onClick={() => setAdminModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[10px] flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  Claves VIP
                </button>
              )}
              <button
                onClick={logout}
                className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-red-400"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
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
              <HomeTab onSearchGenre={handleSearchGenre} />
            )}

            {activeTab === 'search' && (
              <SearchTab
                onSelectTrackForPlaylist={handleOpenAddToPlaylist}
                onSelectMultipleForPlaylist={handleOpenAddMultipleToPlaylist}
                initialQuery={searchQuery}
              />
            )}

            {activeTab === 'library' && (
              <LibraryTab
                openNewPlaylistModal={() => {
                  setTrackToAdd(null);
                  setIsPlaylistModalOpen(true);
                }}
                selectedPlaylistId={selectedPlaylistId}
                setSelectedPlaylistId={setSelectedPlaylistId}
              />
            )}

            {activeTab === 'favorites' && (
              <LibraryTab
                openNewPlaylistModal={() => {}}
                selectedPlaylistId="favorites"
                setSelectedPlaylistId={() => setActiveTab('library')}
                isFavoritesView={true}
              />
            )}

            {isPlaylistRoute && playlistIdFromRoute && (
              <LibraryTab
                openNewPlaylistModal={() => {}}
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

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onOpenKidsModal={() => setIsKidsModalOpen(true)}
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

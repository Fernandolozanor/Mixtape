import React, { useState } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { LibraryProvider } from './context/LibraryContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { HomeTab } from './components/HomeTab';
import { SearchTab } from './components/SearchTab';
import { LibraryTab } from './components/LibraryTab';
import { PlaylistModal } from './components/PlaylistModal';
import { SettingsModal } from './components/SettingsModal';
import { RetroTapeDeck } from './components/RetroTapeDeck';
import type { Track } from './types/music';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [trackToAdd, setTrackToAdd] = useState<Track | null>(null);
  const [tracksToAdd, setTracksToAdd] = useState<Track[] | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const { currentTrack, isFullScreenPlayerOpen, setFullScreenPlayerOpen } = usePlayer();

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
      />

      {/* Main View Area - Responsive with min-w-0 to prevent flex horizontal overflow */}
      <main className="flex-1 flex flex-col h-full w-full max-w-full min-w-0 overflow-y-auto overflow-x-hidden safe-top relative px-2.5 sm:px-6 md:px-10 pt-3 md:pt-6 pb-44 md:pb-8">
        {/* Subtle Ambient 80s Rock Tape on the right lateral side (Large screens) */}
        <div className="fixed right-8 bottom-28 pointer-events-none opacity-25 hover:opacity-45 transition-opacity hidden xl:block z-0">
          <RetroTapeDeck variant="ambient-lateral" />
        </div>
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
      />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <LibraryProvider>
        <PlayerProvider>
          <AppContent />
        </PlayerProvider>
      </LibraryProvider>
    </ThemeProvider>
  );
}

export default App;

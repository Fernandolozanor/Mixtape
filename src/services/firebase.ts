import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, type Firestore } from 'firebase/firestore';
import type { Playlist, Track } from '../types/music';

// Default / Local fallback key
const FIREBASE_CONFIG_KEY = 'pulse_firebase_config';

class FirebaseService {
  private app: FirebaseApp | null = null;
  private auth: any = null;
  private db: Firestore | null = null;
  private currentUser: User | null = null;
  private authListeners: ((user: User | null) => void)[] = [];

  constructor() {
    this.initFromStoredConfig();
  }

  private initFromStoredConfig() {
    try {
      const stored = localStorage.getItem(FIREBASE_CONFIG_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        this.initialize(config);
      }
    } catch (e) {
      console.warn('Could not load stored Firebase config:', e);
    }
  }

  public initialize(config: Record<string, string>): boolean {
    try {
      if (!config.apiKey || !config.projectId) {
        return false;
      }

      if (getApps().length > 0) {
        this.app = getApps()[0];
      } else {
        this.app = initializeApp(config);
      }

      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);

      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        this.authListeners.forEach((listener) => listener(user));
      });

      localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
      return true;
    } catch (err) {
      console.error('Firebase initialization error:', err);
      return false;
    }
  }

  public isConfigured(): boolean {
    return this.app !== null && this.db !== null;
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public onAuthChange(callback: (user: User | null) => void) {
    this.authListeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.authListeners = this.authListeners.filter((l) => l !== callback);
    };
  }

  public async loginAnonymously(): Promise<User | null> {
    if (!this.auth) return null;
    try {
      const credential = await signInAnonymously(this.auth);
      return credential.user;
    } catch (err) {
      console.error('Anonymous sign in error:', err);
      return null;
    }
  }

  public async loginWithGoogle(): Promise<User | null> {
    if (!this.auth) return null;
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      return credential.user;
    } catch (err) {
      console.error('Google sign in error:', err);
      return null;
    }
  }

  public async logout(): Promise<void> {
    if (this.auth) {
      await signOut(this.auth);
    }
  }

  // --- Firestore Syncing ---

  public async savePlaylists(playlists: Playlist[]): Promise<void> {
    if (!this.db || !this.currentUser) {
      // Local fallback
      localStorage.setItem('pulse_local_playlists', JSON.stringify(playlists));
      return;
    }

    try {
      const userDocRef = doc(this.db, 'users', this.currentUser.uid);
      await setDoc(userDocRef, { playlists, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error('Error saving playlists to Firestore:', err);
    }
  }

  public async loadPlaylists(): Promise<Playlist[]> {
    if (!this.db || !this.currentUser) {
      const local = localStorage.getItem('pulse_local_playlists');
      return local ? JSON.parse(local) : [];
    }

    try {
      const userDocRef = doc(this.db, 'users', this.currentUser.uid);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        return data.playlists || [];
      }
    } catch (err) {
      console.error('Error loading playlists from Firestore:', err);
    }

    const local = localStorage.getItem('pulse_local_playlists');
    return local ? JSON.parse(local) : [];
  }

  public async saveLikedTracks(tracks: Track[]): Promise<void> {
    if (!this.db || !this.currentUser) {
      localStorage.setItem('pulse_local_liked', JSON.stringify(tracks));
      return;
    }

    try {
      const userDocRef = doc(this.db, 'users', this.currentUser.uid);
      await setDoc(userDocRef, { likedTracks: tracks, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error('Error saving liked tracks to Firestore:', err);
    }
  }

  public async loadLikedTracks(): Promise<Track[]> {
    if (!this.db || !this.currentUser) {
      const local = localStorage.getItem('pulse_local_liked');
      return local ? JSON.parse(local) : [];
    }

    try {
      const userDocRef = doc(this.db, 'users', this.currentUser.uid);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        return data.likedTracks || [];
      }
    } catch (err) {
      console.error('Error loading liked tracks from Firestore:', err);
    }

    const local = localStorage.getItem('pulse_local_liked');
    return local ? JSON.parse(local) : [];
  }
}

export const firebaseService = new FirebaseService();

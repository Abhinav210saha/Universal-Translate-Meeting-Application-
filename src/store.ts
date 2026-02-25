import { create } from 'zustand';

interface AppState {
  roomName: string;
  userName: string;
  spokenLanguage: string;
  targetLanguage: string;
  setRoomName: (name: string) => void;
  setUserName: (name: string) => void;
  setSpokenLanguage: (lang: string) => void;
  setTargetLanguage: (lang: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  roomName: '',
  userName: '',
  spokenLanguage: 'en',
  targetLanguage: 'es',
  setRoomName: (roomName) => set({ roomName }),
  setUserName: (userName) => set({ userName }),
  setSpokenLanguage: (spokenLanguage) => set({ spokenLanguage }),
  setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
}));

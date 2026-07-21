import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// App-wide light/dark theme. Toggle lives in the sidebar drawer (drivers/admins)
// and the rider header. New surfaces (rider view, drawer) consume `useTheme()`;
// legacy screens are still light until themed.
const PALETTES = {
  light: {
    mode: 'light',
    bg: '#f5f5f5',
    card: '#ffffff',
    elevated: '#ffffff',
    text: '#000000',
    subtext: '#888888',
    border: '#ececec',
    inputBg: '#f0f0f0',
    accent: '#0061bd',
    mapStyle: 'streets-v12',
  },
  dark: {
    mode: 'dark',
    bg: '#0e0e10',
    card: '#1a1a1d',
    elevated: '#232327',
    text: '#ffffff',
    subtext: '#9a9a9f',
    border: '#2a2a2e',
    inputBg: '#232327',
    accent: '#4a9eff',
    mapStyle: 'dark-v11',
  },
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      mode: 'light',
      toggle: () => set({ mode: get().mode === 'light' ? 'dark' : 'light' }),
      setMode: (mode) => set({ mode }),
    }),
    { name: 'theme-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);

// Convenience hook: current palette. `useTheme().text`, `.card`, etc.
export function useTheme() {
  const mode = useThemeStore(s => s.mode);
  return PALETTES[mode] || PALETTES.light;
}

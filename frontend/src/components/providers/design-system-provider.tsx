import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Theme Presets
 * Each preset defines a distinct visual personality:
 * - calm: Soft, muted colors. Gentle transitions. Reading-focused.
 * - vibrant: High saturation, bold colors. Energetic feel.
 * - minimal: Monochromatic, subtle. Content-first approach.
 * - forest: Nature-inspired. Green accents, earthy tones.
 */
export type ThemePreset = 'calm' | 'vibrant' | 'minimal' | 'forest';

/**
 * Color Modes
 * Controls light/dark appearance independent of preset
 */
export type ColorMode = 'light' | 'dark' | 'system';

interface DesignSystemState {
  /** Current visual preset */
  preset: ThemePreset;
  /** Current color mode */
  colorMode: ColorMode;
  /** Resolved color mode (system resolves to light/dark) */
  resolvedColorMode: 'light' | 'dark';
  /** Update the theme preset */
  setPreset: (preset: ThemePreset) => void;
  /** Update the color mode */
  setColorMode: (mode: ColorMode) => void;
}

const STORAGE_KEYS = {
  PRESET: 'kv-theme-preset',
  COLOR_MODE: 'kv-color-mode',
} as const;

const DEFAULT_PRESET: ThemePreset = 'calm';
const DEFAULT_COLOR_MODE: ColorMode = 'system';

const DesignSystemContext = createContext<DesignSystemState | undefined>(undefined);

function getSystemColorMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredPreset(): ThemePreset {
  if (typeof window === 'undefined') return DEFAULT_PRESET;
  const stored = localStorage.getItem(STORAGE_KEYS.PRESET);
  if (stored && ['calm', 'vibrant', 'minimal', 'forest'].includes(stored)) {
    return stored as ThemePreset;
  }
  return DEFAULT_PRESET;
}

function getStoredColorMode(): ColorMode {
  if (typeof window === 'undefined') return DEFAULT_COLOR_MODE;
  const stored = localStorage.getItem(STORAGE_KEYS.COLOR_MODE);
  if (stored && ['light', 'dark', 'system'].includes(stored)) {
    return stored as ColorMode;
  }
  return DEFAULT_COLOR_MODE;
}

interface DesignSystemProviderProps {
  children: React.ReactNode;
  defaultPreset?: ThemePreset;
  defaultColorMode?: ColorMode;
}

export function DesignSystemProvider({
  children,
  defaultPreset,
  defaultColorMode,
}: DesignSystemProviderProps) {
  const [preset, setPresetState] = useState<ThemePreset>(
    () => defaultPreset ?? getStoredPreset()
  );
  const [colorMode, setColorModeState] = useState<ColorMode>(
    () => defaultColorMode ?? getStoredColorMode()
  );
  const [resolvedColorMode, setResolvedColorMode] = useState<'light' | 'dark'>(
    () => (colorMode === 'system' ? getSystemColorMode() : colorMode)
  );

  // Apply classes to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Add transition class for smooth theme changes
    root.classList.add('theme-transitioning');
    
    // Remove old preset classes and add new one
    root.classList.remove('theme-calm', 'theme-vibrant', 'theme-minimal', 'theme-forest');
    root.classList.add(`theme-${preset}`);
    
    // Remove old color mode and add new one
    root.classList.remove('light', 'dark');
    const effectiveMode = colorMode === 'system' ? getSystemColorMode() : colorMode;
    root.classList.add(effectiveMode);
    setResolvedColorMode(effectiveMode);
    
    // Remove transition class after animation completes
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [preset, colorMode]);

  // Listen for system color scheme changes
  useEffect(() => {
    if (colorMode !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(e.matches ? 'dark' : 'light');
      setResolvedColorMode(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [colorMode]);

  const setPreset = (newPreset: ThemePreset) => {
    localStorage.setItem(STORAGE_KEYS.PRESET, newPreset);
    setPresetState(newPreset);
  };

  const setColorMode = (mode: ColorMode) => {
    localStorage.setItem(STORAGE_KEYS.COLOR_MODE, mode);
    setColorModeState(mode);
  };

  const value: DesignSystemState = {
    preset,
    colorMode,
    resolvedColorMode,
    setPreset,
    setColorMode,
  };

  return (
    <DesignSystemContext.Provider value={value}>
      {children}
    </DesignSystemContext.Provider>
  );
}

/**
 * Hook to access the design system context
 */
export function useDesignSystem() {
  const context = useContext(DesignSystemContext);
  if (context === undefined) {
    throw new Error('useDesignSystem must be used within a DesignSystemProvider');
  }
  return context;
}

/**
 * Hook for just the theme preset
 */
export function useThemePreset() {
  const { preset, setPreset } = useDesignSystem();
  return { preset, setPreset };
}

/**
 * Hook for just the color mode
 */
export function useColorMode() {
  const { colorMode, resolvedColorMode, setColorMode } = useDesignSystem();
  return { colorMode, resolvedColorMode, setColorMode };
}

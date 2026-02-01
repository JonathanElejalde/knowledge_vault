import React, { createContext, useContext } from 'react';
import { useColorMode, type ColorMode } from './design-system-provider';

/**
 * @deprecated Use DesignSystemProvider and useColorMode/useDesignSystem instead.
 * This provider is kept for backward compatibility only.
 */

type Theme = ColorMode; // 'dark' | 'light' | 'system'

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

/**
 * @deprecated Use DesignSystemProvider instead.
 * This component now wraps the new design system for backward compatibility.
 */
export function ThemeProvider({
  children,
}: ThemeProviderProps) {
  const { colorMode, setColorMode } = useColorMode();

  const value: ThemeProviderState = {
    theme: colorMode,
    setTheme: setColorMode,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

/**
 * @deprecated Use useColorMode from design-system-provider instead.
 */
export const useTheme = () => {
  // Try new design system first
  try {
    const { colorMode, setColorMode } = useColorMode();
    return { theme: colorMode, setTheme: setColorMode };
  } catch {
    // Fall back to legacy context
    const context = useContext(ThemeProviderContext);
    if (context === undefined) {
      throw new Error('useTheme must be used within a ThemeProvider or DesignSystemProvider');
    }
    return context;
  }
};

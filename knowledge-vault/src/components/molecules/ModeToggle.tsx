import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import { Button } from '@/components/atoms/Button';
// A DropdownMenu would be more conventional here, but for simplicity,
// we'll start with a simple button that toggles between light and dark.
// We can enhance this later if a dropdown for 'system' is needed.

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    // If you want to cycle through light, dark, system:
    // if (theme === 'light') setTheme('dark');
    // else if (theme === 'dark') setTheme('system');
    // else setTheme('light');
  };

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
} 
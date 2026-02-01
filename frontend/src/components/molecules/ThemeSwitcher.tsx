import React from 'react';
import { useColorMode, type ColorMode } from '@/components/providers/design-system-provider';
import { Button } from '@/components/atoms/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/atoms/DropdownMenu';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ThemeSwitcher
 * 
 * Simple dropdown for switching between light/dark/system color modes.
 * 
 * Note: The preset system is retained in the codebase for future palette swaps.
 * To change the color palette, edit the CSS variables in:
 * - src/styles/tokens/colors.css (base palette tokens)
 * - src/styles/presets.css (preset overrides)
 * 
 * The `theme-calm` preset is applied by default. To swap palettes:
 * 1. Update the --palette-* tokens in colors.css
 * 2. Or modify the .theme-calm class in presets.css
 */

const colorModeOptions: { value: ColorMode; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

interface ThemeSwitcherProps {
  className?: string;
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { colorMode, resolvedColorMode, setColorMode } = useColorMode();

  // Show the current mode's icon in the trigger
  const CurrentIcon = resolvedColorMode === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label="Color mode"
        >
          <CurrentIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {colorModeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setColorMode(option.value)}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                colorMode === option.value && 'bg-accent-primary-subtle'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeSwitcher;

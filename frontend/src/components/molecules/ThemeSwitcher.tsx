import React from 'react';
import { useDesignSystem, type ThemePreset, type ColorMode } from '@/components/providers/design-system-provider';
import { Button } from '@/components/atoms/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/atoms/DropdownMenu';
import { Palette, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ThemeSwitcher
 * 
 * Dropdown menu for switching between theme presets and color modes.
 * Shows current selection and provides preview indicators.
 */

const presetOptions: { value: ThemePreset; label: string; description: string }[] = [
  { value: 'calm', label: 'Calm', description: 'Soft, reading-focused' },
  { value: 'vibrant', label: 'Vibrant', description: 'Bold, energetic' },
  { value: 'minimal', label: 'Minimal', description: 'Monochrome, subtle' },
  { value: 'forest', label: 'Forest', description: 'Nature-inspired' },
];

const colorModeOptions: { value: ColorMode; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

interface ThemeSwitcherProps {
  className?: string;
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { preset, colorMode, setPreset, setColorMode } = useDesignSystem();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label="Theme settings"
        >
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Theme Preset</DropdownMenuLabel>
        {presetOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setPreset(option.value)}
            className={cn(
              'flex flex-col items-start gap-0.5 cursor-pointer',
              preset === option.value && 'bg-accent-primary-subtle'
            )}
          >
            <span className="font-medium">{option.label}</span>
            <span className="text-caption text-text-tertiary">{option.description}</span>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Color Mode</DropdownMenuLabel>
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

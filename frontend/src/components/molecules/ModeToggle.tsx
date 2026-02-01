import { Moon, Sun, Monitor } from 'lucide-react';
import { useColorMode } from '@/components/providers/design-system-provider';
import { Button } from '@/components/atoms/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/atoms/DropdownMenu';
import { cn } from '@/lib/utils';

/**
 * ModeToggle
 * 
 * Dropdown menu for switching between light, dark, and system color modes.
 * Uses the new DesignSystem provider.
 */
export function ModeToggle() {
  const { colorMode, resolvedColorMode, setColorMode } = useColorMode();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle color mode">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setColorMode('light')}
          className={cn('cursor-pointer', colorMode === 'light' && 'bg-accent-primary-subtle')}
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setColorMode('dark')}
          className={cn('cursor-pointer', colorMode === 'dark' && 'bg-accent-primary-subtle')}
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setColorMode('system')}
          className={cn('cursor-pointer', colorMode === 'system' && 'bg-accent-primary-subtle')}
        >
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

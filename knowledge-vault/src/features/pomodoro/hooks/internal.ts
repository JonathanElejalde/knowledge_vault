// Internal module pattern to solve circular dependency issues
// This file imports and exports everything from every local module in the correct order
// All other modules should only import from this file, never directly from each other

// 1. Import utilities first (no dependencies)
export * from './useApiCache';

// 2. Import event emitters and triggers (no circular dependencies)
export { triggerSummaryRefresh } from './usePomodoroSummary';
export { triggerWeeklyStatsRefresh } from './usePomodoroWeeklyStats';

// 3. Import hooks that depend on the above
export * from './usePomodoroPreferences';
export * from './usePomodoroSummary';
export * from './usePomodoroWeeklyStats';

// 4. Import main hook last (depends on all others)
export * from './usePomodoro'; 
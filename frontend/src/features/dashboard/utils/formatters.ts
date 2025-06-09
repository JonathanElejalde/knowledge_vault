import { 
  formatChartDate as formatChartDateUtil, 
  formatTimeWithTimezone, 
  getLocalHourFromUTC 
} from '@/lib/utils/dateUtils';

/**
 * Format minutes to hours and minutes display
 * @param minutes - Total minutes
 * @returns Formatted string like "2h 30m" or "45m"
 */
export function formatFocusTime(minutes: number): string {
  if (minutes === 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes}m`;
  }
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format date string to display format
 * Uses timezone-aware formatting for both date-only and datetime strings
 * @param dateString - Date in format "2024-01-15" or UTC datetime string
 * @returns Formatted date like "Jan 15"
 */
export function formatChartDate(dateString: string): string {
  return formatChartDateUtil(dateString);
}

/**
 * Format UTC datetime string to local time only
 * @param utcDatetimeString - UTC datetime in ISO format (e.g., "2025-06-09T19:29:00.841554Z")
 * @returns Time in format "09:00" (local time)
 */
export function formatTime(utcDatetimeString: string): string {
  return formatTimeWithTimezone(utcDatetimeString, false);
}

/**
 * Get hour from UTC datetime string as local hour for chart positioning
 * @param utcDatetimeString - UTC datetime in ISO format
 * @returns Hour as number (0-23) in user's local timezone
 */
export function getHourFromDateTime(utcDatetimeString: string): number {
  return getLocalHourFromUTC(utcDatetimeString);
}

/**
 * Generate a consistent color for a project name
 * @param projectName - Project name
 * @returns Hex color string
 */
export function getProjectColor(projectName: string | null): string {
  if (!projectName) return '#94a3b8'; // Default gray for no project
  
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < projectName.length; i++) {
    hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert hash to HSL color with good saturation and lightness
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
} 
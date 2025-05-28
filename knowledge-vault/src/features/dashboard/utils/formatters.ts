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
 * @param dateString - Date in format "2024-01-15"
 * @returns Formatted date like "Jan 15"
 */
export function formatChartDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Format datetime string to time only
 * @param datetimeString - Datetime in ISO format
 * @returns Time in format "09:00"
 */
export function formatTime(datetimeString: string): string {
  const date = new Date(datetimeString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

/**
 * Get hour from datetime string as number for chart positioning
 * @param datetimeString - Datetime in ISO format
 * @returns Hour as number (0-23)
 */
export function getHourFromDateTime(datetimeString: string): number {
  const date = new Date(datetimeString);
  return date.getHours() + (date.getMinutes() / 60); // Include minutes as decimal
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
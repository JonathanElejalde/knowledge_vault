/**
 * Format a date string for display in a user-friendly format
 * Based on the pattern used in the pomodoro feature
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a session date range, showing relative dates when appropriate
 * Reused from pomodoro feature for consistency
 */
export function formatSessionDateRange(first: string, last: string): string {
  const firstDate = new Date(first);
  const lastDate = new Date(last);
  const isSameDay =
    firstDate.getFullYear() === lastDate.getFullYear() &&
    firstDate.getMonth() === lastDate.getMonth() &&
    firstDate.getDate() === lastDate.getDate();
  
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  
  function isToday(date: Date) {
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }
  
  function isYesterday(date: Date) {
    return (
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate()
    );
  }
  
  if (isSameDay) {
    if (isToday(firstDate)) return 'Today';
    if (isYesterday(firstDate)) return 'Yesterday';
    return formatDate(first);
  } else {
    const firstLabel = isToday(firstDate)
      ? 'Today'
      : isYesterday(firstDate)
      ? 'Yesterday'
      : formatDate(first);
    const lastLabel = isToday(lastDate)
      ? 'Today'
      : isYesterday(lastDate)
      ? 'Yesterday'
      : formatDate(last);
    return `${firstLabel} – ${lastLabel}`;
  }
} 
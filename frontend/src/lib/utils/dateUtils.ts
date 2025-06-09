import { DateTime } from 'luxon';

/**
 * Parse a UTC datetime string and convert it to the user's local timezone
 * @param utcDateString - UTC datetime string (e.g., "2025-06-09T19:29:00.841554Z")
 * @returns DateTime object in user's local timezone
 */
export function parseUTCToLocal(utcDateString: string): DateTime {
  return DateTime.fromISO(utcDateString, { zone: 'utc' }).toLocal();
}

/**
 * Format a UTC datetime string to local time display
 * @param utcDateString - UTC datetime string
 * @param format - Luxon format tokens (optional, defaults to locale format)
 * @returns Formatted string in user's local timezone
 */
export function formatUTCToLocalTime(utcDateString: string, format?: string): string {
  const localDateTime = parseUTCToLocal(utcDateString);
  
  if (format) {
    return localDateTime.toFormat(format);
  }
  
  return localDateTime.toLocaleString(DateTime.TIME_SIMPLE);
}

/**
 * Format a UTC datetime string to local date display
 * @param utcDateString - UTC datetime string
 * @param format - Luxon format tokens (optional, defaults to locale format)
 * @returns Formatted date string in user's local timezone
 */
export function formatUTCToLocalDate(utcDateString: string, format?: string): string {
  const localDateTime = parseUTCToLocal(utcDateString);
  
  if (format) {
    return localDateTime.toFormat(format);
  }
  
  return localDateTime.toLocaleString(DateTime.DATE_SHORT);
}

/**
 * Format a UTC datetime string to local datetime display
 * @param utcDateString - UTC datetime string
 * @param format - Luxon format tokens (optional, defaults to locale format)
 * @returns Formatted datetime string in user's local timezone
 */
export function formatUTCToLocalDateTime(utcDateString: string, format?: string): string {
  const localDateTime = parseUTCToLocal(utcDateString);
  
  if (format) {
    return localDateTime.toFormat(format);
  }
  
  return localDateTime.toLocaleString(DateTime.DATETIME_SHORT);
}

/**
 * Get hour from UTC datetime string as local hour for chart positioning
 * @param utcDateString - UTC datetime string
 * @returns Hour as number (0-23) in user's local timezone
 */
export function getLocalHourFromUTC(utcDateString: string): number {
  const localDateTime = parseUTCToLocal(utcDateString);
  return localDateTime.hour + (localDateTime.minute / 60); // Include minutes as decimal
}

/**
 * Format date for chart display (short month + day)
 * @param dateString - Date string in any format or UTC datetime
 * @returns Formatted date like "Jan 15"
 */
export function formatChartDate(dateString: string): string {
  // Handle both date-only strings and full datetime strings
  let dateTime: DateTime;
  
  if (dateString.includes('T') || dateString.includes('Z')) {
    // Full datetime string - convert from UTC to local
    dateTime = parseUTCToLocal(dateString);
  } else {
    // Date-only string - parse as local date
    dateTime = DateTime.fromISO(dateString);
  }
  
  return dateTime.toFormat('MMM d');
}

/**
 * Format time for display with timezone awareness
 * @param utcDateString - UTC datetime string
 * @param includeTimezone - Whether to include timezone abbreviation
 * @returns Formatted time string
 */
export function formatTimeWithTimezone(utcDateString: string, includeTimezone = false): string {
  const localDateTime = parseUTCToLocal(utcDateString);
  const timeString = localDateTime.toFormat('HH:mm');
  
  if (includeTimezone) {
    const timezone = localDateTime.toFormat('ZZZZ');
    return `${timeString} ${timezone}`;
  }
  
  return timeString;
}

/**
 * Get relative time from UTC datetime string
 * @param utcDateString - UTC datetime string
 * @returns Relative time string like "2 hours ago" or "in 3 minutes"
 */
export function getRelativeTimeFromUTC(utcDateString: string): string {
  const localDateTime = parseUTCToLocal(utcDateString);
  return localDateTime.toRelative() || 'unknown time';
}

/**
 * Check if a UTC datetime is today in the user's local timezone
 * @param utcDateString - UTC datetime string
 * @returns True if the date is today in user's timezone
 */
export function isTodayUTC(utcDateString: string): boolean {
  const localDateTime = parseUTCToLocal(utcDateString);
  const today = DateTime.now();
  return localDateTime.hasSame(today, 'day');
}

/**
 * Get user's timezone information
 * @returns Object with timezone name and abbreviation
 */
export function getUserTimezone(): { name: string; abbreviation: string } {
  const now = DateTime.now();
  return {
    name: now.zoneName,
    abbreviation: now.toFormat('ZZZZ')
  };
}

// ==== EXISTING FUNCTIONS (LEGACY) ====
// These functions are kept for backward compatibility
// Consider migrating to timezone-aware functions above

/**
 * Format a date string for display in a user-friendly format
 * Based on the pattern used in the pomodoro feature
 * @deprecated Use formatUTCToLocalDate for timezone-aware formatting
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
 * @deprecated Use timezone-aware functions for UTC dates
 */
export function formatSessionDateRange(first: string, last: string): string {
  // Handle both UTC datetime strings and date-only strings
  let firstDate: Date;
  let lastDate: Date;
  
  if (first.includes('T') || first.includes('Z')) {
    // UTC datetime - convert to local first
    firstDate = parseUTCToLocal(first).toJSDate();
  } else {
    // Date-only string
    firstDate = new Date(first);
  }
  
  if (last.includes('T') || last.includes('Z')) {
    // UTC datetime - convert to local first
    lastDate = parseUTCToLocal(last).toJSDate();
  } else {
    // Date-only string
    lastDate = new Date(last);
  }
  
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
  
  function formatDateHelper(dateString: string): string {
    if (dateString.includes('T') || dateString.includes('Z')) {
      // UTC datetime - use timezone-aware formatting
      return formatUTCToLocalDate(dateString, 'MMM d, yyyy');
    } else {
      // Date-only string - use standard formatting
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }
  
  if (isSameDay) {
    if (isToday(firstDate)) return 'Today';
    if (isYesterday(firstDate)) return 'Yesterday';
    return formatDateHelper(first);
  } else {
    const firstLabel = isToday(firstDate)
      ? 'Today'
      : isYesterday(firstDate)
      ? 'Yesterday'
      : formatDateHelper(first);
    const lastLabel = isToday(lastDate)
      ? 'Today'
      : isYesterday(lastDate)
      ? 'Yesterday'
      : formatDateHelper(last);
    return `${firstLabel} – ${lastLabel}`;
  }
} 
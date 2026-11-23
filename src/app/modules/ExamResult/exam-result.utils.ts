/**
 * Formats seconds into human-readable display string
 * - If >= 1 hour: "1h 37m" (or "1h 37m 15s" if detailed)
 * - If < 1 hour: "25m 30s" or "25m"
 * - If < 1 minute: "45s"
 */
export const formatDisplayTime = (totalSeconds: number): string => {
  if (!totalSeconds || totalSeconds <= 0) return "0s";

  const totalSecs = Math.floor(totalSeconds);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  if (hours > 0) {
    if (minutes > 0 && seconds > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }

  if (minutes > 0) {
    if (seconds > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${minutes}m`;
  }

  return `${seconds}s`;
};

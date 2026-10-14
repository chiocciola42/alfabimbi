/** "1 h 05 min", "12 min", "45 s" */
export function formatDuration(totalSeconds: number): string {
  const secs = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  if (secs < 60) return `${secs} s`;
  const minutes = Math.floor(secs / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`;
}

export function backupFileName(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `alfabimbi-backup-${y}-${m}-${d}.json`;
}

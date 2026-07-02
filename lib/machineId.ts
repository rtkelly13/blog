const STORAGE_KEY = 'rk:machine-id';

/**
 * Pseudo-anonymous machine id: a random UUID kept in localStorage. No PII, not a
 * real hardware id — it just de-duplicates this browser profile's tabs/reloads.
 * Falls back to a per-session id if storage is unavailable (private mode etc.).
 *
 * Shared by presence heartbeats and the audience-participation features (Q&A
 * upvotes, poll answers) so one browser counts as one participant everywhere.
 */
export function getMachineId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `ephemeral-${crypto.randomUUID()}`;
  }
}

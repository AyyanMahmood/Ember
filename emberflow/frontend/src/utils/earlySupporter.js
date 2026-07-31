// Early Supporter recognition.
//
// "Early supporters" are accounts that existed on or before the public
// launch cutoff. This is derived from the real Supabase auth `created_at`
// timestamp, so it needs no new column, flag, or migration — the signal is
// already on every user.
//
// Until the public launch date is fixed, the cutoff recognizes everyone who
// signed up during the pre-launch / beta window (i.e. everyone right now).
// Set EARLY_SUPPORTER_CUTOFF to the actual launch date at launch so the
// badge stops being granted to accounts created afterward.
export const EARLY_SUPPORTER_CUTOFF = '2026-12-31T23:59:59Z';

export function isEarlySupporter(user) {
  const created = user?.created_at;
  if (!created) return false;
  const createdAt = new Date(created).getTime();
  if (!Number.isFinite(createdAt)) return false;
  return createdAt <= new Date(EARLY_SUPPORTER_CUTOFF).getTime();
}

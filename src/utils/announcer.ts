/**
 * Messages for screen readers. Popups that come and go, like toasts, achievement unlocks and
 * Dunkin's visits, call announce(); LiveAnnouncer reads them out from live regions that stay
 * on the page, since a screen reader only notices changes inside a region it already knows.
 */

/** Polite waits for the screen reader to finish speaking; assertive speaks at once */
export type Politeness = 'polite' | 'assertive';

export interface Announcement {
  id: number;
  message: string;
  politeness: Politeness;
}

type Listener = (announcement: Announcement) => void;

const listeners = new Set<Listener>();
let nextId = 1;

/** Has the live regions say a message. Does nothing while none are on the page. */
export function announce(message: string, politeness: Politeness = 'polite'): void {
  const text = message.trim();
  if (!text) return;
  const announcement: Announcement = { id: nextId++, message: text, politeness };
  listeners.forEach(listener => listener(announcement));
}

/** Hears every announcement from now on; returns the function that stops it */
export function subscribeAnnouncements(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

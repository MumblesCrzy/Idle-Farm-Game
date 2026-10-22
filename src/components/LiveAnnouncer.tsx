/**
 * Two hidden live regions, always on the page, that read out what announce() is given: one
 * polite, one assertive. Each message is its own line, so two close together are both read,
 * and a line goes away after a while so the regions don't fill up.
 */
import { memo, useEffect, useState, type FC } from 'react';
import { subscribeAnnouncements, type Announcement, type Politeness } from '../utils/announcer';

/** How long a message stays in its region; screen readers read it as it arrives */
export const ANNOUNCEMENT_CLEAR_MS = 7000;
/** Lines kept at once in each region; older ones go first */
const MAX_LINES = 5;

/** The lines with a new one added, dropping the oldest of its region when that is full */
const addLine = (lines: Announcement[], announcement: Announcement): Announcement[] => {
  const region = lines.filter(line => line.politeness === announcement.politeness);
  const oldest = region.length >= MAX_LINES ? region[0].id : null;
  return [...lines.filter(line => line.id !== oldest), announcement];
};

const LiveAnnouncer: FC = memo(() => {
  const [lines, setLines] = useState<Announcement[]>([]);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const unsubscribe = subscribeAnnouncements(announcement => {
      setLines(current => addLine(current, announcement));
      const timer = setTimeout(() => {
        timers.delete(timer);
        setLines(current => current.filter(line => line.id !== announcement.id));
      }, ANNOUNCEMENT_CLEAR_MS);
      timers.add(timer);
    });
    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, []);

  const region = (politeness: Politeness) => (
    <div className="sr-only" aria-live={politeness} data-testid={`announcer-${politeness}`}>
      {lines.filter(line => line.politeness === politeness).map(line => <p key={line.id}>{line.message}</p>)}
    </div>
  );

  return (
    <>
      {region('polite')}
      {region('assertive')}
    </>
  );
});

LiveAnnouncer.displayName = 'LiveAnnouncer';

export default LiveAnnouncer;

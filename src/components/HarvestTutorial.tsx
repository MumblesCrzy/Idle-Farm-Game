/**
 * Harvest Tutorial Overlay
 *
 * One-time tutorial that appears when a veggie is ready to harvest for the first time.
 * It dims the screen except for the Harvest button, and points at the button with a
 * message beside it. Clicking the button harvests and closes the tutorial; clicking
 * anywhere else, or "Got it!", just closes it.
 */

import { useEffect, useLayoutEffect, useState, type CSSProperties, type FC } from 'react';
import styles from './HarvestTutorial.module.css';

/** The Harvest button marks itself with this attribute */
export const HARVEST_BUTTON_SELECTOR = '[data-tutorial="harvest-button"]';

/** Space between the button and the lit window around it */
const RING = 6;
/** Space between the lit window and the message, where the arrow sits */
const GAP = 34;
/** Closest the message comes to the edge of the screen */
const EDGE = 12;
/** Widest the message gets */
const MAX_WIDTH = 400;
/** Below this much room under the button, the message goes above it */
const ROOM_BELOW = 230;

interface HarvestTutorialProps {
  isVisible: boolean;
  onDismiss: () => void;
}

/** Where the Harvest button is on screen, kept current through scrolling and resizing */
function useHarvestButtonRect(active: boolean): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!active) return;
    const read = () => {
      const button = document.querySelector(HARVEST_BUTTON_SELECTOR);
      setRect(button ? button.getBoundingClientRect() : null);
    };
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };

    // Bring the button on screen if the page is scrolled away from it, then
    // measure before the first paint so the message never flashes elsewhere
    document.querySelector(HARVEST_BUTTON_SELECTOR)?.scrollIntoView?.({ block: 'nearest' });
    read();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active]);

  return active ? rect : null;
}

const HarvestTutorial: FC<HarvestTutorialProps> = ({ isVisible, onDismiss }) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const rect = useHarvestButtonRect(shouldRender);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      // Delay unmounting to allow fade-out animation
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Harvesting through the lit window also closes the tutorial
  useEffect(() => {
    if (!isVisible) return;
    const button = document.querySelector(HARVEST_BUTTON_SELECTOR);
    button?.addEventListener('click', onDismiss);
    return () => button?.removeEventListener('click', onDismiss);
  }, [isVisible, onDismiss]);

  if (!shouldRender) return null;

  const fade = isVisible ? styles.visible : styles.hidden;
  const message = (
    <div className={styles.tutorialMessage}>
      <h3 className={styles.tutorialTitle}>🎉 Your first harvest is ready!</h3>
      <p className={styles.tutorialText}>
        Click the <strong>Harvest</strong> button to collect your vegetables and earn experience!
      </p>
      <button className={styles.dismissButton} onClick={onDismiss}>
        Got it!
      </button>
    </div>
  );

  // Button not on screen (another tab is open): show the message in the middle
  if (!rect) {
    return (
      <>
        <div className={`${styles.backdrop} ${fade}`} onClick={onDismiss} />
        <div className={`${styles.centered} ${fade}`}>{message}</div>
      </>
    );
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // The lit window around the button
  const hole = {
    top: rect.top - RING,
    left: rect.left - RING,
    width: rect.width + RING * 2,
    height: rect.height + RING * 2
  };
  const holeBottom = hole.top + hole.height;
  const holeRight = hole.left + hole.width;

  // The message: below the button when there's room, otherwise above it,
  // centered on the button but kept on screen
  const below = viewportHeight - holeBottom >= ROOM_BELOW;
  const width = Math.min(MAX_WIDTH, viewportWidth - EDGE * 2);
  const buttonCenter = rect.left + rect.width / 2;
  const left = Math.min(Math.max(buttonCenter - width / 2, EDGE), viewportWidth - EDGE - width);
  const arrowLeft = Math.min(Math.max(buttonCenter - left, 28), width - 28);
  const placement: CSSProperties = below
    ? { top: holeBottom + GAP, left, width }
    : { bottom: viewportHeight - hole.top + GAP, left, width };

  return (
    <>
      {/* Four click areas around the lit window: a click there closes the tutorial */}
      <div className={`${styles.clickArea} ${fade}`} style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }} onClick={onDismiss} />
      <div className={`${styles.clickArea} ${fade}`} style={{ top: holeBottom, left: 0, right: 0, bottom: 0 }} onClick={onDismiss} />
      <div className={`${styles.clickArea} ${fade}`} style={{ top: hole.top, height: hole.height, left: 0, width: Math.max(0, hole.left) }} onClick={onDismiss} />
      <div className={`${styles.clickArea} ${fade}`} style={{ top: hole.top, height: hole.height, left: holeRight, right: 0 }} onClick={onDismiss} />

      {/* Dims everything except the button, and rings the button */}
      <div className={`${styles.spotlight} ${fade}`} style={hole} />

      <div className={`${styles.pointer} ${fade}`} style={placement}>
        <div
          className={below ? styles.arrowUp : styles.arrowDown}
          style={{ left: arrowLeft }}
        />
        {message}
      </div>
    </>
  );
};

export default HarvestTutorial;

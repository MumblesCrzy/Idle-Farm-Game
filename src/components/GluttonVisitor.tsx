/**
 * Dunkin on screen: a bulldog sitting at a random spot while he visits a Preserver's farm.
 * He sniffs, then eats from the stash, then sits stuffed until clicked. Clicking him away
 * shows what it did in a toast. Screen readers hear each stage as it starts.
 */
import { memo, useCallback, useEffect, useRef, useState, type FC } from 'react';
import Toast from './Toast';
import { announce } from '../utils/announcer';
import {
  GLUTTON_BITES,
  GLUTTON_NAME,
  shooMessage,
  type GluttonOutcome,
  type GluttonStage,
  type GluttonVisit
} from '../utils/glutton';
import styles from './GluttonVisitor.module.css';

interface GluttonVisitorProps {
  /** The visit on screen, if any */
  visit: GluttonVisit | null;
  /** His look for the season */
  image: string;
  /** What sending a stuffed Dunkin home would cost now */
  vetBill: number;
  /** Clicks him away; returns what that did */
  onShoo: () => GluttonOutcome | null;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const BUBBLES: Record<GluttonStage, string> = {
  sniffing: 'Sniff sniff',
  eating: 'Nom nom',
  stuffed: 'Urp'
};

const GluttonVisitor: FC<GluttonVisitorProps> = memo(({ visit, image, vetBill, onShoo, formatNumber }) => {
  const [toast, setToast] = useState('');
  const closeToast = useCallback(() => setToast(''), []);

  const handleClick = () => {
    const outcome = onShoo();
    if (outcome) setToast(shooMessage(outcome, formatNumber));
  };

  let label = '';
  let belly = 0;
  if (visit) {
    belly = visit.stage === 'stuffed' ? 100 : Math.round((visit.bites / GLUTTON_BITES) * 100);
    label = visit.stage === 'sniffing'
      ? `${GLUTTON_NAME} is sniffing around the pantry. Shoo him out now for free.`
      : visit.stage === 'eating'
        ? `${GLUTTON_NAME} is eating from your pantry! Shoo him out.`
        : `${GLUTTON_NAME} is stuffed and won't leave. Send him home: the vet bill is $${formatNumber(vetBill)}.`;
  }

  // Each stage is said once, as it starts, and at once: waiting costs the pantry or a vet bill
  const stage = visit?.stage ?? null;
  const announcedStage = useRef<GluttonStage | null>(null);
  useEffect(() => {
    if (stage && stage !== announcedStage.current) announce(label, 'assertive');
    announcedStage.current = stage;
  }, [stage, label]);

  return (
    <>
      {visit && (
        <button
          type="button"
          className={`${styles.visitor} ${styles[visit.stage]}`}
          style={{ left: `${visit.x * 100}vw`, top: `${visit.y * 100}vh` }}
          onClick={handleClick}
          aria-label={label}
          title={label}
        >
          <span className={styles.bubble} aria-hidden="true">{BUBBLES[visit.stage]}</span>
          <img src={image} alt="" className={styles.dog} />
          <span className={styles.belly} aria-hidden="true">
            <span className={styles.bellyFill} style={{ width: `${belly}%` }} />
          </span>
        </button>
      )}
      <Toast message={toast} visible={toast !== ''} type="info" icon={image} duration={5000} onClose={closeToast} />
    </>
  );
});

GluttonVisitor.displayName = 'GluttonVisitor';

export default GluttonVisitor;

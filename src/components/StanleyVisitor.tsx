/**
 * Stanley on screen: the Engineers' cat, sitting at a random spot while he visits, with a
 * glowing ring and how long he'll wait. Clicking him starts a Tune-Up, shown in a toast.
 * Screen readers hear when he arrives.
 */
import { memo, useCallback, useEffect, useState, type FC } from 'react';
import Toast from './Toast';
import { announce } from '../utils/announcer';
import { STANLEY_GEARS, STANLEY_NAME, stanleyWaitLeft, type StanleyVisit } from '../utils/stanley';
import styles from './StanleyVisitor.module.css';

interface StanleyVisitorProps {
  /** The visit on screen, if any */
  visit: StanleyVisit | null;
  /** His look for the season */
  image: string;
  /** How long a Tune-Up lasts now, in seconds */
  tuneUpSeconds: number;
  /** Clicks him for a Tune-Up; false when he isn't there */
  onTuneUp: () => boolean;
}

const StanleyVisitor: FC<StanleyVisitorProps> = memo(({ visit, image, tuneUpSeconds, onTuneUp }) => {
  const [toast, setToast] = useState('');
  const closeToast = useCallback(() => setToast(''), []);

  const handleClick = () => {
    if (onTuneUp()) {
      setToast(`${STANLEY_NAME} tuned up every machine: twice as fast for ${tuneUpSeconds} seconds. +${STANLEY_GEARS} Gears`);
    }
  };

  // Said once as he arrives; missing him costs nothing, so it waits its turn
  const here = visit !== null;
  useEffect(() => {
    if (here) announce(`${STANLEY_NAME} is here. Click him for a Tune-Up.`);
  }, [here]);

  const label = `${STANLEY_NAME} is here. Click him for a Tune-Up: every machine runs twice as fast for ${tuneUpSeconds} seconds, and you get ${STANLEY_GEARS} Gears`;

  return (
    <>
      {visit && (
        <button
          type="button"
          className={styles.visitor}
          style={{ left: `${visit.x * 100}vw`, top: `${visit.y * 100}vh` }}
          onClick={handleClick}
          aria-label={label}
          title={label}
        >
          <span className={styles.halo} aria-hidden="true" />
          <img src={image} alt="" className={styles.cat} />
          <span className={styles.tag} aria-hidden="true">{STANLEY_NAME} is here · {stanleyWaitLeft(visit)} s</span>
        </button>
      )}
      <Toast message={toast} visible={toast !== ''} type="success" icon={image} duration={5000} onClose={closeToast} />
    </>
  );
});

StanleyVisitor.displayName = 'StanleyVisitor';

export default StanleyVisitor;

/**
 * Ferdinand on screen: the Merchants' cat, sitting at a random spot while he visits, with a
 * golden ring and how long he'll wait. Clicking him starts a Hot Tip, shown in a toast.
 * Screen readers hear when he arrives.
 */
import { memo, useCallback, useEffect, useState, type FC } from 'react';
import Toast from './Toast';
import { announce } from '../utils/announcer';
import { FERDINAND_NAME, ferdinandWaitLeft, type FerdinandVisit } from '../utils/ferdinand';
import styles from './FerdinandVisitor.module.css';

interface FerdinandVisitorProps {
  /** The visit on screen, if any */
  visit: FerdinandVisit | null;
  image: string;
  /** How long a Hot Tip lasts now, in seconds */
  hotTipSeconds: number;
  /** Clicks him for a Hot Tip; false when he isn't there */
  onHotTip: () => boolean;
}

const FerdinandVisitor: FC<FerdinandVisitorProps> = memo(({ visit, image, hotTipSeconds, onHotTip }) => {
  const [toast, setToast] = useState('');
  const closeToast = useCallback(() => setToast(''), []);

  const handleClick = () => {
    if (onHotTip()) {
      setToast(`${FERDINAND_NAME}'s Hot Tip: crops and jars sell for double for ${hotTipSeconds} seconds. Sell what you've been holding`);
    }
  };

  // Said once as he arrives; missing him costs nothing, so it waits its turn
  const here = visit !== null;
  useEffect(() => {
    if (here) announce(`${FERDINAND_NAME} is here. Click him for a Hot Tip.`);
  }, [here]);

  const label = `${FERDINAND_NAME} is here. Click him for a Hot Tip: crops and jars sell for double for ${hotTipSeconds} seconds`;

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
          <span className={styles.tag} aria-hidden="true">{FERDINAND_NAME} is here · {ferdinandWaitLeft(visit)} s</span>
        </button>
      )}
      <Toast message={toast} visible={toast !== ''} type="success" icon={image} duration={6000} onClose={closeToast} />
    </>
  );
});

FerdinandVisitor.displayName = 'FerdinandVisitor';

export default FerdinandVisitor;

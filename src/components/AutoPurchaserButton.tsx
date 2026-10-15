import { memo, type FC } from 'react';
import type { AutoPurchaseConfig } from '../types/game';
import { getAutoPurchaserImage } from '../config/assetPaths';
import styles from './AutoPurchaserButton.module.css';

interface AutoPurchaserButtonProps {
  autoPurchaser: AutoPurchaseConfig;
  money: number;
  knowledge: number;
  description: string;
  /** Called with the auto-purchaser's id */
  onPurchase: (autoPurchaserId: string) => void;
  /** Blocks buying, for example when the farm has no free plots */
  forceDisabled?: boolean;
}

/** Buys a crop's auto-purchaser, then switches it on and off */
const AutoPurchaserButton: FC<AutoPurchaserButtonProps> = memo(({
  autoPurchaser,
  money,
  knowledge,
  description,
  onPurchase,
  forceDisabled = false
}) => {
  const { id, name, owned, active, cost, currencyType } = autoPurchaser;
  const canAfford = currencyType === 'money' ? money >= cost : knowledge >= cost;
  const isDisabled = !owned && (!canAfford || forceDisabled);

  const stateClass = !owned
    ? (isDisabled ? styles.unavailable : styles.affordable)
    : (active ? styles.on : styles.off);

  const costText = currencyType === 'money' ? `$${cost}` : `${cost}Kn`;
  const tooltip = !owned && forceDisabled
    ? `${name}: Cannot purchase - You've reached your maximum plot limit. Expand your farm to unlock more plots.`
    : `${name}: ${description}. ${!owned
      ? `Cost: ${costText}`
      : active ? 'Currently ON - Click to turn OFF' : 'Currently OFF - Click to turn ON'}`;

  return (
    <button
      type="button"
      title={tooltip}
      className={`${styles.button} ${stateClass}`}
      onClick={() => onPurchase(id)}
      disabled={isDisabled}
    >
      <img
        src={getAutoPurchaserImage(name)}
        alt={!owned ? name : `${name} ${active ? 'ON' : 'OFF'}`}
        className={owned && !active ? `${styles.image} ${styles.imageOff}` : styles.image}
      />
    </button>
  );
});

AutoPurchaserButton.displayName = 'AutoPurchaserButton';

export default AutoPurchaserButton;

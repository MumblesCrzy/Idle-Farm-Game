import { memo, type FC } from 'react';
import type { Veggie } from '../types/game';
import { GROWTH_COMPLETE_THRESHOLD } from '../config/gameConstants';
import styles from './GrowingTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

interface CropSelectorButtonProps {
  crop: Veggie;
  index: number;
  isActive: boolean;
  /** No free plots to unlock another crop */
  farmFull: boolean;
  isFruit: boolean;
  onSelect: (index: number) => void;
  formatNumber: FormatNumber;
}

const CropSelectorButton: FC<CropSelectorButtonProps> = memo(({
  crop,
  index,
  isActive,
  farmFull,
  isFruit,
  onSelect,
  formatNumber
}) => {
  const fruitClass = isFruit ? ` ${styles.fruitButton}` : '';

  if (!crop.unlocked) {
    const kind = isFruit ? 'fruits' : 'vegetables';
    const experience = isFruit ? formatNumber(crop.experienceToUnlock, 0) : String(crop.experienceToUnlock);
    return (
      <button
        disabled
        aria-label={farmFull
          ? `${crop.name}. Locked. You need to expand your farm to unlock more ${kind}`
          : `${crop.name}. Locked. Requires ${crop.experienceToUnlock} experience to unlock`
        }
        className={`${styles.veggieSelectorButton}${fruitClass}`}
        title={farmFull ? `You need to expand your farm to unlock more ${kind}` : `Requires ${experience} experience to unlock`}
      >
        {farmFull ? (
          <span className={styles.needLargerFarm}>Need Larger Farm</span>
        ) : (
          `Exp: ${experience}`
        )}
      </button>
    );
  }

  const readyClass = crop.growth >= GROWTH_COMPLETE_THRESHOLD ? ` ${styles.veggieSelectorButtonReady}` : '';
  return (
    <button
      className={`${styles.veggieSelectorButton}${fruitClass}${readyClass}`}
      onClick={() => onSelect(index)}
      aria-label={`${crop.name}. Growth: ${Math.floor(crop.growth)}%. Stash: ${crop.stash}${isActive ? '. Currently selected' : ''}`}
      aria-current={isActive ? 'true' : undefined}
      disabled={isActive}
    >
      {crop.name}
    </button>
  );
});

CropSelectorButton.displayName = 'CropSelectorButton';

interface CropSelectorProps {
  veggies: Veggie[];
  activeVeggie: number;
  farmFull: boolean;
  /** Fruit Cultivation unlocked */
  showFruits: boolean;
  onSelect: (index: number) => void;
  formatNumber: FormatNumber;
}

/** Vegetable row, plus a fruit row once fruits are unlocked */
const CropSelector: FC<CropSelectorProps> = memo(({
  veggies,
  activeVeggie,
  farmFull,
  showFruits,
  onSelect,
  formatNumber
}) => {
  const renderRow = (isFruit: boolean) => veggies.map((crop, index) =>
    (crop.cropType === 'fruit') === isFruit ? (
      <CropSelectorButton
        key={crop.name}
        crop={crop}
        index={index}
        isActive={index === activeVeggie}
        farmFull={farmFull}
        isFruit={isFruit}
        onSelect={onSelect}
        formatNumber={formatNumber}
      />
    ) : null
  );

  return (
    <div className="veggie-selector">
      <div className={styles.veggieSelectorContainer}>
        {renderRow(false)}
      </div>

      {showFruits && (
        <>
          <div className={styles.fruitRowLabel}></div>
          <div className={styles.veggieSelectorContainer}>
            {renderRow(true)}
          </div>
        </>
      )}
    </div>
  );
});

CropSelector.displayName = 'CropSelector';

export default CropSelector;

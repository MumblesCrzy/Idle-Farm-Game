/**
 * Flower Beds Tab Component
 *
 * Spring Farmer's Market farming: choose a flower, plant, grow and harvest
 * bunches. Mirrors the Pumpkin Patch: flower selector, beds six to a row,
 * stock in the header and Bed upgrades on the right.
 */

import { memo, useCallback, useId, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import ProgressBar from './ProgressBar';
import { FLOWER_ORDER, FLOWER_VARIETIES, SPRING_ART, SPRING_EVENT_CONSTANTS } from '../data/springEventData';
import { flowerGrowthSpeed, ownsUpgrade, parseFlowerKey } from '../utils/springPricing';
import type { UseSpringEventReturn } from '../hooks/useSpringEvent';
import type { FlowerBed, FlowerInventory, FlowerVariety } from '../types/springEvent';
import frame from './SpringSections.module.css';
import styles from './FlowerBedsTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

interface FlowerBedsTabProps {
  event: UseSpringEventReturn;
  formatNumber: FormatNumber;
}

/** Growth shown as a sprout below this percentage */
const SPROUT_PERCENT = 33;

/** Bunches of a flower in stock, in any finish and quality */
function countBunches(inventory: FlowerInventory, variety: FlowerVariety): number {
  let count = 0;
  for (const [key, quantity] of Object.entries(inventory)) {
    if (parseFlowerKey(key).variety === variety) count += quantity;
  }
  return count;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

// ============================================================================
// FLOWER SELECTOR
// ============================================================================

interface FlowerSelectorProps {
  variety: FlowerVariety;
  selected: boolean;
  unlocked: boolean;
  canAfford: boolean;
  /** Id of a hint that describes this flower */
  describedBy?: string;
  onSelect: (variety: FlowerVariety) => void;
  onUnlock: (variety: FlowerVariety) => void;
  formatNumber: FormatNumber;
}

const FlowerSelector: FC<FlowerSelectorProps> = memo(({
  variety,
  selected,
  unlocked,
  canAfford,
  describedBy,
  onSelect,
  onUnlock,
  formatNumber
}) => {
  const definition = FLOWER_VARIETIES[variety];
  const cost = formatNumber(definition.unlockCost, 0);

  const handleClick = () => {
    if (unlocked) onSelect(variety);
    else if (canAfford) onUnlock(variety);
  };

  const label = unlocked
    ? `${definition.name}, ${definition.growthTime} days to grow`
    : `Unlock ${definition.plural} for ${cost} Petals${canAfford ? '' : '. Not enough Petals'}`;

  const className = [
    styles.flowerSelector,
    selected ? styles.selected : '',
    unlocked ? '' : styles.locked,
    !unlocked && !canAfford ? styles.cantAfford : ''
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={!unlocked && !canAfford}
      aria-pressed={unlocked ? selected : undefined}
      aria-label={label}
      aria-describedby={describedBy}
      title={definition.description}
    >
      <EventArt art={definition.art} size={22} />
      <span className={styles.flowerName}>
        {unlocked || !canAfford ? definition.name : `Unlock ${definition.name}`}
      </span>
      {!unlocked && (
        <span className={styles.flowerCost}>
          {cost} <EventArt art={SPRING_ART.petals} size={14} />
        </span>
      )}
    </button>
  );
});

FlowerSelector.displayName = 'FlowerSelector';

// ============================================================================
// BED
// ============================================================================

interface BedCardProps {
  bed: FlowerBed;
  index: number;
  selectedVariety: FlowerVariety;
  /** Growth speed multiplier from the Rain Barrel */
  speed: number;
  onPlant: (index: number) => void;
  onHarvest: (index: number) => void;
}

const BedCard: FC<BedCardProps> = memo(({ bed, index, selectedVariety, speed, onPlant, onHarvest }) => {
  const bedNumber = index + 1;

  if (bed.variety === null) {
    const flower = FLOWER_VARIETIES[selectedVariety];
    return (
      <li className={`${styles.bed} ${styles.empty}`}>
        <EventArt art={flower.art} size={40} className={styles.emptyArt} />
        <span className={styles.bedName}>Empty bed</span>
        <span className={styles.bedNote}>{flower.growthTime} days</span>
        <button
          type="button"
          className={styles.plantButton}
          onClick={() => onPlant(index)}
          aria-label={`Plant ${flower.plural} in bed ${bedNumber}`}
        >
          Plant {flower.name}
        </button>
      </li>
    );
  }

  const definition = FLOWER_VARIETIES[bed.variety];
  const isPrize = bed.quality === 'prize';
  const ready = bed.harvestReady;
  const percent = bed.growthTime > 0 ? Math.min(100, (bed.growth / bed.growthTime) * 100) : 100;
  const daysLeft = Math.max(0, Math.ceil((bed.growthTime - bed.growth) / speed));
  const art = ready || percent >= SPROUT_PERCENT ? definition.art : SPRING_ART.sprout;

  const className = [
    styles.bed,
    ready ? styles.ready : '',
    isPrize ? styles.prize : ''
  ].filter(Boolean).join(' ');

  return (
    <li className={className}>
      {isPrize && (
        <span className={styles.prizeBadge}>
          <EventArt art={SPRING_ART.prizeBloom} size={12} /> Prize Bloom
        </span>
      )}
      <EventArt art={art} size={40} />
      <span className={styles.bedName}>{definition.name}</span>
      {ready ? (
        <>
          <span className={styles.readyText}>Ready to harvest</span>
          <button
            type="button"
            className={styles.harvestButton}
            onClick={() => onHarvest(index)}
            aria-label={`Harvest ${isPrize ? 'Prize Bloom ' : ''}${definition.plural} from bed ${bedNumber}`}
          >
            Harvest
          </button>
        </>
      ) : (
        <>
          <div
            className={styles.progressBarWrapper}
            role="progressbar"
            aria-label={`${definition.plural} in bed ${bedNumber} growth`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(percent)}
          >
            <ProgressBar value={percent} max={100} height={10} color="#E8698B" />
          </div>
          <span className={styles.bedNote}>{Math.floor(percent)}% · {plural(daysLeft, 'day')} left</span>
        </>
      )}
    </li>
  );
});

BedCard.displayName = 'BedCard';

// ============================================================================
// STOCK
// ============================================================================

interface StockSummaryProps {
  inventory: FlowerInventory;
  greenery: number;
  seeds: number;
  formatNumber: FormatNumber;
}

const StockSummary: FC<StockSummaryProps> = memo(({ inventory, greenery, seeds, formatNumber }) => {
  const items = [
    ...FLOWER_ORDER.map(variety => ({
      label: FLOWER_VARIETIES[variety].plural,
      value: countBunches(inventory, variety),
      art: FLOWER_VARIETIES[variety].art,
      title: `Bunches of ${FLOWER_VARIETIES[variety].plural} in stock, in any finish`,
    })),
    { label: 'Greenery', value: greenery, art: SPRING_ART.greenery, title: 'Greenery, for arranging bunches' },
    { label: 'Seeds', value: seeds, art: SPRING_ART.seeds, title: 'Seeds, for seed packets' },
  ];

  return (
    <ul className={frame.stockList} aria-label="Stock">
      {items.map(item => (
        <li key={item.label} className={frame.stockItem} title={item.title}>
          <EventArt art={item.art} size={20} />
          <span className={frame.stockLabel}>{item.label}</span>
          <span className={frame.stockValue}>{formatNumber(item.value, 0)}</span>
        </li>
      ))}
    </ul>
  );
});

StockSummary.displayName = 'StockSummary';

// ============================================================================
// TAB
// ============================================================================

const FlowerBedsTab: FC<FlowerBedsTabProps> = ({ event, formatNumber }) => {
  const {
    beds,
    materials,
    petals,
    demandMultiplier,
    plantFlower,
    chooseFlower,
    harvestFlower,
    harvestAllFlowers,
    purchaseUpgrade
  } = event;
  const { upgrades, inventory } = event.eventState;
  const roseHintId = useId();

  const unlocked = FLOWER_ORDER.filter(variety => ownsUpgrade(upgrades, FLOWER_VARIETIES[variety].unlockUpgrade));
  const bestUnlocked = unlocked[unlocked.length - 1] ?? 'tulip';

  // The event keeps the chosen flower, so it stays chosen after leaving the tab.
  // A new season can lock it again; fall back to the best one still unlocked
  const chosenVariety = event.eventState.chosenFlower;
  const selectedVariety = chosenVariety && unlocked.includes(chosenVariety) ? chosenVariety : bestUnlocked;

  // The Rain Barrel speeds growth, so days left counts down faster
  const speed = flowerGrowthSpeed(upgrades);

  const harvestAllOwned = ownsUpgrade(upgrades, 'trug');
  const plantAllOwned = ownsUpgrade(upgrades, 'dibber');
  const readyCount = beds.filter(b => b.harvestReady).length;
  const emptyCount = beds.filter(b => b.variety === null).length;

  // Unlocking a flower also selects it
  const unlockFlower = useCallback((variety: FlowerVariety) => {
    if (purchaseUpgrade(FLOWER_VARIETIES[variety].unlockUpgrade)) {
      chooseFlower(variety);
    }
  }, [purchaseUpgrade, chooseFlower]);

  const plantBed = useCallback((index: number) => {
    plantFlower(index, selectedVariety);
  }, [plantFlower, selectedVariety]);

  const plantAll = () => {
    beds.forEach((bed, index) => {
      if (bed.variety === null) plantFlower(index, selectedVariety);
    });
  };

  const selectedName = FLOWER_VARIETIES[selectedVariety].plural;
  const atPeak = demandMultiplier >= SPRING_EVENT_CONSTANTS.MAX_DEMAND_MULTIPLIER;

  const mainContent = (
    <div className={frame.container}>
      {/* Left column: header, flower selection and beds */}
      <div className={frame.leftColumn}>
        <div className={frame.headerRow}>
          <div className={frame.titleGroup}>
            <h2 className={frame.sectionTitle}>
              <EventArt art={SPRING_ART.beds} size={26} /> Flower Beds
            </h2>
            {harvestAllOwned && readyCount > 0 && (
              <button
                type="button"
                className={frame.primaryAction}
                onClick={harvestAllFlowers}
                aria-label={`Harvest All: ${plural(readyCount, 'ready bed')}`}
              >
                Harvest All ({readyCount})
              </button>
            )}
            {plantAllOwned && emptyCount > 0 && (
              <button
                type="button"
                className={frame.secondaryAction}
                onClick={plantAll}
                aria-label={`Plant All: ${selectedName} in ${plural(emptyCount, 'empty bed')}`}
              >
                Plant All ({emptyCount})
              </button>
            )}
          </div>

          <StockSummary
            inventory={inventory}
            greenery={materials.greenery}
            seeds={materials.seeds}
            formatNumber={formatNumber}
          />
        </div>

        <div className={styles.flowerRow}>
          <div className={styles.flowerGroup} role="group" aria-label="Flower to plant">
            {FLOWER_ORDER.map(variety => (
              <FlowerSelector
                key={variety}
                variety={variety}
                selected={selectedVariety === variety}
                unlocked={unlocked.includes(variety)}
                canAfford={petals >= FLOWER_VARIETIES[variety].unlockCost}
                describedBy={variety === 'rose' ? roseHintId : undefined}
                onSelect={chooseFlower}
                onUnlock={unlockFlower}
                formatNumber={formatNumber}
              />
            ))}
          </div>
          <p id={roseHintId} className={styles.roseHint}>
            <EventArt art={SPRING_ART.rose} size={16} />
            {atPeak
              ? "Roses are the Mother's Day flower: 6 Petals a bunch, and demand is at its peak until Memorial Day."
              : "Roses are the Mother's Day flower: 6 Petals a bunch, and demand doubles by then."}
          </p>
        </div>

        <ul className={styles.bedsGrid} aria-label="Flower beds">
          {beds.map((bed, index) => (
            <BedCard
              key={bed.id}
              bed={bed}
              index={index}
              selectedVariety={selectedVariety}
              speed={speed}
              onPlant={plantBed}
              onHarvest={harvestFlower}
            />
          ))}
        </ul>
      </div>

      {/* Right column: Bed upgrades */}
      <div className={frame.rightColumn}>
        <EventUpgradesPanel
          title="Bed Upgrades"
          category="farming"
          upgrades={upgrades}
          currency="petals"
          balance={petals}
          purchaseUpgrade={purchaseUpgrade}
          formatNumber={formatNumber}
        />
      </div>
    </div>
  );

  return (
    <BaseTab
      isUnlocked={true}
      mainContent={mainContent}
    />
  );
};

const MemoizedFlowerBedsTab = memo(FlowerBedsTab);
MemoizedFlowerBedsTab.displayName = 'FlowerBedsTab';

export default MemoizedFlowerBedsTab;

/**
 * Melon Patch Tab Component
 *
 * Summer Watermelon Festival farming: choose a melon, plant, grow and harvest.
 * Mirrors the Flower Beds: melon selector, plots six to a row, stock in the
 * header, the last few harvests with their sweetness and weight, and Patch
 * upgrades on the right.
 */

import { memo, useCallback, useId, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import ProgressBar from './ProgressBar';
import { MELON_ORDER, MELON_VARIETIES, SUMMER_ART, SUMMER_EVENT_CONSTANTS } from '../data/summerEventData';
import { melonGrowthSpeed, ownsUpgrade, parseMelonKey } from '../utils/summerPricing';
import type { UseSummerEventReturn } from '../hooks/useSummerEvent';
import type { MelonHarvest, MelonInventory, MelonPlot, MelonVariety, StockMelon } from '../types/summerEvent';
import frame from './SummerSections.module.css';
import styles from './MelonPatchTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

interface MelonPatchTabProps {
  event: UseSummerEventReturn;
  formatNumber: FormatNumber;
}

/** Growth shown as a sprout below this percentage */
const SPROUT_PERCENT = 33;

/** Melons of a kind in stock, in any finish and grade */
function countMelons(inventory: MelonInventory, variety: StockMelon): number {
  let count = 0;
  for (const [key, quantity] of Object.entries(inventory)) {
    if (parseMelonKey(key).variety === variety) count += quantity;
  }
  return count;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** What to know before planting each melon */
const MELON_HINTS: Record<MelonVariety, string> = {
  sugarBaby: 'Quick and small, 180 days. Every melon rolls a sweetness in Brix; 12.0 and up is a Sugar Melon, worth double.',
  crimsonSweet: 'The classic, 240 days: 3 Tickets a melon, and two splits for the Juice Stand.',
  carolinaCross: `The giant, 540 days: weighed at harvest and sold by the pound. The world record is ${SUMMER_EVENT_CONSTANTS.WORLD_RECORD_WEIGHT} lb.`,
};

/** "Sugar Baby, 12.6 Brix: a Sugar Melon!" or "Carolina Cross, 142 lb" */
function describeHarvest(harvest: MelonHarvest): string {
  const name = MELON_VARIETIES[harvest.variety].name;
  if (harvest.variety === 'carolinaCross') return `${name}, ${harvest.weight} lb`;
  const brix = `${name}, ${harvest.brix.toFixed(1)} Brix`;
  return harvest.quality === 'sugar' ? `${brix}: a Sugar Melon!` : brix;
}

// ============================================================================
// MELON SELECTOR
// ============================================================================

interface MelonSelectorProps {
  variety: MelonVariety;
  selected: boolean;
  unlocked: boolean;
  canAfford: boolean;
  onSelect: (variety: MelonVariety) => void;
  onUnlock: (variety: MelonVariety) => void;
  formatNumber: FormatNumber;
}

const MelonSelector: FC<MelonSelectorProps> = memo(({
  variety,
  selected,
  unlocked,
  canAfford,
  onSelect,
  onUnlock,
  formatNumber
}) => {
  const definition = MELON_VARIETIES[variety];
  const cost = formatNumber(definition.unlockCost, 0);

  const handleClick = () => {
    if (unlocked) onSelect(variety);
    else if (canAfford) onUnlock(variety);
  };

  const label = unlocked
    ? `${definition.name}, ${definition.growthTime} days to grow`
    : `Unlock ${definition.plural} for ${cost} Tickets${canAfford ? '' : '. Not enough Tickets'}`;

  const className = [
    styles.melonSelector,
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
      title={definition.description}
    >
      <EventArt art={definition.art} size={22} />
      <span className={styles.melonName}>
        {unlocked || !canAfford ? definition.name : `Unlock ${definition.name}`}
      </span>
      {!unlocked && (
        <span className={styles.melonCost}>
          {cost} <EventArt art={SUMMER_ART.tickets} size={14} />
        </span>
      )}
    </button>
  );
});

MelonSelector.displayName = 'MelonSelector';

// ============================================================================
// PLOT
// ============================================================================

interface PlotCardProps {
  plot: MelonPlot;
  index: number;
  selectedVariety: MelonVariety;
  /** Growth speed multiplier from Straw Mulch */
  speed: number;
  onPlant: (index: number) => void;
  onHarvest: (index: number) => void;
}

const PlotCard: FC<PlotCardProps> = memo(({ plot, index, selectedVariety, speed, onPlant, onHarvest }) => {
  const plotNumber = index + 1;

  if (plot.variety === null) {
    const melon = MELON_VARIETIES[selectedVariety];
    return (
      <li className={`${styles.plot} ${styles.empty}`}>
        <EventArt art={melon.art} size={40} className={styles.emptyArt} />
        <span className={styles.plotName}>Empty plot</span>
        <span className={styles.plotNote}>{melon.growthTime} days</span>
        <button
          type="button"
          className={styles.plantButton}
          onClick={() => onPlant(index)}
          aria-label={`Plant ${melon.plural} in plot ${plotNumber}`}
        >
          Plant {melon.name}
        </button>
      </li>
    );
  }

  const definition = MELON_VARIETIES[plot.variety];
  const ready = plot.harvestReady;
  const giant = plot.variety === 'carolinaCross';
  const percent = plot.growthTime > 0 ? Math.min(100, (plot.growth / plot.growthTime) * 100) : 100;
  const daysLeft = Math.max(0, Math.ceil((plot.growthTime - plot.growth) / speed));
  const art = ready || percent >= SPROUT_PERCENT ? definition.art : SUMMER_ART.sprout;

  const className = [
    styles.plot,
    ready ? styles.ready : '',
    giant ? styles.giant : ''
  ].filter(Boolean).join(' ');

  return (
    <li className={className}>
      {giant && <span className={styles.giantBadge}>Giant</span>}
      <EventArt art={art} size={40} />
      <span className={styles.plotName}>{definition.name}</span>
      {ready ? (
        <>
          <span className={styles.readyText}>{giant ? 'Ready to weigh' : 'Ready to harvest'}</span>
          <button
            type="button"
            className={styles.harvestButton}
            onClick={() => onHarvest(index)}
            aria-label={`Harvest the ${definition.name} in plot ${plotNumber}`}
          >
            Harvest
          </button>
        </>
      ) : (
        <>
          <div
            className={styles.progressBarWrapper}
            role="progressbar"
            aria-label={`${definition.name} in plot ${plotNumber} growth`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(percent)}
          >
            <ProgressBar value={percent} max={100} height={10} color="#E04B4B" />
          </div>
          <span className={styles.plotNote}>{Math.floor(percent)}% · {plural(daysLeft, 'day')} left</span>
        </>
      )}
    </li>
  );
});

PlotCard.displayName = 'PlotCard';

// ============================================================================
// STOCK
// ============================================================================

interface StockSummaryProps {
  inventory: MelonInventory;
  giants: number;
  splits: number;
  seeds: number;
  formatNumber: FormatNumber;
}

const StockSummary: FC<StockSummaryProps> = memo(({ inventory, giants, splits, seeds, formatNumber }) => {
  const items = [
    {
      label: MELON_VARIETIES.sugarBaby.plural,
      value: countMelons(inventory, 'sugarBaby'),
      art: SUMMER_ART.sugarBaby,
      title: 'Sugar Babies in stock, in any finish',
    },
    {
      label: MELON_VARIETIES.crimsonSweet.plural,
      value: countMelons(inventory, 'crimsonSweet'),
      art: SUMMER_ART.crimsonSweet,
      title: 'Crimson Sweets in stock, in any finish',
    },
    { label: 'Giants', value: giants, art: SUMMER_ART.carolinaCross, title: 'Carolina Crosses on the shelf' },
    { label: 'Splits', value: splits, art: SUMMER_ART.splits, title: 'Melons that cracked on the vine, for the Juice Stand' },
    { label: 'Seeds', value: seeds, art: SUMMER_ART.seeds, title: 'Seeds, for roasting and for Seed Spitting' },
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
// LAST HARVESTS
// ============================================================================

interface LastHarvestsProps {
  harvests: MelonHarvest[];
  best: { brix: number; weight: number };
}

const LastHarvests: FC<LastHarvestsProps> = memo(({ harvests, best }) => {
  const titleId = useId();
  const bests = [
    best.brix > 0 ? `${best.brix.toFixed(1)} Brix` : '',
    best.weight > 0 ? `${best.weight} lb` : ''
  ].filter(Boolean);

  return (
    <section className={styles.lastHarvests} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.lastTitle}>Last harvests</h3>
      {harvests.length === 0 ? (
        <span className={styles.lastEmpty}>Each melon&apos;s sweetness, or a giant&apos;s weight, shows here.</span>
      ) : (
        <ul className={styles.lastList}>
          {harvests.slice(0, 3).map((harvest, i) => (
            <li key={i} className={`${styles.lastItem} ${harvest.quality === 'sugar' ? styles.sugarItem : ''}`}>
              <EventArt art={MELON_VARIETIES[harvest.variety].art} size={18} />
              {describeHarvest(harvest)}
            </li>
          ))}
        </ul>
      )}
      {bests.length > 0 && <span className={styles.bestLine}>Best: {bests.join(', ')}</span>}
    </section>
  );
});

LastHarvests.displayName = 'LastHarvests';

// ============================================================================
// TAB
// ============================================================================

const MelonPatchTab: FC<MelonPatchTabProps> = ({ event, formatNumber }) => {
  const {
    plots,
    materials,
    tickets,
    giantShelf,
    recentHarvests,
    plantMelon,
    plantAllMelons,
    chooseMelon,
    harvestMelon,
    harvestAllMelons,
    purchaseUpgrade
  } = event;
  const { upgrades, inventory, personalBest } = event.eventState;
  const hintId = useId();

  const unlocked = MELON_ORDER.filter(variety => ownsUpgrade(upgrades, MELON_VARIETIES[variety].unlockUpgrade));
  const firstUnlocked = unlocked[0] ?? 'sugarBaby';

  // The event keeps the chosen melon, so it stays chosen after leaving the tab.
  // A new season can lock it again; fall back to one still unlocked
  const chosenVariety = event.eventState.chosenMelon;
  const selectedVariety = chosenVariety && unlocked.includes(chosenVariety) ? chosenVariety : firstUnlocked;

  // Straw Mulch speeds growth, so days left counts down faster
  const speed = melonGrowthSpeed(upgrades);

  const harvestAllOwned = ownsUpgrade(upgrades, 'wagon');
  const plantAllOwned = ownsUpgrade(upgrades, 'jab_planter');
  const readyCount = plots.filter(p => p.harvestReady).length;
  const emptyCount = plots.filter(p => p.variety === null).length;

  // Unlocking a melon also selects it
  const unlockMelon = useCallback((variety: MelonVariety) => {
    if (purchaseUpgrade(MELON_VARIETIES[variety].unlockUpgrade)) {
      chooseMelon(variety);
    }
  }, [purchaseUpgrade, chooseMelon]);

  const plantPlot = useCallback((index: number) => {
    plantMelon(index, selectedVariety);
  }, [plantMelon, selectedVariety]);

  const selectedName = MELON_VARIETIES[selectedVariety].plural;

  const mainContent = (
    <div className={frame.container}>
      {/* Left column: header, melon selection, plots and the last harvests */}
      <div className={frame.leftColumn}>
        <div className={frame.headerRow}>
          <div className={frame.titleGroup}>
            <h2 className={frame.sectionTitle}>
              <EventArt art={SUMMER_ART.patch} size={26} /> Melon Patch
            </h2>
            {harvestAllOwned && readyCount > 0 && (
              <button
                type="button"
                className={frame.primaryAction}
                onClick={harvestAllMelons}
                aria-label={`Harvest All: ${plural(readyCount, 'ready plot')}`}
              >
                Harvest All ({readyCount})
              </button>
            )}
            {plantAllOwned && emptyCount > 0 && (
              <button
                type="button"
                className={frame.secondaryAction}
                onClick={() => plantAllMelons(selectedVariety)}
                aria-label={`Plant All: ${selectedName} in ${plural(emptyCount, 'empty plot')}`}
              >
                Plant All ({emptyCount})
              </button>
            )}
          </div>

          <StockSummary
            inventory={inventory}
            giants={giantShelf.length}
            splits={materials.splits}
            seeds={materials.seeds}
            formatNumber={formatNumber}
          />
        </div>

        <div className={styles.melonRow}>
          <div className={styles.melonGroup} role="group" aria-label="Melon to plant" aria-describedby={hintId}>
            {MELON_ORDER.map(variety => (
              <MelonSelector
                key={variety}
                variety={variety}
                selected={selectedVariety === variety}
                unlocked={unlocked.includes(variety)}
                canAfford={tickets >= MELON_VARIETIES[variety].unlockCost}
                onSelect={chooseMelon}
                onUnlock={unlockMelon}
                formatNumber={formatNumber}
              />
            ))}
          </div>
          <p id={hintId} className={styles.melonHint}>{MELON_HINTS[selectedVariety]}</p>
        </div>

        <ul className={styles.plotsGrid} aria-label="Melon plots">
          {plots.map((plot, index) => (
            <PlotCard
              key={plot.id}
              plot={plot}
              index={index}
              selectedVariety={selectedVariety}
              speed={speed}
              onPlant={plantPlot}
              onHarvest={harvestMelon}
            />
          ))}
        </ul>

        <LastHarvests harvests={recentHarvests} best={personalBest} />
      </div>

      {/* Right column: Patch upgrades */}
      <div className={frame.rightColumn}>
        <EventUpgradesPanel
          title="Patch Upgrades"
          category="farming"
          upgrades={upgrades}
          currency="tickets"
          balance={tickets}
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

const MemoizedMelonPatchTab = memo(MelonPatchTab);
MemoizedMelonPatchTab.displayName = 'MelonPatchTab';

export default MemoizedMelonPatchTab;

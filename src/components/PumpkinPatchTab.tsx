/**
 * Pumpkin Patch Tab Component
 *
 * Fall Pumpkin Rush farming: choose a variety, plant, grow and harvest
 * pumpkins. Mirrors the Christmas Tree Farm tab: variety selector, plot grid,
 * materials summary and Patch upgrades on the right.
 */

import { memo, useCallback, useId, useState, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import ProgressBar from './ProgressBar';
import { PUMPKIN_ART, PUMPKIN_VARIETIES } from '../data/pumpkinEventData';
import { ownsUpgrade, parsePumpkinKey, pumpkinGrowthSpeed } from '../utils/pumpkinPricing';
import type { UsePumpkinEventReturn } from '../hooks/usePumpkinEvent';
import type { PumpkinInventory, PumpkinPlot, PumpkinVariety } from '../types/pumpkinEvent';
import styles from './PumpkinPatchTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

interface PumpkinPatchTabProps {
  event: UsePumpkinEventReturn;
  formatNumber: FormatNumber;
}

/** Varieties in unlock order */
const VARIETIES: PumpkinVariety[] = ['sugarPie', 'carver', 'giant'];

/** Growth shown as a sprout below this percentage */
const SPROUT_PERCENT = 33;

/** Plain (uncarved) pumpkins of a variety in the inventory, any quality */
function countPlain(inventory: PumpkinInventory, variety: PumpkinVariety): number {
  let count = 0;
  for (const [key, quantity] of Object.entries(inventory)) {
    const parts = parsePumpkinKey(key);
    if (parts.variety === variety && parts.finish === 'plain') count += quantity;
  }
  return count;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

// ============================================================================
// VARIETY SELECTOR
// ============================================================================

interface VarietySelectorProps {
  variety: PumpkinVariety;
  selected: boolean;
  unlocked: boolean;
  canAfford: boolean;
  /** Id of a hint that describes this variety */
  describedBy?: string;
  onSelect: (variety: PumpkinVariety) => void;
  onUnlock: (variety: PumpkinVariety) => void;
  formatNumber: FormatNumber;
}

const VarietySelector: FC<VarietySelectorProps> = memo(({
  variety,
  selected,
  unlocked,
  canAfford,
  describedBy,
  onSelect,
  onUnlock,
  formatNumber
}) => {
  const definition = PUMPKIN_VARIETIES[variety];
  const cost = formatNumber(definition.unlockCost, 0);

  const handleClick = () => {
    if (unlocked) onSelect(variety);
    else if (canAfford) onUnlock(variety);
  };

  const label = unlocked
    ? `${definition.name}, ${definition.growthTime} days to grow`
    : `Unlock ${definition.name} for ${cost} Candy Corn${canAfford ? '' : '. Not enough Candy Corn'}`;

  const className = [
    styles.varietySelector,
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
      <EventArt art={definition.art} size={24} />
      <span className={styles.varietyName}>
        {unlocked || !canAfford ? definition.name : `Unlock ${definition.name}`}
      </span>
      {!unlocked && (
        <span className={styles.varietyCost}>
          {cost} <EventArt art={PUMPKIN_ART.candyCorn} size={14} />
        </span>
      )}
    </button>
  );
});

VarietySelector.displayName = 'VarietySelector';

// ============================================================================
// PLOT
// ============================================================================

interface PlotCardProps {
  plot: PumpkinPlot;
  index: number;
  selectedVariety: PumpkinVariety;
  /** Growth speed multiplier from the Compost Heap */
  speed: number;
  onPlant: (index: number) => void;
  onHarvest: (index: number) => void;
}

const PlotCard: FC<PlotCardProps> = memo(({ plot, index, selectedVariety, speed, onPlant, onHarvest }) => {
  const plotNumber = index + 1;

  if (plot.variety === null) {
    const seed = PUMPKIN_VARIETIES[selectedVariety];
    return (
      <li className={`${styles.plot} ${styles.empty}`}>
        <div className={styles.plotContent}>
          <EventArt art={PUMPKIN_ART.sprout} size={40} className={styles.emptyArt} />
          <button
            type="button"
            className={styles.plantButton}
            onClick={() => onPlant(index)}
            aria-label={`Plant ${seed.displayName} in plot ${plotNumber}`}
          >
            Plant {seed.name}
          </button>
        </div>
      </li>
    );
  }

  const definition = PUMPKIN_VARIETIES[plot.variety];
  const isBlueRibbon = plot.quality === 'blueRibbon';
  const ready = plot.harvestReady;
  const percent = plot.growthTime > 0 ? Math.min(100, (plot.growth / plot.growthTime) * 100) : 100;
  const daysLeft = Math.max(0, Math.ceil((plot.growthTime - plot.growth) / speed));
  const art = ready || percent >= SPROUT_PERCENT ? definition.art : PUMPKIN_ART.sprout;

  const className = [
    styles.plot,
    ready ? styles.ready : '',
    isBlueRibbon ? styles.blueRibbon : ''
  ].filter(Boolean).join(' ');

  return (
    <li className={className}>
      {isBlueRibbon && (
        <span className={styles.ribbonBadge}>
          <EventArt art={PUMPKIN_ART.blueRibbon} size={14} /> Blue Ribbon
        </span>
      )}
      <div className={styles.plotContent}>
        <div className={styles.pumpkinDisplay}>
          <EventArt art={art} size={plot.variety === 'giant' && ready ? 56 : 48} />
          <div className={styles.pumpkinName}>{definition.displayName}</div>
        </div>

        {ready ? (
          <button
            type="button"
            className={styles.harvestButton}
            onClick={() => onHarvest(index)}
            aria-label={`Harvest ${isBlueRibbon ? 'Blue Ribbon ' : ''}${definition.displayName} from plot ${plotNumber}`}
          >
            <EventArt art={PUMPKIN_ART.patch} size={16} />
            Harvest Ready!
          </button>
        ) : (
          <div className={styles.progressSection}>
            <div
              className={styles.progressBarWrapper}
              role="progressbar"
              aria-label={`${definition.displayName} in plot ${plotNumber} growth`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.floor(percent)}
            >
              <ProgressBar value={percent} max={100} height={12} color="#E8711A" />
              <span className={styles.progressLabel} aria-hidden="true">{Math.floor(percent)}%</span>
            </div>
            <span className={styles.progressText}>{plural(daysLeft, 'day')} left</span>
          </div>
        )}
      </div>
    </li>
  );
});

PlotCard.displayName = 'PlotCard';

// ============================================================================
// MATERIALS
// ============================================================================

interface MaterialsSummaryProps {
  seeds: number;
  pulp: number;
  vines: number;
  sugarPie: number;
  carver: number;
  giants: number;
  formatNumber: FormatNumber;
}

const MaterialsSummary: FC<MaterialsSummaryProps> = memo(({ seeds, pulp, vines, sugarPie, carver, giants, formatNumber }) => {
  const items = [
    { label: 'Sugar Pie', value: sugarPie, art: PUMPKIN_ART.sugarPie, title: 'Plain Sugar Pie pumpkins in stock' },
    { label: 'Carver', value: carver, art: PUMPKIN_ART.carver, title: 'Plain Carving pumpkins in stock' },
    { label: 'Giants', value: giants, art: PUMPKIN_ART.scale, title: 'Atlantic Giants on the County Fair shelf' },
    { label: 'Seeds', value: seeds, art: PUMPKIN_ART.seeds, title: 'Pumpkin seeds' },
    { label: 'Pulp', value: pulp, art: PUMPKIN_ART.pulp, title: 'Pumpkin pulp' },
    { label: 'Vines', value: vines, art: PUMPKIN_ART.vines, title: 'Dried vines' },
  ];

  return (
    <ul className={styles.materialsList} aria-label="Materials">
      {items.map(item => (
        <li key={item.label} className={styles.materialItem} title={item.title}>
          <EventArt art={item.art} size={20} />
          <span className={styles.materialLabel}>{item.label}</span>
          <span className={styles.materialValue}>{formatNumber(item.value, 0)}</span>
        </li>
      ))}
    </ul>
  );
});

MaterialsSummary.displayName = 'MaterialsSummary';

// ============================================================================
// TAB
// ============================================================================

const PumpkinPatchTab: FC<PumpkinPatchTabProps> = ({ event, formatNumber }) => {
  const {
    plots,
    materials,
    candyCorn,
    giantShelf,
    plantPumpkin,
    harvestPumpkin,
    harvestAllPumpkins,
    purchaseUpgrade
  } = event;
  const { upgrades, inventory } = event.eventState;
  const giantHintId = useId();

  const unlocked = VARIETIES.filter(variety => ownsUpgrade(upgrades, PUMPKIN_VARIETIES[variety].unlockUpgrade));
  const bestUnlocked = unlocked[unlocked.length - 1] ?? 'sugarPie';

  const [chosenVariety, setChosenVariety] = useState<PumpkinVariety>(bestUnlocked);
  // A reset can lock the chosen variety again; fall back to the best one still unlocked
  const selectedVariety = unlocked.includes(chosenVariety) ? chosenVariety : bestUnlocked;

  // Compost Heap speeds growth, so days left counts down faster
  const speed = pumpkinGrowthSpeed(upgrades);

  const harvestAllOwned = ownsUpgrade(upgrades, 'harvest_all_upgrade');
  const plantAllOwned = ownsUpgrade(upgrades, 'plant_all_upgrade');
  const readyCount = plots.filter(p => p.harvestReady).length;
  const emptyCount = plots.filter(p => p.variety === null).length;

  // Unlocking a variety also selects it
  const unlockVariety = useCallback((variety: PumpkinVariety) => {
    if (purchaseUpgrade(PUMPKIN_VARIETIES[variety].unlockUpgrade)) {
      setChosenVariety(variety);
    }
  }, [purchaseUpgrade]);

  const plantPlot = useCallback((index: number) => {
    plantPumpkin(index, selectedVariety);
  }, [plantPumpkin, selectedVariety]);

  const plantAll = () => {
    plots.forEach((plot, index) => {
      if (plot.variety === null) plantPumpkin(index, selectedVariety);
    });
  };

  const selectedName = PUMPKIN_VARIETIES[selectedVariety].displayName;

  const mainContent = (
    <div className={styles.container}>
      {/* Left column: header, variety selection and plots */}
      <div className={styles.leftColumn}>
        <div className={styles.headerRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.plotsTitle}>
              <EventArt art={PUMPKIN_ART.patch} size={24} /> Pumpkin Patch
            </h2>
            {harvestAllOwned && readyCount > 0 && (
              <button
                type="button"
                className={styles.harvestAllButton}
                onClick={harvestAllPumpkins}
                aria-label={`Harvest All: ${plural(readyCount, 'ready pumpkin')}`}
              >
                <EventArt art={PUMPKIN_ART.sugarPie} size={20} />
                Harvest All ({readyCount})
              </button>
            )}
            {plantAllOwned && emptyCount > 0 && (
              <button
                type="button"
                className={styles.plantAllButton}
                onClick={plantAll}
                aria-label={`Plant All: ${selectedName} in ${plural(emptyCount, 'empty plot')}`}
              >
                <EventArt art={PUMPKIN_ART.sprout} size={20} />
                Plant All ({emptyCount})
              </button>
            )}
          </div>

          <MaterialsSummary
            seeds={materials.seeds}
            pulp={materials.pulp}
            vines={materials.vines}
            sugarPie={countPlain(inventory, 'sugarPie')}
            carver={countPlain(inventory, 'carver')}
            giants={giantShelf.length}
            formatNumber={formatNumber}
          />
        </div>

        <div className={styles.varietyRow}>
          <div className={styles.varietyGroup} role="group" aria-label="Pumpkin variety to plant">
            {VARIETIES.map(variety => (
              <VarietySelector
                key={variety}
                variety={variety}
                selected={selectedVariety === variety}
                unlocked={unlocked.includes(variety)}
                canAfford={candyCorn >= PUMPKIN_VARIETIES[variety].unlockCost}
                describedBy={variety === 'giant' ? giantHintId : undefined}
                onSelect={setChosenVariety}
                onUnlock={unlockVariety}
                formatNumber={formatNumber}
              />
            ))}
          </div>
          <p id={giantHintId} className={styles.giantHint}>
            <EventArt art={PUMPKIN_ART.fair} size={16} /> Atlantic Giants go to the County Fair shelf, not the stand.
          </p>
        </div>

        <ul className={styles.plotsGrid} aria-label="Pumpkin plots">
          {plots.map((plot, index) => (
            <PlotCard
              key={plot.id}
              plot={plot}
              index={index}
              selectedVariety={selectedVariety}
              speed={speed}
              onPlant={plantPlot}
              onHarvest={harvestPumpkin}
            />
          ))}
        </ul>
      </div>

      {/* Right column: Patch upgrades */}
      <div className={styles.rightColumn}>
        <EventUpgradesPanel
          title="Patch Upgrades"
          category="farming"
          upgrades={upgrades}
          currency="candyCorn"
          balance={candyCorn}
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

const MemoizedPumpkinPatchTab = memo(PumpkinPatchTab);
MemoizedPumpkinPatchTab.displayName = 'PumpkinPatchTab';

export default MemoizedPumpkinPatchTab;

/**
 * Tree Farm Tab Component
 *
 * Christmas Tree Shop farming: choose a tree, plant, grow and harvest. Laid out
 * like the Pumpkin Patch: a header bar with stock, the tree selector, the plot
 * grid and Farming upgrades on the right.
 */

import { memo, useCallback, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import ProgressBar from './ProgressBar';
import { CHRISTMAS_ART, TREE_DEFINITIONS } from '../data/christmasEventData';
import { countTrees, ownsUpgrade, treeGrowthSpeed } from '../utils/christmasTreePricing';
import type { UseChristmasEventReturn } from '../hooks/useChristmasEvent';
import type { TreeInventory, TreePlot, TreeType } from '../types/christmasEvent';
import frame from './TreeShopSections.module.css';
import styles from './TreeFarmTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

interface TreeFarmTabProps {
  event: UseChristmasEventReturn;
  formatNumber: FormatNumber;
}

/** Trees in unlock order */
const TREES: TreeType[] = ['pine', 'spruce', 'fir'];

/** Growth shown as a sapling below this percentage */
const SAPLING_PERCENT = 33;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

// ============================================================================
// TREE SELECTOR
// ============================================================================

interface TreeSelectorProps {
  treeType: TreeType;
  selected: boolean;
  unlocked: boolean;
  canAfford: boolean;
  onSelect: (treeType: TreeType) => void;
  onUnlock: (treeType: TreeType) => void;
  formatNumber: FormatNumber;
}

const TreeSelector: FC<TreeSelectorProps> = memo(({
  treeType,
  selected,
  unlocked,
  canAfford,
  onSelect,
  onUnlock,
  formatNumber
}) => {
  const definition = TREE_DEFINITIONS[treeType];
  // Two places, so Fir reads 1.25K rather than 1K
  const cost = formatNumber(definition.unlockCost, 2);
  const years = Math.round(definition.baseGrowthTime / 365);

  const handleClick = () => {
    if (unlocked) onSelect(treeType);
    else if (canAfford) onUnlock(treeType);
  };

  const label = unlocked
    ? `${definition.displayName}, ${years} years to grow`
    : `Unlock ${definition.displayName} for ${cost} Holiday Cheer${canAfford ? '' : '. Not enough Holiday Cheer'}`;

  const className = [
    styles.treeSelector,
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
    >
      <EventArt art={CHRISTMAS_ART[treeType]} size={24} />
      <span className={styles.treeName}>
        {unlocked || !canAfford ? definition.name : `Unlock ${definition.name}`}
      </span>
      {!unlocked && (
        <span className={styles.treeCost}>
          {cost} <EventArt art={CHRISTMAS_ART.cheer} size={14} />
        </span>
      )}
    </button>
  );
});

TreeSelector.displayName = 'TreeSelector';

// ============================================================================
// PLOT
// ============================================================================

interface PlotCardProps {
  plot: TreePlot;
  index: number;
  selectedTree: TreeType;
  /** Growth speed multiplier from Fertilized Soil */
  speed: number;
  onPlant: (index: number) => void;
  onHarvest: (index: number) => void;
}

const QUALITY_BADGES = {
  perfect: { label: 'Perfect', art: CHRISTMAS_ART.perfect },
  luxury: { label: 'Luxury', art: CHRISTMAS_ART.luxury },
} as const;

const PlotCard: FC<PlotCardProps> = memo(({ plot, index, selectedTree, speed, onPlant, onHarvest }) => {
  const plotNumber = index + 1;

  if (plot.treeType === null) {
    const seed = TREE_DEFINITIONS[selectedTree];
    return (
      <li className={`${styles.plot} ${styles.empty}`}>
        <div className={styles.plotContent}>
          <EventArt art={CHRISTMAS_ART.sapling} size={40} className={styles.emptyArt} />
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

  const definition = TREE_DEFINITIONS[plot.treeType];
  const badge = plot.quality === 'normal' ? null : QUALITY_BADGES[plot.quality];
  const ready = plot.harvestReady;
  const percent = plot.growthTime > 0 ? Math.min(100, (plot.growth / plot.growthTime) * 100) : 100;
  const daysLeft = Math.max(0, Math.ceil((plot.growthTime - plot.growth) / speed));
  const art = ready || percent >= SAPLING_PERCENT ? CHRISTMAS_ART[plot.treeType] : CHRISTMAS_ART.sapling;

  const className = [
    styles.plot,
    ready ? styles.ready : '',
    badge ? styles.special : ''
  ].filter(Boolean).join(' ');

  return (
    <li className={className}>
      {badge && (
        <span className={styles.qualityBadge}>
          <EventArt art={badge.art} size={14} /> {badge.label}
        </span>
      )}
      <div className={styles.plotContent}>
        <div className={styles.treeDisplay}>
          <EventArt art={art} size={48} />
          <div className={styles.plotName}>{definition.displayName}</div>
        </div>

        {ready ? (
          <button
            type="button"
            className={styles.harvestButton}
            onClick={() => onHarvest(index)}
            aria-label={`Harvest ${badge ? `${badge.label} ` : ''}${definition.displayName} from plot ${plotNumber}`}
          >
            <EventArt art={CHRISTMAS_ART.axe} size={16} />
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
              <ProgressBar value={percent} max={100} height={12} color="#23705D" />
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
// STOCK
// ============================================================================

interface StockSummaryProps {
  inventory: TreeInventory;
  wood: number;
  pinecones: number;
  branches: number;
  formatNumber: FormatNumber;
}

const StockSummary: FC<StockSummaryProps> = memo(({ inventory, wood, pinecones, branches, formatNumber }) => {
  const items = [
    ...TREES.map(treeType => ({
      label: TREE_DEFINITIONS[treeType].name,
      value: countTrees(inventory, treeType, 'plain'),
      art: CHRISTMAS_ART[treeType],
      title: `Undecorated ${TREE_DEFINITIONS[treeType].displayName}s in stock`
    })),
    { label: 'Wood', value: wood, art: CHRISTMAS_ART.wood, title: 'Wood' },
    { label: 'Pinecones', value: pinecones, art: CHRISTMAS_ART.pinecones, title: 'Pinecones' },
    { label: 'Branches', value: branches, art: CHRISTMAS_ART.branches, title: 'Branches' },
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

const TreeFarmTab: FC<TreeFarmTabProps> = ({ event, formatNumber }) => {
  const {
    treePlots,
    materials,
    holidayCheer,
    plantTree,
    chooseTree,
    harvestTree,
    harvestAllTrees,
    purchaseUpgrade
  } = event;
  const { upgrades, treeInventory } = event.eventState;

  const unlocked = TREES.filter(treeType => ownsUpgrade(upgrades, `unlock_${treeType}`) || treeType === 'pine');
  const bestUnlocked = unlocked[unlocked.length - 1] ?? 'pine';

  // The event keeps the chosen tree, so it stays chosen after leaving the tab.
  // A reset can lock it again; fall back to the best one still unlocked
  const chosenTree = event.eventState.chosenTree;
  const selectedTree = chosenTree && unlocked.includes(chosenTree) ? chosenTree : bestUnlocked;

  // Fertilized Soil speeds growth, so days left counts down faster
  const speed = treeGrowthSpeed(upgrades);

  const harvestAllOwned = ownsUpgrade(upgrades, 'harvest_all_upgrade');
  const plantAllOwned = ownsUpgrade(upgrades, 'plant_all_upgrade');
  const readyCount = treePlots.filter(p => p.harvestReady).length;
  const emptyCount = treePlots.filter(p => p.treeType === null).length;

  // Unlocking a tree also selects it
  const unlockTree = useCallback((treeType: TreeType) => {
    if (purchaseUpgrade(`unlock_${treeType}`)) {
      chooseTree(treeType);
    }
  }, [purchaseUpgrade, chooseTree]);

  const plantPlot = useCallback((index: number) => {
    plantTree(index, selectedTree);
  }, [plantTree, selectedTree]);

  const plantAll = () => {
    treePlots.forEach((plot, index) => {
      if (plot.treeType === null) plantTree(index, selectedTree);
    });
  };

  const selectedName = TREE_DEFINITIONS[selectedTree].displayName;

  const mainContent = (
    <div className={frame.container}>
      {/* Left column: header, tree selection and plots */}
      <div className={frame.leftColumn}>
        <div className={frame.headerRow}>
          <div className={frame.titleGroup}>
            <h2 className={frame.sectionTitle}>
              <EventArt art={CHRISTMAS_ART.farm} size={24} /> Tree Farm
            </h2>
            {harvestAllOwned && readyCount > 0 && (
              <button
                type="button"
                className={frame.primaryAction}
                onClick={harvestAllTrees}
                aria-label={`Harvest All: ${plural(readyCount, 'ready tree')}`}
              >
                <EventArt art={CHRISTMAS_ART.axe} size={20} />
                Harvest All ({readyCount})
              </button>
            )}
            {plantAllOwned && emptyCount > 0 && (
              <button
                type="button"
                className={frame.secondaryAction}
                onClick={plantAll}
                aria-label={`Plant All: ${selectedName} in ${plural(emptyCount, 'empty plot')}`}
              >
                <EventArt art={CHRISTMAS_ART.sapling} size={20} />
                Plant All ({emptyCount})
              </button>
            )}
          </div>

          <StockSummary
            inventory={treeInventory}
            wood={materials.wood}
            pinecones={materials.pinecones}
            branches={materials.branches}
            formatNumber={formatNumber}
          />
        </div>

        <div className={styles.treeRow}>
          <div className={styles.treeGroup} role="group" aria-label="Tree to plant">
            {TREES.map(treeType => (
              <TreeSelector
                key={treeType}
                treeType={treeType}
                selected={selectedTree === treeType}
                unlocked={unlocked.includes(treeType)}
                canAfford={holidayCheer >= TREE_DEFINITIONS[treeType].unlockCost}
                onSelect={chooseTree}
                onUnlock={unlockTree}
                formatNumber={formatNumber}
              />
            ))}
          </div>
          <p className={styles.treeHint}>
            <EventArt art={CHRISTMAS_ART.workshop} size={16} /> Each harvest brings wood, pinecones and branches for the Workshop.
          </p>
        </div>

        <ul className={styles.plotsGrid} aria-label="Tree plots">
          {treePlots.map((plot, index) => (
            <PlotCard
              key={plot.id}
              plot={plot}
              index={index}
              selectedTree={selectedTree}
              speed={speed}
              onPlant={plantPlot}
              onHarvest={harvestTree}
            />
          ))}
        </ul>
      </div>

      {/* Right column: Farming upgrades */}
      <div className={frame.rightColumn}>
        <EventUpgradesPanel
          title="Farming Upgrades"
          category="farming"
          upgrades={upgrades}
          currency="cheer"
          balance={holidayCheer}
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

const MemoizedTreeFarmTab = memo(TreeFarmTab);
MemoizedTreeFarmTab.displayName = 'TreeFarmTab';

export default MemoizedTreeFarmTab;

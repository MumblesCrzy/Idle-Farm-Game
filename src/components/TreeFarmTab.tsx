/**
 * Tree Farm Tab Component
 * 
 * Main UI for the Christmas Tree Shop event's tree farming system.
 * Displays tree plots, seed selector, growth progress, and harvest controls.
 */

import React, { memo } from 'react';
import BaseTab from './BaseTab';
import ProgressBar from './ProgressBar';
import FarmingUpgradesPanel from './FarmingUpgradesPanel';
import type { TreePlot, TreeType, CraftingMaterials, TreeInventory } from '../types/christmasEvent';
import type { EventUpgrade } from '../types/christmasEvent';
import { TREE_DEFINITIONS } from '../data/christmasEventData';
import { ICON_AXE, TREE_SAPLING, TREE_PINE, TREE_SPRUCE, TREE_FIR, TREE_DECORATED, ICON_HOLIDAY_CHEER, MATERIAL_WOOD, MATERIAL_PINECONE, MATERIAL_BRANCH } from '../config/assetPaths';
import styles from './TreeFarmTab.module.css';

/**
 * Helper function to get the appropriate tree image based on type and growth
 */
const getTreeImage = (treeType: TreeType, growthPercent?: number): string => {
  // If no growth percent or less than 33%, show sapling
  if (growthPercent !== undefined && growthPercent < 33) {
    return TREE_SAPLING;
  }
  
  // Otherwise show the appropriate mature tree
  switch (treeType) {
    case 'pine':
      return TREE_PINE;
    case 'spruce':
      return TREE_SPRUCE;
    case 'fir':
      return TREE_FIR;
    default:
      return TREE_PINE;
  }
};

interface TreeFarmTabProps {
  // State
  treePlots: TreePlot[];
  materials: CraftingMaterials;
  treeInventory: TreeInventory;
  upgrades: EventUpgrade[];
  holidayCheer: number;
  
  // Actions
  plantTree: (plotIndex: number, treeType: TreeType) => void;
  harvestTree: (plotIndex: number) => void;
  harvestAllTrees: () => void;
  purchaseUpgrade: (upgradeId: string) => boolean;
  
  // Display
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

/**
 * Tree type selector button
 */
interface TreeSelectorProps {
  treeType: TreeType;
  selected: boolean;
  unlocked: boolean;
  cost: number;
  holidayCheer: number;
  onSelect: () => void;
  onUnlock?: () => void;
}

const TreeSelector: React.FC<TreeSelectorProps> = memo(({ 
  treeType, 
  selected, 
  unlocked, 
  cost, 
  holidayCheer,
  onSelect,
  onUnlock
}) => {
  const definition = TREE_DEFINITIONS[treeType];
  const canAfford = holidayCheer >= cost;
  
  const handleClick = () => {
    if (!unlocked && onUnlock) {
      // Try to unlock the tree
      if (canAfford) {
        onUnlock();
      }
    } else if (unlocked) {
      // Select the tree type
      onSelect();
    }
  };
  
  const getButtonText = () => {
    if (unlocked) {
      return definition.name;
    }
    return canAfford ? `Unlock ${definition.name}` : `${definition.name}`;
  };
  
  return (
    <button
      className={`${styles.treeSelector} ${selected ? styles.selected : ''} ${!unlocked ? styles.locked : ''} ${!unlocked && !canAfford ? styles.cantAfford : ''}`}
      onClick={handleClick}
      disabled={!unlocked && !canAfford}
      title={!unlocked ? (canAfford ? `Click to unlock for ${cost} Holiday Cheer` : `Need ${cost} Holiday Cheer to unlock`) : `Select ${definition.displayName}`}
    >
      <div className={styles.treeSelectorIcon}>
        <img src={getTreeImage(treeType)} alt={definition.displayName} className={styles.treeImage} />
      </div>
      <div className={styles.treeSelectorName}>{getButtonText()}</div>
      {!unlocked && (
        <div className={styles.treeSelectorCost}>
          {cost} <img src={ICON_HOLIDAY_CHEER} alt="Holiday Cheer" className={styles.cheerIcon} />
        </div>
      )}
    </button>
  );
});

TreeSelector.displayName = 'TreeSelector';

/**
 * Individual tree plot display
 */
interface TreePlotDisplayProps {
  plot: TreePlot;
  selectedTreeType: TreeType | null;
  upgrades: EventUpgrade[];
  onPlant: () => void;
  onHarvest: () => void;
}

const TreePlotDisplay: React.FC<TreePlotDisplayProps> = memo(({
  plot,
  selectedTreeType,
  upgrades,
  onPlant,
  onHarvest
}) => {
  const isEmpty = plot.treeType === null;
  const canPlant = isEmpty && selectedTreeType !== null;
  const canHarvest = plot.harvestReady && !isEmpty;
  const isPerfect = plot.quality === 'perfect';
  const isLuxury = plot.quality === 'luxury';
  
  // Calculate speed bonus from upgrades
  const fertilizedSoil = upgrades.find(u => u.id === 'fertilized_soil');
  const fertilizedSoilLevel = fertilizedSoil?.level ?? 0;
  const speedBonus = 1.0 + (fertilizedSoilLevel * 0.15); // +15% per level
  
  const definition = plot.treeType ? TREE_DEFINITIONS[plot.treeType] : null;
  const growthPercent = plot.growthTime > 0 ? (plot.growth / plot.growthTime) * 100 : 0;
  
  // Calculate actual days remaining based on speed bonus
  const growthRemaining = plot.growthTime - plot.growth;
  const actualDaysRemaining = Math.ceil(growthRemaining / speedBonus);
  
  return (
    <div className={`${styles.treePlot} ${isEmpty ? styles.empty : ''} ${canHarvest ? styles.ready : ''} ${isPerfect ? styles.perfect : ''} ${isLuxury ? styles.luxury : ''}`}>
      {plot.quality !== 'normal' && !isEmpty && (
        <div className={styles.qualityBadgeTop}>
          {plot.quality === 'perfect' ? '⭐ Perfect' : '✨ Luxury'}
        </div>
      )}
      
      <div className={styles.plotContent}>
        {isEmpty ? (
          <div className={styles.emptyPlot}>
            <div className={styles.emptyPlotIcon}>
              <img src={TREE_SAPLING} alt="Empty plot" className={styles.treeImage} />
            </div>
            <button
              className={styles.plantButton}
              onClick={onPlant}
              disabled={!canPlant}
              title={canPlant ? `Plant ${TREE_DEFINITIONS[selectedTreeType!].displayName}` : 'Select a tree type'}
            >
              {canPlant ? `Plant ${TREE_DEFINITIONS[selectedTreeType!].name}` : 'Select Tree'}
            </button>
          </div>
        ) : (
          <>
            <div className={styles.treeDisplay}>
              <div className={styles.treeIcon}>
                <img 
                  src={getTreeImage(plot.treeType!, growthPercent)} 
                  alt={definition?.displayName} 
                  className={styles.treeImage} 
                />
              </div>
              <div className={styles.treeName}>{definition?.displayName}</div>
            </div>
            
            {!canHarvest ? (
            <div className={styles.progressSection}>
              <div className={styles.progressContainer}>
                <div className={styles.progressBarWrapper}>
                  <ProgressBar value={growthPercent} max={100} height={12} color="#23705D" />
                  <span className={styles.progressLabel}>
                    {Math.floor(growthPercent)}%
                  </span>
                </div>
                <span className={styles.progressText}>
                  {actualDaysRemaining} days remaining
                </span>
              </div>
            </div>
            ) : (
              <button
                className={styles.harvestButton}
                onClick={onHarvest}
                title={`Harvest ${definition?.displayName}`}
              >
                <img src={ICON_AXE} alt="" className={styles.harvestIcon} />
                Harvest Ready!
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

TreePlotDisplay.displayName = 'TreePlotDisplay';

/**
 * Materials inventory display
 */
interface MaterialsDisplayProps {
  materials: CraftingMaterials;
  treeInventory: TreeInventory;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const MaterialsDisplay: React.FC<MaterialsDisplayProps> = memo(({ materials, treeInventory, formatNumber }) => {
  // Count plain trees across all qualities (normal, perfect, luxury)
  // New format: pine_normal_plain, pine_perfect_plain, pine_luxury_plain
  const getPlainTreeCount = (treeType: string): number => {
    let count = 0;
    Object.keys(treeInventory).forEach(key => {
      if (key.startsWith(`${treeType}_`) && key.endsWith('_plain')) {
        count += treeInventory[key] || 0;
      }
    });
    return count;
  };
  
  const pineCount = getPlainTreeCount('pine');
  const spruceCount = getPlainTreeCount('spruce');
  const firCount = getPlainTreeCount('fir');
  
  return (
    <div className={styles.materialsDisplay}>
      <h3 className={styles.materialsTitle}>📦 Materials</h3>
      <div className={styles.materialsList}>
        {/* Trees Row */}
        <div className={styles.materialItem}>
          <span className={styles.materialIcon}>
            <img src={TREE_PINE} alt="Pine" className={styles.materialImage} />
          </span>
          <span className={styles.materialLabel}>Pine:</span>
          <span className={styles.materialValue}>{pineCount}</span>
          <span className={styles.materialIcon}>
            <img src={TREE_SPRUCE} alt="Spruce" className={styles.materialImage} />
          </span>
          <span className={styles.materialLabel}>Spruce:</span>
          <span className={styles.materialValue}>{spruceCount}</span>
          <span className={styles.materialIcon}>
            <img src={TREE_FIR} alt="Fir" className={styles.materialImage} />
          </span>
          <span className={styles.materialLabel}>Fir:</span>
          <span className={styles.materialValue}>{firCount}</span>
        </div>
        {/* Materials Row */}
        <div className={styles.materialItem}>
          <span className={styles.materialIcon}>
            <img src={MATERIAL_WOOD} alt="Wood" className={styles.materialImage} />
          </span>
          <span className={styles.materialLabel}>Wood:</span>
          <span className={styles.materialValue}>{materials.wood}</span>
          <span className={styles.materialIcon}>
            <img src={MATERIAL_PINECONE} alt="Pinecones" className={styles.materialImage} />
          </span>
          <span className={styles.materialLabel}>Pinecones:</span>
          <span className={styles.materialValue}>{materials.pinecones}</span>
            <img src={MATERIAL_BRANCH} alt="Branches" className={styles.materialImage} />
          <span className={styles.materialLabel}>Branches:</span>
          <span className={styles.materialValue}>{materials.branches}</span>
        </div>
      </div>
    </div>
  );
});

MaterialsDisplay.displayName = 'MaterialsDisplay';

/**
 * Main Tree Farm Tab Component
 */
const TreeFarmTab: React.FC<TreeFarmTabProps> = ({
  treePlots,
  materials,
  treeInventory,
  upgrades,
  holidayCheer,
  plantTree,
  harvestTree,
  harvestAllTrees,
  purchaseUpgrade,
  formatNumber,
}) => {
  // Check which trees are unlocked
  const pineUnlocked = upgrades.find(u => u.id === 'unlock_pine')?.owned ?? true;
  const spruceUnlocked = upgrades.find(u => u.id === 'unlock_spruce')?.owned ?? false;
  const firUnlocked = upgrades.find(u => u.id === 'unlock_fir')?.owned ?? false;
  
  // Check if special actions are unlocked
  const harvestAllUnlocked = upgrades.find(u => u.id === 'harvest_all_upgrade')?.owned ?? false;
  const plantAllUnlocked = upgrades.find(u => u.id === 'plant_all_upgrade')?.owned ?? false;
  
  // Determine the highest tier unlocked tree
  const getHighestUnlockedTree = (): TreeType => {
    if (firUnlocked) return 'fir';
    if (spruceUnlocked) return 'spruce';
    return 'pine';
  };
  
  const [selectedTreeType, setSelectedTreeType] = React.useState<TreeType | null>(getHighestUnlockedTree());
  
  // Update selected tree when a higher tier is unlocked
  React.useEffect(() => {
    const highestUnlocked = getHighestUnlockedTree();
    // Only update if the newly unlocked tree is higher tier than current selection
    if (selectedTreeType === 'pine' && (spruceUnlocked || firUnlocked)) {
      setSelectedTreeType(highestUnlocked);
    } else if (selectedTreeType === 'spruce' && firUnlocked) {
      setSelectedTreeType('fir');
    }
  }, [spruceUnlocked, firUnlocked]);
  
  // Count ready trees and empty plots
  const readyTreesCount = treePlots.filter(p => p.harvestReady).length;
  const hasReadyTrees = readyTreesCount > 0;
  const emptyPlotsCount = treePlots.filter(p => p.treeType === null).length;
  const hasEmptyPlots = emptyPlotsCount > 0 && selectedTreeType !== null;
  
  // Plant All function
  const handlePlantAll = () => {
    if (!selectedTreeType) return;
    
    treePlots.forEach((plot, index) => {
      if (plot.treeType === null) {
        plantTree(index, selectedTreeType);
      }
    });
  };
  
  const mainContent = (
    <div className={styles.container}>
        {/* Left Column: Materials, Tree Plots, Selection, and Grid */}
        <div className={styles.leftColumn}>
          {/* Materials Display */}
          {/* Combined Header Row: Materials, Tree Plots Title, and Tree Selection */}
          <div className={styles.headerRow}>          
            {/* Tree Plots Title */}
            <div className={styles.plotsHeaderCompact}>
              <h2 className={styles.plotsTitle}>
                <img src={TREE_PINE} alt="" className={styles.titleIcon} /> Tree Plots
              </h2>
              {harvestAllUnlocked && hasReadyTrees && (
                <button
                  className={styles.harvestAllButton}
                  onClick={harvestAllTrees}
                  title={`Harvest ${readyTreesCount} ready tree${readyTreesCount > 1 ? 's' : ''}`}
                >
                  <img src={ICON_AXE} alt="" className={styles.harvestAllIcon} />
                  Harvest All ({readyTreesCount})
                </button>
              )}
              {plantAllUnlocked && hasEmptyPlots && (
                <button
                  className={styles.plantAllButton}
                  onClick={handlePlantAll}
                  title={`Plant ${selectedTreeType ? TREE_DEFINITIONS[selectedTreeType].displayName : 'trees'} in all ${emptyPlotsCount} empty plot${emptyPlotsCount > 1 ? 's' : ''}`}
                >
                  <img src={TREE_SAPLING} alt="" className={styles.harvestAllIcon} />
                  Plant All ({emptyPlotsCount})
                </button>
              )}
            </div>

            {/* Materials */}
            <div className={styles.materialsCompact}>
              <div className={styles.materialsList}>
                {/* Trees Row */}
                <div className={styles.materialItem}>
                    <span className={styles.materialIcon}>
                      <img src={TREE_PINE} alt="Pine" className={styles.materialImage} />
                    </span>
                    <span className={styles.materialLabel}>Pine:</span>
                    <span className={styles.materialValue}>{(treeInventory['pine_plain'] ?? 0) || '0'}</span>
                    <span className={styles.materialIcon}>
                      <img src={TREE_SPRUCE} alt="Spruce" className={styles.materialImage} />
                    </span>
                    <span className={styles.materialLabel}>Spruce:</span>
                    <span className={styles.materialValue}>{(treeInventory['spruce_plain'] ?? 0) || '0'}</span>
                    <span className={styles.materialIcon}>
                      <img src={TREE_FIR} alt="Fir" className={styles.materialImage} />
                    </span>
                    <span className={styles.materialLabel}>Fir:</span>
                    <span className={styles.materialValue}>{(treeInventory['fir_plain'] ?? 0) || '0'}</span>
                    <span className={styles.materialIcon}>
                      <img src={MATERIAL_WOOD} alt="Wood" className={styles.materialImage} />
                    </span>
                    <span className={styles.materialValue}>{(materials.wood ?? 0) || '0'}</span>
                    <span className={styles.materialIcon}>
                      <img src={MATERIAL_PINECONE} alt="Pinecones" className={styles.materialImage} />
                    </span>
                    <span className={styles.materialValue}>{(materials.pinecones ?? 0) || '0'}</span>
                    <span className={styles.materialIcon}>
                      <img src={MATERIAL_BRANCH} alt="Branches" className={styles.materialImage} />
                    </span>
                    <span className={styles.materialValue}>{(materials.branches ?? 0) || '0'}</span>
                </div>
              </div>
            </div>            

            {/* Tree Selection */}
            <div className={styles.treeSelectionCompact}>
              <div className={styles.treeSelectorGrid}>
                <TreeSelector
                  treeType="pine"
                  selected={selectedTreeType === 'pine'}
                  unlocked={pineUnlocked}
                  cost={TREE_DEFINITIONS.pine.unlockCost}
                  holidayCheer={holidayCheer}
                  onSelect={() => setSelectedTreeType('pine')}
                  onUnlock={() => purchaseUpgrade('unlock_pine')}
                />
                <TreeSelector
                  treeType="spruce"
                  selected={selectedTreeType === 'spruce'}
                  unlocked={spruceUnlocked}
                  cost={TREE_DEFINITIONS.spruce.unlockCost}
                  holidayCheer={holidayCheer}
                  onSelect={() => setSelectedTreeType('spruce')}
                  onUnlock={() => {
                    if (purchaseUpgrade('unlock_spruce')) {
                      setSelectedTreeType('spruce');
                    }
                  }}
                />
                <TreeSelector
                  treeType="fir"
                  selected={selectedTreeType === 'fir'}
                  unlocked={firUnlocked}
                  cost={TREE_DEFINITIONS.fir.unlockCost}
                  holidayCheer={holidayCheer}
                  onSelect={() => setSelectedTreeType('fir')}
                  onUnlock={() => {
                    if (purchaseUpgrade('unlock_fir')) {
                      setSelectedTreeType('fir');
                    }
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Tree Plots Grid */}
          <div className={styles.plotsGrid}>
            {treePlots.map((plot, index) => (
              <TreePlotDisplay
                key={plot.id}
                plot={plot}
                selectedTreeType={selectedTreeType}
                upgrades={upgrades}
                onPlant={() => selectedTreeType && plantTree(index, selectedTreeType)}
                onHarvest={() => harvestTree(index)}
              />
            ))}
          </div>
        </div>
        
        {/* Right Column: Upgrades */}
        <div className={styles.rightColumn}>
          <FarmingUpgradesPanel
            upgrades={upgrades}
            holidayCheer={holidayCheer}
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

export default memo(TreeFarmTab);

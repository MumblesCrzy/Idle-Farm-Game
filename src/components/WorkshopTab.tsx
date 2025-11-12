/**
 * Workshop Tab Component
 * 
 * Handles decoration crafting and tree decoration for the Christmas Tree Shop event.
 * Features:
 * - Recipe rows for crafting ornaments, garlands, natural ornaments, and candles
 * - Decorate Tree section for applying decorations to harvested trees
 * - Elves' Bench automation queue for automated decoration
 */

import React, { memo } from 'react';
import type { CraftingRecipe, CraftingMaterials, TreeType, DecorationType, EventUpgrade, TreeInventory } from '../types/christmasEvent';
import { CRAFTING_RECIPES } from '../data/christmasEventData';
import { TREE_PINE, TREE_SPRUCE, TREE_FIR, MATERIAL_WOOD, MATERIAL_PINECONE, MATERIAL_BRANCH, DECORATION_WREATH, DECORATION_GARLAND, DECORATION_CANDLE } from '../config/assetPaths';
import BaseTab from './BaseTab';
import WorkshopUpgradesPanel from './WorkshopUpgradesPanel';
import styles from './WorkshopTab.module.css';

/**
 * Helper function to get tree image
 */
const getTreeImage = (treeType: TreeType): string => {
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

interface WorkshopTabProps {
  materials: CraftingMaterials;
  treeInventory: TreeInventory;
  craftItem: (recipeId: string) => boolean;
  decorateTree: (treeType: TreeType, decorations: DecorationType[]) => boolean;
  addToDecorationQueue: (treeType: TreeType, decorations: DecorationType[]) => void;
  automationEnabled: boolean;
  formatNumber: (num: number, decimalPlaces?: number) => string;
  upgrades: EventUpgrade[];
  holidayCheer: number;
  purchaseUpgrade: (upgradeId: string) => boolean;
}

/**
 * Individual recipe card for crafting items
 */
interface RecipeCardProps {
  recipe: CraftingRecipe;
  materials: CraftingMaterials;
  onCraft: (recipeId: string) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const RecipeCard: React.FC<RecipeCardProps> = memo(({ recipe, materials, onCraft, formatNumber }) => {
  // Check if player has enough materials
  const canCraft = Object.entries(recipe.inputs).every(([material, amount]) => {
    return materials[material as keyof CraftingMaterials] >= amount;
  });
  
  const handleCraft = () => {
    onCraft(recipe.id);
  };
  
  return (
    <div className={`${styles.recipeCard} ${!canCraft ? styles.cantCraft : ''}`}>
      <div className={styles.recipeHeader}>
        <h4 className={styles.recipeName}>{recipe.name}</h4>
      </div>
      
      <div className={styles.recipeInputs}>
        {Object.entries(recipe.inputs).map(([material, amount]) => {
          const available = materials[material as keyof CraftingMaterials];
          const hasEnough = available >= amount;
          
          return (
            <span 
              key={material} 
              className={`${styles.materialItem} ${!hasEnough ? styles.insufficient : ''}`}
              title={`${material}: ${available} available`}
            >
              {getMaterialIcon(material)} {amount}
            </span>
          );
        })}
        <span className={styles.arrow}>→</span>
        {Object.entries(recipe.output).map(([item, amount]) => (
          <span key={item} className={styles.outputItem}>
            {getMaterialIcon(item)} +{amount}
          </span>
        ))}
      </div>
      
      <button
        className={`${styles.craftButton} ${!canCraft ? styles.disabled : ''}`}
        onClick={handleCraft}
        disabled={!canCraft}
        title={recipe.description}
      >
        Craft
      </button>
    </div>
  );
});

RecipeCard.displayName = 'RecipeCard';

/**
 * Tree decoration interface
 */
interface TreeDecorationSectionProps {
  materials: CraftingMaterials;
  treeInventory: TreeInventory;
  onDecorate: (treeType: TreeType, decorations: DecorationType[]) => boolean;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const TreeDecorationSection: React.FC<TreeDecorationSectionProps> = memo(({ 
  materials,
  treeInventory,
  onDecorate,
  formatNumber 
}) => {
  const [selectedTree, setSelectedTree] = React.useState<TreeType>('pine');
  const [selectedDecorations, setSelectedDecorations] = React.useState<Set<DecorationType>>(new Set());
  
  const toggleDecoration = (decoration: DecorationType) => {
    const newSet = new Set(selectedDecorations);
    if (newSet.has(decoration)) {
      newSet.delete(decoration);
    } else {
      newSet.add(decoration);
    }
    setSelectedDecorations(newSet);
  };
  
  // Check if player has the required tree and materials
  const plainTreeKey = `${selectedTree}_plain`;
  const hasTree = (treeInventory[plainTreeKey] || 0) > 0;
  
  const canDecorate = hasTree && selectedDecorations.size > 0 && 
    Array.from(selectedDecorations).every(dec => {
      if (dec === 'ornament') return materials.ornaments > 0;
      if (dec === 'candle') return materials.candles > 0;
      return false;
    });
  
  const handleDecorate = () => {
    if (canDecorate) {
      const decorations = Array.from(selectedDecorations);
      if (onDecorate(selectedTree, decorations)) {
        setSelectedDecorations(new Set());
      }
    }
  };
  
  return (
    <div className={styles.decorationSection}>    
      <div className={styles.decorationControls}>
        <div className={styles.treeSelector}>
          <label>Decorate Tree - Select Tree Type:</label>
          <div className={styles.treeButtons}>
            {(['pine', 'spruce', 'fir'] as TreeType[]).map(type => {
              const treeKey = `${type}_plain`;
              const treeCount = treeInventory[treeKey] || 0;
              return (
                <button
                  key={type}
                  className={`${styles.treeButton} ${selectedTree === type ? styles.selected : ''}`}
                  onClick={() => setSelectedTree(type)}
                  title={`${treeCount} ${type} tree${treeCount !== 1 ? 's' : ''} available`}
                >
                  <img src={getTreeImage(type)} alt={type} className={styles.treeButtonIcon} /> {type.charAt(0).toUpperCase() + type.slice(1)} ({treeCount})
                </button>
              );
            })}
          </div>
        </div>
        
        {!hasTree && (
          <div className={styles.warningMessage}>
            ⚠️ No {selectedTree} trees available! Harvest trees from the Tree Farm first.
          </div>
        )}
        
        <div className={styles.decorationOptions}>
          <label>Add Decorations:</label>
          <div className={styles.decorationCheckboxes}>
            <label className={`${styles.decorationOption} ${materials.ornaments <= 0 ? styles.unavailable : ''}`}>
              <input
                type="checkbox"
                checked={selectedDecorations.has('ornament')}
                onChange={() => toggleDecoration('ornament')}
                disabled={materials.ornaments <= 0}
              />
              <span>
                <img src={DECORATION_WREATH} alt="Ornaments" className={styles.decorationIcon} />
                Ornaments ({materials.ornaments})
              </span>
            </label>
            
            <label className={`${styles.decorationOption} ${materials.candles <= 0 ? styles.unavailable : ''}`}>
              <input
                type="checkbox"
                checked={selectedDecorations.has('candle')}
                onChange={() => toggleDecoration('candle')}
                disabled={materials.candles <= 0}
              />
              <span>
                <img src={DECORATION_CANDLE} alt="Candles" className={styles.decorationIcon} />
                Candles ({materials.candles})
              </span>
            </label>
          </div>
        </div>
      </div>
      
      <button
        className={`${styles.decorateButton} ${!canDecorate ? styles.disabled : ''}`}
        onClick={handleDecorate}
        disabled={!canDecorate}
      >
        Decorate {selectedTree.charAt(0).toUpperCase() + selectedTree.slice(1)} Tree
      </button>
    </div>
  );
});

TreeDecorationSection.displayName = 'TreeDecorationSection';

/**
 * Elves' Bench automation interface
 */
interface ElvesBenchProps {
  enabled: boolean;
  onAddToQueue: (treeType: TreeType, decorations: DecorationType[]) => void;
}

const ElvesBench: React.FC<ElvesBenchProps> = memo(({ enabled, onAddToQueue }) => {
  const [queueTreeType, setQueueTreeType] = React.useState<TreeType>('pine');
  const [queueDecorations, setQueueDecorations] = React.useState<Set<DecorationType>>(new Set());
  
  const toggleQueueDecoration = (decoration: DecorationType) => {
    const newSet = new Set(queueDecorations);
    if (newSet.has(decoration)) {
      newSet.delete(decoration);
    } else {
      newSet.add(decoration);
    }
    setQueueDecorations(newSet);
  };
  
  const handleAddToQueue = () => {
    if (queueDecorations.size > 0) {
      onAddToQueue(queueTreeType, Array.from(queueDecorations));
      setQueueDecorations(new Set());
    }
  };
  
  if (!enabled) {
    return (
      <div className={styles.elvesBench}>
        <h3 className={styles.sectionTitle}>🧝 Elves' Bench</h3>
        <div className={styles.lockedMessage}>
          <p>Purchase the Elves' Bench upgrade to automate tree decoration!</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.elvesBench}>
      <h3 className={styles.sectionTitle}>🧝 Elves' Bench (Automation)</h3>
      
      <div className={styles.benchControls}>
        <div className={styles.benchTreeSelector}>
          <label>Queue Tree Type:</label>
          <select 
            value={queueTreeType} 
            onChange={(e) => setQueueTreeType(e.target.value as TreeType)}
            className={styles.benchSelect}
          >
            <option value="pine">Pine</option>
            <option value="spruce">Spruce</option>
            <option value="fir">Fir</option>
          </select>
        </div>
        
        <div className={styles.benchDecorations}>
          <label>Auto-apply:</label>
          <div className={styles.benchCheckboxes}>
            <label className={styles.benchOption}>
              <input
                type="checkbox"
                checked={queueDecorations.has('ornament')}
                onChange={() => toggleQueueDecoration('ornament')}
              />
              <span>
                <img src={DECORATION_WREATH} alt="Ornaments" className={styles.decorationIcon} />
                Ornaments
              </span>
            </label>
            
            <label className={styles.benchOption}>
              <input
                type="checkbox"
                checked={queueDecorations.has('candle')}
                onChange={() => toggleQueueDecoration('candle')}
              />
              <span>
                <img src={DECORATION_CANDLE} alt="Candles" className={styles.decorationIcon} />
                Candles
              </span>
            </label>
          </div>
        </div>
        
        <button
          className={`${styles.queueButton} ${queueDecorations.size === 0 ? styles.disabled : ''}`}
          onClick={handleAddToQueue}
          disabled={queueDecorations.size === 0}
        >
          Add to Queue
        </button>
      </div>
    </div>
  );
});

ElvesBench.displayName = 'ElvesBench';

/**
 * Helper function to get material icon as JSX
 */
function getMaterialIcon(material: string): React.ReactNode {
  const iconMap: Record<string, React.ReactNode> = {
    wood: <img src={MATERIAL_WOOD} alt="Wood" className={styles.materialIcon} />,
    pinecones: <img src={MATERIAL_PINECONE} alt="Pinecones" className={styles.materialIcon} />,
    branches: <img src={MATERIAL_BRANCH} alt="Branches" className={styles.materialIcon} />,
    ornaments: <img src={DECORATION_WREATH} alt="Ornaments" className={styles.materialIcon} />,
    garlands: <img src={DECORATION_GARLAND} alt="Garlands" className={styles.materialIcon} />,
    naturalOrnaments: '🟤',
    candles: <img src={DECORATION_CANDLE} alt="Candles" className={styles.materialIcon} />,
  };
  return iconMap[material] || '❓';
}

/**
 * Main Workshop Tab Component
 */
const WorkshopTab: React.FC<WorkshopTabProps> = ({
  materials,
  treeInventory,
  craftItem,
  decorateTree,
  addToDecorationQueue,
  automationEnabled,
  formatNumber,
  upgrades,
  holidayCheer,
  purchaseUpgrade,
}) => {
  const mainContent = (
    <div className={styles.container}>
      {/* Left Column: Crafting, Decoration, and Automation */}
      <div className={styles.leftColumn}>
        {/* Crafting Recipes Section */}
        <div className={styles.craftingSection}>
          <div className={styles.recipesGrid}>
            {CRAFTING_RECIPES.filter(recipe => {
              // Show recipe if no upgrade required, or if the required upgrade is owned
              if (!recipe.requiredUpgrade) return true;
              return upgrades.find(u => u.id === recipe.requiredUpgrade)?.owned ?? false;
            }).map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                materials={materials}
                onCraft={craftItem}
                formatNumber={formatNumber}
              />
            ))}
          </div>
        </div>
        
        {/* Tree Decoration Section */}
        <TreeDecorationSection
          materials={materials}
          treeInventory={treeInventory}
          onDecorate={decorateTree}
          formatNumber={formatNumber}
        />
        
        {/* Elves' Bench Automation */}
        <ElvesBench
          enabled={automationEnabled}
          onAddToQueue={addToDecorationQueue}
        />
      </div>
      
      {/* Right Column: Upgrades */}
      <div className={styles.rightColumn}>
        <WorkshopUpgradesPanel
          upgrades={upgrades}
          holidayCheer={holidayCheer}
          purchaseUpgrade={purchaseUpgrade}
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

export default memo(WorkshopTab);

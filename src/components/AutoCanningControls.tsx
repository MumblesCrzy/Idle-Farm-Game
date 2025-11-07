import React, { useState } from 'react';
import type { Recipe } from '../types/canning';
import type { AutoCanningConfig } from '../utils/canningAutoPurchase';
import { ICON_AUTOMATION } from '../config/assetPaths';
import styles from './AutoCanningControls.module.css';

interface AutoCanningControlsProps {
  config: AutoCanningConfig;
  recipes: Recipe[];
  onUpdateConfig: (config: AutoCanningConfig) => void;
}

const AutoCanningControls: React.FC<AutoCanningControlsProps> = ({
  config,
  recipes,
  onUpdateConfig
}) => {
  const [showConfig, setShowConfig] = useState(false);
  
  const unlockedRecipes = recipes.filter(r => r.unlocked);
  
  const handleToggleEnabled = () => {
    onUpdateConfig({
      ...config,
      enabled: !config.enabled
    });
  };
  
  const handleToggleRecipe = (recipeId: string) => {
    const selectedRecipes = config.selectedRecipes.includes(recipeId)
      ? config.selectedRecipes.filter(id => id !== recipeId)
      : [...config.selectedRecipes, recipeId];
    
    onUpdateConfig({
      ...config,
      selectedRecipes
    });
  };
  
  const handleReorderRecipe = (recipeId: string, direction: 'up' | 'down') => {
    const currentIndex = config.priorityOrder.indexOf(recipeId);
    if (currentIndex === -1) return;
    
    const newOrder = [...config.priorityOrder];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];
      onUpdateConfig({
        ...config,
        priorityOrder: newOrder
      });
    }
  };
  
  const handleAddToPriority = (recipeId: string) => {
    if (!config.priorityOrder.includes(recipeId)) {
      onUpdateConfig({
        ...config,
        priorityOrder: [...config.priorityOrder, recipeId]
      });
    }
  };
  
  const handleRemoveFromPriority = (recipeId: string) => {
    onUpdateConfig({
      ...config,
      priorityOrder: config.priorityOrder.filter(id => id !== recipeId)
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h4 className={styles.title}>
          <img src={ICON_AUTOMATION} alt="Auto-Canning" style={{ width: '20px', height: '20px', verticalAlign: 'middle', marginRight: '4px' }} />
          Auto-Canning System
          {config.enabled && (
            <span className={styles.activeBadge}>
              ACTIVE
            </span>
          )}
        </h4>
        
        <button
          onClick={() => setShowConfig(!showConfig)}
          className={styles.configButton}
          aria-label={showConfig ? 'Hide auto-canning configuration' : 'Show auto-canning configuration'}
          aria-expanded={showConfig}
        >
          {showConfig ? 'Hide Config' : 'Configure'}
        </button>
      </div>

      {/* Quick toggle */}
      <div className={`${styles.quickToggle} ${showConfig ? styles.withConfig : ''}`}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={handleToggleEnabled}
            className={styles.checkbox}
            aria-label="Enable or disable auto-canning system"
          />
          Enable Auto-Canning
        </label>
        
        {config.enabled && (
          <div className={styles.recipeCount}>
            {config.selectedRecipes.length} recipes selected
          </div>
        )}
      </div>

      {/* Configuration panel */}
      {showConfig && (
        <div className={styles.configPanel}>
          {/* General settings */}
          <div className={styles.settingsGrid}>
            <label className={styles.settingLabel}>
              <input
                type="checkbox"
                checked={config.onlyUseExcess}
                onChange={(e) => onUpdateConfig({
                  ...config,
                  onlyUseExcess: e.target.checked
                })}
                className={styles.checkbox}
                aria-label="Only use excess vegetables for auto-canning"
              />
              Only use excess vegetables
            </label>
            
            <div className={styles.settingLabel}>
              <label>
                Reserve: 
                <input
                  type="number"
                  value={config.excessThreshold}
                  onChange={(e) => onUpdateConfig({
                    ...config,
                    excessThreshold: Math.max(0, parseInt(e.target.value) || 0)
                  })}
                  className={styles.reserveInput}
                  min="0"
                  aria-label="Minimum vegetables to reserve before auto-canning"
                />
              </label>
            </div>
          </div>

          {/* Recipe selection */}
          <div className={styles.section}>
            <h5 className={styles.sectionTitle}>
              Select Recipes to Auto-Make:
            </h5>
            
            <div className={styles.recipeScrollList}>
              {unlockedRecipes.map(recipe => (
                <label
                  key={recipe.id}
                  className={styles.recipeItem}
                >
                  <input
                    type="checkbox"
                    checked={config.selectedRecipes.includes(recipe.id)}
                    onChange={() => handleToggleRecipe(recipe.id)}
                    className={styles.checkbox}
                    aria-label={`Enable auto-canning for ${recipe.name}`}
                  />
                  <span className={styles.recipeName}>{recipe.name}</span>
                  <span className={styles.recipePrice}>
                    ${recipe.salePrice}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority order */}
          {config.selectedRecipes.length > 1 && (
            <div className={styles.section}>
              <h5 className={styles.sectionTitle}>
                Priority Order (higher = first):
              </h5>
              
              <div className={styles.priorityList}>
                {config.priorityOrder.map((recipeId, index) => {
                  const recipe = recipes.find(r => r.id === recipeId);
                  if (!recipe) return null;
                  
                  return (
                    <div
                      key={recipeId}
                      className={styles.priorityItem}
                    >
                      <span className={styles.priorityNumber}>
                        #{index + 1}
                      </span>
                      <span className={styles.priorityName}>{recipe.name}</span>
                      
                      <button
                        onClick={() => handleReorderRecipe(recipeId, 'up')}
                        disabled={index === 0}
                        className={styles.priorityButton}
                        aria-label={`Move ${recipe.name} up in priority`}
                      >
                        ↑
                      </button>
                      
                      <button
                        onClick={() => handleReorderRecipe(recipeId, 'down')}
                        disabled={index === config.priorityOrder.length - 1}
                        className={styles.priorityButton}
                        aria-label={`Move ${recipe.name} down in priority`}
                      >
                        ↓
                      </button>
                      
                      <button
                        onClick={() => handleRemoveFromPriority(recipeId)}
                        className={styles.removeButton}
                        aria-label={`Remove ${recipe.name} from priority list`}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                
                {/* Add to priority buttons */}
                <div className={styles.addToPrioritySection}>
                  {config.selectedRecipes
                    .filter(id => !config.priorityOrder.includes(id))
                    .map(recipeId => {
                      const recipe = recipes.find(r => r.id === recipeId);
                      if (!recipe) return null;
                      
                      return (
                        <button
                          key={recipeId}
                          onClick={() => handleAddToPriority(recipeId)}
                          className={styles.addButton}
                          aria-label={`Add ${recipe.name} to priority list`}
                        >
                          + {recipe.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutoCanningControls;
import React, { memo } from 'react';
import type { Recipe } from '../types/canning';
import styles from './RecipeCard.module.css';

interface RecipeCardProps {
  recipe: Recipe;
  canMake: boolean;
  onStartCanning: (recipeId: string) => void;
  onShowDetails: (recipe: Recipe) => void;
  veggies: Array<{name: string, stash: number, salePrice: number, betterSeedsLevel: number}>;
  efficiencyMultiplier?: number; // Family Recipe upgrade multiplier
  speedMultiplier?: number; // Quick Hands upgrade multiplier
  heirloomOwned?: boolean; // Heirloom upgrade multiplier
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const RecipeCard: React.FC<RecipeCardProps> = memo(({ 
  recipe, 
  canMake, 
  onStartCanning, 
  onShowDetails,
  veggies,
  efficiencyMultiplier = 1,
  speedMultiplier = 1,
  heirloomOwned = false,
  formatNumber
}) => {
  const getEffectiveSalePrice = () => {
    return recipe.salePrice * efficiencyMultiplier * getBetterSeedsMultiplier();
  };

  // Calculate better seeds multiplier based on ingredient better seeds levels
  const getBetterSeedsMultiplier = () => {
    if (recipe.ingredients.length === 0) return 1;
    
    // Calculate average better seeds level of all ingredients
    const totalBetterSeedsLevel = recipe.ingredients.reduce((sum, ingredient) => {
      const veggie = veggies.find(v => v.name === ingredient.veggieName);
      return sum + (veggie?.betterSeedsLevel || 0);
    }, 0);
    
    const averageBetterSeedsLevel = totalBetterSeedsLevel / recipe.ingredients.length;
    
    return Math.pow(heirloomOwned ? 1.5 : 1.25, averageBetterSeedsLevel);
  };

  const getEffectiveProcessingTime = () => {
    return Math.ceil(recipe.baseProcessingTime * speedMultiplier);
  };

  // Calculate reward amounts (assuming manual canning)
  const getKnowledgeReward = () => {
    return recipe.ingredients.length * 2;
  };

  const getCanningExperienceReward = () => {
    return recipe.ingredients.length * 10;
  };

  return (
    <div
      className={`${styles.card} ${canMake ? styles.canMake : ''}`}
      title={recipe.description}
    >
      {/* Clickable content area */}
      <div
        className={styles.clickableArea}
        onClick={() => onShowDetails(recipe)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onShowDetails(recipe);
          }
        }}
        aria-label={`View details for ${recipe.name}. Sells for $${formatNumber(getEffectiveSalePrice(), 2)}. Takes ${getEffectiveProcessingTime()} seconds. Rewards ${getKnowledgeReward()} knowledge and ${getCanningExperienceReward()} canning experience`}
      >
        <div className={`${styles.recipeName} ${canMake ? styles.canMake : ''}`}>
          {recipe.name}
        </div>
        
        <div className={styles.priceRow}>
          <span className={styles.price}>
            ${formatNumber(getEffectiveSalePrice(), 2)}
            {getBetterSeedsMultiplier() > 1 && (
              <span className={styles.betterSeedsBonus}>
                +{formatNumber((getBetterSeedsMultiplier() - 1) * 100, 2)}%
              </span>
            )}
          </span>
          <span className={styles.time}>
            {getEffectiveProcessingTime()}s
          </span>
        </div>
        
        <div className={styles.rewardsRow}>
          <span className={styles.timeLabel}>
            +{getKnowledgeReward()} kn
          </span>
          <span className={styles.knowledgeLabel}>
            +{getCanningExperienceReward()} exp
          </span>
        </div>
      </div>
      
      {canMake && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartCanning(recipe.id);
          }}
          className={styles.canningButton}
          aria-label={`Start canning ${recipe.name}. Will use ${recipe.ingredients.map(ing => `${ing.quantity} ${ing.veggieName}`).join(', ')}`}
        >
          Start Canning
        </button>
      )}
            
      {!canMake && (
        <div className={styles.missingIngredientsLabel}>
          Missing Ingredients
        </div>
      )}
      
      {recipe.timesCompleted > 0 && (
        <div className={styles.completionCount}>
          Made {recipe.timesCompleted} times
        </div>
      )}
    </div>
  );
});

RecipeCard.displayName = 'RecipeCard';

export default RecipeCard;
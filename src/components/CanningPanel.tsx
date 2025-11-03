import React, { useState, useCallback, memo } from 'react';
import RecipeCard from './RecipeCard';
import CanningProcessDisplay from './CanningProcessDisplay';
import RecipeDetailsModal from './RecipeDetailsModal';
import type { Recipe, CanningState } from '../types/canning';
import { formatNumber } from '../utils/gameCalculations';

interface CanningPanelProps {
  canningState: CanningState;
  veggies: Array<{name: string, stash: number, salePrice: number, betterSeedsLevel: number}>;
  heirloomOwned: boolean;
  onStartCanning: (recipeId: string) => boolean;
  onCollectCanning: (processIndex: number) => void;
  canMakeRecipe: (recipe: Recipe) => boolean;
  recipeFilter?: RecipeFilter;
  recipeSort?: RecipeSort;
  onRecipeFilterChange?: (filter: RecipeFilter) => void;
  onRecipeSortChange?: (sort: RecipeSort) => void;
}

type RecipeFilter = 'all' | 'available' | 'simple' | 'complex' | 'gourmet';
type RecipeSort = 'name' | 'profit' | 'time' | 'difficulty';

const CanningPanel: React.FC<CanningPanelProps> = memo(({
  canningState,
  veggies,
  heirloomOwned,
  onStartCanning,
  onCollectCanning,
  canMakeRecipe,
  recipeFilter: propRecipeFilter,
  recipeSort: propRecipeSort,
  onRecipeFilterChange,
  onRecipeSortChange
}) => {
  // Calculate efficiency multiplier from canning upgrades
  const efficiencyUpgrade = canningState.upgrades.find(u => u.id === 'canning_efficiency');
  const efficiencyMultiplier = efficiencyUpgrade?.effect || 1;
  
  // Calculate speed multiplier from canning upgrades
  const speedUpgrade = canningState.upgrades.find(u => u.id === 'canning_speed');
  const speedMultiplier = speedUpgrade?.effect || 1;

  // Helper function to calculate better seeds multiplier for a recipe
  const getBetterSeedsMultiplier = (recipe: Recipe) => {
    if (recipe.ingredients.length === 0) return 1;
    
    // Calculate average better seeds level of all ingredients
    const totalBetterSeedsLevel = recipe.ingredients.reduce((sum, ingredient) => {
      const veggie = veggies.find(v => v.name === ingredient.veggieName);
      return sum + (veggie?.betterSeedsLevel || 0);
    }, 0);
    
    const averageBetterSeedsLevel = totalBetterSeedsLevel / recipe.ingredients.length;

    return Math.pow(heirloomOwned ? 1.5 : 1.25, averageBetterSeedsLevel);
  };

  // Helper function to calculate effective sale price (including all multipliers)
  const getEffectiveSalePrice = (recipe: Recipe) => {
    return recipe.salePrice * efficiencyMultiplier * getBetterSeedsMultiplier(recipe);
  };

  // Helper function to calculate raw ingredient value
  const getRawValue = (recipe: Recipe) => {
    return recipe.ingredients.reduce((sum, ing) => {
      const veggie = veggies.find(v => v.name === ing.veggieName);
      return sum + (veggie?.salePrice || 0) * ing.quantity;
    }, 0);
  };

  // Helper function to calculate profit
  const getProfit = (recipe: Recipe) => {
    return getEffectiveSalePrice(recipe) - getRawValue(recipe);
  };

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Use props for filter state, fallback to local state if props not provided
  const [localRecipeFilter, setLocalRecipeFilter] = useState<RecipeFilter>('all');
  const [localRecipeSort, setLocalRecipeSort] = useState<RecipeSort>('profit');
  
  const recipeFilter = propRecipeFilter ?? localRecipeFilter;
  const recipeSort = propRecipeSort ?? localRecipeSort;
  
  const setRecipeFilter = onRecipeFilterChange ?? setLocalRecipeFilter;
  const setRecipeSort = onRecipeSortChange ?? setLocalRecipeSort;

  // Filter recipes based on current filter
  const getFilteredRecipes = useCallback(() => {
    let filtered = canningState.recipes.filter(recipe => recipe.unlocked);
    
    switch (recipeFilter) {
      case 'available':
        filtered = filtered.filter(recipe => canMakeRecipe(recipe));
        break;
      case 'simple':
        filtered = filtered.filter(recipe => recipe.ingredients.length === 1);
        break;
      case 'complex':
        filtered = filtered.filter(recipe => recipe.ingredients.length >= 2 && recipe.ingredients.length <= 3);
        break;
      case 'gourmet':
        filtered = filtered.filter(recipe => recipe.ingredients.length > 3);
        break;
    }

    return filtered;
  }, [canningState.recipes, recipeFilter, canMakeRecipe]);

  // Sort recipes based on current sort
  const getSortedRecipes = useCallback(() => {
    const filtered = getFilteredRecipes();
    
    return [...filtered].sort((a, b) => {
      switch (recipeSort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'profit': {
          const profitA = getProfit(a);
          const profitB = getProfit(b);
          return profitB - profitA; // Descending
        }
        case 'time':
          return a.processingTime - b.processingTime; // Ascending
        case 'difficulty':
          return b.ingredients.length - a.ingredients.length; // Descending
        default:
          return 0;
      }
    });
  }, [getFilteredRecipes, recipeSort, veggies]);

  const handleShowDetails = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedRecipe(null);
  }, []);

  const handleStartCanning = useCallback((recipeId: string) => {
    const success = onStartCanning(recipeId);
    if (success) {
      // Close modal if open
      if (showModal) {
        handleCloseModal();
      }
    }
    return success;
  }, [onStartCanning, showModal, handleCloseModal]);

  const sortedRecipes = getSortedRecipes();
  const unlockedCount = canningState.recipes.filter(r => r.unlocked).length;
  
  // Find the next locked recipe (the one with the lowest experienceRequired above current experience)
  const nextLockedRecipe = canningState.recipes
    .filter(r => !r.unlocked)
    .sort((a, b) => a.experienceRequired - b.experienceRequired)[0];

  const nextRecipeExperience = nextLockedRecipe?.experienceRequired ?? 0;

  const totalRecipes = canningState.recipes.length;

  if (unlockedCount === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        backgroundColor: '#f9f9f9',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#666', marginBottom: '8px' }}>Canning System Locked</h2>
        <p style={{ color: '#888', marginBottom: '16px', maxWidth: '300px' }}>
          You need more experience to unlock canning recipes. Keep growing and harvesting vegetables!
        </p>
        <div style={{ 
          fontSize: '14px', 
          color: '#666',
          padding: '8px 16px',
          backgroundColor: '#e3f2fd',
          borderRadius: '6px'
        }}>
          First recipe unlocks at 5,000 experience
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header with filters and stats - condensed */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        padding: '8px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 2px 0', fontSize: '16px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src="./Canning.png" alt="Canning" style={{ width: '20px', height: '20px' }} />
            Canning Recipes
          </h2>
          <div style={{ fontSize: '11px', color: '#666', textAlign: 'left' }}>
            {unlockedCount} of {totalRecipes} recipes unlocked
          </div>
          {canningState.totalItemsCanned > 0 && (
              <div style={{ fontSize: '10px', color: '#2e7d2e', marginTop: '2px' }}>
              Items Canned: {canningState.totalItemsCanned} | Experience: {canningState.canningExperience} 
              {nextRecipeExperience > 0 && (
                <span> | Next Recipe at {nextRecipeExperience} exp</span>
              )}
              </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <select
            value={recipeFilter}
            onChange={(e) => setRecipeFilter(e.target.value as RecipeFilter)}
            style={{
              padding: '3px 6px',
              borderRadius: '3px',
              border: '1px solid #ddd',
              fontSize: '11px'
            }}
          >
            <option value="all">All Recipes</option>
            <option value="available">Can Make</option>
            <option value="simple">Simple</option>
            <option value="complex">Complex</option>
            <option value="gourmet">Gourmet</option>
          </select>
          
          <select
            value={recipeSort}
            onChange={(e) => setRecipeSort(e.target.value as RecipeSort)}
            style={{
              padding: '3px 6px',
              borderRadius: '3px',
              border: '1px solid #ddd',
              fontSize: '11px'
            }}
          >
            <option value="profit">By Profit</option>
            <option value="name">By Name</option>
            <option value="time">By Time</option>
            <option value="difficulty">By Difficulty</option>
          </select>
        </div>
      </div>

      {/* Recipe grid - condensed */}
      <div style={{ flex: 1 }}>       
        {sortedRecipes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#888',
            backgroundColor: '#f9f9f9',
            borderRadius: '6px',
            margin: '6px'
          }}>
            No recipes match the current filter.
            {recipeFilter === 'available' && (
              <div style={{ fontSize: '11px', marginTop: '6px' }}>
                Try growing more vegetables to unlock ingredients!
              </div>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '8px',
            padding: '0 18px 0px 0px'
          }}>
            {sortedRecipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                canMake={canMakeRecipe(recipe)}
                onStartCanning={handleStartCanning}
                onShowDetails={handleShowDetails}
                veggies={veggies}
                efficiencyMultiplier={efficiencyMultiplier}
                speedMultiplier={speedMultiplier}
                heirloomOwned={heirloomOwned}
                formatNumber={formatNumber}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active processes - moved below recipes */}
      <CanningProcessDisplay
        processes={canningState.activeProcesses}
        recipes={canningState.recipes}
        onCollect={onCollectCanning}
        maxSimultaneousProcesses={canningState.maxSimultaneousProcesses}
      />

      {/* Recipe details modal */}
      <RecipeDetailsModal
        recipe={selectedRecipe}
        isVisible={showModal}
        onClose={handleCloseModal}
        onStartCanning={handleStartCanning}
        veggies={veggies}
        canMake={selectedRecipe ? canMakeRecipe(selectedRecipe) : false}
        efficiencyMultiplier={efficiencyMultiplier}
        speedMultiplier={speedMultiplier}
        heirloomOwned={heirloomOwned}
        formatNumber={formatNumber}
      />
    </div>
  );
});

CanningPanel.displayName = 'CanningPanel';

export default CanningPanel;
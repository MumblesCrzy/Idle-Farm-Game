import { useState, useCallback, useMemo, memo, type FC } from 'react';
import RecipeCard from './RecipeCard';
import CanningProcessDisplay from './CanningProcessDisplay';
import RecipeDetailsModal from './RecipeDetailsModal';
import type { Recipe, CanningState } from '../types/canning';
import type { RecipeFilter, RecipeSort } from '../types/game';
import { formatNumber } from '../utils/gameCalculations';
import { ICON_CANNING } from '../config/assetPaths';
import { filterRecipesByCategory, sortRecipesByPreference, type RecipeValueContext } from '../utils/recipeHelpers';
import styles from './CanningPanel.module.css';

interface CanningPanelProps {
  canningState: CanningState;
  veggies: Array<{name: string, stash: number, salePrice: number, betterSeedsLevel: number}>;
  heirloomOwned: boolean;
  regularHoney?: number;
  goldenHoney?: number;
  onStartCanning: (recipeId: string) => boolean;
  canMakeRecipe: (recipe: Recipe) => boolean;
  recipeFilter?: RecipeFilter;
  recipeSort?: RecipeSort;
  onRecipeFilterChange?: (filter: RecipeFilter) => void;
  onRecipeSortChange?: (sort: RecipeSort) => void;
}

const CanningPanel: FC<CanningPanelProps> = memo(({
  canningState,
  veggies,
  heirloomOwned,
  regularHoney,
  goldenHoney,
  onStartCanning,
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

  const recipeValueContext = useMemo<RecipeValueContext>(() => ({
    veggies,
    heirloomOwned,
    efficiencyMultiplier
  }), [veggies, heirloomOwned, efficiencyMultiplier]);

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Use props for filter state, fallback to local state if props not provided
  const [localRecipeFilter, setLocalRecipeFilter] = useState<RecipeFilter>('all');
  const [localRecipeSort, setLocalRecipeSort] = useState<RecipeSort>('profit');
  
  const recipeFilter = propRecipeFilter ?? localRecipeFilter;
  const recipeSort = propRecipeSort ?? localRecipeSort;
  
  const setRecipeFilter = onRecipeFilterChange ?? setLocalRecipeFilter;
  const setRecipeSort = onRecipeSortChange ?? setLocalRecipeSort;

  const getFilteredRecipes = useCallback(() => (
    filterRecipesByCategory(canningState.recipes, recipeFilter, canMakeRecipe)
  ), [canningState.recipes, recipeFilter, canMakeRecipe]);

  const getSortedRecipes = useCallback(() => {
    const filtered = getFilteredRecipes();
    return sortRecipesByPreference(filtered, recipeSort, recipeValueContext);
  }, [getFilteredRecipes, recipeSort, recipeValueContext]);

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
      <div className={styles.lockedContainer}>
        <h2 className={styles.lockedTitle}>Canning System Locked</h2>
        <p className={styles.lockedDescription}>
          You need more experience to unlock canning recipes. Keep growing and harvesting vegetables!
        </p>
        <div className={styles.lockedRequirement}>
          Canning unlocks at Farm Tier 3
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with filters and stats - condensed */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.headerTitle}>
            <img src={ICON_CANNING} alt="" aria-hidden="true" className={styles.headerIcon} />
            Canning Recipes
          </h2>
          <div className={styles.headerUnlockCount}>
            {unlockedCount} of {totalRecipes} recipes unlocked
          </div>
          {canningState.totalItemsCanned > 0 && (
              <div className={styles.headerStats}>
              Items Canned: {canningState.totalItemsCanned} | Experience: {canningState.canningExperience} 
              {nextRecipeExperience > 0 && (
                <span> | Next Recipe at {nextRecipeExperience} exp</span>
              )}
              </div>
          )}
        </div>
        
        <div className={styles.controls}>
          <select
            value={recipeFilter}
            onChange={(e) => setRecipeFilter(e.target.value as RecipeFilter)}
            className={styles.select}
            aria-label="Filter recipes by category"
          >
            <option value="all">All Recipes</option>
            <option value="available">Can Make</option>
            <option value="simple">Simple</option>
            <option value="complex">Complex</option>
            <option value="gourmet">Gourmet</option>
            <option value="honey">Honey Recipes</option>
          </select>
          
          <select
            value={recipeSort}
            onChange={(e) => setRecipeSort(e.target.value as RecipeSort)}
            className={styles.select}
            aria-label="Sort recipes by"
          >
            <option value="profit">By Profit</option>
            <option value="name">By Name</option>
            <option value="time">By Time</option>
            <option value="difficulty">By Difficulty</option>
          </select>
        </div>
      </div>

      {/* Recipe grid - condensed */}
      <div className={styles.content}>       
        {sortedRecipes.length === 0 ? (
          <div className={styles.emptyState}>
            No recipes match the current filter.
            {recipeFilter === 'available' && (
              <div className={styles.emptyStateHint}>
                Try growing more vegetables to unlock ingredients!
              </div>
            )}
          </div>
        ) : (
          <div className={styles.recipesGrid}>
            {sortedRecipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                canMake={canMakeRecipe(recipe)}
                onStartCanning={handleStartCanning}
                onShowDetails={handleShowDetails}
                veggies={veggies}
                regularHoney={regularHoney}
                goldenHoney={goldenHoney}
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
        maxSimultaneousProcesses={canningState.maxSimultaneousProcesses}
      />

      {/* Recipe details modal */}
      <RecipeDetailsModal
        recipe={selectedRecipe}
        isVisible={showModal}
        onClose={handleCloseModal}
        onStartCanning={handleStartCanning}
        veggies={veggies}
        regularHoney={regularHoney}
        goldenHoney={goldenHoney}
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
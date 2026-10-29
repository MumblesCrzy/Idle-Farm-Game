/**
 * The middle of the Kitchen: the stove on top, then the recipe book in two columns with its
 * filters. A recipe's name opens its details.
 */
import { useState, useCallback, useMemo, memo, type FC } from 'react';
import CanningStove from './CanningStove';
import RecipeRow from './RecipeRow';
import RecipeDetailsModal from './RecipeDetailsModal';
import type { Recipe, CanningState, RushBatchControl } from '../types/canning';
import type { RecipeFilter, RecipeSort } from '../types/game';
import type { GuildState } from '../types/guilds';
import { formatNumber } from '../utils/gameCalculations';
import { getGuildCanningTimeMultiplier, getJarsPerBatch, getRecipeMasteryBonus, hasAdditives } from '../utils/guildCalculations';
import { filterRecipesByCategory, getEffectiveSalePrice, sortRecipesByPreference, type RecipeValueContext } from '../utils/recipeHelpers';
import { RIBBON_FIRST, RIBBON_SECOND, RIBBON_THIRD } from '../config/assetPaths';
import styles from './CanningPanel.module.css';

interface CanningPanelProps {
  canningState: CanningState;
  veggies: Array<{name: string, stash: number, salePrice: number, betterSeedsLevel: number}>;
  heirloomOwned: boolean;
  regularHoney?: number;
  goldenHoney?: number;
  onStartCanning: (recipeId: string) => boolean;
  canMakeRecipe: (recipe: Recipe) => boolean;
  /** Guild rules on recipe value, time and jars */
  guildState?: GuildState;
  /** Rush Batch, for Preservers who own it */
  rushBatch?: RushBatchControl;
  recipeFilter: RecipeFilter;
  recipeSort: RecipeSort;
  canMakeOnly: boolean;
  onRecipeFilterChange: (filter: RecipeFilter) => void;
  onRecipeSortChange: (sort: RecipeSort) => void;
  onCanMakeOnlyChange: (value: boolean) => void;
}

const FILTERS: Array<{ id: RecipeFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'simple', label: 'Simple' },
  { id: 'complex', label: 'Complex' },
  { id: 'gourmet', label: 'Gourmet' },
  { id: 'honey', label: 'Honey' },
  { id: 'cellar', label: 'Cellar' }
];

/** Recipe Mastery ribbons from the Family Cookbook, by the value they add */
const MASTERY_RIBBONS: Record<number, { image: string; label: string }> = {
  0.5: { image: RIBBON_FIRST, label: 'Made 500 times: +50% value' },
  0.25: { image: RIBBON_SECOND, label: 'Made 100 times: +25% value' },
  0.1: { image: RIBBON_THIRD, label: 'Made 25 times: +10% value' }
};

const CanningPanel: FC<CanningPanelProps> = memo(({
  canningState,
  veggies,
  heirloomOwned,
  regularHoney = 0,
  goldenHoney = 0,
  onStartCanning,
  canMakeRecipe,
  guildState,
  rushBatch,
  recipeFilter,
  recipeSort,
  canMakeOnly,
  onRecipeFilterChange,
  onRecipeSortChange,
  onCanMakeOnlyChange
}) => {
  const efficiencyMultiplier = canningState.upgrades.find(u => u.id === 'canning_efficiency')?.effect || 1;
  // Quick Hands and the guilds' time upgrades together
  const speedMultiplier = (canningState.upgrades.find(u => u.id === 'canning_speed')?.effect || 1)
    * getGuildCanningTimeMultiplier(guildState);
  const jarsPerBatch = getJarsPerBatch(guildState);

  const recipeValueContext = useMemo<RecipeValueContext>(() => ({
    veggies,
    heirloomOwned,
    efficiencyMultiplier,
    guildState
  }), [veggies, heirloomOwned, efficiencyMultiplier, guildState]);

  const stash = useMemo(() => new Map(veggies.map(veggie => [veggie.name, veggie.stash])), [veggies]);

  // Filtered and sorted once per change of recipes, filters or values
  const sortedRecipes = useMemo(() => sortRecipesByPreference(
    filterRecipesByCategory(canningState.recipes, recipeFilter, canMakeRecipe, canMakeOnly),
    recipeSort,
    recipeValueContext
  ), [canningState.recipes, recipeFilter, canMakeRecipe, canMakeOnly, recipeSort, recipeValueContext]);

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const handleShowDetails = useCallback((recipe: Recipe) => setSelectedRecipe(recipe), []);
  const handleCloseModal = useCallback(() => setSelectedRecipe(null), []);
  const handleStartCanning = useCallback((recipeId: string) => {
    const started = onStartCanning(recipeId);
    if (started) setSelectedRecipe(null);
    return started;
  }, [onStartCanning]);

  const stoveFull = canningState.activeProcesses.length >= canningState.maxSimultaneousProcesses;
  // The Cellar filter shows once the Cellar recipes are open
  const filters = canningState.recipes.some(recipe => !!recipe.requiredGuildUpgrade)
    ? FILTERS
    : FILTERS.filter(filter => filter.id !== 'cellar');

  if (!canningState.recipes.some(recipe => recipe.unlocked)) {
    return (
      <div className={styles.locked}>
        <h2 className={styles.lockedTitle}>Canning System Locked</h2>
        <p>You need more experience to unlock canning recipes. Keep growing and harvesting vegetables!</p>
        <p className={styles.lockedRequirement}>Canning unlocks at Farm Tier 3</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <CanningStove
        processes={canningState.activeProcesses}
        recipes={canningState.recipes}
        slots={canningState.maxSimultaneousProcesses}
        jarsPerBatch={jarsPerBatch}
        rushBatch={rushBatch}
      />

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="Recipe categories">
          {filters.map(filter => (
            <button
              key={filter.id}
              type="button"
              className={styles.filter}
              aria-pressed={recipeFilter === filter.id}
              onClick={() => onRecipeFilterChange(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {hasAdditives(guildState) && (
          <span className={styles.additivesTag} title="Additives: every recipe needs one fewer of each crop, never fewer than 1. The jars sell for the same">
            Additives: one fewer of each crop
          </span>
        )}
        <label className={styles.option}>
          <input type="checkbox" checked={canMakeOnly} onChange={e => onCanMakeOnlyChange(e.target.checked)} />
          Can make
        </label>
        <label className={styles.option}>
          Sort
          <select value={recipeSort} onChange={e => onRecipeSortChange(e.target.value as RecipeSort)} className={styles.select}>
            <option value="profit">Profit</option>
            <option value="name">Name</option>
            <option value="time">Time</option>
            <option value="difficulty">Ingredients</option>
          </select>
        </label>
      </div>

      {sortedRecipes.length === 0 ? (
        <p className={styles.empty}>
          No recipes match these filters.
          {canMakeOnly && ' Harvest more crops to make more recipes.'}
        </p>
      ) : (
        <ul className={styles.recipes} aria-label="Recipes">
          {sortedRecipes.map(recipe => {
            const mastery = guildState ? MASTERY_RIBBONS[getRecipeMasteryBonus(guildState, recipe.timesCompleted)] : undefined;
            return (
              <RecipeRow
                key={recipe.id}
                recipe={recipe}
                canMake={canMakeRecipe(recipe)}
                value={getEffectiveSalePrice(recipe, recipeValueContext)}
                seconds={Math.ceil(recipe.baseProcessingTime * speedMultiplier)}
                stash={stash}
                regularHoney={regularHoney}
                goldenHoney={goldenHoney}
                mastery={mastery}
                stoveFull={stoveFull}
                onStart={handleStartCanning}
                onShowDetails={handleShowDetails}
                formatNumber={formatNumber}
              />
            );
          })}
        </ul>
      )}

      <RecipeDetailsModal
        recipe={selectedRecipe}
        isVisible={selectedRecipe !== null}
        onClose={handleCloseModal}
        onStartCanning={handleStartCanning}
        veggies={veggies}
        regularHoney={regularHoney}
        goldenHoney={goldenHoney}
        canMake={selectedRecipe ? canMakeRecipe(selectedRecipe) && !stoveFull : false}
        efficiencyMultiplier={efficiencyMultiplier}
        speedMultiplier={speedMultiplier}
        heirloomOwned={heirloomOwned}
        guildState={guildState}
        formatNumber={formatNumber}
      />
    </div>
  );
});

CanningPanel.displayName = 'CanningPanel';

export default CanningPanel;

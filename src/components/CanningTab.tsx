/**
 * The Canning tab, laid out as a kitchen from left to right: the pantry of raw crops, the
 * stove and recipe book, then upgrades, the Preservers' Wax Seals and the kitchen's stats.
 * For committed Engineers it is the Cannery, a factory floor of machines (FactoryFloor).
 */
import { memo, useMemo, type FC } from 'react';
import BaseTab from './BaseTab';
import CanningPanel from './CanningPanel';
import CanningUpgradesPanel from './CanningUpgradesPanel';
import PantryPanel from './PantryPanel';
import FactoryFloor from './FactoryFloor';
import InlineIcon from './InlineIcon';
import type { CanningState, Recipe, RushBatchControl } from '../types/canning';
import type { GuildState } from '../types/guilds';
import type { RecipeFilter, RecipeSort, Veggie } from '../types/game';
import { formatNumber } from '../utils/gameCalculations';
import { getPreserversValueBonus, isCommittedTo, isEngineer } from '../utils/guildCalculations';
import { GUILD_PRESERVERS, ICON_WAX_SEAL } from '../config/assetPaths';
import styles from './CanningTab.module.css';

interface CanningTabProps {
  canningState: CanningState;
  canningUnlocked: boolean;
  veggies: Veggie[];
  money: number;
  knowledge: number;
  heirloomOwned: boolean;
  regularHoney?: number;
  goldenHoney?: number;
  startCanning: (recipeId: string) => boolean;
  canMakeRecipe: (recipe: Recipe) => boolean;
  purchaseUpgrade: (upgradeId: string) => boolean;
  toggleAutoCanning: () => void;
  /** Guild rules on recipe value and time */
  guildState?: GuildState;
  /** Rush Batch, for Preservers who own it */
  rushBatch?: RushBatchControl;
  recipeFilter: RecipeFilter;
  recipeSort: RecipeSort;
  canMakeOnly: boolean;
  onRecipeFilterChange: (filter: RecipeFilter) => void;
  onRecipeSortChange: (sort: RecipeSort) => void;
  onCanMakeOnlyChange: (value: boolean) => void;
  /** Sets a factory floor machine's recipe (Engineers) */
  onSetMachineRecipe?: (machine: number, recipeId: string | null) => void;
}

const noop = () => {};

const CanningTab: FC<CanningTabProps> = memo(({
  canningState,
  canningUnlocked,
  veggies,
  money,
  knowledge,
  heirloomOwned,
  regularHoney,
  goldenHoney,
  startCanning,
  canMakeRecipe,
  purchaseUpgrade,
  toggleAutoCanning,
  guildState,
  rushBatch,
  recipeFilter,
  recipeSort,
  canMakeOnly,
  onRecipeFilterChange,
  onRecipeSortChange,
  onCanMakeOnlyChange,
  onSetMachineRecipe = noop
}) => {
  const recipes = canningState?.recipes;

  // The pantry lists the crops recipes use that the farm grows or has on hand
  const pantryCrops = useMemo(() => {
    const used = new Set((recipes ?? []).flatMap(recipe => recipe.ingredients.map(ingredient => ingredient.veggieName)));
    return veggies.filter(veggie => used.has(veggie.name) && (veggie.unlocked || veggie.stash > 0));
  }, [recipes, veggies]);
  const showHoney = (recipes ?? []).some(recipe => recipe.unlocked && !!recipe.honeyRequirement);

  const unlockedCount = (recipes ?? []).filter(recipe => recipe.unlocked).length;
  // The next experience goal; recipes held back by an achievement don't count
  const canningExperience = canningState?.canningExperience ?? 0;
  const nextRecipe = (recipes ?? [])
    .filter(recipe => !recipe.unlocked && recipe.experienceRequired > canningExperience)
    .sort((a, b) => a.experienceRequired - b.experienceRequired)[0];
  const preserver = !!guildState && isCommittedTo(guildState, 'preservers');

  const mainContent = guildState && isEngineer(guildState) && canningState ? (
    <FactoryFloor
      canningState={canningState}
      veggies={veggies}
      hopperCrops={pantryCrops}
      showHoney={showHoney}
      regularHoney={regularHoney ?? 0}
      goldenHoney={goldenHoney ?? 0}
      heirloomOwned={heirloomOwned}
      money={money}
      knowledge={knowledge}
      guildState={guildState}
      recipeSort={recipeSort}
      nextRecipe={nextRecipe}
      onSetMachineRecipe={onSetMachineRecipe}
      purchaseUpgrade={purchaseUpgrade}
      toggleAutoCanning={toggleAutoCanning}
      formatNumber={formatNumber}
    />
  ) : (
    <div className={styles.kitchen}>
      <PantryPanel
        crops={pantryCrops}
        showHoney={showHoney}
        regularHoney={regularHoney}
        goldenHoney={goldenHoney}
        formatNumber={formatNumber}
      />

      <CanningPanel
        canningState={canningState}
        veggies={veggies}
        heirloomOwned={heirloomOwned}
        regularHoney={regularHoney}
        goldenHoney={goldenHoney}
        onStartCanning={startCanning}
        canMakeRecipe={canMakeRecipe}
        guildState={guildState}
        rushBatch={rushBatch}
        recipeFilter={recipeFilter}
        recipeSort={recipeSort}
        canMakeOnly={canMakeOnly}
        onRecipeFilterChange={onRecipeFilterChange}
        onRecipeSortChange={onRecipeSortChange}
        onCanMakeOnlyChange={onCanMakeOnlyChange}
      />

      <div className={styles.side}>
        <CanningUpgradesPanel
          upgrades={canningState?.upgrades}
          money={money}
          knowledge={knowledge}
          onPurchaseUpgrade={purchaseUpgrade}
          canningState={canningState}
          onToggleAutoCanning={toggleAutoCanning}
        />

        {preserver && guildState && (
          <section className={styles.guild} aria-label="Preservers Guild">
            <div className={styles.guildHeader}>
              <img src={GUILD_PRESERVERS} alt="" className={styles.guildEmblem} />
              <span className={styles.guildName}>Preservers Guild</span>
              <span className={styles.seals} title="Wax Seals: earned from batches you start yourself and from shooing Dunkin">
                <InlineIcon src={ICON_WAX_SEAL} size={22} gap={4} />
                {formatNumber(guildState.guildCurrencies.preservers)}
              </span>
            </div>
            <p className={styles.guildNote}>
              Jars +{formatNumber(getPreserversValueBonus(guildState) * 100, 0)}%. Raw crops -10%.
            </p>
          </section>
        )}

        <section className={styles.stats} aria-label="Kitchen stats">
          <div className={styles.stat}><span>Recipes</span><b>{unlockedCount} of {recipes?.length ?? 0}</b></div>
          <div className={styles.stat}><span>Jars canned</span><b>{formatNumber(canningState?.totalItemsCanned ?? 0)}</b></div>
          <div className={styles.stat}><span>Canning experience</span><b>{formatNumber(canningExperience)}</b></div>
          {nextRecipe && (
            <div className={styles.stat}><span>Next recipe at</span><b>{formatNumber(nextRecipe.experienceRequired)} exp</b></div>
          )}
        </section>
      </div>
    </div>
  );

  return (
    <BaseTab
      isUnlocked={canningUnlocked}
      isLoading={canningUnlocked && !canningState}
      loadingMessage="Loading canning system..."
      mainContent={mainContent}
    />
  );
});

CanningTab.displayName = 'CanningTab';

export default CanningTab;

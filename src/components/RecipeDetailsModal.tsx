import InlineIcon from './InlineIcon';
import { ICON_GOLDEN_HONEY, ICON_HONEY } from '../config/assetPaths';
import { memo, type FC, type ReactNode } from 'react';
import type { Recipe } from '../types/canning';
import type { GuildState } from '../types/guilds';
import { getCannerRewardDivisor, getGuildKnowledgeMultiplier, getJarsPerBatch, getRecipeValueMultiplier, hasAdditives } from '../utils/guildCalculations';
import { rewardIngredients } from '../utils/canningSimulation';
import { useFocusTrap } from '../hooks/useFocusTrap';
import styles from './RecipeDetailsModal.module.css';

interface RecipeDetailsModalProps {
  recipe: Recipe | null;
  isVisible: boolean;
  onClose: () => void;
  onStartCanning: (recipeId: string) => void;
  veggies: Array<{name: string, stash: number, salePrice: number, betterSeedsLevel: number}>;
  regularHoney?: number;
  goldenHoney?: number;
  heirloomOwned: boolean;
  canMake: boolean;
  efficiencyMultiplier?: number;
  speedMultiplier?: number;
  /** Guild rules on value and jars */
  guildState?: GuildState;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

interface RequirementRowProps {
  label: ReactNode;
  /** How much the player has. Leave undefined to hide the count and the check mark. */
  have?: ReactNode;
  met: boolean;
  golden?: boolean;
}

/** One line of the ingredient or honey list: what is needed, how much the player has, and a check or cross */
const RequirementRow: FC<RequirementRowProps> = ({ label, have, met, golden = false }) => {
  const metClass = met ? styles.met : styles.unmet;
  return (
    <div className={`${styles.requirementRow} ${metClass}`}>
      <span className={golden ? `${styles.requirementLabel} ${styles.golden}` : styles.requirementLabel}>
        {label}
      </span>
      <div className={styles.requirementStatus}>
        {have !== undefined && (
          <>
            <span className={styles.haveCount}>
              (Have: {have})
            </span>
            <span className={`${styles.statusIcon} ${metClass}`}>
              {met ? '✓' : '✗'}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

const RecipeDetailsModal: FC<RecipeDetailsModalProps> = memo(({
  recipe,
  isVisible,
  onClose,
  onStartCanning,
  veggies,
  regularHoney,
  goldenHoney,
  heirloomOwned,
  canMake,
  efficiencyMultiplier = 1,
  speedMultiplier = 1,
  guildState,
  formatNumber
}) => {
  const { containerRef, handleTabKey } = useFocusTrap(isVisible, onClose);

  if (!isVisible || !recipe) return null;

  // Look up each ingredient's veggie once; every figure below reuses these rows
  const ingredientRows = recipe.ingredients.map(ingredient => {
    const veggie = veggies.find(v => v.name === ingredient.veggieName);
    return {
      ingredient,
      veggie,
      available: veggie?.stash || 0,
      hasEnough: !!veggie && veggie.stash >= ingredient.quantity,
    };
  });
  const ingredientCount = ingredientRows.length;

  // Better Seeds bonus from the average Better Seeds level of the ingredients.
  // Canning gets a more moderate bonus than raw veggies (1.25x per level instead of 1.5x)
  // so it stays competitive but not overpowered.
  const betterSeedsMultiplier = ingredientCount === 0
    ? 1
    : Math.pow(
        heirloomOwned ? 1.5 : 1.25,
        ingredientRows.reduce((sum, row) => sum + (row.veggie?.betterSeedsLevel || 0), 0) / ingredientCount
      );

  const rawValue = ingredientRows.reduce(
    (total, row) => total + (row.veggie?.salePrice || 0) * row.ingredient.quantity,
    0
  );
  const jars = getJarsPerBatch(guildState);
  const effectiveSalePrice = recipe.salePrice * efficiencyMultiplier * betterSeedsMultiplier
    * getRecipeValueMultiplier(guildState, recipe) * jars;
  const effectiveProcessingTime = Math.ceil(recipe.baseProcessingTime * speedMultiplier);
  const profit = effectiveSalePrice - rawValue;
  const profitMargin = rawValue === 0 ? 0 : (profit / rawValue) * 100;

  // Rewards for manual canning, less knowledge for Merchants; the Canner earns a tenth or a half, rounded up
  const knowledgeReward = Math.round(rewardIngredients(recipe) * 2 * getGuildKnowledgeMultiplier(guildState) * 100) / 100;
  const canningExperienceReward = rewardIngredients(recipe) * 10;
  const cannerDivisor = getCannerRewardDivisor(guildState);
  const additives = hasAdditives(guildState);

  const missingIngredientNames = ingredientRows
    .filter(row => !row.hasEnough)
    .map(row => row.ingredient.veggieName);
  const missingIngredientList = missingIngredientNames.join(', ');

  // The honey section only shows when the recipe needs some honey
  const honey = recipe.honeyRequirement && (recipe.honeyRequirement.regular > 0 || recipe.honeyRequirement.golden > 0)
    ? recipe.honeyRequirement
    : undefined;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={containerRef}
        onKeyDown={handleTabKey}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-modal-title"
        onClick={(e) => e.stopPropagation()}
        className={styles.dialog}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h2 id="recipe-modal-title" className={styles.title}>
              {recipe.name}
            </h2>
            {additives && <span className={styles.additivesTag}>Additives</span>}
          </div>
          <button
            onClick={onClose}
            aria-label={`Close ${recipe.name} details. Press Escape to close`}
            className={styles.closeButton}
          >
            ×
          </button>
        </div>

        {/* Description */}
        <p className={styles.description}>
          {recipe.description}
        </p>

        {/* Ingredients */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Ingredients Required:
          </h3>
          <div>
            {ingredientRows.map(({ ingredient, available, hasEnough }, index) => (
              <RequirementRow
                key={index}
                label={<>{ingredient.veggieName} × {ingredient.quantity}</>}
                have={available}
                met={hasEnough}
              />
            ))}
          </div>
          {additives && (
            <p className={styles.additivesNote}>
              Additives: every recipe needs one fewer of each crop, never fewer than 1. The jars sell for the same.
            </p>
          )}
        </div>

        {/* Honey Requirements */}
        {honey && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Honey Required:
            </h3>
            <div>
              {honey.regular > 0 && (
                <RequirementRow
                  label={<><InlineIcon src={ICON_HONEY} size={14} gap={4} />Regular Honey × {formatNumber(honey.regular, 3)}</>}
                  have={regularHoney !== undefined ? formatNumber(regularHoney, 3) : undefined}
                  met={regularHoney !== undefined && regularHoney >= honey.regular}
                />
              )}
              {honey.golden > 0 && (
                <RequirementRow
                  label={<><InlineIcon src={ICON_GOLDEN_HONEY} size={14} gap={4} />Golden Honey × {formatNumber(honey.golden, 3)}</>}
                  have={goldenHoney !== undefined ? formatNumber(goldenHoney, 3) : undefined}
                  met={goldenHoney !== undefined && goldenHoney >= honey.golden}
                  golden
                />
              )}
            </div>
          </div>
        )}

        {/* Production Info */}
        <div className={styles.productionInfo}>
          <div className={styles.statsGrid}>
            <div>
              <span className={styles.statLabel}>Processing Time:</span>
              <div className={styles.statValue}>
                {effectiveProcessingTime}s
                {speedMultiplier !== 1 && (
                  <span className={styles.baseNote}>
                    (base: {recipe.baseProcessingTime}s)
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className={styles.statLabel}>Sale Price:</span>
              <div className={`${styles.statValue} ${styles.salePrice}`}>
                ${formatNumber(effectiveSalePrice, 2)}
                {(efficiencyMultiplier !== 1 || betterSeedsMultiplier !== 1) && (
                  <span className={styles.baseNote}>
                    (base: ${formatNumber(recipe.salePrice, 2)})
                  </span>
                )}
                {betterSeedsMultiplier > 1 && (
                  <div className={styles.betterSeedsNote}>
                    Better Seeds: +{formatNumber((betterSeedsMultiplier - 1) * 100, 2)}%
                  </div>
                )}
              </div>
            </div>
            <div>
              <span className={styles.statLabel}>Raw Value:</span>
              <div className={`${styles.statValue} ${styles.rawValue}`}>
                ${formatNumber(rawValue, 2)}
              </div>
            </div>
            <div>
              <span className={styles.statLabel}>Profit:</span>
              <div className={`${styles.statValue} ${profit > 0 ? styles.profit : styles.loss}`}>
                ${formatNumber(profit, 2)} ({profitMargin.toFixed(0)}%)
              </div>
            </div>
            <div>
              <span className={styles.statLabel}>Knowledge Reward:</span>
              <div className={`${styles.statValue} ${styles.knowledge}`}>
                +{knowledgeReward}
                <div className={styles.autoNote}>
                  (Auto: +{Math.ceil(knowledgeReward / cannerDivisor)})
                </div>
              </div>
            </div>
            <div>
              <span className={styles.statLabel}>Canning Experience:</span>
              <div className={`${styles.statValue} ${styles.experience}`}>
                +{canningExperienceReward}
                <div className={styles.autoNote}>
                  (Auto: +{Math.ceil(canningExperienceReward / cannerDivisor)})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {recipe.timesCompleted > 0 && (
          <div className={styles.timesCompleted}>
            Times Completed: {recipe.timesCompleted}
          </div>
        )}

        {/* Action Button */}
        <div className={styles.actions}>
          {canMake ? (
            <button
              onClick={() => {
                onStartCanning(recipe.id);
                onClose();
              }}
              aria-label={`Start canning ${recipe.name}`}
              className={`${styles.actionButton} ${styles.startButton}`}
            >
              Start Canning
            </button>
          ) : (
            <div>
              <button
                disabled
                aria-label={`Cannot start canning ${recipe.name}. Missing ingredients: ${missingIngredientList}`}
                className={`${styles.actionButton} ${styles.cannotStartButton}`}
              >
                Cannot Start
              </button>
              <div className={styles.missingText}>
                {missingIngredientNames.length > 0 ? (
                  `Missing: ${missingIngredientList}`
                ) : (
                  'Check ingredients'
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

RecipeDetailsModal.displayName = 'RecipeDetailsModal';

export default RecipeDetailsModal;
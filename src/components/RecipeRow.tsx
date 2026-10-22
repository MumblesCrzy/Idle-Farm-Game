/**
 * One recipe in the Kitchen's recipe book: name, ingredients, what a batch sells for, how long
 * it takes, and a Can button. Ingredients the stash can't cover are greyed with a red outline.
 * The name opens the recipe's details.
 */
import { memo, type FC } from 'react';
import type { Recipe } from '../types/canning';
import { getVeggieImage, ICON_GOLDEN_HONEY, ICON_HONEY } from '../config/assetPaths';
import styles from './RecipeRow.module.css';

/** Ingredient icons a row shows before "+N" */
const MAX_ICONS = 5;

interface RecipeRowProps {
  recipe: Recipe;
  canMake: boolean;
  /** One batch's value with every bonus */
  value: number;
  /** Seconds one batch takes */
  seconds: number;
  /** Stash on hand, by crop name */
  stash: Map<string, number>;
  regularHoney: number;
  goldenHoney: number;
  /** Recipe Mastery ribbon, once the Family Cookbook is owned and a stage is reached */
  mastery?: { image: string; label: string };
  /** Every stove is busy, so nothing can start now */
  stoveFull?: boolean;
  onStart: (recipeId: string) => void;
  onShowDetails: (recipe: Recipe) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

interface Need {
  name: string;
  image: string;
  amount: string;
  short: boolean;
}

const RecipeRow: FC<RecipeRowProps> = memo(({
  recipe,
  canMake,
  value,
  seconds,
  stash,
  regularHoney,
  goldenHoney,
  mastery,
  stoveFull = false,
  onStart,
  onShowDetails,
  formatNumber
}) => {
  const needs: Need[] = recipe.ingredients.map(ingredient => ({
    name: ingredient.veggieName,
    image: getVeggieImage(ingredient.veggieName),
    amount: String(ingredient.quantity),
    short: (stash.get(ingredient.veggieName) ?? 0) < ingredient.quantity
  }));
  const honey = recipe.honeyRequirement;
  if (honey && honey.regular > 0) {
    needs.push({ name: 'Honey', image: ICON_HONEY, amount: formatNumber(honey.regular, 2), short: regularHoney < honey.regular });
  }
  if (honey && honey.golden > 0) {
    needs.push({ name: 'Golden Honey', image: ICON_GOLDEN_HONEY, amount: formatNumber(honey.golden, 2), short: goldenHoney < honey.golden });
  }
  // Short ingredients first, so the reason a recipe is short always shows
  const ordered = [...needs.filter(need => need.short), ...needs.filter(need => !need.short)];
  const shown = ordered.slice(0, MAX_ICONS);
  const hidden = ordered.length - shown.length;
  const shortNames = needs.filter(need => need.short).map(need => need.name).join(', ');

  return (
    <li className={`${styles.row} ${canMake ? '' : styles.off}`}>
      <button
        type="button"
        className={styles.name}
        onClick={() => onShowDetails(recipe)}
        title={`${recipe.name}: ${recipe.description}`}
        aria-label={`Details for ${recipe.name}`}
      >
        {mastery && <img src={mastery.image} alt="" title={mastery.label} className={styles.ribbon} />}
        <span className={styles.nameText}>{recipe.name}</span>
        {recipe.requiredGuildUpgrade && <span className={styles.tag}>Cellar</span>}
      </button>
      <span className={styles.ingredients}>
        {shown.map(need => (
          <img
            key={need.name}
            src={need.image}
            alt={`${need.amount} ${need.name}${need.short ? ', short' : ''}`}
            title={`${need.amount} ${need.name}`}
            className={need.short ? styles.shortIcon : undefined}
          />
        ))}
        {hidden > 0 && <span className={styles.more}>+{hidden}</span>}
      </span>
      <span className={styles.price}>${formatNumber(value, 2)}</span>
      <span className={styles.time}>{seconds}s</span>
      {canMake ? (
        <button
          type="button"
          className={styles.can}
          onClick={() => onStart(recipe.id)}
          disabled={stoveFull}
          title={stoveFull ? 'Every stove is busy' : undefined}
          aria-label={`Can ${recipe.name}`}
        >
          Can
        </button>
      ) : (
        <span className={styles.short} title={shortNames ? `Short of ${shortNames}` : 'No free stove'}>Short</span>
      )}
    </li>
  );
});

RecipeRow.displayName = 'RecipeRow';

export default RecipeRow;

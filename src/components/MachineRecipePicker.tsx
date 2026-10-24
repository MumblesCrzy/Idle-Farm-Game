/**
 * Picks a factory floor machine's recipe: every unlocked recipe in the player's order, with
 * its ingredients, what a batch sells for, how long it takes, and whether the hopper has
 * enough for a batch now. A machine with a recipe can also be stopped.
 */
import { memo, type FC } from 'react';
import type { Recipe } from '../types/canning';
import { recipeIcons } from '../utils/recipeHelpers';
import { useFocusTrap } from '../hooks/useFocusTrap';
import styles from './MachineRecipePicker.module.css';

interface MachineRecipePickerProps {
  /** The machine being set, from 0, or null while the picker is closed */
  machine: number | null;
  currentRecipeId: string | null;
  /** Unlocked recipes, in the player's order */
  recipes: Recipe[];
  /** What one batch sells for */
  valueOf: (recipe: Recipe) => number;
  /** Seconds one batch takes */
  timeOf: (recipe: Recipe) => number;
  /** What the hopper is short of for one batch, or null */
  shortOf: (recipe: Recipe) => string | null;
  onPick: (recipeId: string | null) => void;
  onClose: () => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const MachineRecipePicker: FC<MachineRecipePickerProps> = memo(({
  machine,
  currentRecipeId,
  recipes,
  valueOf,
  timeOf,
  shortOf,
  onPick,
  onClose,
  formatNumber
}) => {
  const open = machine !== null;
  const { containerRef, handleTabKey } = useFocusTrap(open, onClose);
  if (machine === null) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={containerRef}
        onKeyDown={handleTabKey}
        role="dialog"
        aria-modal="true"
        aria-labelledby="machine-picker-title"
        className={styles.dialog}
        onClick={event => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="machine-picker-title" className={styles.title}>Machine {machine + 1}: pick a recipe</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close. Press Escape to close">×</button>
        </div>
        <p className={styles.note}>It makes the recipe again and again while the hopper has the ingredients. A batch it is making now finishes first.</p>
        <ul className={styles.list}>
          {recipes.map(recipe => {
            const short = shortOf(recipe);
            const current = recipe.id === currentRecipeId;
            return (
              <li key={recipe.id}>
                <button
                  type="button"
                  className={current ? `${styles.option} ${styles.current}` : styles.option}
                  onClick={() => onPick(recipe.id)}
                  aria-pressed={current}
                >
                  <span className={styles.icons} aria-hidden="true">
                    {recipeIcons(recipe).slice(0, 4).map((icon, index) => <img key={index} src={icon} alt="" />)}
                  </span>
                  <span className={styles.name}>{recipe.name}</span>
                  <span className={styles.value}>${formatNumber(valueOf(recipe), 2)}</span>
                  <span className={styles.time}>{timeOf(recipe)} s</span>
                  <span className={short ? styles.short : styles.ready}>{short ? `Short of ${short}` : 'In the hopper'}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {currentRecipeId !== null && (
          <button type="button" className={styles.stop} onClick={() => onPick(null)}>Stop this machine</button>
        )}
      </div>
    </div>
  );
});

MachineRecipePicker.displayName = 'MachineRecipePicker';

export default MachineRecipePicker;

/**
 * The Kitchen's stove: every canning slot, with the batches cooking in them and how long each
 * has left. Batches the Canner started carry its mark. Preservers who own Rush Batch can
 * finish them all at once from here.
 */
import { memo, type FC } from 'react';
import type { CanningProcess, Recipe, RushBatchControl } from '../types/canning';
import { CANNING_CANNER, ICON_CANNING, ICON_WAX_SEAL } from '../config/assetPaths';
import styles from './CanningStove.module.css';

interface CanningStoveProps {
  processes: CanningProcess[];
  recipes: Recipe[];
  /** Slots on the stove */
  slots: number;
  /** Jars each batch makes, with the Pressure Canner */
  jarsPerBatch: number;
  /** Rush Batch, for Preservers who own it */
  rushBatch?: RushBatchControl;
}

const CanningStove: FC<CanningStoveProps> = memo(({ processes, recipes, slots, jarsPerBatch, rushBatch }) => {
  // Finished batches leave the stove as soon as they're paid
  const cooking = processes.filter(process => !process.completed && process.remainingTime > 0);
  const empty = Math.max(0, slots - cooking.length);

  // Batches have no id. Recipe and start time identify one, with a counter for the rare
  // pair started in the same millisecond.
  const seen = new Map<string, number>();
  const batchKey = (process: CanningProcess) => {
    const base = `${process.recipeId}-${process.startTime}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };

  return (
    <section className={styles.stove} aria-labelledby="stove-heading">
      <div className={styles.header}>
        <img src={ICON_CANNING} alt="" className={styles.headerIcon} />
        <h2 id="stove-heading" className={styles.title}>Stove {cooking.length} of {slots}</h2>
        {jarsPerBatch > 1 && <span className={styles.note}>{jarsPerBatch} jars a batch</span>}
        {rushBatch && (
          <button
            type="button"
            className={styles.rush}
            onClick={rushBatch.onRush}
            disabled={!rushBatch.canRush}
            aria-label={`Rush Batch: spend ${rushBatch.cost} Wax Seals to finish every running batch now`}
            title={`Rush Batch: spend ${rushBatch.cost} Wax Seals to finish every running batch now`}
          >
            {cooking.length > 0 ? `Rush all ${cooking.length}` : 'Rush Batch'}
            <span className={styles.rushCost}>
              {rushBatch.cost}
              <img src={ICON_WAX_SEAL} alt="" className={styles.rushSeal} />
            </span>
          </button>
        )}
      </div>
      <ul className={styles.slots}>
        {cooking.map(process => {
          const recipe = recipes.find(r => r.id === process.recipeId);
          const done = process.totalTime > 0 ? ((process.totalTime - process.remainingTime) / process.totalTime) * 100 : 0;
          const name = recipe?.name ?? 'Batch';
          return (
            <li key={batchKey(process)} className={styles.slot}>
              <span className={styles.slotName}>{name}</span>
              <span className={styles.slotTime}>
                {process.automated && <img src={CANNING_CANNER} alt="Canner" title="Started by the Canner" />}
                {process.remainingTime}s
              </span>
              <span
                className={styles.bar}
                role="progressbar"
                aria-label={`${name}: ${process.remainingTime} seconds left`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.floor(done)}
              >
                <span className={styles.fill} style={{ width: `${done}%` }} />
              </span>
            </li>
          );
        })}
        {Array.from({ length: empty }, (_, i) => (
          <li key={`empty-${i}`} className={`${styles.slot} ${styles.empty}`}>Empty</li>
        ))}
      </ul>
    </section>
  );
});

CanningStove.displayName = 'CanningStove';

export default CanningStove;

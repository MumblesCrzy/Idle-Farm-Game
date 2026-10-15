import type { FC } from 'react';
import ProgressBar from './ProgressBar';
import type { CanningProcess, Recipe } from '../types/canning';
import styles from './CanningProcessDisplay.module.css';

interface CanningProcessDisplayProps {
  processes: CanningProcess[];
  recipes: Recipe[];
  maxSimultaneousProcesses?: number;
}

const CanningProcessDisplay: FC<CanningProcessDisplayProps> = ({
  processes,
  recipes,
  maxSimultaneousProcesses
}) => {
  // Processes have no id. Recipe and start time identify one, with a counter
  // for the rare pair started in the same millisecond.
  const seen = new Map<string, number>();
  const processKey = (process: CanningProcess) => {
    const base = `${process.recipeId}-${process.startTime}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.header}>
        Active Processes ({processes.length}/{maxSimultaneousProcesses})
      </h3>
      
      {processes.length === 0 ? (
        <div className={styles.emptyState}>
        </div>
      ) : (
        <div className={styles.processesList}>
          {processes
            .filter(process => !process.completed && process.remainingTime > 0)
            .map(process => {
            const recipe = recipes.find(r => r.id === process.recipeId);
            if (!recipe) return null;

            const totalTime = process.totalTime;
            const elapsed = totalTime - process.remainingTime;
            const progressPercent = (elapsed / totalTime) * 100;

            return (
              <div
                key={processKey(process)}
                className={styles.process}
              >
                {/* Recipe name - truncated */}
                <div className={styles.recipeName}>
                  {recipe.name}
                </div>

                {/* Progress bar - compact */}
                <div className={styles.progressWrapper}>
                  <ProgressBar
                    value={progressPercent}
                    max={100}
                    height={12}
                    color='#2196F3'
                  />
                </div>

                {/* Status/Action - compact */}
                <div className={styles.statusRow}>
                  <div className={styles.timeRemaining}>
                    {process.remainingTime}s ({Math.floor(progressPercent)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CanningProcessDisplay;
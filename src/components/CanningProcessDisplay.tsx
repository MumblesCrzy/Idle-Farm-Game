import React from 'react';
import ProgressBar from './ProgressBar';
import type { CanningProcess, Recipe } from '../types/canning';
import { ICON_CANNING } from '../config/assetPaths';
import styles from './CanningProcessDisplay.module.css';

interface CanningProcessDisplayProps {
  processes: CanningProcess[];
  recipes: Recipe[];
  maxSimultaneousProcesses?: number;
}

const CanningProcessDisplay: React.FC<CanningProcessDisplayProps> = ({
  processes,
  recipes,
  maxSimultaneousProcesses
}) => {
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
            .map((process, index) => {
            const recipe = recipes.find(r => r.id === process.recipeId);
            if (!recipe) return null;

            const totalTime = process.totalTime;
            const elapsed = totalTime - process.remainingTime;
            const progressPercent = (elapsed / totalTime) * 100;

            return (
              <div
                key={index}
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
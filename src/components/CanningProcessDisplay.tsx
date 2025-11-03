import React from 'react';
import ProgressBar from './ProgressBar';
import type { CanningProcess, Recipe } from '../types/canning';
import { ICON_CANNING } from '../config/assetPaths';
import styles from './CanningProcessDisplay.module.css';

interface CanningProcessDisplayProps {
  processes: CanningProcess[];
  recipes: Recipe[];
  onCollect: (processIndex: number) => void;
  maxSimultaneousProcesses?: number;
}

const CanningProcessDisplay: React.FC<CanningProcessDisplayProps> = ({
  processes,
  recipes,
  onCollect,
  maxSimultaneousProcesses
}) => {
  return (
    <div className={styles.container}>
      <h3 className={styles.header}>
        Active Processes ({processes.length}/{maxSimultaneousProcesses})
      </h3>
      
      {processes.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <img src={ICON_CANNING} alt="Canning" className={styles.emptyIconImage} />
          </div>
          <div className={styles.emptyText}>No active canning processes</div>
          <div className={styles.emptyHint}>
            Select a recipe above to start canning!
          </div>
        </div>
      ) : (
        <div className={styles.processesList}>
          {processes.map((process, index) => {
            const recipe = recipes.find(r => r.id === process.recipeId);
            if (!recipe) return null;

            const totalTime = process.totalTime;
            const elapsed = totalTime - process.remainingTime;
            const progressPercent = (elapsed / totalTime) * 100;

            const isCompleted = process.completed || process.remainingTime <= 0;

            return (
              <div
                key={index}
                className={`${styles.process} ${isCompleted ? styles.completed : ''}`}
              >
                {/* Recipe name - truncated */}
                <div className={`${styles.recipeName} ${isCompleted ? styles.completed : ''}`}>
                  {recipe.name}
                </div>

                {/* Progress bar - compact */}
                <div className={styles.progressWrapper}>
                  <ProgressBar
                    value={progressPercent}
                    max={100}
                    height={12}
                    color={isCompleted ? '#4CAF50' : '#2196F3'}
                  />
                </div>

                {/* Status/Action - compact */}
                <div className={styles.statusRow}>
                  {isCompleted ? (
                    <button
                      onClick={() => onCollect(index)}
                      className={styles.collectButton}
                    >
                      Collect ${recipe.salePrice.toFixed(2)}
                    </button>
                  ) : (
                    <div className={styles.timeRemaining}>
                      {process.remainingTime}s ({Math.floor(progressPercent)}%)
                    </div>
                  )}
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
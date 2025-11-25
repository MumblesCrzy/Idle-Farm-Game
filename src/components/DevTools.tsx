import React, { useState } from 'react';
import styles from './DevTools.module.css';
import { ICON_CANNING } from '../config/assetPaths';

interface DevToolsProps {
  onAddMoney: (amount: number) => void;
  onAddExperience: (amount: number) => void;
  onAddKnowledge: (amount: number) => void;
  onSkipDays: (days: number) => void;
  onUnlockAllVeggies?: () => void;
  onUnlockAllRecipes?: () => void;
  onMaxUpgrades?: () => void;
  onResetGame?: () => void;
  // Christmas Event
  onAddHolidayCheer?: (amount: number) => void;
  onHarvestAllTrees?: () => void;
  onAddTreeMaterials?: () => void;
  onProcessTreeGrowth?: () => void;
  // Bees
  onAddHoney?: (amount: number) => void;
  onAddGoldenHoney?: (amount: number) => void;
  onHarvestAllHoney?: () => void;
  onCompleteAllBoxes?: () => void;
  onAddBeeBox?: () => void;
}

const DevTools: React.FC<DevToolsProps> = ({
  onAddMoney,
  onAddExperience,
  onAddKnowledge,
  onSkipDays,
  onUnlockAllVeggies,
  onUnlockAllRecipes,
  onMaxUpgrades,
  onResetGame,
  onAddHolidayCheer,
  onHarvestAllTrees,
  onAddTreeMaterials,
  onProcessTreeGrowth,
  onAddHoney,
  onAddGoldenHoney,
  onHarvestAllHoney,
  onCompleteAllBoxes,
  onAddBeeBox
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customMoney, setCustomMoney] = useState('1000');
  const [customExp, setCustomExp] = useState('100');
  const [customKnowledge, setCustomKnowledge] = useState('100');
  const [customDays, setCustomDays] = useState('7');

  // Helper to skip days and process tree growth
  const handleSkipDays = (days: number) => {
    onSkipDays(days);
    
    // Process tree growth for each day (86400 seconds per day)
    if (onProcessTreeGrowth) {
      const ticksPerDay = 86400; // 1 tick per second
      const totalTicks = days * ticksPerDay;
      
      // Process all ticks
      for (let i = 0; i < totalTicks; i++) {
        onProcessTreeGrowth();
      }
    }
  };

  // Only show in development mode
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className={styles.container}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={styles.toggleButton}
        title="Developer Tools"
      >
        🛠️ {isExpanded ? 'Hide' : 'Dev Tools'}
      </button>

      {isExpanded && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <h3 className={styles.title}>Developer Tools</h3>
            <span className={styles.badge}>DEV MODE</span>
          </div>

          {/* Quick Resources Section */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Quick Resources</h4>
            <div className={styles.buttonGrid}>
              <button onClick={() => onAddMoney(1000)} className={styles.button}>
                +$1K
              </button>
              <button onClick={() => onAddMoney(10000)} className={styles.button}>
                +$10K
              </button>
              <button onClick={() => onAddMoney(100000)} className={styles.button}>
                +$100K
              </button>
              <button onClick={() => onAddExperience(100)} className={styles.button}>
                +100 XP
              </button>
              <button onClick={() => onAddExperience(1000)} className={styles.button}>
                +1K XP
              </button>
              <button onClick={() => onAddExperience(10000)} className={styles.button}>
                +10K XP
              </button>
              <button onClick={() => onAddKnowledge(100)} className={styles.button}>
                +100 Knowledge
              </button>
              <button onClick={() => onAddKnowledge(1000)} className={styles.button}>
                +1K Knowledge
              </button>
              <button onClick={() => onAddKnowledge(10000)} className={styles.button}>
                +10K Knowledge
              </button>
            </div>
          </div>

          {/* Custom Amounts Section */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Custom Amounts</h4>
            <div className={styles.customInputGroup}>
              <label className={styles.inputLabel}>
                Money:
                <input
                  type="number"
                  value={customMoney}
                  onChange={(e) => setCustomMoney(e.target.value)}
                  className={styles.input}
                />
                <button 
                  onClick={() => onAddMoney(parseInt(customMoney) || 0)}
                  className={styles.smallButton}
                >
                  Add
                </button>
              </label>

              <label className={styles.inputLabel}>
                Experience:
                <input
                  type="number"
                  value={customExp}
                  onChange={(e) => setCustomExp(e.target.value)}
                  className={styles.input}
                />
                <button 
                  onClick={() => onAddExperience(parseInt(customExp) || 0)}
                  className={styles.smallButton}
                >
                  Add
                </button>
              </label>

              <label className={styles.inputLabel}>
                Knowledge:
                <input
                  type="number"
                  value={customKnowledge}
                  onChange={(e) => setCustomKnowledge(e.target.value)}
                  className={styles.input}
                />
                <button 
                  onClick={() => onAddKnowledge(parseInt(customKnowledge) || 0)}
                  className={styles.smallButton}
                >
                  Add
                </button>
              </label>
            </div>
          </div>

          {/* Time Control Section */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Time Control</h4>
            <div className={styles.timeControl}>
              <button onClick={() => handleSkipDays(1)} className={styles.button}>
                +1 Day
              </button>
              <button onClick={() => handleSkipDays(7)} className={styles.button}>
                +1 Week
              </button>
              <button onClick={() => handleSkipDays(30)} className={styles.button}>
                +1 Month
              </button>
              <label className={styles.inputLabel}>
                Custom:
                <input
                  type="number"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className={styles.input}
                  min="1"
                />
                <button 
                  onClick={() => handleSkipDays(parseInt(customDays) || 0)}
                  className={styles.smallButton}
                >
                  Skip
                </button>
              </label>
            </div>
          </div>

          {/* Unlock Actions Section */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Unlock Actions</h4>
            <div className={styles.actionButtons}>
              {onUnlockAllVeggies && (
                <button 
                  onClick={onUnlockAllVeggies}
                  className={styles.actionButton}
                >
                  🥕 Unlock All Veggies
                </button>
              )}
              {onUnlockAllRecipes && (
                <button 
                  onClick={onUnlockAllRecipes}
                  className={styles.actionButton}
                >
                  <img src={ICON_CANNING} alt="" style={{ width: '16px', height: '16px', verticalAlign: 'middle', marginRight: '4px' }} />
                  Unlock All Recipes
                </button>
              )}
              {onMaxUpgrades && (
                <button 
                  onClick={onMaxUpgrades}
                  className={styles.actionButton}
                >
                  ⬆️ Max All Upgrades
                </button>
              )}
            </div>
          </div>

          {/* Christmas Event Section */}
          {(onAddHolidayCheer || onHarvestAllTrees || onAddTreeMaterials) && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>🎄 Christmas Tree Shop</h4>
              <div className={styles.actionButtons}>
                {onAddHolidayCheer && (
                  <>
                    <button 
                      onClick={() => onAddHolidayCheer(100)}
                      className={styles.actionButton}
                    >
                      +100 Holiday Cheer
                    </button>
                    <button 
                      onClick={() => onAddHolidayCheer(1000)}
                      className={styles.actionButton}
                    >
                      +1K Holiday Cheer
                    </button>
                  </>
                )}
                {onHarvestAllTrees && (
                  <button 
                    onClick={onHarvestAllTrees}
                    className={styles.actionButton}
                  >
                    🌲 Harvest All Trees
                  </button>
                )}
                {onAddTreeMaterials && (
                  <button 
                    onClick={onAddTreeMaterials}
                    className={styles.actionButton}
                  >
                    📦 Add Materials (x100 each)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bees Section */}
          {(onAddHoney || onAddGoldenHoney || onHarvestAllHoney || onCompleteAllBoxes || onAddBeeBox) && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>🐝 Bee System</h4>
              <div className={styles.actionButtons}>
                {onAddHoney && (
                  <>
                    <button 
                      onClick={() => onAddHoney(100)}
                      className={styles.actionButton}
                    >
                      +100 🍯 Honey
                    </button>
                    <button 
                      onClick={() => onAddHoney(1000)}
                      className={styles.actionButton}
                    >
                      +1K 🍯 Honey
                    </button>
                  </>
                )}
                {onAddGoldenHoney && (
                  <>
                    <button 
                      onClick={() => onAddGoldenHoney(10)}
                      className={styles.actionButton}
                    >
                      +10 ✨ Golden Honey
                    </button>
                    <button 
                      onClick={() => onAddGoldenHoney(100)}
                      className={styles.actionButton}
                    >
                      +100 ✨ Golden Honey
                    </button>
                  </>
                )}
                {onCompleteAllBoxes && (
                  <button 
                    onClick={onCompleteAllBoxes}
                    className={styles.actionButton}
                  >
                    ⚡ Complete All Boxes
                  </button>
                )}
                {onHarvestAllHoney && (
                  <button 
                    onClick={onHarvestAllHoney}
                    className={styles.actionButton}
                  >
                    🍯 Harvest All Honey
                  </button>
                )}
                {onAddBeeBox && (
                  <button 
                    onClick={onAddBeeBox}
                    className={styles.actionButton}
                  >
                    ➕ Add Bee Box
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Danger Zone */}
          {onResetGame && (
            <div className={`${styles.section} ${styles.dangerZone}`}>
              <h4 className={styles.sectionTitle}>⚠️ Danger Zone</h4>
              <button 
                onClick={() => {
                  if (window.confirm('Reset all game progress? This cannot be undone!')) {
                    onResetGame();
                  }
                }}
                className={styles.dangerButton}
              >
                Reset Game
              </button>
            </div>
          )}

          <div className={styles.footer}>
            <small>Developer tools are only available in development mode</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevTools;

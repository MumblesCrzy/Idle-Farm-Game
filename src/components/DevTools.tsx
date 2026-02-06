import { useState, useCallback, type FC } from 'react';
import styles from './DevTools.module.css';
import { ICON_CANNING, ICON_BEE, ICON_HONEY, ICON_GOLDEN_HONEY } from '../config/assetPaths';
import { validateNumber, sanitizeDayCount } from '../utils/validation';

interface DevToolsProps {
  onAddMoney: (amount: number) => void;
  onAddExperience: (amount: number) => void;
  onAddKnowledge: (amount: number) => void;
  onSkipDays: (days: number) => void;
  onUnlockAllVeggies?: () => void;
  onUnlockAllRecipes?: () => void;
  onMaxUpgrades?: () => void;
  onResetGame?: () => void;
  onResetGuild?: () => void;
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

const DevTools: FC<DevToolsProps> = ({
  onAddMoney,
  onAddExperience,
  onAddKnowledge,
  onSkipDays,
  onUnlockAllVeggies,
  onUnlockAllRecipes,
  onMaxUpgrades,
  onResetGame,
  onResetGuild,
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validation constants for resource inputs
  const MAX_RESOURCE_AMOUNT = 1e12; // 1 trillion max
  const MAX_SKIP_DAYS = 365000; // ~1000 years

  // Validates and sanitizes resource input, returns sanitized value or null if invalid
  const validateResourceInput = useCallback((value: string, fieldName: string): number | null => {
    const result = validateNumber(value, {
      min: 0,
      max: MAX_RESOURCE_AMOUNT,
      allowNegative: false,
      allowDecimal: false,
      defaultValue: 0
    });

    if (!result.valid) {
      setValidationErrors(prev => ({ ...prev, [fieldName]: result.error || 'Invalid input' }));
      return null;
    }

    // Clear any previous error
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });

    return result.sanitizedValue ?? 0;
  }, []);

  // Handles adding money with validation
  const handleAddMoney = useCallback(() => {
    const amount = validateResourceInput(customMoney, 'money');
    if (amount !== null && amount > 0) {
      onAddMoney(amount);
    }
  }, [customMoney, onAddMoney, validateResourceInput]);

  // Handles adding experience with validation
  const handleAddExp = useCallback(() => {
    const amount = validateResourceInput(customExp, 'exp');
    if (amount !== null && amount > 0) {
      onAddExperience(amount);
    }
  }, [customExp, onAddExperience, validateResourceInput]);

  // Handles adding knowledge with validation
  const handleAddKnowledge = useCallback(() => {
    const amount = validateResourceInput(customKnowledge, 'knowledge');
    if (amount !== null && amount > 0) {
      onAddKnowledge(amount);
    }
  }, [customKnowledge, onAddKnowledge, validateResourceInput]);

  // Helper to skip days and process tree growth with validation
  const handleSkipDays = useCallback((days: number) => {
    // Validate days - must be at least 1 and not exceed max
    const sanitizedDays = sanitizeDayCount(days);
    
    onSkipDays(sanitizedDays);
    
    // Process tree growth for each day (86400 seconds per day)
    if (onProcessTreeGrowth) {
      const ticksPerDay = 86400; // 1 tick per second
      const totalTicks = sanitizedDays * ticksPerDay;
      
      // Process all ticks
      for (let i = 0; i < totalTicks; i++) {
        onProcessTreeGrowth();
      }
    }
  }, [onSkipDays, onProcessTreeGrowth]);

  // Handles custom days input with validation
  const handleCustomSkipDays = useCallback(() => {
    const result = validateNumber(customDays, {
      min: 1,
      max: MAX_SKIP_DAYS,
      allowNegative: false,
      allowDecimal: false,
      defaultValue: 1
    });

    if (!result.valid) {
      setValidationErrors(prev => ({ ...prev, days: result.error || 'Invalid input' }));
      return;
    }

    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.days;
      return newErrors;
    });

    handleSkipDays(result.sanitizedValue ?? 1);
  }, [customDays, handleSkipDays]);

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
                  className={`${styles.input} ${validationErrors.money ? styles.inputError : ''}`}
                  min="0"
                  max={MAX_RESOURCE_AMOUNT}
                  aria-invalid={!!validationErrors.money}
                  aria-describedby={validationErrors.money ? 'money-error' : undefined}
                />
                <button 
                  onClick={handleAddMoney}
                  className={styles.smallButton}
                >
                  Add
                </button>
                {validationErrors.money && (
                  <span id="money-error" className={styles.errorMessage}>{validationErrors.money}</span>
                )}
              </label>

              <label className={styles.inputLabel}>
                Experience:
                <input
                  type="number"
                  value={customExp}
                  onChange={(e) => setCustomExp(e.target.value)}
                  className={`${styles.input} ${validationErrors.exp ? styles.inputError : ''}`}
                  min="0"
                  max={MAX_RESOURCE_AMOUNT}
                  aria-invalid={!!validationErrors.exp}
                  aria-describedby={validationErrors.exp ? 'exp-error' : undefined}
                />
                <button 
                  onClick={handleAddExp}
                  className={styles.smallButton}
                >
                  Add
                </button>
                {validationErrors.exp && (
                  <span id="exp-error" className={styles.errorMessage}>{validationErrors.exp}</span>
                )}
              </label>

              <label className={styles.inputLabel}>
                Knowledge:
                <input
                  type="number"
                  value={customKnowledge}
                  onChange={(e) => setCustomKnowledge(e.target.value)}
                  className={`${styles.input} ${validationErrors.knowledge ? styles.inputError : ''}`}
                  min="0"
                  max={MAX_RESOURCE_AMOUNT}
                  aria-invalid={!!validationErrors.knowledge}
                  aria-describedby={validationErrors.knowledge ? 'knowledge-error' : undefined}
                />
                <button 
                  onClick={handleAddKnowledge}
                  className={styles.smallButton}
                >
                  Add
                </button>
                {validationErrors.knowledge && (
                  <span id="knowledge-error" className={styles.errorMessage}>{validationErrors.knowledge}</span>
                )}
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
                  className={`${styles.input} ${validationErrors.days ? styles.inputError : ''}`}
                  min="1"
                  max={MAX_SKIP_DAYS}
                  aria-invalid={!!validationErrors.days}
                  aria-describedby={validationErrors.days ? 'days-error' : undefined}
                />
                <button 
                  onClick={handleCustomSkipDays}
                  className={styles.smallButton}
                >
                  Skip
                </button>
                {validationErrors.days && (
                  <span id="days-error" className={styles.errorMessage}>{validationErrors.days}</span>
                )}
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
              <h4 className={styles.sectionTitle}><img src={ICON_BEE} alt="Bee" style={{ width: '18px', height: '18px', verticalAlign: 'middle' }} /> Bee System</h4>
              <div className={styles.actionButtons}>
                {onAddHoney && (
                  <>
                    <button 
                      onClick={() => onAddHoney(100)}
                      className={styles.actionButton}
                    >
                      +100 <img src={ICON_HONEY} alt="Honey" style={{ width: '14px', height: '14px', verticalAlign: 'middle' }} /> Honey
                    </button>
                    <button 
                      onClick={() => onAddHoney(1000)}
                      className={styles.actionButton}
                    >
                      +1K <img src={ICON_HONEY} alt="Honey" style={{ width: '14px', height: '14px', verticalAlign: 'middle' }} /> Honey
                    </button>
                  </>
                )}
                {onAddGoldenHoney && (
                  <>
                    <button 
                      onClick={() => onAddGoldenHoney(10)}
                      className={styles.actionButton}
                    >
                      +10 <img src={ICON_GOLDEN_HONEY} alt="Golden Honey" style={{ width: '14px', height: '14px', verticalAlign: 'middle' }} /> Golden Honey
                    </button>
                    <button 
                      onClick={() => onAddGoldenHoney(100)}
                      className={styles.actionButton}
                    >
                      +100 <img src={ICON_GOLDEN_HONEY} alt="Golden Honey" style={{ width: '14px', height: '14px', verticalAlign: 'middle' }} /> Golden Honey
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
                    <img src={ICON_HONEY} alt="Honey" style={{ width: '14px', height: '14px', verticalAlign: 'middle' }} /> Harvest All Honey
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
          {(onResetGame || onResetGuild) && (
            <div className={`${styles.section} ${styles.dangerZone}`}>
              <h4 className={styles.sectionTitle}>⚠️ Danger Zone</h4>
              {onResetGuild && (
                <button 
                  onClick={() => {
                    if (window.confirm('Reset guild progress? This will remove you from your guild and reset all guild upgrades.')) {
                      onResetGuild();
                    }
                  }}
                  className={styles.dangerButton}
                >
                  Reset Guild
                </button>
              )}
              {onResetGame && (
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
              )}
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

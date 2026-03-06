/**
 * Lifespan Tutorial Overlays
 * 
 * Two tutorial overlays for the Wisdom of the Ages prestige system:
 * 1. Lifespan Intro - Shown at the start of the first game
 * 2. Shop Explanation - Shown after the first lifetime completes
 */

import { useEffect, useState, memo, type FC } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import styles from './LifespanTutorial.module.css';

// ============================================================================
// LIFESPAN INTRO OVERLAY
// Shown at the start of the first game
// ============================================================================

interface LifespanIntroProps {
  isVisible: boolean;
  onDismiss: () => void;
  onLearnMore?: () => void; // Optional: open info/help
}

export const LifespanIntro: FC<LifespanIntroProps> = memo(({ 
  isVisible, 
  onDismiss,
  onLearnMore 
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const { containerRef, handleTabKey } = useFocusTrap(isVisible, onDismiss);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`${styles.backdrop} ${isVisible ? styles.visible : styles.hidden}`}
        onClick={onDismiss}
        aria-hidden="true"
      />
      
      {/* Tutorial Modal */}
      <div 
        className={`${styles.tutorialContainer} ${isVisible ? styles.visible : styles.hidden}`}
        ref={containerRef}
        onKeyDown={handleTabKey}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lifespan-intro-title"
        aria-describedby="lifespan-intro-description"
      >
        <div className={styles.tutorialBox}>
          <div className={styles.tutorialIcon}>✨</div>
          
          <h2 id="lifespan-intro-title" className={styles.tutorialTitle}>
            A Limited Life, A Lasting Legacy
          </h2>
          
          <div id="lifespan-intro-description" className={styles.tutorialText}>
            <p>
              Welcome to <strong>Wisdom of the Ages</strong>! In this game, you have 
              <strong> 80 years</strong> to build your farm as large as possible.
            </p>
            <p>
              At the end of your life, your achievements will be converted into 
              <strong> Wisdom</strong> — a permanent currency that persists forever.
            </p>
            <p>
              Use Wisdom to purchase powerful upgrades that help future generations 
              start stronger. Each lifetime, you'll grow further!
            </p>
          </div>

          <div className={styles.buttonRow}>
            <button 
              className={styles.primaryButton}
              onClick={onDismiss}
              autoFocus
            >
              🌱 Start Farming
            </button>
            {onLearnMore && (
              <button 
                className={styles.secondaryButton}
                onClick={() => {
                  onLearnMore();
                  onDismiss();
                }}
              >
                📖 Learn More
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

LifespanIntro.displayName = 'LifespanIntro';

// ============================================================================
// SHOP EXPLANATION OVERLAY
// Shown after the first lifetime completes
// ============================================================================

interface ShopExplanationProps {
  isVisible: boolean;
  wisdomEarned: number;
  onOpenShop: () => void;
  onBeginNextLifetime: () => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

export const ShopExplanation: FC<ShopExplanationProps> = memo(({ 
  isVisible, 
  wisdomEarned,
  onOpenShop,
  onBeginNextLifetime,
  formatNumber
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const { containerRef, handleTabKey } = useFocusTrap(isVisible, onBeginNextLifetime);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop - not dismissible by click for this important overlay */}
      <div 
        className={`${styles.backdrop} ${isVisible ? styles.visible : styles.hidden}`}
        aria-hidden="true"
      />
      
      {/* Tutorial Modal */}
      <div 
        className={`${styles.tutorialContainer} ${isVisible ? styles.visible : styles.hidden}`}
        ref={containerRef}
        onKeyDown={handleTabKey}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-explanation-title"
        aria-describedby="shop-explanation-description"
      >
        <div className={`${styles.tutorialBox} ${styles.shopExplanationBox}`}>
          <div className={styles.tutorialIcon}>🎉</div>
          
          <h2 id="shop-explanation-title" className={styles.tutorialTitle}>
            Your Legacy Awaits!
          </h2>
          
          <div className={styles.wisdomBadge}>
            <span className={styles.wisdomIcon}>✨</span>
            <span className={styles.wisdomAmount}>+{formatNumber(wisdomEarned)} Wisdom Earned!</span>
          </div>
          
          <div id="shop-explanation-description" className={styles.tutorialText}>
            <p>
              Congratulations on completing your first lifetime! You've earned 
              <strong> Wisdom</strong> based on your achievements.
            </p>
            <p>
              Visit the <strong>Wisdom Shop</strong> to purchase permanent upgrades. 
              Some upgrades (like starting bonuses) can only be bought between 
              lifetimes and will apply to your next life!
            </p>
          </div>

          <div className={styles.buttonRow}>
            <button 
              className={styles.primaryButton}
              onClick={onOpenShop}
              autoFocus
            >
              ✨ Open Wisdom Shop
            </button>
            <button 
              className={styles.secondaryButton}
              onClick={onBeginNextLifetime}
            >
              🌱 Begin Next Lifetime
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

ShopExplanation.displayName = 'ShopExplanation';

// Default export for convenience
export default { LifespanIntro, ShopExplanation };

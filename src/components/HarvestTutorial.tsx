/**
 * Harvest Tutorial Overlay
 * 
 * One-time tutorial that appears when a veggie is ready to harvest for the first time.
 * Points to the harvest button to help new players understand the core mechanic.
 */

import React, { useEffect, useState } from 'react';
import styles from './HarvestTutorial.module.css';

interface HarvestTutorialProps {
  isVisible: boolean;
  onDismiss: () => void;
}

const HarvestTutorial: React.FC<HarvestTutorialProps> = ({ isVisible, onDismiss }) => {
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      // Delay unmounting to allow fade-out animation
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`${styles.backdrop} ${isVisible ? styles.visible : styles.hidden}`}
        onClick={onDismiss}
      />
      
      {/* Tutorial pointer and message */}
      <div className={`${styles.tutorialContainer} ${isVisible ? styles.visible : styles.hidden}`}>
        <div className={styles.tutorialBox}>
          <div className={styles.tutorialMessage}>
            <h3 className={styles.tutorialTitle}>🎉 Your first harvest is ready!</h3>
            <p className={styles.tutorialText}>
              Click the <strong>Harvest</strong> button to collect your vegetables and earn experience!
            </p>
            <button 
              className={styles.dismissButton}
              onClick={onDismiss}
            >
              Got it!
            </button>
          </div>
          <div className={styles.arrow} />
        </div>
      </div>
    </>
  );
};

export default HarvestTutorial;

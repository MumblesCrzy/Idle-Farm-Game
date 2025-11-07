import { useState, useEffect } from 'react';
import type { Veggie } from '../types/game';
import { canMakePurchase } from '../utils/gameCalculations';

interface AutoPurchaseHandlers {
  handleBuyFertilizer: (veggieIndex: number) => void;
  handleBuyBetterSeeds: (veggieIndex: number) => void;
  handleBuyHarvesterSpeed: (veggieIndex: number) => void;
  handleBuyAdditionalPlot: (veggieIndex: number) => void;
}

interface AutoPurchaseParams {
  veggies: Veggie[];
  setVeggies: React.Dispatch<React.SetStateAction<Veggie[]>>;
  money: number;
  knowledge: number;
  maxPlots: number;
  handlers: AutoPurchaseHandlers;
  initialTimer?: number;
  onPurchaseCallback?: (veggieName: string, autoPurchaserName: string, upgradeType: string, upgradeLevel: number, cost: number, currencyType: 'money' | 'knowledge') => void;
}

/**
 * Custom hook for managing automatic purchase system.
 * Processes auto-purchasers every 7 days for enabled veggies.
 * 
 * @param params - Configuration and dependencies for auto-purchase system
 * @returns globalAutoPurchaseTimer - Current timer value (0-6 days)
 */
export const useAutoPurchase = ({
  veggies,
  setVeggies,
  money,
  knowledge,
  maxPlots,
  handlers,
  initialTimer = 0,
  onPurchaseCallback
}: AutoPurchaseParams) => {
  const [globalAutoPurchaseTimer, setGlobalAutoPurchaseTimer] = useState(initialTimer);

  // Process auto-purchases when timer reaches 7 days
  useEffect(() => {
    if (globalAutoPurchaseTimer >= 7) {
      setGlobalAutoPurchaseTimer(0);

      veggies.forEach((v, veggieIndex) => {
        for (const ap of v.autoPurchasers) {
          if (ap.owned && ap.active) {
            // Check if we can afford and make the purchase
            if (canMakePurchase(v, ap.purchaseType, money, knowledge, ap.currencyType, veggies, maxPlots)) {
              // Get current upgrade level before purchase
              let currentLevel = 0;
              let upgradeCost = 0;
              
              switch (ap.purchaseType) {
                case 'fertilizer':
                  currentLevel = v.fertilizerLevel;
                  upgradeCost = v.fertilizerCost;
                  handlers.handleBuyFertilizer(veggieIndex);
                  break;
                case 'betterSeeds':
                  currentLevel = v.betterSeedsLevel;
                  upgradeCost = v.betterSeedsCost;
                  handlers.handleBuyBetterSeeds(veggieIndex);
                  break;
                case 'harvesterSpeed':
                  currentLevel = v.harvesterSpeedLevel || 0;
                  upgradeCost = v.harvesterSpeedCost || 0;
                  handlers.handleBuyHarvesterSpeed(veggieIndex);
                  break;
                case 'additionalPlot':
                  currentLevel = v.additionalPlotLevel || 0;
                  upgradeCost = v.additionalPlotCost;
                  handlers.handleBuyAdditionalPlot(veggieIndex);
                  break;
              }
              
              // Log the purchase if callback provided
              if (onPurchaseCallback) {
                onPurchaseCallback(
                  v.name,
                  ap.name,
                  ap.purchaseType,
                  currentLevel + 1, // New level after purchase
                  upgradeCost,
                  ap.currencyType
                );
              }
            }

            // Special case: Disable surveyor if max plots reached
            if (ap.purchaseType === 'additionalPlot') {
              const totalPlotsUsed = veggies.filter(v => v.unlocked).length + veggies.reduce((sum, v) => sum + (v.additionalPlotLevel || 0), 0);
              if (totalPlotsUsed >= maxPlots && ap.active) {
                setVeggies((prev) => {
                  const updated = [...prev];
                  const surveyor = updated[veggieIndex].autoPurchasers.find((p) => p.id === 'surveyor');
                  if (surveyor) {
                    surveyor.active = false;
                  }
                  return updated;
                });
              }
            }
          }
        }
      });
    }
  }, [globalAutoPurchaseTimer, money, knowledge, maxPlots, veggies, handlers, setVeggies, onPurchaseCallback]);

  return {
    globalAutoPurchaseTimer,
    setGlobalAutoPurchaseTimer
  };
};

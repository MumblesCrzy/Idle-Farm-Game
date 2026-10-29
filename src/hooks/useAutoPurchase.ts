import { useState, useEffect } from 'react';
import type { Veggie } from '../types/game';
import { canMakePurchase } from '../utils/gameCalculations';
import { calculatePlotsUsed } from '../utils/unlockSystem';
import { AUTO_PURCHASER_CYCLE_DAYS } from '../config/gameConstants';

interface AutoPurchaseHandlers {
  handleBuyFertilizer: (veggieIndex: number, priceFactor?: number) => void;
  handleBuyBetterSeeds: (veggieIndex: number, priceFactor?: number) => void;
  handleBuyHarvesterSpeed: (veggieIndex: number, priceFactor?: number) => void;
  handleBuyAdditionalPlot: (veggieIndex: number, priceFactor?: number) => void;
}

interface AutoPurchaseParams {
  veggies: Veggie[];
  setVeggies: React.Dispatch<React.SetStateAction<Veggie[]>>;
  money: number;
  knowledge: number;
  maxPlots: number;
  handlers: AutoPurchaseHandlers;
  initialTimer?: number;
  /** Share of the price the auto-buyers pay: below 1 with the Engineers' Bulk Purchasing */
  priceFactor?: number;
  onPurchaseCallback?: (veggieName: string, autoPurchaserName: string, upgradeType: string, upgradeLevel: number, cost: number, currencyType: 'money' | 'knowledge') => void;
}

/**
 * Custom hook for managing automatic purchase system.
 * Processes auto-purchasers every AUTO_PURCHASER_CYCLE_DAYS days for enabled veggies.
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
  priceFactor = 1,
  onPurchaseCallback
}: AutoPurchaseParams) => {
  const [globalAutoPurchaseTimer, setGlobalAutoPurchaseTimer] = useState(initialTimer);

  // Process auto-purchases when the timer completes a cycle. Every auto-buyer shops in the same
  // cycle from one budget: each sees the money, knowledge and free plots the ones before it left,
  // so together they never spend more than there is or buy plots past the farm's size.
  useEffect(() => {
    if (globalAutoPurchaseTimer >= AUTO_PURCHASER_CYCLE_DAYS) {
      setGlobalAutoPurchaseTimer(0);

      let moneyLeft = money;
      let knowledgeLeft = knowledge;
      let plotsUsed = calculatePlotsUsed(veggies);
      // Crops whose Surveyor stops because every plot is in use
      const fullSurveyors = new Set<number>();

      veggies.forEach((v, veggieIndex) => {
        for (const ap of v.autoPurchasers) {
          if (!ap.owned || !ap.active) continue;
          const isPlot = ap.purchaseType === 'additionalPlot';

          if (canMakePurchase(v, ap.purchaseType, moneyLeft, knowledgeLeft, ap.currencyType, undefined, undefined, priceFactor)
            && (!isPlot || plotsUsed < maxPlots)) {
            // Get current upgrade level before purchase
            let currentLevel = 0;
            let upgradeCost = 0;

            switch (ap.purchaseType) {
              case 'fertilizer':
                currentLevel = v.fertilizerLevel;
                upgradeCost = v.fertilizerCost;
                handlers.handleBuyFertilizer(veggieIndex, priceFactor);
                break;
              case 'betterSeeds':
                currentLevel = v.betterSeedsLevel;
                upgradeCost = v.betterSeedsCost;
                handlers.handleBuyBetterSeeds(veggieIndex, priceFactor);
                break;
              case 'harvesterSpeed':
                currentLevel = v.harvesterSpeedLevel || 0;
                upgradeCost = v.harvesterSpeedCost || 0;
                handlers.handleBuyHarvesterSpeed(veggieIndex, priceFactor);
                break;
              case 'additionalPlot':
                currentLevel = v.additionalPlotLevel || 0;
                upgradeCost = v.additionalPlotCost;
                handlers.handleBuyAdditionalPlot(veggieIndex, priceFactor);
                break;
            }

            // What the auto-buyer paid comes out of the cycle's budget
            const paid = upgradeCost * priceFactor;
            if (ap.currencyType === 'money') moneyLeft -= paid;
            else knowledgeLeft -= paid;
            if (isPlot) plotsUsed += 1;

            // Log the purchase if callback provided
            if (onPurchaseCallback) {
              onPurchaseCallback(
                v.name,
                ap.name,
                ap.purchaseType,
                currentLevel + 1, // New level after purchase
                paid,
                ap.currencyType
              );
            }
          }

          // A Surveyor switches off once every plot is in use
          if (isPlot && plotsUsed >= maxPlots) fullSurveyors.add(veggieIndex);
        }
      });

      if (fullSurveyors.size > 0) {
        setVeggies(prev => prev.map((v, index) => (fullSurveyors.has(index)
          ? { ...v, autoPurchasers: v.autoPurchasers.map(p => (p.id === 'surveyor' ? { ...p, active: false } : p)) }
          : v)));
      }
    }
  }, [globalAutoPurchaseTimer, money, knowledge, maxPlots, veggies, handlers, setVeggies, priceFactor, onPurchaseCallback]);

  return {
    globalAutoPurchaseTimer,
    setGlobalAutoPurchaseTimer
  };
};

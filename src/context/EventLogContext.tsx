import { createContext, useContext, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * Event Log Context
 * Provides callbacks for logging game events to the event log
 * Replaces module-level global callbacks for better testability
 */

interface EventLogCallbacks {
  // Harvest event callback
  onHarvest: (veggieName: string, amount: number, expGain: number, knGain: number, isAuto: boolean) => void;
  
  // Auto-purchase event callback
  onAutoPurchase: (veggieName: string, autoPurchaserName: string, upgradeType: string, upgradeLevel: number, cost: number, currencyType: 'money' | 'knowledge') => void;
  
  // Merchant sale event callback
  onMerchantSale: (totalMoney: number, veggiesSold: Array<{ name: string; quantity: number; earnings: number }>, isAutoSell: boolean) => void;
  
  // Achievement unlock event callback
  onAchievementUnlock: (achievement: any) => void;
  
  // Reset achievements
  resetAchievements: () => void;
  
  // Clear event log
  clearEventLog: () => void;
  
  // Christmas event callbacks
  onTreeSold: (treeType: string, quantity: number, cheerEarned: number) => void;
  onTreeHarvested: (treeType: string, quality: string) => void;
  onItemCrafted: (itemName: string, quantity: number) => void;
  onUpgradePurchased: (upgradeName: string, cost: number) => void;
  onMilestoneClaimed: (milestoneName: string) => void;
  
  // Register callbacks (used by SaveLoadSystem component)
  registerCallbacks: (callbacks: Partial<EventLogCallbacks>) => void;
}

const EventLogContext = createContext<EventLogCallbacks | null>(null);

export function useEventLog() {
  const context = useContext(EventLogContext);
  if (!context) {
    throw new Error('useEventLog must be used within EventLogProvider');
  }
  return context;
}

interface EventLogProviderProps {
  children: ReactNode;
}

export function EventLogProvider({ children }: EventLogProviderProps) {
  // Store callback functions in a ref to avoid re-renders when registering
  const callbacksRef = useRef<Partial<EventLogCallbacks>>({});
  
  const registerCallbacks = useCallback((newCallbacks: Partial<EventLogCallbacks>) => {
    callbacksRef.current = { ...callbacksRef.current, ...newCallbacks };
  }, []);
  
  const onHarvest = useCallback<EventLogCallbacks['onHarvest']>(
    (veggieName, amount, expGain, knGain, isAuto) => {
      callbacksRef.current.onHarvest?.(veggieName, amount, expGain, knGain, isAuto);
    },
    []
  );
  
  const onAutoPurchase = useCallback<EventLogCallbacks['onAutoPurchase']>(
    (veggieName, autoPurchaserName, upgradeType, upgradeLevel, cost, currencyType) => {
      callbacksRef.current.onAutoPurchase?.(veggieName, autoPurchaserName, upgradeType, upgradeLevel, cost, currencyType);
    },
    []
  );
  
  const onMerchantSale = useCallback<EventLogCallbacks['onMerchantSale']>(
    (totalMoney, veggiesSold, isAutoSell) => {
      callbacksRef.current.onMerchantSale?.(totalMoney, veggiesSold, isAutoSell);
    },
    []
  );
  
  const onAchievementUnlock = useCallback<EventLogCallbacks['onAchievementUnlock']>(
    (achievement) => {
      callbacksRef.current.onAchievementUnlock?.(achievement);
    },
    []
  );
  
  const resetAchievements = useCallback(() => {
    callbacksRef.current.resetAchievements?.();
  }, []);
  
  const clearEventLog = useCallback(() => {
    callbacksRef.current.clearEventLog?.();
  }, []);
  
  const onTreeSold = useCallback<EventLogCallbacks['onTreeSold']>(
    (treeType, quantity, cheerEarned) => {
      callbacksRef.current.onTreeSold?.(treeType, quantity, cheerEarned);
    },
    []
  );
  
  const onTreeHarvested = useCallback<EventLogCallbacks['onTreeHarvested']>(
    (treeType, quality) => {
      callbacksRef.current.onTreeHarvested?.(treeType, quality);
    },
    []
  );
  
  const onItemCrafted = useCallback<EventLogCallbacks['onItemCrafted']>(
    (itemName, quantity) => {
      callbacksRef.current.onItemCrafted?.(itemName, quantity);
    },
    []
  );
  
  const onUpgradePurchased = useCallback<EventLogCallbacks['onUpgradePurchased']>(
    (upgradeName, cost) => {
      callbacksRef.current.onUpgradePurchased?.(upgradeName, cost);
    },
    []
  );
  
  const onMilestoneClaimed = useCallback<EventLogCallbacks['onMilestoneClaimed']>(
    (milestoneName) => {
      callbacksRef.current.onMilestoneClaimed?.(milestoneName);
    },
    []
  );
  
  const value: EventLogCallbacks = {
    onHarvest,
    onAutoPurchase,
    onMerchantSale,
    onAchievementUnlock,
    resetAchievements,
    clearEventLog,
    onTreeSold,
    onTreeHarvested,
    onItemCrafted,
    onUpgradePurchased,
    onMilestoneClaimed,
    registerCallbacks,
  };
  
  return (
    <EventLogContext.Provider value={value}>
      {children}
    </EventLogContext.Provider>
  );
}

/**
 * Upgrade types shared by the seasonal events (Christmas Tree Shop, Fall Pumpkin Rush).
 */

/** Currency an event's upgrades are bought with */
export type EventCurrency = 'cheer' | 'candyCorn';

/**
 * Event-specific upgrade categories
 */
export type EventUpgradeCategory = 'farming' | 'workshop' | 'shopfront';

/**
 * Individual event upgrade
 */
export interface EventUpgrade {
  id: string;
  name: string;
  description: string;
  category: EventUpgradeCategory;
  icon: string;
  cost: number; // Price in the event's currency
  owned: boolean;
  effect?: string; // Human-readable effect description
  
  // Upgrade-specific properties
  speedBonus?: number;      // e.g., +25% for Fertilized Soil
  valueBonus?: number;      // e.g., +10% for Garland Station
  procChance?: number;      // e.g., 10% for Evergreen Essence
  passiveIncome?: number;   // Currency per second (Golden Bell Counter, Hayride)
  multiplier?: number;      // e.g., 3x for Star Forge
  
  // Repeatable upgrade properties
  repeatable?: boolean;     // Can be purchased multiple times
  level?: number;           // Current level (for repeatable upgrades)
  maxLevel?: number;        // Maximum level (for repeatable upgrades)
  costScaling?: number;     // Cost multiplier per level (e.g., 1.5x)

  // Prerequisite
  requires?: string;             // Id of an upgrade that must be owned first
  hiddenUntilRequired?: boolean; // Hide this upgrade, rather than show it locked, until then
}

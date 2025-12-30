/**
 * Event Log Utility Functions
 * 
 * Helper functions for creating, formatting, and managing event log entries.
 */

import type { 
  EventLogEntry, 
  EventCategory, 
  EventPriority, 
  EventTimestamp,
  EventMetadata 
} from '../types/game';
import { ICON_AUTOMATION, ICON_BEE, ICON_CANNING, ICON_GROWING, ICON_HARVEST, ICON_MILESTONE, UPGRADE_MERCHANT, WEATHER_CLEAR } from '../config/assetPaths';

/**
 * Generate a unique ID for an event
 */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an event timestamp from game time
 */
export function createEventTimestamp(
  day: number,
  totalDaysElapsed: number
): EventTimestamp {
  return {
    year: Math.floor(totalDaysElapsed / 365) + 1,
    day: day,
    totalDays: totalDaysElapsed
  };
}

/**
 * Format timestamp for display (e.g., "Year 2, Day 145")
 */
export function formatEventTimestamp(timestamp: EventTimestamp): string {
  return `Year ${timestamp.year}, Day ${timestamp.day}`;
}

/**
 * Format timestamp for compact display (e.g., "Y2 D145")
 */
export function formatEventTimestampCompact(timestamp: EventTimestamp): string {
  return `Y${timestamp.year} D${timestamp.day}`;
}

/**
 * Create a new event log entry
 */
export function createEventLogEntry(
  category: EventCategory,
  message: string,
  day: number,
  totalDaysElapsed: number,
  options?: {
    priority?: EventPriority;
    details?: string;
    metadata?: EventMetadata;
    icon?: string;
  }
): EventLogEntry {
  return {
    id: generateEventId(),
    timestamp: createEventTimestamp(day, totalDaysElapsed),
    category,
    priority: options?.priority || 'normal',
    message,
    details: options?.details,
    metadata: options?.metadata,
    icon: options?.icon
  };
}

/**
 * Get icon for event category
 */
export function getCategoryIcon(category: EventCategory): string {
  const icons: Record<EventCategory, string> = {
    weather: WEATHER_CLEAR,
    growth: ICON_GROWING,
    harvest: ICON_HARVEST,
    'auto-purchase': ICON_AUTOMATION,
    merchant: UPGRADE_MERCHANT,
    canning: ICON_CANNING,
    milestone: ICON_MILESTONE,
    bees: ICON_BEE,
    christmas: '🎄', // Using emoji for christmas tree
    upgrade: '⬆️' // Using emoji for upgrades
  };
  return icons[category];
}

/**
 * Get color class for event priority
 */
export function getPriorityColor(priority: EventPriority): string {
  const colors: Record<EventPriority, string> = {
    critical: '#dc3545',  // Red
    important: '#ffc107', // Yellow
    normal: '#ffffff',    // White
    minor: '#9e9e9e'      // Gray
  };
  return colors[priority];
}

/**
 * Get color class for event category
 */
export function getCategoryColor(category: EventCategory): string {
  const colors: Record<EventCategory, string> = {
    weather: '#2196F3',     // Blue
    growth: '#4CAF50',      // Green
    harvest: '#FF9800',     // Orange
    'auto-purchase': '#9C27B0', // Purple
    merchant: '#FFEB3B',    // Yellow
    canning: '#FF5722',     // Deep Orange
    milestone: '#E91E63',   // Pink
    bees: '#FFA500',        // Orange/Amber (bee/honey color)
    christmas: '#C41E3A',   // Christmas Red
    upgrade: '#00BCD4'      // Cyan (upgrade color)
  };
  return colors[category];
}

/**
 * Format money value for display
 */
export function formatMoney(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

/**
 * Format knowledge value for display
 */
export function formatKnowledge(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K Kn`;
  }
  return `${amount.toFixed(0)} Kn`;
}

/**
 * Format experience value for display
 */
export function formatExperience(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K exp`;
  }
  return `${amount.toFixed(0)} exp`;
}

// ============================================================================
// TYPE-SAFE EVENT METADATA BUILDERS
// ============================================================================

export interface EventOptions {
  priority: EventPriority;
  details: string;
  icon: string;
  metadata: EventMetadata;
}

/**
 * Build harvest event options
 */
export function buildHarvestEvent(
  veggieName: string,
  amount: number,
  expGain: number,
  knGain: number,
  isAuto: boolean,
  icons: { automation: string; harvest: string }
): EventOptions {
  return {
    priority: 'normal',
    details: isAuto
      ? `Auto-harvested ${amount} × ${veggieName} (+${expGain.toFixed(1)} exp, +${knGain.toFixed(1)} knowledge)`
      : `Manually harvested ${amount} × ${veggieName} (+${expGain.toFixed(1)} exp, +${knGain.toFixed(1)} knowledge)`,
    icon: isAuto ? icons.automation : icons.harvest,
    metadata: {
      veggieName,
      amount,
      moneyGained: 0,
      knowledgeGained: knGain,
      experienceGained: expGain
    }
  };
}

/**
 * Build auto-purchase event options
 */
export function buildAutoPurchaseEvent(
  veggieName: string,
  autoPurchaserName: string,
  upgradeType: string,
  upgradeLevel: number,
  cost: number,
  currencyType: 'money' | 'knowledge',
  icon: string
): EventOptions {
  const upgradeNames: Record<string, string> = {
    fertilizer: 'Fertilizer',
    betterSeeds: 'Better Seeds',
    harvesterSpeed: 'Harvester Speed',
    additionalPlot: 'Additional Plot'
  };
  const costDisplay = currencyType === 'money' ? `$${cost}` : `${cost} knowledge`;

  return {
    priority: 'minor',
    details: `${veggieName} ${upgradeNames[upgradeType] || upgradeType} upgraded to level ${upgradeLevel} (${costDisplay})`,
    icon,
    metadata: {
      veggieName,
      autoPurchaserName,
      upgradeType,
      upgradeLevel,
      cost
    }
  };
}

/**
 * Build merchant sale event options
 */
export function buildMerchantSaleEvent(
  totalMoney: number,
  veggiesSold: Array<{ name: string; quantity: number; earnings: number }>,
  isAutoSell: boolean,
  icons: { merchant: string; money: string }
): EventOptions {
  const veggiesList = veggiesSold.map(v => `${v.quantity} ${v.name}`).join(', ');

  return {
    priority: 'important',
    details: `Sold ${veggiesList} for $${totalMoney}`,
    icon: isAutoSell ? icons.merchant : icons.money,
    metadata: {
      moneyGained: totalMoney,
      veggiesSold
    }
  };
}

/**
 * Build achievement unlock event options
 */
export function buildAchievementEvent(
  achievement: { name: string; description: string; reward?: { money?: number; knowledge?: number } | null }
): EventOptions {
  const rewardText = achievement.reward
    ? (() => {
        const parts: string[] = [];
        if (achievement.reward.money) parts.push(`+$${achievement.reward.money}`);
        if (achievement.reward.knowledge) parts.push(`+${achievement.reward.knowledge} knowledge`);
        return parts.length > 0 ? ` (${parts.join(', ')})` : '';
      })()
    : '';

  return {
    priority: 'important',
    details: `${achievement.description}${rewardText}`,
    icon: '🏆',
    metadata: {}
  };
}

/**
 * Build canning start event options
 */
export function buildCanningStartEvent(
  recipeName: string,
  ingredients: string,
  processingTime: number,
  isAuto: boolean,
  icons: { automation: string; canning: string }
): EventOptions {
  return {
    priority: 'minor',
    details: `Using ${ingredients} (${processingTime}s)`,
    icon: isAuto ? icons.automation : icons.canning,
    metadata: {
      recipeName,
      processingTime
    }
  };
}

/**
 * Build canning complete event options
 */
export function buildCanningCompleteEvent(
  recipeName: string,
  moneyEarned: number,
  knowledgeEarned: number,
  itemsProduced: number,
  isAuto: boolean
): EventOptions {
  const bonusText = itemsProduced > 1 ? ` (${itemsProduced} items!)` : '';

  return {
    priority: 'normal',
    details: `Earned $${moneyEarned.toFixed(2)} and ${knowledgeEarned} knowledge${bonusText}`,
    icon: isAuto ? '✅' : '🎉',
    metadata: {
      recipeName,
      moneyGained: moneyEarned,
      knowledgeGained: knowledgeEarned
    }
  };
}

/**
 * Build Christmas tree sold event options
 */
export function buildTreeSoldEvent(
  treeType: string,
  quantity: number,
  cheerEarned: number
): EventOptions {
  return {
    priority: 'normal',
    details: `Earned ${cheerEarned} Holiday Cheer`,
    icon: '🎄',
    metadata: { treeType, quantity, cheerEarned }
  };
}

/**
 * Build Christmas tree harvested event options
 */
export function buildTreeHarvestedEvent(treeType: string, quality: string): EventOptions {
  return {
    priority: 'minor',
    details: `Quality: ${quality}`,
    icon: '🌲',
    metadata: { treeType, quality }
  };
}

/**
 * Build Christmas item crafted event options
 */
export function buildItemCraftedEvent(itemName: string, quantity: number): EventOptions {
  return {
    priority: 'minor',
    details: `Created ${quantity} ${itemName}`,
    icon: '🎨',
    metadata: { itemName, quantity }
  };
}

/**
 * Build Christmas upgrade purchased event options
 */
export function buildUpgradePurchasedEvent(upgradeName: string, cost: number): EventOptions {
  return {
    priority: 'normal',
    details: `Cost: ${cost} Holiday Cheer`,
    icon: '⭐',
    metadata: { upgradeName, cost }
  };
}

/**
 * Build milestone claimed event options
 */
export function buildMilestoneClaimedEvent(milestoneName: string): EventOptions {
  return {
    priority: 'important',
    details: milestoneName,
    icon: '🎁',
    metadata: { milestoneName }
  };
}

/**
 * Trim event log to maximum entries (keeps most recent)
 */
export function trimEventLog(
  entries: EventLogEntry[],
  maxEntries: number
): EventLogEntry[] {
  if (entries.length <= maxEntries) {
    return entries;
  }
  return entries.slice(-maxEntries);
}

/**
 * Filter events by category
 */
export function filterEventsByCategory(
  entries: EventLogEntry[],
  categories: EventCategory[]
): EventLogEntry[] {
  if (categories.length === 0) {
    return entries;
  }
  return entries.filter(entry => categories.includes(entry.category));
}

/**
 * Filter events by search term (searches message and details)
 */
export function filterEventsBySearch(
  entries: EventLogEntry[],
  searchTerm: string
): EventLogEntry[] {
  if (!searchTerm || searchTerm.trim() === '') {
    return entries;
  }
  
  const term = searchTerm.toLowerCase();
  return entries.filter(entry => 
    entry.message.toLowerCase().includes(term) ||
    (entry.details && entry.details.toLowerCase().includes(term)) ||
    (entry.metadata?.veggieName && entry.metadata.veggieName.toLowerCase().includes(term))
  );
}

/**
 * Sort events by timestamp (newest first by default)
 */
export function sortEventsByTimestamp(
  entries: EventLogEntry[],
  ascending: boolean = false
): EventLogEntry[] {
  return [...entries].sort((a, b) => {
    const diff = a.timestamp.totalDays - b.timestamp.totalDays;
    return ascending ? diff : -diff;
  });
}

/**
 * Count events by category
 */
export function countEventsByCategory(
  entries: EventLogEntry[]
): Record<EventCategory, number> {
  const counts: Record<EventCategory, number> = {
    weather: 0,
    growth: 0,
    harvest: 0,
    'auto-purchase': 0,
    merchant: 0,
    canning: 0,
    milestone: 0,
    bees: 0,
    christmas: 0,
    upgrade: 0
  };
  
  entries.forEach(entry => {
    counts[entry.category]++;
  });
  
  return counts;
}

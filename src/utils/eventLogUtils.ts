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
import { ICON_AUTOMATION, ICON_CANNING, ICON_GROWING, ICON_HARVEST, ICON_MILESTONE, ICON_UPGRADE, UPGRADE_MERCHANT, WEATHER_CLEAR } from '../config/assetPaths';

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
  farmTier: number,
  day: number,
  totalDaysElapsed: number
): EventTimestamp {
  return {
    year: farmTier,
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
  farmTier: number,
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
    timestamp: createEventTimestamp(farmTier, day, totalDaysElapsed),
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
    upgrade: ICON_UPGRADE,
    milestone: ICON_MILESTONE
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
    upgrade: '#00BCD4',     // Cyan
    milestone: '#E91E63'    // Pink
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
    upgrade: 0,
    milestone: 0
  };
  
  entries.forEach(entry => {
    counts[entry.category]++;
  });
  
  return counts;
}

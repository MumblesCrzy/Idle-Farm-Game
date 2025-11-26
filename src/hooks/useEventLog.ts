/**
 * Event Log Hook
 * 
 * Manages event log state with methods for adding, filtering, and clearing events.
 * Automatically trims to max entries and handles persistence.
 */

import { useState, useCallback, useMemo } from 'react';
import type { 
  EventLogEntry, 
  EventLogState, 
  EventCategory,
  EventPriority,
  EventMetadata 
} from '../types/game';
import { 
  createEventLogEntry, 
  trimEventLog,
  filterEventsByCategory,
  filterEventsBySearch,
  sortEventsByTimestamp,
  countEventsByCategory
} from '../utils/eventLogUtils';

interface UseEventLogOptions {
  maxEntries?: number;
  initialState?: EventLogState;
  farmTier: number;
  day: number;
  totalDaysElapsed: number;
}

interface UseEventLogReturn {
  // State
  entries: EventLogEntry[];
  unreadCount: number;
  
  // Actions
  addEvent: (
    category: EventCategory,
    message: string,
    options?: {
      priority?: EventPriority;
      details?: string;
      metadata?: EventMetadata;
      icon?: string;
    }
  ) => void;
  
  clearEvents: () => void;
  clearOldEvents: (daysToKeep: number) => void;
  markAllAsRead: () => void;
  
  // Filtering (for UI components to use)
  getFilteredEvents: (
    categories?: EventCategory[],
    searchTerm?: string
  ) => EventLogEntry[];
  
  getCategoryCounts: () => Record<EventCategory, number>;
  
  // Get unread count for enabled categories only
  getUnreadCountForCategories: (enabledCategories: EventCategory[]) => number;
  
  // Export full state for saving
  getState: () => EventLogState;
}

/**
 * Hook for managing event log state
 */
export function useEventLog({
  maxEntries = 100,
  initialState,
  farmTier,
  day,
  totalDaysElapsed
}: UseEventLogOptions): UseEventLogReturn {
  
  // Initialize state
  const [eventLogState, setEventLogState] = useState<EventLogState>(() => ({
    entries: initialState?.entries || [],
    maxEntries: initialState?.maxEntries || maxEntries,
    unreadCount: initialState?.unreadCount || 0,
    lastReadId: initialState?.lastReadId
  }));

  /**
   * Add a new event to the log
   */
  const addEvent = useCallback((
    category: EventCategory,
    message: string,
    options?: {
      priority?: EventPriority;
      details?: string;
      metadata?: EventMetadata;
      icon?: string;
    }
  ) => {
    const newEvent = createEventLogEntry(
      category,
      message,
      day,
      totalDaysElapsed,
      options
    );

    setEventLogState(prev => {
      // Add new event and trim if necessary
      const updatedEntries = trimEventLog(
        [...prev.entries, newEvent],
        prev.maxEntries
      );

      return {
        ...prev,
        entries: updatedEntries,
        unreadCount: prev.unreadCount + 1
      };
    });
  }, [farmTier, day, totalDaysElapsed]);

  /**
   * Clear all events
   */
  const clearEvents = useCallback(() => {
    setEventLogState(prev => ({
      ...prev,
      entries: [],
      unreadCount: 0,
      lastReadId: undefined
    }));
  }, []);

  /**
   * Clear events older than X days
   */
  const clearOldEvents = useCallback((daysToKeep: number) => {
    setEventLogState(prev => {
      const cutoffDay = totalDaysElapsed - daysToKeep;
      const filteredEntries = prev.entries.filter(
        entry => entry.timestamp.totalDays >= cutoffDay
      );

      return {
        ...prev,
        entries: filteredEntries
      };
    });
  }, [totalDaysElapsed]);

  /**
   * Mark all events as read
   */
  const markAllAsRead = useCallback(() => {
    setEventLogState(prev => {
      const lastEntry = prev.entries[prev.entries.length - 1];
      return {
        ...prev,
        unreadCount: 0,
        lastReadId: lastEntry?.id
      };
    });
  }, []);

  /**
   * Get filtered events based on criteria
   */
  const getFilteredEvents = useCallback((
    categories?: EventCategory[],
    searchTerm?: string
  ): EventLogEntry[] => {
    let filtered = eventLogState.entries;

    // Filter by categories if specified
    if (categories && categories.length > 0) {
      filtered = filterEventsByCategory(filtered, categories);
    }

    // Filter by search term if specified
    if (searchTerm && searchTerm.trim() !== '') {
      filtered = filterEventsBySearch(filtered, searchTerm);
    }

    // Sort by timestamp (newest first)
    return sortEventsByTimestamp(filtered, false);
  }, [eventLogState.entries]);

  /**
   * Get count of events by category
   */
  const getCategoryCounts = useCallback(() => {
    return countEventsByCategory(eventLogState.entries);
  }, [eventLogState.entries]);

  /**
   * Get unread count for only the enabled categories
   */
  const getUnreadCountForCategories = useCallback((enabledCategories: EventCategory[]): number => {
    if (enabledCategories.length === 0) {
      return 0; // If no categories enabled, no unread count
    }
    
    // Find the last read entry
    const lastReadIndex = eventLogState.lastReadId
      ? eventLogState.entries.findIndex(e => e.id === eventLogState.lastReadId)
      : -1;
    
    // Count unread entries that match enabled categories
    const unreadEntries = lastReadIndex >= 0
      ? eventLogState.entries.slice(lastReadIndex + 1)
      : eventLogState.entries;
    
    return unreadEntries.filter(entry => 
      enabledCategories.includes(entry.category)
    ).length;
  }, [eventLogState.entries, eventLogState.lastReadId]);

  /**
   * Get current state for persistence
   */
  const getState = useCallback((): EventLogState => {
    return eventLogState;
  }, [eventLogState]);

  return {
    entries: eventLogState.entries,
    unreadCount: eventLogState.unreadCount,
    addEvent,
    clearEvents,
    clearOldEvents,
    markAllAsRead,
    getFilteredEvents,
    getCategoryCounts,
    getUnreadCountForCategories,
    getState
  };
}

/**
 * Helper hook for managing event log filter state in UI components
 */
export function useEventLogFilter(initialCategories?: EventCategory[]) {
  // Start with all categories selected by default or use provided initial categories
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>(
    initialCategories || [
      'weather',
      'growth',
      'harvest',
      'auto-purchase',
      'merchant',
      'canning',
      'upgrade',
      'milestone',
      'bees',
      'christmas'
    ]
  );
  const [searchTerm, setSearchTerm] = useState('');

  const toggleCategory = useCallback((category: EventCategory) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategories([]);
    setSearchTerm('');
  }, []);

  const hasActiveFilters = useMemo(() => {
    return selectedCategories.length > 0 || searchTerm.trim() !== '';
  }, [selectedCategories, searchTerm]);

  return {
    selectedCategories,
    searchTerm,
    setSearchTerm,
    toggleCategory,
    clearFilters,
    hasActiveFilters
  };
}

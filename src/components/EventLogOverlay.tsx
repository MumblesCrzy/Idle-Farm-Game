/**
 * Event Log Overlay Component
 * 
 * Displays event log in a slide-in panel on the right side of the screen.
 * Semi-transparent to allow interaction with the main game area.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { EventLogEntry, EventCategory } from '../types/game';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useEventLogFilter } from '../hooks/useEventLog';
import { ICON_SCROLL, ICON_DETAIL } from '../config/assetPaths';
import {
  formatEventTimestamp,
  formatEventTimestampCompact,
  getCategoryIcon,
  getCategoryColor,
  getPriorityColor,
  formatMoney,
  formatKnowledge,
  formatExperience
} from '../utils/eventLogUtils';
import styles from './EventLogOverlay.module.css';

interface EventLogOverlayProps {
  visible: boolean;
  onClose: () => void;
  entries: EventLogEntry[];
  unreadCount: number;
  onMarkAsRead: () => void;
  onClearAll: () => void;
  getFilteredEvents: (categories?: EventCategory[], searchTerm?: string) => EventLogEntry[];
  getCategoryCounts: () => Record<EventCategory, number>;
}

const EventLogOverlay: React.FC<EventLogOverlayProps> = ({
  visible,
  onClose,
  entries,
  unreadCount,
  onMarkAsRead,
  onClearAll,
  getFilteredEvents,
  getCategoryCounts
}) => {
  const { containerRef, handleTabKey } = useFocusTrap(visible, onClose);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logListRef = useRef<HTMLDivElement>(null);
  const [compactMode, setCompactMode] = useState(false);
  
  const {
    selectedCategories,
    searchTerm,
    setSearchTerm,
    toggleCategory,
    clearFilters,
    hasActiveFilters
  } = useEventLogFilter();

  // Get filtered events
  const filteredEntries = getFilteredEvents(
    selectedCategories.length > 0 ? selectedCategories : undefined,
    searchTerm
  );

  // Get category counts
  const categoryCounts = getCategoryCounts();

  // Smart auto-scroll: only scroll to top if user is already near the top
  useEffect(() => {
    if (logListRef.current) {
      const isNearTop = logListRef.current.scrollTop < 100; // Within 100px of top
      if (isNearTop) {
        logListRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [filteredEntries.length]);

  // Mark as read when opening
  useEffect(() => {
    if (visible && unreadCount > 0) {
      onMarkAsRead();
    }
  }, [visible, unreadCount, onMarkAsRead]);

  if (!visible) return null;

  const categories: Array<{ id: EventCategory; label: string }> = [
    { id: 'weather', label: 'Weather' },
    { id: 'growth', label: 'Growth' },
    { id: 'harvest', label: 'Harvest' },
    { id: 'auto-purchase', label: 'Auto-Buy' },
    { id: 'merchant', label: 'Sales' },
    { id: 'canning', label: 'Canning' },
    { id: 'upgrade', label: 'Upgrades' },
    { id: 'milestone', label: 'Milestones' }
  ];

  return (
    <div className={styles.overlay}>
      <div 
        className={styles.panel}
        ref={containerRef}
        onKeyDown={handleTabKey}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-log-title"
      >
        {/* Header */}
        <div className={styles.header}>
          <h3 id="event-log-title" className={styles.title}>
            <img src={ICON_SCROLL} alt="" style={{ width: '20px', height: '20px', verticalAlign: 'middle', marginRight: '6px' }} />
            Event Log
          </h3>
          <div className={styles.headerControls}>
            <button
              onClick={() => setCompactMode(!compactMode)}
              className={styles.compactButton}
              title={compactMode ? "Detailed view" : "Compact view"}
              aria-label={compactMode ? "Switch to detailed view" : "Switch to compact view"}
            >
              <img src={ICON_DETAIL} alt="" style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} />
            </button>
            <button
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Close event log (press Escape)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className={styles.filterBar}>
          <div className={styles.categoryFilters}>
            {categories.map(cat => {
              const count = categoryCounts[cat.id];
              const isActive = selectedCategories.includes(cat.id);
              const categoryIcon = getCategoryIcon(cat.id);
              const isImageIcon = typeof categoryIcon === 'string' && (categoryIcon.startsWith('./') || categoryIcon.startsWith('/'));
              
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`${styles.categoryButton} ${isActive ? styles.categoryButtonActive : ''}`}
                  style={{
                    borderColor: isActive ? getCategoryColor(cat.id) : undefined,
                    backgroundColor: isActive ? `${getCategoryColor(cat.id)}20` : undefined
                  }}
                  aria-label={`Filter by ${cat.label} (${count} events)`}
                  aria-pressed={isActive}
                >
                  {isImageIcon ? (
                    <img
                      src={categoryIcon}
                      alt={cat.label}
                      style={{ 
                        width: '16px', 
                        height: '16px', 
                        objectFit: 'contain',
                        display: 'inline-block',
                        verticalAlign: 'middle'
                      }}
                    />
                  ) : (
                    <span>{categoryIcon}</span>
                  )}
                  <span className={styles.categoryLabel}>{cat.label}</span>
                  {count > 0 && (
                    <span className={styles.categoryCount}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className={styles.searchBar}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search events..."
            className={styles.searchInput}
            aria-label="Search events"
          />
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className={styles.clearFiltersButton}
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <button
            onClick={onClearAll}
            className={styles.clearButton}
            aria-label="Clear all events"
          >
            Clear All
          </button>
        </div>

        {/* Event List */}
        <div className={styles.eventList} ref={logListRef} role="log" aria-live="polite">
          {filteredEntries.length === 0 ? (
            <div className={styles.emptyState}>
              {hasActiveFilters ? (
                <>
                  <p>No events match your filters</p>
                  <button onClick={clearFilters} className={styles.clearFiltersButton}>
                    Clear Filters
                  </button>
                </>
              ) : (
                <p>No events yet. Events will appear here as you play!</p>
              )}
            </div>
          ) : (
            <>
              {filteredEntries.map((entry) => {
                const icon = entry.icon || getCategoryIcon(entry.category);
                // Check if icon is an image path (starts with ./ or /)
                const isImageIcon = typeof icon === 'string' && (icon.startsWith('./') || icon.startsWith('/'));
                
                return (
                <div
                  key={entry.id}
                  className={`${styles.eventEntry} ${compactMode ? styles.eventEntryCompact : ''}`}
                  style={{ borderLeftColor: getCategoryColor(entry.category) }}
                >
                  <div className={styles.eventHeader}>
                    {isImageIcon ? (
                      <img
                        src={icon}
                        alt={entry.category}
                        style={{ 
                          width: '16px', 
                          height: '16px', 
                          objectFit: 'contain',
                          display: 'inline-block',
                          verticalAlign: 'middle'
                        }}
                      />
                    ) : (
                      <span
                        className={styles.eventIcon}
                        role="img"
                        aria-label={entry.category}
                      >
                        {icon}
                      </span>
                    )}
                    <span className={styles.eventTimestamp}>
                      {compactMode 
                        ? formatEventTimestampCompact(entry.timestamp)
                        : formatEventTimestamp(entry.timestamp)
                      }
                    </span>
                    <span
                      className={styles.eventCategory}
                      style={{ backgroundColor: getCategoryColor(entry.category) }}
                    >
                      {entry.category}
                    </span>
                  </div>
                  <div
                    className={styles.eventMessage}
                    style={{ color: getPriorityColor(entry.priority) }}
                  >
                    {entry.message}
                  </div>
                  {!compactMode && entry.details && (
                    <div className={styles.eventDetails}>
                      {entry.details}
                    </div>
                  )}
                  {!compactMode && entry.metadata && (
                    <div className={styles.eventMetadata}>
                      {entry.metadata.moneyGained && entry.metadata.moneyGained > 0 && (
                        <span className={styles.metadataItem}>
                          💰 {formatMoney(entry.metadata.moneyGained)}
                        </span>
                      )}
                      {entry.metadata.knowledgeGained && entry.metadata.knowledgeGained > 0 && (
                        <span className={styles.metadataItem}>
                          📚 {formatKnowledge(entry.metadata.knowledgeGained)}
                        </span>
                      )}
                      {entry.metadata.experienceGained && entry.metadata.experienceGained > 0 && (
                        <span className={styles.metadataItem}>
                          ⭐ {formatExperience(entry.metadata.experienceGained)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
              })}
              <div ref={logEndRef} />
            </>
          )}
        </div>

        {/* Footer Stats */}
        <div className={styles.footer}>
          <span className={styles.footerStat}>
            {filteredEntries.length} / {entries.length} events
          </span>
          {hasActiveFilters && (
            <span className={styles.footerStat}>
              (filtered)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventLogOverlay;

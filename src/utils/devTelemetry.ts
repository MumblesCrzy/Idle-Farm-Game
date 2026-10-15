/**
 * Dev-only Telemetry & Key Counters
 *
 * Structured logging for internal/developer use to detect anomalies and
 * guide balance decisions.  Events are written
 * to the browser console (as grouped, structured JSON) and can optionally
 * be exported to CSV for offline analysis.
 *
 * Gated behind the `devTelemetry` feature flag — no-ops in production or
 * when the flag is disabled.
 *
 * Usage:
 *   import { devTelemetry } from './utils/devTelemetry';
 *   devTelemetry.emit('achievement_unlocked', { achievementId: 'first_harvest' });
 */

import { featureFlags } from './featureFlags';

// ─── Event type definitions ───────────────────────────────────────────

export interface AchievementUnlockedPayload {
  achievementId: string;
}

export interface OfflineCatchupPayload {
  offlineMsRequested: number;
  offlineMsApplied: number;
}

export interface TelemetryEventMap {
  achievement_unlocked: AchievementUnlockedPayload;
  offline_catchup: OfflineCatchupPayload;
}

export type TelemetryEventName = keyof TelemetryEventMap;

interface StoredEvent<K extends TelemetryEventName = TelemetryEventName> {
  event: K;
  time: number;
  payload: TelemetryEventMap[K];
}

// ─── Telemetry manager ────────────────────────────────────────────────

const STORAGE_KEY = 'farm_idle_telemetry_log';
const MAX_STORED_EVENTS = 500;

class DevTelemetryManager {
  private events: StoredEvent[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // ── Core ──

  /** Returns true when telemetry should actually fire. */
  private get enabled(): boolean {
    return featureFlags.isEnabled('devTelemetry');
  }

  /**
   * Emit a telemetry event.  If the `devTelemetry` feature flag is off this
   * is a silent no-op (zero cost path).
   */
  emit<K extends TelemetryEventName>(event: K, payload: TelemetryEventMap[K]): void {
    if (!this.enabled) return;

    const entry: StoredEvent<K> = { event, time: Date.now(), payload };
    this.events.push(entry);

    // Keep the buffer bounded
    if (this.events.length > MAX_STORED_EVENTS) {
      this.events = this.events.slice(-MAX_STORED_EVENTS);
    }

    this.persistToStorage();
    this.logToConsole(entry);
  }

  // ── Console output ──

  private logToConsole(entry: StoredEvent): void {
    const label = `[Telemetry] ${entry.event}`;
    const timestamp = new Date(entry.time).toLocaleTimeString();

    if (typeof console.groupCollapsed === 'function') {
      console.groupCollapsed(`%c${label} %c${timestamp}`, 'color:#6f42c1;font-weight:bold', 'color:#999;font-weight:normal');
      console.table(entry.payload);
      console.groupEnd();
    } else {
      console.log(label, timestamp, entry.payload);
    }
  }

  // ── Persistence ──

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.events = parsed.slice(-MAX_STORED_EVENTS);
        }
      }
    } catch {
      // Corrupted data — start fresh
      this.events = [];
    }
  }

  private persistToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
    } catch {
      // Storage full — trim aggressively
      this.events = this.events.slice(-100);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events)); } catch { /* give up */ }
    }
  }

  // ── Export ──

  /** Export the stored event log as a CSV string. */
  exportCSV(): string {
    const rows = ['event,time,payload'];
    for (const e of this.events) {
      const payloadStr = JSON.stringify(e.payload).replace(/"/g, '""');
      rows.push(`${e.event},${new Date(e.time).toISOString()},"${payloadStr}"`);
    }
    return rows.join('\n');
  }

  /** Trigger a CSV download in the browser. */
  downloadCSV(): void {
    const csv = this.exportCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farm_telemetry_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Print a summary of aggregated stats to the console. */
  printDashboard(): void {
    console.group('%c[Telemetry Dashboard]', 'color:#6f42c1;font-weight:bold;font-size:14px');
    console.log('Total events:', this.events.length);
    console.groupEnd();
  }

  /** Clear all stored telemetry events. */
  clear(): void {
    this.events = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Return the raw event list (read-only snapshot). */
  getEvents(): ReadonlyArray<StoredEvent> {
    return [...this.events];
  }
}

// Singleton
export const devTelemetry = new DevTelemetryManager();

// Expose on window for easy console access in dev
if (import.meta.env.DEV) {
  window.__telemetry = devTelemetry;
}

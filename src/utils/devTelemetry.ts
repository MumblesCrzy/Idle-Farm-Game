/**
 * Dev-only Telemetry & Key Counters
 *
 * Structured logging for internal/developer use to help tune the prestige
 * system, detect anomalies, and guide balance decisions.  Events are written
 * to the browser console (as grouped, structured JSON) and can optionally
 * be exported to CSV for offline analysis.
 *
 * Gated behind the `devTelemetry` feature flag — no-ops in production or
 * when the flag is disabled.
 *
 * Usage:
 *   import { devTelemetry } from './utils/devTelemetry';
 *   devTelemetry.emit('lifetime_complete', { lifetimeCount: 3, wisdomGained: 500 });
 */

import { featureFlags } from './featureFlags';

// ─── Event type definitions ───────────────────────────────────────────

export interface LifetimeCompletePayload {
  lifetimeCount: number;
  wisdomGained: number;
  totalMoneyEarned: number;
  totalKnowledgeGained: number;
  maxFarmTierReached: number;
  durationDays: number;
}

export interface WisdomAwardedPayload {
  amount: number;
  formulaComponents: {
    moneyFactor: number;
    knowledgeFactor: number;
    tierFactor: number;
    wisdomBonus: number;
  };
}

export interface ShopPurchasePayload {
  upgradeId: string;
  levelBefore: number;
  levelAfter: number;
  cost: number;
}

export interface AchievementUnlockedPayload {
  achievementId: string;
  lifetimeWhenUnlocked: number;
}

export interface OfflineCatchupPayload {
  offlineMsRequested: number;
  offlineMsApplied: number;
  cappedToLifetime: boolean;
}

export interface TelemetryEventMap {
  lifetime_complete: LifetimeCompletePayload;
  wisdom_awarded: WisdomAwardedPayload;
  shop_purchase: ShopPurchasePayload;
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

  // ── Aggregates (dev dashboard helpers) ──

  /** Average wisdom earned per lifetime. */
  getAvgWisdomPerLifetime(): number {
    const completions = this.events.filter(e => e.event === 'lifetime_complete') as StoredEvent<'lifetime_complete'>[];
    if (completions.length === 0) return 0;
    const total = completions.reduce((sum, e) => sum + e.payload.wisdomGained, 0);
    return Math.round(total / completions.length);
  }

  /** Distribution of lifetime durations (days). */
  getLifetimeLengthDistribution(): Record<string, number> {
    const completions = this.events.filter(e => e.event === 'lifetime_complete') as StoredEvent<'lifetime_complete'>[];
    const buckets: Record<string, number> = {};
    for (const e of completions) {
      const years = Math.floor(e.payload.durationDays / 365);
      const label = `${years}y`;
      buckets[label] = (buckets[label] || 0) + 1;
    }
    return buckets;
  }

  /** Per-upgrade purchase counts. */
  getShopPurchaseRateByUpgrade(): Record<string, number> {
    const purchases = this.events.filter(e => e.event === 'shop_purchase') as StoredEvent<'shop_purchase'>[];
    const counts: Record<string, number> = {};
    for (const e of purchases) {
      counts[e.payload.upgradeId] = (counts[e.payload.upgradeId] || 0) + 1;
    }
    return counts;
  }

  /** Fraction of offline catch-ups that were capped by lifetime end. */
  getOfflineCatchupCappedRate(): number {
    const catchups = this.events.filter(e => e.event === 'offline_catchup') as StoredEvent<'offline_catchup'>[];
    if (catchups.length === 0) return 0;
    const capped = catchups.filter(e => e.payload.cappedToLifetime).length;
    return capped / catchups.length;
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
    console.log('Avg wisdom / lifetime:', this.getAvgWisdomPerLifetime());
    console.log('Lifetime length distribution:', this.getLifetimeLengthDistribution());
    console.log('Shop purchase rate by upgrade:', this.getShopPurchaseRateByUpgrade());
    console.log('Offline catchup capped rate:', `${(this.getOfflineCatchupCappedRate() * 100).toFixed(1)}%`);
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

/** One game step: one in-game day, one growth tick, one harvester tick */
export const GAME_STEP_MS = 1000;

/** How often the clock checks whether a step is due */
const POLL_MS = 250;

/** After a stall, at most this many missed steps run at once; the rest are dropped */
export const MAX_CATCH_UP_STEPS = 5;

export interface GameClockSubscriber {
  /** Read on every step, so the latest callback always runs */
  callbackRef: { readonly current: () => void };
  /** Run on every Nth step */
  every: number;
  /** Lower runs first within a step */
  order: number;
}

/**
 * The single game clock. Every system that advances with time subscribes here,
 * so one step runs all of them in the same task and React renders once per step.
 *
 * Steps pause while the tab is hidden; the offline catch-up covers that time.
 */
export class GameClock {
  private subscribers: GameClockSubscriber[] = [];
  private stepCount = 0;
  private lastStepAt = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  subscribe(subscriber: GameClockSubscriber): () => void {
    // Keep subscribers sorted by order; equal orders keep subscription order
    const index = this.subscribers.findIndex(s => s.order > subscriber.order);
    if (index === -1) {
      this.subscribers.push(subscriber);
    } else {
      this.subscribers.splice(index, 0, subscriber);
    }
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== subscriber);
    };
  }

  start(): void {
    if (this.intervalId !== null) return;
    this.lastStepAt = Date.now();
    this.intervalId = setInterval(this.poll, POLL_MS);
  }

  stop(): void {
    if (this.intervalId === null) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  /** Runs one step immediately. Called by the poller, and directly by tests. */
  step(): void {
    this.stepCount++;
    for (const subscriber of [...this.subscribers]) {
      if (this.stepCount % subscriber.every !== 0) continue;
      try {
        subscriber.callbackRef.current();
      } catch (error) {
        // One failing system must not stop the others
        console.error('Game clock subscriber failed:', error);
      }
    }
  }

  private poll = (): void => {
    const now = Date.now();
    if (typeof document !== 'undefined' && document.hidden) {
      // Hidden time is simulated by the offline catch-up when the tab returns
      this.lastStepAt = now;
      return;
    }

    const due = Math.floor((now - this.lastStepAt) / GAME_STEP_MS);
    if (due <= 0) return;

    const steps = Math.min(due, MAX_CATCH_UP_STEPS);
    this.lastStepAt = steps < due ? now : this.lastStepAt + steps * GAME_STEP_MS;
    for (let i = 0; i < steps; i++) {
      this.step();
    }
  };
}

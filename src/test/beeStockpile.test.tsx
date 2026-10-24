/**
 * Bees stockpile honey: a hive stores each finished batch and starts the next, so nothing is
 * lost while honey waits. Winter still stops them unless they have Winter Hardiness.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BeeProvider, useBees } from '../context/BeeContext';
import { GameClockProvider } from '../hooks/useGameClock';
import { GAME_STEP_MS } from '../utils/gameClock';
import {
  MAX_GAP_SECONDS,
  NON_WINTER_SHARE,
  advanceBox,
  collectBatches,
  normalizeBox,
  productiveSeconds,
  storedBatches
} from '../utils/beeProduction';
import type { BeeBox } from '../types/bees';

const hive = (overrides: Partial<BeeBox> = {}): BeeBox => ({
  id: 'box_1',
  active: true,
  productionTimer: 0,
  productionTime: 132,
  honeyProduced: 0,
  lastHarvestTime: 0,
  harvestReady: false,
  storedBatches: 0,
  ...overrides
});

describe('a hive', () => {
  it('stores each finished batch and keeps the time toward the next', () => {
    const after = advanceBox(hive({ productionTimer: 100 }), 200, 132);
    expect(after.storedBatches).toBe(2);
    expect(after.productionTimer).toBe(36);
    expect(after.harvestReady).toBe(true);
  });

  it('keeps working while honey waits', () => {
    const full = hive({ storedBatches: 3, harvestReady: true, productionTimer: 131 });
    expect(advanceBox(full, 1, 132)).toMatchObject({ storedBatches: 4, productionTimer: 0 });
  });

  it('loads a ready hive from an older save as one stored batch with a fresh timer', () => {
    const old = { ...hive({ harvestReady: true, productionTimer: 132 }), storedBatches: undefined };
    expect(storedBatches(old)).toBe(1);
    expect(normalizeBox(old)).toMatchObject({ storedBatches: 1, productionTimer: 0 });
    expect(normalizeBox({ ...hive({ productionTimer: 40 }), storedBatches: undefined })).toMatchObject({ storedBatches: 0, productionTimer: 40 });
  });

  it('rolls each collected batch for Golden Honey', () => {
    const rolls = [0.5, 0.005, 0.5];
    let i = 0;
    expect(collectBatches(3, { honeyPerBatch: 15, goldenChance: 0.01, random: () => rolls[i++] }))
      .toEqual({ regular: 30, golden: 15 });
  });
});

describe('time for the bees', () => {
  it('stops for winter on a game step, unless the bees are hardy', () => {
    expect(productiveSeconds(1, { winter: true, winterHardiness: false })).toBe(0);
    expect(productiveSeconds(1, { winter: false, winterHardiness: false })).toBe(1);
    expect(productiveSeconds(1, { winter: true, winterHardiness: true })).toBe(1);
  });

  it('counts the warm share of the year over a long gap, capped at 8 hours', () => {
    expect(productiveSeconds(3600, { winter: true, winterHardiness: false })).toBeCloseTo(3600 * NON_WINTER_SHARE);
    expect(productiveSeconds(3600, { winter: false, winterHardiness: true })).toBe(3600);
    expect(productiveSeconds(10 * 24 * 3600, { winter: false, winterHardiness: true })).toBe(MAX_GAP_SECONDS);
  });

  it('counts up to 12 hours away with Night Shift', () => {
    expect(productiveSeconds(10 * 24 * 3600, { winter: false, winterHardiness: true, maxSeconds: 12 * 3600 })).toBe(12 * 3600);
  });
});

describe('the bee system', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const provider = (boxes: BeeBox[], onHivesHarvested = vi.fn(), season = 'Spring') => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GameClockProvider>
        <BeeProvider
          farmTier={4}
          season={season}
          onHivesHarvested={onHivesHarvested}
          initialState={{ unlocked: true, firstTimeSetup: true, boxes, lastUpdateTime: Date.now() }}
        >
          {children}
        </BeeProvider>
      </GameClockProvider>
    );
    return renderHook(() => useBees(), { wrapper });
  };

  it('collects every stored batch at once, pays Guild Tokens per batch, and leaves the timer running', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const onHivesHarvested = vi.fn();
    const { result } = provider([hive({ storedBatches: 3, harvestReady: true, productionTimer: 50 })], onHivesHarvested);

    act(() => {
      result.current.harvestAllHoney();
    });

    expect(result.current.regularHoney).toBe(45);
    expect(onHivesHarvested).toHaveBeenCalledWith(3);
    expect(result.current.boxes[0]).toMatchObject({ storedBatches: 0, harvestReady: false, productionTimer: 50 });
    vi.restoreAllMocks();
  });

  it('collects smaller batches for the Engineers, whose machines bother the bees', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GameClockProvider>
        <BeeProvider
          farmTier={4}
          season="Spring"
          guildHoneyMultiplier={0.75}
          initialState={{ unlocked: true, firstTimeSetup: true, boxes: [hive({ storedBatches: 2, harvestReady: true })], lastUpdateTime: Date.now() }}
        >
          {children}
        </BeeProvider>
      </GameClockProvider>
    );
    const { result } = renderHook(() => useBees(), { wrapper });

    act(() => {
      result.current.harvestAllHoney();
    });

    expect(result.current.regularHoney).toBe(22);
    vi.restoreAllMocks();
  });

  it('keeps making batches on game steps while honey waits', () => {
    vi.useFakeTimers();
    const { result } = provider([hive({ storedBatches: 1, harvestReady: true, productionTimer: 130 })]);

    act(() => {
      vi.advanceTimersByTime(GAME_STEP_MS * 3);
    });

    expect(storedBatches(result.current.boxes[0])).toBe(2);
  });

  it('starts new hives empty when bees unlock, however long the farm spent locked', () => {
    vi.useFakeTimers();
    let farmTier = 3;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GameClockProvider>
        <BeeProvider
          farmTier={farmTier}
          season="Spring"
          // A locked bee system's saved clock is as old as the save, here six hours
          initialState={{ unlocked: false, firstTimeSetup: false, boxes: [], lastUpdateTime: Date.now() - 6 * 60 * 60 * 1000 }}
        >
          {children}
        </BeeProvider>
      </GameClockProvider>
    );
    const { result, rerender } = renderHook(() => useBees(), { wrapper });

    // Twenty minutes at Tier 3
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
    });
    expect(result.current.unlocked).toBe(false);
    expect(result.current.boxes).toHaveLength(0);

    farmTier = 4;
    rerender();
    act(() => {
      vi.advanceTimersByTime(GAME_STEP_MS * 2);
    });

    expect(result.current.unlocked).toBe(true);
    expect(result.current.boxes).toHaveLength(2);
    for (const box of result.current.boxes) {
      expect(storedBatches(box)).toBe(0);
      expect(box.productionTimer).toBeLessThanOrEqual(3);
    }
  });

  it('makes no honey while the game is paused, and none for it afterward', () => {
    vi.useFakeTimers();
    let isPaused = true;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GameClockProvider>
        <BeeProvider
          farmTier={4}
          season="Spring"
          isPaused={isPaused}
          initialState={{ unlocked: true, firstTimeSetup: true, boxes: [hive({ productionTimer: 10 })], lastUpdateTime: Date.now() }}
        >
          {children}
        </BeeProvider>
      </GameClockProvider>
    );
    const { result, rerender } = renderHook(() => useBees(), { wrapper });

    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    isPaused = false;
    rerender();
    act(() => {
      vi.advanceTimersByTime(GAME_STEP_MS * 2);
    });

    expect(result.current.boxes[0]).toMatchObject({ storedBatches: 0 });
    expect(result.current.boxes[0].productionTimer).toBeLessThanOrEqual(13);
  });

  it('rests in winter', () => {
    vi.useFakeTimers();
    const { result } = provider([hive({ productionTimer: 130 })], vi.fn(), 'Winter');

    act(() => {
      vi.advanceTimersByTime(GAME_STEP_MS * 3);
    });

    expect(result.current.boxes[0]).toMatchObject({ storedBatches: 0, productionTimer: 130 });
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChristmasEvent } from '../hooks/useChristmasEvent';

describe('useChristmasEvent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports a successful purchase even when another update is already queued', () => {
    const { result } = renderHook(() => useChristmasEvent({ farmTier: 1 }));
    act(() => {
      result.current.earnCheer(500);
    });
    const cheerBefore = result.current.holidayCheer;

    let purchased = false;
    act(() => {
      // Queue an unrelated update first, as the game loop often has
      result.current.processTreeGrowth();
      purchased = result.current.purchaseUpgrade('unlock_spruce');
    });

    expect(purchased).toBe(true);
    expect(result.current.eventState.upgrades.find(u => u.id === 'unlock_spruce')?.owned).toBe(true);
    expect(result.current.holidayCheer).toBe(cheerBefore - 100);
  });

  it('turns the event on when November 1 arrives in an open tab', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 31, 23, 30)); // October 31, 11:30 pm
    const { result } = renderHook(() => useChristmasEvent({ farmTier: 1 }));
    expect(result.current.isEventActive).toBe(false);

    vi.setSystemTime(new Date(2026, 10, 1, 0, 30)); // November 1, 12:30 am
    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000); // the hourly check
    });

    expect(result.current.isEventActive).toBe(true);
  });

  it('grows a tree by many ticks at once the same as one tick at a time', () => {
    const batched = renderHook(() => useChristmasEvent({ farmTier: 1 }));
    const stepped = renderHook(() => useChristmasEvent({ farmTier: 1 }));
    act(() => {
      batched.result.current.plantTree(0, 'pine');
      stepped.result.current.plantTree(0, 'pine');
    });

    act(() => {
      batched.result.current.processTreeGrowth(10);
      for (let i = 0; i < 10; i++) stepped.result.current.processTreeGrowth();
    });

    const growth = (r: typeof batched) => r.result.current.treePlots[0].growth;
    expect(growth(batched)).toBeGreaterThan(0);
    expect(growth(batched)).toBeCloseTo(growth(stepped));
  });

  describe('actions report exactly what they did', () => {
    const setup = () => {
      const callbacks = {
        onTreeHarvested: vi.fn(),
        onTreeSold: vi.fn(),
        onItemCrafted: vi.fn(),
        onMilestoneClaimed: vi.fn(),
        onUpgradePurchased: vi.fn()
      };
      const hook = renderHook(() => useChristmasEvent({ farmTier: 1, ...callbacks }));
      return { ...hook, callbacks };
    };

    type Hook = ReturnType<typeof setup>['result'];

    const growTrees = (result: Hook, plots: number[]) => {
      act(() => {
        plots.forEach(plot => result.current.plantTree(plot, 'pine'));
      });
      act(() => {
        result.current.processTreeGrowth(100000);
      });
    };

    const treeCount = (result: Hook) =>
      Object.values(result.current.eventState.treeInventory).reduce((sum, n) => sum + n, 0);

    it('harvests a tree once and logs it once, even with another update queued', () => {
      const { result, callbacks } = setup();
      growTrees(result, [0]);

      act(() => {
        result.current.processTreeGrowth();
        result.current.harvestTree(0);
      });

      expect(callbacks.onTreeHarvested).toHaveBeenCalledTimes(1);
      expect(callbacks.onTreeHarvested).toHaveBeenCalledWith('Pine', 'Normal');
      expect(result.current.treePlots[0].treeType).toBeNull();
      expect(treeCount(result)).toBe(1);
    });

    it('harvest all harvests every ready tree', () => {
      const { result, callbacks } = setup();
      growTrees(result, [0, 1]);

      act(() => {
        result.current.harvestAllTrees();
      });

      expect(callbacks.onTreeHarvested).toHaveBeenCalledTimes(2);
      expect(treeCount(result)).toBe(2);
    });

    it('crafting reports success and logs once, and reports failure without logging', () => {
      const { result, callbacks } = setup();
      growTrees(result, [0]);
      act(() => {
        result.current.harvestTree(0);
      });
      const wood = result.current.materials.wood;
      expect(wood).toBeGreaterThanOrEqual(2);

      let crafted = false;
      act(() => {
        result.current.processTreeGrowth();
        crafted = result.current.craftItem('craft_candles', 1);
      });
      expect(crafted).toBe(true);
      expect(callbacks.onItemCrafted).toHaveBeenCalledTimes(1);
      expect(result.current.materials.wood).toBe(wood - 2);
      expect(result.current.materials.candles).toBe(1);

      let craftedTooMany = true;
      act(() => {
        craftedTooMany = result.current.craftItem('craft_candles', 1000);
      });
      expect(craftedTooMany).toBe(false);
      expect(callbacks.onItemCrafted).toHaveBeenCalledTimes(1);
    });

    it('logs the same cheer a sale adds, Magical Register bonus included', () => {
      const { result, callbacks } = setup();
      act(() => {
        result.current.earnCheer(3000);
      });
      act(() => {
        result.current.purchaseUpgrade('magical_register');
      });
      growTrees(result, [0]);
      act(() => {
        result.current.harvestTree(0);
      });
      const treeKey = Object.keys(result.current.eventState.treeInventory)[0];
      const cheerBefore = result.current.holidayCheer;

      // Every roll triggers the bonus
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
      act(() => {
        result.current.sellTrees(treeKey, 1);
      });
      randomSpy.mockRestore();

      const added = result.current.holidayCheer - cheerBefore;
      expect(callbacks.onTreeSold).toHaveBeenCalledWith('Pine', 1, added);
      expect(result.current.lastMagicalRegisterBonus.amount).toBeGreaterThan(0);
      expect(result.current.totalTreesSold).toBe(1);
    });

    it('claims the daily bonus once per day', () => {
      const { result } = setup();

      let first = false;
      let second = true;
      act(() => {
        first = result.current.claimDailyBonus();
      });
      act(() => {
        second = result.current.claimDailyBonus();
      });

      expect(first).toBe(true);
      expect(second).toBe(false);
    });

    it('claims a milestone once and logs it', () => {
      const { result, callbacks } = setup();
      growTrees(result, [0]);
      act(() => {
        result.current.harvestTree(0);
      });
      const treeKey = Object.keys(result.current.eventState.treeInventory)[0];
      act(() => {
        result.current.sellTrees(treeKey, 1);
      });

      const cheerBefore = result.current.holidayCheer;
      let claimed = false;
      let claimedAgain = true;
      act(() => {
        claimed = result.current.claimMilestone('milestone_first_tree');
      });
      act(() => {
        claimedAgain = result.current.claimMilestone('milestone_first_tree');
      });

      expect(claimed).toBe(true);
      expect(claimedAgain).toBe(false);
      expect(callbacks.onMilestoneClaimed).toHaveBeenCalledTimes(1);
      expect(callbacks.onMilestoneClaimed).toHaveBeenCalledWith('First Sale');
      expect(result.current.holidayCheer - cheerBefore).toBe(50);
    });
  });

  it('pays Golden Bell income across seconds without losing the fraction', () => {
    const { result } = renderHook(() => useChristmasEvent({
      farmTier: 1,
      initialState: { holidayCheer: 0, passiveCheerPerSecond: 0.1 }
    }));

    for (let i = 0; i < 25; i++) {
      act(() => {
        result.current.updatePassiveIncome(1000);
      });
    }
    expect(result.current.holidayCheer).toBe(2);
    expect(result.current.eventState.totalCheerEarned).toBe(2);
  });

  it('loads milestones from an older save with current rewards and the claimed flags kept', () => {
    const { result } = renderHook(() => useChristmasEvent({
      farmTier: 1,
      initialState: {
        milestones: [{
          id: 'milestone_50_trees',
          name: 'Growing Business',
          description: 'Sell 50 trees',
          requirement: 50,
          claimed: true,
          reward: { type: 'cosmetic', name: 'Reindeer Hat', description: 'Archie wears a hat', cosmeticId: 'archie_reindeer_hat' }
        }]
      }
    }));

    const milestones = result.current.eventState.milestones;
    expect(milestones.map(m => m.id)).toEqual([
      'milestone_first_tree', 'milestone_50_trees', 'milestone_250_trees',
      'milestone_1000_trees', 'milestone_2500_trees', 'milestone_5000_trees'
    ]);
    expect(milestones.every(m => m.reward.type === 'currency' && (m.reward.cheerAmount ?? 0) > 0)).toBe(true);
    expect(milestones.find(m => m.id === 'milestone_50_trees')).toMatchObject({ claimed: true, reward: { cheerAmount: 150 } });
    expect(milestones.find(m => m.id === 'milestone_first_tree')?.claimed).toBe(false);
  });
});

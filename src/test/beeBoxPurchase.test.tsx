import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BeeProvider, useBees } from '../context/BeeContext';
import type { BeeBox } from '../types/bees';

const box = (i: number): BeeBox => ({
  id: `box_${i}`,
  active: false,
  productionTimer: 0,
  productionTime: 182,
  honeyProduced: 0,
  lastHarvestTime: 0,
  harvestReady: false
});

describe('bee box purchase', () => {
  it('charges the price the purchase panel shows', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <BeeProvider
        farmTier={5}
        season="Spring"
        initialState={{
          unlocked: true,
          firstTimeSetup: true,
          boxes: Array.from({ length: 6 }, (_, i) => box(i)),
          regularHoney: 10000
        }}
      >
        {children}
      </BeeProvider>
    );
    const { result } = renderHook(() => useBees(), { wrapper });

    const shownPrice = result.current.getBeeBoxPurchaseInfo().cost;
    act(() => {
      result.current.addBeeBox();
    });

    // The seventh box is where the old linear formula charged 600
    expect(shownPrice).toBe(675);
    expect(result.current.regularHoney).toBe(10000 - shownPrice);
  });
});

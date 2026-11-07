/**
 * Every event's patch keeps the crop you chose. Leaving the tab and coming back, or reloading,
 * used to reset it: the Melon Patch to Sugar Baby, the others to the best crop unlocked.
 */
import { describe, it, expect } from 'vitest';
import { useState, type ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MelonPatchTab from '../components/MelonPatchTab';
import PumpkinPatchTab from '../components/PumpkinPatchTab';
import FlowerBedsTab from '../components/FlowerBedsTab';
import TreeFarmTab from '../components/TreeFarmTab';
import { useSummerEvent } from '../hooks/useSummerEvent';
import { usePumpkinEvent } from '../hooks/usePumpkinEvent';
import { useSpringEvent } from '../hooks/useSpringEvent';
import { useChristmasEvent } from '../hooks/useChristmasEvent';
import { ALL_SUMMER_UPGRADES } from '../data/summerEventData';
import { ALL_PUMPKIN_UPGRADES } from '../data/pumpkinEventData';
import { ALL_SPRING_UPGRADES } from '../data/springEventData';
import { ALL_EVENT_UPGRADES } from '../data/christmasEventData';
import type { EventUpgrade } from '../types/eventUpgrades';
import type { SummerEventState } from '../types/summerEvent';
import type { PumpkinEventState } from '../types/pumpkinEvent';
import type { SpringEventState } from '../types/springEvent';
import type { ChristmasEventState } from '../types/christmasEvent';

const format = (n: number) => String(Math.floor(n));

type Saved = Record<string, unknown>;

/** A tab you can leave and come back to, while its event hook stays mounted, as in App */
function Switcher({ chosen, children }: { chosen: string | undefined; children: ReactNode }) {
  const [shown, setShown] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setShown(s => !s)}>{shown ? 'Leave the tab' : 'Back to the tab'}</button>
      <output data-testid="saved">{chosen ?? 'none'}</output>
      {shown && children}
    </>
  );
}

function MelonHarness({ initialState }: { initialState: Saved }) {
  const event = useSummerEvent({ initialState: initialState as Partial<SummerEventState> });
  return <Switcher chosen={event.eventState.chosenMelon}><MelonPatchTab event={event} formatNumber={format} /></Switcher>;
}

function PumpkinHarness({ initialState }: { initialState: Saved }) {
  const event = usePumpkinEvent({ initialState: initialState as Partial<PumpkinEventState> });
  return <Switcher chosen={event.eventState.chosenPumpkin}><PumpkinPatchTab event={event} formatNumber={format} /></Switcher>;
}

function FlowerHarness({ initialState }: { initialState: Saved }) {
  const event = useSpringEvent({ initialState: initialState as Partial<SpringEventState> });
  return <Switcher chosen={event.eventState.chosenFlower}><FlowerBedsTab event={event} formatNumber={format} /></Switcher>;
}

function TreeHarness({ initialState }: { initialState: Saved }) {
  const event = useChristmasEvent({ farmTier: 1, initialState: initialState as Partial<ChristmasEventState> });
  return <Switcher chosen={event.eventState.chosenTree}><TreeFarmTab event={event} formatNumber={format} /></Switcher>;
}

/** Saved upgrades with these owned, on top of the ones owned from the start */
const owning = (all: EventUpgrade[], ...ids: string[]) =>
  all.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const cases = [
  {
    patch: 'Melon Patch', field: 'chosenMelon',
    mount: (s: Saved) => render(<MelonHarness initialState={s} />),
    withSecond: owning(ALL_SUMMER_UPGRADES, 'unlock_crimson_sweet'),
    // The first melon is the default, so choose the second
    starter: /^Sugar Baby,/, usual: /^Sugar Baby,/, other: /^Crimson Sweet,/, otherId: 'crimsonSweet', lockedId: 'carolinaCross',
  },
  {
    patch: 'Pumpkin Patch', field: 'chosenPumpkin',
    mount: (s: Saved) => render(<PumpkinHarness initialState={s} />),
    withSecond: owning(ALL_PUMPKIN_UPGRADES, 'unlock_carver'),
    // The best variety is the default, so choose the first
    starter: /^Sugar Pie,/, usual: /^Carver,/, other: /^Sugar Pie,/, otherId: 'sugarPie', lockedId: 'giant',
  },
  {
    patch: 'Flower Beds', field: 'chosenFlower',
    mount: (s: Saved) => render(<FlowerHarness initialState={s} />),
    withSecond: owning(ALL_SPRING_UPGRADES, 'unlock_daffodil'),
    starter: /^Tulip,/, usual: /^Daffodil,/, other: /^Tulip,/, otherId: 'tulip', lockedId: 'rose',
  },
  {
    patch: 'Tree Farm', field: 'chosenTree',
    mount: (s: Saved) => render(<TreeHarness initialState={s} />),
    withSecond: owning(ALL_EVENT_UPGRADES, 'unlock_spruce'),
    starter: /^Pine Tree,/, usual: /^Spruce Tree,/, other: /^Pine Tree,/, otherId: 'pine', lockedId: 'fir',
  },
];

// The first render of a file can be slow while the whole suite runs
describe('the chosen crop', { timeout: 15_000 }, () => {
  describe.each(cases)('the $patch', c => {
    it('keeps the chosen crop after leaving the tab and coming back', () => {
      c.mount({ upgrades: c.withSecond });
      expect(screen.getByRole('button', { name: c.usual })).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(screen.getByRole('button', { name: c.other }));
      fireEvent.click(screen.getByRole('button', { name: 'Leave the tab' }));
      fireEvent.click(screen.getByRole('button', { name: 'Back to the tab' }));

      expect(screen.getByRole('button', { name: c.other })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: c.usual })).toHaveAttribute('aria-pressed', 'false');
      // Kept in the event's state, which the game saves
      expect(screen.getByTestId('saved')).toHaveTextContent(c.otherId);
    });

    it('keeps the chosen crop after a reload', () => {
      c.mount({ upgrades: c.withSecond, [c.field]: c.otherId });

      expect(screen.getByRole('button', { name: c.other })).toHaveAttribute('aria-pressed', 'true');
    });

    it('falls back to an unlocked crop when the saved one is locked again', () => {
      c.mount({ [c.field]: c.lockedId });

      expect(screen.getByRole('button', { name: c.starter })).toHaveAttribute('aria-pressed', 'true');
    });
  });
});

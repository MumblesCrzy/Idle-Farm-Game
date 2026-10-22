/**
 * Tests for the game's accessibility pieces: the long lists in the Achievements and Event Log
 * dialogs take focus so the keyboard can scroll them, and popups that come and go (toasts,
 * achievement unlocks, Dunkin's visits) are read out from live regions that stay on the page.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import AchievementDisplay from '../components/AchievementDisplay';
import AchievementNotification from '../components/AchievementNotification';
import EventLogOverlay from '../components/EventLogOverlay';
import GluttonVisitor from '../components/GluttonVisitor';
import LiveAnnouncer, { ANNOUNCEMENT_CLEAR_MS } from '../components/LiveAnnouncer';
import Toast from '../components/Toast';
import { announce } from '../utils/announcer';
import { arrive, arriveStuffed, type GluttonVisit } from '../utils/glutton';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import type { EventCategory } from '../types/game';

const polite = () => screen.getByTestId('announcer-polite');
const assertive = () => screen.getByTestId('announcer-assertive');
const lines = (region: HTMLElement) => [...region.querySelectorAll('p')].map(line => line.textContent);
const formatNumber = (num: number, decimalPlaces = 0) => num.toFixed(decimalPlaces);

describe('lists the keyboard can scroll', () => {
  it('the achievement list takes focus, so arrow keys and Page Down scroll it', () => {
    const achievements = INITIAL_ACHIEVEMENTS.map(a => ({ ...a, unlocked: false }));
    render(<AchievementDisplay visible onClose={vi.fn()} achievements={achievements} totalUnlocked={0} />);

    const list = screen.getByRole('region', { name: 'Achievement list' });
    expect(list).toHaveAttribute('tabindex', '0');
    act(() => list.focus());
    expect(list).toHaveFocus();
  });

  it('the event list takes focus too', () => {
    // jsdom has no element scrolling; the log scrolls itself to its newest event
    Object.defineProperty(Element.prototype, 'scrollTo', { value: vi.fn(), configurable: true, writable: true });
    const counts = Object.fromEntries(
      ['weather', 'growth', 'harvest', 'auto-purchase', 'merchant', 'canning', 'milestone', 'bees', 'christmas', 'pumpkin', 'upgrade'].map(c => [c, 0])
    ) as Record<EventCategory, number>;
    render(
      <EventLogOverlay
        visible
        onClose={vi.fn()}
        entries={[]}
        unreadCount={0}
        onMarkAsRead={vi.fn()}
        onClearAll={vi.fn()}
        getFilteredEvents={() => []}
        getCategoryCounts={() => counts}
        enabledCategories={[]}
        onEnabledCategoriesChange={vi.fn()}
      />
    );

    const list = screen.getByRole('log', { name: 'Events' });
    expect(list).toHaveAttribute('tabindex', '0');
  });
});

describe('LiveAnnouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads out polite and assertive messages from their own regions, then clears them', () => {
    render(<LiveAnnouncer />);
    expect(polite()).toHaveAttribute('aria-live', 'polite');
    expect(assertive()).toHaveAttribute('aria-live', 'assertive');

    act(() => {
      announce('Fortune Teller tip! +5 Candy Corn');
      announce('Dunkin is sniffing around the pantry.', 'assertive');
    });
    expect(lines(polite())).toEqual(['Fortune Teller tip! +5 Candy Corn']);
    expect(lines(assertive())).toEqual(['Dunkin is sniffing around the pantry.']);

    act(() => {
      vi.advanceTimersByTime(ANNOUNCEMENT_CLEAR_MS);
    });
    expect(polite()).toBeEmptyDOMElement();
    expect(assertive()).toBeEmptyDOMElement();
  });

  it('gives each message its own line, so two close together and a repeat are all read', () => {
    render(<LiveAnnouncer />);
    act(() => {
      announce('Holiday Tip! +3 Cheer');
      announce('Holiday Tip! +3 Cheer');
      announce('Fortune Teller tip! +5 Candy Corn');
    });
    expect(lines(polite())).toEqual(['Holiday Tip! +3 Cheer', 'Holiday Tip! +3 Cheer', 'Fortune Teller tip! +5 Candy Corn']);
  });

  it('keeps five lines in each region, so a burst of unlocks never pushes out Dunkin', () => {
    render(<LiveAnnouncer />);
    act(() => {
      announce('Dunkin is stuffed and won\'t leave.', 'assertive');
      for (let n = 1; n <= 7; n++) announce(`Achievement ${n}`);
    });
    expect(lines(assertive())).toEqual(['Dunkin is stuffed and won\'t leave.']);
    expect(lines(polite())).toEqual(['Achievement 3', 'Achievement 4', 'Achievement 5', 'Achievement 6', 'Achievement 7']);
  });

  it('ignores empty messages, and says nothing when no regions are on the page', () => {
    expect(() => announce('Nobody is listening')).not.toThrow();
    render(<LiveAnnouncer />);
    act(() => announce('   '));
    expect(polite()).toBeEmptyDOMElement();
  });
});

describe('popups screen readers hear', () => {
  it('a toast is read out as it appears', () => {
    const toast = (visible: boolean) => (
      <>
        <LiveAnnouncer />
        <Toast message="Holiday Tip! +3 Cheer" visible={visible} onClose={vi.fn()} />
      </>
    );
    const { rerender } = render(toast(false));
    expect(polite()).toBeEmptyDOMElement();

    rerender(toast(true));
    expect(lines(polite())).toEqual(['Holiday Tip! +3 Cheer']);
  });

  it('an achievement unlock is read out with what it took and its reward', () => {
    const honey = { ...INITIAL_ACHIEVEMENTS.find(a => a.id === 'honey_hoarder')!, unlocked: true };
    render(
      <>
        <LiveAnnouncer />
        <AchievementNotification achievement={honey} onClose={vi.fn()} />
      </>
    );

    expect(lines(polite())).toEqual([
      'Achievement unlocked: Honey Hoarder. Collect 100 honey total (lifetime). A sweet stockpile! +30 knowledge.'
    ]);
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it("says each of Dunkin's stages once, as it starts, and says a new visit again", () => {
    const sniffing = arrive(() => 0);
    const eating: GluttonVisit = { ...sniffing, stage: 'eating', steps: 11, bites: 1, eaten: { Carrots: 5 } };
    const visitor = (visit: GluttonVisit | null) => (
      <>
        <LiveAnnouncer />
        <GluttonVisitor visit={visit} image="dog.png" vetBill={250} onShoo={vi.fn()} formatNumber={formatNumber} />
      </>
    );

    const { rerender } = render(visitor(sniffing));
    rerender(visitor({ ...sniffing, steps: 4 }));
    rerender(visitor(eating));
    rerender(visitor({ ...eating, steps: 13, bites: 2, eaten: { Carrots: 9 } }));
    rerender(visitor(arriveStuffed({ Carrots: 9 }, () => 0)));
    rerender(visitor(null));
    rerender(visitor(arrive(() => 0)));

    expect(lines(assertive())).toEqual([
      'Dunkin is sniffing around the pantry. Shoo him out now for free.',
      'Dunkin is eating from your pantry! Shoo him out.',
      "Dunkin is stuffed and won't leave. Send him home: the vet bill is $250.",
      'Dunkin is sniffing around the pantry. Shoo him out now for free.'
    ]);
    expect(within(polite()).queryByText(/Dunkin/)).not.toBeInTheDocument();
  });
});

/**
 * Tests for the Merchants' Payroll and Hostile Takeover: laying off every auto-buyer and hiring
 * them back, all or none, with Head Hunters; the switch in the Garden; and the Larger Farm row
 * that a Hostile Takeover leads.
 */
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { usePayroll, type PayrollControl, type UsePayrollOptions } from '../hooks/usePayroll';
import { countStaff, getRehireCost, layOffEveryone, rehireEveryone } from '../utils/payroll';
import { createAllCrops, formatNumber } from '../utils/gameCalculations';
import CropGarden from '../components/CropGarden';
import StatsDisplay from '../components/StatsDisplay';
import { DEFAULT_GUILD_STATE } from '../types/guilds';
import type { Veggie } from '../types/game';

/** Every crop, the first ones open, with these auto-buyers hired and on in the open ones */
const cropsWith = (open: number, hired: string[]): Veggie[] =>
  createAllCrops().map((crop, i) => (i < open
    ? {
      ...crop,
      unlocked: true,
      autoPurchasers: crop.autoPurchasers.map(ap => (hired.includes(ap.id) ? { ...ap, owned: true, active: true } : ap))
    }
    : crop));

const ALL = ['assistant', 'cultivator', 'surveyor', 'mechanic'];

/** Hire prices of the open crops' auto-buyers, in money and knowledge */
const hirePrices = (veggies: Veggie[]) => veggies.filter(crop => crop.unlocked).flatMap(crop => crop.autoPurchasers)
  .reduce((sum, ap) => (ap.currencyType === 'money'
    ? { ...sum, money: sum.money + ap.cost }
    : { ...sum, knowledge: sum.knowledge + ap.cost }), { money: 0, knowledge: 0 });

describe('Payroll rules', () => {
  it('counts the auto-buyers on staff on open crops', () => {
    expect(countStaff(cropsWith(3, ALL))).toBe(12);
    expect(countStaff(cropsWith(3, ['assistant']))).toBe(3);
    expect(countStaff(cropsWith(3, []))).toBe(0);
  });

  it('lays everyone off: not hired, off, timers at zero', () => {
    const after = layOffEveryone(cropsWith(3, ALL));
    expect(countStaff(after)).toBe(0);
    expect(after.flatMap(crop => crop.autoPurchasers).every(ap => !ap.owned && !ap.active && ap.timer === 0)).toBe(true);
  });

  it('prices hiring everyone back at the full hire prices, or half with Head Hunters', () => {
    const veggies = cropsWith(3, []);
    const full = hirePrices(veggies);
    expect(getRehireCost(veggies)).toEqual({ ...full, count: 12 });
    expect(getRehireCost(veggies, 0.5)).toEqual({ money: full.money / 2, knowledge: full.knowledge / 2, count: 12 });
  });

  it('hires everyone on the open crops, with Surveyors off while every plot is in use', () => {
    const roomy = rehireEveryone(cropsWith(3, []), false);
    expect(countStaff(roomy)).toBe(12);
    expect(roomy.slice(0, 3).flatMap(crop => crop.autoPurchasers).every(ap => ap.active)).toBe(true);
    expect(roomy.slice(3).flatMap(crop => crop.autoPurchasers).some(ap => ap.owned)).toBe(false);

    const full = rehireEveryone(cropsWith(3, []), true);
    const surveyors = full.slice(0, 3).map(crop => crop.autoPurchasers.find(ap => ap.id === 'surveyor'));
    expect(surveyors.every(ap => ap?.owned && !ap.active)).toBe(true);
  });
});

describe('usePayroll', () => {
  const options = (overrides: Partial<UsePayrollOptions> = {}): UsePayrollOptions => ({
    veggies: cropsWith(3, ALL),
    setVeggies: vi.fn(),
    money: 0,
    setMoney: vi.fn(),
    knowledge: 0,
    setKnowledge: vi.fn(),
    farmFull: false,
    priceFactor: 1,
    onLog: vi.fn(),
    formatNumber,
    ...overrides
  });

  it('lays everyone off with nothing refunded, and logs the count', () => {
    const opts = options();
    const { result } = renderHook(() => usePayroll(opts));
    expect(result.current.staff).toBe(12);

    act(() => result.current.onLayOff());

    const update = vi.mocked(opts.setVeggies).mock.calls[0][0] as (prev: Veggie[]) => Veggie[];
    expect(countStaff(update(opts.veggies))).toBe(0);
    expect(opts.setMoney).not.toHaveBeenCalled();
    expect(opts.onLog).toHaveBeenCalledWith('Laid off 12 auto-buyers', expect.stringContaining('Nothing was refunded'));
  });

  it('hires everyone back only with the money and knowledge for all of them', () => {
    const veggies = cropsWith(3, []);
    const price = hirePrices(veggies);
    const short = options({ veggies, money: price.money, knowledge: price.knowledge - 1 });
    const { result: shortResult } = renderHook(() => usePayroll(short));
    expect(shortResult.current.canRehire).toBe(false);
    act(() => shortResult.current.onRehire());
    expect(short.setVeggies).not.toHaveBeenCalled();

    const enough = options({ veggies, money: price.money, knowledge: price.knowledge });
    const { result } = renderHook(() => usePayroll(enough));
    expect(result.current.canRehire).toBe(true);
    act(() => result.current.onRehire());
    const pay = vi.mocked(enough.setMoney).mock.calls[0][0] as (m: number) => number;
    expect(pay(price.money)).toBe(0);
    const learn = vi.mocked(enough.setKnowledge).mock.calls[0][0] as (k: number) => number;
    expect(learn(price.knowledge)).toBe(0);
    expect(enough.onLog).toHaveBeenCalledWith('Rehired 12 auto-buyers', expect.stringContaining('Paid $'));
  });
});

describe('the Payroll switch in the Garden', () => {
  const control = (overrides: Partial<PayrollControl> = {}): PayrollControl => ({
    staff: 12,
    rehire: { money: 30_280, knowledge: 1_380, count: 12 },
    canRehire: true,
    onLayOff: vi.fn(),
    onRehire: vi.fn(),
    ...overrides
  });

  const garden = (payroll?: PayrollControl) => render(
    <CropGarden
      veggies={cropsWith(3, payroll && payroll.staff > 0 ? ALL : [])}
      group="vegetables"
      fruitsOpen={false}
      onShowGroup={vi.fn()}
      activeVeggie={0}
      farmFull={false}
      money={0}
      globalAutoPurchaseTimer={3}
      growthMultiplierOf={() => 1}
      onSelect={vi.fn()}
      onHarvest={vi.fn()}
      onToggleSell={vi.fn()}
      onBuyHarvester={vi.fn()}
      formatNumber={formatNumber}
      payroll={payroll}
    />
  );

  it('shows who is on staff and lays everyone off, in place of the hint', () => {
    const payroll = control();
    garden(payroll);

    expect(screen.getByText('Payroll: 12 on staff')).toBeInTheDocument();
    expect(screen.getByText(/Auto-buyers shop in 4 days/)).toBeInTheDocument();
    expect(screen.queryByText('Click a bed to see its upgrades in the shed')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lay off everyone' }));
    expect(payroll.onLayOff).toHaveBeenCalledTimes(1);
  });

  it('offers to rehire everyone for the whole price, and only when it is affordable', () => {
    const { unmount } = garden(control({ staff: 0, canRehire: false }));
    expect(screen.getByText('Payroll: laid off')).toBeInTheDocument();
    expect(screen.getByText('No auto-buyers on staff')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rehire everyone for $30.28K and 1.38K knowledge' })).toBeDisabled();
    unmount();

    const payroll = control({ staff: 0 });
    garden(payroll);
    fireEvent.click(screen.getByRole('button', { name: /^Rehire everyone/ }));
    expect(payroll.onRehire).toHaveBeenCalledTimes(1);
  });

  it('is not there for other guilds', () => {
    garden();
    expect(screen.queryByText(/Payroll/)).not.toBeInTheDocument();
    expect(screen.getByText('Click a bed to see its upgrades in the shed')).toBeInTheDocument();
  });
});

describe('the Larger Farm row with Hostile Takeover', () => {
  const header = (money: number, plotsUsed: number, takeover?: () => void) => {
    const buyLargerFarm = vi.fn();
    render(
      <StatsDisplay
        day={10}
        totalDaysElapsed={9}
        season="Spring"
        currentWeather="Clear"
        totalPlotsUsed={plotsUsed}
        maxPlots={10}
        money={money}
        knowledge={0}
        veggies={[]}
        setShowAdvancedStash={vi.fn()}
        formatNumber={formatNumber}
        experience={500}
        farmCost={100}
        farmTier={5}
        handleBuyLargerFarm={buyLargerFarm}
        handleHostileTakeover={takeover}
        guildState={DEFAULT_GUILD_STATE}
      />
    );
    return buyLargerFarm;
  };

  it('leads with the takeover once every plot is in use, with the ordinary farm beside it', () => {
    const takeover = vi.fn();
    const buyLargerFarm = header(1_000, 10, takeover);

    const lead = screen.getByRole('button', { name: 'Hostile Takeover' });
    expect(lead).toHaveTextContent('Hostile Takeover: $1K');
    expect(lead).toHaveTextContent('New max plots: 15');
    expect(lead).toHaveTextContent('Keeps everything');
    fireEvent.click(lead);
    expect(takeover).toHaveBeenCalledTimes(1);

    const plain = screen.getByRole('button', { name: 'Buy Larger Farm' });
    expect(within(plain).getByText('Resets crops and upgrades')).toBeInTheDocument();
    fireEvent.click(plain);
    expect(buyLargerFarm).toHaveBeenCalledTimes(1);
  });

  it('needs ten times the farm price for the takeover', () => {
    header(999, 10, vi.fn());
    expect(screen.getByRole('button', { name: 'Hostile Takeover' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Buy Larger Farm' })).toBeEnabled();
  });

  it('names both prices while plots are free', () => {
    header(1_000, 6, vi.fn());
    expect(screen.getByText(/once all 10 plots are in use \(6 now\)/).textContent).toContain('Hostile Takeover:');
  });

  it('keeps the usual Larger Farm button for everyone else', () => {
    header(1_000, 10);
    expect(screen.queryByRole('button', { name: 'Hostile Takeover' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buy Larger Farm' })).toHaveTextContent('Money/Knowledge kept');
  });
});

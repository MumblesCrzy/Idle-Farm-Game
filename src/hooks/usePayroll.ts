/**
 * Payroll for committed Merchants: how many auto-buyers are on staff, what hiring everyone
 * back costs, and the switch's two actions. Each one goes in the event log with its count.
 */
import { useMemo, type Dispatch, type SetStateAction } from 'react';
import type { Veggie } from '../types/game';
import { countStaff, getRehireCost, layOffEveryone, rehireEveryone, type RehireCost } from '../utils/payroll';
import { useStableCallback } from './useStableCallback';

/** What the Garden's Payroll switch shows and does */
export interface PayrollControl {
  /** Auto-buyers on staff on the open crops */
  staff: number;
  /** What hiring everyone not on staff costs */
  rehire: RehireCost;
  /** There is someone to hire and enough money and knowledge for all of them */
  canRehire: boolean;
  onLayOff: () => void;
  onRehire: () => void;
}

export interface UsePayrollOptions {
  veggies: Veggie[];
  setVeggies: Dispatch<SetStateAction<Veggie[]>>;
  money: number;
  setMoney: Dispatch<SetStateAction<number>>;
  knowledge: number;
  setKnowledge: Dispatch<SetStateAction<number>>;
  /** Every plot is in use, so rehired Surveyors come back switched off */
  farmFull: boolean;
  /** Share of the hire prices paid: a half with Head Hunters */
  priceFactor: number;
  /** Writes one line to the event log */
  onLog: (message: string, details: string) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

export function usePayroll(options: UsePayrollOptions): PayrollControl {
  const { veggies, money, knowledge, priceFactor } = options;
  const staff = countStaff(veggies);
  const rehire = useMemo(() => getRehireCost(veggies, priceFactor), [veggies, priceFactor]);
  const canRehire = rehire.count > 0 && money >= rehire.money && knowledge >= rehire.knowledge;

  // Nothing is refunded: rehiring them costs their full hire prices again
  const onLayOff = useStableCallback(() => {
    const count = countStaff(options.veggies);
    if (count === 0) return;
    options.setVeggies(prev => layOffEveryone(prev));
    options.onLog(`Laid off ${count} auto-buyers`, 'Nothing was refunded. Payroll can hire them all back');
  });

  // All or none: only when there is enough money and knowledge for everyone
  const onRehire = useStableCallback(() => {
    const cost = getRehireCost(options.veggies, options.priceFactor);
    if (cost.count === 0 || options.money < cost.money || options.knowledge < cost.knowledge) return;
    options.setMoney(m => m - cost.money);
    options.setKnowledge(k => k - cost.knowledge);
    options.setVeggies(prev => rehireEveryone(prev, options.farmFull));
    const paid = [
      cost.money > 0 ? `$${options.formatNumber(cost.money, 2)}` : null,
      cost.knowledge > 0 ? `${options.formatNumber(cost.knowledge, 2)} knowledge` : null
    ].filter(Boolean).join(' and ');
    options.onLog(`Rehired ${cost.count} auto-buyers`, paid ? `Paid ${paid}` : 'Paid nothing');
  });

  return useMemo(
    () => ({ staff, rehire, canRehire, onLayOff, onRehire }),
    [staff, rehire, canRehire, onLayOff, onRehire]
  );
}

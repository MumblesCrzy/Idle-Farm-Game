/**
 * Payroll, the Merchants' one switch for every auto-buyer: lay everyone off, with nothing
 * refunded, or hire everyone back at the full hire prices, all or none.
 */
import type { AutoPurchaseConfig, Veggie } from '../types/game';

/** What hiring everyone not on staff costs, and how many auto-buyers that is */
export interface RehireCost {
  money: number;
  knowledge: number;
  count: number;
}

/** Auto-buyers on staff: hired, on the crops that are open */
export function countStaff(veggies: Veggie[]): number {
  return veggies.reduce((sum, crop) => sum + (crop.unlocked ? crop.autoPurchasers.filter(ap => ap.owned).length : 0), 0);
}

/**
 * What hiring every auto-buyer not on staff costs, on every open crop, at the hire prices
 * times the factor (a half with Head Hunters)
 */
export function getRehireCost(veggies: Veggie[], priceFactor: number = 1): RehireCost {
  const cost: RehireCost = { money: 0, knowledge: 0, count: 0 };
  for (const crop of veggies) {
    if (!crop.unlocked) continue;
    for (const buyer of crop.autoPurchasers) {
      if (buyer.owned) continue;
      if (buyer.currencyType === 'money') cost.money += buyer.cost * priceFactor;
      else cost.knowledge += buyer.cost * priceFactor;
      cost.count += 1;
    }
  }
  return cost;
}

/** Every auto-buyer laid off: not hired, switched off, its timer back at zero */
export function layOffEveryone(veggies: Veggie[]): Veggie[] {
  return veggies.map(crop => (crop.autoPurchasers.some(buyer => buyer.owned || buyer.active)
    ? { ...crop, autoPurchasers: crop.autoPurchasers.map(buyer => ({ ...buyer, owned: false, active: false, timer: 0 })) }
    : crop));
}

/** One auto-buyer hired and on; a Surveyor stays off while every plot is in use */
const hire = (buyer: AutoPurchaseConfig, farmFull: boolean): AutoPurchaseConfig =>
  ({ ...buyer, owned: true, active: !(farmFull && buyer.purchaseType === 'additionalPlot'), timer: 0 });

/** Everyone not on staff hired, on every open crop */
export function rehireEveryone(veggies: Veggie[], farmFull: boolean): Veggie[] {
  return veggies.map(crop => (crop.unlocked && crop.autoPurchasers.some(buyer => !buyer.owned)
    ? { ...crop, autoPurchasers: crop.autoPurchasers.map(buyer => (buyer.owned ? buyer : hire(buyer, farmFull))) }
    : crop));
}

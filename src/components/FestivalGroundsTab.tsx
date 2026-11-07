/**
 * Festival Grounds Tab Component
 *
 * Sells melons, giants and goods for the Summer Watermelon Festival, laid out as
 * the Market Stall's mockup B without the Cart:
 * - A bar with the demand, the Heatwave while it lasts, the Parade Route's daily
 *   bonus and the Carousel
 * - One card per stock melon with a row per finish, each with its stock, price and
 *   Sell. Rows with nothing in stock are greyed, not hidden, so the cards never
 *   change height. Then the Carolina Cross shelf, a row per giant.
 * - Sell all melons, and the goods row
 */

import { memo, useMemo, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt, { type EventArtSource } from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import type { UseSummerEventReturn } from '../hooks/useSummerEvent';
import type { EventUpgrade } from '../types/eventUpgrades';
import type { GiantMelon, MelonFinish, MelonInventory, StockMelon, SummerGood } from '../types/summerEvent';
import {
  COLD_FINISHES,
  COLD_GOODS,
  MELON_FINISH_NAMES,
  MELON_FINISH_ORDER,
  MELON_VARIETIES,
  SUMMER_ART,
  SUMMER_CUSTOMER_MESSAGES,
  SUMMER_EVENT_CONSTANTS,
  SUMMER_GOOD_NAMES,
  SUMMER_GOOD_ORDER
} from '../data/summerEventData';
import {
  countMelons,
  floorTickets,
  getGiantSaleTickets,
  getGoodPrice,
  getGoodSaleTickets,
  getMelonPrice,
  getMelonSaleTickets,
  getSaleMultiplier,
  goodLabel,
  melonKey,
  melonLabel,
  ownsUpgrade
} from '../utils/summerPricing';
import frame from './SummerSections.module.css';
import styles from './FestivalGroundsTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

const C = SUMMER_EVENT_CONSTANTS;

/** The melons with stall cards; giants have their shelf instead */
const STOCK_MELONS: StockMelon[] = ['sugarBaby', 'crimsonSweet'];

/** Small Ticket icon that screen readers read as the currency name */
const Ticket: FC<{ size?: number }> = ({ size = 16 }) => (
  <EventArt art={SUMMER_ART.tickets} size={size} alt="Tickets" className={styles.currencyIcon} />
);

/** The art beside each finish on a melon card; plain melons use the melon's own */
const FINISH_ART: Record<MelonFinish, EventArtSource | null> = {
  plain: null,
  chilled: SUMMER_ART.chilled,
  carved: SUMMER_ART.carved,
  basket: SUMMER_ART.basket,
};

const GOOD_ART: Record<SummerGood, EventArtSource> = {
  ice: SUMMER_ART.snowCone,
  cups: SUMMER_ART.cups,
  agua: SUMMER_ART.agua,
  pickles: SUMMER_ART.pickles,
  roasted: SUMMER_ART.roasted,
};

/** Tickets from Sell all melons, priced the way sellAllMelons prices it (tips excluded) */
function inventorySaleTickets(inventory: MelonInventory, upgrades: EventUpgrade[], demandMultiplier: number, heatwave: boolean): number {
  let value = 0;
  for (const [key, quantity] of Object.entries(inventory)) {
    if (quantity > 0) value += getMelonPrice(key, upgrades, demandMultiplier, heatwave) * quantity;
  }
  return floorTickets(value * getSaleMultiplier(upgrades));
}

// ============================================================================
// MELON CARD
// ============================================================================

interface FinishRowProps {
  variety: StockMelon;
  finish: MelonFinish;
  normal: number;
  sugar: number;
  upgrades: EventUpgrade[];
  demandMultiplier: number;
  heatwave: boolean;
  onSell: (variety: StockMelon, finish: MelonFinish) => void;
  formatNumber: FormatNumber;
}

const FinishRow: FC<FinishRowProps> = memo(({ variety, finish, normal, sugar, upgrades, demandMultiplier, heatwave, onSell, formatNumber }) => {
  const total = normal + sugar;
  const normalKey = melonKey(variety, 'normal', finish);
  const sugarKey = melonKey(variety, 'sugar', finish);
  // What one melon sells for, priced the same way a sale is; the range when Sugar Melons are in the row
  const normalPrice = getMelonSaleTickets(normalKey, 1, upgrades, demandMultiplier, heatwave);
  const sugarPrice = getMelonSaleTickets(sugarKey, 1, upgrades, demandMultiplier, heatwave);
  const priceText = sugar > 0 && normal > 0 ? `${normalPrice}-${sugarPrice}` : String(sugar > 0 ? sugarPrice : normalPrice);
  const value = getMelonSaleTickets(normalKey, normal, upgrades, demandMultiplier, heatwave)
    + getMelonSaleTickets(sugarKey, sugar, upgrades, demandMultiplier, heatwave);
  const label = melonLabel(variety, finish, total);
  const cold = COLD_FINISHES.includes(finish);
  const name = MELON_FINISH_NAMES[finish];

  const className = [
    styles.finishRow,
    total === 0 ? styles.emptyRow : '',
    cold ? styles.coldRow : '',
    finish === 'basket' ? styles.basketRow : ''
  ].filter(Boolean).join(' ');

  return (
    <li className={className}>
      <EventArt art={FINISH_ART[finish] ?? MELON_VARIETIES[variety].art} size={20} />
      <span className={styles.finishName}>
        {name}
        {cold && heatwave && <span className={styles.heatNote}>Heatwave +{C.HEATWAVE_COLD_BONUS * 100}%</span>}
      </span>
      <span className={styles.finishCount}>
        {total}
        {sugar > 0 && (
          <span className={styles.sugarChip} title={`${sugar} of them ${sugar === 1 ? 'is a Sugar Melon' : 'are Sugar Melons'}, worth double`}>
            <EventArt art={SUMMER_ART.sugarMelon} size={12} alt="Sugar Melons" />{sugar}
          </span>
        )}
      </span>
      <span className={styles.finishPrice}>
        <span className="sr-only">Price: </span>{priceText} <Ticket size={14} />
      </span>
      <button
        type="button"
        className={styles.sellButton}
        onClick={() => onSell(variety, finish)}
        disabled={total === 0}
        aria-label={total > 0
          ? `Sell ${label} for ${formatNumber(value, 1)} Tickets`
          : `Sell: no ${name} ${MELON_VARIETIES[variety].plural} in stock`}
      >
        Sell
      </button>
    </li>
  );
});

FinishRow.displayName = 'FinishRow';

interface MelonCardProps {
  variety: StockMelon;
  inventory: MelonInventory;
  upgrades: EventUpgrade[];
  demandMultiplier: number;
  heatwave: boolean;
  onSell: (variety: StockMelon, finish: MelonFinish) => void;
  formatNumber: FormatNumber;
}

const MelonCard: FC<MelonCardProps> = memo(({ variety, inventory, upgrades, demandMultiplier, heatwave, onSell, formatNumber }) => {
  const definition = MELON_VARIETIES[variety];
  const inStock = MELON_FINISH_ORDER.reduce((sum, finish) =>
    sum + (inventory[melonKey(variety, 'normal', finish)] ?? 0) + (inventory[melonKey(variety, 'sugar', finish)] ?? 0), 0);

  return (
    <section className={styles.melonCard} aria-label={definition.plural}>
      <div className={styles.cardHeader}>
        <EventArt art={definition.art} size={24} />
        <h3 className={styles.cardName}>{definition.name}</h3>
        <span className={styles.cardStock}>{inStock} in stock</span>
      </div>
      <ul className={styles.finishRows}>
        {MELON_FINISH_ORDER.map(finish => (
          <FinishRow
            key={finish}
            variety={variety}
            finish={finish}
            normal={inventory[melonKey(variety, 'normal', finish)] ?? 0}
            sugar={inventory[melonKey(variety, 'sugar', finish)] ?? 0}
            upgrades={upgrades}
            demandMultiplier={demandMultiplier}
            heatwave={heatwave}
            onSell={onSell}
            formatNumber={formatNumber}
          />
        ))}
      </ul>
    </section>
  );
});

MelonCard.displayName = 'MelonCard';

// ============================================================================
// GIANT SHELF
// ============================================================================

interface GiantShelfProps {
  shelf: GiantMelon[];
  heaviest: number;
  upgrades: EventUpgrade[];
  demandMultiplier: number;
  onSell: (giantId: string) => void;
}

/** Giants shown on the card; the rest wait below the fold of the shelf */
const SHELF_ROWS = 4;

const GiantShelf: FC<GiantShelfProps> = memo(({ shelf, heaviest, upgrades, demandMultiplier, onSell }) => {
  // Heaviest first: the one most worth selling, or keeping
  const sorted = [...shelf].sort((a, b) => b.weight - a.weight);
  const shown = sorted.slice(0, SHELF_ROWS);
  const more = sorted.length - shown.length;

  return (
    <section className={styles.melonCard} aria-label="Carolina Cross shelf">
      <div className={styles.cardHeader}>
        <EventArt art={MELON_VARIETIES.carolinaCross.art} size={24} />
        <h3 className={styles.cardName}>{MELON_VARIETIES.carolinaCross.name}</h3>
        <span className={styles.cardStock}>Shelf {shelf.length} / {C.MAX_GIANT_SHELF}</span>
      </div>
      {shelf.length === 0 ? (
        <p className={styles.shelfEmpty}>
          Giants go on the shelf when you harvest them, and sell by the pound: 1 Ticket for every {C.POUNDS_PER_TICKET} lb.
        </p>
      ) : (
        <ul className={styles.finishRows}>
          {shown.map(giant => {
            const price = getGiantSaleTickets(giant.weight, upgrades, demandMultiplier);
            return (
              <li key={giant.id} className={styles.giantRow}>
                <EventArt art={MELON_VARIETIES.carolinaCross.art} size={20} />
                <span className={styles.finishName}>{giant.weight} lb</span>
                <span className={styles.finishPrice}>{price} <Ticket size={14} /></span>
                <button
                  type="button"
                  className={styles.sellButton}
                  onClick={() => onSell(giant.id)}
                  aria-label={`Sell the ${giant.weight} lb Carolina Cross for ${price} Tickets`}
                >
                  Sell
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className={styles.shelfNote}>
        {more > 0 ? `${more} more on the shelf. ` : ''}
        {heaviest > 0 ? `Heaviest grown: ${heaviest} lb. ` : ''}The world record is {C.WORLD_RECORD_WEIGHT} lb.
      </p>
    </section>
  );
});

GiantShelf.displayName = 'GiantShelf';

// ============================================================================
// GOODS
// ============================================================================

interface GoodCardProps {
  good: SummerGood;
  stock: number;
  heatwave: boolean;
  onSell: (good: SummerGood, quantity: number) => void;
  formatNumber: FormatNumber;
}

const GoodCard: FC<GoodCardProps> = memo(({ good, stock, heatwave, onSell, formatNumber }) => {
  const name = SUMMER_GOOD_NAMES[good];
  const cold = COLD_GOODS.includes(good);
  const price = getGoodPrice(good, heatwave);

  return (
    <section className={stock > 0 ? styles.goodCard : `${styles.goodCard} ${styles.emptyGood}`} aria-label={name}>
      <div className={styles.goodHeader}>
        <h3 className={styles.goodTitle}>
          <EventArt art={GOOD_ART[good]} size={20} /> {name}
        </h3>
        <span className={styles.goodPrice}>{formatNumber(price, 1)} <Ticket size={14} /></span>
      </div>
      <span className={styles.goodStock}>
        In stock: {formatNumber(stock, 1)}
        {cold && <span className={styles.goodHint}>{heatwave ? ' · Heatwave price' : ` · ${formatNumber(getGoodPrice(good, true), 1)} in a Heatwave`}</span>}
      </span>
      <button
        type="button"
        className={styles.sellButton}
        onClick={() => onSell(good, stock)}
        disabled={stock < 1}
        aria-label={`Sell all ${goodLabel(good, stock)} for ${formatNumber(getGoodSaleTickets(good, stock, heatwave), 1)} Tickets`}
      >
        Sell All
      </button>
    </section>
  );
});

GoodCard.displayName = 'GoodCard';

// ============================================================================
// FESTIVAL GROUNDS TAB
// ============================================================================

interface FestivalGroundsTabProps {
  event: UseSummerEventReturn;
  formatNumber: FormatNumber;
}

const FestivalGroundsTab: FC<FestivalGroundsTabProps> = memo(({ event, formatNumber }) => {
  const {
    eventState,
    tickets,
    inventory,
    giantShelf,
    materials,
    sellMelons,
    sellAllMelons,
    sellGiant,
    sellGoods,
    claimDailyBonus,
    dailyBonusAvailable,
    demandMultiplier,
    passiveTicketsPerSecond,
    totalMelonsSold,
    isHeatwave,
    purchaseUpgrade,
  } = event;
  const { upgrades, personalBest } = eventState;

  const unlocked = STOCK_MELONS.filter(variety => ownsUpgrade(upgrades, MELON_VARIETIES[variety].unlockUpgrade));
  const showShelf = ownsUpgrade(upgrades, 'unlock_carolina_cross') || giantShelf.length > 0;
  const melonsInStock = countMelons(inventory);
  const sellAllValue = useMemo(
    () => inventorySaleTickets(inventory, upgrades, demandMultiplier, isHeatwave),
    [inventory, upgrades, demandMultiplier, isHeatwave]
  );

  // A row sells every melon of that kind and finish, normal ones first
  const sellRow = (variety: StockMelon, finish: MelonFinish) => {
    for (const quality of ['normal', 'sugar'] as const) {
      const key = melonKey(variety, quality, finish);
      const quantity = inventory[key] ?? 0;
      if (quantity > 0) sellMelons(key, quantity);
    }
  };

  const hasParade = ownsUpgrade(upgrades, 'parade_route');
  const customerLine = SUMMER_CUSTOMER_MESSAGES[totalMelonsSold % SUMMER_CUSTOMER_MESSAGES.length];

  const mainContent = (
    <div className={frame.container}>
      {/* Left column: the stall bar, the melon cards and shelf, Sell all and the goods */}
      <div className={frame.leftColumn}>
        <div className={styles.stallBar}>
          <h2 className={frame.sectionTitle}>
            <EventArt art={SUMMER_ART.grounds} size={26} /> Festival Grounds
          </h2>
          <div className={styles.demand}>
            <span className={styles.demandMultiplier}>Demand ×{demandMultiplier.toFixed(2)}</span>
            <span className={styles.demandHint}>
              {demandMultiplier >= C.MAX_DEMAND_MULTIPLIER ? 'Holds until Labor Day' : 'Peaks on the Fourth of July'}
            </span>
          </div>

          {isHeatwave && (
            <section className={styles.heatwave} aria-label="Heatwave">
              <span className={styles.barTitle}>Heatwave</span>
              <span className={styles.barHint}>Cold goods +{C.HEATWAVE_COLD_BONUS * 100}%</span>
            </section>
          )}

          <div className={styles.barTiles}>
            {hasParade && (
              <section className={styles.tile} aria-label="Daily bonus">
                <EventArt art={SUMMER_ART.parade} size={26} />
                <div className={styles.barText}>
                  <h3 className={styles.barTitle}>Parade Route</h3>
                  <button
                    type="button"
                    className={styles.claimButton}
                    onClick={() => claimDailyBonus()}
                    disabled={!dailyBonusAvailable}
                    title="The parade brings a crowd past the stand once a day"
                  >
                    {dailyBonusAvailable
                      ? <>Claim +{C.DAILY_BONUS} <Ticket /></>
                      : 'Claimed. Back tomorrow!'}
                  </button>
                </div>
              </section>
            )}

            {passiveTicketsPerSecond > 0 && (
              <section className={styles.tile} aria-label="Carousel income">
                <EventArt art={SUMMER_ART.carousel} size={26} />
                <div className={styles.barText}>
                  <h3 className={styles.barTitle}>Carousel</h3>
                  <p className={styles.barHint}>
                    {passiveTicketsPerSecond < 1
                      ? `1 Ticket every ${formatNumber(1 / passiveTicketsPerSecond, 1)} seconds`
                      : `${formatNumber(passiveTicketsPerSecond, 2)} Tickets a second`}
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>

        <div className={styles.melonCards}>
          {unlocked.map(variety => (
            <MelonCard
              key={variety}
              variety={variety}
              inventory={inventory}
              upgrades={upgrades}
              demandMultiplier={demandMultiplier}
              heatwave={isHeatwave}
              onSell={sellRow}
              formatNumber={formatNumber}
            />
          ))}
          {showShelf && (
            <GiantShelf
              shelf={giantShelf}
              heaviest={personalBest.weight}
              upgrades={upgrades}
              demandMultiplier={demandMultiplier}
              onSell={sellGiant}
            />
          )}
        </div>

        <div className={styles.sellAllRow}>
          <button
            type="button"
            className={styles.sellEverythingButton}
            onClick={sellAllMelons}
            disabled={melonsInStock === 0}
            aria-label={melonsInStock > 0
              ? `Sell all melons: ${melonsInStock} for ${formatNumber(sellAllValue, 1)} Tickets`
              : 'Sell all melons: none in stock'}
          >
            {melonsInStock > 0
              ? <>Sell all melons ({formatNumber(melonsInStock, 1)} for {formatNumber(sellAllValue, 1)} <Ticket />)</>
              : 'No melons to sell. Harvest some in the Melon Patch.'}
          </button>
          <span className={styles.customerLine}>{customerLine}</span>
        </div>

        {/* Goods sold on their own */}
        <div className={styles.goodsRow}>
          {SUMMER_GOOD_ORDER.map(good => (
            <GoodCard
              key={good}
              good={good}
              stock={materials[good]}
              heatwave={isHeatwave}
              onSell={sellGoods}
              formatNumber={formatNumber}
            />
          ))}
        </div>
      </div>

      {/* Right column: Grounds upgrades */}
      <div className={frame.rightColumn}>
        <EventUpgradesPanel
          title="Grounds Upgrades"
          category="shopfront"
          upgrades={upgrades}
          currency="tickets"
          balance={tickets}
          purchaseUpgrade={purchaseUpgrade}
          formatNumber={formatNumber}
        />
      </div>
    </div>
  );

  return (
    <BaseTab
      isUnlocked={true}
      mainContent={mainContent}
    />
  );
});

FestivalGroundsTab.displayName = 'FestivalGroundsTab';

export default FestivalGroundsTab;

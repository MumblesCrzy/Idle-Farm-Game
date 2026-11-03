/**
 * Market Stall Tab Component
 *
 * Sells bunches and goods for the Spring Farmer's Market. Mockup B, as picked:
 * - A bar with the market demand, the Busker and the Sandwich Board
 * - The Cart as a panel: what is loaded, the Market Day countdown, Everything to
 *   the Cart and Unload. Market Day sells the load for half again.
 * - One card per unlocked flower with a row per finish, each with its stock, price,
 *   Sell and To Cart. Rows with nothing in stock are greyed, not hidden, so the
 *   cards never change height.
 * - The goods, six to a row
 */

import { memo, useId, useMemo, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt, { type EventArtSource } from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import ProgressBar from './ProgressBar';
import type { UseSpringEventReturn } from '../hooks/useSpringEvent';
import type { EventUpgrade } from '../types/eventUpgrades';
import type { FlowerFinish, FlowerInventory, FlowerVariety, SpringCart, SpringGood } from '../types/springEvent';
import {
  FLOWER_FINISH_NAMES,
  FLOWER_FINISH_ORDER,
  FLOWER_ORDER,
  FLOWER_VARIETIES,
  SPRING_ART,
  SPRING_EVENT_CONSTANTS,
  SPRING_GOOD_NAMES,
  SPRING_GOOD_ORDER
} from '../data/springEventData';
import {
  bunchLabel,
  countBunches,
  flowerKey,
  floorPetals,
  getCartPetals,
  getFlowerPrice,
  getFlowerSalePetals,
  getSaleMultiplier,
  goodLabel,
  marketDayInterval,
  ownsUpgrade,
  parseFlowerKey
} from '../utils/springPricing';
import frame from './SpringSections.module.css';
import styles from './MarketStallTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

const C = SPRING_EVENT_CONSTANTS;

/** Small Petal icon that screen readers read as the currency name */
const Petal: FC<{ size?: number }> = ({ size = 16 }) => (
  <EventArt art={SPRING_ART.petals} size={size} alt="Petals" className={styles.currencyIcon} />
);

/** The art beside each finish on a flower card; plain bunches use the flower's own */
const FINISH_ART: Record<FlowerFinish, EventArtSource | null> = {
  plain: null,
  arranged: SPRING_ART.greenery,
  scented: SPRING_ART.lavender,
  bouquet: SPRING_ART.bouquet,
};

const GOOD_ART: Record<SpringGood, EventArtSource> = {
  greenery: SPRING_ART.greenery,
  lavender: SPRING_ART.lavender,
  mintTea: SPRING_ART.mintTea,
  chamomileTea: SPRING_ART.chamomileTea,
  pesto: SPRING_ART.pesto,
  packets: SPRING_ART.packets,
};

/** Petals from Sell all bunches, priced the way sellAllFlowers prices it (tips excluded) */
function inventorySalePetals(inventory: FlowerInventory, upgrades: EventUpgrade[], demandMultiplier: number): number {
  let value = 0;
  for (const [key, quantity] of Object.entries(inventory)) {
    if (quantity > 0) value += getFlowerPrice(key, upgrades, demandMultiplier) * quantity;
  }
  return floorPetals(value * getSaleMultiplier(upgrades));
}

/** What is on the Cart, as chips: bunches by flower and finish (any quality), then goods */
function cartChips(cart: SpringCart): Array<{ id: string; label: string; art: EventArtSource }> {
  const chips: Array<{ id: string; label: string; art: EventArtSource }> = [];
  for (const variety of FLOWER_ORDER) {
    for (const finish of FLOWER_FINISH_ORDER) {
      const count = (cart.bunches[flowerKey(variety, 'normal', finish)] ?? 0) + (cart.bunches[flowerKey(variety, 'prize', finish)] ?? 0);
      if (count > 0) {
        chips.push({ id: `${variety}_${finish}`, label: bunchLabel(variety, finish, count), art: FINISH_ART[finish] ?? FLOWER_VARIETIES[variety].art });
      }
    }
  }
  for (const good of SPRING_GOOD_ORDER) {
    const count = cart.goods[good] ?? 0;
    if (count > 0) chips.push({ id: good, label: goodLabel(good, count), art: GOOD_ART[good] });
  }
  return chips;
}

/** Chips shown on the Cart before the rest are counted as "more" */
const CART_CHIP_LIMIT = 4;

// ============================================================================
// THE CART
// ============================================================================

interface CartPanelProps {
  cart: SpringCart;
  daysUntilMarket: number;
  interval: number;
  value: number;
  lastResult: { bunches: number; goods: number; petals: number } | null;
  canLoad: boolean;
  onLoadEverything: () => void;
  onUnload: () => void;
  formatNumber: FormatNumber;
}

const CartPanel: FC<CartPanelProps> = memo(({
  cart,
  daysUntilMarket,
  interval,
  value,
  lastResult,
  canLoad,
  onLoadEverything,
  onUnload,
  formatNumber
}) => {
  const titleId = useId();
  const chips = cartChips(cart);
  const shown = chips.length > CART_CHIP_LIMIT ? chips.slice(0, CART_CHIP_LIMIT - 1) : chips;
  const more = chips.length - shown.length;
  const loaded = chips.length > 0;
  const days = Math.max(0, Math.ceil(daysUntilMarket));

  return (
    <section className={styles.cart} aria-labelledby={titleId}>
      <EventArt art={SPRING_ART.cart} size={40} />
      <div className={styles.cartHead}>
        <h3 id={titleId} className={styles.cartTitle}>The Cart</h3>
        <div className={styles.countdown}>
          <div
            className={styles.countdownBar}
            role="progressbar"
            aria-label="Days to Market Day"
            aria-valuemin={0}
            aria-valuemax={interval}
            aria-valuenow={interval - days}
          >
            <ProgressBar value={Math.max(0, interval - days)} max={interval} height={8} color="#6B4C9A" />
          </div>
          <span>Market Day in {days} day{days === 1 ? '' : 's'}</span>
        </div>
      </div>

      <ul className={styles.cartContents} aria-label="On the Cart">
        {loaded ? (
          <>
            {shown.map(chip => (
              <li key={chip.id} className={styles.cartChip}>
                <EventArt art={chip.art} size={16} /> {chip.label}
              </li>
            ))}
            {more > 0 && <li className={styles.cartChip}>and {more} more</li>}
          </>
        ) : (
          <li className={styles.cartEmpty}>
            Empty. What you put on the Cart sells for half again on Market Day.
          </li>
        )}
      </ul>

      <div className={styles.cartActions}>
        <span className={styles.cartValue}>
          {loaded ? (
            <>Sells on Market Day for {formatNumber(value, 1)} <Petal /> (+{C.MARKET_DAY_BONUS * 100}%)</>
          ) : lastResult ? (
            <>Last Market Day: {formatNumber(lastResult.bunches + lastResult.goods, 1)} sold for {formatNumber(lastResult.petals, 1)} <Petal /></>
          ) : (
            'Nothing sold on Market Day yet'
          )}
        </span>
        <div className={styles.cartButtons}>
          <button
            type="button"
            className={styles.loadButton}
            onClick={onLoadEverything}
            disabled={!canLoad}
            title="Every bunch and crafted good in stock. Greenery and lavender stay for finishing."
          >
            Everything to the Cart
          </button>
          <button
            type="button"
            className={styles.unloadButton}
            onClick={onUnload}
            disabled={!loaded}
            aria-label="Unload the Cart back into stock"
          >
            Unload
          </button>
        </div>
      </div>
    </section>
  );
});

CartPanel.displayName = 'CartPanel';

// ============================================================================
// FLOWER CARD
// ============================================================================

interface FinishRowProps {
  variety: FlowerVariety;
  finish: FlowerFinish;
  normal: number;
  prize: number;
  upgrades: EventUpgrade[];
  demandMultiplier: number;
  onSell: (variety: FlowerVariety, finish: FlowerFinish) => void;
  onLoad: (variety: FlowerVariety, finish: FlowerFinish) => void;
  formatNumber: FormatNumber;
}

const FinishRow: FC<FinishRowProps> = memo(({ variety, finish, normal, prize, upgrades, demandMultiplier, onSell, onLoad, formatNumber }) => {
  const total = normal + prize;
  const normalKey = flowerKey(variety, 'normal', finish);
  const prizeKey = flowerKey(variety, 'prize', finish);
  // What one bunch sells for, priced the same way a sale is; the range when Prize Blooms are in the row
  const normalPrice = getFlowerSalePetals(normalKey, 1, upgrades, demandMultiplier);
  const prizePrice = getFlowerSalePetals(prizeKey, 1, upgrades, demandMultiplier);
  const priceText = prize > 0 && normal > 0 ? `${normalPrice}-${prizePrice}` : String(prize > 0 ? prizePrice : normalPrice);
  const value = getFlowerSalePetals(normalKey, normal, upgrades, demandMultiplier) + getFlowerSalePetals(prizeKey, prize, upgrades, demandMultiplier);
  const label = bunchLabel(variety, finish, total);

  return (
    <li className={total > 0 ? styles.finishRow : `${styles.finishRow} ${styles.emptyRow}`}>
      <EventArt art={FINISH_ART[finish] ?? FLOWER_VARIETIES[variety].art} size={20} />
      <span className={styles.finishName}>{FLOWER_FINISH_NAMES[finish]}</span>
      <span className={styles.finishCount}>
        {total}
        {prize > 0 && (
          <span className={styles.prizeChip} title={`${prize} of them ${prize === 1 ? 'is a Prize Bloom' : 'are Prize Blooms'}, worth double`}>
            <EventArt art={SPRING_ART.prizeBloom} size={12} alt="Prize Blooms" />{prize}
          </span>
        )}
      </span>
      <span className={styles.finishPrice}>
        <span className="sr-only">Price: </span>{priceText} <Petal size={14} />
      </span>
      <button
        type="button"
        className={styles.sellButton}
        onClick={() => onSell(variety, finish)}
        disabled={total === 0}
        aria-label={total > 0 ? `Sell ${label} for ${formatNumber(value, 1)} Petals` : `Sell: no ${FLOWER_FINISH_NAMES[finish]} ${FLOWER_VARIETIES[variety].plural} in stock`}
      >
        Sell
      </button>
      <button
        type="button"
        className={styles.cartButton}
        onClick={() => onLoad(variety, finish)}
        disabled={total === 0}
        aria-label={total > 0 ? `Put ${label} on the Cart` : `To Cart: no ${FLOWER_FINISH_NAMES[finish]} ${FLOWER_VARIETIES[variety].plural} in stock`}
      >
        To Cart
      </button>
    </li>
  );
});

FinishRow.displayName = 'FinishRow';

interface FlowerCardProps {
  variety: FlowerVariety;
  inventory: FlowerInventory;
  upgrades: EventUpgrade[];
  demandMultiplier: number;
  onSell: (variety: FlowerVariety, finish: FlowerFinish) => void;
  onLoad: (variety: FlowerVariety, finish: FlowerFinish) => void;
  formatNumber: FormatNumber;
}

const FlowerCard: FC<FlowerCardProps> = memo(({ variety, inventory, upgrades, demandMultiplier, onSell, onLoad, formatNumber }) => {
  const definition = FLOWER_VARIETIES[variety];
  const inStock = Object.entries(inventory)
    .filter(([key]) => parseFlowerKey(key).variety === variety)
    .reduce((sum, [, quantity]) => sum + quantity, 0);

  return (
    <section className={styles.flowerCard} aria-label={definition.plural}>
      <div className={styles.flowerHeader}>
        <EventArt art={definition.art} size={24} />
        <h3 className={styles.flowerName}>{definition.plural}</h3>
        <span className={styles.flowerStock}>{inStock} in stock</span>
      </div>
      <ul className={styles.finishRows}>
        {FLOWER_FINISH_ORDER.map(finish => (
          <FinishRow
            key={finish}
            variety={variety}
            finish={finish}
            normal={inventory[flowerKey(variety, 'normal', finish)] ?? 0}
            prize={inventory[flowerKey(variety, 'prize', finish)] ?? 0}
            upgrades={upgrades}
            demandMultiplier={demandMultiplier}
            onSell={onSell}
            onLoad={onLoad}
            formatNumber={formatNumber}
          />
        ))}
      </ul>
    </section>
  );
});

FlowerCard.displayName = 'FlowerCard';

// ============================================================================
// GOODS
// ============================================================================

interface GoodCardProps {
  good: SpringGood;
  stock: number;
  onSell: (good: SpringGood, quantity: number) => void;
  onLoad: (good: SpringGood, quantity: number) => void;
  formatNumber: FormatNumber;
}

const GoodCard: FC<GoodCardProps> = memo(({ good, stock, onSell, onLoad, formatNumber }) => {
  const price = C.GOOD_PRICES[good];
  const name = SPRING_GOOD_NAMES[good];

  return (
    <section className={stock > 0 ? styles.goodCard : `${styles.goodCard} ${styles.emptyGood}`} aria-label={name}>
      <div className={styles.goodHeader}>
        <h3 className={styles.goodTitle}>
          <EventArt art={GOOD_ART[good]} size={20} /> {name}
        </h3>
        <span className={styles.goodPrice}>{price} <Petal size={14} /></span>
      </div>
      <span className={styles.goodStock}>In Stock: {formatNumber(stock, 1)}</span>
      <div className={styles.goodButtons}>
        <button
          type="button"
          className={styles.sellButton}
          onClick={() => onSell(good, stock)}
          disabled={stock < 1}
          aria-label={`Sell all ${goodLabel(good, stock)} for ${formatNumber(price * stock, 1)} Petals`}
        >
          Sell All
        </button>
        <button
          type="button"
          className={styles.cartButton}
          onClick={() => onLoad(good, stock)}
          disabled={stock < 1}
          aria-label={`Put ${goodLabel(good, stock)} on the Cart`}
        >
          To Cart
        </button>
      </div>
    </section>
  );
});

GoodCard.displayName = 'GoodCard';

// ============================================================================
// MARKET STALL TAB
// ============================================================================

interface MarketStallTabProps {
  event: UseSpringEventReturn;
  formatNumber: FormatNumber;
}

const MarketStallTab: FC<MarketStallTabProps> = memo(({ event, formatNumber }) => {
  const {
    eventState,
    petals,
    cart,
    daysUntilMarket,
    sellFlowers,
    sellAllFlowers,
    sellGoods,
    loadBunches,
    loadGoods,
    loadEverything,
    unloadCart,
    claimDailyBonus,
    dailyBonusAvailable,
    demandMultiplier,
    passivePetalsPerSecond,
    purchaseUpgrade,
  } = event;
  const { inventory, materials, upgrades, market } = eventState;

  const unlocked = FLOWER_ORDER.filter(variety => ownsUpgrade(upgrades, FLOWER_VARIETIES[variety].unlockUpgrade));
  const bunchesInStock = countBunches(inventory);
  const sellAllValue = useMemo(
    () => inventorySalePetals(inventory, upgrades, demandMultiplier),
    [inventory, upgrades, demandMultiplier]
  );
  const cartValue = useMemo(
    () => getCartPetals(cart, upgrades, demandMultiplier),
    [cart, upgrades, demandMultiplier]
  );
  const craftedInStock = materials.mintTea + materials.chamomileTea + materials.pesto + materials.packets;

  // A row sells or loads every bunch of that flower and finish, normal ones first
  const sellRow = (variety: FlowerVariety, finish: FlowerFinish) => {
    for (const quality of ['normal', 'prize'] as const) {
      const key = flowerKey(variety, quality, finish);
      const quantity = inventory[key] ?? 0;
      if (quantity > 0) sellFlowers(key, quantity);
    }
  };
  const loadRow = (variety: FlowerVariety, finish: FlowerFinish) => {
    for (const quality of ['normal', 'prize'] as const) {
      const key = flowerKey(variety, quality, finish);
      const quantity = inventory[key] ?? 0;
      if (quantity > 0) loadBunches(key, quantity);
    }
  };

  const hasSandwichBoard = ownsUpgrade(upgrades, 'sandwich_board');

  const mainContent = (
    <div className={frame.container}>
      {/* Left column: the stall bar, the Cart, the flower cards and the goods */}
      <div className={frame.leftColumn}>
        <div className={styles.stallBar}>
          <div className={styles.demand}>
            <EventArt art={SPRING_ART.stall} size={24} />
            <span className={styles.demandLabel}>Market Demand:</span>
            <span className={styles.demandMultiplier}>×{demandMultiplier.toFixed(2)}</span>
            <span className={styles.demandHint}>
              {demandMultiplier >= C.MAX_DEMAND_MULTIPLIER ? '(holds until Memorial Day)' : "(rises toward Mother's Day)"}
            </span>
          </div>

          {passivePetalsPerSecond > 0 && (
            <section className={styles.busker} aria-label="Busker income">
              <EventArt art={SPRING_ART.busker} size={30} />
              <div className={styles.barText}>
                <h3 className={styles.barTitle}>
                  Busker: +{formatNumber(passivePetalsPerSecond, 2)} <Petal /> per second
                </h3>
                <p className={styles.barHint}>
                  {passivePetalsPerSecond < 1
                    ? `1 Petal every ${formatNumber(1 / passivePetalsPerSecond, 1)} seconds`
                    : 'Playing requests by the stall'}
                </p>
              </div>
            </section>
          )}

          {hasSandwichBoard && (
            <section className={styles.board} aria-label="Daily bonus">
              <EventArt art={SPRING_ART.sandwichBoard} size={30} />
              <div className={styles.barText}>
                <h3 className={styles.barTitle}>Sandwich Board</h3>
                <button
                  type="button"
                  className={styles.claimButton}
                  onClick={() => claimDailyBonus()}
                  disabled={!dailyBonusAvailable}
                  title="Regulars stop by once a day for today's special"
                >
                  {dailyBonusAvailable
                    ? <>Claim daily bonus +{C.DAILY_BONUS} <Petal /></>
                    : 'Claimed. Come back tomorrow!'}
                </button>
              </div>
            </section>
          )}
        </div>

        <CartPanel
          cart={cart}
          daysUntilMarket={daysUntilMarket}
          interval={marketDayInterval(upgrades)}
          value={cartValue}
          lastResult={market.lastResult}
          canLoad={bunchesInStock + craftedInStock > 0}
          onLoadEverything={loadEverything}
          onUnload={unloadCart}
          formatNumber={formatNumber}
        />

        <div className={styles.flowerCards}>
          {unlocked.map(variety => (
            <FlowerCard
              key={variety}
              variety={variety}
              inventory={inventory}
              upgrades={upgrades}
              demandMultiplier={demandMultiplier}
              onSell={sellRow}
              onLoad={loadRow}
              formatNumber={formatNumber}
            />
          ))}
        </div>

        <button
          type="button"
          className={styles.sellEverythingButton}
          onClick={sellAllFlowers}
          disabled={bunchesInStock === 0}
          aria-label={bunchesInStock > 0
            ? `Sell all bunches: ${bunchesInStock} for ${formatNumber(sellAllValue, 1)} Petals`
            : 'Sell all bunches: none in stock'}
        >
          {bunchesInStock > 0
            ? <>Sell all bunches ({formatNumber(bunchesInStock, 1)} for {formatNumber(sellAllValue, 1)} <Petal />)</>
            : 'No bunches to sell. Harvest some in the Flower Beds.'}
        </button>

        {/* Goods sold on their own */}
        <div className={styles.goodsRow}>
          {SPRING_GOOD_ORDER.map(good => (
            <GoodCard
              key={good}
              good={good}
              stock={materials[good]}
              onSell={sellGoods}
              onLoad={loadGoods}
              formatNumber={formatNumber}
            />
          ))}
        </div>
      </div>

      {/* Right column: Stall upgrades */}
      <div className={frame.rightColumn}>
        <EventUpgradesPanel
          title="Stall Upgrades"
          category="shopfront"
          upgrades={upgrades}
          currency="petals"
          balance={petals}
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

MarketStallTab.displayName = 'MarketStallTab';

export default MarketStallTab;

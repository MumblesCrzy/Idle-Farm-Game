/**
 * Farm-wide upgrades, in the Growing tab's tool shed under the picked crop's upgrades: one
 * compact row each, with the Merchant's countdown on its row once hired.
 */
import type { FC, ReactNode } from 'react';
import styles from './GlobalUpgradesPanel.module.css';
import {
  UPGRADE_FARMERS_ALMANAC,
  UPGRADE_IRRIGATION,
  UPGRADE_MERCHANT,
  UPGRADE_GREENHOUSE,
  UPGRADE_HEIRLOOM_SEEDS
} from '../config/assetPaths';
import {
  MERCHANT_DAYS,
  MERCHANT_COST,
  MERCHANT_KN_COST,
  GREENHOUSE_COST_PER_PLOT,
  GREENHOUSE_KN_COST_PER_PLOT,
  HEIRLOOM_COST_PER_VEGGIE,
  HEIRLOOM_KN_PER_VEGGIE
} from '../config/gameConstants';
import { VEGGIE_CONFIGS } from '../data/veggieConfigs';
import { FRUIT_CONFIGS } from '../data/fruitConfigs';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

/** Crop names in game order: vegetables, then fruits */
const CROP_NAMES = [...VEGGIE_CONFIGS, ...FRUIT_CONFIGS].map(config => config.name);

interface GlobalUpgradesPanelProps {
  money: number;
  knowledge: number;
  day: number;
  maxPlots: number;
  highestUnlockedVeggie: number;
  almanacLevel: number;
  almanacCost: number;
  irrigationOwned: boolean;
  irrigationCost: number;
  irrigationKnCost: number;
  autoSellOwned: boolean;
  greenhouseOwned: boolean;
  heirloomOwned: boolean;
  heirloomMoneyCost: number;
  heirloomKnowledgeCost: number;
  handleBuyAlmanac: () => void;
  handleBuyIrrigation: () => void;
  handleBuyAutoSell: () => void;
  handleBuyGreenhouse: () => void;
  handleBuyHeirloom: () => void;
  formatNumber: FormatNumber;
}

interface FarmUpgradeRowProps {
  icon: string;
  name: string;
  /** The level badge, for the Almanac */
  level?: number;
  effect: string;
  /** A one-time upgrade already bought shows Owned instead of a price */
  owned?: boolean;
  cost: number;
  knowledgeCost?: number;
  money: number;
  knowledge: number;
  title: string;
  onBuy: () => void;
  /** Drawn under the effect, as the Merchant's countdown is */
  footer?: ReactNode;
  formatNumber: FormatNumber;
}

const FarmUpgradeRow: FC<FarmUpgradeRowProps> = ({
  icon,
  name,
  level,
  effect,
  owned = false,
  cost,
  knowledgeCost = 0,
  money,
  knowledge,
  title,
  onBuy,
  footer,
  formatNumber
}) => {
  const canAfford = money >= cost && knowledge >= knowledgeCost;
  const price = knowledgeCost > 0
    ? `$${formatNumber(cost, 1)} · ${formatNumber(knowledgeCost, 1)} Kn`
    : `$${formatNumber(cost, 1)}`;

  return (
    <div className={styles.row} title={title}>
      <img src={icon} alt="" aria-hidden="true" className={styles.icon} />
      <div className={styles.info}>
        <span className={styles.name}>
          {name}
          {level !== undefined && <span className={styles.level}>Lv {level}</span>}
        </span>
        <span className={styles.effect}>{effect}</span>
        {footer}
      </div>
      {owned ? (
        <span className={styles.owned}>Owned</span>
      ) : (
        <button
          type="button"
          className={canAfford ? styles.buyAfford : styles.buyShort}
          onClick={onBuy}
          disabled={!canAfford}
          aria-label={`Buy ${name} for ${price}`}
        >
          {price}
        </button>
      )}
    </div>
  );
};

const GlobalUpgradesPanel: FC<GlobalUpgradesPanelProps> = ({
  money,
  knowledge,
  day,
  maxPlots,
  highestUnlockedVeggie,
  almanacLevel,
  almanacCost,
  irrigationOwned,
  irrigationCost,
  irrigationKnCost,
  autoSellOwned,
  greenhouseOwned,
  heirloomOwned,
  heirloomMoneyCost,
  heirloomKnowledgeCost,
  handleBuyAlmanac,
  handleBuyIrrigation,
  handleBuyAutoSell,
  handleBuyGreenhouse,
  handleBuyHeirloom,
  formatNumber
}) => {
  const merchantDay = day % MERCHANT_DAYS;
  const shared = { money, knowledge, formatNumber };

  return (
    <section className={styles.panel} aria-labelledby="farm-upgrades-title">
      <h3 id="farm-upgrades-title" className={styles.title}>Farm Upgrades</h3>

      <FarmUpgradeRow
        {...shared}
        icon={UPGRADE_FARMERS_ALMANAC}
        name="Almanac"
        level={almanacLevel}
        effect={`Knowledge +${almanacLevel * 10}%`}
        cost={almanacCost}
        title="Each level increases knowledge gained by 10%"
        onBuy={handleBuyAlmanac}
      />

      <FarmUpgradeRow
        {...shared}
        icon={UPGRADE_IRRIGATION}
        name="Irrigation"
        effect="+15% growth, no drought"
        owned={irrigationOwned}
        cost={irrigationCost}
        knowledgeCost={irrigationKnCost}
        title="Negates drought penalty and provides +15% growth rate bonus."
        onBuy={handleBuyIrrigation}
      />

      <FarmUpgradeRow
        {...shared}
        icon={UPGRADE_MERCHANT}
        name="Merchant"
        effect={autoSellOwned
          ? `Next sale in ${MERCHANT_DAYS - merchantDay} days`
          : `Sells the stash every ${MERCHANT_DAYS} days`}
        owned={autoSellOwned}
        cost={MERCHANT_COST}
        knowledgeCost={MERCHANT_KN_COST}
        title={`Sells all veggies in your stash every ${MERCHANT_DAYS} days.`}
        onBuy={handleBuyAutoSell}
        footer={autoSellOwned ? (
          <span className={styles.merchantBar} aria-hidden="true">
            <span style={{ width: `${(merchantDay / MERCHANT_DAYS) * 100}%` }} />
          </span>
        ) : undefined}
      />

      <FarmUpgradeRow
        {...shared}
        icon={UPGRADE_GREENHOUSE}
        name="Greenhouse"
        effect="No winter slowdown"
        owned={greenhouseOwned}
        cost={GREENHOUSE_COST_PER_PLOT * maxPlots}
        knowledgeCost={GREENHOUSE_KN_COST_PER_PLOT * maxPlots}
        title={`Negates winter growth penalty. Cost is based max plots for your current farm: (${maxPlots} × $${formatNumber(GREENHOUSE_COST_PER_PLOT, 1)} & ${maxPlots} x ${formatNumber(GREENHOUSE_KN_COST_PER_PLOT, 1)} Kn).`}
        onBuy={handleBuyGreenhouse}
      />

      <FarmUpgradeRow
        {...shared}
        icon={UPGRADE_HEIRLOOM_SEEDS}
        name="Heirloom Seeds"
        effect="Doubles Better Seeds"
        owned={heirloomOwned}
        cost={heirloomMoneyCost}
        knowledgeCost={heirloomKnowledgeCost}
        title={`Doubles the effect of Better Seeds. Cost is based on your highest unlocked veggie ever: ${CROP_NAMES[highestUnlockedVeggie] ?? 'Radish'} (${highestUnlockedVeggie + 1} × $${formatNumber(HEIRLOOM_COST_PER_VEGGIE, 1)} & ${highestUnlockedVeggie + 1} × ${formatNumber(HEIRLOOM_KN_PER_VEGGIE, 1)} Kn).`}
        onBuy={handleBuyHeirloom}
      />
    </section>
  );
};

export default GlobalUpgradesPanel;

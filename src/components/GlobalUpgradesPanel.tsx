import React from 'react';
import UpgradeButton from './UpgradeButton';
import ProgressBar from './ProgressBar';
import styles from './GlobalUpgradesPanel.module.css';
import { 
  UPGRADE_FARMERS_ALMANAC, 
  UPGRADE_IRRIGATION, 
  UPGRADE_MERCHANT, 
  UPGRADE_GREENHOUSE, 
  UPGRADE_HEIRLOOM_SEEDS 
} from '../config/assetPaths';

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
  MERCHANT_DAYS: number;
  MERCHANT_COST: number;
  MERCHANT_KN_COST: number;
  GREENHOUSE_COST_PER_PLOT: number;
  GREENHOUSE_KN_COST_PER_PLOT: number;
  HEIRLOOM_COST_PER_VEGGIE: number;
  HEIRLOOM_KN_PER_VEGGIE: number;
  initialVeggies: Array<{ name: string }>;
  handleBuyAlmanac: () => void;
  handleBuyIrrigation: () => void;
  handleBuyAutoSell: () => void;
  handleBuyGreenhouse: () => void;
  handleBuyHeirloom: () => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const GlobalUpgradesPanel: React.FC<GlobalUpgradesPanelProps> = ({
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
  MERCHANT_DAYS,
  MERCHANT_COST,
  MERCHANT_KN_COST,
  GREENHOUSE_COST_PER_PLOT,
  GREENHOUSE_KN_COST_PER_PLOT,
  HEIRLOOM_COST_PER_VEGGIE,
  HEIRLOOM_KN_PER_VEGGIE,
  initialVeggies,
  handleBuyAlmanac,
  handleBuyIrrigation,
  handleBuyAutoSell,
  handleBuyGreenhouse,
  handleBuyHeirloom,
  formatNumber
}) => {
  return (
    <>
      <h2 className={styles.title}>Upgrades</h2>
      
      <div className={styles.upgradesContainer}>
        {/* Farmer's Almanac */}
        <div>
          <UpgradeButton
            title="Each level increases all veggie sale prices by 10%"
            imageSrc={UPGRADE_FARMERS_ALMANAC}
            imageAlt="Farmer's Almanac"
            buttonText="Almanac"
            money={money}
            knowledge={knowledge}
            cost={almanacCost}
            currencyType="money"
            onClick={handleBuyAlmanac}
            disabled={money < almanacCost}
            level={almanacLevel}
            effect={almanacLevel > 0 ? `Knowledge gain: +${(almanacLevel * 10)}%` : '+0%'}
            formatNumber={formatNumber}
          />
        </div>

        {/* Irrigation */}
        <div>
          <UpgradeButton
            title="Negates drought penalty and provides +15% growth rate bonus."
            imageSrc={UPGRADE_IRRIGATION}
            imageAlt="Irrigation"
            buttonText="Irrigation"
            money={money}
            knowledge={knowledge}
            cost={irrigationCost}
            currencyType="money"
            knowledgeCost={irrigationKnCost}
            onClick={handleBuyIrrigation}
            disabled={irrigationOwned || money < irrigationCost || knowledge < irrigationKnCost}
            isOwned={irrigationOwned}
            effect="+15% growth rate, drought immunity"
            formatNumber={formatNumber}
          />
        </div>

        {/* Merchant */}
        <div>
          <UpgradeButton
            title={`Sells all veggies in your stash every ${MERCHANT_DAYS} days.`}
            imageSrc={UPGRADE_MERCHANT}
            imageAlt="Merchant"
            buttonText="Merchant"
            money={money}
            knowledge={knowledge}
            cost={MERCHANT_COST}
            currencyType="money"
            knowledgeCost={MERCHANT_KN_COST}
            onClick={handleBuyAutoSell}
            disabled={autoSellOwned || money < MERCHANT_COST || knowledge < MERCHANT_KN_COST}
            isOwned={autoSellOwned}
            effect={`Auto-sells every ${MERCHANT_DAYS} days`}
            formatNumber={formatNumber}
          />
        </div>

        {/* Greenhouse */}
        <div>
          <UpgradeButton
            title={`Negates winter growth penalty. Cost is based max plots for your current farm: (${maxPlots} × $${formatNumber(GREENHOUSE_COST_PER_PLOT, 1)} & ${maxPlots} x ${formatNumber(GREENHOUSE_KN_COST_PER_PLOT, 1)} Kn).`}
            imageSrc={UPGRADE_GREENHOUSE}
            imageAlt="Greenhouse"
            buttonText="Greenhouse"
            money={money}
            knowledge={knowledge}
            cost={GREENHOUSE_COST_PER_PLOT * maxPlots}
            currencyType="money"
            knowledgeCost={GREENHOUSE_KN_COST_PER_PLOT * maxPlots}
            onClick={handleBuyGreenhouse}
            disabled={greenhouseOwned || money < (GREENHOUSE_COST_PER_PLOT * maxPlots) || knowledge < (GREENHOUSE_KN_COST_PER_PLOT * maxPlots)}
            isOwned={greenhouseOwned}
            effect={'Winter immunity'}
            formatNumber={formatNumber}
          />
        </div>

        {/* Heirloom Seeds */}
        <div>
          <UpgradeButton
            title={`Doubles the effect of Better Seeds. Cost is based on your highest unlocked veggie ever: ${initialVeggies[highestUnlockedVeggie]?.name || 'Radish'} (${highestUnlockedVeggie + 1} × $${formatNumber(HEIRLOOM_COST_PER_VEGGIE, 1)} & ${highestUnlockedVeggie + 1} × ${formatNumber(HEIRLOOM_KN_PER_VEGGIE, 1)} Kn).`}
            imageSrc={UPGRADE_HEIRLOOM_SEEDS}
            imageAlt="Heirloom Seeds"
            buttonText="Heirloom Seeds"
            money={money}
            knowledge={knowledge}
            cost={heirloomMoneyCost}
            currencyType="money"
            knowledgeCost={heirloomKnowledgeCost}
            onClick={handleBuyHeirloom}
            disabled={heirloomOwned || money < heirloomMoneyCost || knowledge < heirloomKnowledgeCost}
            isOwned={heirloomOwned}
            effect={'Doubles the effect of Better Seeds'}
            formatNumber={formatNumber}
          />
        </div>

        {/* Merchant Progress Bar */}
        {autoSellOwned && (
          <div className={styles.progressSection}>
            <div className={styles.progressContainer}>
              <span className={styles.progressText}>
                Merchant: Next sale in {MERCHANT_DAYS - (day % MERCHANT_DAYS)} days
              </span>
              <div className={styles.progressBarWrapper}>
                <ProgressBar value={day % MERCHANT_DAYS} max={MERCHANT_DAYS} height={12} color="#ffb300" />
                <span className={styles.progressLabel}>
                  {Math.floor((day % MERCHANT_DAYS) / MERCHANT_DAYS * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GlobalUpgradesPanel;

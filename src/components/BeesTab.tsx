/**
 * Bees Tab: the Honeycomb. The apiary's cells on the left, each hive filling toward its next
 * batch; the Honey House in the middle, with the honey, what's waiting, what the bees give
 * and the Beekeeper; the upgrades on the right, grouped by what they improve. Every part
 * keeps its size, and the tab fits a 1600x1000 window.
 */
import { memo, type FC } from 'react';
import BaseTab from './BaseTab';
import InlineIcon from './InlineIcon';
import LockedFeatureCard from './LockedFeatureCard';
import ApiaryComb from './ApiaryComb';
import HoneyHouse from './HoneyHouse';
import BeeUpgradesList from './BeeUpgradesList';
import type { BeeContextValue, HoneyProduction } from '../types/bees';
import { ICON_BEE, ICON_HONEY, ICON_GOLDEN_HONEY, BEE_BEEKEEPER, ICON_CANNING, ICON_GROWING } from '../config/assetPaths';
import { BEE_CONSTANTS } from '../config/gameConstants';
import { batchDays, beeLevels, cropBonus, goldenChance, lbsPerBatch, storedBatches } from '../utils/beeProduction';
import { beeUpgradeGroups, winterCountdown } from '../utils/beeView';
import { announce } from '../utils/announcer';
import styles from './BeesTab.module.css';

/** Farm tier that unlocks the bee system, the same one BeeContext checks */
const BEES_UNLOCK_TIER = BEE_CONSTANTS.UNLOCK_FARM_TIER;

interface BeesTabProps {
  beeContext: BeeContextValue | null;
  farmTier: number;
  /** Day of the year, for the days until winter or spring */
  day: number;
  formatNumber: (num: number, decimalPlaces?: number) => string;
  /** Honey per batch as a share, from the player's guild: the Engineers' bees make less */
  honeyMultiplier?: number;
}

/** What a collection gave, read out to screen readers */
function collectedMessage(productions: HoneyProduction[], formatNumber: BeesTabProps['formatNumber']): string {
  const total = (type: HoneyProduction['type']) => productions
    .filter(production => production.type === type)
    .reduce((sum, production) => sum + production.amount, 0);
  const parts = [
    total('regular') > 0 ? `${formatNumber(total('regular'), 1)} lbs of honey` : '',
    total('golden') > 0 ? `${formatNumber(total('golden'), 1)} lbs of Golden Honey` : ''
  ].filter(Boolean);
  return parts.length > 0 ? `Collected ${parts.join(' and ')}` : '';
}

const BeesTab: FC<BeesTabProps> = memo(({
  beeContext,
  farmTier,
  day,
  formatNumber,
  honeyMultiplier = 1
}) => {
  if (farmTier < BEES_UNLOCK_TIER) {
    const mainContent = (
      <LockedFeatureCard
        theme="honey"
        icon={<InlineIcon src={ICON_BEE} alt="Bee" size={24} />}
        featureName="Bee System"
        currentTier={farmTier}
        requiredTier={BEES_UNLOCK_TIER}
        featuresTitle="What Bees Offer:"
        hint="Keep farming and expanding to unlock this feature!"
      >
        <li><InlineIcon src={ICON_HONEY} alt="Honey" /> Produce honey every {BEE_CONSTANTS.BASE_PRODUCTION_TIME} days, stored until you collect it</li>
        <li><InlineIcon src={ICON_GROWING} alt="Growing" /> Boost crop yields (+0.5% per bee box)</li>
        <li><InlineIcon src={ICON_CANNING} alt="Canning" /> Unlock unique honey-based canning recipes</li>
        <li><InlineIcon src={ICON_GOLDEN_HONEY} alt="Golden Honey" /> Chance to produce rare Golden Honey</li>
        <li><InlineIcon src={BEE_BEEKEEPER} alt="Beekeeper Assistant" /> Automate with the Beekeeper Assistant</li>
      </LockedFeatureCard>
    );
    return <BaseTab isUnlocked={true} mainContent={mainContent} />;
  }

  if (!beeContext) {
    return (
      <BaseTab
        isUnlocked={true}
        isLoading={true}
        loadingMessage="Loading bee system..."
        mainContent={<div>Loading bee system...</div>}
      />
    );
  }

  const { boxes, upgrades, beekeeperAssistant: assistant, regularHoney, goldenHoney } = beeContext;
  const levels = beeLevels(upgrades);
  // The Beekeeper speeds the bees only while he works
  const beekeeperBonus = assistant.active ? assistant.productionSpeedBonus : 0;
  const days = batchDays(levels, beekeeperBonus);
  const lbs = lbsPerBatch(levels, honeyMultiplier);
  const waitingBatches = boxes.reduce((sum, box) => sum + storedBatches(box), 0);
  const purchase = beeContext.getBeeBoxPurchaseInfo();
  const groups = beeUpgradeGroups({ upgrades, levels, hives: boxes.length, honey: regularHoney, goldenHoney, beekeeperBonus, honeyMultiplier });

  const mainContent = (
    <div className={styles.layout}>
      <ApiaryComb
        boxes={boxes}
        maxHives={purchase.maxCount}
        batchDays={days}
        lbsPerBatch={lbs}
        nextHiveCost={purchase.atMaxCapacity ? null : purchase.cost}
        honey={regularHoney}
        beekeeperCollects={assistant.unlocked && assistant.active}
        onCollect={boxId => announce(collectedMessage(beeContext.harvestHoney(boxId), formatNumber))}
        onAddHive={() => beeContext.addBeeBox()}
        formatNumber={formatNumber}
      />
      <HoneyHouse
        honey={regularHoney}
        goldenHoney={goldenHoney}
        waitingBatches={waitingBatches}
        waitingLbs={waitingBatches * lbs}
        goldenChance={goldenChance(levels)}
        hives={boxes.length}
        lbsPerBatch={lbs}
        batchDays={days}
        cropBonus={cropBonus(boxes.length, levels)}
        levels={levels}
        winterHardiness={upgrades.some(upgrade => upgrade.id === 'winter_hardiness' && upgrade.purchased)}
        countdown={winterCountdown(day)}
        assistant={assistant}
        onCollectAll={() => announce(collectedMessage(beeContext.harvestAllHoney(), formatNumber))}
        onHireBeekeeper={() => beeContext.unlockBeekeeperAssistant()}
        onUpgradeBeekeeper={() => beeContext.upgradeBeekeeperAssistant()}
        onToggleBeekeeper={on => beeContext.toggleBeekeeperAssistant(on)}
        formatNumber={formatNumber}
      />
      <BeeUpgradesList groups={groups} onPurchase={id => beeContext.purchaseUpgrade(id)} formatNumber={formatNumber} />
    </div>
  );

  return <BaseTab isUnlocked={true} mainContent={mainContent} />;
});

BeesTab.displayName = 'BeesTab';

export default BeesTab;

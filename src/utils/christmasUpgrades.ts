/**
 * Christmas event upgrade rules shared by the purchase code and the upgrade panels.
 */
import type { EventUpgrade } from '../types/christmasEvent';

/** Holiday Cheer price of the next purchase; repeatable upgrades scale with their level */
export function getEventUpgradeCost(upgrade: EventUpgrade): number {
  if (!upgrade.repeatable) return upgrade.cost;
  const costScaling = upgrade.costScaling ?? 1.5;
  return Math.floor(upgrade.cost * Math.pow(costScaling, upgrade.level ?? 0));
}

/** Whether a repeatable upgrade has reached its maximum level */
export function isEventUpgradeAtMaxLevel(upgrade: EventUpgrade): boolean {
  return !!upgrade.repeatable && (upgrade.level ?? 0) >= (upgrade.maxLevel ?? Infinity);
}

/** Name of the upgrade that must be bought first, or null when nothing is missing */
export function getMissingPrerequisite(upgrade: EventUpgrade, upgrades: readonly EventUpgrade[]): string | null {
  if (!upgrade.requires) return null;
  const required = upgrades.find(u => u.id === upgrade.requires);
  return required?.owned ? null : required?.name ?? upgrade.requires;
}

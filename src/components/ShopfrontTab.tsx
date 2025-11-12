/**
 * Shopfront Tab Component
 * 
 * Handles tree sales for the Christmas Tree Shop event.
 * Features:
 * - Price cards for each tree variant with demand multipliers
 * - Sell sliders and buttons for managing inventory
 * - Customer Feed with cozy messages
 * - Daily Bonus claim (requires Wreath Sign upgrade)
 * - Passive income display (Golden Bell Counter)
 */

import React, { memo, useState } from 'react';
import type { TreeInventory, EventUpgrade, CraftingMaterials } from '../types/christmasEvent';
import { TREE_PINE, TREE_SPRUCE, TREE_FIR, TREE_DECORATED, DECORATION_CANDLE, DECORATION_WREATH } from '../config/assetPaths';
import BaseTab from './BaseTab';
import ShopfrontUpgradesPanel from './ShopfrontUpgradesPanel';
import styles from './ShopfrontTab.module.css';

/**
 * Helper to get tree image from tree key
 */
const getTreeImageFromKey = (treeKey: string): string | null => {
  if (treeKey.includes('pine')) return TREE_PINE;
  if (treeKey.includes('spruce')) return TREE_SPRUCE;
  if (treeKey.includes('fir')) return TREE_FIR;
  return null;
};

interface ShopfrontTabProps {
  treeInventory: TreeInventory;
  materials: CraftingMaterials;
  sellTrees: (treeKey: string, quantity: number) => void;
  sellGarland: (quantity: number) => void;
  sellCandle: (quantity: number) => void;
  demandMultiplier: number;
  holidayCheer: number;
  upgrades: EventUpgrade[];
  dailyBonusAvailable: boolean;
  claimDailyBonus: () => void;
  passiveCheerPerSecond: number;
  formatNumber: (num: number, decimalPlaces?: number) => string;
  purchaseUpgrade: (upgradeId: string) => void;
}

/**
 * Tree variant display names and base prices
 * Note: Garland removed from decorations - now sold as standalone item
 * Luxury trees require both ornaments AND candles
 */
const TREE_VARIANTS = [
  { key: 'pine_plain', name: 'Pine Tree', emoji: '🌲', basePrice: 10, multiplier: 1.0 },
  { key: 'pine_ornamented', name: 'Ornamented Pine', emoji: '🎄', basePrice: 10, multiplier: 1.1 },
  { key: 'pine_candled', name: 'Candled Pine', emoji: '🕯️', basePrice: 10, multiplier: 1.2 },
  { key: 'pine_luxury', name: 'Luxury Pine', emoji: '✨', basePrice: 10, multiplier: 3.0 },
  { key: 'spruce_plain', name: 'Spruce Tree', emoji: '🌲', basePrice: 15, multiplier: 1.0 },
  { key: 'spruce_ornamented', name: 'Ornamented Spruce', emoji: '🎄', basePrice: 15, multiplier: 1.1 },
  { key: 'spruce_candled', name: 'Candled Spruce', emoji: '🕯️', basePrice: 15, multiplier: 1.2 },
  { key: 'spruce_luxury', name: 'Luxury Spruce', emoji: '✨', basePrice: 15, multiplier: 3.0 },
  { key: 'fir_plain', name: 'Fir Tree', emoji: '🌲', basePrice: 20, multiplier: 1.0 },
  { key: 'fir_ornamented', name: 'Ornamented Fir', emoji: '🎄', basePrice: 20, multiplier: 1.1 },
  { key: 'fir_candled', name: 'Candled Fir', emoji: '🕯️', basePrice: 20, multiplier: 1.2 },
  { key: 'fir_luxury', name: 'Luxury Fir', emoji: '✨', basePrice: 20, multiplier: 3.0 },
];

/**
 * Individual tree variant price card
 */
interface PriceCardProps {
  variant: typeof TREE_VARIANTS[0];
  quantity: number;
  demandMultiplier: number;
  onSell: (quantity: number) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const PriceCard: React.FC<PriceCardProps> = memo(({ variant, quantity, demandMultiplier, onSell, formatNumber }) => {
  const [sellQuantity, setSellQuantity] = useState(0);
  
  const finalPrice = Math.floor(variant.basePrice * variant.multiplier * demandMultiplier);
  const totalValue = finalPrice * sellQuantity;
  
  const handleSellAll = () => {
    if (quantity > 0) {
      onSell(quantity);
      setSellQuantity(0);
    }
  };
  
  const handleSellSelected = () => {
    if (sellQuantity > 0) {
      onSell(sellQuantity);
      setSellQuantity(0);
    }
  };
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSellQuantity(Math.min(parseInt(e.target.value) || 0, quantity));
  };
  
  if (quantity === 0) {
    return null; // Don't show variants with no inventory
  }
  
  return (
    <div className={styles.priceCard}>
      <div className={styles.cardHeader}>
        <span className={styles.treeEmoji}>
          {variant.emoji === '🌲' ? (
            <img src={getTreeImageFromKey(variant.key) || TREE_PINE} alt={variant.name} className={styles.treeImage} />
          ) : variant.emoji === '🎄' ? (
            <img src={TREE_DECORATED} alt={variant.name} className={styles.treeImage} />
          ) : variant.emoji === '🕯️' ? (
            <img src={DECORATION_CANDLE} alt={variant.name} className={styles.treeImage} />
          ) : (
            variant.emoji
          )}
        </span>
        <div className={styles.cardTitle}>
          <div className={styles.treeName}>{variant.name}</div>
          <div className={styles.treeQuantity}>In Stock: {quantity}</div>
        </div>
      </div>
      
      <div className={styles.priceInfo}>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Base Price:</span>
          <span className={styles.priceValue}>{variant.basePrice} <img src={TREE_DECORATED} alt="Holiday Cheer" className={styles.cheerIcon} /></span>
        </div>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Decoration:</span>
          <span className={styles.multiplierValue}>×{variant.multiplier.toFixed(1)}</span>
        </div>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Demand:</span>
          <span className={styles.demandValue}>×{demandMultiplier.toFixed(2)}</span>
        </div>
        <div className={`${styles.priceRow} ${styles.finalPrice}`}>
          <span className={styles.priceLabel}>Final Price:</span>
          <span className={styles.priceValue}>{finalPrice} <img src={TREE_DECORATED} alt="Holiday Cheer" className={styles.cheerIcon} /></span>
        </div>
      </div>
      
      <div className={styles.sellControls}>
        <input
          type="range"
          min="0"
          max={quantity}
          value={sellQuantity}
          onChange={handleSliderChange}
          className={styles.sellSlider}
        />
        <div className={styles.sliderLabel}>
          Sell: {sellQuantity} / {quantity}
          {sellQuantity > 0 && (
            <span className={styles.totalValue}> ({formatNumber(totalValue, 0)} <img src={TREE_DECORATED} alt="Holiday Cheer" className={styles.cheerIcon} />)</span>
          )}
        </div>
        <div className={styles.sellButtons}>
          <button
            className={styles.sellButton}
            onClick={handleSellSelected}
            disabled={sellQuantity === 0}
          >
            Sell Selected
          </button>
          <button
            className={styles.sellAllButton}
            onClick={handleSellAll}
          >
            Sell All
          </button>
        </div>
      </div>
    </div>
  );
});

PriceCard.displayName = 'PriceCard';

/**
 * Main Shopfront Tab Component
 */
const ShopfrontTab: React.FC<ShopfrontTabProps> = ({
  treeInventory,
  materials,
  sellTrees,
  sellGarland,
  sellCandle,
  demandMultiplier,
  holidayCheer,
  upgrades,
  dailyBonusAvailable,
  claimDailyBonus,
  passiveCheerPerSecond,
  formatNumber,
  purchaseUpgrade,
}) => {
  const hasWreathSign = upgrades.find(u => u.id === 'wreath_sign')?.owned ?? false;
  const hasGoldenBell = upgrades.find(u => u.id === 'golden_bell_counter')?.owned ?? false;
  
  // Convert upgrades array to object for panel
  const upgradesObj = {
    shopfrontUnlocked: upgrades.find(u => u.id === 'christmas_tree_shopfront')?.owned ?? false,
    garlandBorders: upgrades.find(u => u.id === 'garland_borders')?.owned ?? false,
    wreathSign: hasWreathSign,
    goldenBellCounter: hasGoldenBell,
    magicalRegister: upgrades.find(u => u.id === 'magical_register')?.owned ?? false,
    fireplaceDisplay: upgrades.find(u => u.id === 'fireplace_display')?.owned ?? false,
  };
  
  const mainContent = (
    <div className={styles.container}>
      {/* Left Column: Price Cards */}
      <div className={styles.leftColumn}>
        {/* <h2 className={styles.mainTitle}>
          <img src={ICON_TREE_STOREFRONT} alt="" style={{ width: '24px', height: '24px', verticalAlign: 'middle', marginRight: '8px' }} />
          Christmas Tree Shopfront
        </h2> */}
        
        <div className={styles.demandBanner}>
          <span className={styles.demandLabel}>🔥 Market Demand:</span>
          <span className={styles.demandMultiplier}>×{demandMultiplier.toFixed(2)}</span>
          <span className={styles.demandHint}>(increases closer to Christmas)</span>
        </div>
        
        <div className={styles.priceCardsGrid}>
          {TREE_VARIANTS.map(variant => {
            const quantity = treeInventory[variant.key] || 0;
            return (
              <PriceCard
                key={variant.key}
                variant={variant}
                quantity={quantity}
                demandMultiplier={demandMultiplier}
                onSell={(qty) => sellTrees(variant.key, qty)}
                formatNumber={formatNumber}
              />
            );
          })}
        </div>
        
        {/* Garland Sales Section */}
        {materials.garlands > 0 && (
          <div className={styles.garlandSection}>
            <h3 className={styles.garlandTitle}><img src={TREE_DECORATED} alt="Decorated Tree" className={styles.titleIcon} /> Festive Garland</h3>
            <div className={styles.garlandCard}>
              <div className={styles.garlandInfo}>
                <span className={styles.garlandStock}>In Stock: {materials.garlands}</span>
                <span className={styles.garlandPrice}>2 <img src={TREE_DECORATED} alt="Holiday Cheer" className={styles.cheerIcon} /> each</span>
              </div>
              <div className={styles.garlandButtons}>
                <button
                  className={styles.sellButton}
                  onClick={() => sellGarland(1)}
                  disabled={materials.garlands < 1}
                >
                  Sell 1
                </button>
                <button
                  className={styles.sellAllButton}
                  onClick={() => sellGarland(materials.garlands)}
                  disabled={materials.garlands < 1}
                >
                  Sell All ({formatNumber(materials.garlands * 2, 0)} <img src={TREE_DECORATED} alt="Holiday Cheer" className={styles.cheerIcon} />)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Candle Sales Section */}
        {materials.candles > 0 && (
          <div className={styles.garlandSection}>
            <h3 className={styles.garlandTitle}><img src={DECORATION_CANDLE} alt="Candle" className={styles.titleIcon} /> Festive Candles</h3>
            <div className={styles.garlandCard}>
              <div className={styles.garlandInfo}>
                <span className={styles.garlandStock}>In Stock: {materials.candles}</span>
                <span className={styles.garlandPrice}>1 <img src={TREE_DECORATED} alt="Holiday Cheer" className={styles.cheerIcon} /> each</span>
              </div>
              <div className={styles.garlandButtons}>
                <button
                  className={styles.sellButton}
                  onClick={() => sellCandle(1)}
                  disabled={materials.candles < 1}
                >
                  Sell 1
                </button>
                <button
                  className={styles.sellAllButton}
                  onClick={() => sellCandle(materials.candles)}
                  disabled={materials.candles < 1}
                >
                  Sell All ({formatNumber(materials.candles * 1, 0)} <img src={TREE_DECORATED} alt="Holiday Cheer" className={styles.cheerIcon} />)
                </button>
              </div>
            </div>
          </div>
        )}
        
        {Object.keys(treeInventory).length === 0 && materials.garlands === 0 && materials.candles === 0 && (
          <div className={styles.emptyState}>
            <p>
              <img src={TREE_PINE} alt="Tree" className={styles.emptyStateIcon} /> No trees in inventory
            </p>
            <p>Grow and decorate trees in the Workshop to start selling.</p>
          </div>
        )}
      </div>
      
      {/* Right Column: Customer Feed & Bonuses */}
      <div className={styles.rightColumn}>
        {/* Shopfront Upgrades */}
        <ShopfrontUpgradesPanel
          upgrades={upgradesObj}
          holidayCheer={holidayCheer}
          purchaseUpgrade={purchaseUpgrade}
        />
        
        {/* Passive Income Display */}
        {hasGoldenBell && passiveCheerPerSecond > 0 && (
          <div className={styles.passiveIncome}>
            <h3 className={styles.passiveTitle}>🔔 Golden Bell Counter</h3>
            <div className={styles.passiveValue}>
              +{formatNumber(passiveCheerPerSecond, 2)} <img src={TREE_DECORATED} alt="Holiday Cheer" className={styles.cheerIcon} />/sec
            </div>
            <div className={styles.passiveHint}>Passive Holiday Cheer generation</div>
          </div>
        )}
        
        {/* Daily Bonus */}
        {hasWreathSign && (
          <div className={styles.dailyBonus}>
            <h3 className={styles.bonusTitle}><img src={DECORATION_WREATH} alt="Daily Customer Bonus" style={{ width: '24px', height: '24px', verticalAlign: 'middle', marginRight: '8px' }} /> Daily Customer Bonus</h3>
            {dailyBonusAvailable ? (
              <>
                <div className={styles.bonusDescription}>
                  A generous customer left a special tip!
                </div>
                <button
                  className={styles.claimButton}
                  onClick={claimDailyBonus}
                >
                  Claim Bonus
                </button>
              </>
            ) : (
              <div className={styles.bonusClaimed}>
                ✓ Already claimed today. Come back tomorrow!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <BaseTab
      isUnlocked={true}
      mainContent={mainContent}
    />
  );
};

export default memo(ShopfrontTab);

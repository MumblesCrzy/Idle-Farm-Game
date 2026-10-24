import InlineIcon from './InlineIcon';
import { useState, memo, type FC } from 'react';
import type { InfoCategory } from '../types/game';
import { ICON_GROWING, ICON_IDEA, ICON_CANNING, ICON_AUTOMATION, ICON_MILESTONE, ICON_UPGRADE, WEATHER_CLEAR, ICON_EXPERIENCE, ICON_KNOWLEDGE, ICON_PLOTS, UPGRADE_FERTILIZER, UPGRADE_HARVESTER_SPEED, UPGRADE_ADDITIONAL_PLOT, UPGRADE_BETTER_SEEDS, UPGRADE_FARMERS_ALMANAC, UPGRADE_IRRIGATION, UPGRADE_MERCHANT, UPGRADE_GREENHOUSE, UPGRADE_HEIRLOOM_SEEDS, UPGRADE_AUTO_HARVESTER, FRUIT_STRAWBERRY, AUTO_ASSISTANT, AUTO_CULTIVATOR, AUTO_SURVEYOR, AUTO_MECHANIC, ICON_RECIPE, ICON_LEARNING, TREE_DECORATED, TREE_PINE, ICON_ELVES, ICON_TREE_STOREFRONT, ICON_TREE_WORKSHOP, ICON_BEE, ICON_HONEY, ICON_GOLDEN_HONEY, ICON_BEE_HIVE, BEE_BEEKEEPER, ICON_GUILDS, ICON_GUILD_TOKEN, ICON_SIGIL, ICON_WAX_SEAL, GUILD_GROWERS, GUILD_PRESERVERS, GUILD_ENGINEERS, ICON_GEARS, SPECIAL_GLUTTON, SPECIAL_STANLEY, CANNING_CANNER, ICON_SCROLL } from '../config/assetPaths';
import {
  AUTO_PURCHASER_CYCLE_DAYS,
  BEE_CONSTANTS,
  BEE_UPGRADE_COSTS,
  GREENHOUSE_COST_PER_PLOT,
  GREENHOUSE_KN_COST_PER_PLOT,
  HARVESTER_BASE_TIMER,
  HEIRLOOM_COST_PER_VEGGIE,
  HEIRLOOM_KN_PER_VEGGIE,
  IRRIGATION_COST,
  IRRIGATION_KN_COST,
  MERCHANT_COST,
  MERCHANT_DAYS,
  MERCHANT_KN_COST
} from '../config/gameConstants';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { INITIAL_RECIPES } from '../data/recipes';
import { cropBonus, hivePrice } from '../utils/beeProduction';
import { BEEKEEPER_HIRE_COST, WINTER_START_DAY, beekeeperBonusAt, percent } from '../utils/beeView';
import styles from './InfoOverlay.module.css';

interface InfoOverlayProps {
  visible: boolean;
  onClose: () => void;
}

/** The jars of honey alone that the Bees tab's Honey Jars opens, for the help pages */
const HONEY_JARS = INITIAL_RECIPES.filter(recipe => recipe.requiredBeeUpgrade === 'honey_jars');

const InfoOverlay: FC<InfoOverlayProps> = memo(({
  visible,
  onClose
}) => {
  const [selectedInfoCategory, setSelectedInfoCategory] = useState<InfoCategory>('seasons');
  const { containerRef, handleTabKey } = useFocusTrap(visible, onClose);

  if (!visible) return null;

  const categories: Array<{ id: InfoCategory; label: string }> = [
    { id: 'seasons', label: 'Seasons & Weather' },
    { id: 'farm', label: 'Farm & Experience' },
    { id: 'veggies', label: 'Crops & Upgrades' },
    { id: 'upgrades', label: 'Farm Upgrades' },
    { id: 'autopurchase', label: 'Auto-Purchasers' },
    { id: 'canning', label: 'Canning System' },
    { id: 'bees', label: 'Bee System' },
    { id: 'guilds', label: 'Guilds' },
    { id: 'christmas', label: 'Tree Shop' },
    { id: 'pumpkin', label: 'Pumpkin Rush' }
  ];

  const categoryTitles: Record<InfoCategory, string> = {
    seasons: 'Seasons & Weather',
    farm: 'Farm & Experience',
    veggies: 'Crops & Upgrades',
    upgrades: 'Farm Upgrades',
    autopurchase: 'Auto-Purchasers',
    canning: 'Canning System',
    bees: 'Bee System',
    guilds: 'Guilds',
    christmas: 'Christmas Tree Shop',
    pumpkin: 'Fall Pumpkin Rush'
  };

  return (
    <div className={styles.overlay}>
      <div 
        className={styles.modal}
        ref={containerRef}
        onKeyDown={handleTabKey}
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-modal-title"
      >
        <h3 id="info-modal-title" className={styles.header}>Game Help</h3>
        
        <div className={styles.container}>
          {/* Category Navigation */}
          <div className={styles.sidebar}>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedInfoCategory(category.id)}
                className={`${styles.sidebarButton} ${selectedInfoCategory === category.id ? styles.active : ''}`}
                aria-label={`View ${category.label} information`}
                aria-current={selectedInfoCategory === category.id ? 'page' : undefined}
              >
                {category.label}
              </button>
            ))}
          </div>
          
          {/* Content Area */}
          <div className={styles.content}>
            <div className={styles.contentHeader}>
              <h3 className={styles.contentTitle}>
                {categoryTitles[selectedInfoCategory]}
              </h3>
              <button
                onClick={onClose}
                className={styles.closeButton}
                aria-label="Close game help modal (press Escape)"
              >
                Close
              </button>
            </div>
            
            {/* Content based on selected category */}
            <div className={styles.contentBody}>
            {selectedInfoCategory === 'seasons' && (
              <div>
                <h4 className={styles.sectionTitle}>
                  <img src={ICON_GROWING} alt="" className={styles.sectionIcon} />
                  Seasons
                </h4>
                <p>The year has 365 days and four seasons: <strong>Spring → Summer → Fall → Winter</strong>. Spring runs to day 79, Summer to day 171, Fall to day 264, and Winter to the end of the year.</p>

                <h5>Season Effects:</h5>
                <ul>
                  <li><strong>Winter:</strong> Crops grow at 10% speed unless you own a Greenhouse</li>
                  <li><strong>Spring, Summer and Fall:</strong> Normal growth</li>
                  <li><strong>Favorite Seasons:</strong> A vegetable grows 0.1% a day faster in its favorite seasons, which matters most for slow crops with little Fertilizer</li>
                </ul>

                <h5>Favorite Seasons:</h5>
                <ul>
                  <li><strong>Spring:</strong> Radish, Lettuce, Carrots, Onions</li>
                  <li><strong>Summer:</strong> Green Beans, Zucchini, Cucumbers, Tomatoes, Peppers</li>
                  <li><strong>Fall:</strong> Radish, Lettuce, Carrots, Broccoli</li>
                  <li><strong>Winter and fruits:</strong> No favorites</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={WEATHER_CLEAR} alt="" className={styles.sectionIcon} />
                  Weather System
                </h4>
                <p>On a clear day the weather may change, with chances that depend on the season. Rain, Snow, Droughts, Storms and Heatwaves last a few days, then the sky clears.</p>

                <h5>Weather Effects:</h5>
                <ul>
                  <li><strong>Clear:</strong> Normal growth</li>
                  <li><strong>Rain:</strong> +20% growth for every crop</li>
                  <li><strong>Storm:</strong> +10% growth for every crop</li>
                  <li><strong>Drought:</strong> -50% growth unless you have Irrigation, and +1 knowledge each day it lasts</li>
                  <li><strong>Heatwave:</strong> -30% growth in Summer; in Spring and Fall, +10% for summer vegetables and -30% for the rest; +20% in Winter</li>
                  <li><strong>Snow:</strong> Winter's rain. Crops stop growing unless you have a Greenhouse</li>
                </ul>

                <h5>Chances of New Weather on a Clear Day:</h5>
                <ul>
                  <li><strong>Rain (Snow in Winter):</strong> Spring 20% • Summer 16% • Fall 14% • Winter 10%</li>
                  <li><strong>Drought:</strong> Spring 1.2% • Summer 1.2% • Fall 1.6% • Winter 0.4%</li>
                  <li><strong>Storm:</strong> Spring 4% • Summer 6% • Fall 3% • Winter 1%</li>
                  <li><strong>Heatwave:</strong> 1% all year</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={ICON_IDEA} alt="" aria-hidden="true" className={styles.sectionIcon} />
                  Strategy Tips:
                </h4>
                <ul>
                  <li><strong>Days to Grow:</strong> The Growing tab works out each crop's days to grow from today's season and weather, so they jump in Winter or a Drought</li>
                  <li><strong>Irrigation:</strong> +15% growth all year, and Droughts no longer slow your crops</li>
                  <li><strong>Greenhouse:</strong> Winter and Snow no longer slow your crops</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'farm' && (
              <div>
                <h4 className={styles.sectionTitle}>
                  <img src={ICON_EXPERIENCE} alt="" className={styles.sectionIcon} />
                  Experience System
                </h4>
                <p>Growing Experience comes from every harvest and opens new crops. A locked crop in the Growing tab says how much it needs.</p>

                <h5>Experience per Harvest:</h5>
                <ul>
                  <li><strong>Manual Harvest:</strong> 1 for each crop harvested, plus 1% of your current knowledge</li>
                  <li><strong>Auto Harvest:</strong> Half of that</li>
                </ul>

                <h5>Vegetable Unlock Requirements:</h5>
                <ul>
                  <li><strong>Radish:</strong> 0 (your first crop)</li>
                  <li><strong>Lettuce:</strong> 95</li>
                  <li><strong>Green Beans:</strong> 180</li>
                  <li><strong>Zucchini:</strong> 342</li>
                  <li><strong>Cucumbers:</strong> 651</li>
                  <li><strong>Tomatoes:</strong> 1,238</li>
                  <li><strong>Peppers:</strong> 2,352</li>
                  <li><strong>Carrots:</strong> 4,469</li>
                  <li><strong>Broccoli:</strong> 8,491</li>
                  <li><strong>Onions:</strong> 16,134</li>
                </ul>
                <p><em>Formula: 50 × 1.9^(position), counting Radish as 0. A crop also needs a free plot to open.</em></p>

                <h5>Fruit Unlock Requirements:</h5>
                <p>Fruits open with the Growers Guild's Fruit Cultivation and need far more experience: Strawberry 50,000, Blueberry 110,000, Raspberry 242,000 and Blackberry 532,400, then 2.2 times more for each fruit, up to Watermelon at about 60.4 million.</p>

                <h4 className={styles.sectionTitle}>
                  <img src={ICON_KNOWLEDGE} alt="" className={styles.sectionIcon} />
                  Knowledge Currency
                </h4>
                <p>Knowledge is a second currency. You earn it from harvests and Droughts, and spend it on Better Seeds and farm upgrades.</p>

                <h5>Knowledge Earning:</h5>
                <ul>
                  <li><strong>Manual Harvest:</strong> 1 knowledge per harvest</li>
                  <li><strong>Auto Harvest:</strong> 0.5 knowledge per harvest</li>
                  <li><strong>Farmer's Almanac:</strong> +10% per level on those amounts</li>
                  <li><strong>Farm Tier:</strong> +1.25 knowledge per harvest for each tier above Tier 1</li>
                  <li><strong>Drought:</strong> +1 knowledge each day it lasts</li>
                </ul>

                <h5>Knowledge Uses:</h5>
                <ul>
                  <li><strong>Experience Boost:</strong> Every manual harvest adds 1% of your current knowledge as experience (half on an auto harvest), so the knowledge you keep speeds up unlocks</li>
                  <li><strong>Better Seeds:</strong> Raise a crop's sale price, paid in knowledge</li>
                  <li><strong>Farm Upgrades:</strong> Irrigation, the Merchant, the Greenhouse and Heirloom Seeds cost knowledge as well as money</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={ICON_PLOTS} alt="" className={styles.sectionIcon} />
                  Plot System
                </h4>
                <p>Your farm has a plot limit, shown at the top as Plots.</p>

                <h5>How Plots Are Used:</h5>
                <ul>
                  <li><strong>Starting Plots:</strong> 4 in all</li>
                  <li><strong>Each Open Crop:</strong> Uses one plot</li>
                  <li><strong>Each Additional Plot level:</strong> Uses one more, and gives that crop one more per harvest</li>
                  <li><strong>Important:</strong> Once every plot is used, locked crops need a larger farm and Additional Plot shows Farm full</li>
                  <li><strong>Solution:</strong> Buy a larger farm to raise your limit</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={UPGRADE_ADDITIONAL_PLOT} alt="" className={styles.sectionIcon} />
                  Farm Expansion (Prestige)
                </h4>
                <p>When every plot is used, the Buy Larger Farm button appears at the top. A larger farm starts your crops over with more plots and a higher Farm Tier.</p>

                <h5>Farm Purchase Requirements:</h5>
                <ul>
                  <li><strong>Condition:</strong> Every plot in use</li>
                  <li><strong>Cost:</strong> $500 for Tier 2, then 1.85 times more for each tier: $925 for Tier 3</li>
                </ul>

                <h5>What You Keep:</h5>
                <ul>
                  <li><strong>Money:</strong> What's left after paying for the farm</li>
                  <li><strong>Knowledge:</strong> All of it</li>
                  <li><strong>Max Plots:</strong> Your plot limit plus one plot for every 100 experience, at most double</li>
                  <li><strong>Farm Tier:</strong> Each tier adds 1.25 knowledge to every harvest, and Tiers 3, 4 and 5 open Canning, Bees and the Guilds</li>
                </ul>

                <h5>What Resets:</h5>
                <ul>
                  <li><strong>Experience:</strong> Back to what the new tier opens: Tier 2 starts with Lettuce open, Tier 3 with Green Beans, and so on</li>
                  <li><strong>Crop Upgrades:</strong> Fertilizer, Better Seeds, Additional Plots, Auto Harvesters, Harvester Speed and every auto-buyer</li>
                  <li><strong>Farm Upgrades:</strong> Almanac, Irrigation, Merchant, Greenhouse and Heirloom Seeds</li>
                  <li><strong>Crops:</strong> Growth and stashes are cleared</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={ICON_IDEA} alt="" aria-hidden="true" className={styles.sectionIcon} />
                  Strategy Tips:
                </h4>
                <ul>
                  <li><strong>Prestige Timing:</strong> Buy a new farm when you have spare money, experience and knowledge</li>
                  <li><strong>Keep Knowledge:</strong> The knowledge you hold boosts the experience every harvest gives</li>
                  <li><strong>Experience Means Plots:</strong> Every 100 experience is one more plot on your next farm, so build it up before you expand</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'veggies' && (
              <div>
                <h4 className={styles.sectionTitle}>
                  <img src={ICON_GROWING} alt="" aria-hidden="true" className={styles.sectionIcon} />
                  The Growing Tab
                </h4>
                <p>Every crop has a raised bed in the garden. Click anywhere on a bed, away from its buttons, to pick that crop and see its upgrades in the tool shed on the right.</p>

                <h5>Each Bed Shows:</h5>
                <ul>
                  <li><strong>Sign:</strong> The crop's name and its days to grow today. With the keyboard, pick the crop from its sign</li>
                  <li><strong>Growth Ring:</strong> Fills as the crop grows. When it can be harvested, the ring and the bed's frame turn gold and it says Ripe!</li>
                  <li><strong>Sell or Hold:</strong> Sell sends the crop to Sell All and the Merchant; Hold keeps it in the stash, for canning or for later</li>
                  <li><strong>Auto Harvester:</strong> A timer to its next harvest, Paused, or a Buy button</li>
                  <li><strong>Upgrade Levels:</strong> Fertilizer, Better Seeds, Additional Plot and Harvester Speed. The dot beside each shows its auto-buyer: green when on, gray when paused, hollow when not hired</li>
                  <li><strong>Harvest:</strong> Harvests that crop by hand</li>
                </ul>

                <h5>Around the Garden:</h5>
                <ul>
                  <li><strong>Top Bar:</strong> Your Growing Experience, the Growers' bonuses, Ritual Harvest and Sell All</li>
                  <li><strong>Vegetables and Fruits:</strong> Fruits get their own switch once the Growers' Fruit Cultivation opens them</li>
                  <li><strong>Locked Crops:</strong> A post in the bed says how much experience it needs, or that your farm needs more plots</li>
                  <li><strong>Tool Shed:</strong> The picked crop's price and stash, then its upgrades, each with its effect now and next, its price and its auto-buyer, then the farm upgrades</li>
                  <li><strong>Gold Edges:</strong> A price with a gold edge is one you can afford now</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={ICON_UPGRADE} alt="" aria-hidden="true" className={styles.sectionIcon} />
                  Per-Crop Upgrades
                </h4>
                <p>Each crop has its own upgrades, which only affect that crop. Later crops cost more.</p>

                <h5 className={styles.sectionTitle}>
                  <img src={UPGRADE_FERTILIZER} alt="" className={styles.sectionIcon} />
                  Fertilizer (Growth Speed)
                </h5>
                <ul>
                  <li><strong>Effect:</strong> +5% growth speed per level</li>
                  <li><strong>Price:</strong> $5 for Radish's first level; each level costs about 25% more</li>
                  <li><strong>Top Level:</strong> 97 to 99, depending on the crop</li>
                  <li><strong>Example:</strong> Level 10 = +50% growth (1.5× speed)</li>
                </ul>

                <h5 className={styles.sectionTitle}>
                  <img src={UPGRADE_BETTER_SEEDS} alt="" className={styles.sectionIcon} />
                  Better Seeds (Knowledge Upgrade)
                </h5>
                <ul>
                  <li><strong>Effect:</strong> Sale price ×1.25 per level, or ×1.5 with Heirloom Seeds</li>
                  <li><strong>Price:</strong> Paid in knowledge: 5 for Radish's first level; each level costs about 50% more</li>
                  <li><strong>Example:</strong> Level 3 = 1.95× the sale price, or 3.38× with Heirloom Seeds</li>
                </ul>

                <h5 className={styles.sectionTitle}>
                  <img src={UPGRADE_ADDITIONAL_PLOT} alt="" className={styles.sectionIcon} />
                  Additional Plot
                </h5>
                <ul>
                  <li><strong>Effect:</strong> +1 crop per harvest for each level</li>
                  <li><strong>Plots:</strong> Each level uses one of your farm's plots; Farm full means none are free</li>
                  <li><strong>Price:</strong> $40 for Radish's first level; each level costs about 50% more</li>
                </ul>

                <h5 className={styles.sectionTitle}>
                  <img src={UPGRADE_AUTO_HARVESTER} alt="" className={styles.sectionIcon} />
                  Auto Harvester
                </h5>
                <ul>
                  <li><strong>Function:</strong> Harvests the crop for you when it's ready, checking every {HARVESTER_BASE_TIMER} seconds to start with</li>
                  <li><strong>Price:</strong> One purchase per crop: $7 for Radish and $30 for Lettuce, then about double for each later vegetable</li>
                  <li><strong>Rewards:</strong> Auto harvests give half the experience and knowledge of a manual harvest</li>
                  <li><strong>Pause:</strong> Switch it between On and Paused in the tool shed</li>
                </ul>

                <h5 className={styles.sectionTitle}>
                  <img src={UPGRADE_HARVESTER_SPEED} alt="" className={styles.sectionIcon} />
                  Harvester Speed
                </h5>
                <ul>
                  <li><strong>Effect:</strong> +5% Auto Harvester speed per level, once you own the Auto Harvester</li>
                  <li><strong>Timer:</strong> {HARVESTER_BASE_TIMER} ÷ (1 + 0.05 × level) seconds</li>
                  <li><strong>Price:</strong> $50 for Radish's first level; each level costs about 25% more</li>
                  <li><strong>Example:</strong> Level 10 = a harvest every 33 seconds</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={FRUIT_STRAWBERRY} alt="" aria-hidden="true" className={styles.sectionIcon} />
                  Fruits
                </h4>
                <ul>
                  <li><strong>Opening:</strong> The Growers Guild's Fruit Cultivation opens ten fruits; keeping it through a Legacy keeps them open in any guild</li>
                  <li><strong>Value:</strong> Strawberry sells for $15 and Watermelon for $850 before upgrades, and fruits have no favorite seasons</li>
                  <li><strong>Upgrades:</strong> The same five as vegetables, at higher prices</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={ICON_IDEA} alt="" aria-hidden="true" className={styles.sectionIcon} />
                  Strategy Tips:
                </h4>
                <ul>
                  <li><strong>Fertilizer First:</strong> The cheapest way to speed a crop up</li>
                  <li><strong>Auto Harvester Early:</strong> It keeps harvesting while you're busy elsewhere</li>
                  <li><strong>Plots vs New Crops:</strong> More plots on an early crop often pay better than waiting for the next crop</li>
                  <li><strong>Better Seeds Timing:</strong> The knowledge you keep boosts experience, so buy Better Seeds when you can spare it</li>
                  <li><strong>Hold for Canning:</strong> Set crops you mean to can to Hold, so Sell All and the Merchant leave them in the stash</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'upgrades' && (
              <div>
                <h4 className={styles.sectionTitle}>
                  <img src={UPGRADE_GREENHOUSE} alt="" aria-hidden="true" className={styles.sectionIcon} />
                  Farm Upgrades
                </h4>
                <p>These upgrades help every crop. They sit in the Growing tab's tool shed under the picked crop's upgrades, and they reset when you buy a larger farm.</p>

                <h5 className={styles.sectionTitle}>
                  <img src={UPGRADE_FARMERS_ALMANAC} alt="" className={styles.sectionIcon} />
                  Farmer's Almanac (Knowledge Multiplier)
                </h5>
                <ul>
                  <li><strong>Effect:</strong> +10% knowledge from every harvest, per level</li>
                  <li><strong>Formula:</strong> Harvest knowledge × (1 + level × 0.10); the Farm Tier bonus is added after</li>
                  <li><strong>Price:</strong> $10, then the last price × 1.15 + $5: $10 → $17 → $25 → $34 → $45</li>
                  <li><strong>Example:</strong> Level 5 = +50% knowledge per harvest</li>
                </ul>

                <h5 className={styles.sectionTitle}>
                  <img src={UPGRADE_IRRIGATION} alt="" className={styles.sectionIcon} />
                  Irrigation
                </h5>
                <ul>
                  <li><strong>Effect:</strong> +15% growth all the time, and Droughts no longer slow your crops</li>
                  <li><strong>Price:</strong> ${IRRIGATION_COST.toLocaleString('en-US')} and {IRRIGATION_KN_COST} knowledge, once per farm</li>
                </ul>

                <h5 className={styles.sectionTitle}>
                  <img src={UPGRADE_MERCHANT} alt="" className={styles.sectionIcon} />
                  Merchant (Auto-Sell)
                </h5>
                <ul>
                  <li><strong>Effect:</strong> Sells your stash every {MERCHANT_DAYS} days, like pressing Sell All</li>
                  <li><strong>Hold:</strong> Crops set to Hold stay in the stash</li>
                  <li><strong>Countdown:</strong> Its row in the tool shed shows the days to its next sale</li>
                  <li><strong>Price:</strong> ${MERCHANT_COST.toLocaleString('en-US')} and {MERCHANT_KN_COST} knowledge, once per farm</li>
                </ul>

                <h5 className={styles.sectionTitle}>
                  <img src={UPGRADE_GREENHOUSE} alt="" className={styles.sectionIcon} />
                  Greenhouse
                </h5>
                <ul>
                  <li><strong>Effect:</strong> Winter no longer slows your crops (normally 10% speed), and they keep growing in Snow</li>
                  <li><strong>Price:</strong> ${GREENHOUSE_COST_PER_PLOT} and {GREENHOUSE_KN_COST_PER_PLOT} knowledge for each plot of your farm's limit</li>
                </ul>

                <h5 className={styles.sectionTitle}>
                  <img src={UPGRADE_HEIRLOOM_SEEDS} alt="" className={styles.sectionIcon} />
                  Heirloom Seeds
                </h5>
                <ul>
                  <li><strong>Effect:</strong> Better Seeds give ×1.5 per level instead of ×1.25</li>
                  <li><strong>Price:</strong> ${HEIRLOOM_COST_PER_VEGGIE.toLocaleString('en-US')} and {HEIRLOOM_KN_PER_VEGGIE} knowledge for each crop, up to the furthest one you have ever opened</li>
                  <li><strong>Example:</strong> Better Seeds level 3 = 1.95× without, 3.38× with</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={ICON_IDEA} alt="" aria-hidden="true" className={styles.sectionIcon} />
                  Strategy Tips:
                </h4>
                <ul>
                  <li><strong>Knowledge Management:</strong> The knowledge you keep boosts experience, so don't spend it all at once</li>
                  <li><strong>Greenhouse Before Winter:</strong> Winter takes up more than a quarter of the year</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'autopurchase' && (
              <div>
                <h4><InlineIcon src={ICON_AUTOMATION} alt="Auto" size={24} gap={4} /> Auto-Purchaser System</h4>
                <p>Auto-buyers buy upgrades for you every {AUTO_PURCHASER_CYCLE_DAYS} days while they're on and you can afford them. Each crop has its own four, hired in the Growing tab's tool shed beside the upgrade each one buys.</p>

                <h5><InlineIcon src={ICON_MILESTONE} size={18} gap={4} /> How Auto-Buyers Work:</h5>
                <ul>
                  <li><strong>Timer:</strong> All auto-buyers share one {AUTO_PURCHASER_CYCLE_DAYS}-day cycle; the garden shows the days to the next one while any auto-buyer is on</li>
                  <li><strong>Buying:</strong> When the timer runs out, each auto-buyer that's on buys one level of its upgrade if you can afford it</li>
                  <li><strong>Per Crop:</strong> Each crop's auto-buyers are hired and switched on their own</li>
                  <li><strong>On and Off:</strong> Switch a hired auto-buyer on or off at any time</li>
                </ul>

                <h5><InlineIcon src={ICON_MILESTONE} size={18} gap={4} /> Purchase Order:</h5>
                <ul>
                  <li><strong>Crop Order:</strong> Vegetables from Radish to Onions, then fruits</li>
                  <li><strong>Auto-Buyer Order:</strong> Assistant → Cultivator → Surveyor → Mechanic</li>
                  <li><strong>Short on Money:</strong> Earlier crops buy first</li>
                </ul>

                <h5 className={styles.sectionTitle}>
                  <img src={AUTO_ASSISTANT} alt="" className={styles.sectionIcon} />
                  Assistant
                </h5>
                <ul>
                  <li><strong>Buys:</strong> Fertilizer, with money</li>
                  <li><strong>Benefit:</strong> Keeps a crop growing faster without clicking</li>
                </ul>

                <h5 className={styles.sectionTitle}>
                  <img src={AUTO_CULTIVATOR} alt="" className={styles.sectionIcon} />
                  Cultivator
                </h5>
                <ul>
                  <li><strong>Buys:</strong> Better Seeds, with knowledge</li>
                  <li><strong>Benefit:</strong> Keeps raising a crop's sale price</li>
                </ul>

                <h5 className={styles.sectionTitle}>
                  <img src={AUTO_SURVEYOR} alt="" className={styles.sectionIcon} />
                  Surveyor
                </h5>
                <ul>
                  <li><strong>Buys:</strong> Additional Plots, with money</li>
                  <li><strong>Benefit:</strong> More of the crop per harvest</li>
                  <li><strong>Note:</strong> Can't be hired while the farm has no free plot</li>
                </ul>

                <h5 className={styles.sectionTitle}>
                  <img src={AUTO_MECHANIC} alt="" className={styles.sectionIcon} />
                  Mechanic
                </h5>
                <ul>
                  <li><strong>Buys:</strong> Harvester Speed, with money</li>
                  <li><strong>Benefit:</strong> Faster Auto Harvester</li>
                  <li><strong>Note:</strong> Shows up once the crop has its Auto Harvester</li>
                </ul>

                <h5 className={styles.sectionTitle}>
                  <img src={ICON_LEARNING} alt="" className={styles.sectionIcon} />
                  In the Growing Tab:
                </h5>
                <ul>
                  <li><strong>Hire with a price:</strong> Not hired yet. Grayed out when you can't afford it, or for the Surveyor when no plot is free</li>
                  <li><strong>On (green):</strong> Hired and buying</li>
                  <li><strong>Off (gray):</strong> Hired but paused</li>
                  <li><strong>Bed Dots:</strong> Beside each upgrade level on a bed: green for on, gray for paused, hollow for not hired</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={ICON_IDEA} alt="" aria-hidden="true" className={styles.sectionIcon} />
                  Auto-Purchaser Strategy:
                </h4>
                <ul>
                  <li><strong>Early Game:</strong> Hire the Assistant first for steady Fertilizer</li>
                  <li><strong>Knowledge Phase:</strong> Add the Cultivator once knowledge comes in steadily</li>
                  <li><strong>Expansion Phase:</strong> Hire the Surveyor while you still have free plots</li>
                  <li><strong>Late Game:</strong> Add the Mechanic after the Auto Harvester for full automation</li>
                  <li><strong>Saving Up:</strong> Switch auto-buyers off when you're saving for something big</li>
                  <li><strong>New Crops:</strong> Each crop you open needs its own auto-buyers</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'canning' && (
              <div>
                <h4 className={styles.sectionTitle}>
                  <img src={ICON_CANNING} alt="" aria-hidden="true" className={styles.sectionIcon} />
                  Canning System
                </h4>
                <p>The Canning System unlocks at Farm Tier 3. It turns the crops in your stash into jars that sell for more than the crops would, and pays knowledge and canning experience too.</p>

                <h5><InlineIcon src={ICON_MILESTONE} size={18} gap={4} /> How Canning Works:</h5>
                <ul>
                  <li><strong>Recipes:</strong> Each recipe needs certain vegetables, and honey recipes need honey too</li>
                  <li><strong>Honey Jars:</strong> With Honey Jars from the Bees tab, the Kitchen can honey alone: a Jar of Honey or a Jar of Golden Honey</li>
                  <li><strong>Batches:</strong> A batch cooks on one stove slot for a while, then its jars sell on their own</li>
                  <li><strong>More Recipes:</strong> Canning experience opens new recipes; some need honey collected or an achievement</li>
                  <li><strong>Rewards:</strong> 2 knowledge and 10 canning experience per vegetable, and a recipe of honey alone counts as one; Canner batches give a tenth</li>
                </ul>

                <h5><InlineIcon src={ICON_RECIPE} size={18} gap={4} /> The Kitchen:</h5>
                <ul>
                  <li><strong>Pantry:</strong> The crops and honey you have for canning; a crop in red has run out</li>
                  <li><strong>Stove:</strong> Every batch cooking, with the seconds it has left; <InlineIcon src={CANNING_CANNER} size={14} gap={2} /> marks batches the Canner started</li>
                  <li><strong>Recipe Book:</strong> Each recipe's ingredients, what a batch sells for and how long it takes; a greyed ingredient with a red outline is short</li>
                  <li><strong>Can:</strong> Starts a batch; it's off while every stove slot is busy</li>
                  <li><strong>Details:</strong> Click a recipe's name for its ingredients, profit and rewards</li>
                  <li><strong>Filters:</strong> Show one category, or only recipes you can make, and sort by profit, name, time or ingredients</li>
                </ul>

                <h5><InlineIcon src={ICON_UPGRADE} size={18} gap={4} /> Canning Upgrades:</h5>
                <ul>
                  <li><strong>Quick Hands:</strong> Batches take 5% less time per level</li>
                  <li><strong>Family Recipe:</strong> Jars sell for 10% more per level</li>
                  <li><strong>Heirloom Touch:</strong> 5% chance per level of a bonus jar</li>
                  <li><strong>Batch Canning:</strong> One more stove slot per level</li>
                  <li><strong>Canner:</strong> Starts a batch every 10 seconds</li>
                </ul>

                <h5><InlineIcon src={ICON_AUTOMATION} alt="Auto" size={20} gap={4} /> The Canner:</h5>
                <ul>
                  <li><strong>How it Works:</strong> Every 10 seconds it starts the first recipe in your sort order that the stash covers</li>
                  <li><strong>Honey Jars:</strong> It leaves them to you, so it never spends the honey you save for hives</li>
                  <li><strong>Reduced Rewards:</strong> Its batches give a tenth of the knowledge and canning experience</li>
                  <li><strong>Toggle Control:</strong> Turn it on or off from its upgrade at any time</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={ICON_IDEA} alt="" aria-hidden="true" className={styles.sectionIcon} />
                  Canning Strategy:
                </h4>
                <ul>
                  <li><strong>Hold Crops:</strong> Set crops you use for canning to Hold in the Growing tab, so the merchant leaves them in the pantry</li>
                  <li><strong>Upgrade Early:</strong> Quick Hands and Family Recipe pay off quickly</li>
                  <li><strong>Sort by Profit:</strong> The Canner follows your sort, so it starts the best recipe you can make</li>
                  <li><strong>Can by Hand:</strong> Batches you start give full knowledge and experience</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'guilds' && (
              <div>
                <h4 className={styles.sectionTitle}>
                  <img src={ICON_GUILDS} alt="" aria-hidden="true" className={styles.sectionIcon} />
                  Guilds
                </h4>
                <p>Guilds unlock at Farm Tier 5. Try a few starter upgrades from each guild, then join one for good: you get its own currency, upgrades and bonuses, and accept its trade-offs.</p>

                <h5><InlineIcon src={ICON_GUILD_TOKEN} size={18} gap={4} /> Before You Join:</h5>
                <ul>
                  <li><strong>Guild Tokens:</strong> +1 per manual harvest, +1 per 5 canned goods, +2 per batch of honey, +1 per 10 auto harvests</li>
                  <li><strong>Sampling:</strong> Buy up to two starter upgrades from each guild with Guild Tokens; they work at half strength until you join that guild</li>
                  <li><strong>Joining:</strong> Sample one of a guild's upgrades to join it. Unspent Guild Tokens don't carry over, and the guild's currency is earned only as a member. Only a Legacy lets you change guilds</li>
                  <li><strong>Open Now:</strong> The Growers, the Preservers and the Engineers; the Merchants come in a later update</li>
                </ul>

                <h5><InlineIcon src={GUILD_GROWERS} size={18} gap={4} /> Growers Guild:</h5>
                <ul>
                  <li><strong>Sigils <InlineIcon src={ICON_SIGIL} size={14} gap={2} />:</strong> 1 per manual harvest, and per Blessed Crop</li>
                  <li><strong>Bonuses:</strong> +1 crop on manual harvests and stronger bee pollination</li>
                  <li><strong>Trade-offs:</strong> Auto harvesters run 25% slower and canning pays 15% less</li>
                  <li><strong>Ritual Harvest:</strong> With Ritual Circles, spend 5 Sigils to harvest every ready crop</li>
                  <li><strong>Fruit Cultivation:</strong> Opens 10 fruit crops</li>
                </ul>

                <h5><InlineIcon src={GUILD_PRESERVERS} size={18} gap={4} /> Preservers Guild:</h5>
                <ul>
                  <li><strong>Wax Seals <InlineIcon src={ICON_WAX_SEAL} size={14} gap={2} />:</strong> 1 per batch you start yourself, 1 more per Prize Jar among those, and 3 for each visit from Dunkin; the Canner's batches earn none</li>
                  <li><strong>Bonuses:</strong> Jars sell for 20% more (Master Preserver)</li>
                  <li><strong>Trade-offs:</strong> Raw crops sell for 10% less, and Dunkin raids the pantry</li>
                  <li><strong>Cellar Recipes:</strong> Opens 10 vegetable recipes, from Dilly Beans to Pantry Keeper's Reserve</li>
                  <li><strong>Pressure Canner:</strong> Every batch makes one more jar per level, up to 6</li>
                  <li><strong>Family Cookbook:</strong> A recipe made 25, 100 and 500 times sells for 10%, 25% and 50% more; ribbons on the recipe show it</li>
                  <li><strong>Seal of Quality:</strong> Some batches come out as Prize Jars, worth double, plus an extra Wax Seal on batches you start</li>
                  <li><strong>Rush Batch:</strong> Spend 1 Wax Seal per running batch, at least 5, to finish them all now</li>
                  <li><strong>More:</strong> Cellar Aging, Copper Kettles, Honey Glaze, Trusted Apprentice and Pantry Lock</li>
                </ul>

                <h5><InlineIcon src={SPECIAL_GLUTTON} size={18} gap={4} /> Dunkin the Glutton:</h5>
                <ul>
                  <li><strong>Visits:</strong> Every 5 to 10 minutes of play he shows up somewhere on the screen; never while paused or away</li>
                  <li><strong>Sniffing:</strong> For his first 10 seconds he only sniffs around</li>
                  <li><strong>Eating:</strong> Then every 2 seconds he eats a tenth of one vegetable in your stash, ten bites in all</li>
                  <li><strong>Stuffed:</strong> After his last bite he won't leave, and no new visit comes until he's gone</li>
                  <li><strong>Shooing:</strong> Click him at any time for 3 Wax Seals; sending a stuffed Dunkin home costs a vet bill of 2% of your money</li>
                  <li><strong>Pantry Lock:</strong> Keeps him out of the stash for good; he still visits, and still pays</li>
                </ul>

                <h5><InlineIcon src={GUILD_ENGINEERS} size={18} gap={4} /> Engineers Guild:</h5>
                <ul>
                  <li><strong>Gears <InlineIcon src={ICON_GEARS} size={14} gap={2} />:</strong> 1 per 10 auto harvests, 1 per 5 batches off the factory floor, and 5 for each Tune-Up from Stanley. The machines earn them while you're away too</li>
                  <li><strong>Bonuses:</strong> Every crop gets an Auto Harvester, switched on, that runs 25% faster, and auto harvests give full experience and knowledge. Batches run 30% faster</li>
                  <li><strong>Trade-offs:</strong> No manual harvests or canning, crops sell for 15% less and jars for 25% less, and the bees make 25% less honey</li>
                  <li><strong>The Cannery:</strong> The Canning tab becomes a factory floor with a machine for every stove slot. Each makes the recipe you set while the hopper has its ingredients, and floor batches give half the knowledge and canning experience of a hand-started batch</li>
                  <li><strong>Hold what the floor needs:</strong> The Merchant still sells every crop set to Sell, so set the floor's crops to Hold</li>
                  <li><strong>Bulk Purchasing:</strong> What your auto-buyers buy costs 3% less per level, up to 30%</li>
                  <li><strong>Sprinkler Network and Climate Control:</strong> Irrigation gives +30% growth and stops the Heatwave penalty too; the Greenhouse adds +20% growth in every season</li>
                  <li><strong>Night Shift:</strong> Time away counts up to 12 hours instead of 8</li>
                  <li><strong>More:</strong> Hydraulic Arms, Combine Header, Conveyor Belts, Mass Production, Sound Dampers and Overclock</li>
                  <li><strong>GMO Seeds:</strong> Engineers know Heirloom Seeds as GMO Seeds; it works the same</li>
                </ul>

                <h5><InlineIcon src={SPECIAL_STANLEY} size={18} gap={4} /> Stanley the Cat:</h5>
                <ul>
                  <li><strong>Visits:</strong> Every 3 to 6 minutes of play he shows up somewhere on the screen and waits 20 seconds; never while paused or away. Missing him costs nothing</li>
                  <li><strong>Tune-Up:</strong> Click him for 5 Gears, and every machine runs twice as fast for 60 seconds, or 90 with Overclock. The header shows the seconds left</li>
                  <li><strong>Machines:</strong> The Auto Harvesters and the factory floor. The auto-buyers are people, not machines, so they keep their pace</li>
                </ul>

                <h5><InlineIcon src={ICON_SCROLL} size={18} gap={4} /> Legacy:</h5>
                <ul>
                  <li><strong>What it is:</strong> From Farm Tier 6, a guild member can end their Legacy from the Guilds tab. The farm starts over at Tier 1, and the guild's benefits carry on</li>
                  <li><strong>Kept levels:</strong> Half the levels bought this Legacy in your guild's upgrades, rounded down, added to what you kept before. They work at full strength in any guild, and count toward the max level</li>
                  <li><strong>Kept unlock:</strong> One one-time upgrade of your guild, kept for good. Ritual Circles and Rush Batch stay with their guilds, since their abilities spend guild currency, and so does Overclock, since Stanley visits only Engineers</li>
                  <li><strong>Kept achievements:</strong> Special and hidden ones, with the bonuses and outfits they grant. The rest can be earned again</li>
                  <li><strong>Kept events:</strong> Pumpkin Rush and Christmas Tree Shop progress is untouched</li>
                  <li><strong>Back to the start:</strong> Money, knowledge, experience, crops, canning, bees, achievements, guild membership and currency. You choose a guild again at Farm Tier 5, the same one or another</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'bees' && (
              <div>
                <h4 className={styles.sectionTitle}>
                  <img src={ICON_BEE} alt="" className={styles.sectionIcon} />
                  Bee System
                </h4>
                <p>Bees open at <strong>Farm Tier {BEE_CONSTANTS.UNLOCK_FARM_TIER}</strong>, with {BEE_CONSTANTS.STARTING_BEE_BOXES} hives to start. Hives make honey, raise every crop's harvest, and now and then make Golden Honey for the Kitchen's honey recipes.</p>

                <h5><InlineIcon src={ICON_BEE_HIVE} size={18} gap={4} /> The Bees Tab:</h5>
                <ul>
                  <li><strong>Apiary:</strong> A honeycomb with a cell for each of up to {BEE_CONSTANTS.MAX_BEE_BOXES} hives. A hive's cell fills with honey as its next batch nears, and shows the days to go</li>
                  <li><strong>Collecting:</strong> A cell with a gold edge has honey waiting: click it to collect that hive, or use Collect all in the Honey House</li>
                  <li><strong>New hives:</strong> The cell after your last hive buys the next one. Empty cells show what more hives open</li>
                  <li><strong>Honey House:</strong> Your honey and Golden Honey, the batches waiting, what your bees give the farm, and the Beekeeper</li>
                  <li><strong>Upgrades:</strong> Grouped by what they improve: speed, honey a batch, Golden Honey, crops and winter</li>
                </ul>

                <h5><InlineIcon src={ICON_HONEY} size={18} gap={4} /> Honey:</h5>
                <ul>
                  <li><strong>Batches:</strong> Each hive makes a 15 lb batch every {BEE_CONSTANTS.BASE_PRODUCTION_TIME} days, sooner with Busy Bees, Swift Gatherers and the Beekeeper, bigger with Super Frames and Nectar Efficiency</li>
                  <li><strong>Stockpiling:</strong> Bees don't wait for you: a finished batch stays in the hive while they start the next</li>
                  <li><strong>Golden Honey:</strong> <InlineIcon src={ICON_GOLDEN_HONEY} alt="Golden Honey" size={16} /> Each batch has a 1% chance to come out golden, 2% with Royal Jelly; Queen's Blessing doubles it, and Golden Touch adds 2% more</li>
                  <li><strong>Winter:</strong> Bees rest from day {WINTER_START_DAY} to the end of the year, unless they have Winter Hardiness</li>
                </ul>

                <h5><InlineIcon src={ICON_BEE_HIVE} size={18} gap={4} /> Hive Prices:</h5>
                <p>Hives cost honey. Each costs 75 more than the last, and the step doubles with each set of five:</p>
                <ul>
                  <li><strong>Hives 3–5:</strong> {hivePrice(2).toLocaleString('en-US')} to {hivePrice(4).toLocaleString('en-US')} honey each</li>
                  <li><strong>Hives 6–10:</strong> {hivePrice(5).toLocaleString('en-US')} to {hivePrice(9).toLocaleString('en-US')}</li>
                  <li><strong>Hives 11–15:</strong> {hivePrice(10).toLocaleString('en-US')} to {hivePrice(14).toLocaleString('en-US')}</li>
                  <li><strong>Hives 16–20:</strong> {hivePrice(15).toLocaleString('en-US')} to {hivePrice(19).toLocaleString('en-US')}</li>
                  <li><strong>Hives 21–25:</strong> {hivePrice(20).toLocaleString('en-US')} to {hivePrice(24).toLocaleString('en-US')}</li>
                  <li><strong>Hives 26–30:</strong> {hivePrice(25).toLocaleString('en-US')} to {hivePrice(29).toLocaleString('en-US')}</li>
                </ul>

                <h5><InlineIcon src={ICON_GROWING} size={18} gap={4} /> Crop Bonus:</h5>
                <ul>
                  <li><strong>Every hive:</strong> +0.5% to every crop's harvest</li>
                  <li><strong>Meadow Magic:</strong> +0.5% more per hive for each level, up to 20 levels</li>
                  <li><strong>Flower Power:</strong> +0.2% more per hive</li>
                  <li><strong>Example:</strong> 30 hives with Meadow Magic at level 10 and Flower Power give +{percent(cropBonus(30, { meadowMagic: 10, flowerPower: true }))}</li>
                </ul>

                <h5><InlineIcon src={ICON_UPGRADE} size={18} gap={4} /> Upgrades:</h5>
                <ul>
                  <li><strong>Busy Bees:</strong> Batches 1% faster a level, 50 levels, from {BEE_UPGRADE_COSTS.busyBees} honey</li>
                  <li><strong>Super Frames:</strong> 5% more honey a batch a level, 20 levels, from {BEE_UPGRADE_COSTS.hexcombEngineering} honey</li>
                  <li><strong>Meadow Magic:</strong> +0.5% crops per hive a level, 20 levels, from {BEE_UPGRADE_COSTS.meadowMagic} honey</li>
                  <li><strong>Royal Jelly:</strong> +1% Golden chance, {BEE_UPGRADE_COSTS.royalJelly} honey</li>
                  <li><strong>Queen's Blessing:</strong> Doubles the Golden chance, {BEE_UPGRADE_COSTS.queensBlessing} Golden Honey, after Royal Jelly</li>
                  <li><strong>Winter Hardiness:</strong> Bees work through winter, {BEE_UPGRADE_COSTS.winterHardiness} Golden Honey, at 10 hives</li>
                  <li><strong>Golden Touch:</strong> +2% Golden chance on top of Queen's Blessing, {BEE_UPGRADE_COSTS.goldenTouch} Golden Honey, at 15 hives</li>
                  <li><strong>Nectar Efficiency:</strong> 10% more honey a batch, {BEE_UPGRADE_COSTS.nectarEfficiency} Golden Honey, at 20 hives</li>
                  <li><strong>Flower Power:</strong> +0.2% crops per hive, {BEE_UPGRADE_COSTS.flowerPower} Golden Honey, at 25 hives after Meadow Magic</li>
                  <li><strong>Swift Gatherers:</strong> Batches take 15% less time, {BEE_UPGRADE_COSTS.swiftGatherers} Golden Honey, at 30 hives after Busy Bees</li>
                  <li><strong>Honey Jars:</strong> The Kitchen jars honey alone, {BEE_UPGRADE_COSTS.honeyJars.toLocaleString('en-US')} honey</li>
                </ul>

                <h5><InlineIcon src={BEE_BEEKEEPER} size={18} gap={4} /> The Beekeeper:</h5>
                <ul>
                  <li><strong>Hiring:</strong> Needs {BEE_CONSTANTS.BEEKEEPER_ASSISTANT_UNLOCK_BOXES} hives and {BEEKEEPER_HIRE_COST} honey</li>
                  <li><strong>Work:</strong> Collects every batch as it's made, so honey never waits</li>
                  <li><strong>Speed:</strong> While he's on, bees work {percent(beekeeperBonusAt(0))} faster, and 5% more for each level he gains, up to {percent(beekeeperBonusAt(BEE_CONSTANTS.BEEKEEPER_MAX_LEVEL))} at level {BEE_CONSTANTS.BEEKEEPER_MAX_LEVEL}</li>
                  <li><strong>Levels:</strong> The first costs {BEE_CONSTANTS.BEEKEEPER_BASE_UPGRADE_COST.toLocaleString('en-US')} honey, and each after costs {BEE_CONSTANTS.BEEKEEPER_COST_SCALING} times the last</li>
                  <li><strong>Switch:</strong> Turn him on or off in the Honey House</li>
                </ul>

                <h5><InlineIcon src={ICON_CANNING} size={18} gap={4} /> Honey in Canning:</h5>
                <ul>
                  <li><strong>Honey Recipes:</strong> 16 canning recipes need Golden Honey: 1 each, or 2 for Golden Garden Treasure</li>
                  {HONEY_JARS.map(jar => (
                    <li key={jar.id}>
                      <strong>{jar.name}:</strong> {jar.honeyRequirement && jar.honeyRequirement.golden > 0 ? `${jar.honeyRequirement.golden} lbs of Golden Honey` : `${jar.honeyRequirement?.regular ?? 0} lbs of honey`}, {jar.baseProcessingTime} seconds on the stove, sells from ${jar.baseSalePrice}, once you buy Honey Jars
                    </li>
                  ))}
                  <li><strong>Unlocking:</strong> Honey recipes open as you collect more honey and gain canning experience</li>
                  <li><strong>Beekeeper's Pride:</strong> The ultimate honey recipe for achievement hunters</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={ICON_IDEA} alt="" aria-hidden="true" className={styles.sectionIcon} />
                  Bee Strategy:
                </h4>
                <ul>
                  <li><strong>Hives first:</strong> Every hive makes honey and raises every crop's harvest</li>
                  <li><strong>The Beekeeper:</strong> Hire him at {BEE_CONSTANTS.BEEKEEPER_ASSISTANT_UNLOCK_BOXES} hives so honey never waits; his speed adds to Busy Bees</li>
                  <li><strong>Golden Honey:</strong> Royal Jelly and Queen's Blessing take the chance from 1% to 4%, and Golden Touch to 6%</li>
                  <li><strong>Winter:</strong> Winter Hardiness at 10 hives keeps the bees working through winter</li>
                  <li><strong>Crops:</strong> Meadow Magic counts every hive, so it pays more as the apiary fills</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'christmas' && (
              <div>
                <h4 className={styles.sectionTitle}><img src={TREE_DECORATED} alt="" className={styles.sectionIcon} />
                   Christmas Tree Shop Event
                </h4>
                <p>The Christmas Tree Shop is a seasonal event available from <strong>November 1st - December 25th</strong>. Grow Christmas trees, craft decorations, and sell decorated trees to earn Holiday Cheer!</p>
                
                <h5><InlineIcon src={TREE_PINE} alt="Tree" size={20} gap={4} /> Tree Farming:</h5>
                <ul>
                  <li><strong>Growth Time:</strong> Trees take 5-7 in-game years to grow (varies by type)</li>
                  <li><strong>Tree Types:</strong> Pine (7 years), Spruce (6 years), Fir (5 years)</li>
                  <li><strong>Harvesting:</strong> Harvest mature trees to collect Wood, Pinecones, and Branches</li>
                  <li><strong>Perfect Trees:</strong> ⭐ Perfect trees give 2x materials and 10 Holiday Cheer (vs 5 for normal)</li>
                  <li><strong>Luxury Trees:</strong> ✨ Luxury trees give 3x materials and 15 Holiday Cheer</li>
                  <li><strong>Plot Expansion:</strong> Start with 6 plots, upgrade to unlock up to 12 plots</li>
                </ul>

                <h5><InlineIcon src={ICON_TREE_WORKSHOP} alt="Workshop" size={20} gap={4} /> Workshop:</h5>
                <ul>
                  <li><strong>Craft Decorations:</strong> Use materials to craft ornaments, garland, and candles</li>
                  <li><strong>Decorate Trees:</strong> Add decorations to trees before selling for bonus value</li>
                  <li><strong>Elves' Bench:</strong> Once unlocked, automates crafting and decoration</li>
                </ul>

                <h5><InlineIcon src={ICON_ELVES} alt="Elves" size={20} gap={4} /> Elves' Bench Automation:</h5>
                <ul>
                  <li><strong>Daily Crafting:</strong> Elves automatically craft 1 decoration per in-game day</li>
                  <li><strong>Crafting Priority:</strong>
                    <ul>
                      <li>Priority 1: Garland (3 Branches + 2 Pinecones → 1 Garland)</li>
                      <li>Priority 2: Candles (2 Wood → 1 Candle)</li>
                      <li>Priority 3: Ornaments (1 Wood → 2 Ornaments, requires Ornament Bench)</li>
                      <li>Priority 4: Traditional Ornaments (5 Pinecones → 3 Ornaments, requires upgrade)</li>
                    </ul>
                  </li>
                  <li><strong>Harvest Auto-Decoration:</strong> Trees are automatically decorated on harvest with the most valuable combination available</li>
                  <li><strong>Decoration Priority:</strong>
                    <ul>
                      <li>Priority 1: Luxury (Ornament + Candle)</li>
                      <li>Priority 2: Candled (Candle only)</li>
                      <li>Priority 3: Ornamented (Ornament only)</li>
                      <li>Default: Plain tree</li>
                    </ul>
                  </li>
                </ul>

                <h5><InlineIcon src={ICON_TREE_STOREFRONT} alt="Shopfront" size={20} gap={4} /> Shopfront:</h5>                <ul>
                  <li><strong>Sell Trees:</strong> Sell decorated trees for Holiday Cheer</li>
                  <li><strong>Sell Decorations:</strong> Sell excess ornaments (1 cheer), candles (2 cheer), or garland (4 cheer)</li>
                  <li><strong>Price Bonuses:</strong> Decorations add value (+5% ornaments, +15% candles, double for luxury trees, triple with the Star Forge)</li>
                  <li><strong>Demand Multiplier:</strong> Prices increase as Christmas approaches</li>
                  <li><strong>Daily Bonus:</strong> Claim bonus Holiday Cheer each day (requires Wreath Sign upgrade)</li>
                  <li><strong>Passive Income:</strong> Golden Bell Counter provides idle Holiday Cheer generation</li>
                </ul>

                <h5>⬆️ Stage 1 Upgrades (Evergreen Farming):</h5>
                <ul>
                  <li><strong>Pine/Spruce/Fir Saplings:</strong> Unlock new tree types</li>
                  <li><strong>Fertilized Soil:</strong> +25% growth speed for all trees</li>
                  <li><strong>Greenhouse Extension:</strong> Protect trees from snowstorms</li>
                  <li><strong>Evergreen Essence:</strong> 10% chance for Perfect Trees</li>
                </ul>

                <h5>🎁 Event Strategy:</h5>
                <ul>
                  <li>Start by planting Pine trees (unlocked by default)</li>
                  <li>Upgrade to faster-growing trees (Spruce, Fir) as you earn Holiday Cheer</li>
                  <li>Purchase Fertilized Soil early for +25% growth speed on all trees</li>
                  <li>Perfect trees are rare but very valuable - watch for the ⭐ badge!</li>
                  <li>Event progress persists year-to-year, so you can continue next season</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'pumpkin' && (
              <div>
                <h4 className={styles.sectionTitle}>🎃 Fall Pumpkin Rush</h4>
                <p>The Pumpkin Rush is a seasonal event from <strong>September 22nd through Thanksgiving</strong>. Grow pumpkins, carve and light them, sell them at the Farm Stand for Candy Corn, and enter giant pumpkins in the County Fair!</p>

                <h5>🌾 Pumpkin Patch:</h5>
                <ul>
                  <li><strong>Varieties:</strong> Sugar Pie (quick, full of pulp), Carver (best for carving) and Atlantic Giant (slow and enormous)</li>
                  <li><strong>Harvesting:</strong> Ripe pumpkins give Seeds, Pulp and Vines, plus a little Candy Corn</li>
                  <li><strong>Blue Ribbons:</strong> 🎀 With Prize Seeds, some pumpkins grow into Blue Ribbon pumpkins worth double</li>
                  <li><strong>Atlantic Giants:</strong> Weighed at harvest and kept on the giant shelf for the County Fair</li>
                </ul>

                <h5>🛖 Carving Barn:</h5>
                <ul>
                  <li><strong>Crafting:</strong> Bake pies, make candles and cut carving stencils</li>
                  <li><strong>Carving:</strong> A stencil carves a pumpkin (+2 Candy Corn), a candle lights it (+3 Candy Corn), and both make a Jack-o'-Lantern (triple value)</li>
                  <li><strong>Scarecrow Crew:</strong> Once hired, crafts supplies and finishes pumpkins for you</li>
                </ul>

                <h5>🧺 Farm Stand:</h5>
                <ul>
                  <li><strong>Selling:</strong> Sell pumpkins, pies, candles and stencils for Candy Corn</li>
                  <li><strong>Demand:</strong> Prices rise every day until they double on Halloween, then stay doubled until the event ends on Thanksgiving</li>
                  <li><strong>Achievements:</strong> Selling pumpkins earns achievements that pay Candy Corn and farm rewards, plus two new looks for Archie: a Fall Sweater at 50 pumpkins sold and a Warlock Costume at 2,500</li>
                </ul>

                <h5>🎡 County Fair:</h5>
                <ul>
                  <li><strong>Weigh-off:</strong> The fair opens once a game year (every 365 days). Enter one giant and it is weighed against three rivals</li>
                  <li><strong>Prizes:</strong> First, second and third place win ribbons and Candy Corn; heavier winners earn more</li>
                  <li><strong>Rivals:</strong> The competition grows heavier with every fair you enter, so feed your giants Giant Vine Tonic</li>
                  <li><strong>Champion seeds:</strong> Every first place saves seeds from your winner: future Atlantic Giants weigh 5% more, up to 40%</li>
                </ul>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
});

InfoOverlay.displayName = 'InfoOverlay';

export default InfoOverlay;


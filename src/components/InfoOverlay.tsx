import React, { useState } from 'react';
import type { InfoCategory } from '../types/game';
import { ICON_GROWING, ICON_IDEA, ICON_CANNING } from '../config/assetPaths';
import styles from './InfoOverlay.module.css';

interface InfoOverlayProps {
  visible: boolean;
  onClose: () => void;
  GREENHOUSE_COST_PER_PLOT: number;
  GREENHOUSE_KN_COST_PER_PLOT: number;
}

const InfoOverlay: React.FC<InfoOverlayProps> = ({
  visible, 
  onClose, 
  GREENHOUSE_COST_PER_PLOT, 
  GREENHOUSE_KN_COST_PER_PLOT 
}) => {
  const [selectedInfoCategory, setSelectedInfoCategory] = useState<InfoCategory>('seasons');

  if (!visible) return null;

  const categories: Array<{ id: InfoCategory; label: string }> = [
    { id: 'seasons', label: 'Seasons & Weather' },
    { id: 'farm', label: 'Farm & Experience' },
    { id: 'veggies', label: 'Veggie Upgrades' },
    { id: 'upgrades', label: 'Farm Upgrades' },
    { id: 'autopurchase', label: 'Auto-Purchasers' },
    { id: 'canning', label: 'Canning System' }
  ];

  const categoryTitles: Record<InfoCategory, string> = {
    seasons: 'Seasons & Weather',
    farm: 'Farm & Experience',
    veggies: 'Veggie Upgrades',
    upgrades: 'Farm Upgrades',
    autopurchase: 'Auto-Purchasers',
    canning: 'Canning System'
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Category Navigation */}
        <div className={styles.sidebar}>
          <h3 className={styles.header}>Game Help</h3>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedInfoCategory(category.id)}
              className={`${styles.sidebarButton} ${selectedInfoCategory === category.id ? styles.active : ''}`}
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
            >
              Close
            </button>
          </div>
          
          {/* Content based on selected category */}
          <div className={styles.contentBody}>
            {selectedInfoCategory === 'seasons' && (
              <div>
                <h4 className={styles.sectionTitle}>
                  <img src={ICON_GROWING} alt="Growing" className={styles.sectionIcon} />
                  Seasons
                </h4>
                <p>The game cycles through four seasons: <strong>Spring → Summer → Fall → Winter</strong>. Each season lasts ~90 days and affects how your vegetables grow.</p>
                
                <h5>Season Effects:</h5>
                <ul>
                  <li><strong>Winter:</strong> 90% growth penalty (only 10% normal speed) unless you own a Greenhouse</li>
                  <li><strong>Spring/Summer/Fall:</strong> Normal growth rates</li>
                  <li><strong>Seasonal Bonuses:</strong> All vegetables get +10% growth during their preferred seasons</li>
                </ul>
                
                <h5>Seasonal Vegetable Bonuses (+10% growth):</h5>
                <ul>
                  <li><strong>Spring:</strong> Radish, Lettuce, Carrots, Cabbage, Onions</li>
                  <li><strong>Summer:</strong> Green Beans, Zucchini, Cucumbers, Tomatoes, Peppers</li>
                  <li><strong>Fall:</strong> Radish, Lettuce, Carrots, Broccoli, Cabbage</li>
                  <li><strong>Winter:</strong> No bonuses</li>
                </ul>
                
                <h4>🌦️ Weather System</h4>
                <p>Weather changes randomly each day with different probabilities by season:</p>
                
                <h5>Weather Effects:</h5>
                <ul>
                  <li><strong>Clear:</strong> Normal growth (no bonus/penalty)</li>
                  <li><strong>Rain:</strong> +20% growth boost for all vegetables</li>
                  <li><strong>Storm:</strong> +10% growth boost for all vegetables</li>
                  <li><strong>Drought:</strong> -50% growth penalty unless you have Irrigation, +1 Kn per day</li>
                  <li><strong>Heatwave:</strong> -30% growth penalty in Summer, +20% bonus to summer vegetables in spring and fall, +20% bonus to all vegetables in winter</li>
                  <li><strong>Snow:</strong> 100% growth penalty (plants stop growing) unless you have a Greenhouse</li>
                </ul>
                
                <h5>Weather Probabilities by Season:</h5>
                <ul>
                  <li><strong>Rain Chances:</strong> Spring: 20% • Summer: 16% • Fall: 14% • Winter: 10%</li>
                  <li><strong>Drought Chances:</strong> Spring: 1.2% • Summer: 1.2% • Fall: 1.6% • Winter: 0.4%</li>
                  <li><strong>Storm Chances:</strong> Spring: 4% • Summer: 6% • Fall: 3% • Winter: 1%</li>
                  <li><strong>Heatwave Chances:</strong> 1% chance all year</li>
                </ul>
                
                <h4 className={styles.sectionTitle}>
                  <img src={ICON_IDEA} alt="Idea" className={styles.sectionIcon} />  
                  Strategy Tips:
                </h4>
                <ul>
                  <li><strong>Irrigation:</strong> Protects against Drought events</li>
                  <li><strong>Greenhouse:</strong> Essential upgrade! Eliminates Winter and Snow penalties</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'farm' && (
              <div>
                <h4>🎓 Experience System</h4>
                <p>Experience is earned every time you harvest any vegetable. Each vegetable requires a certain amount of experience to unlock:</p>
                
                <h5>Vegetable Unlock Requirements:</h5>
                <ul>
                  <li><strong>Radish:</strong> 0 exp (starting vegetable)</li>
                  <li><strong>Lettuce:</strong> 90 exp</li>
                  <li><strong>Green Beans:</strong> 162 exp</li>
                  <li><strong>Zucchini:</strong> 292 exp</li>
                  <li><strong>Cucumbers:</strong> 525 exp</li>
                  <li><strong>Tomatoes:</strong> 945 exp</li>
                  <li><strong>Peppers:</strong> 1,701 exp</li>
                  <li><strong>Carrots:</strong> 3,062 exp</li>
                  <li><strong>Broccoli:</strong> 5,512 exp</li>
                  <li><strong>Onions:</strong> 9,921 exp</li>
                </ul>
                <p><em>Formula: 50 × 1.8^(index) for each vegetable</em></p>
                
                <h4>🧠 Knowledge Currency</h4>
                <p>Knowledge is a secondary currency earned from harvesting vegetables:</p>
                
                <h5>Knowledge Earning:</h5>
                <ul>
                  <li><strong>Auto Harvest:</strong> +0.5 Knowledge per vegetable harvested</li>
                  <li><strong>Manual Harvest:</strong> +1 Knowledge per vegetable harvested</li>
                  <li><strong>Experience:</strong> Auto harvest gives 50% of the experience compared to manual harvest</li>
                  <li><strong>Farm Tier Bonus:</strong> +1.25 Knowledge per harvest per farm tier</li>
                  <li><strong>Farmer's Almanac:</strong> Multiplies ALL knowledge gains by (1 + level)</li>
                </ul>
                
                <h5>Knowledge Uses:</h5>
                <ul>
                  <li><strong>Current Knowledge:</strong> Current knowledge multiplies gained experience per harvest by 1%</li>
                  <li><strong>Better Seeds:</strong> Increases sale price (1.25x per level, 1.5x with Heirloom Seeds)</li>
                  <li><strong>Irrigation:</strong> 50 Knowledge + $500 (protects against Drought)</li>
                  <li><strong>Heirloom Seeds:</strong> Cost scales with highest unlocked veggie ever ($2,500 + 200 Knowledge per veggie level)</li>
                </ul>
                
                <h4>🏡 Plot System</h4>
                <p>Each vegetable can have multiple plots. More plots = more simultaneous growing!</p>
                
                <h5>Plot Limitations:</h5>
                <ul>
                  <li><strong>Starting Plots:</strong> 4 total plots across ALL vegetables</li>
                  <li><strong>Additional Plots:</strong> Buy more plots per vegetable (costs money)</li>
                  <li><strong>Max Plots:</strong> Total plots cannot exceed your farm limit</li>
                  <li><strong>⚠️ IMPORTANT:</strong> Each unlocked vegetable AND each additional plot counts toward your plot limit</li>
                  <li><strong>Solution:</strong> Expand your farm when you reach the maximum plots to increase your limit</li>
                </ul>
                
                <h4>🚜 Farm Expansion (Prestige)</h4>
                <p>When you've used all available plots, you can buy a larger farm to reset progress but gain permanent bonuses:</p>
                
                <h5>Farm Purchase Requirements:</h5>
                <ul>
                  <li><strong>Condition:</strong> Must have used ALL available plots</li>
                  <li><strong>Cost:</strong> $500 × 1.85^(farm tier) (exponential scaling)</li>
                  <li><strong>Base Cost:</strong> First farm costs $500, second costs $925, etc.</li>
                </ul>
                
                <h5>What You Keep:</h5>
                <ul>
                  <li><strong>Money:</strong> Leftover money after paying farm cost</li>
                  <li><strong>Knowledge:</strong> 25% of current knowledge (1/3 retention)</li>
                  <li><strong>Max Plots:</strong> Previous max + (experience ÷ 100) new plots (capped at 2x current max)</li>
                  <li><strong>Farm Tier:</strong> Permanent progression level</li>
                </ul>
                
                <h5>What Resets:</h5>
                <ul>
                  <li><strong>Experience:</strong> Back to 0 (must re-unlock vegetables)</li>
                  <li><strong>All Upgrades:</strong> Fertilizer, Harvesters, Speed, Better Seeds reset to 0</li>
                  <li><strong>Global Upgrades:</strong> Greenhouse, Irrigation, Almanac, Auto-Sell, Heirloom reset</li>
                  <li><strong>Current Progress:</strong> All growing vegetables and stashes cleared</li>
                </ul>
                
                <h4 className={styles.sectionTitle}>
                  <img src={ICON_IDEA} alt="Idea" className={styles.sectionIcon} />  
                  Strategy Tips:
                </h4>
                <ul>
                  <li><strong>Prestige Timing:</strong> Buy a new farm when you have excess money, experience and knowledge</li>
                  <li><strong>Knowledge Planning:</strong> Don't spend knowledge right away, as it boosts experience gain</li>
                  <li><strong>Focus on One Veggie:</strong> Usually better to max one vegetable than spread upgrades around</li>
                  <li><strong>Experience Scaling:</strong> Experience determines how many plots your new farm has so stockpile it before prestige</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'veggies' && (
              <div>
                <h4 className={styles.sectionTitle}>
                  <img src={ICON_GROWING} alt="Growing" className={styles.sectionIcon} />
                  Per-Vegetable Upgrades
                </h4>
                <p>Each vegetable has its own individual upgrades that only affect that specific crop:</p>
                
                <h5>🧪 Fertilizer (Growth Speed)</h5>
                <ul>
                  <li><strong>Effect:</strong> +5% multiplicative growth rate per level</li>
                  <li><strong>Base Cost:</strong> $5 for Radish, scales by 1.4× per vegetable</li>
                  <li><strong>Level Scaling:</strong> Cost increases by 1.25× per level</li>
                  <li><strong>Max Levels:</strong> ~97-99 depending on vegetable</li>
                  <li><strong>Example:</strong> Level 10 = +50% growth (1.5× speed)</li>
                </ul>
                
                <h5>🤖 Auto Harvester</h5>
                <ul>
                  <li><strong>Function:</strong> Automatically harvests when vegetables reach 100% growth</li>
                  <li><strong>Base Timer:</strong> 50 seconds between harvest attempts</li>
                  <li><strong>Base Cost:</strong> $8 for Radish, scales by 1.5× per vegetable</li>
                  <li><strong>One-Time Purchase:</strong> No levels, just owned/not owned</li>
                  <li><strong>Knowledge:</strong> Auto harvest gives +0.5 Knowledge vs +1 for manual</li>
                  <li><strong>Experience:</strong> Auto harvest gives 50% of the experience compared to manual harvest</li>
                </ul>
                
                <h5>⚡ Harvester Speed</h5>
                <ul>
                  <li><strong>Effect:</strong> +5% harvester speed per level</li>
                  <li><strong>Formula:</strong> Timer = 50 ÷ (1 + level × 0.05) ticks</li>
                  <li><strong>Base Cost:</strong> $25 for Radish, scales by 1.5× per vegetable</li>
                  <li><strong>Level Scaling:</strong> Cost increases by 1.25× per level</li>
                  <li><strong>Example:</strong> Level 10 = 33 seconds between harvests</li>
                </ul>
                
                <h5>📦 Additional Plots</h5>
                <ul>
                  <li><strong>Effect:</strong> Each level adds +1 plot for that vegetable</li>
                  <li><strong>Harvesting:</strong> Each plot harvests +1 additional vegetable</li>
                  <li><strong>Base Cost:</strong> $20 for Radish, scales by 1.4× per vegetable</li>
                  <li><strong>Level Scaling:</strong> Cost increases by 1.5× per level</li>
                  <li><strong>Plot Limit:</strong> Total plots across ALL vegetables cannot exceed farm limit</li>
                </ul>
                
                <h5>🌟 Better Seeds (Knowledge Upgrade)</h5>
                <ul>
                  <li><strong>Effect:</strong> Increases sale price by 1.25× per level (1.5× with Heirloom Seeds)</li>
                  <li><strong>Currency:</strong> Costs Knowledge, not money</li>
                  <li><strong>Base Cost:</strong> 5 Knowledge for Radish, scales by 1.4× per vegetable</li>
                  <li><strong>Level Scaling:</strong> Cost increases by 1.5× per level</li>
                  <li><strong>Example:</strong> Level 3 Better Seeds = 1.95× sale price (2.92× with Heirloom)</li>
                </ul>
                
                <h4 className={styles.sectionTitle}>
                  <img src={ICON_IDEA} alt="Idea" className={styles.sectionIcon} />  
                  Strategy Tips:
                </h4>
                <ul>
                  <li><strong>Fertilizer Priority:</strong> Most cost-effective upgrade for increasing income</li>
                  <li><strong>Harvester First:</strong> Essential for idle gameplay and knowledge generation</li>
                  <li><strong>Plots vs New Vegetables:</strong> Buy more plots for a lower tier vegetable is often more beneficial than waiting for higher tier vegetables</li>
                  <li><strong>Better Seeds Timing:</strong> Save knowledge for the experience boost rather than immediate upgrades</li>
                  <li><strong>Focus Strategy:</strong> Usually better to max one vegetable than spread upgrades around</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'upgrades' && (
              <div>
                <h4>🏗️ Global Farm Upgrades</h4>
                <p>These upgrades affect your entire farm and apply to all vegetables:</p>
                
                <h5>📚 Farmer's Almanac (Knowledge Multiplier)</h5>
                <ul>
                  <li><strong>Effect:</strong> +10% to ALL knowledge gains per level</li>
                  <li><strong>Formula:</strong> Knowledge × (1 + almanac level × 0.10)</li>
                  <li><strong>Base Cost:</strong> $10</li>
                  <li><strong>Level Scaling:</strong> Cost = previous cost × 1.15 + $5</li>
                  <li><strong>Example:</strong> Level 5 Almanac = +50% knowledge from all sources</li>
                  <li><strong>Progression:</strong> $10 → $17 → $25 → $34 → $44...</li>
                </ul>
                
                <h5>💧 Irrigation System</h5>
                <ul>
                  <li><strong>Effect:</strong> Complete immunity to Drought weather penalty</li>
                  <li><strong>Cost:</strong> $500 + 50 Knowledge (one-time purchase, per farm)</li>
                  <li><strong>Weather Protection:</strong> Prevents -50% growth penalty during Drought</li>
                  <li><strong>Value:</strong> Essential for consistent growth rates</li>
                  <li><strong>Note:</strong> Resets when you buy a larger farm (prestige)</li>
                </ul>

                <h5>🏪 Merchant (Auto-Sell)</h5>
                <ul>
                  <li><strong>Effect:</strong> Automatically sells vegetables from stash every day</li>
                  <li><strong>Cost:</strong> $1,000 + 100 Knowledge (one-time purchase, per farm)</li>
                  <li><strong>Timing:</strong> Triggers once per day at day transition</li>
                  <li><strong>Convenience:</strong> No need to manually click Sell All</li>
                  <li><strong>Value:</strong> Essential for idle gameplay progression</li>
                  <li><strong>Note:</strong> Resets when you buy a larger farm (prestige)</li>
                </ul>

                <h5>🏠 Greenhouse</h5>
                <ul>
                  <li><strong>Effect:</strong> Complete immunity to Winter and Snow penalties</li>
                  <li><strong>Cost:</strong> ${GREENHOUSE_COST_PER_PLOT} + {GREENHOUSE_KN_COST_PER_PLOT} Knowledge per plot (scales with max plots)</li>
                  <li><strong>Winter Protection:</strong> Prevents -90% growth penalty in Winter</li>
                  <li><strong>Snow Protection:</strong> Prevents -100% growth penalty during Snow</li>
                  <li><strong>Value:</strong> Transforms Winter from terrible to normal growing season</li>
                  <li><strong>Note:</strong> Resets when you buy a larger farm (prestige)</li>
                </ul>
                
                <h5>🌟 Heirloom Seeds</h5>
                <ul>
                  <li><strong>Effect:</strong> Improves Better Seeds upgrade from 1.25× to 1.5× per level</li>
                  <li><strong>Cost:</strong> $2,500 + 200 Knowledge per highest vegetable unlocked</li>
                  <li><strong>Calculation:</strong> Each Better Seeds level gives 1.5× price instead of 1.25×</li>
                  <li><strong>Example:</strong> Better Seeds Level 3 = 1.95× without vs 3.375× with Heirloom</li>
                  <li><strong>Value:</strong> Massive late-game money multiplier</li>
                  <li><strong>Note:</strong> Resets when you buy a larger farm (prestige)</li>
                </ul>
                
                <h4 className={styles.sectionTitle}>
                  <img src={ICON_IDEA} alt="Idea" className={styles.sectionIcon} />  
                  Strategy Tips:
                </h4>
                <ul>
                  <li><strong>Knowledge Management:</strong> Knowledge factors into experience gain, so don't spend all of it at once.</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'autopurchase' && (
              <div>
                <h4>🤖 Auto-Purchaser System</h4>
                <p>Auto-Purchasers automatically buy upgrades for you every 7 days when active and affordable. Each vegetable has its own set of auto-purchasers that operate independently.</p>
                
                <h5>🎯 How Auto-Purchasers Work:</h5>
                <ul>
                  <li><strong>Timer:</strong> All auto-purchasers share a unified 7-day cycle timer</li>
                  <li><strong>Purchase Check:</strong> When timer reaches 0, each active auto-purchaser attempts to buy its upgrade</li>
                  <li><strong>Currency Check:</strong> Purchase only happens if you have enough money or knowledge</li>
                  <li><strong>Automatic Reset:</strong> Timer restarts for another 7-day cycle</li>
                  <li><strong>Per-Vegetable:</strong> Each vegetable has independent auto-purchasers</li>
                  <li><strong>Manual Control:</strong> You can toggle each auto-purchaser ON/OFF at any time after purchase</li>
                </ul>
                
                <h5>🎯 Purchase Priority System:</h5>
                <ul>
                  <li><strong>Vegetable Order:</strong> Radish → Lettuce → Green Beans → Zucchini → Cucumbers → Tomatoes → Peppers → Carrots → Broccoli → Onions</li>
                  <li><strong>Auto-Purchaser Order:</strong> Assistant → Cultivator → Surveyor → Mechanic</li>
                  <li><strong>How it Works:</strong> All active auto-purchasers attempt purchases simultaneously every 7 days</li>
                  <li><strong>Currency Limits:</strong> If multiple auto-purchasers need the same currency, earlier vegetables get priority</li>
                </ul>

                <h5>🤝 Assistant</h5>
                <ul>
                  <li><strong>Purchases:</strong> Upgrades Fertilizer automatically</li>
                  <li><strong>Currency:</strong> Uses Money ($)</li>
                  <li><strong>Benefit:</strong> Continuously improves growth speed without manual clicking</li>
                  <li><strong>Strategy:</strong> Essential for idle progression on fertilizer</li>
                </ul>

                <h5>🧑‍🌾 Cultivator</h5>
                <ul>
                  <li><strong>Purchases:</strong> Upgrades Better Seeds automatically</li>
                  <li><strong>Currency:</strong> Uses Knowledge (Kn)</li>
                  <li><strong>Benefit:</strong> Automatically increases sale prices for better profits</li>
                  <li><strong>Strategy:</strong> Crucial for scaling income without manual management</li>
                </ul>

                <h5>🗺️ Surveyor</h5>
                <ul>
                  <li><strong>Purchases:</strong> Upgrades Additional Plot automatically</li>
                  <li><strong>Currency:</strong> Uses Money ($)</li>
                  <li><strong>Benefit:</strong> Automatically expands production capacity</li>
                  <li><strong>Strategy:</strong> Increases vegetables per harvest for exponential growth</li>
                </ul>

                <h5>🔧 Mechanic</h5>
                <ul>
                  <li><strong>Purchases:</strong> Upgrades Harvester Speed automatically</li>
                  <li><strong>Currency:</strong> Uses Money ($)</li>
                  <li><strong>Benefit:</strong> Automatically improves auto-harvester efficiency</li>
                  <li><strong>Strategy:</strong> Only useful after buying the Auto Harvester</li>
                </ul>

                <h5>🎮 Button States & Visual Guide:</h5>
                <ul>
                  <li><strong>Gray Button:</strong> Not purchased and can't afford</li>
                  <li><strong>Yellow Glow:</strong> Not purchased but affordable - click to buy!</li>
                  <li><strong>Green Button:</strong> Purchased and currently ON</li>
                  <li><strong>Red Button:</strong> Purchased but currently OFF</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={ICON_IDEA} alt="Idea" className={styles.sectionIcon} /> 
                  Auto-Purchaser Strategy:
                </h4>
                <ul>
                  <li><strong>Early Game:</strong> Buy Assistant first for consistent fertilizer upgrades</li>
                  <li><strong>Knowledge Phase:</strong> Add Cultivator when you have steady knowledge income</li>
                  <li><strong>Expansion Phase:</strong> Get Surveyor to automatically increase production</li>
                  <li><strong>Late Game:</strong> Add Mechanic after buying Auto Harvester for full automation</li>
                  <li><strong>Active Management:</strong> Turn off auto-purchasers if you need to save currency for big purchases</li>
                  <li><strong>Per-Vegetable Setup:</strong> Remember to activate auto-purchasers on each new vegetable you unlock</li>
                </ul>
              </div>
            )}

            {selectedInfoCategory === 'canning' && (
              <div>
                <h4 className={styles.sectionTitle}>
                  <img src={ICON_CANNING} alt="Canning" className={styles.sectionIcon} />
                  Canning System
                </h4>
                <p>The Canning System unlocks at 5,000 experience and allows you to process vegetables into preserved recipes for profit and rewards. Canning provides both money and valuable knowledge/experience bonuses.</p>
                
                <h5>🎯 How Canning Works:</h5>
                <ul>
                  <li><strong>Unlock Requirement:</strong> Reach 5,000 experience to access canning</li>
                  <li><strong>Recipe Requirements:</strong> Each recipe needs specific vegetables in specific quantities</li>
                  <li><strong>Processing Time:</strong> Recipes take time to complete (varies by complexity)</li>
                  <li><strong>Multiple Processes:</strong> Run several recipes simultaneously (upgrade to increase slots)</li>
                  <li><strong>Experience Rewards:</strong> Gain both money and canning experience from completed recipes</li>
                  <li><strong>Knowledge Rewards:</strong> Earn knowledge points based on recipe complexity</li>
                </ul>
                
                <h5>📋 Recipe Information:</h5>
                <ul>
                  <li><strong>Small Cards:</strong> Show ingredients, profit, processing time, and reward amounts</li>
                  <li><strong>Knowledge Reward:</strong> 2 knowledge per ingredient (reduced for auto-canning)</li>
                  <li><strong>Canning Experience:</strong> 10 experience per ingredient (reduced for auto-canning)</li>
                  <li><strong>Recipe Details:</strong> Click any recipe for detailed breakdown and ingredient requirements</li>
                  <li><strong>Recipe Filtering:</strong> Filter by availability, complexity, or type</li>
                  <li><strong>Recipe Sorting:</strong> Sort by name, profit, time, or difficulty</li>
                </ul>

                <h5>⚙️ Canning Upgrades:</h5>
                <ul>
                  <li><strong>Quick Hands:</strong> Reduces processing time for faster production</li>
                  <li><strong>Family Recipe:</strong> Increases sale price of canned goods</li>
                  <li><strong>Heirloom Touch:</strong> Unlocks advanced recipes with better rewards</li>
                  <li><strong>Batch Canning:</strong> Allows multiple simultaneous canning processes</li>
                  <li><strong>Canner (Auto-Canning):</strong> Automatically starts recipes every 10 seconds</li>
                </ul>

                <h5>🤖 Auto-Canning System:</h5>
                <ul>
                  <li><strong>How it Works:</strong> Automatically selects and starts recipes every 10 seconds</li>
                  <li><strong>Recipe Selection:</strong> Picks the first available recipe in your selected sort order</li>
                  <li><strong>Ingredient Checking:</strong> Only starts recipes you can actually make</li>
                  <li><strong>Reduced Rewards:</strong> Auto-canning gives 1/10th the knowledge and experience of manual canning</li>
                  <li><strong>Toggle Control:</strong> Can be turned on/off at any time after purchase</li>
                </ul>

                <h4 className={styles.sectionTitle}>
                  <img src={ICON_IDEA} alt="Idea" className={styles.sectionIcon} />
                  Canning Strategy:
                </h4>
                <ul>
                  <li><strong>Start Simple:</strong> Begin with single-ingredient recipes to learn the system</li>
                  <li><strong>Upgrade Progressively:</strong> Buy Quick Hands first, then Family Recipe for better profits</li>
                  <li><strong>Balance Manual vs Auto:</strong> Use manual canning for high-value recipes, auto for idle play</li>
                  <li><strong>Manage Ingredients:</strong> Keep a good stock of common vegetables for consistent canning</li>
                  <li><strong>Sort by Profit:</strong> Default sorting helps maximize income per time invested</li>
                  <li><strong>Batch Processing:</strong> Upgrade simultaneous processes to handle multiple recipes</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoOverlay;


# Farm Idle Game

Grow, upgrade, and master the seasons—build your farming empire one plot at a time!

Farm Idle Game is a relaxing and strategic idle clicker where you plant, harvest, and sell a variety of veggies, unlock powerful upgrades, and weather the changing seasons. Expand your farm, prestige for bigger rewards, and see how far your green thumb can take you!

The game features persistent progress, a prestige system, farm expansion, weather events, comprehensive in-game documentation, and a variety of upgrades to optimize your farm.

## ✨ Latest Updates (v2.0)

### 🎮 Enhanced User Experience
- **📚 Complete In-Game Help System**: New Info overlay with detailed guides covering seasons, upgrades, strategy, and game mechanics
- **⚙️ Organized Settings Panel**: Streamlined interface with dedicated Settings overlay for save management and game actions
- **🔧 Unified Harvest System**: Improved reliability and consistency between manual and auto harvesting
- **💾 Enhanced Save System**: Export saves with timestamps, import validation, and safety confirmations

### 🐛 Critical Bug Fixes
- Fixed experience not being awarded on harvest
- Resolved auto harvester reliability issues
- Improved state management and timing for all harvest operations

## Gameplay Overview

- **Veggie Growth:** All unlocked veggies grow simultaneously, each with a unique growth rate and seasonal bonus. Growth progress is shown with a progress bar, and the number of days required to grow updates dynamically with the season and upgrades.
- **Harvesting:** Click the harvest button to collect grown veggies and add them to your stash. Auto Harvester upgrades can automate this process for each veggie.
- **Selling:** Sell all veggies in your stash for money at any time. Each veggie has a unique sale price, which can be increased with the Better Seeds upgrade.
- **Farm Expansion & Prestige:** As you reach the max number of plots, you can buy a larger farm. This resets upgrades and experience, but increases your max plots and gives a permanent knowledge multiplier bonus based on your farm tier. Money above the farm cost is kept.
- **Plot Limits:** Unlocking new veggies and buying additional plots is limited by your current max plots. Upgrade your farm to expand further.

### Upgrade Details

#### Per-Veggie Upgrades

- **Fertilizer:** Increases growth rate for the selected veggie by +1% per level.
- **Auto Harvester:** Automates harvesting for the selected veggie, collecting crops every 50 seconds if ready.
- **Harvester Speed:** Increases the speed of auto harvesting for the selected veggie.
- **Additional Plot:** Increases the number of veggies harvested per cycle for the selected veggie.
- **Better Seeds (Prestige):** Purchased with knowledge points. Permanently increases the sale price for the selected veggie.
- **Plot Limit:** Additional plots can be purchased for each veggie, up to your current max plots.

#### Global Upgrades

- **Farmer's Almanac:** Increases knowledge gain rate by 10% per purchase.
- **Irrigation:** Negates drought penalties for all veggies during drought weather events. Persists across page refreshes.
- **Greenhouse:** Removes winter growth penalty for all veggies.
- **Heirloom Seeds:** Increases the Better Seeds multiplier for all veggies, making prestige upgrades more effective.
- **Auto Sell:** Automatically sells all harvested veggies every 7 days.
- **Merchant:** Buys all veggies every 7 days, providing a periodic income boost.

Environmental upgrades and weather effects (Rain, Drought, Storm, Heatwave, Snow) interact with these global upgrades to further influence growth rates and harvest efficiency.

- **Unlock System:** Gain experience by harvesting to unlock new veggies in a set order. Experience and knowledge are displayed rounded to two decimal places.
- **Seasons & Weather:** Seasons change automatically, affecting growth rates. Random weather events (Rain, Drought, Storm, Heatwave, Snow) can boost or penalize growth. Irrigation negates drought penalties, and a Greenhouse negates winter and snow penalties.
- **Prestige System:** Earn knowledge points for every veggie harvested (manual or auto) during the year. Manual harvesting grants 1.0 knowledge while auto harvesting grants 0.5 knowledge, rewarding active play. Spend points on permanent upgrades like Better Seeds. Farm tier increases your knowledge multiplier bonus.
- **Persistent Save:** Game progress is automatically saved and loaded using localStorage. Export/import functionality allows backup and sharing saves. Refreshing the page will not reset your progress. Farm tier, max plots, and irrigation status are all saved.
- **Modern UI:** Clean, responsive interface with comprehensive help system, organized settings panel, and clear feedback. Purchasable upgrades are highlighted for convenience.

## Features

### 🌱 Core Gameplay
- Grow a variety of veggies with different growth rates and seasonal bonuses
- Unlock new veggies by gaining experience through harvesting
- Differentiated knowledge rewards: Manual harvesting (1.0x) vs Auto harvesting (0.5x)
- Unified harvest system ensuring consistent behavior across all harvesting methods

### 🔧 Upgrade Systems
- **Per-Veggie Upgrades**: Fertilizer, Auto Harvester, Harvester Speed, and Additional Plot upgrades
- **Global Upgrades**: Farmer's Almanac, Irrigation, Greenhouse, Heirloom Seeds, Auto Sell, Merchant
- **Prestige/Knowledge System**: Earn and spend knowledge points on permanent upgrades

### 🌦️ Environmental Systems
- Dynamic seasonal effects with specific veggie bonuses
- Random weather events affecting growth rates
- Environmental protection upgrades (Irrigation for drought, Greenhouse for winter)

### 💾 Save & Settings Management
- **Persistent Progress**: Automatic localStorage saving with full game state preservation
- **Export/Import**: Timestamped save exports with import validation
- **Settings Panel**: Organized interface for save management and game actions
- **Safety Features**: Confirmation dialogs for destructive actions

### 📚 Player Experience
- **Complete In-Game Documentation**: Comprehensive help system with strategic guides
- **Four Help Categories**: Seasons & Weather, Farm & Experience, Veggie Upgrades, Farm Upgrades
- **Beginner-Friendly**: Detailed explanations of complex mechanics and optimal strategies
- **Modern UI**: Clean, responsive interface with intuitive navigation

### 🏆 Progression Systems
- Farm expansion and prestige mechanic with permanent bonuses
- Experience-based unlocking system with plot limitations
- Merchant and auto sell upgrades for passive income generation

## Roadmap

- Add an Archie bonus.
  - The Archie bonus is triggered by clicking an icon that very infrequently pops up at a randomized intervals.
  - It gives a major growth and speed bonuses while also auto harvesting all unlocked veggies for a short time after.
- Reset the upgrades section per new farm purchase, but base price on max number of plots.
- Add Farm manager who can auto purchase Fertilizer and Better Seeds as an upgrade.
- Add Mechanic who can auto purchase auto harvesters and harvest speed upgrades.
- Add a display of the stash on the left side of the screen that keeps track of individual veggie amounts.
- Add Canning skill which unlocks a new progress bar.
  - Canning will take one veggie from the stash and turn it into a canned version which sells for 2x amount.
- Add a Canning speed upgrade to make canning faster.
- Add a spring "Farmer's market" event where all items sell for 3x their normal price.
- Add a weather and event log to the game so it can be tracked.

## Getting Started

1. **Install dependencies**: `npm install`
2. **Start the development server**: `npm run dev`
3. **Build for production**: `npm run build`

### 🎮 New Player Guide

1. **Start Simple**: Begin with Radish and focus on Fertilizer upgrades for faster growth
2. **Use the Help System**: Click the "Info" button for comprehensive guides on all game mechanics
3. **Manual vs Auto**: Manual harvesting gives double knowledge - balance active play with idle progression
4. **Weather Awareness**: Check the weather icon and plan around seasonal bonuses for your vegetables
5. **Save Management**: Use the Settings panel to export saves regularly as backups

### 🔧 For Developers

- **React + TypeScript**: Modern React with full TypeScript support
- **Vite Build System**: Fast development and optimized production builds
- **State Management**: Centralized game state with localStorage persistence
- **Component Architecture**: Modular overlay system for easy feature expansion

## 📋 Recent Changes (v2.0)

See `RELEASE_NOTES_v2.0.md` for detailed changelog including:
- Unified harvest system improvements
- Complete in-game help documentation
- Enhanced UI/UX with Settings overlay
- Critical bug fixes for experience gain and auto harvesting
- Improved save/load functionality

---

Enjoy building your farming empire! 🚜🌾

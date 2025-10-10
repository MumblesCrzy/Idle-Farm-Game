
# Farm Idle Game

Grow, upgrade, and master the seasons—build your farming empire one plot at a time!

Farm Idle Game is a relaxing and strategic idle clicker where you plant, harvest, and sell a variety of veggies, unlock powerful upgrades, and weather the changing seasons. Expand your farm, prestige for bigger rewards, and see how far your green thumb can take you!

The game features persistent progress, a prestige system, farm expansion, weather events, comprehensive in-game documentation, advanced automation systems, and a variety of upgrades to optimize your farm.

## ✨ Latest Updates (v1.3) - NEW!
### 🤖 Advanced Automation System
- **🛡️ Auto-Purchasers**: Four intelligent automation systems that purchase upgrades automatically every 7 days
  - **Assistant**: Auto-purchases Fertilizer upgrades using money
  - **Cultivator**: Auto-purchases Better Seeds upgrades using knowledge  
  - **Surveyor**: Auto-purchases Additional Plot upgrades using money (respects plot limits)
  - **Mechanic**: Auto-purchases Harvester Speed upgrades using money
- **⚡ Smart Management**: Auto-purchasers automatically turn off when they can't make purchases (e.g., Surveyor at max plots)
- **📊 Progress Tracking**: Unified 7-day progress bar shows time until next auto-purchase cycle
- **🎛️ Individual Control**: Each auto-purchaser can be toggled on/off independently
- **💡 Dynamic Pricing**: Heirloom Seeds cost now updates immediately when unlocking new vegetables

### 🎮 Enhanced User Experience  
- **📚 Expanded Help System**: New comprehensive "Auto-Purchasers" section in Info display
- **🎨 Visual Feedback**: Color-coded button states show auto-purchaser status at a glance
  - Gray: Not purchased, can't afford
  - Yellow glow: Not purchased, affordable
  - Green: Purchased and active
  - Red: Purchased but inactive

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
- **Greenhouse:** Removes winter growth penalty for all veggies. Cost scales with farm size ($1,000 + 100 Knowledge per plot).
- **Heirloom Seeds:** Increases the Better Seeds multiplier for all veggies, making prestige upgrades more effective. Cost scales with highest unlocked veggie.
- **Auto Sell:** Automatically sells all harvested veggies every 7 days.
- **Merchant:** Buys all veggies every 7 days, providing a periodic income boost.

#### Auto-Purchaser System (NEW!)

- **Assistant:** Automatically purchases Fertilizer upgrades using money every 7 days
- **Cultivator:** Automatically purchases Better Seeds upgrades using knowledge every 7 days  
- **Surveyor:** Automatically purchases Additional Plot upgrades using money every 7 days (respects plot limits)
- **Mechanic:** Automatically purchases Harvester Speed upgrades using money every 7 days
- **Smart Management:** Auto-purchasers turn off when they can't make purchases and prevent manual activation at limits
- **Unified Progress:** All auto-purchasers share a single 7-day timer with visual progress bar

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
- **Balanced Rewards**: Manual harvesting gives full experience and knowledge; auto-harvest gives 50% experience and 50% knowledge
- Unified harvest system ensuring consistent behavior across all harvesting methods
- **Archie Bonus**: Rare clickable character appears randomly for bonus money rewards with streak multipliers

### 🔧 Upgrade Systems
- **Per-Veggie Upgrades**: Fertilizer, Auto Harvester, Harvester Speed, and Additional Plot upgrades
- **Auto-Purchase System**: Four intelligent automation systems (Assistant, Cultivator, Surveyor, Mechanic)
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
- **Smart Warnings**: Plot limit alerts and tooltips prevent common player mistakes
- **Modern UI**: Clean, responsive interface with intuitive navigation and helpful feedback

### 🏆 Progression Systems
- Farm expansion and prestige mechanic with permanent bonuses
- Experience-based unlocking system with plot limitations
- Merchant and auto sell upgrades for passive income generation

## Roadmap

### 🎯 Next Priority Features
- **Farm Manager Upgrade**: Auto-purchase Fertilizer and Better Seeds based on available resources
- **Mechanic Upgrade**: Auto-purchase Auto Harvesters and Harvester Speed upgrades
- **Enhanced Stash Display**: Visual inventory showing individual veggie amounts on the left side
- **Weather & Event Log**: Track historical weather patterns and special events

### 🔮 Future Features
- **Bees**: This will be a per veggie upgrade to increase yield without having to buy additional plots.
- **Canning System**: New skill tree to process vegetables into canned goods (2x sale price)
  - Canning progress bar and speed upgrades
- **Seasonal Events**: Spring Farmer's Market with 3x sale prices
- **Advanced Automation**: More sophisticated auto-management systems
- **Achievement System**: Unlock rewards for hitting milestones and completing challenges

## Getting Started

1. **Install dependencies**: `npm install`
2. **Start the development server**: `npm run dev`
3. **Build for production**: `npm run build`

### 🎮 New Player Guide

1. **Start Simple**: Begin with Radish and focus on Fertilizer upgrades for faster growth
2. **Use the Help System**: Click the "Info" button for comprehensive guides on all game mechanics
3. **Manual vs Auto**: Manual harvesting gives full experience/knowledge; auto gives 50% - balance active play with idle progression
4. **Plot Management**: Watch plot warnings! Don't fill all plots with additional plots or you can't unlock new vegetables
5. **Weather Awareness**: Check the weather icon and plan around seasonal bonuses for your vegetables
6. **Upgrade Timing**: Major upgrades like Greenhouse scale with your farm size - plan purchases carefully
7. **Archie Hunting**: Keep an eye out for the rare Archie character - clicking gives bonus money!
8. **Tooltips**: Hover over buttons and UI elements for detailed information about mechanics and formulas
9. **Save Management**: Use the Settings panel to export saves regularly as backups

### 🔧 For Developers

- **React + TypeScript**: Modern React with full TypeScript support
- **Vite Build System**: Fast development and optimized production builds
- **State Management**: Centralized game state with localStorage persistence
- **Component Architecture**: Modular overlay system for easy feature expansion

## 📋 Recent Changes (v1.3)

### Major Features Added
- **Complete Automation**: Four intelligent Auto-Purchaser systems handle all upgrade types
- **Visual Excellence**: 4-state color system provides instant status feedback  
- **Code Quality**: Massive architecture improvement with reusable components
- **Continuted Documentation**: Comprehensive in-game guides for all automation features

---

Enjoy building your farming empire! 🚜🌾

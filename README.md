
# Farm Idle Game

Grow, upgrade, and master the seasons—build your farming empire one plot at a time!

Farm Idle Game is a relaxing and strategic idle clicker where you plant, harvest, and sell a variety of veggies, unlock powerful upgrades, and weather the changing seasons. Expand your farm, prestige for bigger rewards, and see how far your green thumb can take you!

The game features persistent progress, a prestige system, farm expansion, weather events, and a variety of upgrades to optimize your farm.

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
- **Prestige System:** Earn knowledge points for every veggie harvested (manual or auto) during the year. Spend points on permanent upgrades like Better Seeds. Farm tier increases your knowledge multiplier bonus.
- **Persistent Save:** Game progress is automatically saved and loaded using localStorage. Refreshing the page will not reset your progress. Farm tier, max plots, and irrigation status are all saved.
- **Modern UI:** Clean, responsive interface with clear feedback and upgrade icons. Purchasable upgrades are highlighted for convenience.

## Features

- Grow a variety of veggies with different growth rates and seasonal bonuses
- Unlock new veggies by gaining experience
- Fertilizer, Auto Harvester, Harvester Speed, and Additional Plot upgrades for each veggie
- Prestige/Knowledge system: earn and spend knowledge points on permanent upgrades
- Global upgrades: Farmer's Almanac, Irrigation, Greenhouse, Heirloom Seeds, Auto Sell, Merchant
- Seasonal effects and random weather events
- Persistent save/load (localStorage)
- Modern, concise UI with progress bars and upgrade icons
- Farm expansion and prestige mechanic with permanent bonuses
- Merchant and auto sell upgrades for passive income

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

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`

Enjoy building your farming empire!

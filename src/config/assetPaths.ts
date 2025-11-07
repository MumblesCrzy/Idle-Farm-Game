/**
 * Centralized asset paths for all images used in the application
 * This makes it easier to update image locations and ensures consistency
 */

// UI and Tab Icons
export const ICON_GROWING = './Growing.png';
export const ICON_CANNING = './Canning.png';
export const ICON_PLOTS = './Plots.png';
export const ICON_MONEY = './Money.png';
export const ICON_KNOWLEDGE = './Knowledge.png';
export const ICON_EXPERIENCE = './Experience.png';
export const ICON_IDEA = './Idea.png';
export const ICON_LEARNING = './Learning.png';
export const ICON_AUTOMATION = './Automation.png';
export const ICON_HARVEST = './Harvest.png';
export const ICON_UPGRADE = './Upgrade.png';
export const ICON_MILESTONE = './Milestone.png';
export const ICON_RECIPE = './Recipe.png';
export const ICON_TROPHY = './Trophy.png';
export const ICON_MERCHANT = './Merchant.png';
export const ICON_SCROLL = './Scroll.png';
export const ICON_DETAIL = './Detail.png';

// Season Images
export const SEASON_SPRING = './Spring.png';
export const SEASON_SUMMER = './Summer.png';
export const SEASON_FALL = './Fall.png';
export const SEASON_WINTER = './Winter.png';

// Weather Images
export const WEATHER_CLEAR = './Clear.png';
export const WEATHER_RAIN = './Rain.png';
export const WEATHER_DROUGHT = './Drought.png';
export const WEATHER_STORM = './Storm.png';
export const WEATHER_HEATWAVE = './Heatwave.png';
export const WEATHER_SNOW = './Snow.png';

// Vegetable Images
export const VEGGIE_RADISH = './Radish.png';
export const VEGGIE_CARROTS = './Carrots.png';
export const VEGGIE_CARROT = './Carrots.png'; // Alias for achievements using singular
export const VEGGIE_BROCCOLI = './Broccoli.png';
export const VEGGIE_LETTUCE = './Lettuce.png';
export const VEGGIE_ONIONS = './Onions.png';
export const VEGGIE_TOMATOES = './Tomatoes.png';
export const VEGGIE_PEPPERS = './Peppers.png';
export const VEGGIE_CUCUMBERS = './Cucumbers.png';
export const VEGGIE_GREEN_BEANS = './Green Beans.png';
export const VEGGIE_ZUCCHINI = './Zucchini.png';
export const VEGGIE_EGGPLANT = './Eggplant.png';

// Growing Tab Upgrade Images
export const UPGRADE_FERTILIZER = './Fertilizer.png';
export const UPGRADE_BETTER_SEEDS = './Better Seeds.png';
export const UPGRADE_ADDITIONAL_PLOT = './Additional Plot.png';
export const UPGRADE_AUTO_HARVESTER = './Auto Harvester.png';
export const UPGRADE_HARVESTER_SPEED = './Harvester Speed.png';

// Global Upgrade Images
export const UPGRADE_FARMERS_ALMANAC = "./Farmer's Almanac.png";
export const UPGRADE_IRRIGATION = './Irrigation.png';
export const UPGRADE_MERCHANT = './Merchant.png';
export const UPGRADE_GREENHOUSE = './Greenhouse.png';
export const UPGRADE_HEIRLOOM_SEEDS = './Heirloom Seeds.png';

// Auto-Purchaser Images
export const AUTO_ASSISTANT = './Assistant.png';
export const AUTO_CULTIVATOR = './Cultivator.png';
export const AUTO_SURVEYOR = './Surveyor.png';
export const AUTO_MECHANIC = './Mechanic.png';

// Canning Upgrade Images
export const CANNING_QUICK_HANDS = './Quick Hands.png';
export const CANNING_FAMILY_RECIPE = './Family Recipe.png';
export const CANNING_HEIRLOOM_TOUCH = './Heirloom Touch.png';
export const CANNING_BATCH_CANNING = './Batch Canning.png';
export const CANNING_CANNER = './Canner.png';

// Special Images
export const SPECIAL_ARCHIE = './Archie.png';
export const SPECIAL_BACKGROUND_SPRING = './Background_spring.png';
export const SPECIAL_COVER_IMAGE = './Cover Image.png';

// Helper function to get vegetable image by name
export function getVeggieImage(veggieName: string): string {
  return `./${veggieName}.png`;
}

// Helper function to get season image by name
export function getSeasonImage(seasonName: string): string {
  return `./${seasonName}.png`;
}

// Helper function to get weather image by name
export function getWeatherImage(weatherName: string): string {
  return `./${weatherName}.png`;
}

// Helper function to get auto-purchaser image by name
export function getAutoPurchaserImage(name: string): string {
  return `./${name}.png`;
}

// Array of all images for preloading
export const ALL_IMAGES = [
  // Tab and UI icons
  ICON_GROWING,
  ICON_CANNING,
  ICON_PLOTS,
  ICON_MONEY,
  ICON_KNOWLEDGE,
  ICON_EXPERIENCE,
  
  // Season images
  SEASON_SPRING,
  SEASON_SUMMER,
  SEASON_FALL,
  SEASON_WINTER,
  
  // Weather images
  WEATHER_CLEAR,
  WEATHER_RAIN,
  WEATHER_DROUGHT,
  WEATHER_STORM,
  WEATHER_HEATWAVE,
  WEATHER_SNOW,
  
  // All vegetable images
  VEGGIE_RADISH,
  VEGGIE_CARROTS,
  VEGGIE_BROCCOLI,
  VEGGIE_LETTUCE,
  VEGGIE_ONIONS,
  VEGGIE_TOMATOES,
  VEGGIE_PEPPERS,
  VEGGIE_CUCUMBERS,
  VEGGIE_GREEN_BEANS,
  VEGGIE_ZUCCHINI,
  
  // Growing tab upgrade images
  UPGRADE_FERTILIZER,
  UPGRADE_BETTER_SEEDS,
  UPGRADE_ADDITIONAL_PLOT,
  UPGRADE_AUTO_HARVESTER,
  UPGRADE_HARVESTER_SPEED,
  UPGRADE_FARMERS_ALMANAC,
  UPGRADE_IRRIGATION,
  UPGRADE_MERCHANT,
  UPGRADE_GREENHOUSE,
  UPGRADE_HEIRLOOM_SEEDS,
  
  // Auto-purchaser images
  AUTO_ASSISTANT,
  AUTO_CULTIVATOR,
  AUTO_SURVEYOR,
  AUTO_MECHANIC,
  
  // Canning upgrade images
  CANNING_QUICK_HANDS,
  CANNING_FAMILY_RECIPE,
  CANNING_HEIRLOOM_TOUCH,
  CANNING_BATCH_CANNING,
  CANNING_CANNER,
  
  // Special images
  SPECIAL_ARCHIE,
];

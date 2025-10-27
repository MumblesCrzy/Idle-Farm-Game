import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadGameStateWithCanning,
  saveGameStateWithCanning,
  migrateVeggieDataWithCanning,
  validateCanningImport,
  isLeanVeggieData,
  reconstructVeggieData,
  type ExtendedGameState
} from '../utils/saveSystem'

// Mock the dependencies
vi.mock('../data/recipes', () => ({
  INITIAL_RECIPES: [
    {
      id: 'canned_tomatoes',
      name: 'Canned Tomatoes',
      description: 'Simple canned tomatoes',
      ingredients: [{ veggieName: 'Tomatoes', quantity: 3 }],
      baseProcessingTime: 60,
      baseSalePrice: 50,
      experienceRequired: 0
    }
  ]
}))

vi.mock('../utils/canningAutoPurchase', () => ({
  CANNING_AUTO_PURCHASERS: [
    {
      id: 'basic_canner',
      name: 'Basic Canner',
      upgradeId: 'canner',
      cycleDays: 7,
      owned: false,
      active: false,
      cost: 1000,
      timer: 0,
      costCurrency: 'knowledge' as const
    }
  ],
  DEFAULT_AUTO_CANNING_CONFIG: {
    enabled: false,
    selectedRecipeId: '',
    priority: 'profit' as const
  }
}))

describe('saveSystem', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('loadGameStateWithCanning', () => {
    it('should return null when no save data exists', () => {
      expect(loadGameStateWithCanning()).toBeNull()
    })

    it('should return null when localStorage contains invalid JSON', () => {
      localStorage.setItem('farmIdleGameState', 'invalid json')
      expect(loadGameStateWithCanning()).toBeNull()
    })

    it('should load and migrate basic game state', () => {
      const basicState = {
        veggies: [],
        money: 100,
        experience: 50,
        knowledge: 25,
        activeVeggie: 0,
        day: 1,
        greenhouseOwned: false,
        heirloomOwned: false,
        autoSellOwned: false,
        almanacLevel: 1,
        almanacCost: 100,
        maxPlots: 4,
        farmTier: 1,
        farmCost: 500,
        irrigationOwned: false,
        currentWeather: 'sunny',
        highestUnlockedVeggie: 0
      }

      localStorage.setItem('farmIdleGameState', JSON.stringify(basicState))
      const loaded = loadGameStateWithCanning()

      expect(loaded).toBeTruthy()
      expect(loaded!.money).toBe(100)
      expect(loaded!.canningState).toBeTruthy()
      expect(loaded!.canningState!.recipes).toHaveLength(1)
      expect(loaded!.canningVersion).toBe(3)
    })

    it('should preserve existing canning progress during migration', () => {
      const stateWithCanning = {
        veggies: [],
        money: 100,
        experience: 50,
        knowledge: 25,
        activeVeggie: 0,
        day: 1,
        greenhouseOwned: false,
        heirloomOwned: false,
        autoSellOwned: false,
        almanacLevel: 1,
        almanacCost: 100,
        maxPlots: 4,
        farmTier: 1,
        farmCost: 500,
        irrigationOwned: false,
        currentWeather: 'sunny',
        highestUnlockedVeggie: 0,
        canningState: {
          totalItemsCanned: 50,
          canningExperience: 100,
          unlockedRecipes: ['canned_tomatoes'],
          upgrades: [
            {
              id: 'canning_speed',
              level: 3,
              cost: 200,
              effect: 1.15
            }
          ]
        },
        canningVersion: 1
      }

      localStorage.setItem('farmIdleGameState', JSON.stringify(stateWithCanning))
      const loaded = loadGameStateWithCanning()

      expect(loaded!.canningState!.totalItemsCanned).toBe(50)
      expect(loaded!.canningState!.canningExperience).toBe(100)
      expect(loaded!.canningState!.unlockedRecipes).toContain('canned_tomatoes')
      expect(loaded!.canningVersion).toBe(3)
    })
  })

  describe('saveGameStateWithCanning', () => {
    it('should save game state to localStorage', () => {
      const gameState: ExtendedGameState = {
        veggies: [],
        money: 200,
        experience: 100,
        knowledge: 50,
        activeVeggie: 1,
        day: 5,
        greenhouseOwned: true,
        heirloomOwned: false,
        autoSellOwned: true,
        almanacLevel: 2,
        almanacCost: 200,
        maxPlots: 6,
        farmTier: 2,
        farmCost: 1000,
        irrigationOwned: true,
        currentWeather: 'rain',
        highestUnlockedVeggie: 2
      }

      saveGameStateWithCanning(gameState)

      const saved = localStorage.getItem('farmIdleGameState')
      expect(saved).toBeTruthy()
      
      const parsed = JSON.parse(saved!)
      expect(parsed.money).toBe(200)
      expect(parsed.canningVersion).toBe(3)
    })

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw an error
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const gameState: ExtendedGameState = {
        veggies: [],
        money: 100,
        experience: 50,
        knowledge: 25,
        activeVeggie: 0,
        day: 1,
        greenhouseOwned: false,
        heirloomOwned: false,
        autoSellOwned: false,
        almanacLevel: 1,
        almanacCost: 100,
        maxPlots: 4,
        farmTier: 1,
        farmCost: 500,
        irrigationOwned: false,
        currentWeather: 'sunny',
        highestUnlockedVeggie: 0
      }

      // Should not throw an error
      expect(() => saveGameStateWithCanning(gameState)).not.toThrow()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'saveGameStateWithCanning: Error saving to localStorage:',
        expect.any(Error)
      )

      setItemSpy.mockRestore()
      consoleSpy.mockRestore()
    })
  })

  describe('migrateVeggieDataWithCanning', () => {
    it('should add canning properties to veggies without them', () => {
      const veggies = [
        { name: 'Tomatoes', price: 10 },
        { name: 'Carrots', price: 8 }
      ]

      const migrated = migrateVeggieDataWithCanning(veggies)

      expect(migrated[0].canningYieldLevel).toBe(0)
      expect(migrated[0].canningYieldCost).toBe(200)
      expect(migrated[0].canningQualityLevel).toBe(0)
      expect(migrated[0].canningQualityCost).toBe(150)

      // Second veggie should have higher costs
      expect(migrated[1].canningYieldCost).toBe(300) // 200 * 1.5
      expect(migrated[1].canningQualityCost).toBe(225) // 150 * 1.5
    })

    it('should preserve existing canning properties', () => {
      const veggies = [
        {
          name: 'Tomatoes',
          price: 10,
          canningYieldLevel: 5,
          canningYieldCost: 1000,
          canningQualityLevel: 3,
          canningQualityCost: 800
        }
      ]

      const migrated = migrateVeggieDataWithCanning(veggies)

      expect(migrated[0].canningYieldLevel).toBe(5)
      expect(migrated[0].canningYieldCost).toBe(1000)
      expect(migrated[0].canningQualityLevel).toBe(3)
      expect(migrated[0].canningQualityCost).toBe(800)
    })
  })

  describe('validateCanningImport', () => {
    it('should validate correct game state', () => {
      const validState: ExtendedGameState = {
        veggies: [],
        money: 100,
        experience: 50,
        knowledge: 25,
        activeVeggie: 0,
        day: 1,
        maxPlots: 4,
        farmTier: 1,
        greenhouseOwned: false,
        heirloomOwned: false,
        autoSellOwned: false,
        almanacLevel: 1,
        almanacCost: 100,
        farmCost: 500,
        irrigationOwned: false,
        currentWeather: 'sunny',
        highestUnlockedVeggie: 0
      }

      expect(validateCanningImport(validState)).toBe(true)
    })

    it('should reject invalid data types', () => {
      expect(validateCanningImport(null)).toBe(false)
      expect(validateCanningImport(undefined)).toBe(false)
      expect(validateCanningImport('string')).toBe(false)
      expect(validateCanningImport(123)).toBe(false)
      expect(validateCanningImport([])).toBe(false)
    })

    it('should reject objects missing required fields', () => {
      const incompleteState = {
        money: 100,
        experience: 50
        // Missing other required fields
      }

      expect(validateCanningImport(incompleteState)).toBe(false)
    })

    it('should reject objects with invalid array fields', () => {
      const invalidState = {
        veggies: 'not an array',
        money: 100,
        experience: 50,
        knowledge: 25,
        activeVeggie: 0,
        day: 1,
        maxPlots: 4,
        farmTier: 1
      }

      expect(validateCanningImport(invalidState)).toBe(false)
    })

    it('should validate objects with valid canning state', () => {
      const stateWithCanning = {
        veggies: [],
        money: 100,
        experience: 50,
        knowledge: 25,
        activeVeggie: 0,
        day: 1,
        maxPlots: 4,
        farmTier: 1,
        canningState: {
          recipes: [],
          upgrades: [],
          activeProcesses: []
        }
      }

      expect(validateCanningImport(stateWithCanning)).toBe(true)
    })

    it('should reject objects with invalid canning state arrays', () => {
      const stateWithBadCanning = {
        veggies: [],
        money: 100,
        experience: 50,
        knowledge: 25,
        activeVeggie: 0,
        day: 1,
        maxPlots: 4,
        farmTier: 1,
        canningState: {
          recipes: 'not an array',
          upgrades: [],
          activeProcesses: []
        }
      }

      expect(validateCanningImport(stateWithBadCanning)).toBe(false)
    })
  })

  describe('lean veggie export', () => {
    it('should create lean veggie data when saving', () => {
      const fullVeggie = {
        name: 'Tomatoes',
        growth: 50,
        growthRate: 1.5,
        stash: 10,
        unlocked: true,
        experience: 100,
        experienceToUnlock: 0,
        fertilizerLevel: 3,
        fertilizerCost: 80,
        harvesterOwned: true,
        harvesterCost: 100,
        harvesterTimer: 25,
        salePrice: 6,
        betterSeedsLevel: 2,
        betterSeedsCost: 50,
        additionalPlotLevel: 1,
        additionalPlotCost: 200,
        autoPurchasers: [
          { id: 'test1', owned: true, active: false, other: 'data' },
          { id: 'test2', owned: false, active: true, other: 'data' }
        ],
        sellEnabled: true,
        fertilizerMaxLevel: 99
      }

      const gameState: ExtendedGameState = {
        veggies: [fullVeggie],
        money: 100,
        experience: 50,
        knowledge: 25,
        activeVeggie: 0,
        day: 1,
        greenhouseOwned: false,
        heirloomOwned: false,
        autoSellOwned: false,
        almanacLevel: 1,
        almanacCost: 100,
        maxPlots: 4,
        farmTier: 1,
        farmCost: 500,
        irrigationOwned: false,
        currentWeather: 'sunny',
        highestUnlockedVeggie: 0
      }

      saveGameStateWithCanning(gameState)

      const saved = localStorage.getItem('farmIdleGameState')
      const parsed = JSON.parse(saved!)
      const savedVeggie = parsed.veggies[0]

      // Check that only the specified properties are saved
      expect(savedVeggie.id).toBe('Tomatoes')
      expect(savedVeggie.growth).toBe(50)
      expect(savedVeggie.stash).toBe(10)
      expect(savedVeggie.unlocked).toBe(true)
      expect(savedVeggie.fertilizerLevel).toBe(3)
      expect(savedVeggie.harvesterOwned).toBe(true)
      expect(savedVeggie.harvesterTimer).toBe(25)
      expect(savedVeggie.betterSeedsLevel).toBe(2)
      expect(savedVeggie.additionalPlotLevel).toBe(1)
      
      // Check autoPurchasers are trimmed
      expect(savedVeggie.autoPurchasers).toHaveLength(2)
      expect(savedVeggie.autoPurchasers[0]).toEqual({ owned: true, active: false })
      expect(savedVeggie.autoPurchasers[1]).toEqual({ owned: false, active: true })

      // Check that extra properties are NOT saved
      expect(savedVeggie.name).toBeUndefined()
      expect(savedVeggie.growthRate).toBeUndefined()
      expect(savedVeggie.salePrice).toBeUndefined()
      expect(savedVeggie.fertilizerCost).toBeUndefined()
      expect(savedVeggie.sellEnabled).toBeUndefined()
    })

    it('should detect lean veggie data correctly', () => {
      const leanVeggie = {
        id: 'Tomatoes',
        growth: 50,
        stash: 10,
        unlocked: true,
        fertilizerLevel: 3,
        harvesterOwned: true,
        harvesterTimer: 25,
        betterSeedsLevel: 2,
        additionalPlotLevel: 1,
        autoPurchasers: [{ owned: true, active: false }]
      }

      const fullVeggie = {
        name: 'Tomatoes',
        growth: 50,
        growthRate: 1.5,
        stash: 10,
        unlocked: true,
        salePrice: 6,
        fertilizerLevel: 3
      }

      expect(isLeanVeggieData(leanVeggie)).toBe(true)
      expect(isLeanVeggieData(fullVeggie)).toBe(false)
    })

    it('should reconstruct full veggie data from lean data', () => {
      const leanVeggie = {
        id: 'Tomatoes',
        growth: 50,
        stash: 10,
        unlocked: true,
        fertilizerLevel: 3,
        harvesterOwned: true,
        harvesterTimer: 25,
        betterSeedsLevel: 2,
        additionalPlotLevel: 1,
        autoPurchasers: [
          { owned: true, active: false },
          { owned: false, active: true }
        ]
      }

      const initialTemplate = {
        name: 'Tomatoes',
        growth: 0,
        growthRate: 1.0526,
        stash: 0,
        unlocked: false,
        experience: 0,
        experienceToUnlock: 50,
        fertilizerLevel: 0,
        fertilizerCost: 60,
        harvesterOwned: false,
        harvesterCost: 480,
        harvesterTimer: 0,
        salePrice: 6,
        betterSeedsLevel: 0,
        betterSeedsCost: 60,
        additionalPlotLevel: 0,
        additionalPlotCost: 480,
        autoPurchasers: [
          { id: 'test1', owned: false, active: false, cost: 100 },
          { id: 'test2', owned: false, active: false, cost: 200 }
        ],
        sellEnabled: true,
        fertilizerMaxLevel: 99
      }

      const reconstructed = reconstructVeggieData(leanVeggie, initialTemplate)

      // Should have lean data values
      expect(reconstructed.growth).toBe(50)
      expect(reconstructed.stash).toBe(10)
      expect(reconstructed.unlocked).toBe(true)
      expect(reconstructed.fertilizerLevel).toBe(3)
      expect(reconstructed.harvesterOwned).toBe(true)
      expect(reconstructed.harvesterTimer).toBe(25)
      expect(reconstructed.betterSeedsLevel).toBe(2)
      expect(reconstructed.additionalPlotLevel).toBe(1)

      // Should have template values for missing properties
      expect(reconstructed.name).toBe('Tomatoes')
      expect(reconstructed.growthRate).toBe(1.0526)
      expect(reconstructed.salePrice).toBe(6)
      expect(reconstructed.fertilizerCost).toBe(60)
      expect(reconstructed.sellEnabled).toBe(true)

      // Should merge autoPurchaser data correctly
      expect(reconstructed.autoPurchasers[0].id).toBe('test1')
      expect(reconstructed.autoPurchasers[0].owned).toBe(true)
      expect(reconstructed.autoPurchasers[0].active).toBe(false)
      expect(reconstructed.autoPurchasers[0].cost).toBe(100)

      expect(reconstructed.autoPurchasers[1].id).toBe('test2')
      expect(reconstructed.autoPurchasers[1].owned).toBe(false)
      expect(reconstructed.autoPurchasers[1].active).toBe(true)
      expect(reconstructed.autoPurchasers[1].cost).toBe(200)
    })
  })
})
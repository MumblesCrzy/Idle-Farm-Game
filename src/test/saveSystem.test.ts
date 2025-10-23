import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadGameStateWithCanning,
  saveGameStateWithCanning,
  migrateVeggieDataWithCanning,
  validateCanningImport,
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
      expect(loaded!.canningVersion).toBe(2)
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
      expect(loaded!.canningVersion).toBe(2)
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
      expect(parsed.canningVersion).toBe(2)
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
})
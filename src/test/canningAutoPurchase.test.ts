import { describe, it, expect } from 'vitest'
import {
  CANNING_AUTO_PURCHASERS,
  DEFAULT_AUTO_CANNING_CONFIG,
  canAffordAutoPurchaser,
  shouldPurchaseUpgrade,
  selectBestRecipe,
  updateAutoPurchaserTimers,
  processAutoPurchases
} from '../utils/canningAutoPurchase'

describe('canningAutoPurchase', () => {
  describe('CANNING_AUTO_PURCHASERS', () => {
    it('should have correct initial configuration', () => {
      expect(CANNING_AUTO_PURCHASERS).toHaveLength(4)
      
      const engineerPurchaser = CANNING_AUTO_PURCHASERS.find(ap => ap.id === 'canning_engineer')
      expect(engineerPurchaser).toBeDefined()
      expect(engineerPurchaser?.upgradeId).toBe('canning_speed')
      expect(engineerPurchaser?.cost).toBe(2500)
      expect(engineerPurchaser?.costCurrency).toBe('money')
    })

    it('should have all required properties for each auto-purchaser', () => {
      CANNING_AUTO_PURCHASERS.forEach(ap => {
        expect(ap).toHaveProperty('id')
        expect(ap).toHaveProperty('name')
        expect(ap).toHaveProperty('upgradeId')
        expect(ap).toHaveProperty('cycleDays')
        expect(ap).toHaveProperty('owned')
        expect(ap).toHaveProperty('active')
        expect(ap).toHaveProperty('cost')
        expect(ap).toHaveProperty('timer')
        expect(ap).toHaveProperty('costCurrency')
        
        expect(typeof ap.cycleDays).toBe('number')
        expect(ap.cycleDays).toBeGreaterThan(0)
      })
    })
  })

  describe('DEFAULT_AUTO_CANNING_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_AUTO_CANNING_CONFIG).toEqual({
        enabled: false,
        selectedRecipes: [],
        priorityOrder: [],
        onlyUseExcess: true,
        excessThreshold: 10,
        pauseWhenFull: true
      })
    })
  })

  describe('canAffordAutoPurchaser', () => {
    const mockAutoPurchaser = {
      id: 'test',
      name: 'Test',
      upgradeId: 'test_upgrade',
      cycleDays: 10,
      owned: false,
      active: false,
      cost: 1000,
      timer: 0,
      costCurrency: 'money' as const
    }

    it('should return true when player has enough money', () => {
      expect(canAffordAutoPurchaser(mockAutoPurchaser, 1500, 500)).toBe(true)
    })

    it('should return false when player does not have enough money', () => {
      expect(canAffordAutoPurchaser(mockAutoPurchaser, 500, 500)).toBe(false)
    })

    it('should check knowledge currency correctly', () => {
      const knowledgeAutoPurchaser = { ...mockAutoPurchaser, costCurrency: 'knowledge' as const }
      
      expect(canAffordAutoPurchaser(knowledgeAutoPurchaser, 500, 1500)).toBe(true)
      expect(canAffordAutoPurchaser(knowledgeAutoPurchaser, 1500, 500)).toBe(false)
    })

    it('should handle exact cost amounts', () => {
      expect(canAffordAutoPurchaser(mockAutoPurchaser, 1000, 0)).toBe(true)
    })
  })

  describe('shouldPurchaseUpgrade', () => {
    const mockAutoPurchaser = {
      id: 'test',
      name: 'Test',
      upgradeId: 'test_upgrade',
      cycleDays: 10,
      owned: true,
      active: true,
      cost: 1000,
      timer: 0,
      costCurrency: 'money' as const
    }

    const mockUpgrade = {
      id: 'test_upgrade',
      level: 2,
      cost: 500,
      costCurrency: 'money',
      maxLevel: undefined
    }

    it('should return true when all conditions are met', () => {
      expect(shouldPurchaseUpgrade(mockAutoPurchaser, mockUpgrade, 1000, 0)).toBe(true)
    })

    it('should return false when auto-purchaser is not owned', () => {
      const notOwnedAP = { ...mockAutoPurchaser, owned: false }
      expect(shouldPurchaseUpgrade(notOwnedAP, mockUpgrade, 1000, 0)).toBe(false)
    })

    it('should return false when auto-purchaser is not active', () => {
      const inactiveAP = { ...mockAutoPurchaser, active: false }
      expect(shouldPurchaseUpgrade(inactiveAP, mockUpgrade, 1000, 0)).toBe(false)
    })

    it('should return false when upgrade is at max level', () => {
      const maxLevelUpgrade = { ...mockUpgrade, level: 5, maxLevel: 5 }
      expect(shouldPurchaseUpgrade(mockAutoPurchaser, maxLevelUpgrade, 1000, 0)).toBe(false)
    })

    it('should return false when cannot afford upgrade', () => {
      expect(shouldPurchaseUpgrade(mockAutoPurchaser, mockUpgrade, 100, 0)).toBe(false)
    })

    it('should handle knowledge currency upgrades', () => {
      const knowledgeUpgrade = { ...mockUpgrade, costCurrency: 'knowledge' }
      expect(shouldPurchaseUpgrade(mockAutoPurchaser, knowledgeUpgrade, 0, 1000)).toBe(true)
      expect(shouldPurchaseUpgrade(mockAutoPurchaser, knowledgeUpgrade, 1000, 100)).toBe(false)
    })
  })

  describe('selectBestRecipe', () => {
    const mockVeggies = [
      { name: 'Tomatoes', stash: 20, salePrice: 10 },
      { name: 'Carrots', stash: 15, salePrice: 8 },
      { name: 'Onions', stash: 5, salePrice: 12 }
    ]

    const mockRecipes = [
      {
        id: 'recipe1',
        name: 'Simple Recipe',
        salePrice: 50,
        ingredients: [{ veggieName: 'Tomatoes', quantity: 2 }]
      },
      {
        id: 'recipe2',
        name: 'Complex Recipe',
        salePrice: 100,
        ingredients: [
          { veggieName: 'Tomatoes', quantity: 3 },
          { veggieName: 'Carrots', quantity: 2 }
        ]
      },
      {
        id: 'recipe3',
        name: 'Expensive Recipe',
        salePrice: 30,
        ingredients: [{ veggieName: 'Onions', quantity: 10 }] // Not enough onions
      }
    ]

    it('should return null when auto-canning is disabled', () => {
      const config = { ...DEFAULT_AUTO_CANNING_CONFIG, enabled: false }
      expect(selectBestRecipe(mockRecipes, mockVeggies, config)).toBeNull()
    })

    it('should return null when no recipes are available', () => {
      const config = { ...DEFAULT_AUTO_CANNING_CONFIG, enabled: true }
      expect(selectBestRecipe([], mockVeggies, config)).toBeNull()
    })

    it('should select recipe with highest profit', () => {
      const config = { ...DEFAULT_AUTO_CANNING_CONFIG, enabled: true, onlyUseExcess: false }
      const result = selectBestRecipe(mockRecipes, mockVeggies, config)
      expect(result).toBe('recipe2') // Higher profit despite complexity
    })

    it('should respect excess threshold', () => {
      const config = { 
        ...DEFAULT_AUTO_CANNING_CONFIG, 
        enabled: true, 
        onlyUseExcess: true, 
        excessThreshold: 10 
      }
      // Should exclude recipe3 due to insufficient onions (5 < 10 + 10)
      const result = selectBestRecipe(mockRecipes, mockVeggies, config)
      expect(result).not.toBe('recipe3')
    })

    it('should filter by selected recipes', () => {
      const config = { 
        ...DEFAULT_AUTO_CANNING_CONFIG, 
        enabled: true, 
        selectedRecipes: ['recipe1'], 
        onlyUseExcess: false 
      }
      const result = selectBestRecipe(mockRecipes, mockVeggies, config)
      expect(result).toBe('recipe1')
    })

    it('should respect priority order', () => {
      const config = { 
        ...DEFAULT_AUTO_CANNING_CONFIG, 
        enabled: true, 
        priorityOrder: ['recipe1', 'recipe2'], 
        onlyUseExcess: false 
      }
      const result = selectBestRecipe(mockRecipes, mockVeggies, config)
      expect(result).toBe('recipe1') // First in priority order
    })

    it('should return null when no recipes meet requirements', () => {
      const lowStashVeggies = [
        { name: 'Tomatoes', stash: 1, salePrice: 10 },
        { name: 'Carrots', stash: 1, salePrice: 8 },
        { name: 'Onions', stash: 1, salePrice: 12 }
      ]
      const config = { ...DEFAULT_AUTO_CANNING_CONFIG, enabled: true, onlyUseExcess: false }
      const result = selectBestRecipe(mockRecipes, lowStashVeggies, config)
      expect(result).toBeNull()
    })
  })

  describe('updateAutoPurchaserTimers', () => {
    const mockAutoPurchasers = [
      {
        id: 'ap1',
        name: 'AP1',
        upgradeId: 'upgrade1',
        cycleDays: 10,
        owned: true,
        active: true,
        cost: 1000,
        timer: 5,
        costCurrency: 'money' as const
      },
      {
        id: 'ap2',
        name: 'AP2',
        upgradeId: 'upgrade2',
        cycleDays: 15,
        owned: true,
        active: false,
        cost: 2000,
        timer: 3,
        costCurrency: 'knowledge' as const
      },
      {
        id: 'ap3',
        name: 'AP3',
        upgradeId: 'upgrade3',
        cycleDays: 8,
        owned: false,
        active: true,
        cost: 1500,
        timer: 2,
        costCurrency: 'money' as const
      }
    ]

    it('should update timers for owned and active auto-purchasers', () => {
      const result = updateAutoPurchaserTimers(mockAutoPurchasers, 2)
      
      expect(result[0].timer).toBe(7) // 5 + 2
      expect(result[1].timer).toBe(3) // No change (not active)
      expect(result[2].timer).toBe(2) // No change (not owned)
    })

    it('should handle zero days passed', () => {
      const result = updateAutoPurchaserTimers(mockAutoPurchasers, 0)
      
      expect(result[0].timer).toBe(5) // No change
      expect(result[1].timer).toBe(3) // No change
      expect(result[2].timer).toBe(2) // No change
    })

    it('should handle negative days (should not occur in practice)', () => {
      const result = updateAutoPurchaserTimers(mockAutoPurchasers, -1)
      
      expect(result[0].timer).toBe(4) // 5 + (-1)
    })
  })

  describe('processAutoPurchases', () => {
    const mockAutoPurchasers = [
      {
        id: 'ap1',
        name: 'AP1',
        upgradeId: 'upgrade1',
        cycleDays: 10,
        owned: true,
        active: true,
        cost: 1000,
        timer: 10, // Ready to purchase
        costCurrency: 'money' as const
      },
      {
        id: 'ap2',
        name: 'AP2',
        upgradeId: 'upgrade2',
        cycleDays: 15,
        owned: true,
        active: true,
        cost: 2000,
        timer: 5, // Not ready yet
        costCurrency: 'knowledge' as const
      }
    ]

    const mockUpgrades = [
      {
        id: 'upgrade1',
        level: 2,
        cost: 500,
        costCurrency: 'money'
      },
      {
        id: 'upgrade2',
        level: 1,
        cost: 300,
        costCurrency: 'knowledge'
      }
    ]

    it('should attempt purchase and reset timer on success', () => {
      const mockOnPurchase = vi.fn().mockReturnValue(true)
      
      const result = processAutoPurchases(
        mockAutoPurchasers,
        mockUpgrades,
        1000, // enough money
        500,  // enough knowledge
        mockOnPurchase
      )
      
      expect(mockOnPurchase).toHaveBeenCalledWith('upgrade1')
      expect(result[0].timer).toBe(0) // Reset
      expect(result[1].timer).toBe(5) // Unchanged (not ready)
    })

    it('should not reset timer if purchase fails', () => {
      const mockOnPurchase = vi.fn().mockReturnValue(false)
      
      const result = processAutoPurchases(
        mockAutoPurchasers,
        mockUpgrades,
        1000,
        500,
        mockOnPurchase
      )
      
      expect(result[0].timer).toBe(10) // Not reset
    })

    it('should not attempt purchase for non-ready auto-purchasers', () => {
      const mockOnPurchase = vi.fn()
      
      processAutoPurchases(
        mockAutoPurchasers,
        mockUpgrades,
        1000,
        500,
        mockOnPurchase
      )
      
      expect(mockOnPurchase).not.toHaveBeenCalledWith('upgrade2')
    })

    it('should handle missing upgrades gracefully', () => {
      const apWithMissingUpgrade = [{
        ...mockAutoPurchasers[0],
        upgradeId: 'nonexistent_upgrade'
      }]
      
      const mockOnPurchase = vi.fn()
      
      const result = processAutoPurchases(
        apWithMissingUpgrade,
        mockUpgrades,
        1000,
        500,
        mockOnPurchase
      )
      
      expect(result[0].timer).toBe(10) // Unchanged
      expect(mockOnPurchase).not.toHaveBeenCalled()
    })
  })
})
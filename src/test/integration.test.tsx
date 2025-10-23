import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { ArchieProvider } from '../context/ArchieContext'
import ProgressBar from '../components/ProgressBar'
import VeggiePanel from '../components/VeggiePanel'
import { loadGameStateWithCanning, saveGameStateWithCanning } from '../utils/saveSystem'

// Mock dependencies for integration tests
vi.mock('../data/recipes', () => ({
  INITIAL_RECIPES: [
    {
      id: 'test_recipe',
      name: 'Test Recipe',
      description: 'Test',
      ingredients: [{ veggieName: 'Tomatoes', quantity: 1 }],
      baseProcessingTime: 60,
      baseSalePrice: 50,
      experienceRequired: 0
    }
  ]
}))

vi.mock('../utils/canningAutoPurchase', () => ({
  CANNING_AUTO_PURCHASERS: [],
  DEFAULT_AUTO_CANNING_CONFIG: {
    enabled: false,
    selectedRecipes: [],
    priorityOrder: []
  }
}))

describe('Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Component Integration', () => {
    it('should render multiple components together', () => {
      const TestApp: React.FC = () => (
        <ArchieProvider>
          <div>
            <h1>Farm Game</h1>
            <ProgressBar value={50} max={100} />
            <VeggiePanel 
              name="Tomatoes"
              growth={75}
              stash={5}
              onHarvest={() => {}}
              canHarvest={true}
              sellEnabled={false}
              onToggleSell={() => {}}
            />
          </div>
        </ArchieProvider>
      )

      render(<TestApp />)

      expect(screen.getByText('Farm Game')).toBeInTheDocument()
      expect(screen.getByText('Tomatoes')).toBeInTheDocument()
      expect(screen.getByText('Growth: 75%')).toBeInTheDocument()
      expect(screen.getByText('Stash: 5')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Harvest' })).toBeInTheDocument()
    })

    it('should handle component interactions within provider', async () => {
      const mockHarvest = vi.fn()
      const mockToggleSell = vi.fn()

      const TestApp: React.FC = () => (
        <ArchieProvider>
          <VeggiePanel 
            name="Carrots"
            growth={100}
            stash={3}
            onHarvest={mockHarvest}
            canHarvest={true}
            sellEnabled={true}
            onToggleSell={mockToggleSell}
          />
        </ArchieProvider>
      )

      render(<TestApp />)

      // Test harvest interaction
      fireEvent.click(screen.getByRole('button', { name: 'Harvest' }))
      expect(mockHarvest).toHaveBeenCalledTimes(1)

      // Test auto-sell toggle
      fireEvent.click(screen.getByTitle('Auto-sell enabled (click to disable)'))
      expect(mockToggleSell).toHaveBeenCalledTimes(1)
    })
  })

  describe('Save/Load Integration', () => {
    it('should save and load game state successfully', () => {
      const gameState = {
        veggies: [
          { name: 'Tomatoes', growth: 50, stash: 5 },
          { name: 'Carrots', growth: 25, stash: 2 }
        ],
        money: 1000,
        experience: 500,
        knowledge: 250,
        activeVeggie: 0,
        day: 10,
        greenhouseOwned: true,
        heirloomOwned: false,
        autoSellOwned: true,
        almanacLevel: 2,
        almanacCost: 300,
        maxPlots: 8,
        farmTier: 2,
        farmCost: 2000,
        irrigationOwned: true,
        currentWeather: 'sunny',
        highestUnlockedVeggie: 1
      }

      // Save the game state
      saveGameStateWithCanning(gameState)

      // Load the game state
      const loadedState = loadGameStateWithCanning()

      expect(loadedState).toBeTruthy()
      expect(loadedState!.money).toBe(1000)
      expect(loadedState!.experience).toBe(500)
      expect(loadedState!.day).toBe(10)
      expect(loadedState!.greenhouseOwned).toBe(true)
      expect(loadedState!.canningState).toBeTruthy()
      expect(loadedState!.canningVersion).toBe(2)
    })

    it('should handle save/load with canning data', () => {
      const gameStateWithCanning = {
        veggies: [],
        money: 5000,
        experience: 2000,
        knowledge: 1000,
        activeVeggie: 0,
        day: 50,
        greenhouseOwned: true,
        heirloomOwned: true,
        autoSellOwned: true,
        almanacLevel: 5,
        almanacCost: 1000,
        maxPlots: 16,
        farmTier: 3,
        farmCost: 10000,
        irrigationOwned: true,
        currentWeather: 'rain',
        highestUnlockedVeggie: 5,
        canningState: {
          recipes: [],
          upgrades: [],
          activeProcesses: [],
          unlockedRecipes: ['test_recipe'],
          maxSimultaneousProcesses: 2,
          totalItemsCanned: 100,
          canningExperience: 500,
          autoCanning: {
            enabled: true,
            selectedRecipes: ['test_recipe'],
            priorityOrder: ['test_recipe']
          }
        }
      }

      // Save state with canning
      saveGameStateWithCanning(gameStateWithCanning)

      // Load and verify canning data is preserved
      const loaded = loadGameStateWithCanning()
      
      expect(loaded!.canningState!.unlockedRecipes).toContain('test_recipe')
      expect(loaded!.canningState!.totalItemsCanned).toBe(100)
      expect(loaded!.canningState!.canningExperience).toBe(500)
      expect(loaded!.canningState!.autoCanning.enabled).toBe(true)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle localStorage errors gracefully in real usage', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock localStorage to throw errors
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded')
      })

      const gameState = {
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

      // Should not throw an error even when localStorage fails
      expect(() => saveGameStateWithCanning(gameState)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalled()

      // Restore localStorage
      localStorage.setItem = originalSetItem
      consoleSpy.mockRestore()
    })

    it('should handle component errors within context provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const ProblematicComponent: React.FC = () => {
        throw new Error('Component error')
      }

      const TestApp: React.FC = () => (
        <ArchieProvider>
          <div>
            <ProgressBar value={50} />
            <ProblematicComponent />
          </div>
        </ArchieProvider>
      )

      // Should handle the error gracefully
      expect(() => render(<TestApp />)).toThrow('Component error')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle rapid component updates', async () => {
      let growth = 0
      const TestProgressiveComponent: React.FC = () => {
        const [currentGrowth, setCurrentGrowth] = React.useState(growth)

        React.useEffect(() => {
          const interval = setInterval(() => {
            growth += 10
            if (growth <= 100) {
              setCurrentGrowth(growth)
            }
          }, 10)

          return () => clearInterval(interval)
        }, [])

        return (
          <ArchieProvider>
            <ProgressBar value={currentGrowth} max={100} />
            <div data-testid="growth-value">{currentGrowth}</div>
          </ArchieProvider>
        )
      }

      render(<TestProgressiveComponent />)

      // Wait for updates
      await waitFor(() => {
        expect(parseInt(screen.getByTestId('growth-value').textContent!)).toBeGreaterThan(50)
      }, { timeout: 1000 })

      expect(screen.getByTestId('growth-value')).toBeInTheDocument()
    })

    it('should handle extreme values in components', () => {
      render(
        <ArchieProvider>
          <ProgressBar value={999999} max={100} />
          <VeggiePanel 
            name="Super Veggie"
            growth={999.99}
            stash={999999}
            onHarvest={() => {}}
            canHarvest={true}
            sellEnabled={false}
            onToggleSell={() => {}}
          />
        </ArchieProvider>
      )

      expect(screen.getByText('Super Veggie')).toBeInTheDocument()
      expect(screen.getByText('Stash: 999999')).toBeInTheDocument()
      expect(screen.getByText('Growth: 999%')).toBeInTheDocument() // Should floor the value
    })
  })
})
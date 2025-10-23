import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { ArchieProvider, useArchie } from '../context/ArchieContext'

// Mock Audio and localStorage
const mockAudio = {
  play: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  volume: 0.4,
}

// Mock Audio constructor - use a proper constructor function
const AudioMock = vi.fn(function (this: any, _src: string) {
  this.play = mockAudio.play
  this.addEventListener = mockAudio.addEventListener  
  this.volume = mockAudio.volume
  return this
})

Object.defineProperty(window, 'Audio', {
  writable: true,
  value: AudioMock,
})

// Test component that uses the context
const TestComponent: React.FC = () => {
  const {
    archieClicked,
    archieReward,
    archieClickStreak,
    soundEnabled,
    setSoundEnabled,
    handleArchieClick,
    handleArchieAppear,
  } = useArchie()

  return (
    <div>
      <div data-testid="archie-clicked">{archieClicked.toString()}</div>
      <div data-testid="archie-reward">{archieReward}</div>
      <div data-testid="archie-streak">{archieClickStreak}</div>
      <div data-testid="sound-enabled">{soundEnabled.toString()}</div>
      <button data-testid="click-archie" onClick={() => handleArchieClick()}>
        Click Archie
      </button>
      <button data-testid="click-archie-with-state" onClick={() => 
        handleArchieClick({ money: 1000, experience: 100, totalPlotsUsed: 8 })
      }>
        Click Archie with State
      </button>
      <button data-testid="archie-appear" onClick={handleArchieAppear}>
        Archie Appear
      </button>
      <button data-testid="toggle-sound" onClick={() => setSoundEnabled(!soundEnabled)}>
        Toggle Sound
      </button>
    </div>
  )
}

describe('ArchieContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Provider initialization', () => {
    it('should provide default context values', () => {
      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      expect(screen.getByTestId('archie-clicked')).toHaveTextContent('false')
      expect(screen.getByTestId('archie-reward')).toHaveTextContent('0')
      expect(screen.getByTestId('archie-streak')).toHaveTextContent('0')
      expect(screen.getByTestId('sound-enabled')).toHaveTextContent('true')
    })

    it('should throw error when useArchie is used outside provider', () => {
      // Mock console.error to prevent test output pollution
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => {
        render(<TestComponent />)
      }).toThrow('useArchie must be used within an ArchieProvider')
      
      consoleSpy.mockRestore()
    })

    it('should load saved settings from localStorage on mount', () => {
      localStorage.setItem('archieLastClickTime', Date.now().toString()) // Recent time to avoid reset
      localStorage.setItem('archieClickStreak', '5')
      localStorage.setItem('archieSoundEnabled', 'false')

      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      expect(screen.getByTestId('archie-streak')).toHaveTextContent('5')
      expect(screen.getByTestId('sound-enabled')).toHaveTextContent('false')
    })

    it('should reset streak if too much time has passed', () => {
      const oldTime = Date.now() - (31 * 10000) // More than 30 seconds ago
      localStorage.setItem('archieLastClickTime', oldTime.toString())
      localStorage.setItem('archieClickStreak', '5')

      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      expect(screen.getByTestId('archie-streak')).toHaveTextContent('0')
    })
  })

  describe('handleArchieClick', () => {
    it('should handle basic click without game state', async () => {
      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('click-archie'))
      })

      expect(screen.getByTestId('archie-clicked')).toHaveTextContent('true')
      expect(screen.getByTestId('archie-streak')).toHaveTextContent('1')
      expect(parseInt(screen.getByTestId('archie-reward').textContent!)).toBeGreaterThan(0)
    })

    it('should calculate rewards based on game state', async () => {
      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('click-archie-with-state'))
      })

      const reward = parseInt(screen.getByTestId('archie-reward').textContent!)
      expect(reward).toBeGreaterThan(50) // Should be higher than base with game state
      expect(reward).toBeLessThan(1000) // But reasonable for early game
    })

    it('should handle click streaks correctly', async () => {
      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      // First click
      await act(async () => {
        fireEvent.click(screen.getByTestId('click-archie'))
      })
      expect(screen.getByTestId('archie-streak')).toHaveTextContent('1')

      // Advance time by 10 seconds (within streak timeout)
      act(() => {
        vi.advanceTimersByTime(10000)
      })

      // Second click
      await act(async () => {
        fireEvent.click(screen.getByTestId('click-archie'))
      })
      expect(screen.getByTestId('archie-streak')).toHaveTextContent('2')
    })

    it('should reset streak after timeout', async () => {
      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      // First click
      await act(async () => {
        fireEvent.click(screen.getByTestId('click-archie'))
      })
      expect(screen.getByTestId('archie-streak')).toHaveTextContent('1')

      // Advance time beyond streak timeout (more than 300 seconds)
      act(() => {
        vi.advanceTimersByTime(31 * 10000) // 310 seconds
      })

      // Second click should reset streak
      await act(async () => {
        fireEvent.click(screen.getByTestId('click-archie'))
      })
      expect(screen.getByTestId('archie-streak')).toHaveTextContent('1')
    })

    it('should save click data to localStorage', async () => {
      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('click-archie'))
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('archieLastClickTime', expect.any(String))
      expect(localStorage.setItem).toHaveBeenCalledWith('archieClickStreak', '1')
    })

    it('should handle localStorage errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error')
      })

      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('click-archie'))
      })

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save Archie click time:', expect.any(Error))
      
      setItemSpy.mockRestore()
      consoleSpy.mockRestore()
    })
  })

  describe('audio handling', () => {
    it('should play sound when Archie appears', async () => {
      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('archie-appear'))
      })

      expect(AudioMock).toHaveBeenCalledWith('./Archie Bark.mp3')
      expect(mockAudio.play).toHaveBeenCalled()
    })

    it('should play sound when Archie is clicked', async () => {
      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('click-archie'))
      })

      expect(mockAudio.play).toHaveBeenCalled()
    })

    it('should not play sound when sound is disabled', async () => {
      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      // Disable sound first
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-sound'))
      })

      expect(screen.getByTestId('sound-enabled')).toHaveTextContent('false')

      // Clear previous calls
      vi.clearAllMocks()

      // Try to play sound
      await act(async () => {
        fireEvent.click(screen.getByTestId('archie-appear'))
      })

      expect(AudioMock).not.toHaveBeenCalled()
      expect(mockAudio.play).not.toHaveBeenCalled()
    })

    it('should handle audio play errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockAudio.play.mockRejectedValueOnce(new Error('Audio play failed'))

      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('archie-appear'))
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        'ArchieContext: Audio play failed (this is normal if autoplay is restricted):',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('should save sound setting to localStorage', async () => {
      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-sound'))
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('archieSoundEnabled', 'false')
    })
  })

  describe('reward calculation', () => {
    it('should provide higher rewards for advanced game states', async () => {
      render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      // Test with advanced game state
      const advancedGameState = {
        money: 100000,
        experience: 5000,
        totalPlotsUsed: 20
      }

      await act(async () => {
        fireEvent.click(screen.getByTestId('click-archie'))
      })

      const basicReward = parseInt(screen.getByTestId('archie-reward').textContent!)

      // Simulate advanced game state click
      const { unmount } = render(
        <ArchieProvider>
          <TestComponent />
        </ArchieProvider>
      )

      const TestAdvancedComponent: React.FC = () => {
        const { handleArchieClick, archieReward } = useArchie()
        
        return (
          <div>
            <div data-testid="advanced-reward">{archieReward}</div>
            <button 
              data-testid="advanced-click" 
              onClick={() => handleArchieClick(advancedGameState)}
            >
              Advanced Click
            </button>
          </div>
        )
      }

      unmount()

      render(
        <ArchieProvider>
          <TestAdvancedComponent />
        </ArchieProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('advanced-click'))
      })

      const advancedReward = parseInt(screen.getByTestId('advanced-reward').textContent!)
      expect(advancedReward).toBeGreaterThan(basicReward)
    })

    it('should cap rewards appropriately', async () => {
      const TestCapComponent: React.FC = () => {
        const { handleArchieClick, archieReward } = useArchie()
        
        return (
          <div>
            <div data-testid="capped-reward">{archieReward}</div>
            <button 
              data-testid="cap-click" 
              onClick={() => handleArchieClick({
                money: 1000000, // Very high money
                experience: 50000,
                totalPlotsUsed: 50
              })}
            >
              Cap Click
            </button>
          </div>
        )
      }

      render(
        <ArchieProvider>
          <TestCapComponent />
        </ArchieProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('cap-click'))
      })

      const cappedReward = parseInt(screen.getByTestId('capped-reward').textContent!)
      expect(cappedReward).toBeLessThanOrEqual(25000) // Should be capped at 25000
    })
  })
})
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import UpgradePanel from '../components/UpgradePanel'

describe('UpgradePanel', () => {
  const mockUpgrades = [
    {
      name: 'Speed Boost',
      level: 3,
      cost: 500,
      onBuy: vi.fn(),
    },
    {
      name: 'Efficiency',
      level: 1,
      cost: 1000,
      onBuy: vi.fn(),
    },
    {
      name: 'Disabled Upgrade',
      level: 0,
      cost: -1, // Negative cost means disabled
      onBuy: vi.fn(),
    },
  ]

  it('should render upgrade panel with title', () => {
    render(<UpgradePanel upgrades={[]} />)
    
    expect(screen.getByText('Upgrades')).toBeInTheDocument()
  })

  it('should display all upgrades with correct information', () => {
    render(<UpgradePanel upgrades={mockUpgrades} />)
    
    expect(screen.getByText('Speed Boost (Lv. 3)')).toBeInTheDocument()
    expect(screen.getByText('Efficiency (Lv. 1)')).toBeInTheDocument()
    expect(screen.getByText('Disabled Upgrade (Lv. 0)')).toBeInTheDocument()
    
    expect(screen.getByText('Buy ($500)')).toBeInTheDocument()
    expect(screen.getByText('Buy ($1000)')).toBeInTheDocument()
    expect(screen.getByText('Buy ($-1)')).toBeInTheDocument()
  })

  it('should call onBuy when upgrade button is clicked', () => {
    render(<UpgradePanel upgrades={mockUpgrades} />)
    
    const speedBoostButton = screen.getByText('Buy ($500)')
    fireEvent.click(speedBoostButton)
    
    expect(mockUpgrades[0].onBuy).toHaveBeenCalledTimes(1)
  })

  it('should disable button for upgrades with negative cost', () => {
    render(<UpgradePanel upgrades={mockUpgrades} />)
    
    const disabledButton = screen.getByText('Buy ($-1)')
    expect(disabledButton).toBeDisabled()
  })

  it('should handle empty upgrades array', () => {
    render(<UpgradePanel upgrades={[]} />)
    
    expect(screen.getByText('Upgrades')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should handle multiple clicks on same upgrade', () => {
    render(<UpgradePanel upgrades={mockUpgrades} />)
    
    const speedBoostButton = screen.getByText('Buy ($500)')
    fireEvent.click(speedBoostButton)
    fireEvent.click(speedBoostButton)
    fireEvent.click(speedBoostButton)
    
    expect(mockUpgrades[0].onBuy).toHaveBeenCalledTimes(3)
  })

  it('should render upgrades with zero cost', () => {
    const freeUpgrade = [
      {
        name: 'Free Upgrade',
        level: 0,
        cost: 0,
        onBuy: vi.fn(),
      },
    ]

    render(<UpgradePanel upgrades={freeUpgrade} />)
    
    expect(screen.getByText('Buy ($0)')).toBeInTheDocument()
    expect(screen.getByText('Buy ($0)')).not.toBeDisabled()
  })

  it('should handle upgrades with very high levels', () => {
    const highLevelUpgrade = [
      {
        name: 'Max Level',
        level: 999,
        cost: 999999,
        onBuy: vi.fn(),
      },
    ]

    render(<UpgradePanel upgrades={highLevelUpgrade} />)
    
    expect(screen.getByText('Max Level (Lv. 999)')).toBeInTheDocument()
    expect(screen.getByText('Buy ($999999)')).toBeInTheDocument()
  })
})
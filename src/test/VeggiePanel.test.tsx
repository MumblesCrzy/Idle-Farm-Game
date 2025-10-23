import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VeggiePanel from '../components/VeggiePanel'

describe('VeggiePanel', () => {
  const defaultProps = {
    name: 'Tomatoes',
    growth: 75,
    stash: 12,
    onHarvest: vi.fn(),
    canHarvest: true,
    sellEnabled: false,
    onToggleSell: vi.fn(),
  }

  it('should render with all required information', () => {
    render(<VeggiePanel {...defaultProps} />)
    
    expect(screen.getByText('Tomatoes')).toBeInTheDocument()
    expect(screen.getByText('Growth: 75%')).toBeInTheDocument()
    expect(screen.getByText('Stash: 12')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Harvest' })).toBeInTheDocument()
  })

  it('should display growth progress visually', () => {
    render(<VeggiePanel {...defaultProps} growth={60} />)
    
    const progressBar = document.querySelector('.progress')
    expect(progressBar).toHaveStyle('width: 60%')
  })

  it('should handle harvest button clicks', () => {
    const mockHarvest = vi.fn()
    render(<VeggiePanel {...defaultProps} onHarvest={mockHarvest} />)
    
    const harvestButton = screen.getByRole('button', { name: 'Harvest' })
    fireEvent.click(harvestButton)
    
    expect(mockHarvest).toHaveBeenCalledTimes(1)
  })

  it('should disable harvest button when canHarvest is false', () => {
    render(<VeggiePanel {...defaultProps} canHarvest={false} />)
    
    const harvestButton = screen.getByRole('button', { name: 'Harvest' })
    expect(harvestButton).toBeDisabled()
  })

  it('should show auto-sell state correctly when disabled', () => {
    render(<VeggiePanel {...defaultProps} sellEnabled={false} />)
    
    expect(screen.getByText('🚫 Hold')).toBeInTheDocument()
    expect(screen.getByText('Will stockpile')).toBeInTheDocument()
    
    const sellButton = screen.getByTitle('Auto-sell disabled (click to enable)')
    expect(sellButton).toHaveStyle('background: rgb(244, 67, 54)') // red color
  })

  it('should show auto-sell state correctly when enabled', () => {
    render(<VeggiePanel {...defaultProps} sellEnabled={true} />)
    
    expect(screen.getByText('💰 Sell')).toBeInTheDocument()
    expect(screen.getByText('Will auto-sell')).toBeInTheDocument()
    
    const sellButton = screen.getByTitle('Auto-sell enabled (click to disable)')
    expect(sellButton).toHaveStyle('background: rgb(76, 175, 80)') // green color
  })

  it('should handle auto-sell toggle clicks', () => {
    const mockToggleSell = vi.fn()
    render(<VeggiePanel {...defaultProps} onToggleSell={mockToggleSell} />)
    
    const sellButton = screen.getByTitle('Auto-sell disabled (click to enable)')
    fireEvent.click(sellButton)
    
    expect(mockToggleSell).toHaveBeenCalledTimes(1)
  })

  it('should handle floating point growth values correctly', () => {
    render(<VeggiePanel {...defaultProps} growth={75.8} />)
    
    // Should floor the growth percentage in display
    expect(screen.getByText('Growth: 75%')).toBeInTheDocument()
    
    // But the progress bar should use the exact value
    const progressBar = document.querySelector('.progress')
    expect(progressBar).toHaveStyle('width: 75.8%')
  })

  it('should handle edge case values', () => {
    // Test with 0 growth
    const { rerender } = render(<VeggiePanel {...defaultProps} growth={0} stash={0} />)
    expect(screen.getByText('Growth: 0%')).toBeInTheDocument()
    expect(screen.getByText('Stash: 0')).toBeInTheDocument()
    
    // Test with 100% growth
    rerender(<VeggiePanel {...defaultProps} growth={100} />)
    expect(screen.getByText('Growth: 100%')).toBeInTheDocument()
    
    // Test with large stash
    rerender(<VeggiePanel {...defaultProps} stash={9999} />)
    expect(screen.getByText('Stash: 9999')).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<VeggiePanel {...defaultProps} />)
    
    const harvestButton = screen.getByRole('button', { name: 'Harvest' })
    expect(harvestButton).toBeInTheDocument()
    
    const sellButton = screen.getByTitle('Auto-sell disabled (click to enable)')
    expect(sellButton).toBeInTheDocument()
    expect(sellButton).toHaveAttribute('title')
  })

  it('should maintain button styling', () => {
    render(<VeggiePanel {...defaultProps} />)
    
    const sellButton = screen.getByTitle('Auto-sell disabled (click to enable)')
    expect(sellButton).toHaveStyle({
      color: 'rgb(255, 255, 255)',
      cursor: 'pointer',
      padding: '0.25rem 0.5rem',
    })
    
    // Test specific style properties that should be present
    expect(sellButton).toHaveStyle('border-radius: 4px')
    expect(sellButton).toHaveStyle('font-size: 0.8rem')
    expect(sellButton).toHaveStyle('font-weight: bold')
  })
})
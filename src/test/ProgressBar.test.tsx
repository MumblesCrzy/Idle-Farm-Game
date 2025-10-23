import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressBar from '../components/ProgressBar'

describe('ProgressBar', () => {
  it('should render with default props', () => {
    render(<ProgressBar value={50} />)
    
    const progressBar = screen.getByTestId('progress-bar')
    const progress = progressBar.querySelector('.progress')
    
    expect(progressBar).toBeInTheDocument()
    expect(progress).toHaveStyle('width: 50%')
    expect(progress).toHaveStyle('background: rgb(76, 175, 80)')
  })

  it('should calculate percentage correctly with custom max', () => {
    render(<ProgressBar value={25} max={50} />)
    
    const progressBar = screen.getByTestId('progress-bar')
    const progress = progressBar.querySelector('.progress')
    
    expect(progress).toHaveStyle('width: 50%') // 25/50 = 0.5 = 50%
  })

  it('should apply custom color', () => {
    render(<ProgressBar value={75} color="#ff0000" />)
    
    const progressBar = screen.getByTestId('progress-bar')
    const progress = progressBar.querySelector('.progress')
    
    expect(progress).toHaveStyle('background: rgb(255, 0, 0)')
  })

  it('should apply custom height', () => {
    render(<ProgressBar value={30} height={20} />)
    
    const progressBar = screen.getByTestId('progress-bar')
    
    expect(progressBar).toHaveStyle('height: 20px')
  })

  it('should handle edge cases', () => {
    // Test 0 value
    const { rerender } = render(<ProgressBar value={0} />)
    let progressBar = screen.getByTestId('progress-bar')
    let progress = progressBar.querySelector('.progress')
    expect(progress).toHaveStyle('width: 0%')

    // Test value equal to max
    rerender(<ProgressBar value={100} max={100} />)
    progressBar = screen.getByTestId('progress-bar')
    progress = progressBar.querySelector('.progress')
    expect(progress).toHaveStyle('width: 100%')

    // Test value greater than max
    rerender(<ProgressBar value={150} max={100} />)
    progressBar = screen.getByTestId('progress-bar')
    progress = progressBar.querySelector('.progress')
    expect(progress).toHaveStyle('width: 150%')
  })

  it('should have proper styling structure', () => {
    render(<ProgressBar value={60} />)
    
    const progressBar = screen.getByTestId('progress-bar')
    const progress = progressBar.querySelector('.progress')
    
    // Container styling
    expect(progressBar).toHaveStyle({
      height: '12px',
      background: 'rgb(238, 238, 238)',
      borderRadius: '6px',
      overflow: 'hidden'
    })

    // Progress bar styling
    expect(progress).toHaveStyle({
      height: '100%',
      borderRadius: '6px',
      transition: 'width 0.3s'
    })
  })

  it('should use default height when height is not a number', () => {
    render(<ProgressBar value={40} height={undefined} />)
    
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveStyle('height: 12px')
  })
})
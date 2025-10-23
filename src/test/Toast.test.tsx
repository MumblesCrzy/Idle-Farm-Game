import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from '@testing-library/react'
import Toast from '../components/Toast'

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render toast when visible', () => {
    render(
      <Toast
        message="Test message"
        visible={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('should not render when not visible', () => {
    render(
      <Toast
        message="Test message"
        visible={false}
        onClose={vi.fn()}
      />
    )

    expect(screen.queryByText('Test message')).not.toBeInTheDocument()
  })

  it('should display success type with checkmark', () => {
    render(
      <Toast
        message="Success!"
        type="success"
        visible={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.getByText('Success!')).toBeInTheDocument()
  })

  it('should display error type with X mark', () => {
    render(
      <Toast
        message="Error occurred"
        type="error"
        visible={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('✗')).toBeInTheDocument()
    expect(screen.getByText('Error occurred')).toBeInTheDocument()
  })

  it('should display info type with info icon', () => {
    render(
      <Toast
        message="Information"
        type="info"
        visible={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('ℹ️')).toBeInTheDocument()
    expect(screen.getByText('Information')).toBeInTheDocument()
  })

  it('should auto-close after default duration', async () => {
    const mockOnClose = vi.fn()
    
    render(
      <Toast
        message="Auto close test"
        visible={true}
        onClose={mockOnClose}
      />
    )

    // Fast forward time by default duration (3000ms)
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should auto-close after custom duration', async () => {
    const mockOnClose = vi.fn()
    
    render(
      <Toast
        message="Custom duration test"
        visible={true}
        duration={5000}
        onClose={mockOnClose}
      />
    )

    // Fast forward time by custom duration
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should not auto-close if not visible', async () => {
    const mockOnClose = vi.fn()
    
    render(
      <Toast
        message="Not visible test"
        visible={false}
        onClose={mockOnClose}
      />
    )

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('should call onClose when clicked', () => {
    const mockOnClose = vi.fn()
    
    render(
      <Toast
        message="Click to close"
        visible={true}
        onClose={mockOnClose}
      />
    )

    const toastElement = screen.getByText('Click to close').closest('.toast')
    expect(toastElement).toBeInTheDocument()
    
    if (toastElement) {
      fireEvent.click(toastElement)
    }

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should reset timer when visibility changes', () => {
    const mockOnClose = vi.fn()
    
    const { rerender } = render(
      <Toast
        message="Timer reset test"
        visible={true}
        duration={3000}
        onClose={mockOnClose}
      />
    )

    // Advance time partway
    act(() => {
      vi.advanceTimersByTime(1500)
    })

    // Change visibility to false and back to true
    rerender(
      <Toast
        message="Timer reset test"
        visible={false}
        duration={3000}
        onClose={mockOnClose}
      />
    )

    rerender(
      <Toast
        message="Timer reset test"
        visible={true}
        duration={3000}
        onClose={mockOnClose}
      />
    )

    // Advance time by original duration (should not trigger onClose yet since timer reset)
    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(mockOnClose).not.toHaveBeenCalled()

    // Advance time by full duration from reset
    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should handle duration changes', () => {
    const mockOnClose = vi.fn()
    
    const { rerender } = render(
      <Toast
        message="Duration change test"
        visible={true}
        duration={3000}
        onClose={mockOnClose}
      />
    )

    // Change duration
    rerender(
      <Toast
        message="Duration change test"
        visible={true}
        duration={1000}
        onClose={mockOnClose}
      />
    )

    // Should close after new duration
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should have correct CSS classes', () => {
    const { container } = render(
      <Toast
        message="CSS test"
        type="success"
        visible={true}
        onClose={vi.fn()}
      />
    )

    const toastElement = container.querySelector('.toast')
    expect(toastElement).toHaveClass('toast', 'toast-success', 'show')
  })

  it('should render progress bar with correct animation duration', () => {
    const { container } = render(
      <Toast
        message="Progress bar test"
        visible={true}
        duration={2000}
        onClose={vi.fn()}
      />
    )

    const progressBar = container.querySelector('.toast-progress-bar')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveStyle('animation-duration: 2000ms')
  })

  it('should handle empty message', () => {
    render(
      <Toast
        message=""
        visible={true}
        onClose={vi.fn()}
      />
    )

    // Should still render the toast structure even with empty message
    const toastElement = screen.getByText('✓').closest('.toast')
    expect(toastElement).toBeInTheDocument()
    
    // Check that message span exists even if empty
    const messageSpan = toastElement?.querySelector('.toast-message')
    expect(messageSpan).toBeInTheDocument()
  })

  it('should handle very long messages', () => {
    const longMessage = 'This is a very long message that might overflow the toast container and should still be displayed correctly without breaking the layout'
    
    render(
      <Toast
        message={longMessage}
        visible={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText(longMessage)).toBeInTheDocument()
  })
})
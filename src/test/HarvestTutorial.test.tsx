import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HarvestTutorial from '../components/HarvestTutorial';
import styles from '../components/HarvestTutorial.module.css';

/** A stand-in Harvest button, placed on a 1024 × 768 screen by placeButton */
const renderWithButton = (onHarvest = vi.fn()) => {
  const onDismiss = vi.fn();
  const utils = render(
    <>
      <button data-tutorial="harvest-button" onClick={onHarvest}>Harvest</button>
      <HarvestTutorial isVisible={true} onDismiss={onDismiss} />
    </>
  );
  return { ...utils, onDismiss, onHarvest };
};

const placeButton = (top: number) => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.dataset.tutorial === 'harvest-button'
      ? new DOMRect(600, top, 90, 30)
      : new DOMRect(0, 0, 0, 0);
  });
};

describe('HarvestTutorial', () => {
  afterEach(() => vi.restoreAllMocks());

  it('points up at the button from below when there is room', () => {
    placeButton(100);
    const { container } = renderWithButton();

    const arrow = container.querySelector(`.${styles.arrowUp}`) as HTMLElement;
    expect(arrow).not.toBeNull();
    const pointer = arrow.parentElement as HTMLElement;
    // Below the lit window around the button
    expect(parseFloat(pointer.style.top)).toBeGreaterThan(100 + 30);
    // The arrow lines up with the button's center
    expect(parseFloat(pointer.style.left) + parseFloat(arrow.style.left)).toBeCloseTo(645);
  });

  it('points down at the button from above near the bottom of the screen', () => {
    placeButton(700);
    const { container } = renderWithButton();

    expect(container.querySelector(`.${styles.arrowDown}`)).not.toBeNull();
    expect(container.querySelector(`.${styles.arrowUp}`)).toBeNull();
  });

  it('leaves the button clickable, and harvesting closes the tutorial', () => {
    placeButton(100);
    const { onDismiss, onHarvest } = renderWithButton();

    fireEvent.click(screen.getByRole('button', { name: 'Harvest' }));

    expect(onHarvest).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('closes on Got it, or on a click anywhere else', () => {
    placeButton(100);
    const { container, onDismiss } = renderWithButton();

    fireEvent.click(screen.getByRole('button', { name: 'Got it!' }));
    fireEvent.click(container.querySelector(`.${styles.clickArea}`)!);

    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('shows the message in the middle when the button is not on screen', () => {
    const onDismiss = vi.fn();
    const { container } = render(<HarvestTutorial isVisible={true} onDismiss={onDismiss} />);

    expect(container.querySelector(`.${styles.centered}`)).not.toBeNull();
    fireEvent.click(container.querySelector(`.${styles.backdrop}`)!);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

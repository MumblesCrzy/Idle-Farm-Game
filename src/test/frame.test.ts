/**
 * Tests for marking the page when the game runs inside another site's frame
 */
import { describe, it, expect, afterEach } from 'vitest';
import { markIfInFrame } from '../utils/frame';

describe('markIfInFrame', () => {
  afterEach(() => document.body.classList.remove('in-frame'));

  it('leaves the page alone when the game is the whole page', () => {
    markIfInFrame(window);
    expect(document.body.classList.contains('in-frame')).toBe(false);
  });

  it("marks the page inside another site's frame", () => {
    markIfInFrame({ self: window, top: {}, document } as unknown as Window);
    expect(document.body.classList.contains('in-frame')).toBe(true);
  });
});

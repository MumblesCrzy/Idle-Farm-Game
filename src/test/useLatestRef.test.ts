import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLatestRef } from '../hooks/useLatestRef';

describe('useLatestRef', () => {
  it('should return a ref with the initial value', () => {
    const { result } = renderHook(() => useLatestRef(42));
    
    expect(result.current.current).toBe(42);
  });

  it('should update the ref when value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useLatestRef(value),
      { initialProps: { value: 'initial' } }
    );
    
    expect(result.current.current).toBe('initial');
    
    rerender({ value: 'updated' });
    
    expect(result.current.current).toBe('updated');
  });

  it('should maintain ref identity across renders', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useLatestRef(value),
      { initialProps: { value: 1 } }
    );
    
    const firstRef = result.current;
    
    rerender({ value: 2 });
    
    // The ref object itself should be the same
    expect(result.current).toBe(firstRef);
    // But the value should be updated
    expect(result.current.current).toBe(2);
  });

  it('should work with objects', () => {
    const initialObj = { name: 'test', count: 0 };
    const { result, rerender } = renderHook(
      ({ value }) => useLatestRef(value),
      { initialProps: { value: initialObj } }
    );
    
    expect(result.current.current).toEqual({ name: 'test', count: 0 });
    
    const updatedObj = { name: 'updated', count: 5 };
    rerender({ value: updatedObj });
    
    expect(result.current.current).toEqual({ name: 'updated', count: 5 });
  });

  it('should work with functions', () => {
    const fn1 = () => 'first';
    const fn2 = () => 'second';
    
    const { result, rerender } = renderHook(
      ({ value }) => useLatestRef(value),
      { initialProps: { value: fn1 } }
    );
    
    expect(result.current.current()).toBe('first');
    
    rerender({ value: fn2 });
    
    expect(result.current.current()).toBe('second');
  });

  it('should work with null and undefined', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useLatestRef(value),
      { initialProps: { value: null as string | null } }
    );
    
    expect(result.current.current).toBeNull();
    
    rerender({ value: 'not null' });
    expect(result.current.current).toBe('not null');
    
    rerender({ value: null });
    expect(result.current.current).toBeNull();
  });
});

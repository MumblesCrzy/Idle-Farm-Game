import { useRef, useEffect } from 'react';

/**
 * A hook that keeps the latest value in a ref without causing re-renders.
 * 
 * This is useful when you need to access the current value of a prop or state
 * inside a callback without adding it to the dependency array, which would
 * cause the callback to be recreated on every change.
 * 
 * @template T - The type of the value to track
 * @param value - The value to keep in a ref
 * @returns A ref object containing the latest value
 * 
 * @example
 * ```tsx
 * const latestCount = useLatestRef(count);
 * 
 * const handleClick = useCallback(() => {
 *   // Always has the latest count value
 *   console.log(latestCount.current);
 * }, []); // No need to add count to deps
 * ```
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref;
}

export default useLatestRef;

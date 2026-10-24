import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Calls whatever the ref holds. Made outside the hook, so it holds the ref and nothing else. */
const forwardTo = <Args extends unknown[], Result>(ref: RefObject<(...args: Args) => Result>) =>
  (...args: Args): Result => ref.current(...args);

/**
 * A function that keeps one identity for the component's life and always runs the callback from
 * the latest committed render. For event handlers, timers and effects, not for use while rendering.
 *
 * A memoized callback holds the whole scope of the render that made it. Callbacks remade at
 * different times then hold each other's old scopes, and those chains kept old renders, and all
 * their state, in memory. This one holds only a ref.
 */
export function useStableCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result
): (...args: Args) => Result {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });
  const [stable] = useState(() => forwardTo(callbackRef));
  return stable;
}

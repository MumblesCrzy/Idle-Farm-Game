import { useCallback, useEffect, useRef } from 'react';

/** Records work for after the next commit; undefined removes earlier work under the key */
export type ScheduleAfterCommit = (key: object, effect: (() => void) | undefined) => void;

/**
 * Lets a state updater schedule follow-up work without running it inside the updater.
 *
 * Updaters must stay pure: React may run one more than once, or later than the code
 * that queued it. Call schedule(key, effect) from the updater with a key made once per
 * call (an empty object). A re-run updater replaces its own entry instead of adding a
 * second one. Every recorded effect runs once, after the next commit of the component
 * that calls this hook, so the updater's state must belong to that component or one
 * that re-renders with it.
 *
 * @returns schedule function, stable across renders
 */
export function useDeferredEffects(): ScheduleAfterCommit {
  const pending = useRef(new Map<object, () => void>());

  // Runs after every commit; cheap when nothing is pending
  useEffect(() => {
    if (pending.current.size === 0) return;
    const effects = [...pending.current.values()];
    pending.current.clear();
    effects.forEach(effect => effect());
  });

  return useCallback<ScheduleAfterCommit>((key, effect) => {
    if (effect) {
      pending.current.set(key, effect);
    } else {
      pending.current.delete(key);
    }
  }, []);
}

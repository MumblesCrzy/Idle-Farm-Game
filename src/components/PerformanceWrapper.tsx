import { Profiler } from 'react';
import type { ReactNode, ProfilerOnRenderCallback } from 'react';
import { performanceMonitor } from '../utils/performanceMonitor';

interface PerformanceWrapperProps {
  id: string;
  children: ReactNode;
}

/**
 * Wrapper component that uses React Profiler to monitor performance
 * Usage: Wrap any component with <PerformanceWrapper id="ComponentName">
 */
export const PerformanceWrapper = ({ id, children }: PerformanceWrapperProps) => {
  const onRenderCallback: ProfilerOnRenderCallback = (
    profileId,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    performanceMonitor.onRender(
      id || profileId,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      new Set()
    );
  };

  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
};

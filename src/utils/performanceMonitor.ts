/**
 * Performance monitoring utilities for tracking component render times
 * and identifying performance bottlenecks
 */

interface RenderMetrics {
  id: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<any>;
}

interface ComponentStats {
  componentName: string;
  renderCount: number;
  totalTime: number;
  averageTime: number;
  maxTime: number;
  minTime: number;
  lastRenderTime: number;
}

class PerformanceMonitor {
  private metrics: Map<string, RenderMetrics[]> = new Map();
  private enabled: boolean = false;

  enable() {
    this.enabled = true;
    console.log('🔍 Performance monitoring enabled');
  }

  disable() {
    this.enabled = false;
    console.log('🔍 Performance monitoring disabled');
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Callback for React Profiler onRender
   */
  onRender(
    id: string,
    phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
    interactions: Set<any>
  ) {
    if (!this.enabled) return;

    const metric: RenderMetrics = {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions
    };

    if (!this.metrics.has(id)) {
      this.metrics.set(id, []);
    }
    this.metrics.get(id)!.push(metric);

    // Log slow renders (> 16ms for 60fps)
    if (actualDuration > 16) {
      console.warn(
        `⚠️ Slow render detected: ${id} took ${actualDuration.toFixed(2)}ms (${phase})`
      );
    }
  }

  /**
   * Get statistics for all components
   */
  getStats(): ComponentStats[] {
    const stats: ComponentStats[] = [];

    this.metrics.forEach((renders, componentName) => {
      const times = renders.map(r => r.actualDuration);
      const totalTime = times.reduce((sum, t) => sum + t, 0);

      stats.push({
        componentName,
        renderCount: renders.length,
        totalTime,
        averageTime: totalTime / renders.length,
        maxTime: Math.max(...times),
        minTime: Math.min(...times),
        lastRenderTime: times[times.length - 1]
      });
    });

    return stats.sort((a, b) => b.totalTime - a.totalTime);
  }

  /**
   * Print performance report to console
   */
  printReport() {
    console.log('\n📊 Performance Report\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const stats = this.getStats();
    
    if (stats.length === 0) {
      console.log('No performance data collected. Make sure monitoring is enabled.');
      return;
    }

    console.table(
      stats.map(s => ({
        Component: s.componentName,
        'Renders': s.renderCount,
        'Total (ms)': s.totalTime.toFixed(2),
        'Avg (ms)': s.averageTime.toFixed(2),
        'Max (ms)': s.maxTime.toFixed(2),
        'Min (ms)': s.minTime.toFixed(2)
      }))
    );

    console.log('\n🎯 Top 5 Performance Bottlenecks:\n');
    stats.slice(0, 5).forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.componentName}`);
      console.log(`   Total time: ${stat.totalTime.toFixed(2)}ms over ${stat.renderCount} renders`);
      console.log(`   Average: ${stat.averageTime.toFixed(2)}ms | Max: ${stat.maxTime.toFixed(2)}ms`);
      console.log('');
    });

    // Identify frequently re-rendering components
    const frequentRenderers = stats.filter(s => s.renderCount > 50);
    if (frequentRenderers.length > 0) {
      console.log('\n⚡ Frequently Re-rendering Components (>50 renders):\n');
      frequentRenderers.forEach(stat => {
        console.log(`• ${stat.componentName}: ${stat.renderCount} renders`);
      });
    }

    // Identify slow components
    const slowComponents = stats.filter(s => s.averageTime > 16);
    if (slowComponents.length > 0) {
      console.log('\n🐌 Slow Components (avg >16ms for 60fps):\n');
      slowComponents.forEach(stat => {
        console.log(`• ${stat.componentName}: ${stat.averageTime.toFixed(2)}ms average`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Clear all collected metrics
   */
  clear() {
    this.metrics.clear();
    console.log('🧹 Performance metrics cleared');
  }

  /**
   * Get metrics for a specific component
   */
  getComponentMetrics(componentId: string): RenderMetrics[] {
    return this.metrics.get(componentId) || [];
  }

  /**
   * Export metrics as JSON for external analysis
   */
  exportMetrics() {
    const stats = this.getStats();
    const exportData = {
      timestamp: new Date().toISOString(),
      totalComponents: stats.length,
      totalRenders: stats.reduce((sum, s) => sum + s.renderCount, 0),
      totalTime: stats.reduce((sum, s) => sum + s.totalTime, 0),
      components: stats
    };

    console.log('📤 Exporting performance metrics...');
    console.log(JSON.stringify(exportData, null, 2));
    return exportData;
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as any).performanceMonitor = performanceMonitor;
}

/**
 * Hook to easily wrap components with profiling
 */
export const usePerformanceMonitor = (componentName: string) => {
  const onRenderCallback = (
    id: string,
    phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
    interactions: Set<any>
  ) => {
    performanceMonitor.onRender(
      componentName || id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions
    );
  };

  return onRenderCallback;
};

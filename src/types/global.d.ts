/**
 * Properties this app attaches to `window`.
 *
 * The canning callbacks carry canning events to the event log.
 * The other two expose developer tools in the browser console.
 */
import type { performanceMonitor } from '../utils/performanceMonitor';
import type { devTelemetry } from '../utils/devTelemetry';

export type CanningStartCallback = (
  recipeName: string,
  ingredients: string,
  processingTime: number,
  isAuto: boolean
) => void;

export type CanningCompleteCallback = (
  recipeName: string,
  moneyEarned: number,
  knowledgeEarned: number,
  itemsProduced: number,
  isAuto: boolean
) => void;

declare global {
  interface Window {
    globalCanningStartCallback?: CanningStartCallback | null;
    globalCanningCompleteCallback?: CanningCompleteCallback | null;
    performanceMonitor?: typeof performanceMonitor;
    __telemetry?: typeof devTelemetry;
  }
}

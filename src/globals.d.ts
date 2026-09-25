/**
 * Values the game places on window
 */
declare global {
  interface Window {
    // Callbacks App.tsx sets so the canning system can log to the event log
    globalCanningStartCallback?: ((recipeName: string, ingredients: string, processingTime: number, isAuto: boolean) => void) | null;
    globalCanningCompleteCallback?: ((recipeName: string, moneyEarned: number, knowledgeEarned: number, itemsProduced: number, isAuto: boolean) => void) | null;
    // Exposed for use from the browser console
    performanceMonitor?: typeof import('./utils/performanceMonitor').performanceMonitor;
  }
}

export {};

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GameProviders } from './GameProviders.tsx'
import { PerformanceWrapper } from './components/PerformanceWrapper.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { markIfInFrame } from './utils/frame'

// On itch.io the game runs in a frame, under itch's toolbar in the top-right corner
markIfInFrame()

// React's dev build records a performance measure for its component renders and never clears
// them. Firefox keeps every one, so a long dev session filled memory and froze. Clear them often.
if (import.meta.env.DEV) {
  setInterval(() => performance.clearMeasures(), 10000)
}

createRoot(document.getElementById('root')!).render(
  <PerformanceWrapper id="App-Root">
    {/* Last line of defence: a crash in the game state shows the error and a reload, not a blank page */}
    <ErrorBoundary onReset={() => window.location.reload()}>
      <GameProviders>
        <App />
      </GameProviders>
    </ErrorBoundary>
  </PerformanceWrapper>
)

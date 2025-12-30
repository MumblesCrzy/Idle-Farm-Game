
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { GameProvider } from './App.tsx'
import { ArchieProvider } from './context/ArchieContext.tsx'
import { EventLogProvider } from './context/EventLogContext.tsx'
import { GameFlagsProvider } from './context/GameFlagsContext.tsx'
import { FeatureFlagsProvider } from './context/FeatureFlagsContext.tsx'
import { PerformanceWrapper } from './components/PerformanceWrapper.tsx'

createRoot(document.getElementById('root')!).render(
  <PerformanceWrapper id="App-Root">
    <FeatureFlagsProvider>
      <EventLogProvider>
        <GameFlagsProvider>
          <GameProvider>
            <ArchieProvider>
              <App />
            </ArchieProvider>
          </GameProvider>
        </GameFlagsProvider>
      </EventLogProvider>
    </FeatureFlagsProvider>
  </PerformanceWrapper>
)

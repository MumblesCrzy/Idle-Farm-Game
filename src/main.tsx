
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { GameProvider } from './App.tsx'
import { ArchieProvider } from './context/ArchieContext.tsx'
import { PerformanceWrapper } from './components/PerformanceWrapper.tsx'

createRoot(document.getElementById('root')!).render(
  <PerformanceWrapper id="App-Root">
    <GameProvider>
      <ArchieProvider>
        <App />
      </ArchieProvider>
    </GameProvider>
  </PerformanceWrapper>
)

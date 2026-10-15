import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GameProviders } from './GameProviders.tsx'
import { PerformanceWrapper } from './components/PerformanceWrapper.tsx'

createRoot(document.getElementById('root')!).render(
  <PerformanceWrapper id="App-Root">
    <GameProviders>
      <App />
    </GameProviders>
  </PerformanceWrapper>
)

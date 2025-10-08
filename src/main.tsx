
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { GameProvider } from './App.tsx'
import { ArchieProvider } from './context/ArchieContext.tsx'

createRoot(document.getElementById('root')!).render(
  <GameProvider>
    <ArchieProvider>
      <App />
    </ArchieProvider>
  </GameProvider>
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { GameProvider } from './App.tsx'
import { ArchieProvider } from './context/ArchieContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider>
      <ArchieProvider>
        <App />
      </ArchieProvider>
    </GameProvider>
  </StrictMode>,
)

import type { ReactNode } from 'react';
import { GameProvider } from './App';
import { ArchieProvider } from './context/ArchieContext';
import { EventLogProvider } from './context/EventLogContext';
import { FeatureFlagsProvider } from './context/FeatureFlagsContext';
import { GameClockProvider } from './hooks/useGameClock';

/**
 * Every provider the game needs, in order. main.tsx and the whole-game tests
 * both render through this, so tests run the same setup as the real game.
 */
export function GameProviders({ children }: { children: ReactNode }) {
  return (
    <FeatureFlagsProvider>
      <EventLogProvider>
        <GameClockProvider>
          <GameProvider>
            <ArchieProvider>
              {children}
            </ArchieProvider>
          </GameProvider>
        </GameClockProvider>
      </EventLogProvider>
    </FeatureFlagsProvider>
  );
}

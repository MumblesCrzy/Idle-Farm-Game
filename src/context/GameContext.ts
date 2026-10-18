import { createContext } from 'react';
import type { GameState } from '../types/game';

/**
 * The game state GameProvider (in App.tsx) shares with the game. It lives in its own file so
 * App.tsx exports only components, which lets Vite hot-update App.tsx after a code change
 * instead of reloading the page.
 */
export const GameContext = createContext<GameState | undefined>(undefined);

/**
 * The three rivals who compete at the County Fair weigh-off and on the Summer
 * Festival's Challenge Board, always in this order.
 */
import { RIVAL_EARL, RIVAL_MAGGIE, RIVAL_VANCE } from '../config/assetPaths';

export interface Rival {
  id: string;
  /** For lists and headings: "The Vance Twins" */
  name: string;
  /** For the middle of a sentence: "beating the Vance Twins" */
  sentenceName: string;
  /** A short form, for anywhere a portrait doesn't fit */
  initials: string;
  /** Their portrait, a standing figure in their colour's ring on the Challenge Board */
  portrait: string;
}

export const RIVALS: readonly Rival[] = [
  { id: 'maggie', name: 'Maggie Pickett', sentenceName: 'Maggie Pickett', initials: 'MP', portrait: RIVAL_MAGGIE },
  { id: 'earl', name: 'Earl Boone', sentenceName: 'Earl Boone', initials: 'EB', portrait: RIVAL_EARL },
  { id: 'vance', name: 'The Vance Twins', sentenceName: 'the Vance Twins', initials: 'VT', portrait: RIVAL_VANCE },
];

/** The rivals' names, in order */
export const RIVAL_NAMES: readonly string[] = RIVALS.map(rival => rival.name);

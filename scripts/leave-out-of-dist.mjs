// Leaves files the game never loads out of dist, so the itch.io upload is smaller.
// They stay in public/; `npm run build` runs this after `vite build`.
import { existsSync, rmSync, statSync } from 'node:fs';

const NOT_SHIPPED = [
  // Archie's full-size originals: the game loads the 256 px copies
  'Archie.png',
  'Archie Pinecones.png',
  'Archie Reindeer.png',
  'Archie Sweater.png',
  'Archie Fall Sweater.png',
  'Archie Warlock Costume.png',
  // The Glutton's full-size originals: the game loads the 256 px copies
  'Glutton.png',
  'Glutton Sweater.png',
  'Glutton Halloween Vampire.png',
  // Stanley's full-size originals: the game loads the 256 px copies
  'Stanley.png',
  'Stanley Halloween.png',
  // Art for the itch.io page
  'Background_spring.png',
  'Cover Image.png',
  'Banner.png',
];

let removed = 0;
let bytes = 0;
for (const name of NOT_SHIPPED) {
  const file = new URL(`../dist/${name}`, import.meta.url);
  if (!existsSync(file)) continue;
  bytes += statSync(file).size;
  rmSync(file);
  removed++;
}
console.log(`Left ${removed} unused images out of dist (${(bytes / 1024 / 1024).toFixed(1)} MB)`);

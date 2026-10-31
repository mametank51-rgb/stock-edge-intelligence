/** Runtime assets are already sampled to the game's 32 × 40 frame size. */
export const characterArt = ['adventurer','mage','archer','townswoman','guard',
  'blacksmith','merchant','innkeeper','traveler','priest','fisher'] as const;
export type CharacterArt = typeof characterArt[number];
export type NpcArt = Exclude<CharacterArt, 'adventurer'|'mage'|'archer'>;

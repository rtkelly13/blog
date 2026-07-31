/**
 * A starter deck, so the page is playable without anything else to hand.
 *
 * **These are original words, not the contents of anyone's card deck.** Poetry
 * for Neanderthals is a published game and its cards are its publisher's; this
 * page is a referee you point at your own physical deck, with a small word list
 * of its own for when the box is in a cupboard somewhere. Type whatever you like
 * into the target field — that is the intended way to use it with real cards.
 *
 * Each card mirrors the shape of the game: an easy single word worth one point,
 * and a harder phrase worth three.
 */

export type Card = {
  /** One point. */
  readonly easy: string;
  /** Three points. */
  readonly hard: string;
};

export const STARTER_DECK: readonly Card[] = [
  { easy: 'dog', hard: 'guide dog' },
  { easy: 'moon', hard: 'full moon' },
  { easy: 'bread', hard: 'garlic bread' },
  { easy: 'train', hard: 'ghost train' },
  { easy: 'shark', hard: 'shark tank' },
  { easy: 'ghost', hard: 'ghost story' },
  { easy: 'cake', hard: 'birthday cake' },
  { easy: 'sock', hard: 'lost sock' },
  { easy: 'storm', hard: 'storm cloud' },
  { easy: 'thumb', hard: 'green thumb' },
  { easy: 'sword', hard: 'sword fight' },
  { easy: 'crab', hard: 'crab walk' },
  { easy: 'stairs', hard: 'fire escape' },
  { easy: 'bee', hard: 'queen bee' },
  { easy: 'sponge', hard: 'wet sponge' },
  { easy: 'plug', hard: 'ear plug' },
  { easy: 'goat', hard: 'mountain goat' },
  { easy: 'clown', hard: 'sad clown' },
  { easy: 'brick', hard: 'brick wall' },
  { easy: 'toast', hard: 'burnt toast' },
  { easy: 'whale', hard: 'blue whale' },
  { easy: 'nurse', hard: 'night nurse' },
  { easy: 'clock', hard: 'alarm clock' },
  { easy: 'skull', hard: 'skull and bones' },
  { easy: 'spoon', hard: 'wooden spoon' },
  { easy: 'ice', hard: 'thin ice' },
  { easy: 'wig', hard: 'bad wig' },
  { easy: 'frog', hard: 'frog spawn' },
  { easy: 'ghoul', hard: 'graveyard shift' },
  { easy: 'knee', hard: 'knee deep' },
  { easy: 'rope', hard: 'tug of war' },
  { easy: 'swan', hard: 'swan dive' },
  { easy: 'flute', hard: 'tin whistle' },
  { easy: 'drain', hard: 'blocked drain' },
  { easy: 'crown', hard: 'gold crown' },
  { easy: 'mole', hard: 'mole hill' },
  { easy: 'ladder', hard: 'step ladder' },
  { easy: 'kite', hard: 'kite string' },
  { easy: 'tooth', hard: 'sweet tooth' },
  { easy: 'snail', hard: 'snail trail' },
  { easy: 'beard', hard: 'fake beard' },
  { easy: 'gate', hard: 'farm gate' },
  { easy: 'plum', hard: 'ripe plum' },
  { easy: 'flame', hard: 'old flame' },
  { easy: 'shell', hard: 'egg shell' },
];

/** Fisher–Yates. Returns a new array; never mutates the deck. */
export function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

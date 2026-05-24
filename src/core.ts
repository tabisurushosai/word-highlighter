export interface WordItem {
  id: string;
  text: string;
  color: string;
}

export type WordList = readonly WordItem[];

export interface Match {
  start: number;
  end: number;
  word: WordItem;
}

const PALETTE: readonly [string, ...string[]] = [
  '#ffff00', // Yellow
  '#00ff00', // Lime
  '#00ffff', // Cyan
  '#ff00ff', // Magenta
  '#ffc0cb', // Pink
  '#ffa500', // Orange
  '#7fff00', // Chartreuse
  '#40e0d0', // Turquoise
  '#dda0dd', // Plum
  '#f0e68c', // Khaki
];

/**
 * Returns a color from the predefined palette based on the index.
 */
export function getNextColor(existingCount: number): string {
  return PALETTE[existingCount % PALETTE.length]!;
}

/**
 * Finds all occurrences of the registered words in the given text.
 * Returns non-overlapping matches, prioritizing longer words and earlier appearances.
 * Case-insensitive matching is used.
 */
export function findMatches(text: string, words: WordList): Match[] {
  if (!text || words.length === 0) return [];

  const allMatches: Match[] = [];

  for (const word of words) {
    if (!word.text) continue;

    // Escape regex special characters to treat the word text as a literal string
    const escapedText = word.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedText, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      allMatches.push({
        start: match.index,
        end: regex.lastIndex,
        word,
      });

      // Prevent infinite loops with zero-length matches (though words should have length > 0)
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  }

  // Sort matches to facilitate overlapping removal:
  // 1. By start position (ascending)
  // 2. By length (descending) to prefer longer matches at the same position
  allMatches.sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    return (b.end - b.start) - (a.end - a.start);
  });

  // Filter out overlapping matches
  const result: Match[] = [];
  let lastEnd = 0;

  for (const m of allMatches) {
    if (m.start >= lastEnd) {
      result.push(m);
      lastEnd = m.end;
    }
  }

  return result;
}

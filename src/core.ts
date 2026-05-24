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

const MIN_TEXT_CONTRAST_RATIO = 4.5;

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

function getRelativeLuminance(hexColor: string): number | undefined {
  const normalized = hexColor.trim().replace(/^#/, '');
  if (!/^[\da-f]{6}$/i.test(normalized)) {
    return undefined;
  }

  const channels = [0, 2, 4].map((start) => {
    const value = Number.parseInt(normalized.slice(start, start + 2), 16) / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  const [red, green, blue] = channels as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getContrastRatio(firstLuminance: number, secondLuminance: number): number {
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns a color from the predefined palette based on the index.
 */
export function getNextColor(existingCount: number): string {
  return PALETTE[existingCount % PALETTE.length]!;
}

/**
 * Chooses black or white text for a marker background while meeting WCAG AA.
 */
export function getAccessibleTextColor(backgroundColor: string): string {
  const backgroundLuminance = getRelativeLuminance(backgroundColor);
  if (backgroundLuminance === undefined) {
    return '#000000';
  }

  const blackContrast = getContrastRatio(backgroundLuminance, 0);
  if (blackContrast >= MIN_TEXT_CONTRAST_RATIO) {
    return '#000000';
  }

  return '#ffffff';
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

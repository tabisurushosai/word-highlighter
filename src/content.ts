import { WORD_LIST_STORAGE_KEY, storage } from './storage';
import { configureChromeStorageAdapter } from './chrome-storage';
import { findMatches, getAccessibleTextColor, type WordList } from './core';

configureChromeStorageAdapter();

const EXCLUDED_TEXT_PARENT_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'IFRAME',
  'CANVAS',
  'TEXTAREA',
  'MARK',
]);

function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

async function highlightAll(): Promise<void> {
  // Clear existing highlights first
  const existingMarks = document.querySelectorAll('mark[data-word-highlighter="true"]');
  existingMarks.forEach(mark => {
    const parent = mark.parentNode;
    if (parent) {
      const text = mark.textContent || '';
      parent.replaceChild(document.createTextNode(text), mark);
      parent.normalize();
    }
  });

  const words = (await storage.get<WordList>(WORD_LIST_STORAGE_KEY)) || [];
  if (words.length === 0 || !document.body) return;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tagName = parent.tagName.toUpperCase();
        if (EXCLUDED_TEXT_PARENT_TAGS.has(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes: Text[] = [];
  let currentNode: Node | null;
  while ((currentNode = walker.nextNode())) {
    if (isTextNode(currentNode)) {
      textNodes.push(currentNode);
    }
  }

  for (const node of textNodes) {
    const text = node.nodeValue || '';
    if (!text.trim()) continue;

    const matches = findMatches(text, words);
    if (matches.length === 0) continue;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    for (const match of matches) {
      // Append text before match
      if (match.start > lastIndex) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.start)));
      }

      // Create mark element
      const mark = document.createElement('mark');
      const highlightColor = match.word.color || '#ffeb3b';
      mark.textContent = text.substring(match.start, match.end);
      mark.style.backgroundColor = highlightColor;
      mark.style.color = getAccessibleTextColor(highlightColor);
      // Add a data attribute to identify our marks if needed later
      mark.setAttribute('data-word-highlighter', 'true');
      fragment.appendChild(mark);

      lastIndex = match.end;
    }

    // Append remaining text
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    node.parentNode?.replaceChild(fragment, node);
  }
}

// Execute highlighting
void highlightAll();

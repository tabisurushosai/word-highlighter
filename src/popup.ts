import { storage } from './storage';
import { WordList, WordItem, getNextColor } from './core';

const STORAGE_KEY = 'word_list';

const wordInput = document.getElementById('wordInput') as HTMLInputElement;
const addButton = document.getElementById('addButton') as HTMLButtonElement;
const wordListContainer = document.getElementById('wordList') as HTMLDivElement;

async function triggerHighlight() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith('http')) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (err) {
    console.error('Failed to execute script:', err);
  }
}

async function renderList() {
  const words = (await storage.get<WordList>(STORAGE_KEY)) || [];
  wordListContainer.innerHTML = '';
  
  words.forEach(word => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.padding = '4px 8px';
    div.style.background = '#f0f0f0';
    div.style.borderRadius = '4px';
    div.style.fontSize = '14px';
    div.style.marginBottom = '4px';
    
    const colorBadge = document.createElement('div');
    colorBadge.style.width = '12px';
    colorBadge.style.height = '12px';
    colorBadge.style.borderRadius = '2px';
    colorBadge.style.backgroundColor = word.color;
    colorBadge.style.marginRight = '8px';
    colorBadge.style.border = '1px solid #ccc';
    div.appendChild(colorBadge);

    const textSpan = document.createElement('span');
    textSpan.style.flex = '1';
    textSpan.textContent = word.text;
    div.appendChild(textSpan);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.style.border = 'none';
    deleteBtn.style.background = 'none';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.padding = '0 4px';
    deleteBtn.style.fontSize = '16px';
    deleteBtn.style.color = '#999';
    deleteBtn.onclick = async () => {
      const currentWords = (await storage.get<WordList>(STORAGE_KEY)) || [];
      const filtered = currentWords.filter(w => w.id !== word.id);
      await storage.set(STORAGE_KEY, filtered);
      await renderList();
      await triggerHighlight();
    };
    div.appendChild(deleteBtn);

    wordListContainer.appendChild(div);
  });
}

addButton.addEventListener('click', async () => {
  const text = wordInput.value.trim();
  if (!text) return;

  const words = (await storage.get<WordList>(STORAGE_KEY)) || [];
  const newItem: WordItem = {
    id: crypto.randomUUID(),
    text,
    color: getNextColor(words.length),
  };

  await storage.set(STORAGE_KEY, [...words, newItem]);
  wordInput.value = '';
  await renderList();
  await triggerHighlight();
});

// Initial render
renderList();

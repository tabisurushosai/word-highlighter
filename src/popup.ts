import { storage } from './storage';
import { WordList, WordItem } from './core';

const STORAGE_KEY = 'word_list';

const wordInput = document.getElementById('wordInput') as HTMLInputElement;
const addButton = document.getElementById('addButton') as HTMLButtonElement;
const wordListContainer = document.getElementById('wordList') as HTMLDivElement;

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
    div.textContent = word.text;
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
    color: '#ffeb3b', // Default yellow
  };

  await storage.set(STORAGE_KEY, [...words, newItem]);
  wordInput.value = '';
  await renderList();
});

// Initial render
renderList();

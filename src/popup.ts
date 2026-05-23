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
    color: '#ffeb3b', // Default yellow
  };

  await storage.set(STORAGE_KEY, [...words, newItem]);
  wordInput.value = '';
  await renderList();
});

// Initial render
renderList();

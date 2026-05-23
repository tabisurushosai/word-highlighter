import { storage } from './storage';
import { WordList, WordItem, getNextColor } from './core';
import { getPremiumStatus, isUserPremium, getRemainingTrialDays, upgradeToPremium, FREE_WORD_LIMIT } from './premium';

const STORAGE_KEY = 'word_list';

const wordInput = document.getElementById('wordInput') as HTMLInputElement;
const addButton = document.getElementById('addButton') as HTMLButtonElement;
const wordListContainer = document.getElementById('wordList') as HTMLDivElement;
const premiumStatusSpan = document.getElementById('premiumStatus') as HTMLSpanElement;
const upgradeButton = document.getElementById('upgradeButton') as HTMLButtonElement;

// Apply internationalization
function applyI18n() {
  const appName = document.getElementById('appName');
  if (appName) appName.textContent = chrome.i18n.getMessage('appName');

  if (wordInput) {
    wordInput.placeholder = chrome.i18n.getMessage('addPlaceholder');
  }

  if (addButton) {
    addButton.textContent = chrome.i18n.getMessage('addButton');
  }
}

applyI18n();

async function updatePremiumUI() {
  const status = await getPremiumStatus();
  const isPremium = isUserPremium(status);

  if (isPremium) {
    if (status.isPremium) {
      premiumStatusSpan.textContent = chrome.i18n.getMessage('premiumActive');
      upgradeButton.style.display = 'none';
    } else {
      const days = getRemainingTrialDays(status);
      premiumStatusSpan.textContent = chrome.i18n.getMessage('trialPeriod', [days.toString()]);
      upgradeButton.style.display = 'inline-block';
      upgradeButton.textContent = chrome.i18n.getMessage('premiumUpgrade');
    }
  } else {
    premiumStatusSpan.textContent = chrome.i18n.getMessage('limitReached');
    upgradeButton.style.display = 'inline-block';
    upgradeButton.textContent = chrome.i18n.getMessage('premiumUpgrade');
  }
}

upgradeButton.addEventListener('click', async () => {
  await upgradeToPremium();
});

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
  const status = await getPremiumStatus();
  const isPremium = isUserPremium(status);

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
    
    if (isPremium) {
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = word.color;
      colorInput.style.width = '20px';
      colorInput.style.height = '20px';
      colorInput.style.border = 'none';
      colorInput.style.padding = '0';
      colorInput.style.marginRight = '8px';
      colorInput.style.cursor = 'pointer';
      colorInput.onchange = async () => {
        const currentWords = (await storage.get<WordList>(STORAGE_KEY)) || [];
        const updated = currentWords.map(w => w.id === word.id ? { ...w, color: colorInput.value } : w);
        await storage.set(STORAGE_KEY, updated);
        await triggerHighlight();
      };
      div.appendChild(colorInput);
    } else {
      const colorBadge = document.createElement('div');
      colorBadge.style.width = '12px';
      colorBadge.style.height = '12px';
      colorBadge.style.borderRadius = '2px';
      colorBadge.style.backgroundColor = word.color;
      colorBadge.style.marginRight = '8px';
      colorBadge.style.border = '1px solid #ccc';
      div.appendChild(colorBadge);
    }

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

  // Check if we can add more words
  if (!isPremium && words.length >= FREE_WORD_LIMIT) {
    wordInput.disabled = true;
    addButton.disabled = true;
    wordInput.placeholder = chrome.i18n.getMessage('limitReached');
  } else {
    wordInput.disabled = false;
    addButton.disabled = false;
    wordInput.placeholder = chrome.i18n.getMessage('addPlaceholder');
  }

  await updatePremiumUI();
}

addButton.addEventListener('click', async () => {
  const text = wordInput.value.trim();
  if (!text) return;

  const words = (await storage.get<WordList>(STORAGE_KEY)) || [];
  const status = await getPremiumStatus();
  if (!isUserPremium(status) && words.length >= FREE_WORD_LIMIT) {
    return;
  }

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

import { storage } from './storage';
import { WordList, WordItem, getNextColor } from './core';
import { getPremiumStatus, isUserPremium, getRemainingTrialDays, upgradeToPremium, FREE_WORD_LIMIT } from './premium';

const STORAGE_KEY = 'word_list';

const wordInput = document.getElementById('wordInput') as HTMLInputElement;
const wordInputLabel = document.getElementById('wordInputLabel') as HTMLLabelElement;
const addWordForm = document.getElementById('addWordForm') as HTMLFormElement;
const addButton = document.getElementById('addButton') as HTMLButtonElement;
const onboardingGuide = document.getElementById('onboardingGuide') as HTMLParagraphElement;
const wordListContainer = document.getElementById('wordList') as HTMLUListElement;
const statusMessage = document.getElementById('statusMessage') as HTMLDivElement;
const premiumStatusSpan = document.getElementById('premiumStatus') as HTMLSpanElement;
const upgradeButton = document.getElementById('upgradeButton') as HTMLButtonElement;

const numberFormatter = new Intl.NumberFormat(chrome.i18n.getUILanguage());

function getMessage(key: string, substitutions?: string | string[]): string {
  return chrome.i18n.getMessage(key, substitutions);
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function setStatusMessage(key: string, substitutions?: string | string[]) {
  statusMessage.textContent = getMessage(key, substitutions);
}

// Apply internationalization
function applyI18n() {
  const appName = document.getElementById('appName');
  if (appName) appName.textContent = getMessage('appName');

  if (wordInputLabel) {
    wordInputLabel.textContent = getMessage('wordInputLabel');
  }

  if (wordInput) {
    wordInput.placeholder = getMessage('addPlaceholder');
  }

  if (addButton) {
    addButton.textContent = getMessage('addButton');
  }

  if (onboardingGuide) {
    onboardingGuide.textContent = getMessage('onboardingGuide');
  }

  if (wordListContainer) {
    wordListContainer.setAttribute('aria-label', getMessage('wordListLabel'));
  }
}

applyI18n();

async function updatePremiumUI() {
  const status = await getPremiumStatus();
  const isPremium = isUserPremium(status);

  if (isPremium) {
    if (status.isPremium) {
      premiumStatusSpan.textContent = getMessage('premiumActive');
      upgradeButton.style.display = 'none';
    } else {
      const days = getRemainingTrialDays(status);
      premiumStatusSpan.textContent = getMessage('trialPeriod', [formatNumber(days)]);
      upgradeButton.style.display = 'inline-flex';
      upgradeButton.textContent = getMessage('premiumUpgrade');
    }
  } else {
    premiumStatusSpan.textContent = getMessage('limitReached', [formatNumber(FREE_WORD_LIMIT)]);
    upgradeButton.style.display = 'inline-flex';
    upgradeButton.textContent = getMessage('premiumUpgrade');
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

async function renderList(feedback?: { key: string; substitutions?: string | string[] }) {
  wordListContainer.setAttribute('aria-busy', 'true');
  if (!feedback) {
    setStatusMessage('loadingWords');
  }

  const words = (await storage.get<WordList>(STORAGE_KEY)) || [];
  const status = await getPremiumStatus();
  const isPremium = isUserPremium(status);

  wordListContainer.innerHTML = '';
  onboardingGuide.hidden = words.length > 0;

  if (words.length === 0) {
    const emptyState = document.createElement('li');
    emptyState.className = 'empty-state';

    const title = document.createElement('p');
    title.className = 'empty-state-title';
    title.textContent = getMessage('emptyStateTitle');
    emptyState.appendChild(title);

    const description = document.createElement('p');
    description.className = 'empty-state-description';
    description.textContent = getMessage('emptyStateDescription');
    emptyState.appendChild(description);

    const guide = document.createElement('p');
    guide.className = 'empty-state-guide';
    guide.textContent = getMessage('emptyStateGuide');
    emptyState.appendChild(guide);

    wordListContainer.appendChild(emptyState);
  }

  words.forEach(word => {
    const div = document.createElement('li');
    div.className = 'word-item';

    if (isPremium) {
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = word.color;
      colorInput.className = 'color-input';
      colorInput.title = getMessage('changeWordColor', [word.text]);
      colorInput.setAttribute('aria-label', getMessage('changeWordColor', [word.text]));
      colorInput.onchange = async () => {
        const currentWords = (await storage.get<WordList>(STORAGE_KEY)) || [];
        const updated = currentWords.map(w => w.id === word.id ? { ...w, color: colorInput.value } : w);
        await storage.set(STORAGE_KEY, updated);
        setStatusMessage('colorUpdated');
        await triggerHighlight();
      };
      div.appendChild(colorInput);
    } else {
      const colorBadge = document.createElement('div');
      colorBadge.className = 'color-badge';
      colorBadge.style.backgroundColor = word.color;
      colorBadge.title = getMessage('colorSample');
      colorBadge.setAttribute('role', 'img');
      colorBadge.setAttribute('aria-label', getMessage('colorSample'));
      div.appendChild(colorBadge);
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'word-text';
    textSpan.textContent = word.text;
    div.appendChild(textSpan);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.className = 'delete-button';
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('aria-label', getMessage('deleteWord', [word.text]));
    deleteBtn.onclick = async () => {
      const currentWords = (await storage.get<WordList>(STORAGE_KEY)) || [];
      const filtered = currentWords.filter(w => w.id !== word.id);
      await storage.set(STORAGE_KEY, filtered);
      await renderList({ key: 'wordDeleted' });
      await triggerHighlight();
    };
    div.appendChild(deleteBtn);

    wordListContainer.appendChild(div);
  });

  // Check if we can add more words
  if (!isPremium && words.length >= FREE_WORD_LIMIT) {
    wordInput.disabled = true;
    addButton.disabled = true;
    wordInput.placeholder = getMessage('limitReached', [formatNumber(FREE_WORD_LIMIT)]);
  } else {
    wordInput.disabled = false;
    addButton.disabled = false;
    wordInput.placeholder = getMessage('addPlaceholder');
  }

  if (feedback) {
    setStatusMessage(feedback.key, feedback.substitutions);
  } else if (words.length === 0) {
    setStatusMessage('noWords');
  } else {
    setStatusMessage('wordCount', [formatNumber(words.length)]);
  }
  wordListContainer.setAttribute('aria-busy', 'false');

  await updatePremiumUI();
}

addWordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
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
  await renderList({ key: 'wordSaved' });
  await triggerHighlight();
});

// Initial render
renderList();

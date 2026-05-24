import { WORD_LIST_STORAGE_KEY, storage } from './storage';
import { getNextColor, type WordItem, type WordList } from './core';
import { getPremiumStatus, isUserPremium, getRemainingTrialDays, upgradeToPremium, FREE_WORD_LIMIT } from './premium';

type MessageSubstitutions = string | string[];

interface Feedback {
  key: string;
  substitutions?: MessageSubstitutions;
}

type StatusTone = 'info' | 'loading' | 'success';

type FocusTarget = 'wordInput' | 'upgradeButton';

const wordInput = document.getElementById('wordInput') as HTMLInputElement;
const wordInputLabel = document.getElementById('wordInputLabel') as HTMLLabelElement;
const addWordForm = document.getElementById('addWordForm') as HTMLFormElement;
const addButton = document.getElementById('addButton') as HTMLButtonElement;
const onboardingGuide = document.getElementById('onboardingGuide') as HTMLParagraphElement;
const wordListHeading = document.getElementById('wordListHeading') as HTMLHeadingElement;
const wordListContainer = document.getElementById('wordList') as HTMLUListElement;
const statusMessage = document.getElementById('statusMessage') as HTMLDivElement;
const premiumStatusSpan = document.getElementById('premiumStatus') as HTMLSpanElement;
const upgradeButton = document.getElementById('upgradeButton') as HTMLButtonElement;

const numberFormatter = new Intl.NumberFormat(chrome.i18n.getUILanguage());

function getMessage(key: string, substitutions?: MessageSubstitutions): string {
  return chrome.i18n.getMessage(key, substitutions);
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function setStatusMessage(key: string, substitutions?: MessageSubstitutions, tone: StatusTone = 'info') {
  statusMessage.textContent = getMessage(key, substitutions);
  statusMessage.className = `status-message status-message--${tone}`;
}

function getFeedbackTone(key: string): StatusTone {
  return ['wordSaved', 'wordDeleted', 'colorUpdated'].includes(key) ? 'success' : 'info';
}

function focusPreferredControl(target: FocusTarget) {
  requestAnimationFrame(() => {
    if (target === 'upgradeButton' && !upgradeButton.hidden && !upgradeButton.disabled) {
      upgradeButton.focus();
      return;
    }

    if (!wordInput.disabled) {
      wordInput.focus();
    }
  });
}

function focusDeleteButtonAt(index: number) {
  requestAnimationFrame(() => {
    const deleteButtons = wordListContainer.querySelectorAll<HTMLButtonElement>('.delete-button');
    deleteButtons[index]?.focus();
  });
}

function renderLoadingState() {
  wordListContainer.innerHTML = '';

  const loadingState = document.createElement('li');
  loadingState.className = 'loading-state';
  loadingState.textContent = getMessage('loadingWords');

  wordListContainer.appendChild(loadingState);
}

async function getStoredWords(): Promise<WordList> {
  return (await storage.get<WordList>(WORD_LIST_STORAGE_KEY)) || [];
}

async function saveWords(words: WordList): Promise<void> {
  await storage.set(WORD_LIST_STORAGE_KEY, words);
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

  if (wordListHeading) {
    wordListHeading.textContent = getMessage('wordListLabel');
  }

  if (wordListContainer) {
    wordListContainer.setAttribute('aria-labelledby', 'wordListHeading');
  }
}

applyI18n();

async function updatePremiumUI() {
  const status = await getPremiumStatus();
  const isPremium = isUserPremium(status);

  if (isPremium) {
    if (status.isPremium) {
      premiumStatusSpan.textContent = getMessage('premiumActive');
      upgradeButton.hidden = true;
    } else {
      const days = getRemainingTrialDays(status);
      premiumStatusSpan.textContent = getMessage('trialPeriod', [formatNumber(days)]);
      upgradeButton.hidden = false;
      upgradeButton.textContent = getMessage('premiumUpgrade');
      upgradeButton.setAttribute('aria-label', getMessage('premiumUpgrade'));
    }
  } else {
    premiumStatusSpan.textContent = getMessage('limitReached', [formatNumber(FREE_WORD_LIMIT)]);
    upgradeButton.hidden = false;
    upgradeButton.textContent = getMessage('premiumUpgrade');
    upgradeButton.setAttribute('aria-label', getMessage('premiumUpgrade'));
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

async function renderList(feedback?: Feedback) {
  wordListContainer.setAttribute('aria-busy', 'true');
  if (!feedback) {
    setStatusMessage('loadingWords', undefined, 'loading');
    renderLoadingState();
  }

  const words = await getStoredWords();
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

  words.forEach((word, index) => {
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
        const currentWords = await getStoredWords();
        const updated = currentWords.map(w => w.id === word.id ? { ...w, color: colorInput.value } : w);
        await saveWords(updated);
        setStatusMessage('colorUpdated', undefined, 'success');
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
      const currentWords = await getStoredWords();
      const filtered = currentWords.filter(w => w.id !== word.id);
      await saveWords(filtered);
      await renderList({ key: 'wordDeleted' });
      if (filtered.length > 0) {
        focusDeleteButtonAt(Math.min(index, filtered.length - 1));
      } else {
        focusPreferredControl('wordInput');
      }
      await triggerHighlight();
    };
    div.appendChild(deleteBtn);

    wordListContainer.appendChild(div);
  });

  // Check if we can add more words
  if (!isPremium && words.length >= FREE_WORD_LIMIT) {
    wordInput.disabled = true;
    addButton.disabled = true;
    wordInput.setAttribute('aria-disabled', 'true');
    addButton.setAttribute('aria-disabled', 'true');
    wordInput.placeholder = getMessage('limitReached', [formatNumber(FREE_WORD_LIMIT)]);
  } else {
    wordInput.disabled = false;
    addButton.disabled = false;
    wordInput.removeAttribute('aria-disabled');
    addButton.removeAttribute('aria-disabled');
    wordInput.placeholder = getMessage('addPlaceholder');
  }

  if (feedback) {
    setStatusMessage(feedback.key, feedback.substitutions, getFeedbackTone(feedback.key));
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

  const words = await getStoredWords();
  const status = await getPremiumStatus();
  if (!isUserPremium(status) && words.length >= FREE_WORD_LIMIT) {
    return;
  }

  const newItem: WordItem = {
    id: crypto.randomUUID(),
    text,
    color: getNextColor(words.length),
  };

  await saveWords([...words, newItem]);
  wordInput.value = '';
  await renderList({ key: 'wordSaved' });
  focusPreferredControl(wordInput.disabled ? 'upgradeButton' : 'wordInput');
  await triggerHighlight();
});

// Initial render
renderList();

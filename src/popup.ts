import { WORD_LIST_STORAGE_KEY, storage } from './storage';
import { configureChromeStorageAdapter } from './chrome-storage';
import { getNextColor, type WordItem, type WordList } from './core';
import { getPremiumStatus, isUserPremium, getRemainingTrialDays, upgradeToPremium, FREE_WORD_LIMIT } from './premium';

configureChromeStorageAdapter();

type MessageSubstitutions = string | string[];

interface Feedback {
  key: string;
  substitutions?: MessageSubstitutions;
}

type StatusTone = 'info' | 'loading' | 'success';

type FocusTarget = 'wordInput' | 'upgradeButton';

type ElementConstructor<T extends HTMLElement> = {
  new (): T;
};

function getRequiredElement<T extends HTMLElement>(
  id: string,
  elementType: ElementConstructor<T>,
): T {
  const element = document.getElementById(id);
  if (!(element instanceof elementType)) {
    throw new Error(`Missing required popup element: ${id}`);
  }
  return element;
}

const appName = getRequiredElement('appName', HTMLHeadingElement);
const wordInput = getRequiredElement('wordInput', HTMLInputElement);
const wordInputLabel = getRequiredElement('wordInputLabel', HTMLLabelElement);
const addWordForm = getRequiredElement('addWordForm', HTMLFormElement);
const addButton = getRequiredElement('addButton', HTMLButtonElement);
const keyboardHelp = getRequiredElement('keyboardHelp', HTMLParagraphElement);
const onboardingGuide = getRequiredElement('onboardingGuide', HTMLParagraphElement);
const wordListHeading = getRequiredElement('wordListHeading', HTMLHeadingElement);
const wordListContainer = getRequiredElement('wordList', HTMLUListElement);
const statusMessage = getRequiredElement('statusMessage', HTMLDivElement);
const premiumStatusSpan = getRequiredElement('premiumStatus', HTMLSpanElement);
const upgradeButton = getRequiredElement('upgradeButton', HTMLButtonElement);

const uiLanguage = chrome.i18n.getUILanguage();
const numberFormatter = new Intl.NumberFormat(uiLanguage);
const pluralRules = new Intl.PluralRules(uiLanguage);
const wordInputBaseDescriptionIds = ['statusMessage'];
const successFeedbackKeys = new Set(['wordSaved', 'wordDeleted', 'colorUpdated']);

function getMessage(key: string, substitutions?: MessageSubstitutions): string {
  return chrome.i18n.getMessage(key, substitutions);
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function getCountMessage(baseKey: string, value: number): string {
  const suffix = pluralRules.select(value) === 'one' ? 'One' : 'Other';
  return getMessage(`${baseKey}${suffix}`, [formatNumber(value)]);
}

function setStatusMessage(key: string, substitutions?: MessageSubstitutions, tone: StatusTone = 'info'): void {
  statusMessage.textContent = getMessage(key, substitutions);
  statusMessage.className = `status-message status-message--${tone}`;
}

function getFeedbackTone(key: string): StatusTone {
  return successFeedbackKeys.has(key) ? 'success' : 'info';
}

function focusPreferredControl(target: FocusTarget): void {
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

function focusDeleteButtonAt(index: number): void {
  requestAnimationFrame(() => {
    const deleteButtons = wordListContainer.querySelectorAll<HTMLButtonElement>('.delete-button');
    deleteButtons[index]?.focus();
  });
}

function setOnboardingVisibility(isVisible: boolean): void {
  onboardingGuide.hidden = !isVisible;
  const descriptionIds = isVisible
    ? ['onboardingGuide', ...wordInputBaseDescriptionIds]
    : wordInputBaseDescriptionIds;
  wordInput.setAttribute('aria-describedby', descriptionIds.join(' '));
}

function renderLoadingState(): void {
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
function applyI18n(): void {
  document.documentElement.lang = uiLanguage;
  document.title = getMessage('appName');
  appName.textContent = getMessage('appName');
  wordInputLabel.textContent = getMessage('wordInputLabel');
  wordInput.placeholder = getMessage('addPlaceholder');
  addButton.textContent = getMessage('addButton');
  keyboardHelp.textContent = getMessage('keyboardHelp');
  onboardingGuide.textContent = getMessage('onboardingGuide');
  wordListHeading.textContent = getMessage('wordListLabel');
  wordListContainer.setAttribute('aria-labelledby', 'wordListHeading');
}

applyI18n();

function showUpgradeButton(): void {
  upgradeButton.hidden = false;
  upgradeButton.textContent = getMessage('premiumUpgrade');
  upgradeButton.setAttribute('aria-label', getMessage('premiumUpgrade'));
  upgradeButton.setAttribute('aria-describedby', 'premiumStatus');
}

function hideUpgradeButton(): void {
  upgradeButton.hidden = true;
  upgradeButton.removeAttribute('aria-describedby');
}

async function updatePremiumUI(): Promise<void> {
  const status = await getPremiumStatus();
  const isPremium = isUserPremium(status);

  if (isPremium) {
    if (status.isPremium) {
      premiumStatusSpan.textContent = getMessage('premiumActive');
      hideUpgradeButton();
    } else {
      const days = getRemainingTrialDays(status);
      premiumStatusSpan.textContent = getCountMessage('trialPeriod', days);
      showUpgradeButton();
    }
  } else {
    premiumStatusSpan.textContent = getCountMessage('limitReached', FREE_WORD_LIMIT);
    showUpgradeButton();
  }
}

upgradeButton.addEventListener('click', async () => {
  await upgradeToPremium();
});

async function triggerHighlight(): Promise<void> {
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

async function renderList(feedback?: Feedback): Promise<void> {
  wordListContainer.setAttribute('aria-busy', 'true');
  if (!feedback) {
    setStatusMessage('loadingWords', undefined, 'loading');
    renderLoadingState();
  }

  const words = await getStoredWords();
  const status = await getPremiumStatus();
  const isPremium = isUserPremium(status);

  wordListContainer.innerHTML = '';
  setOnboardingVisibility(words.length === 0);

  if (words.length === 0) {
    const emptyState = document.createElement('li');
    emptyState.className = 'empty-state';
    emptyState.setAttribute('aria-labelledby', 'emptyStateTitle');
    emptyState.setAttribute('aria-describedby', 'emptyStateDescription emptyStateGuide emptyStateAction');

    const title = document.createElement('p');
    title.id = 'emptyStateTitle';
    title.className = 'empty-state-title';
    title.textContent = getMessage('emptyStateTitle');
    emptyState.appendChild(title);

    const description = document.createElement('p');
    description.id = 'emptyStateDescription';
    description.className = 'empty-state-description';
    description.textContent = getMessage('emptyStateDescription');
    emptyState.appendChild(description);

    const guide = document.createElement('p');
    guide.id = 'emptyStateGuide';
    guide.className = 'empty-state-guide';
    guide.textContent = getMessage('emptyStateGuide');
    emptyState.appendChild(guide);

    const action = document.createElement('p');
    action.id = 'emptyStateAction';
    action.className = 'empty-state-action';
    action.textContent = getMessage('emptyStateAction');
    emptyState.appendChild(action);

    wordListContainer.appendChild(emptyState);
  }

  words.forEach((word, index) => {
    const div = document.createElement('li');
    div.className = 'word-item';
    const wordTextId = `wordText-${index}`;
    div.setAttribute('aria-labelledby', wordTextId);

    if (isPremium) {
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = word.color;
      colorInput.className = 'color-input';
      colorInput.title = getMessage('changeWordColor', [word.text]);
      colorInput.setAttribute('aria-label', getMessage('changeWordColor', [word.text]));
      colorInput.setAttribute('aria-describedby', wordTextId);
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
    textSpan.id = wordTextId;
    textSpan.className = 'word-text';
    textSpan.textContent = word.text;
    div.appendChild(textSpan);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.className = 'delete-button';
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('aria-label', getMessage('deleteWord', [word.text]));
    deleteBtn.title = getMessage('deleteWord', [word.text]);
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
    wordInput.placeholder = getCountMessage('limitReached', FREE_WORD_LIMIT);
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
    statusMessage.textContent = getCountMessage('wordCount', words.length);
    statusMessage.className = 'status-message status-message--info';
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
void renderList();

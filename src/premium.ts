import { PREMIUM_STATUS_STORAGE_KEY, storage } from './storage';

export const TRIAL_DAYS = 7;
export const FREE_WORD_LIMIT = 5;
export const STRIPE_CHECKOUT_URL = 'https://checkout.stripe.com/c/dummy_url'; // Replace with real URL in production

export interface PremiumStatus {
  isPremium: boolean;
  trialStartTs?: number;
}

export async function getPremiumStatus(): Promise<PremiumStatus> {
  const status = await storage.get<PremiumStatus>(PREMIUM_STATUS_STORAGE_KEY);
  if (!status) {
    const newStatus: PremiumStatus = {
      isPremium: false,
      trialStartTs: Date.now(),
    };
    await storage.set(PREMIUM_STATUS_STORAGE_KEY, newStatus);
    return newStatus;
  }
  return status;
}

export function isUserPremium(status: PremiumStatus): boolean {
  if (status.isPremium) return true;

  if (status.trialStartTs) {
    const diff = Date.now() - status.trialStartTs;
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < TRIAL_DAYS) return true;
  }

  return false;
}

export function getRemainingTrialDays(status: PremiumStatus): number {
  if (!status.trialStartTs) return 0;
  const diff = Date.now() - status.trialStartTs;
  const remaining = TRIAL_DAYS - diff / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(remaining));
}

export async function upgradeToPremium(): Promise<void> {
  window.open(STRIPE_CHECKOUT_URL, '_blank');

  // Note: We don't set isPremium to true here because that should happen
  // after successful payment via webhook or polling.
}

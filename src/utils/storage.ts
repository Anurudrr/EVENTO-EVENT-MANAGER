import type { User } from '../types/index.ts';

export const AUTH_USER_KEY = 'evento_user';
export const AUTH_EXPIRED_EVENT = 'evento-auth-expired';
const AUTH_TOKEN_KEY = 'evento_token';

const getBrowserStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const parseJson = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('[storage] Failed to parse JSON value', error);
    return null;
  }
};

const emitBrowserEvent = (name: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name));
  }
};

export const getStoredUser = (): User | null => parseJson<User>(getBrowserStorage()?.getItem(AUTH_USER_KEY) || null);

export const storeAuthSession = (user: User) => {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(AUTH_TOKEN_KEY);
    storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('[storage] Failed to save auth session', error);
  }
};

export const setStoredUser = (user: User) => {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('[storage] Failed to set stored user', error);
  }
};

export const clearStoredAuth = () => {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(AUTH_TOKEN_KEY);
    storage.removeItem(AUTH_USER_KEY);
  } catch (error) {
    console.error('[storage] Failed to clear stored auth', error);
  }
};

export const dispatchAuthExpired = () => {
  clearStoredAuth();
  emitBrowserEvent(AUTH_EXPIRED_EVENT);
};

export type StoredPermissionKey = 'clipboard-write' | 'web-share';
export type StoredPermissionDecision = 'granted' | 'denied';

const PERMISSION_STORAGE_KEY = 'evento.permission.decisions';

type StoredPermissionMap = Partial<Record<StoredPermissionKey, StoredPermissionDecision>>;

const readStoredPermissions = (): StoredPermissionMap => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(PERMISSION_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) as StoredPermissionMap : {};
  } catch (error) {
    console.error('[permissions] Failed to parse stored permissions', error);
    return {};
  }
};

const writeStoredPermissions = (nextValue: StoredPermissionMap) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(PERMISSION_STORAGE_KEY, JSON.stringify(nextValue));
  } catch {
    // Storage quota or permissions error
  }
};

const rememberPermissionDecision = (key: StoredPermissionKey, decision: StoredPermissionDecision) => {
  writeStoredPermissions({
    ...readStoredPermissions(),
    [key]: decision,
  });
};

const getRememberedPermissionDecision = (key: StoredPermissionKey) => readStoredPermissions()[key];

const getPermissionDeniedMessage = (key: StoredPermissionKey) => (
  key === 'web-share'
    ? 'Sharing was previously denied. Reset permissions to allow it again.'
    : 'Clipboard access was previously denied. Reset permissions to allow copying again.'
);

const isPermissionDeniedError = (error: unknown) => {
  const name = typeof error === 'object' && error && 'name' in error ? String((error as { name?: unknown }).name || '') : '';
  const message = typeof error === 'object' && error && 'message' in error ? String((error as { message?: unknown }).message || '') : '';

  return ['NotAllowedError', 'SecurityError', 'PermissionDeniedError'].includes(name)
    || /denied|permission/i.test(message);
};

const queryPermissionState = async (name: PermissionName) => {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'prompt' as PermissionState;
  }

  try {
    const result = await navigator.permissions.query({ name } as PermissionDescriptor);
    return result.state;
  } catch {
    return 'prompt' as PermissionState;
  }
};

export const resetStoredPermissionDecisions = () => {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(PERMISSION_STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
  }
};

export const copyTextWithPermissionMemory = async (value: string) => {
  if (!value) {
    throw new Error('Nothing to copy.');
  }

  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    throw new Error('Clipboard is not available in this browser.');
  }

  if (getRememberedPermissionDecision('clipboard-write') === 'denied') {
    throw new Error(getPermissionDeniedMessage('clipboard-write'));
  }

  const permissionState = await queryPermissionState('clipboard-write' as PermissionName);

  if (permissionState === 'denied') {
    rememberPermissionDecision('clipboard-write', 'denied');
    throw new Error(getPermissionDeniedMessage('clipboard-write'));
  }

  try {
    await navigator.clipboard.writeText(value);
    rememberPermissionDecision('clipboard-write', 'granted');
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      rememberPermissionDecision('clipboard-write', 'denied');
    }

    throw error;
  }
};

export const shareDataWithPermissionMemory = async (data: ShareData) => {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  if (getRememberedPermissionDecision('web-share') === 'denied') {
    throw new Error(getPermissionDeniedMessage('web-share'));
  }

  try {
    await navigator.share(data);
    rememberPermissionDecision('web-share', 'granted');
    return true;
  } catch (error) {
    const errorName = typeof error === 'object' && error && 'name' in error
      ? String((error as { name?: unknown }).name || '')
      : '';

    if (errorName === 'AbortError') {
      return false;
    }

    if (isPermissionDeniedError(error)) {
      rememberPermissionDecision('web-share', 'denied');
    }

    throw error;
  }
};

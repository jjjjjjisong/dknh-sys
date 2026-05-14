import type { UserSession } from '../types/user';

const STORAGE_KEY = 'dkh_user';
const SESSION_EVENT = 'dkh-session-change';
const TAB_ID_KEY = 'dkh_tab_id';
const TAB_HEARTBEAT_PREFIX = 'dkh_tab_heartbeat:';
const LEGACY_TAB_COUNT_KEY = 'dkh_open_tab_count';
const LEGACY_PENDING_CLEAR_KEY = 'dkh_pending_session_clear_at';
const HEARTBEAT_INTERVAL_MS = 5000;
const HEARTBEAT_STALE_MS = 15000;

let tabLifecycleBound = false;
let heartbeatTimer: number | null = null;

export function getStoredUser(): UserSession | null {
  clearStoredUserIfBrowserSessionEnded();
  ensureTabLifecycle();

  const raw = window.localStorage.getItem(STORAGE_KEY) ?? migrateLegacySessionStorage();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export function saveStoredUser(user: UserSession) {
  ensureTabLifecycle();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function clearStoredUser() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function isAdminUser(user: UserSession | null) {
  return user?.role === 'admin';
}

export function subscribeSessionChange(listener: () => void) {
  ensureTabLifecycle();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function ensureTabLifecycle() {
  if (typeof window === 'undefined') return;

  removeLegacyTabState();
  pruneStaleTabHeartbeats();

  if (!window.sessionStorage.getItem(TAB_ID_KEY)) {
    window.sessionStorage.setItem(TAB_ID_KEY, createTabId());
  }

  writeTabHeartbeat();

  if (tabLifecycleBound) return;
  tabLifecycleBound = true;

  heartbeatTimer = window.setInterval(writeTabHeartbeat, HEARTBEAT_INTERVAL_MS);
  window.addEventListener('beforeunload', handleBeforeUnload);
}

function handleBeforeUnload() {
  const tabId = window.sessionStorage.getItem(TAB_ID_KEY);
  if (tabId) {
    window.localStorage.removeItem(getTabHeartbeatKey(tabId));
  }

  if (heartbeatTimer !== null) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function clearStoredUserIfBrowserSessionEnded() {
  const hasCurrentTabSession = Boolean(window.sessionStorage.getItem(TAB_ID_KEY));
  if (hasCurrentTabSession) {
    return;
  }

  pruneStaleTabHeartbeats();

  if (getActiveTabHeartbeatCount() === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function migrateLegacySessionStorage() {
  const legacy = window.sessionStorage.getItem(STORAGE_KEY);
  if (!legacy) {
    return null;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
  window.localStorage.setItem(STORAGE_KEY, legacy);
  return legacy;
}

function writeTabHeartbeat() {
  const tabId = window.sessionStorage.getItem(TAB_ID_KEY);
  if (!tabId) {
    return;
  }

  window.localStorage.setItem(getTabHeartbeatKey(tabId), String(Date.now()));
}

function pruneStaleTabHeartbeats() {
  const now = Date.now();

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(TAB_HEARTBEAT_PREFIX)) {
      continue;
    }

    const heartbeatAt = Number.parseInt(window.localStorage.getItem(key) ?? '', 10);
    if (Number.isNaN(heartbeatAt) || now - heartbeatAt > HEARTBEAT_STALE_MS) {
      window.localStorage.removeItem(key);
    }
  }
}

function getActiveTabHeartbeatCount() {
  let count = 0;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(TAB_HEARTBEAT_PREFIX)) {
      count += 1;
    }
  }

  return count;
}

function getTabHeartbeatKey(tabId: string) {
  return `${TAB_HEARTBEAT_PREFIX}${tabId}`;
}

function createTabId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function removeLegacyTabState() {
  window.localStorage.removeItem(LEGACY_TAB_COUNT_KEY);
  window.localStorage.removeItem(LEGACY_PENDING_CLEAR_KEY);
}

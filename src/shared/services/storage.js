/**
 * Storage Abstraction Layer
 * localStorage utility service with JSON parse/stringify, error handling,
 * quota exceeded protection, corrupted data auto-reset, and PII masking.
 * @module storage
 */

import { STORAGE_KEYS, ROLES } from '../constants.js';

/**
 * Fields considered PII that should be masked in debug output
 * @type {Set<string>}
 */
const PII_FIELDS = new Set([
  'email',
  'password',
  'token',
  'phone',
  'address',
  'ssn',
  'id_number',
  'firstName',
  'lastName',
  'fullName',
  'name',
]);

/**
 * Default values for storage keys used when seeding or resetting
 * @type {Object.<string, *>}
 */
const STORAGE_DEFAULTS = {
  [STORAGE_KEYS.AUTH_TOKEN]: '',
  [STORAGE_KEYS.USER]: {
    id: 'user-001',
    username: 'default_user',
    name: 'Default User',
    email: 'user@kp-etsip.gov',
    role: import.meta.env.VITE_DEFAULT_ROLE || ROLES.VIEWER,
  },
  [STORAGE_KEYS.ROLE]: import.meta.env.VITE_DEFAULT_ROLE || ROLES.VIEWER,
  [STORAGE_KEYS.THEME]: 'light',
  [STORAGE_KEYS.SIDEBAR_COLLAPSED]: false,
  [STORAGE_KEYS.LANGUAGE]: 'en',
  [STORAGE_KEYS.FILTERS]: {},
  [STORAGE_KEYS.LAST_VISITED]: '/',
  [STORAGE_KEYS.NOTIFICATIONS_READ]: [],
  [STORAGE_KEYS.TABLE_PAGE_SIZE]: 10,
};

/**
 * Sentinel key used to detect whether storage has been initialized
 * @type {string}
 */
const INITIALIZED_KEY = 'kp_etsip_initialized';

/**
 * Checks whether localStorage is available in the current environment.
 * @returns {boolean} True if localStorage is accessible
 */
function isStorageAvailable() {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Masks PII fields in an object for safe debug output.
 * Recursively traverses objects and arrays.
 * @param {*} value - The value to mask
 * @returns {*} A copy of the value with PII fields masked
 */
export function maskPII(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskPII(item));
  }

  if (typeof value === 'object') {
    const masked = {};
    for (const key of Object.keys(value)) {
      if (PII_FIELDS.has(key)) {
        const raw = value[key];
        if (typeof raw === 'string' && raw.length > 0) {
          masked[key] = raw.charAt(0) + '***' + (raw.length > 1 ? raw.charAt(raw.length - 1) : '');
        } else {
          masked[key] = '***';
        }
      } else {
        masked[key] = maskPII(value[key]);
      }
    }
    return masked;
  }

  return value;
}

/**
 * Retrieves a value from localStorage by key, with JSON parsing.
 * Returns the provided defaultValue (or the seeded default) if the key
 * is missing or the stored data is corrupted.
 * @param {string} key - The storage key
 * @param {*} [defaultValue] - Fallback value if key is not found or data is corrupted
 * @returns {*} The parsed value or the default
 */
export function getItem(key, defaultValue) {
  const fallback = defaultValue !== undefined ? defaultValue : (STORAGE_DEFAULTS[key] !== undefined ? STORAGE_DEFAULTS[key] : null);

  if (!isStorageAvailable()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    // Data is corrupted — reset to default
    try {
      if (fallback !== null && fallback !== undefined) {
        window.localStorage.setItem(key, JSON.stringify(fallback));
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage may be full or inaccessible; silently ignore
    }
    return fallback;
  }
}

/**
 * Stores a value in localStorage with JSON stringification.
 * Handles quota exceeded errors by attempting to clear expired/non-essential
 * data and retrying once.
 * @param {string} key - The storage key
 * @param {*} value - The value to store (will be JSON-stringified)
 * @returns {boolean} True if the value was stored successfully
 */
export function setItem(key, value) {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    if (error && (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014)) {
      // Attempt to free space by removing non-essential keys
      const nonEssentialKeys = [
        STORAGE_KEYS.FILTERS,
        STORAGE_KEYS.LAST_VISITED,
        STORAGE_KEYS.NOTIFICATIONS_READ,
      ];

      for (const nKey of nonEssentialKeys) {
        try {
          window.localStorage.removeItem(nKey);
        } catch {
          // Ignore removal errors
        }
      }

      // Retry once
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

/**
 * Removes a value from localStorage by key.
 * @param {string} key - The storage key to remove
 * @returns {boolean} True if the operation succeeded
 */
export function removeItem(key) {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears all KP-ETSIP related keys from localStorage.
 * Only removes keys that start with 'kp_etsip_'.
 * @returns {boolean} True if the operation succeeded
 */
export function clearAll() {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('kp_etsip_')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Seeds default mock data into localStorage on first load.
 * Checks for the initialized sentinel key; if present, does nothing.
 * Each default key is only written if it does not already exist.
 * @returns {boolean} True if initialization was performed, false if already initialized or unavailable
 */
export function initializeStorage() {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    const alreadyInitialized = window.localStorage.getItem(INITIALIZED_KEY);
    if (alreadyInitialized === 'true') {
      return false;
    }

    for (const [key, defaultValue] of Object.entries(STORAGE_DEFAULTS)) {
      const existing = window.localStorage.getItem(key);
      if (existing === null) {
        window.localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    }

    window.localStorage.setItem(INITIALIZED_KEY, JSON.stringify('true'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a debug-safe snapshot of all KP-ETSIP storage entries
 * with PII fields masked.
 * @returns {Object.<string, *>} Masked storage snapshot
 */
export function getDebugSnapshot() {
  if (!isStorageAvailable()) {
    return {};
  }

  const snapshot = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('kp_etsip_')) {
        try {
          const raw = window.localStorage.getItem(key);
          const parsed = raw !== null ? JSON.parse(raw) : null;
          snapshot[key] = maskPII(parsed);
        } catch {
          snapshot[key] = '[corrupted]';
        }
      }
    }
  } catch {
    // Ignore iteration errors
  }
  return snapshot;
}

/**
 * Resets a specific storage key back to its default value.
 * @param {string} key - The storage key to reset
 * @returns {boolean} True if the key was reset successfully
 */
export function resetItem(key) {
  const defaultValue = STORAGE_DEFAULTS[key];
  if (defaultValue !== undefined) {
    return setItem(key, defaultValue);
  }
  return removeItem(key);
}

/**
 * Resets all storage keys to their default values and re-initializes.
 * @returns {boolean} True if the reset was successful
 */
export function resetAll() {
  const cleared = clearAll();
  if (!cleared) {
    return false;
  }

  try {
    // Remove the initialized sentinel so initializeStorage will re-seed
    window.localStorage.removeItem(INITIALIZED_KEY);
  } catch {
    // Ignore
  }

  return initializeStorage();
}
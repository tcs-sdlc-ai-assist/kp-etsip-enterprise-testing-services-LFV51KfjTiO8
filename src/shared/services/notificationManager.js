/**
 * Notification Management Service (NotificationManager)
 * Manages notification state, preferences, and simulated delivery channels.
 * Implements LLD NotificationManager interface with localStorage persistence.
 * @module notificationManager
 */

import { getItem, setItem } from './storage.js';
import { getSession } from './authManager.js';
import { getUserById } from './userManager.js';
import mockNotifications from '../data/mockNotifications.js';

/**
 * localStorage key for notification entries
 * @type {string}
 */
const NOTIFICATIONS_STORAGE_KEY = 'kp_etsip_notifications';

/**
 * localStorage key for notification preferences (per-user map)
 * @type {string}
 */
const NOTIFICATION_PREFS_STORAGE_KEY = 'kp_etsip_notification_prefs';

/**
 * Maximum number of notification entries to retain in localStorage
 * @type {number}
 */
const MAX_NOTIFICATION_ENTRIES = 500;

/**
 * Simulated network delay in milliseconds from environment config.
 * @type {number}
 */
const MOCK_DELAY_MS = parseInt(import.meta.env.VITE_MOCK_DELAY_MS || '300', 10);

/**
 * Returns a promise that resolves after the configured mock delay.
 * @returns {Promise<void>}
 */
function simulateDelay() {
  if (MOCK_DELAY_MS <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

/**
 * Loads notifications from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockNotifications.js').MockNotification[]} Array of notification entries
 */
function loadNotifications() {
  let notifications = getItem(NOTIFICATIONS_STORAGE_KEY, null);
  if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
    notifications = JSON.parse(JSON.stringify(mockNotifications));
    setItem(NOTIFICATIONS_STORAGE_KEY, notifications);
  }
  return notifications;
}

/**
 * Persists the notifications array to localStorage.
 * @param {import('../data/mockNotifications.js').MockNotification[]} notifications - Array of notification entries
 * @returns {boolean} True if persisted successfully
 */
function saveNotifications(notifications) {
  return setItem(NOTIFICATIONS_STORAGE_KEY, notifications);
}

/**
 * Loads notification preferences map from localStorage.
 * @returns {Object.<string, {email: boolean, teams: boolean, inApp: boolean}>} Map of userId to preferences
 */
function loadPreferences() {
  let prefs = getItem(NOTIFICATION_PREFS_STORAGE_KEY, null);
  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) {
    prefs = {};
    setItem(NOTIFICATION_PREFS_STORAGE_KEY, prefs);
  }
  return prefs;
}

/**
 * Persists the notification preferences map to localStorage.
 * @param {Object.<string, {email: boolean, teams: boolean, inApp: boolean}>} prefs - Preferences map
 * @returns {boolean} True if persisted successfully
 */
function savePreferences(prefs) {
  return setItem(NOTIFICATION_PREFS_STORAGE_KEY, prefs);
}

/**
 * Generates the next unique notification id based on existing notifications.
 * @param {import('../data/mockNotifications.js').MockNotification[]} notifications - Current notifications array
 * @returns {string} Next notification id (e.g., 'notif-056')
 */
function generateNextNotificationId(notifications) {
  let maxNum = 0;
  for (const notif of notifications) {
    const match = notif.id.match(/^notif-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `notif-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Retrieves all notifications for a given user, filtered by their role.
 * If no userId is provided, uses the current session user.
 * Results are returned in reverse chronological order (newest first).
 *
 * @param {string} [userId] - The user id to retrieve notifications for
 * @returns {Promise<import('../data/mockNotifications.js').MockNotification[]>} Array of notifications for the user
 */
export async function getNotifications(userId) {
  await simulateDelay();

  let targetUserId = userId;
  let targetRole = null;
  let targetEmail = null;

  if (!targetUserId) {
    const session = getSession();
    if (session) {
      targetUserId = session.userId;
      targetRole = session.role;
      targetEmail = session.email;
    }
  }

  if (targetUserId && !targetRole) {
    const user = getUserById(targetUserId);
    if (user) {
      targetRole = user.role;
      targetEmail = user.email;
    }
  }

  const notifications = loadNotifications();

  let filtered = notifications;

  if (targetRole) {
    filtered = notifications.filter((notif) => {
      if (notif.recipientRole === targetRole) {
        return true;
      }
      if (targetEmail && notif.recipientEmail === targetEmail) {
        return true;
      }
      return false;
    });
  }

  filtered.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });

  return filtered;
}

/**
 * Retrieves all notifications without filtering by user.
 * Results are returned in reverse chronological order (newest first).
 *
 * @returns {import('../data/mockNotifications.js').MockNotification[]} Array of all notifications
 */
export function getAllNotifications() {
  const notifications = loadNotifications();
  notifications.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });
  return notifications;
}

/**
 * Retrieves a single notification by its id.
 *
 * @param {string} notificationId - The notification id
 * @returns {import('../data/mockNotifications.js').MockNotification|null} The notification or null if not found
 */
export function getNotificationById(notificationId) {
  if (!notificationId) {
    return null;
  }
  const notifications = loadNotifications();
  return notifications.find((n) => n.id === notificationId) || null;
}

/**
 * Marks a notification as read.
 *
 * @param {string} notificationId - The notification id to mark as read
 * @returns {Promise<import('../data/mockNotifications.js').MockNotification|null>} The updated notification or null if not found
 */
export async function markAsRead(notificationId) {
  await simulateDelay();

  if (!notificationId) {
    return null;
  }

  const notifications = loadNotifications();
  const index = notifications.findIndex((n) => n.id === notificationId);

  if (index === -1) {
    return null;
  }

  notifications[index] = { ...notifications[index], read: true };
  saveNotifications(notifications);

  return notifications[index];
}

/**
 * Marks a notification as unread.
 *
 * @param {string} notificationId - The notification id to mark as unread
 * @returns {import('../data/mockNotifications.js').MockNotification|null} The updated notification or null if not found
 */
export function markAsUnread(notificationId) {
  if (!notificationId) {
    return null;
  }

  const notifications = loadNotifications();
  const index = notifications.findIndex((n) => n.id === notificationId);

  if (index === -1) {
    return null;
  }

  notifications[index] = { ...notifications[index], read: false };
  saveNotifications(notifications);

  return notifications[index];
}

/**
 * Marks all notifications for a given user role as read.
 *
 * @param {string} [userId] - The user id (uses current session if not provided)
 * @returns {Promise<number>} The number of notifications marked as read
 */
export async function markAllAsRead(userId) {
  await simulateDelay();

  let targetRole = null;
  let targetEmail = null;

  if (userId) {
    const user = getUserById(userId);
    if (user) {
      targetRole = user.role;
      targetEmail = user.email;
    }
  } else {
    const session = getSession();
    if (session) {
      targetRole = session.role;
      targetEmail = session.email;
    }
  }

  if (!targetRole) {
    return 0;
  }

  const notifications = loadNotifications();
  let count = 0;

  for (let i = 0; i < notifications.length; i++) {
    const notif = notifications[i];
    const isMatch = notif.recipientRole === targetRole ||
      (targetEmail && notif.recipientEmail === targetEmail);

    if (isMatch && !notif.read) {
      notifications[i] = { ...notif, read: true };
      count++;
    }
  }

  if (count > 0) {
    saveNotifications(notifications);
  }

  return count;
}

/**
 * Returns the count of unread notifications for a given user.
 *
 * @param {string} [userId] - The user id (uses current session if not provided)
 * @returns {Promise<number>} The count of unread notifications
 */
export async function getUnreadCount(userId) {
  const notifications = await getNotifications(userId);
  return notifications.filter((n) => !n.read).length;
}

/**
 * Returns the count of unread notifications synchronously for a given role.
 *
 * @param {string} role - The role key
 * @returns {number} The count of unread notifications
 */
export function getUnreadCountByRole(role) {
  if (!role) {
    return 0;
  }
  const notifications = loadNotifications();
  return notifications.filter((n) => n.recipientRole === role && !n.read).length;
}

/**
 * Retrieves notification preferences for a given user.
 * If no preferences are stored, returns the user's preferences from the user repository,
 * or defaults if the user is not found.
 *
 * @param {string} userId - The user id
 * @returns {{email: boolean, teams: boolean, inApp: boolean}} Notification preferences
 */
export function getPreferences(userId) {
  if (!userId) {
    const session = getSession();
    if (session) {
      userId = session.userId;
    }
  }

  const defaultPrefs = { email: true, teams: false, inApp: true };

  if (!userId) {
    return defaultPrefs;
  }

  const prefsMap = loadPreferences();

  if (prefsMap[userId]) {
    return { ...defaultPrefs, ...prefsMap[userId] };
  }

  // Fall back to user repository preferences
  const user = getUserById(userId);
  if (user && user.notificationPrefs) {
    return {
      email: typeof user.notificationPrefs.email === 'boolean' ? user.notificationPrefs.email : defaultPrefs.email,
      teams: typeof user.notificationPrefs.teams === 'boolean' ? user.notificationPrefs.teams : defaultPrefs.teams,
      inApp: typeof user.notificationPrefs.inApp === 'boolean' ? user.notificationPrefs.inApp : defaultPrefs.inApp,
    };
  }

  return defaultPrefs;
}

/**
 * Updates notification preferences for a given user.
 *
 * @param {string} userId - The user id
 * @param {{email?: boolean, teams?: boolean, inApp?: boolean}} prefs - Partial preferences to update
 * @returns {Promise<{email: boolean, teams: boolean, inApp: boolean}>} The updated preferences
 * @throws {Error} If userId is not provided
 */
export async function updatePreferences(userId, prefs) {
  await simulateDelay();

  if (!userId) {
    throw new Error('User ID is required to update notification preferences.');
  }

  if (!prefs || typeof prefs !== 'object') {
    throw new Error('Preferences must be a non-null object.');
  }

  const prefsMap = loadPreferences();
  const currentPrefs = getPreferences(userId);

  const updatedPrefs = {
    email: typeof prefs.email === 'boolean' ? prefs.email : currentPrefs.email,
    teams: typeof prefs.teams === 'boolean' ? prefs.teams : currentPrefs.teams,
    inApp: typeof prefs.inApp === 'boolean' ? prefs.inApp : currentPrefs.inApp,
  };

  prefsMap[userId] = updatedPrefs;
  savePreferences(prefsMap);

  return updatedPrefs;
}

/**
 * Adds a new notification to the repository.
 *
 * @param {Object} notification - The notification object to add
 * @param {string} notification.title - Notification title
 * @param {string} notification.message - Notification message body
 * @param {string} notification.recipientRole - Target role for the notification
 * @param {string} [notification.type] - Notification type: 'InApp' | 'Email' | 'Teams' (defaults to 'InApp')
 * @param {string} [notification.category] - Notification category: 'Execution' | 'Release' | 'Governance' | 'System' (defaults to 'System')
 * @param {string} [notification.recipientName] - Name of the recipient (fake PII)
 * @param {string} [notification.recipientEmail] - Email of the recipient (fake PII)
 * @param {string} [notification.link] - Optional link/path associated with the notification
 * @param {boolean} [notification.read] - Whether the notification is read (defaults to false)
 * @returns {import('../data/mockNotifications.js').MockNotification} The created notification
 * @throws {Error} If required fields are missing
 */
export function addNotification(notification) {
  if (!notification || typeof notification !== 'object') {
    throw new Error('Notification must be a non-null object.');
  }

  if (!notification.title || typeof notification.title !== 'string') {
    throw new Error('Notification title is required and must be a string.');
  }

  if (!notification.message || typeof notification.message !== 'string') {
    throw new Error('Notification message is required and must be a string.');
  }

  if (!notification.recipientRole || typeof notification.recipientRole !== 'string') {
    throw new Error('Notification recipientRole is required and must be a string.');
  }

  const notifications = loadNotifications();

  const newNotification = {
    id: generateNextNotificationId(notifications),
    type: notification.type || 'InApp',
    title: notification.title,
    message: notification.message,
    timestamp: notification.timestamp || new Date().toISOString(),
    read: typeof notification.read === 'boolean' ? notification.read : false,
    recipientRole: notification.recipientRole,
    category: notification.category || 'System',
  };

  if (notification.recipientName) {
    newNotification.recipientName = notification.recipientName;
  }

  if (notification.recipientEmail) {
    newNotification.recipientEmail = notification.recipientEmail;
  }

  if (notification.link) {
    newNotification.link = notification.link;
  }

  notifications.unshift(newNotification);

  // Enforce maximum notification entries
  if (notifications.length > MAX_NOTIFICATION_ENTRIES) {
    notifications.length = MAX_NOTIFICATION_ENTRIES;
  }

  saveNotifications(notifications);

  // Simulate delivery based on preferences
  simulateDelivery(newNotification);

  return newNotification;
}

/**
 * Simulates notification delivery across channels based on recipient preferences.
 * This is a no-op in the mock implementation but logs delivery simulation.
 *
 * @param {import('../data/mockNotifications.js').MockNotification} notification - The notification to deliver
 */
function simulateDelivery(notification) {
  if (!notification || !notification.recipientRole) {
    return;
  }

  // In a real implementation, this would send emails, Teams messages, etc.
  // For the mock, we simply ensure the notification is stored (already done by addNotification).
  // The notification type field indicates the intended delivery channel.
}

/**
 * Deletes a notification by its id.
 *
 * @param {string} notificationId - The notification id to delete
 * @returns {boolean} True if the notification was deleted, false if not found
 */
export function deleteNotification(notificationId) {
  if (!notificationId) {
    return false;
  }

  const notifications = loadNotifications();
  const index = notifications.findIndex((n) => n.id === notificationId);

  if (index === -1) {
    return false;
  }

  notifications.splice(index, 1);
  saveNotifications(notifications);

  return true;
}

/**
 * Returns notifications filtered by category.
 *
 * @param {string} category - The notification category: 'Execution' | 'Release' | 'Governance' | 'System'
 * @returns {import('../data/mockNotifications.js').MockNotification[]} Array of matching notifications
 */
export function getNotificationsByCategory(category) {
  if (!category) {
    return [];
  }
  const notifications = loadNotifications();
  return notifications
    .filter((n) => n.category === category)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Returns notifications filtered by type (delivery channel).
 *
 * @param {string} type - The notification type: 'InApp' | 'Email' | 'Teams'
 * @returns {import('../data/mockNotifications.js').MockNotification[]} Array of matching notifications
 */
export function getNotificationsByType(type) {
  if (!type) {
    return [];
  }
  const notifications = loadNotifications();
  return notifications
    .filter((n) => n.type === type)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Returns the distinct notification categories present in the repository.
 *
 * @returns {string[]} Array of unique category strings
 */
export function getDistinctCategories() {
  const notifications = loadNotifications();
  const categories = new Set();
  for (const notif of notifications) {
    if (notif.category) {
      categories.add(notif.category);
    }
  }
  return Array.from(categories).sort();
}

/**
 * Returns the distinct notification types present in the repository.
 *
 * @returns {string[]} Array of unique type strings
 */
export function getDistinctTypes() {
  const notifications = loadNotifications();
  const types = new Set();
  for (const notif of notifications) {
    if (notif.type) {
      types.add(notif.type);
    }
  }
  return Array.from(types).sort();
}

/**
 * Returns a count summary of notifications grouped by category.
 *
 * @returns {Object.<string, number>} Object mapping categories to counts
 */
export function getNotificationCountByCategory() {
  const notifications = loadNotifications();
  const counts = {};
  for (const notif of notifications) {
    const cat = notif.category || 'Unknown';
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}

/**
 * Returns a count summary of notifications grouped by type.
 *
 * @returns {Object.<string, number>} Object mapping types to counts
 */
export function getNotificationCountByType() {
  const notifications = loadNotifications();
  const counts = {};
  for (const notif of notifications) {
    const type = notif.type || 'Unknown';
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

/**
 * Returns the total number of notifications.
 *
 * @returns {number} Total count of notifications
 */
export function getNotificationCount() {
  const notifications = loadNotifications();
  return notifications.length;
}

/**
 * Returns recent notifications up to the specified limit.
 *
 * @param {number} [limit=10] - Maximum number of recent entries to return
 * @returns {import('../data/mockNotifications.js').MockNotification[]} Array of recent notifications
 */
export function getRecentNotifications(limit = 10) {
  const notifications = loadNotifications();
  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return notifications.slice(0, limit);
}

/**
 * Simulates sending a notification via a specific channel.
 * In this mock implementation, it creates a notification entry with the specified type.
 *
 * @param {string} type - Delivery channel: 'InApp' | 'Email' | 'Teams'
 * @param {string} message - The notification message
 * @param {string} recipientRole - The target role
 * @param {Object} [options] - Optional additional fields
 * @param {string} [options.title] - Notification title (defaults to 'System Notification')
 * @param {string} [options.category] - Notification category (defaults to 'System')
 * @param {string} [options.recipientName] - Recipient name
 * @param {string} [options.recipientEmail] - Recipient email
 * @param {string} [options.link] - Associated link/path
 * @returns {import('../data/mockNotifications.js').MockNotification} The created notification
 */
export function simulateNotification(type, message, recipientRole, options = {}) {
  if (!type || !message || !recipientRole) {
    throw new Error('Type, message, and recipientRole are required for simulating a notification.');
  }

  return addNotification({
    type,
    title: options.title || 'System Notification',
    message,
    recipientRole,
    category: options.category || 'System',
    recipientName: options.recipientName,
    recipientEmail: options.recipientEmail,
    link: options.link,
  });
}

/**
 * Resets the notification repository to the original mock data.
 * Useful for testing or resetting the application state.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetNotifications() {
  const freshNotifications = JSON.parse(JSON.stringify(mockNotifications));
  return saveNotifications(freshNotifications);
}

/**
 * Resets the notification preferences to empty (clears all user preferences).
 *
 * @returns {boolean} True if reset was successful
 */
export function resetPreferences() {
  return savePreferences({});
}

/**
 * Resets both notifications and preferences to their initial state.
 *
 * @returns {boolean} True if both resets were successful
 */
export function resetAll() {
  const notifReset = resetNotifications();
  const prefsReset = resetPreferences();
  return notifReset && prefsReset;
}
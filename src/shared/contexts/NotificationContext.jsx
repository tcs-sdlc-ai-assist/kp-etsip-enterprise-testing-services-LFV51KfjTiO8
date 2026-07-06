/**
 * Notification Context Provider
 * Provides notification state, unread count, mark-as-read actions, and preference management
 * to the entire application via React Context.
 * Consumes notificationManager service for all notification operations.
 * @module NotificationContext
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  getNotifications,
  markAsRead as serviceMarkAsRead,
  markAllAsRead as serviceMarkAllAsRead,
  getUnreadCount,
  getPreferences,
  updatePreferences as serviceUpdatePreferences,
  addNotification as serviceAddNotification,
  deleteNotification as serviceDeleteNotification,
  getNotificationById,
  getNotificationsByCategory,
  getDistinctCategories,
  getDistinctTypes,
  resetNotifications,
  resetPreferences,
} from '../services/notificationManager.js';
import { useAuth } from './AuthContext.jsx';

/**
 * @typedef {Object} NotificationContextValue
 * @property {import('../data/mockNotifications.js').MockNotification[]} notifications - Array of notifications for the current user
 * @property {number} unreadCount - Number of unread notifications
 * @property {boolean} loading - Whether notification data is being loaded
 * @property {string|null} error - The last error message
 * @property {{email: boolean, teams: boolean, inApp: boolean}} preferences - Current user's notification preferences
 * @property {Function} markAsRead - Marks a single notification as read by id
 * @property {Function} markAllAsRead - Marks all notifications as read for the current user
 * @property {Function} refreshNotifications - Refreshes the notifications list from the service
 * @property {Function} updatePreferences - Updates notification preferences for the current user
 * @property {Function} addNotification - Adds a new notification
 * @property {Function} deleteNotification - Deletes a notification by id
 * @property {Function} clearError - Clears the current error message
 * @property {string[]} categories - Distinct notification categories
 * @property {string[]} types - Distinct notification types
 */

const NotificationContext = createContext(null);

/**
 * Custom hook to access the NotificationContext.
 * Throws an error if used outside of NotificationProvider.
 *
 * @returns {NotificationContextValue} The notification context value
 * @throws {Error} If used outside of NotificationProvider
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider.');
  }
  return context;
}

/**
 * Notification Context Provider component.
 * Wraps the application and provides notification state and actions.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} The provider component
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState({ email: true, teams: false, inApp: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);

  const { isAuthenticated, currentUser, session } = useAuth();

  /**
   * Refreshes the notifications list and unread count from the service.
   */
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userId = session ? session.userId : undefined;
      const notifs = await getNotifications(userId);
      setNotifications(notifs);

      const count = await getUnreadCount(userId);
      setUnreadCount(count);

      setCategories(getDistinctCategories());
      setTypes(getDistinctTypes());
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load notifications.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, session]);

  /**
   * Loads notification preferences for the current user.
   */
  const loadPreferences = useCallback(() => {
    if (!isAuthenticated || !session) {
      setPreferences({ email: true, teams: false, inApp: true });
      return;
    }

    try {
      const prefs = getPreferences(session.userId);
      setPreferences(prefs);
    } catch {
      setPreferences({ email: true, teams: false, inApp: true });
    }
  }, [isAuthenticated, session]);

  // Load notifications and preferences when authentication state changes
  useEffect(() => {
    refreshNotifications();
    loadPreferences();
  }, [refreshNotifications, loadPreferences]);

  /**
   * Marks a single notification as read by its id.
   *
   * @param {string} notificationId - The notification id to mark as read
   * @returns {Promise<boolean>} True if the notification was marked as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId) {
      return false;
    }

    setError(null);

    try {
      const updated = await serviceMarkAsRead(notificationId);

      if (updated) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        return true;
      }

      return false;
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to mark notification as read.';
      setError(errorMessage);
      return false;
    }
  }, []);

  /**
   * Marks all notifications as read for the current user.
   *
   * @returns {Promise<number>} The number of notifications marked as read
   */
  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated || !session) {
      return 0;
    }

    setError(null);

    try {
      const count = await serviceMarkAllAsRead(session.userId);

      if (count > 0) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }

      return count;
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to mark all notifications as read.';
      setError(errorMessage);
      return 0;
    }
  }, [isAuthenticated, session]);

  /**
   * Updates notification preferences for the current user.
   *
   * @param {Object} prefs - Partial preferences to update
   * @param {boolean} [prefs.email] - Email notifications enabled
   * @param {boolean} [prefs.teams] - Teams notifications enabled
   * @param {boolean} [prefs.inApp] - In-app notifications enabled
   * @returns {Promise<{email: boolean, teams: boolean, inApp: boolean}|null>} The updated preferences or null on error
   */
  const updatePreferences = useCallback(async (prefs) => {
    if (!isAuthenticated || !session) {
      return null;
    }

    if (!prefs || typeof prefs !== 'object') {
      setError('Preferences must be a non-null object.');
      return null;
    }

    setError(null);

    try {
      const updatedPrefs = await serviceUpdatePreferences(session.userId, prefs);
      setPreferences(updatedPrefs);
      return updatedPrefs;
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to update notification preferences.';
      setError(errorMessage);
      return null;
    }
  }, [isAuthenticated, session]);

  /**
   * Adds a new notification.
   *
   * @param {Object} notification - The notification object to add
   * @param {string} notification.title - Notification title
   * @param {string} notification.message - Notification message body
   * @param {string} notification.recipientRole - Target role for the notification
   * @param {string} [notification.type] - Notification type: 'InApp' | 'Email' | 'Teams'
   * @param {string} [notification.category] - Notification category
   * @param {string} [notification.recipientName] - Recipient name
   * @param {string} [notification.recipientEmail] - Recipient email
   * @param {string} [notification.link] - Associated link/path
   * @returns {import('../data/mockNotifications.js').MockNotification|null} The created notification or null on error
   */
  const addNotification = useCallback((notification) => {
    if (!notification || typeof notification !== 'object') {
      setError('Notification must be a non-null object.');
      return null;
    }

    setError(null);

    try {
      const created = serviceAddNotification(notification);

      // Refresh notifications to include the new one
      refreshNotifications();

      return created;
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to add notification.';
      setError(errorMessage);
      return null;
    }
  }, [refreshNotifications]);

  /**
   * Deletes a notification by its id.
   *
   * @param {string} notificationId - The notification id to delete
   * @returns {boolean} True if the notification was deleted
   */
  const deleteNotification = useCallback((notificationId) => {
    if (!notificationId) {
      return false;
    }

    setError(null);

    try {
      const deleted = serviceDeleteNotification(notificationId);

      if (deleted) {
        setNotifications((prev) => {
          const removed = prev.find((n) => n.id === notificationId);
          if (removed && !removed.read) {
            setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
          }
          return prev.filter((n) => n.id !== notificationId);
        });
        return true;
      }

      return false;
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to delete notification.';
      setError(errorMessage);
      return false;
    }
  }, []);

  /**
   * Clears the current error message.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const contextValue = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    preferences,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    updatePreferences,
    addNotification,
    deleteNotification,
    clearError,
    categories,
    types,
  }), [
    notifications,
    unreadCount,
    loading,
    error,
    preferences,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    updatePreferences,
    addNotification,
    deleteNotification,
    clearError,
    categories,
    types,
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { NotificationContext };
export default NotificationProvider;
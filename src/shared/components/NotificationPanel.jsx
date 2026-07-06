/**
 * NotificationPanel Component
 * Notification dropdown panel that displays a list of notifications with read/unread styling,
 * mark as read action, filter by category, and links to simulated email/Teams hints.
 * Consumes NotificationContext.
 * @module NotificationPanel
 */

import { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNotifications } from '../contexts/NotificationContext.jsx';

/**
 * Returns the icon SVG for a notification category.
 *
 * @param {string} category - The notification category
 * @returns {React.ReactElement} SVG icon element
 */
function CategoryIcon({ category }) {
  const baseClass = 'w-4 h-4 flex-shrink-0';

  switch (category) {
    case 'Execution':
      return (
        <svg className={`${baseClass} text-brand-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'Release':
      return (
        <svg className={`${baseClass} text-brand-green-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    case 'Governance':
      return (
        <svg className={`${baseClass} text-yellow-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case 'System':
      return (
        <svg className={`${baseClass} text-brand-gray-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return (
        <svg className={`${baseClass} text-brand-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
  }
}

CategoryIcon.propTypes = {
  category: PropTypes.string,
};

CategoryIcon.defaultProps = {
  category: '',
};

/**
 * Returns a delivery channel hint badge for the notification type.
 *
 * @param {Object} props - Component props
 * @param {string} props.type - Notification type: 'InApp' | 'Email' | 'Teams'
 * @returns {React.ReactElement} The delivery channel badge
 */
function DeliveryChannelBadge({ type }) {
  if (type === 'Email') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-brand-blue-50 text-brand-blue-700 ring-1 ring-inset ring-brand-blue-300">
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Email
      </span>
    );
  }

  if (type === 'Teams') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-300">
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Teams
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 ring-1 ring-inset ring-brand-gray-300">
      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      In-App
    </span>
  );
}

DeliveryChannelBadge.propTypes = {
  type: PropTypes.string,
};

DeliveryChannelBadge.defaultProps = {
  type: 'InApp',
};

/**
 * Formats a timestamp into a relative time string (e.g., "2 hours ago", "3 days ago").
 *
 * @param {string} timestamp - ISO 8601 timestamp
 * @returns {string} Relative time string
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return '';
  }

  try {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();

    if (isNaN(diffMs)) {
      return '';
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'Just now';
    }

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * NotificationPanel component for displaying a list of notifications with filtering,
 * read/unread styling, mark as read actions, and delivery channel hints.
 *
 * @param {Object} props - Component props
 * @param {boolean} [props.isOpen] - Whether the panel is visible
 * @param {Function} [props.onClose] - Callback when the panel is closed
 * @param {number} [props.maxItems] - Maximum number of notifications to display (defaults to 20)
 * @param {string} [props.className] - Additional CSS classes for the panel container
 * @param {Function} [props.onNotificationClick] - Callback when a notification is clicked, receives the notification object
 * @returns {React.ReactElement|null} The notification panel component or null if not open
 */
export default function NotificationPanel({
  isOpen,
  onClose,
  maxItems,
  className,
  onNotificationClick,
}) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    categories,
    clearError,
  } = useNotifications();

  const [selectedCategory, setSelectedCategory] = useState('');
  const effectiveMaxItems = maxItems || 20;

  /**
   * Filters notifications by the selected category.
   */
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (selectedCategory) {
      filtered = filtered.filter((n) => n.category === selectedCategory);
    }

    return filtered.slice(0, effectiveMaxItems);
  }, [notifications, selectedCategory, effectiveMaxItems]);

  /**
   * Handles clicking a notification item.
   * Marks it as read and invokes the onNotificationClick callback.
   *
   * @param {Object} notification - The notification object
   */
  const handleNotificationClick = useCallback(
    async (notification) => {
      if (!notification.read) {
        await markAsRead(notification.id);
      }

      if (typeof onNotificationClick === 'function') {
        onNotificationClick(notification);
      }
    },
    [markAsRead, onNotificationClick]
  );

  /**
   * Handles marking a single notification as read without navigating.
   *
   * @param {React.MouseEvent} e - The mouse event
   * @param {string} notificationId - The notification id
   */
  const handleMarkAsRead = useCallback(
    async (e, notificationId) => {
      e.stopPropagation();
      await markAsRead(notificationId);
    },
    [markAsRead]
  );

  /**
   * Handles marking all notifications as read.
   */
  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  /**
   * Handles category filter change.
   *
   * @param {string} category - The category to filter by, or empty string for all
   */
  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  /**
   * Handles keyboard interaction on notification items.
   *
   * @param {React.KeyboardEvent} e - The keyboard event
   * @param {Object} notification - The notification object
   */
  const handleNotificationKeyDown = useCallback(
    (e, notification) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNotificationClick(notification);
      }
    },
    [handleNotificationClick]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`w-full max-w-md bg-white rounded-lg shadow-xl border border-brand-gray-200 flex flex-col overflow-hidden${className ? ` ${className}` : ''}`}
      role="dialog"
      aria-label="Notifications panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-gray-200 bg-brand-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-brand-gray-900">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
              aria-label="Mark all notifications as read"
            >
              Mark all read
            </button>
          )}
          {typeof onClose === 'function' && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-brand-gray-400 hover:text-brand-gray-600 hover:bg-brand-gray-100 transition-colors"
              aria-label="Close notifications panel"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-brand-gray-200 overflow-x-auto flex-shrink-0">
        <button
          onClick={() => handleCategoryChange('')}
          className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
            selectedCategory === ''
              ? 'bg-brand-500 text-white'
              : 'bg-brand-gray-100 text-brand-gray-600 hover:bg-brand-gray-200'
          }`}
          aria-label="Show all notifications"
          aria-pressed={selectedCategory === ''}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? 'bg-brand-500 text-white'
                : 'bg-brand-gray-100 text-brand-gray-600 hover:bg-brand-gray-200'
            }`}
            aria-label={`Filter by ${category}`}
            aria-pressed={selectedCategory === category}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center justify-between px-4 py-2 bg-red-50 border-b border-red-200 flex-shrink-0">
          <p className="text-xs text-red-600">{error}</p>
          <button
            onClick={clearError}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto max-h-96" role="list" aria-label="Notification list">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-xs text-brand-gray-400">Loading notifications...</p>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <svg className="w-10 h-10 text-brand-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-sm text-brand-gray-500">
              {selectedCategory
                ? `No ${selectedCategory.toLowerCase()} notifications`
                : 'No notifications'}
            </p>
            {selectedCategory && (
              <button
                onClick={() => handleCategoryChange('')}
                className="mt-2 text-xs text-brand-500 hover:text-brand-600 font-medium"
              >
                Show all notifications
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              role="listitem"
              tabIndex={0}
              onClick={() => handleNotificationClick(notification)}
              onKeyDown={(e) => handleNotificationKeyDown(e, notification)}
              className={`flex gap-3 px-4 py-3 border-b border-brand-gray-100 cursor-pointer transition-colors ${
                notification.read
                  ? 'bg-white hover:bg-brand-gray-50'
                  : 'bg-brand-50 hover:bg-brand-100'
              }`}
              aria-label={`${notification.read ? '' : 'Unread: '}${notification.title}`}
            >
              {/* Unread indicator + category icon */}
              <div className="flex flex-col items-center gap-1 pt-0.5 flex-shrink-0">
                {!notification.read && (
                  <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" aria-hidden="true" />
                )}
                {notification.read && (
                  <span className="w-2 h-2 flex-shrink-0" aria-hidden="true" />
                )}
                <CategoryIcon category={notification.category} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm leading-tight truncate ${
                    notification.read
                      ? 'text-brand-gray-700 font-normal'
                      : 'text-brand-gray-900 font-semibold'
                  }`}>
                    {notification.title}
                  </p>
                  <span className="text-[10px] text-brand-gray-400 whitespace-nowrap flex-shrink-0 pt-0.5">
                    {formatRelativeTime(notification.timestamp)}
                  </span>
                </div>

                <p className="text-xs text-brand-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {notification.message}
                </p>

                <div className="flex items-center gap-2 mt-1.5">
                  <DeliveryChannelBadge type={notification.type} />

                  {notification.category && (
                    <span className="text-[10px] text-brand-gray-400">
                      {notification.category}
                    </span>
                  )}

                  {!notification.read && (
                    <button
                      onClick={(e) => handleMarkAsRead(e, notification.id)}
                      className="ml-auto text-[10px] font-medium text-brand-500 hover:text-brand-600 transition-colors"
                      aria-label={`Mark "${notification.title}" as read`}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-brand-gray-200 bg-brand-gray-50 flex-shrink-0">
          <p className="text-[10px] text-brand-gray-400">
            Showing {filteredNotifications.length} of {notifications.length} notifications
          </p>
          {notification.length > effectiveMaxItems && (
            <span className="text-[10px] text-brand-gray-400">
              Scroll for more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

NotificationPanel.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  maxItems: PropTypes.number,
  className: PropTypes.string,
  onNotificationClick: PropTypes.func,
};

NotificationPanel.defaultProps = {
  isOpen: false,
  onClose: undefined,
  maxItems: 20,
  className: undefined,
  onNotificationClick: undefined,
};
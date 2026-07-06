/**
 * NotificationPreferences Component
 * Notification Preferences sub-component (FR-028): embedded in MyProfile, allows configuring
 * notification channels (Email, Teams, In-App) per category (Execution, Release, Governance, System).
 * Toggle switches for each channel/category combination.
 * Uses NotificationContext.updatePreferences().
 * @module NotificationPreferences
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import { useNotifications } from '../../shared/contexts/NotificationContext.jsx';
import { logAction } from '../../shared/services/auditLogService.js';
import { getItem, setItem } from '../../shared/services/storage.js';
import StatusBadge from '../../shared/components/StatusBadge.jsx';

/**
 * localStorage key for per-category notification preferences
 * @type {string}
 */
const CATEGORY_PREFS_STORAGE_KEY = 'kp_etsip_notification_category_prefs';

/**
 * Notification categories available for configuration
 * @type {Array<{key: string, label: string, description: string, icon: Function}>}
 */
const NOTIFICATION_CATEGORIES = [
  {
    key: 'Execution',
    label: 'Execution',
    description: 'Test execution results, pass/fail notifications, flaky test alerts, and automation status updates.',
  },
  {
    key: 'Release',
    label: 'Release',
    description: 'Release deployments, quality gate outcomes, rollback alerts, and version updates.',
  },
  {
    key: 'Governance',
    label: 'Governance',
    description: 'Compliance audit results, policy updates, approval requests, and governance procedure changes.',
  },
  {
    key: 'System',
    label: 'System',
    description: 'Platform maintenance, environment status changes, integration alerts, and system health notifications.',
  },
];

/**
 * Notification channels available for configuration
 * @type {Array<{key: string, label: string, description: string}>}
 */
const NOTIFICATION_CHANNELS = [
  {
    key: 'email',
    label: 'Email',
    description: 'Receive via email',
  },
  {
    key: 'teams',
    label: 'Teams',
    description: 'Receive via Microsoft Teams',
  },
  {
    key: 'inApp',
    label: 'In-App',
    description: 'Receive within the application',
  },
];

/**
 * Default per-category preferences structure
 * @type {Object.<string, {email: boolean, teams: boolean, inApp: boolean}>}
 */
const DEFAULT_CATEGORY_PREFS = {
  Execution: { email: true, teams: false, inApp: true },
  Release: { email: true, teams: true, inApp: true },
  Governance: { email: true, teams: false, inApp: true },
  System: { email: false, teams: false, inApp: true },
};

/**
 * Loads per-category notification preferences from localStorage.
 * @param {string} userId - The user id
 * @returns {Object.<string, {email: boolean, teams: boolean, inApp: boolean}>}
 */
function loadCategoryPrefs(userId) {
  const allPrefs = getItem(CATEGORY_PREFS_STORAGE_KEY, {});
  if (allPrefs && typeof allPrefs === 'object' && !Array.isArray(allPrefs) && userId && allPrefs[userId]) {
    return { ...JSON.parse(JSON.stringify(DEFAULT_CATEGORY_PREFS)), ...allPrefs[userId] };
  }
  return JSON.parse(JSON.stringify(DEFAULT_CATEGORY_PREFS));
}

/**
 * Saves per-category notification preferences to localStorage.
 * @param {string} userId - The user id
 * @param {Object} prefs - The per-category preferences object
 * @returns {boolean}
 */
function saveCategoryPrefs(userId, prefs) {
  const allPrefs = getItem(CATEGORY_PREFS_STORAGE_KEY, {}) || {};
  allPrefs[userId] = prefs;
  return setItem(CATEGORY_PREFS_STORAGE_KEY, allPrefs);
}

/**
 * Returns the icon SVG for a notification category.
 *
 * @param {string} category - The notification category key
 * @returns {React.ReactElement} SVG icon element
 */
function CategoryIcon({ category }) {
  const baseClass = 'w-5 h-5 flex-shrink-0';

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
 * Returns the icon SVG for a notification channel.
 *
 * @param {string} channel - The notification channel key
 * @returns {React.ReactElement} SVG icon element
 */
function ChannelIcon({ channel }) {
  const baseClass = 'w-4 h-4 flex-shrink-0';

  switch (channel) {
    case 'email':
      return (
        <svg className={`${baseClass} text-brand-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'teams':
      return (
        <svg className={`${baseClass} text-purple-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'inApp':
      return (
        <svg className={`${baseClass} text-brand-green-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    default:
      return null;
  }
}

ChannelIcon.propTypes = {
  channel: PropTypes.string,
};

ChannelIcon.defaultProps = {
  channel: '',
};

/**
 * NotificationPreferences component for configuring notification channels per category.
 * Embedded in MyProfile, allows toggling Email, Teams, and In-App notifications
 * for each notification category (Execution, Release, Governance, System).
 *
 * @param {Object} props - Component props
 * @param {string} [props.className] - Additional CSS classes for the container
 * @returns {React.ReactElement} The notification preferences component
 */
export default function NotificationPreferences({ className }) {
  const { currentUser, isAuthenticated, session } = useAuth();
  const { preferences: globalPrefs, updatePreferences: updateGlobalPrefs } = useNotifications();

  const [categoryPrefs, setCategoryPrefs] = useState(() => {
    return JSON.parse(JSON.stringify(DEFAULT_CATEGORY_PREFS));
  });
  const [globalChannels, setGlobalChannels] = useState({ email: true, teams: false, inApp: true });
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * Derives the user id from the current session or user.
   */
  const userId = useMemo(() => {
    if (currentUser && currentUser.id) {
      return currentUser.id;
    }
    if (session && session.userId) {
      return session.userId;
    }
    return '';
  }, [currentUser, session]);

  /**
   * Loads preferences on mount.
   */
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setLoading(false);
      return;
    }

    try {
      const savedCategoryPrefs = loadCategoryPrefs(userId);
      setCategoryPrefs(savedCategoryPrefs);

      if (globalPrefs) {
        setGlobalChannels({
          email: typeof globalPrefs.email === 'boolean' ? globalPrefs.email : true,
          teams: typeof globalPrefs.teams === 'boolean' ? globalPrefs.teams : false,
          inApp: typeof globalPrefs.inApp === 'boolean' ? globalPrefs.inApp : true,
        });
      }
    } catch {
      // Ignore errors during preference load
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, userId, globalPrefs]);

  /**
   * Clears feedback messages after a timeout.
   */
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  /**
   * Handles toggling a global channel preference.
   *
   * @param {string} channel - The channel key: 'email' | 'teams' | 'inApp'
   * @param {boolean} value - The new value
   */
  const handleGlobalChannelToggle = useCallback((channel, value) => {
    setGlobalChannels((prev) => ({
      ...prev,
      [channel]: value,
    }));

    // Also update all category preferences for this channel
    setCategoryPrefs((prev) => {
      const updated = { ...prev };
      for (const catKey of Object.keys(updated)) {
        updated[catKey] = {
          ...updated[catKey],
          [channel]: value,
        };
      }
      return updated;
    });
  }, []);

  /**
   * Handles toggling a per-category channel preference.
   *
   * @param {string} category - The category key
   * @param {string} channel - The channel key: 'email' | 'teams' | 'inApp'
   * @param {boolean} value - The new value
   */
  const handleCategoryChannelToggle = useCallback((category, channel, value) => {
    setCategoryPrefs((prev) => {
      const updated = { ...prev };
      if (!updated[category]) {
        updated[category] = { email: true, teams: false, inApp: true };
      }
      updated[category] = {
        ...updated[category],
        [channel]: value,
      };
      return updated;
    });
  }, []);

  /**
   * Handles saving all notification preferences.
   */
  const handleSave = useCallback(async () => {
    if (!userId) {
      setFeedback({ type: 'error', message: 'Unable to identify current user.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      // Save global channel preferences via NotificationContext
      const globalResult = await updateGlobalPrefs(globalChannels);

      // Save per-category preferences to localStorage
      saveCategoryPrefs(userId, categoryPrefs);

      try {
        const enabledCategories = Object.entries(categoryPrefs)
          .filter(([, prefs]) => prefs.email || prefs.teams || prefs.inApp)
          .map(([cat]) => cat);

        logAction(
          'update',
          `Notification preferences updated. Global channels: Email=${globalChannels.email}, Teams=${globalChannels.teams}, In-App=${globalChannels.inApp}. Active categories: ${enabledCategories.join(', ')}.`,
          'User',
          userId,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setFeedback({ type: 'success', message: 'Notification preferences saved successfully.' });
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to save notification preferences.';
      setFeedback({ type: 'error', message: errorMessage });
    } finally {
      setSubmitting(false);
    }
  }, [globalChannels, categoryPrefs, userId, updateGlobalPrefs]);

  /**
   * Handles resetting all preferences to defaults.
   */
  const handleReset = useCallback(() => {
    setGlobalChannels({ email: true, teams: false, inApp: true });
    setCategoryPrefs(JSON.parse(JSON.stringify(DEFAULT_CATEGORY_PREFS)));
    setFeedback({ type: 'success', message: 'Preferences reset to defaults. Click "Save Preferences" to persist.' });
  }, []);

  /**
   * Computes summary statistics for the current preferences.
   */
  const preferenceSummary = useMemo(() => {
    let enabledCount = 0;
    let totalCount = 0;

    for (const catKey of Object.keys(categoryPrefs)) {
      for (const chKey of Object.keys(categoryPrefs[catKey])) {
        totalCount++;
        if (categoryPrefs[catKey][chKey]) {
          enabledCount++;
        }
      }
    }

    return {
      enabledCount,
      totalCount,
      percentage: totalCount > 0 ? Math.round((enabledCount / totalCount) * 100) : 0,
    };
  }, [categoryPrefs]);

  /**
   * Checks if a global channel is fully enabled across all categories.
   *
   * @param {string} channel - The channel key
   * @returns {'all' | 'some' | 'none'}
   */
  const getChannelStatus = useCallback((channel) => {
    const categories = Object.keys(categoryPrefs);
    if (categories.length === 0) {
      return 'none';
    }

    let enabledCount = 0;
    for (const catKey of categories) {
      if (categoryPrefs[catKey] && categoryPrefs[catKey][channel]) {
        enabledCount++;
      }
    }

    if (enabledCount === categories.length) {
      return 'all';
    }
    if (enabledCount > 0) {
      return 'some';
    }
    return 'none';
  }, [categoryPrefs]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12${className ? ` ${className}` : ''}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-xs text-brand-gray-400">Loading notification preferences...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !userId) {
    return (
      <div className={`flex items-center justify-center py-12 text-sm text-brand-gray-500${className ? ` ${className}` : ''}`}>
        Please log in to manage notification preferences.
      </div>
    );
  }

  return (
    <div className={`space-y-6${className ? ` ${className}` : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-brand-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <h2 className="text-lg font-semibold text-brand-gray-900">
            Notification Preferences
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({preferenceSummary.enabledCount} of {preferenceSummary.totalCount} enabled)
          </span>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Reset to Defaults</span>
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`flex items-start gap-2 px-4 py-3 rounded-lg border ${
            feedback.type === 'success'
              ? 'bg-brand-green-50 border-brand-green-200'
              : 'bg-red-50 border-red-200'
          }`}
          role="alert"
        >
          {feedback.type === 'success' ? (
            <svg className="w-4 h-4 text-brand-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <p className={`text-sm ${feedback.type === 'success' ? 'text-brand-green-700' : 'text-red-700'}`}>
            {feedback.message}
          </p>
        </div>
      )}

      {/* Simulated Note */}
      <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
        <svg className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-yellow-700">
          Notification delivery is simulated. In a production environment, toggling these channels would control actual email, Microsoft Teams, and in-app notification delivery.
        </p>
      </div>

      {/* Global Channel Toggles */}
      <div className="bg-white rounded-lg border border-brand-gray-200 p-4">
        <h3 className="text-sm font-semibold text-brand-gray-900 mb-3">
          Global Channel Settings
        </h3>
        <p className="text-xs text-brand-gray-500 mb-4">
          Toggle a channel globally to enable or disable it across all notification categories at once.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {NOTIFICATION_CHANNELS.map((channel) => {
            const channelStatus = getChannelStatus(channel.key);
            const isFullyEnabled = channelStatus === 'all';
            const isPartiallyEnabled = channelStatus === 'some';

            return (
              <div
                key={channel.key}
                className={`flex items-center justify-between rounded-lg p-3 border transition-colors ${
                  isFullyEnabled
                    ? 'bg-brand-50 border-brand-200'
                    : isPartiallyEnabled
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-brand-gray-50 border-brand-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ChannelIcon channel={channel.key} />
                  <div>
                    <p className="text-sm font-medium text-brand-gray-900">{channel.label}</p>
                    <p className="text-[10px] text-brand-gray-500">{channel.description}</p>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalChannels[channel.key]}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = isPartiallyEnabled && !isFullyEnabled;
                      }
                    }}
                    onChange={(e) => handleGlobalChannelToggle(channel.key, e.target.checked)}
                    className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                    disabled={submitting}
                    aria-label={`Toggle ${channel.label} notifications globally`}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-Category Channel Matrix */}
      <div className="bg-white rounded-lg border border-brand-gray-200 p-4">
        <h3 className="text-sm font-semibold text-brand-gray-900 mb-3">
          Per-Category Channel Configuration
        </h3>
        <p className="text-xs text-brand-gray-500 mb-4">
          Fine-tune which notification channels are active for each category. Override global settings for specific categories.
        </p>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-gray-200">
            <thead className="bg-brand-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-brand-gray-600 uppercase tracking-wider">
                  Category
                </th>
                {NOTIFICATION_CHANNELS.map((channel) => (
                  <th
                    key={channel.key}
                    scope="col"
                    className="px-4 py-3 text-center text-xs font-semibold text-brand-gray-600 uppercase tracking-wider"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <ChannelIcon channel={channel.key} />
                      <span>{channel.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-gray-200">
              {NOTIFICATION_CATEGORIES.map((category, index) => (
                <tr
                  key={category.key}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-brand-gray-50'}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon category={category.key} />
                      <div>
                        <p className="text-sm font-medium text-brand-gray-900">{category.label}</p>
                        <p className="text-[10px] text-brand-gray-500 leading-relaxed max-w-xs">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  {NOTIFICATION_CHANNELS.map((channel) => {
                    const isEnabled = categoryPrefs[category.key] && categoryPrefs[category.key][channel.key];

                    return (
                      <td key={channel.key} className="px-4 py-3 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled || false}
                            onChange={(e) => handleCategoryChannelToggle(category.key, channel.key, e.target.checked)}
                            className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                            disabled={submitting}
                            aria-label={`Toggle ${channel.label} for ${category.label} notifications`}
                          />
                          <span className="ml-1.5 text-xs text-brand-gray-500">
                            {isEnabled ? 'On' : 'Off'}
                          </span>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-4">
          {NOTIFICATION_CATEGORIES.map((category) => (
            <div
              key={category.key}
              className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <CategoryIcon category={category.key} />
                <div>
                  <p className="text-sm font-medium text-brand-gray-900">{category.label}</p>
                  <p className="text-[10px] text-brand-gray-500 leading-relaxed">
                    {category.description}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {NOTIFICATION_CHANNELS.map((channel) => {
                  const isEnabled = categoryPrefs[category.key] && categoryPrefs[category.key][channel.key];

                  return (
                    <div
                      key={channel.key}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <ChannelIcon channel={channel.key} />
                        <span className="text-sm text-brand-gray-700">{channel.label}</span>
                      </div>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEnabled || false}
                          onChange={(e) => handleCategoryChannelToggle(category.key, channel.key, e.target.checked)}
                          className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                          disabled={submitting}
                          aria-label={`Toggle ${channel.label} for ${category.label} notifications`}
                        />
                        <span className="ml-1.5 text-xs text-brand-gray-500">
                          {isEnabled ? 'On' : 'Off'}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
          Preference Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {NOTIFICATION_CATEGORIES.map((category) => {
            const prefs = categoryPrefs[category.key] || {};
            const activeChannels = NOTIFICATION_CHANNELS.filter((ch) => prefs[ch.key]).map((ch) => ch.label);

            return (
              <div
                key={category.key}
                className="bg-white rounded-lg p-3 border border-brand-gray-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CategoryIcon category={category.key} />
                  <p className="text-sm font-medium text-brand-gray-900">{category.label}</p>
                </div>
                {activeChannels.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {activeChannels.map((ch) => (
                      <span
                        key={ch}
                        className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-brand-green-50 text-brand-green-700 ring-1 ring-inset ring-brand-green-300"
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-brand-gray-400">No channels enabled</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-brand-gray-200">
          <div className="flex-1 h-2 bg-brand-gray-200 rounded-full">
            <div
              className={`h-2 rounded-full ${
                preferenceSummary.percentage >= 70
                  ? 'bg-brand-green-500'
                  : preferenceSummary.percentage >= 40
                  ? 'bg-yellow-500'
                  : 'bg-brand-gray-400'
              }`}
              style={{ width: `${Math.min(preferenceSummary.percentage, 100)}%` }}
            />
          </div>
          <span className="text-xs text-brand-gray-600 flex-shrink-0">
            {preferenceSummary.percentage}% coverage
          </span>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end pt-4 border-t border-brand-gray-200">
        <button
          onClick={handleSave}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Save Preferences</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

NotificationPreferences.propTypes = {
  className: PropTypes.string,
};

NotificationPreferences.defaultProps = {
  className: undefined,
};
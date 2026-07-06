/**
 * MyProfile Component
 * My Profile screen (FR-027): displays current user profile (name, email, role, portfolio,
 * application access), editable preferences (notification channels, dashboard layout, theme),
 * and dashboard widget configuration. All changes persisted to localStorage.
 * Uses AuthContext for current user.
 * @module MyProfile
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import { useNotifications } from '../../shared/contexts/NotificationContext.jsx';
import { getUserById } from '../../shared/services/userManager.js';
import { getItem, setItem } from '../../shared/services/storage.js';
import { logAction } from '../../shared/services/auditLogService.js';
import { ROLE_LABELS } from '../../shared/constants.js';
import MetricCard from '../../shared/components/MetricCard.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import LoadingSpinner from '../../shared/components/LoadingSpinner.jsx';
import EmptyState from '../../shared/components/EmptyState.jsx';

/**
 * localStorage key for user profile preferences
 * @type {string}
 */
const PROFILE_PREFS_STORAGE_KEY = 'kp_etsip_profile_prefs';

/**
 * localStorage key for dashboard widget configuration
 * @type {string}
 */
const DASHBOARD_WIDGETS_STORAGE_KEY = 'kp_etsip_dashboard_widgets';

/**
 * Default dashboard widgets configuration
 * @type {Array<{id: string, label: string, enabled: boolean, order: number}>}
 */
const DEFAULT_DASHBOARD_WIDGETS = [
  { id: 'quality-score', label: 'Quality Score', enabled: true, order: 1 },
  { id: 'test-coverage', label: 'Test Coverage', enabled: true, order: 2 },
  { id: 'automation-rate', label: 'Automation Rate', enabled: true, order: 3 },
  { id: 'defect-density', label: 'Defect Density', enabled: true, order: 4 },
  { id: 'release-success', label: 'Release Success Rate', enabled: true, order: 5 },
  { id: 'open-defects', label: 'Open Defects', enabled: true, order: 6 },
  { id: 'pending-approvals', label: 'Pending Approvals', enabled: true, order: 7 },
  { id: 'environment-uptime', label: 'Environment Uptime', enabled: false, order: 8 },
  { id: 'recent-executions', label: 'Recent Executions', enabled: false, order: 9 },
  { id: 'governance-compliance', label: 'Governance Compliance', enabled: false, order: 10 },
  { id: 'adoption-rate', label: 'Adoption Rate', enabled: false, order: 11 },
  { id: 'ai-insights', label: 'AI Insights Summary', enabled: false, order: 12 },
];

/**
 * Default profile preferences
 * @type {{theme: string, dashboardLayout: string, dateFormat: string, language: string, compactMode: boolean}}
 */
const DEFAULT_PROFILE_PREFS = {
  theme: 'light',
  dashboardLayout: 'default',
  dateFormat: 'YYYY-MM-DD',
  language: 'en',
  compactMode: false,
};

/**
 * Returns a human-readable label for a role key.
 *
 * @param {string} role - The role key
 * @returns {string} Human-readable role label
 */
function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || 'Unknown';
}

/**
 * Formats a date string for display.
 *
 * @param {string} dateStr - ISO 8601 date string
 * @returns {string} Formatted date string
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) {
    return '';
  }
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Formats a date string for display with time.
 *
 * @param {string} dateStr - ISO 8601 date string
 * @returns {string} Formatted date/time string
 */
function formatDisplayDateTime(dateStr) {
  if (!dateStr) {
    return '';
  }
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Loads profile preferences from localStorage.
 * @param {string} userId - The user id
 * @returns {{theme: string, dashboardLayout: string, dateFormat: string, language: string, compactMode: boolean}}
 */
function loadProfilePrefs(userId) {
  const allPrefs = getItem(PROFILE_PREFS_STORAGE_KEY, {});
  if (allPrefs && typeof allPrefs === 'object' && !Array.isArray(allPrefs) && userId && allPrefs[userId]) {
    return { ...DEFAULT_PROFILE_PREFS, ...allPrefs[userId] };
  }
  return { ...DEFAULT_PROFILE_PREFS };
}

/**
 * Saves profile preferences to localStorage.
 * @param {string} userId - The user id
 * @param {Object} prefs - The preferences object
 * @returns {boolean}
 */
function saveProfilePrefs(userId, prefs) {
  const allPrefs = getItem(PROFILE_PREFS_STORAGE_KEY, {}) || {};
  allPrefs[userId] = prefs;
  return setItem(PROFILE_PREFS_STORAGE_KEY, allPrefs);
}

/**
 * Loads dashboard widget configuration from localStorage.
 * @param {string} userId - The user id
 * @returns {Array<{id: string, label: string, enabled: boolean, order: number}>}
 */
function loadDashboardWidgets(userId) {
  const allWidgets = getItem(DASHBOARD_WIDGETS_STORAGE_KEY, {});
  if (allWidgets && typeof allWidgets === 'object' && !Array.isArray(allWidgets) && userId && allWidgets[userId]) {
    return allWidgets[userId];
  }
  return JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_WIDGETS));
}

/**
 * Saves dashboard widget configuration to localStorage.
 * @param {string} userId - The user id
 * @param {Array} widgets - The widgets array
 * @returns {boolean}
 */
function saveDashboardWidgets(userId, widgets) {
  const allWidgets = getItem(DASHBOARD_WIDGETS_STORAGE_KEY, {}) || {};
  allWidgets[userId] = widgets;
  return setItem(DASHBOARD_WIDGETS_STORAGE_KEY, allWidgets);
}

/**
 * MyProfile page component.
 * Displays current user profile, editable preferences, notification channel settings,
 * and dashboard widget configuration.
 *
 * @returns {React.ReactElement} The my profile page
 */
export default function MyProfile() {
  const { currentUser, role, isAuthenticated, session } = useAuth();
  const { preferences: notifPrefs, updatePreferences: updateNotifPrefs } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // Active tab
  const [activeTab, setActiveTab] = useState('profile');

  // Profile preferences form state
  const [profilePrefs, setProfilePrefs] = useState({ ...DEFAULT_PROFILE_PREFS });
  const [prefsFeedback, setPrefsFeedback] = useState(null);
  const [prefsSubmitting, setPrefsSubmitting] = useState(false);

  // Notification preferences form state
  const [notifForm, setNotifForm] = useState({ email: true, teams: false, inApp: true });
  const [notifFeedback, setNotifFeedback] = useState(null);
  const [notifSubmitting, setNotifSubmitting] = useState(false);

  // Dashboard widgets state
  const [widgets, setWidgets] = useState([]);
  const [widgetsFeedback, setWidgetsFeedback] = useState(null);
  const [widgetsSubmitting, setWidgetsSubmitting] = useState(false);

  /**
   * Fetches user profile data.
   */
  const fetchData = useCallback(() => {
    setLoading(true);

    try {
      if (!isAuthenticated || !currentUser) {
        setLoading(false);
        return;
      }

      const user = getUserById(currentUser.id || (session ? session.userId : ''));
      setUserProfile(user || currentUser);

      const userId = currentUser.id || (session ? session.userId : '');

      // Load profile preferences
      const prefs = loadProfilePrefs(userId);
      setProfilePrefs(prefs);

      // Load notification preferences
      if (notifPrefs) {
        setNotifForm({
          email: typeof notifPrefs.email === 'boolean' ? notifPrefs.email : true,
          teams: typeof notifPrefs.teams === 'boolean' ? notifPrefs.teams : false,
          inApp: typeof notifPrefs.inApp === 'boolean' ? notifPrefs.inApp : true,
        });
      }

      // Load dashboard widgets
      const userWidgets = loadDashboardWidgets(userId);
      setWidgets(userWidgets);
    } catch {
      // Ignore errors during profile load
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentUser, session, notifPrefs]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Clears feedback messages after a timeout.
   */
  useEffect(() => {
    if (prefsFeedback) {
      const timer = setTimeout(() => setPrefsFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [prefsFeedback]);

  useEffect(() => {
    if (notifFeedback) {
      const timer = setTimeout(() => setNotifFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notifFeedback]);

  useEffect(() => {
    if (widgetsFeedback) {
      const timer = setTimeout(() => setWidgetsFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [widgetsFeedback]);

  /**
   * Handles profile preferences form field changes.
   *
   * @param {string} field - The field name
   * @param {*} value - The new value
   */
  const handlePrefsChange = useCallback((field, value) => {
    setProfilePrefs((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handles submitting the profile preferences form.
   */
  const handlePrefsSubmit = useCallback(() => {
    setPrefsSubmitting(true);
    setPrefsFeedback(null);

    try {
      const userId = currentUser ? (currentUser.id || '') : (session ? session.userId : '');
      if (!userId) {
        setPrefsFeedback({ type: 'error', message: 'Unable to identify current user.' });
        setPrefsSubmitting(false);
        return;
      }

      saveProfilePrefs(userId, profilePrefs);

      try {
        logAction(
          'update',
          `Profile preferences updated. Theme: ${profilePrefs.theme}. Layout: ${profilePrefs.dashboardLayout}. Date format: ${profilePrefs.dateFormat}.`,
          'User',
          userId,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setPrefsFeedback({ type: 'success', message: 'Profile preferences saved successfully.' });
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to save profile preferences.';
      setPrefsFeedback({ type: 'error', message: errorMessage });
    } finally {
      setPrefsSubmitting(false);
    }
  }, [profilePrefs, currentUser, session]);

  /**
   * Handles notification preferences form field changes.
   *
   * @param {string} field - The field name
   * @param {boolean} value - The new value
   */
  const handleNotifChange = useCallback((field, value) => {
    setNotifForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handles submitting the notification preferences form.
   */
  const handleNotifSubmit = useCallback(async () => {
    setNotifSubmitting(true);
    setNotifFeedback(null);

    try {
      const result = await updateNotifPrefs(notifForm);

      if (result) {
        try {
          const userId = currentUser ? (currentUser.id || '') : (session ? session.userId : '');
          logAction(
            'update',
            `Notification preferences updated. Email: ${notifForm.email}. Teams: ${notifForm.teams}. In-App: ${notifForm.inApp}.`,
            'User',
            userId,
            { status: 'success' }
          );
        } catch {
          // Ignore audit log errors
        }

        setNotifFeedback({ type: 'success', message: 'Notification preferences saved successfully.' });
      } else {
        setNotifFeedback({ type: 'error', message: 'Failed to save notification preferences.' });
      }
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to save notification preferences.';
      setNotifFeedback({ type: 'error', message: errorMessage });
    } finally {
      setNotifSubmitting(false);
    }
  }, [notifForm, updateNotifPrefs, currentUser, session]);

  /**
   * Handles toggling a dashboard widget's enabled state.
   *
   * @param {string} widgetId - The widget id to toggle
   */
  const handleToggleWidget = useCallback((widgetId) => {
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      )
    );
  }, []);

  /**
   * Handles moving a widget up in the order.
   *
   * @param {number} index - The current index of the widget
   */
  const handleMoveWidgetUp = useCallback((index) => {
    if (index <= 0) {
      return;
    }
    setWidgets((prev) => {
      const newWidgets = [...prev];
      const temp = newWidgets[index];
      newWidgets[index] = newWidgets[index - 1];
      newWidgets[index - 1] = temp;
      // Update order values
      return newWidgets.map((w, i) => ({ ...w, order: i + 1 }));
    });
  }, []);

  /**
   * Handles moving a widget down in the order.
   *
   * @param {number} index - The current index of the widget
   */
  const handleMoveWidgetDown = useCallback((index) => {
    setWidgets((prev) => {
      if (index >= prev.length - 1) {
        return prev;
      }
      const newWidgets = [...prev];
      const temp = newWidgets[index];
      newWidgets[index] = newWidgets[index + 1];
      newWidgets[index + 1] = temp;
      // Update order values
      return newWidgets.map((w, i) => ({ ...w, order: i + 1 }));
    });
  }, []);

  /**
   * Handles saving the dashboard widget configuration.
   */
  const handleWidgetsSave = useCallback(() => {
    setWidgetsSubmitting(true);
    setWidgetsFeedback(null);

    try {
      const userId = currentUser ? (currentUser.id || '') : (session ? session.userId : '');
      if (!userId) {
        setWidgetsFeedback({ type: 'error', message: 'Unable to identify current user.' });
        setWidgetsSubmitting(false);
        return;
      }

      saveDashboardWidgets(userId, widgets);

      try {
        const enabledCount = widgets.filter((w) => w.enabled).length;
        logAction(
          'update',
          `Dashboard widget configuration updated. ${enabledCount} of ${widgets.length} widgets enabled.`,
          'User',
          userId,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setWidgetsFeedback({ type: 'success', message: 'Dashboard widget configuration saved successfully.' });
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to save widget configuration.';
      setWidgetsFeedback({ type: 'error', message: errorMessage });
    } finally {
      setWidgetsSubmitting(false);
    }
  }, [widgets, currentUser, session]);

  /**
   * Handles resetting dashboard widgets to defaults.
   */
  const handleWidgetsReset = useCallback(() => {
    setWidgets(JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_WIDGETS)));
    setWidgetsFeedback({ type: 'success', message: 'Dashboard widgets reset to defaults. Click "Save Configuration" to persist.' });
  }, []);

  /**
   * Summary KPIs for the profile.
   */
  const profileKPIs = useMemo(() => {
    if (!userProfile) {
      return null;
    }

    const accessCount = userProfile.applicationAccess ? userProfile.applicationAccess.length : 0;
    const enabledWidgets = widgets.filter((w) => w.enabled).length;

    return {
      accessCount,
      enabledWidgets,
      totalWidgets: widgets.length,
    };
  }, [userProfile, widgets]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading profile..." showLabel />
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="p-6">
        <EmptyState
          title="Not authenticated"
          description="Please log in to view your profile."
        />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="p-6">
        <EmptyState
          title="Profile not found"
          description="Your user profile could not be loaded. Please try again later."
          actionLabel="Retry"
          onAction={fetchData}
        />
      </div>
    );
  }

  const userInitial = userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-600 text-2xl font-bold">
              {userInitial}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">
              {userProfile.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
                {getRoleLabel(userProfile.role)}
              </span>
              <StatusBadge status={userProfile.status} size="sm" />
            </div>
            <p className="text-sm text-brand-gray-500 mt-0.5">
              {userProfile.email}
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {profileKPIs && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Role"
            value={getRoleLabel(userProfile.role)}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <MetricCard
            label="Feature Access"
            value={profileKPIs.accessCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            }
          />
          <MetricCard
            label="Dashboard Widgets"
            value={profileKPIs.enabledWidgets}
            trend="neutral"
            trendValue={`of ${profileKPIs.totalWidgets}`}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            }
          />
          <MetricCard
            label="Account Status"
            value={userProfile.status ? userProfile.status.charAt(0).toUpperCase() + userProfile.status.slice(1) : 'Unknown'}
            trend={userProfile.status === 'active' ? 'up' : 'down'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-brand-gray-200 overflow-x-auto">
        {[
          { key: 'profile', label: 'Profile Details' },
          { key: 'preferences', label: 'Preferences' },
          { key: 'notifications', label: 'Notifications' },
          { key: 'widgets', label: 'Dashboard Widgets' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Profile Details */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: User Info */}
            <div className="bg-white rounded-lg border border-brand-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-4">
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <h2 className="text-lg font-semibold text-brand-gray-900">
                  Personal Information
                </h2>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-brand-600 text-3xl font-bold">
                    {userInitial}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-brand-gray-900">{userProfile.name}</p>
                  <p className="text-sm text-brand-gray-500">{userProfile.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-brand-gray-50 rounded-lg p-3">
                  <p className="text-xs text-brand-gray-500 mb-1">Full Name</p>
                  <p className="text-sm font-medium text-brand-gray-900">{userProfile.name}</p>
                </div>
                <div className="bg-brand-gray-50 rounded-lg p-3">
                  <p className="text-xs text-brand-gray-500 mb-1">Email</p>
                  <p className="text-sm font-medium text-brand-gray-900">{userProfile.email}</p>
                </div>
                <div className="bg-brand-gray-50 rounded-lg p-3">
                  <p className="text-xs text-brand-gray-500 mb-1">Role</p>
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
                    {getRoleLabel(userProfile.role)}
                  </span>
                </div>
                <div className="bg-brand-gray-50 rounded-lg p-3">
                  <p className="text-xs text-brand-gray-500 mb-1">Portfolio / Department</p>
                  <p className="text-sm font-medium text-brand-gray-900">{userProfile.portfolio || '—'}</p>
                </div>
                <div className="bg-brand-gray-50 rounded-lg p-3">
                  <p className="text-xs text-brand-gray-500 mb-1">Account Status</p>
                  <StatusBadge status={userProfile.status} size="md" />
                </div>
                <div className="bg-brand-gray-50 rounded-lg p-3">
                  <p className="text-xs text-brand-gray-500 mb-1">User ID</p>
                  <p className="text-xs font-mono text-brand-gray-600">{userProfile.id}</p>
                </div>
                {userProfile.lastLogin && (
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Last Login</p>
                    <p className="text-sm font-medium text-brand-gray-900">
                      {formatDisplayDateTime(userProfile.lastLogin)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Access & Notifications */}
            <div className="lg:col-span-2 space-y-6">
              {/* Application Access */}
              <div className="bg-white rounded-lg border border-brand-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
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
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                  <h2 className="text-lg font-semibold text-brand-gray-900">
                    Feature Access
                  </h2>
                  <span className="text-sm text-brand-gray-500">
                    ({userProfile.applicationAccess ? userProfile.applicationAccess.length : 0} features)
                  </span>
                </div>

                {userProfile.applicationAccess && userProfile.applicationAccess.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userProfile.applicationAccess.map((access, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300"
                      >
                        {access.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-brand-gray-500">No feature access configured.</p>
                )}
              </div>

              {/* Current Notification Preferences */}
              <div className="bg-white rounded-lg border border-brand-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
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
                    Current Notification Channels
                  </h2>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${notifPrefs && notifPrefs.email ? 'bg-brand-green-500' : 'bg-brand-gray-400'}`} />
                    <span className="text-sm text-brand-gray-600">Email: {notifPrefs && notifPrefs.email ? 'On' : 'Off'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${notifPrefs && notifPrefs.teams ? 'bg-brand-green-500' : 'bg-brand-gray-400'}`} />
                    <span className="text-sm text-brand-gray-600">Teams: {notifPrefs && notifPrefs.teams ? 'On' : 'Off'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${notifPrefs && notifPrefs.inApp ? 'bg-brand-green-500' : 'bg-brand-gray-400'}`} />
                    <span className="text-sm text-brand-gray-600">In-App: {notifPrefs && notifPrefs.inApp ? 'On' : 'Off'}</span>
                  </div>
                </div>
              </div>

              {/* Session Info */}
              {session && (
                <div className="bg-white rounded-lg border border-brand-gray-200 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h2 className="text-lg font-semibold text-brand-gray-900">
                      Current Session
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-brand-gray-50 rounded-lg p-3">
                      <p className="text-xs text-brand-gray-500 mb-1">Session Started</p>
                      <p className="text-sm font-medium text-brand-gray-900">
                        {session.loginAt ? formatDisplayDateTime(session.loginAt) : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-brand-gray-50 rounded-lg p-3">
                      <p className="text-xs text-brand-gray-500 mb-1">Session Token</p>
                      <p className="text-xs font-mono text-brand-gray-600 truncate">
                        {session.token ? session.token.substring(0, 20) + '...' : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-brand-gray-50 rounded-lg p-3">
                      <p className="text-xs text-brand-gray-500 mb-1">Portfolio</p>
                      <p className="text-sm font-medium text-brand-gray-900">
                        {session.portfolio || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Preferences */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-brand-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-brand-gray-900">
                Display Preferences
              </h2>
            </div>

            {/* Feedback */}
            {prefsFeedback && (
              <div
                className={`flex items-start gap-2 px-4 py-3 mb-4 rounded-lg border ${
                  prefsFeedback.type === 'success'
                    ? 'bg-brand-green-50 border-brand-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
                role="alert"
              >
                {prefsFeedback.type === 'success' ? (
                  <svg className="w-4 h-4 text-brand-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <p className={`text-sm ${prefsFeedback.type === 'success' ? 'text-brand-green-700' : 'text-red-700'}`}>
                  {prefsFeedback.message}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="pref-theme" className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Theme
                  </label>
                  <select
                    id="pref-theme"
                    value={profilePrefs.theme}
                    onChange={(e) => handlePrefsChange('theme', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                    disabled={prefsSubmitting}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.25em 1.25em',
                    }}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="pref-layout" className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Dashboard Layout
                  </label>
                  <select
                    id="pref-layout"
                    value={profilePrefs.dashboardLayout}
                    onChange={(e) => handlePrefsChange('dashboardLayout', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                    disabled={prefsSubmitting}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.25em 1.25em',
                    }}
                  >
                    <option value="default">Default</option>
                    <option value="compact">Compact</option>
                    <option value="expanded">Expanded</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="pref-date-format" className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Date Format
                  </label>
                  <select
                    id="pref-date-format"
                    value={profilePrefs.dateFormat}
                    onChange={(e) => handlePrefsChange('dateFormat', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                    disabled={prefsSubmitting}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.25em 1.25em',
                    }}
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pref-language" className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    id="pref-language"
                    value={profilePrefs.language}
                    onChange={(e) => handlePrefsChange('language', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                    disabled={prefsSubmitting}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.25em 1.25em',
                    }}
                  >
                    <option value="en">English</option>
                    <option value="af">Afrikaans</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Compact Mode
                  </label>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profilePrefs.compactMode}
                        onChange={(e) => handlePrefsChange('compactMode', e.target.checked)}
                        className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                        disabled={prefsSubmitting}
                      />
                      <span className="text-sm text-brand-gray-700">
                        {profilePrefs.compactMode ? 'Enabled — reduced spacing and smaller text' : 'Disabled — standard spacing'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-brand-gray-200">
                <button
                  onClick={handlePrefsSubmit}
                  disabled={prefsSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {prefsSubmitting ? (
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
          </div>
        </div>
      )}

      {/* Tab Content: Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-brand-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
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
                Notification Channel Preferences
              </h2>
            </div>

            {/* Feedback */}
            {notifFeedback && (
              <div
                className={`flex items-start gap-2 px-4 py-3 mb-4 rounded-lg border ${
                  notifFeedback.type === 'success'
                    ? 'bg-brand-green-50 border-brand-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
                role="alert"
              >
                {notifFeedback.type === 'success' ? (
                  <svg className="w-4 h-4 text-brand-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <p className={`text-sm ${notifFeedback.type === 'success' ? 'text-brand-green-700' : 'text-red-700'}`}>
                  {notifFeedback.message}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Email Toggle */}
              <div className="flex items-center justify-between bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-brand-gray-900">Email Notifications</p>
                    <p className="text-xs text-brand-gray-500 mt-0.5">
                      Receive notifications via email for important events and alerts.
                    </p>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifForm.email}
                    onChange={(e) => handleNotifChange('email', e.target.checked)}
                    className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                    disabled={notifSubmitting}
                  />
                  <span className="ml-2 text-sm text-brand-gray-700">
                    {notifForm.email ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              {/* Teams Toggle */}
              <div className="flex items-center justify-between bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-brand-gray-900">Microsoft Teams Notifications</p>
                    <p className="text-xs text-brand-gray-500 mt-0.5">
                      Receive notifications via Microsoft Teams channels (simulated).
                    </p>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifForm.teams}
                    onChange={(e) => handleNotifChange('teams', e.target.checked)}
                    className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                    disabled={notifSubmitting}
                  />
                  <span className="ml-2 text-sm text-brand-gray-700">
                    {notifForm.teams ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              {/* In-App Toggle */}
              <div className="flex items-center justify-between bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-brand-gray-900">In-App Notifications</p>
                    <p className="text-xs text-brand-gray-500 mt-0.5">
                      Receive notifications within the KP-ETSIP application interface.
                    </p>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifForm.inApp}
                    onChange={(e) => handleNotifChange('inApp', e.target.checked)}
                    className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                    disabled={notifSubmitting}
                  />
                  <span className="ml-2 text-sm text-brand-gray-700">
                    {notifForm.inApp ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-brand-gray-200">
                <button
                  onClick={handleNotifSubmit}
                  disabled={notifSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {notifSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Save Notification Preferences</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Dashboard Widgets */}
      {activeTab === 'widgets' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-brand-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
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
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                <h2 className="text-lg font-semibold text-brand-gray-900">
                  Dashboard Widget Configuration
                </h2>
                <span className="text-sm text-brand-gray-500">
                  ({widgets.filter((w) => w.enabled).length} of {widgets.length} enabled)
                </span>
              </div>
              <button
                onClick={handleWidgetsReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset to Defaults</span>
              </button>
            </div>

            {/* Feedback */}
            {widgetsFeedback && (
              <div
                className={`flex items-start gap-2 px-4 py-3 mb-4 rounded-lg border ${
                  widgetsFeedback.type === 'success'
                    ? 'bg-brand-green-50 border-brand-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
                role="alert"
              >
                {widgetsFeedback.type === 'success' ? (
                  <svg className="w-4 h-4 text-brand-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <p className={`text-sm ${widgetsFeedback.type === 'success' ? 'text-brand-green-700' : 'text-red-700'}`}>
                  {widgetsFeedback.message}
                </p>
              </div>
            )}

            <p className="text-xs text-brand-gray-500 mb-4">
              Enable or disable dashboard widgets and reorder them using the arrow buttons. Changes are saved when you click "Save Configuration".
            </p>

            <div className="space-y-2">
              {widgets.map((widget, index) => (
                <div
                  key={widget.id}
                  className={`flex items-center justify-between rounded-lg p-3 border transition-colors ${
                    widget.enabled
                      ? 'bg-brand-50 border-brand-200'
                      : 'bg-brand-gray-50 border-brand-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-brand-gray-400 font-mono w-6 text-center">
                      {index + 1}
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={widget.enabled}
                        onChange={() => handleToggleWidget(widget.id)}
                        className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                      />
                      <span className={`text-sm font-medium ${widget.enabled ? 'text-brand-gray-900' : 'text-brand-gray-500'}`}>
                        {widget.label}
                      </span>
                    </label>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveWidgetUp(index)}
                      disabled={index === 0}
                      className="p-1 rounded text-brand-gray-400 hover:text-brand-gray-600 hover:bg-brand-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label={`Move ${widget.label} up`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveWidgetDown(index)}
                      disabled={index === widgets.length - 1}
                      className="p-1 rounded text-brand-gray-400 hover:text-brand-gray-600 hover:bg-brand-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label={`Move ${widget.label} down`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-4 mt-4 border-t border-brand-gray-200">
              <button
                onClick={handleWidgetsSave}
                disabled={widgetsSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {widgetsSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Save Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>Role: {getRoleLabel(userProfile.role)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${userProfile.status === 'active' ? 'bg-brand-green-500' : 'bg-brand-gray-400'}`} />
            <span>Status: {userProfile.status ? userProfile.status.charAt(0).toUpperCase() + userProfile.status.slice(1) : 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{userProfile.applicationAccess ? userProfile.applicationAccess.length : 0} Features</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>Theme: {profilePrefs.theme}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{widgets.filter((w) => w.enabled).length} Widgets Active</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            Last login: {userProfile.lastLogin ? formatDisplayDateTime(userProfile.lastLogin) : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
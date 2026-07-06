/**
 * Administration Component
 * Administration screen (FR-025): provides platform configuration sections including
 * general settings, retention policy configuration (simulated), system health monitoring
 * (UI hints), feature toggles, and platform branding settings.
 * Uses platformAdminService. Logs changes via AuditLogService.
 * @module Administration
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getPlatformConfig,
  updatePlatformConfig,
  getRetentionPolicies,
  updateRetentionPolicy,
  simulateRetentionPolicy,
  getSystemHealth,
  enableMaintenanceMode,
  disableMaintenanceMode,
} from '../../shared/services/platformAdminService.js';
import { logAction } from '../../shared/services/auditLogService.js';
import MetricCard from '../../shared/components/MetricCard.jsx';
import DataTable from '../../shared/components/DataTable.jsx';
import ExportButton from '../../shared/components/ExportButton.jsx';
import LoadingSpinner from '../../shared/components/LoadingSpinner.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import EmptyState from '../../shared/components/EmptyState.jsx';
import Modal from '../../shared/components/Modal.jsx';

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
 * Administration page component.
 * Provides platform configuration sections including general settings,
 * retention policy configuration, system health monitoring, feature toggles,
 * and platform branding settings.
 *
 * @returns {React.ReactElement} The administration page
 */
export default function Administration() {
  const { currentUser, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Platform config state
  const [platformConfig, setPlatformConfig] = useState(null);

  // Retention policies state
  const [retentionPolicies, setRetentionPolicies] = useState([]);

  // System health state
  const [systemHealth, setSystemHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('general');

  // General settings form state
  const [settingsForm, setSettingsForm] = useState({
    appTitle: '',
    defaultPageSize: 10,
    sessionTimeoutMinutes: 30,
    maxLoginAttempts: 5,
    dateFormat: 'YYYY-MM-DD',
    language: 'en',
    theme: 'light',
  });
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState(null);

  // Feature toggles form state
  const [togglesForm, setTogglesForm] = useState({
    auditLoggingEnabled: true,
    notificationsEnabled: true,
    maintenanceMode: false,
    maintenanceMessage: '',
  });
  const [togglesSubmitting, setTogglesSubmitting] = useState(false);
  const [togglesFeedback, setTogglesFeedback] = useState(null);

  // Retention policy edit modal state
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    retentionDays: 0,
    action: 'archive',
    enabled: true,
    description: '',
  });
  const [policyFormError, setPolicyFormError] = useState(null);
  const [policySubmitting, setPolicySubmitting] = useState(false);

  // Retention policy execution state
  const [executingPolicyId, setExecutingPolicyId] = useState(null);

  /**
   * Fetches all administration data.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [config, policies] = await Promise.all([
        getPlatformConfig(),
        getRetentionPolicies(),
      ]);

      setPlatformConfig(config);
      setRetentionPolicies(policies);

      // Initialize forms from config
      if (config) {
        setSettingsForm({
          appTitle: config.appTitle || '',
          defaultPageSize: config.defaultPageSize || 10,
          sessionTimeoutMinutes: config.sessionTimeoutMinutes || 30,
          maxLoginAttempts: config.maxLoginAttempts || 5,
          dateFormat: config.dateFormat || 'YYYY-MM-DD',
          language: config.language || 'en',
          theme: config.theme || 'light',
        });

        setTogglesForm({
          auditLoggingEnabled: config.auditLoggingEnabled !== false,
          notificationsEnabled: config.notificationsEnabled !== false,
          maintenanceMode: config.maintenanceMode === true,
          maintenanceMessage: config.maintenanceMessage || '',
        });
      }
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load administration data.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Fetches system health data.
   */
  const fetchSystemHealth = useCallback(async () => {
    setHealthLoading(true);

    try {
      const health = await getSystemHealth();
      setSystemHealth(health);
    } catch {
      setSystemHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'health') {
      fetchSystemHealth();
    }
  }, [activeTab, fetchSystemHealth]);

  /**
   * Handles general settings form field changes.
   *
   * @param {string} field - The field name
   * @param {*} value - The new value
   */
  const handleSettingsChange = useCallback((field, value) => {
    setSettingsForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handles submitting the general settings form.
   */
  const handleSettingsSubmit = useCallback(async () => {
    setSettingsSubmitting(true);
    setSettingsFeedback(null);

    try {
      const updated = await updatePlatformConfig({
        appTitle: settingsForm.appTitle.trim(),
        defaultPageSize: Number(settingsForm.defaultPageSize) || 10,
        sessionTimeoutMinutes: Number(settingsForm.sessionTimeoutMinutes) || 30,
        maxLoginAttempts: Number(settingsForm.maxLoginAttempts) || 5,
        dateFormat: settingsForm.dateFormat,
        language: settingsForm.language,
        theme: settingsForm.theme,
      });

      setPlatformConfig(updated);

      try {
        logAction(
          'config_change',
          `Platform general settings updated. App title: ${settingsForm.appTitle.trim()}. Page size: ${settingsForm.defaultPageSize}. Session timeout: ${settingsForm.sessionTimeoutMinutes} min.`,
          'System',
          'platform-config',
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setSettingsFeedback({ type: 'success', message: 'General settings saved successfully.' });
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to save general settings.';
      setSettingsFeedback({ type: 'error', message: errorMessage });
    } finally {
      setSettingsSubmitting(false);
    }
  }, [settingsForm]);

  /**
   * Handles feature toggles form field changes.
   *
   * @param {string} field - The field name
   * @param {*} value - The new value
   */
  const handleTogglesChange = useCallback((field, value) => {
    setTogglesForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handles submitting the feature toggles form.
   */
  const handleTogglesSubmit = useCallback(async () => {
    setTogglesSubmitting(true);
    setTogglesFeedback(null);

    try {
      if (togglesForm.maintenanceMode) {
        await enableMaintenanceMode(togglesForm.maintenanceMessage.trim() || undefined);
      } else {
        await disableMaintenanceMode();
      }

      const updated = await updatePlatformConfig({
        auditLoggingEnabled: togglesForm.auditLoggingEnabled,
        notificationsEnabled: togglesForm.notificationsEnabled,
      });

      setPlatformConfig(updated);

      try {
        logAction(
          'config_change',
          `Platform feature toggles updated. Audit logging: ${togglesForm.auditLoggingEnabled}. Notifications: ${togglesForm.notificationsEnabled}. Maintenance mode: ${togglesForm.maintenanceMode}.`,
          'System',
          'platform-config',
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setTogglesFeedback({ type: 'success', message: 'Feature toggles saved successfully.' });
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to save feature toggles.';
      setTogglesFeedback({ type: 'error', message: errorMessage });
    } finally {
      setTogglesSubmitting(false);
    }
  }, [togglesForm]);

  /**
   * Opens the retention policy edit modal.
   *
   * @param {Object} policy - The retention policy to edit
   */
  const handleOpenPolicyEdit = useCallback((policy) => {
    setSelectedPolicy(policy);
    setPolicyForm({
      retentionDays: policy.retentionDays || 0,
      action: policy.action || 'archive',
      enabled: policy.enabled !== false,
      description: policy.description || '',
    });
    setPolicyFormError(null);
    setPolicyModalOpen(true);
  }, []);

  /**
   * Closes the retention policy edit modal.
   */
  const handleClosePolicyEdit = useCallback(() => {
    setPolicyModalOpen(false);
    setPolicyFormError(null);
    setSelectedPolicy(null);
  }, []);

  /**
   * Handles retention policy form field changes.
   *
   * @param {string} field - The field name
   * @param {*} value - The new value
   */
  const handlePolicyFormChange = useCallback((field, value) => {
    setPolicyForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handles submitting the retention policy edit form.
   */
  const handlePolicySubmit = useCallback(async () => {
    setPolicyFormError(null);

    if (!selectedPolicy) {
      setPolicyFormError('No policy selected.');
      return;
    }

    if (Number(policyForm.retentionDays) <= 0) {
      setPolicyFormError('Retention days must be a positive number.');
      return;
    }

    setPolicySubmitting(true);

    try {
      await updateRetentionPolicy({
        id: selectedPolicy.id,
        retentionDays: Number(policyForm.retentionDays),
        action: policyForm.action,
        enabled: policyForm.enabled,
        description: policyForm.description.trim(),
      });

      try {
        logAction(
          'config_change',
          `Retention policy "${selectedPolicy.name}" (${selectedPolicy.id}) updated. Retention: ${policyForm.retentionDays} days. Action: ${policyForm.action}. Enabled: ${policyForm.enabled}.`,
          'System',
          selectedPolicy.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setPolicyModalOpen(false);
      setSelectedPolicy(null);

      // Refresh retention policies
      const policies = await getRetentionPolicies();
      setRetentionPolicies(policies);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to update retention policy.';
      setPolicyFormError(errorMessage);
    } finally {
      setPolicySubmitting(false);
    }
  }, [policyForm, selectedPolicy]);

  /**
   * Handles executing a retention policy simulation.
   *
   * @param {Object} policy - The retention policy to execute
   */
  const handleExecutePolicy = useCallback(async (policy) => {
    if (!policy) {
      return;
    }

    setExecutingPolicyId(policy.id);

    try {
      await simulateRetentionPolicy(policy.id);

      try {
        logAction(
          'config_change',
          `Retention policy "${policy.name}" (${policy.id}) executed (simulated).`,
          'System',
          policy.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      // Refresh retention policies
      const policies = await getRetentionPolicies();
      setRetentionPolicies(policies);
    } catch {
      // Ignore execution errors
    } finally {
      setExecutingPolicyId(null);
    }
  }, []);

  /**
   * Clears feedback messages after a timeout.
   */
  useEffect(() => {
    if (settingsFeedback) {
      const timer = setTimeout(() => setSettingsFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [settingsFeedback]);

  useEffect(() => {
    if (togglesFeedback) {
      const timer = setTimeout(() => setTogglesFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [togglesFeedback]);

  /**
   * Retention policy table columns.
   */
  const retentionPolicyColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Policy Name',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
        ),
      },
      {
        key: 'entityType',
        label: 'Entity Type',
        sortable: true,
        render: (value) => (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
            {value}
          </span>
        ),
      },
      {
        key: 'retentionDays',
        label: 'Retention (Days)',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
        ),
      },
      {
        key: 'action',
        label: 'Action',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700 capitalize">{value}</span>
        ),
      },
      {
        key: 'enabled',
        label: 'Enabled',
        sortable: true,
        render: (value) => (
          <span className={`text-sm font-medium ${value ? 'text-brand-green-600' : 'text-brand-gray-400'}`}>
            {value ? 'Yes' : 'No'}
          </span>
        ),
      },
      {
        key: 'lastExecuted',
        label: 'Last Executed',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-500 whitespace-nowrap">
            {formatDisplayDateTime(value) || '—'}
          </span>
        ),
      },
      {
        key: 'nextExecution',
        label: 'Next Execution',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-500 whitespace-nowrap">
            {formatDisplayDateTime(value) || '—'}
          </span>
        ),
      },
    ];
  }, []);

  /**
   * Export data for retention policies.
   */
  const retentionPolicyExportData = useMemo(() => {
    return retentionPolicies.map((policy) => ({
      id: policy.id,
      name: policy.name,
      entityType: policy.entityType,
      retentionDays: policy.retentionDays,
      action: policy.action,
      enabled: policy.enabled,
      description: policy.description,
      lastExecuted: policy.lastExecuted,
      nextExecution: policy.nextExecution,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    }));
  }, [retentionPolicies]);

  /**
   * System health component table columns.
   */
  const healthComponentColumns = useMemo(() => {
    return [
      {
        key: 'component',
        label: 'Component',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'message',
        label: 'Details',
        sortable: false,
        render: (value) => (
          <span className="text-xs text-brand-gray-600 line-clamp-2">{value}</span>
        ),
      },
    ];
  }, []);

  /**
   * Handles clicking a retention policy row.
   *
   * @param {Object} policy - The retention policy object
   */
  const handlePolicyRowClick = useCallback((policy) => {
    handleOpenPolicyEdit(policy);
  }, [handleOpenPolicyEdit]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading administration settings..." showLabel />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <svg
            className="w-4 h-4 text-red-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchData}
            className="ml-auto text-sm font-medium text-red-600 hover:text-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!platformConfig) {
    return (
      <div className="p-6">
        <EmptyState
          title="No configuration data available"
          description="Platform configuration could not be loaded. Please try again later."
          actionLabel="Retry"
          onAction={fetchData}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-gray-900">
            Platform Administration
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Configure platform settings, retention policies, feature toggles, and monitor system health
          </p>
        </div>
        {retentionPolicyExportData.length > 0 && (
          <ExportButton
            data={retentionPolicyExportData}
            filename="platform-administration"
            title="Platform Administration Report"
            sheetName="Retention Policies"
            label="Export"
            size="md"
          />
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <MetricCard
          label="App Title"
          value={platformConfig.appTitle || 'KP-ETSIP'}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Session Timeout"
          value={platformConfig.sessionTimeoutMinutes || 30}
          trend="neutral"
          suffix=" min"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Audit Logging"
          value={platformConfig.auditLoggingEnabled ? 'Enabled' : 'Disabled'}
          trend={platformConfig.auditLoggingEnabled ? 'up' : 'down'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <MetricCard
          label="Notifications"
          value={platformConfig.notificationsEnabled ? 'Enabled' : 'Disabled'}
          trend={platformConfig.notificationsEnabled ? 'up' : 'down'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          }
        />
        <MetricCard
          label="Maintenance Mode"
          value={platformConfig.maintenanceMode ? 'Active' : 'Inactive'}
          trend={platformConfig.maintenanceMode ? 'down' : 'up'}
          trendValue={platformConfig.maintenanceMode ? 'System restricted' : 'Normal operation'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <MetricCard
          label="Retention Policies"
          value={retentionPolicies.length}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          }
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-brand-gray-200 overflow-x-auto">
        {[
          { key: 'general', label: 'General Settings' },
          { key: 'toggles', label: 'Feature Toggles' },
          { key: 'retention', label: 'Retention Policies' },
          { key: 'health', label: 'System Health' },
          { key: 'branding', label: 'Branding' },
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

      {/* Tab Content: General Settings */}
      {activeTab === 'general' && (
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
                General Settings
              </h2>
            </div>

            {/* Feedback */}
            {settingsFeedback && (
              <div
                className={`flex items-start gap-2 px-4 py-3 mb-4 rounded-lg border ${
                  settingsFeedback.type === 'success'
                    ? 'bg-brand-green-50 border-brand-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
                role="alert"
              >
                {settingsFeedback.type === 'success' ? (
                  <svg className="w-4 h-4 text-brand-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <p className={`text-sm ${settingsFeedback.type === 'success' ? 'text-brand-green-700' : 'text-red-700'}`}>
                  {settingsFeedback.message}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="settings-app-title" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Application Title
                </label>
                <input
                  id="settings-app-title"
                  type="text"
                  value={settingsForm.appTitle}
                  onChange={(e) => handleSettingsChange('appTitle', e.target.value)}
                  placeholder="KP-ETSIP"
                  className="w-full max-w-md px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  disabled={settingsSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="settings-page-size" className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Default Page Size
                  </label>
                  <input
                    id="settings-page-size"
                    type="number"
                    min="5"
                    max="100"
                    value={settingsForm.defaultPageSize}
                    onChange={(e) => handleSettingsChange('defaultPageSize', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    disabled={settingsSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="settings-session-timeout" className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Session Timeout (minutes)
                  </label>
                  <input
                    id="settings-session-timeout"
                    type="number"
                    min="5"
                    max="480"
                    value={settingsForm.sessionTimeoutMinutes}
                    onChange={(e) => handleSettingsChange('sessionTimeoutMinutes', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    disabled={settingsSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="settings-max-login" className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Max Login Attempts
                  </label>
                  <input
                    id="settings-max-login"
                    type="number"
                    min="1"
                    max="20"
                    value={settingsForm.maxLoginAttempts}
                    onChange={(e) => handleSettingsChange('maxLoginAttempts', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    disabled={settingsSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="settings-date-format" className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Date Format
                  </label>
                  <select
                    id="settings-date-format"
                    value={settingsForm.dateFormat}
                    onChange={(e) => handleSettingsChange('dateFormat', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                    disabled={settingsSubmitting}
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

                <div>
                  <label htmlFor="settings-language" className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    id="settings-language"
                    value={settingsForm.language}
                    onChange={(e) => handleSettingsChange('language', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                    disabled={settingsSubmitting}
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
                  <label htmlFor="settings-theme" className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Theme
                  </label>
                  <select
                    id="settings-theme"
                    value={settingsForm.theme}
                    onChange={(e) => handleSettingsChange('theme', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                    disabled={settingsSubmitting}
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
              </div>

              {/* Last Updated Info */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-500 pt-4 border-t border-brand-gray-200">
                {platformConfig.lastUpdated && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Last updated: {formatDisplayDateTime(platformConfig.lastUpdated)}</span>
                  </div>
                )}
                {platformConfig.updatedBy && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Updated by: {platformConfig.updatedBy}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-4">
                <button
                  onClick={handleSettingsSubmit}
                  disabled={settingsSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {settingsSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Save Settings</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Feature Toggles */}
      {activeTab === 'toggles' && (
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-brand-gray-900">
                Feature Toggles
              </h2>
            </div>

            {/* Feedback */}
            {togglesFeedback && (
              <div
                className={`flex items-start gap-2 px-4 py-3 mb-4 rounded-lg border ${
                  togglesFeedback.type === 'success'
                    ? 'bg-brand-green-50 border-brand-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
                role="alert"
              >
                {togglesFeedback.type === 'success' ? (
                  <svg className="w-4 h-4 text-brand-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <p className={`text-sm ${togglesFeedback.type === 'success' ? 'text-brand-green-700' : 'text-red-700'}`}>
                  {togglesFeedback.message}
                </p>
              </div>
            )}

            <div className="space-y-6">
              {/* Audit Logging Toggle */}
              <div className="flex items-center justify-between bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-brand-gray-900">Audit Logging</p>
                    <p className="text-xs text-brand-gray-500 mt-0.5">
                      Log all user actions and system events for compliance and security monitoring.
                    </p>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={togglesForm.auditLoggingEnabled}
                    onChange={(e) => handleTogglesChange('auditLoggingEnabled', e.target.checked)}
                    className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                    disabled={togglesSubmitting}
                  />
                  <span className="ml-2 text-sm text-brand-gray-700">
                    {togglesForm.auditLoggingEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              {/* Notifications Toggle */}
              <div className="flex items-center justify-between bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-brand-gray-900">Notifications</p>
                    <p className="text-xs text-brand-gray-500 mt-0.5">
                      Enable in-app, email, and Teams notification delivery across the platform.
                    </p>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={togglesForm.notificationsEnabled}
                    onChange={(e) => handleTogglesChange('notificationsEnabled', e.target.checked)}
                    className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                    disabled={togglesSubmitting}
                  />
                  <span className="ml-2 text-sm text-brand-gray-700">
                    {togglesForm.notificationsEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              {/* Maintenance Mode Toggle */}
              <div className={`rounded-lg p-4 border ${togglesForm.maintenanceMode ? 'bg-yellow-50 border-yellow-200' : 'bg-brand-gray-50 border-brand-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${togglesForm.maintenanceMode ? 'text-yellow-500' : 'text-brand-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-brand-gray-900">Maintenance Mode</p>
                      <p className="text-xs text-brand-gray-500 mt-0.5">
                        When enabled, users will see a maintenance message and access will be restricted.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={togglesForm.maintenanceMode}
                      onChange={(e) => handleTogglesChange('maintenanceMode', e.target.checked)}
                      className="w-4 h-4 text-yellow-500 border-brand-gray-300 rounded focus:ring-yellow-500"
                      disabled={togglesSubmitting}
                    />
                    <span className={`ml-2 text-sm ${togglesForm.maintenanceMode ? 'text-yellow-700 font-medium' : 'text-brand-gray-700'}`}>
                      {togglesForm.maintenanceMode ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </div>

                {togglesForm.maintenanceMode && (
                  <div className="mt-3">
                    <label htmlFor="maintenance-message" className="block text-xs font-medium text-brand-gray-700 mb-1">
                      Maintenance Message
                    </label>
                    <textarea
                      id="maintenance-message"
                      value={togglesForm.maintenanceMessage}
                      onChange={(e) => handleTogglesChange('maintenanceMessage', e.target.value)}
                      placeholder="The system is currently undergoing scheduled maintenance..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-yellow-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors resize-none"
                      disabled={togglesSubmitting}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-brand-gray-200">
                <button
                  onClick={handleTogglesSubmit}
                  disabled={togglesSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {togglesSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Save Toggles</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Retention Policies */}
      {activeTab === 'retention' && (
        <div className="space-y-6">
          {/* Simulated Disclaimer */}
          <div className="flex items-start gap-3 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <svg
              className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Simulated Retention Policies
              </p>
              <p className="text-xs text-yellow-700 mt-0.5 leading-relaxed">
                Retention policies are simulated for demonstration purposes. No real data deletion or archiving occurs.
                In a production environment, these policies would be enforced by backend services.
              </p>
            </div>
          </div>

          {/* Retention Policy Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {retentionPolicies.map((policy) => (
              <div
                key={policy.id}
                className={`bg-white rounded-lg border p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-brand-300 transition-all ${
                  policy.enabled ? 'border-brand-gray-200' : 'border-brand-gray-200 opacity-60'
                }`}
                onClick={() => handleOpenPolicyEdit(policy)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenPolicyEdit(policy);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Edit retention policy ${policy.name}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
                      {policy.entityType}
                    </span>
                    {!policy.enabled && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-brand-gray-100 text-brand-gray-600">
                        Disabled
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-brand-gray-900">{policy.retentionDays}d</span>
                </div>
                <p className="text-sm font-medium text-brand-gray-900 mb-1">{policy.name}</p>
                <p className="text-xs text-brand-gray-500 line-clamp-2 mb-3">{policy.description}</p>
                <div className="flex items-center justify-between text-xs text-brand-gray-400">
                  <span className="capitalize">Action: {policy.action}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExecutePolicy(policy);
                    }}
                    disabled={!policy.enabled || executingPolicyId === policy.id}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {executingPolicyId === policy.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        <span>Running...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Execute</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Retention Policies Table */}
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
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
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              <h2 className="text-lg font-semibold text-brand-gray-900">
                All Retention Policies
              </h2>
              <span className="text-sm text-brand-gray-500">
                ({retentionPolicies.length})
              </span>
            </div>
            <DataTable
              columns={retentionPolicyColumns}
              data={retentionPolicies}
              pageSize={10}
              selectable={false}
              searchFields={['name', 'entityType', 'action', 'description']}
              emptyMessage="No retention policies configured."
              rowKeyField="id"
              onRowClick={handlePolicyRowClick}
              storageKey="administration-retention-policies"
            />
          </div>
        </div>
      )}

      {/* Tab Content: System Health */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {healthLoading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" label="Checking system health..." showLabel />
            </div>
          )}

          {!healthLoading && systemHealth && (
            <>
              {/* Health Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                <MetricCard
                  label="Overall Status"
                  value={systemHealth.status ? systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1) : 'Unknown'}
                  trend={systemHealth.status === 'healthy' ? 'up' : systemHealth.status === 'degraded' ? 'down' : 'down'}
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <MetricCard
                  label="Uptime"
                  value={systemHealth.uptime}
                  trend={systemHealth.uptime >= 99 ? 'up' : 'neutral'}
                  suffix="%"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  }
                />
                <MetricCard
                  label="Active Users"
                  value={systemHealth.activeUsers}
                  trend="up"
                  trendValue={`${systemHealth.totalUsers} total`}
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  }
                />
                <MetricCard
                  label="Storage Used"
                  value={systemHealth.storageUsedMB}
                  trend={systemHealth.storageUsagePercent < 80 ? 'up' : 'down'}
                  trendValue={`${systemHealth.storageUsagePercent}% of ${systemHealth.storageQuotaMB} MB`}
                  suffix=" MB"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                  }
                />
                <MetricCard
                  label="Integrations"
                  value={systemHealth.connectedIntegrations}
                  trend={systemHealth.errorIntegrations === 0 ? 'up' : 'down'}
                  trendValue={`${systemHealth.errorIntegrations} errors`}
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                />
                <MetricCard
                  label="Environments"
                  value={systemHealth.availableEnvironments}
                  trend={systemHealth.downEnvironments === 0 ? 'up' : 'down'}
                  trendValue={`${systemHealth.downEnvironments} down`}
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  }
                />
              </div>

              {/* Storage Usage Bar */}
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-brand-gray-900 mb-3">Storage Usage</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-brand-gray-600">
                    {systemHealth.storageUsedMB} MB used of {systemHealth.storageQuotaMB} MB
                  </span>
                  <span className={`text-sm font-semibold ${systemHealth.storageUsagePercent < 80 ? 'text-brand-green-600' : systemHealth.storageUsagePercent < 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {systemHealth.storageUsagePercent}%
                  </span>
                </div>
                <div className="h-3 bg-brand-gray-200 rounded-full">
                  <div
                    className={`h-3 rounded-full ${systemHealth.storageUsagePercent < 80 ? 'bg-brand-green-500' : systemHealth.storageUsagePercent < 90 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(systemHealth.storageUsagePercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Component Health Table */}
              {systemHealth.components && systemHealth.components.length > 0 && (
                <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
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
                          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <h2 className="text-lg font-semibold text-brand-gray-900">
                        Component Health
                      </h2>
                      <span className="text-sm text-brand-gray-500">
                        ({systemHealth.components.length})
                      </span>
                    </div>
                    <button
                      onClick={fetchSystemHealth}
                      disabled={healthLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Refresh</span>
                    </button>
                  </div>
                  <DataTable
                    columns={healthComponentColumns}
                    data={systemHealth.components.map((c, i) => ({ ...c, id: `component-${i}` }))}
                    pageSize={10}
                    selectable={false}
                    searchFields={['component', 'status', 'message']}
                    emptyMessage="No component health data available."
                    rowKeyField="id"
                    storageKey="administration-health-components"
                  />
                </div>
              )}

              {/* Last Checked */}
              {systemHealth.lastChecked && (
                <div className="text-xs text-brand-gray-400 text-right">
                  Last checked: {formatDisplayDateTime(systemHealth.lastChecked)}
                </div>
              )}
            </>
          )}

          {!healthLoading && !systemHealth && (
            <EmptyState
              title="System health data unavailable"
              description="Unable to retrieve system health metrics. Please try again."
              actionLabel="Retry"
              onAction={fetchSystemHealth}
            />
          )}
        </div>
      )}

      {/* Tab Content: Branding */}
      {activeTab === 'branding' && (
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
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
              <h2 className="text-lg font-semibold text-brand-gray-900">
                Platform Branding
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Brand Preview */}
              <div className="bg-brand-gray-50 rounded-lg p-6 border border-brand-gray-200">
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-4">
                  Current Branding
                </h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-2xl">KP</span>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-brand-gray-900">{platformConfig.appTitle || 'KP-ETSIP'}</p>
                    <p className="text-sm text-brand-gray-500">Education and Training Sector Improvement Programme</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-brand-gray-500 mb-2">Brand Colors</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-brand-500" title="Primary: #0069cc" />
                      <div className="w-8 h-8 rounded-md bg-brand-green-500" title="Success: #0f9d58" />
                      <div className="w-8 h-8 rounded-md bg-yellow-500" title="Warning: #f59e0b" />
                      <div className="w-8 h-8 rounded-md bg-red-500" title="Error: #ef4444" />
                      <div className="w-8 h-8 rounded-md bg-brand-gray-500" title="Neutral: #78828c" />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-brand-gray-500 mb-2">Typography</p>
                    <p className="text-sm text-brand-gray-700">
                      Font Family: Inter, system-ui, sans-serif
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-brand-gray-500 mb-2">Theme</p>
                    <p className="text-sm text-brand-gray-700 capitalize">
                      {platformConfig.theme || 'Light'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Branding Info */}
              <div className="space-y-4">
                <div className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
                  <p className="text-xs text-brand-gray-500 mb-1">Application Title</p>
                  <p className="text-sm font-medium text-brand-gray-900">{platformConfig.appTitle || 'KP-ETSIP'}</p>
                </div>
                <div className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
                  <p className="text-xs text-brand-gray-500 mb-1">Logo</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-brand-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">KP</span>
                    </div>
                    <p className="text-sm text-brand-gray-700">Default KP-ETSIP logo (text-based)</p>
                  </div>
                </div>
                <div className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
                  <p className="text-xs text-brand-gray-500 mb-1">Favicon</p>
                  <p className="text-sm text-brand-gray-700">vite.svg (default Vite favicon)</p>
                </div>
                <div className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
                  <p className="text-xs text-brand-gray-500 mb-1">Meta Description</p>
                  <p className="text-sm text-brand-gray-700">KP-ETSIP - Education and Training Sector Improvement Programme</p>
                </div>
                <div className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
                  <p className="text-xs text-brand-gray-500 mb-1">Theme Color</p>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-brand-500 ring-1 ring-inset ring-brand-gray-300" />
                    <p className="text-sm font-mono text-brand-gray-700">#0069cc</p>
                  </div>
                </div>

                {/* Simulated Note */}
                <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <svg className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-yellow-700">
                    Branding customization is simulated. In a production environment, logo upload, color theme customization, and favicon management would be available.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>Theme: {platformConfig.theme || 'light'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${platformConfig.auditLoggingEnabled ? 'bg-brand-green-500' : 'bg-brand-gray-400'}`} />
            <span>Audit: {platformConfig.auditLoggingEnabled ? 'On' : 'Off'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${platformConfig.notificationsEnabled ? 'bg-brand-green-500' : 'bg-brand-gray-400'}`} />
            <span>Notifications: {platformConfig.notificationsEnabled ? 'On' : 'Off'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${platformConfig.maintenanceMode ? 'bg-yellow-500' : 'bg-brand-green-500'}`} />
            <span>Maintenance: {platformConfig.maintenanceMode ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{retentionPolicies.length} Retention Policies</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            Last updated: {platformConfig.lastUpdated ? formatDisplayDateTime(platformConfig.lastUpdated) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Retention Policy Edit Modal */}
      <Modal
        isOpen={policyModalOpen}
        onClose={handleClosePolicyEdit}
        title={selectedPolicy ? `Edit: ${selectedPolicy.name}` : 'Edit Retention Policy'}
        size="md"
      >
        {selectedPolicy && (
          <div className="space-y-4">
            {policyFormError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{policyFormError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm text-brand-gray-600">
              <span>Entity Type:</span>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
                {selectedPolicy.entityType}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="policy-retention-days" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Retention Days <span className="text-red-500">*</span>
                </label>
                <input
                  id="policy-retention-days"
                  type="number"
                  min="1"
                  value={policyForm.retentionDays}
                  onChange={(e) => handlePolicyFormChange('retentionDays', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  disabled={policySubmitting}
                />
              </div>

              <div>
                <label htmlFor="policy-action" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Action
                </label>
                <select
                  id="policy-action"
                  value={policyForm.action}
                  onChange={(e) => handlePolicyFormChange('action', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                  disabled={policySubmitting}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em',
                  }}
                >
                  <option value="archive">Archive</option>
                  <option value="delete">Delete</option>
                  <option value="anonymize">Anonymize</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                Enabled
              </label>
              <div className="flex items-center gap-3 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyForm.enabled}
                    onChange={(e) => handlePolicyFormChange('enabled', e.target.checked)}
                    className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                    disabled={policySubmitting}
                  />
                  <span className="text-sm text-brand-gray-700">
                    {policyForm.enabled ? 'Policy is active' : 'Policy is disabled'}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="policy-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="policy-description"
                value={policyForm.description}
                onChange={(e) => handlePolicyFormChange('description', e.target.value)}
                placeholder="Brief description of the retention policy"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
                disabled={policySubmitting}
              />
            </div>

            {/* Execution Info */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-600 pt-2 border-t border-brand-gray-200">
              {selectedPolicy.lastExecuted && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Last executed: {formatDisplayDateTime(selectedPolicy.lastExecuted)}</span>
                </div>
              )}
              {selectedPolicy.nextExecution && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Next execution: {formatDisplayDateTime(selectedPolicy.nextExecution)}</span>
                </div>
              )}
            </div>

            {/* Simulated Note */}
            <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <svg className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-yellow-700">
                Retention policy changes are simulated and stored in localStorage. No real data retention enforcement occurs.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-gray-200">
              <button
                onClick={handleClosePolicyEdit}
                disabled={policySubmitting}
                className="px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handlePolicySubmit}
                disabled={policySubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {policySubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
/**
 * IntegrationManagement Component
 * Integration Management screen (FR-024): displays integration inventory in DataTable
 * (Azure DevOps, qTest, Jira Align, CI/CD, SonarQube, etc.) with status badges,
 * configure/edit modals, health monitoring indicators, last sync timestamps.
 * All integrations are simulated UI hints. Uses platformAdminService.getIntegrations().
 * @module IntegrationManagement
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getIntegrations,
  getIntegrationById,
  updateIntegration,
  toggleIntegration,
  simulateIntegrationSync,
  getDistinctIntegrationTypes,
  getDistinctIntegrationStatuses,
} from '../../shared/services/platformAdminService.js';
import { logAction } from '../../shared/services/auditLogService.js';
import MetricCard from '../../shared/components/MetricCard.jsx';
import ChartWrapper from '../../shared/components/ChartWrapper.jsx';
import DataTable from '../../shared/components/DataTable.jsx';
import FilterBar from '../../shared/components/FilterBar.jsx';
import ExportButton from '../../shared/components/ExportButton.jsx';
import LoadingSpinner from '../../shared/components/LoadingSpinner.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import EmptyState from '../../shared/components/EmptyState.jsx';
import Modal from '../../shared/components/Modal.jsx';

/**
 * Status color mapping for charts.
 * @type {Object.<string, string>}
 */
const STATUS_COLORS = {
  Connected: '#0f9d58',
  Disconnected: '#939ba3',
  Error: '#ef4444',
};

/**
 * Type color mapping for charts.
 * @type {Object.<string, string>}
 */
const TYPE_COLORS = {
  TestManagement: '#0069cc',
  ProjectManagement: '#0f9d58',
  CI_CD: '#f59e0b',
  CodeQuality: '#8b5cf6',
  VersionControl: '#06b6d4',
  Communication: '#ec4899',
  Monitoring: '#14b8a6',
  Documentation: '#f97316',
  Security: '#ef4444',
};

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
 * Formats a status string for display.
 *
 * @param {string} status - The raw status string
 * @returns {string} Formatted display label
 */
function formatStatusLabel(status) {
  if (!status || typeof status !== 'string') {
    return 'Unknown';
  }
  return status
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Formats an integration type for display.
 *
 * @param {string} type - The raw type string
 * @returns {string} Formatted display label
 */
function formatTypeLabel(type) {
  if (!type || typeof type !== 'string') {
    return 'Unknown';
  }
  const typeMap = {
    TestManagement: 'Test Management',
    ProjectManagement: 'Project Management',
    CI_CD: 'CI/CD',
    CodeQuality: 'Code Quality',
    VersionControl: 'Version Control',
    Communication: 'Communication',
    Monitoring: 'Monitoring',
    Documentation: 'Documentation',
    Security: 'Security',
  };
  return typeMap[type] || type;
}

/**
 * IntegrationManagement page component.
 * Displays integration inventory with filtering, configure/edit modals,
 * health monitoring indicators, and summary KPIs with charts.
 *
 * @returns {React.ReactElement} The integration management page
 */
export default function IntegrationManagement() {
  const { currentUser, role, hasPermission } = useAuth();

  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    type: '',
    status: '',
  });

  // Distinct values for filter dropdowns
  const [distinctTypes, setDistinctTypes] = useState([]);
  const [distinctStatuses, setDistinctStatuses] = useState([]);

  // Modal states
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    status: 'Connected',
    enabled: true,
    description: '',
  });
  const [editFormError, setEditFormError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Sync state
  const [syncSubmitting, setSyncSubmitting] = useState(false);

  // Toggle state
  const [toggleSubmitting, setToggleSubmitting] = useState(false);

  /**
   * Loads distinct filter values.
   */
  useEffect(() => {
    try {
      setDistinctTypes(getDistinctIntegrationTypes());
      setDistinctStatuses(getDistinctIntegrationStatuses());
    } catch {
      // Ignore errors loading distinct values
    }
  }, []);

  /**
   * Fetches integrations based on current filters.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {};

      if (filterValues.type) {
        filters.type = filterValues.type;
      }

      if (filterValues.status) {
        filters.status = filterValues.status;
      }

      const result = await getIntegrations(filters);
      setIntegrations(result.integrations || []);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load integrations.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filterValues]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Handles filter dropdown changes.
   *
   * @param {string} key - The filter key
   * @param {string} value - The new filter value
   */
  const handleFilterChange = useCallback((key, value) => {
    setFilterValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  /**
   * Handles clearing all filters.
   */
  const handleClearAll = useCallback(() => {
    setFilterValues({
      type: '',
      status: '',
    });
  }, []);

  /**
   * Builds the filter configuration for the FilterBar.
   */
  const filterConfig = useMemo(() => {
    return [
      {
        key: 'type',
        label: 'Type',
        placeholder: 'All Types',
        options: distinctTypes.map((t) => ({
          value: t,
          label: formatTypeLabel(t),
        })),
      },
      {
        key: 'status',
        label: 'Status',
        placeholder: 'All Statuses',
        options: distinctStatuses.map((s) => ({
          value: s,
          label: formatStatusLabel(s),
        })),
      },
    ];
  }, [distinctTypes, distinctStatuses]);

  /**
   * Summary KPIs computed from all integrations.
   */
  const summaryKPIs = useMemo(() => {
    if (!integrations || integrations.length === 0) {
      return null;
    }

    const total = integrations.length;
    let connectedCount = 0;
    let disconnectedCount = 0;
    let errorCount = 0;
    let enabledCount = 0;
    let totalUptime = 0;
    let totalSuccessRate = 0;
    let totalAvgResponseTime = 0;
    let metricsCount = 0;

    for (const intg of integrations) {
      if (intg.status === 'Connected') {
        connectedCount++;
      } else if (intg.status === 'Disconnected') {
        disconnectedCount++;
      } else if (intg.status === 'Error') {
        errorCount++;
      }

      if (intg.enabled) {
        enabledCount++;
      }

      if (intg.healthMetrics) {
        totalUptime += intg.healthMetrics.uptime || 0;
        totalSuccessRate += intg.healthMetrics.successRate || 0;
        totalAvgResponseTime += intg.healthMetrics.avgResponseTime || 0;
        metricsCount++;
      }
    }

    const avgUptime = metricsCount > 0
      ? Math.round((totalUptime / metricsCount) * 100) / 100
      : 0;

    const avgSuccessRate = metricsCount > 0
      ? Math.round((totalSuccessRate / metricsCount) * 100) / 100
      : 0;

    const avgResponseTime = metricsCount > 0
      ? Math.round(totalAvgResponseTime / metricsCount)
      : 0;

    return {
      total,
      connectedCount,
      disconnectedCount,
      errorCount,
      enabledCount,
      avgUptime,
      avgSuccessRate,
      avgResponseTime,
    };
  }, [integrations]);

  /**
   * Status distribution chart data.
   */
  const statusDistributionData = useMemo(() => {
    const counts = {};
    for (const intg of integrations) {
      const status = intg.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: STATUS_COLORS[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [integrations]);

  /**
   * Type distribution chart data.
   */
  const typeDistributionData = useMemo(() => {
    const counts = {};
    for (const intg of integrations) {
      const type = intg.type || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([type, count]) => ({
        name: formatTypeLabel(type),
        value: count,
        color: TYPE_COLORS[type] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [integrations]);

  /**
   * Uptime bar chart data.
   */
  const uptimeChartData = useMemo(() => {
    return integrations
      .filter((intg) => intg.healthMetrics && intg.healthMetrics.uptime > 0)
      .slice()
      .sort((a, b) => (a.healthMetrics.uptime || 0) - (b.healthMetrics.uptime || 0))
      .map((intg) => ({
        name: intg.name.length > 25 ? intg.name.substring(0, 22) + '...' : intg.name,
        uptime: intg.healthMetrics.uptime || 0,
        successRate: intg.healthMetrics.successRate || 0,
      }));
  }, [integrations]);

  /**
   * Uptime bar chart config.
   */
  const uptimeBarConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'uptime', name: 'Uptime (%)', color: '#0f9d58' },
        { dataKey: 'successRate', name: 'Success Rate (%)', color: '#0069cc' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * Pie chart config.
   */
  const pieChartConfig = useMemo(() => {
    return {
      dataKey: 'value',
      nameKey: 'name',
      showLegend: true,
      innerRadius: 40,
      outerRadius: '75%',
    };
  }, []);

  /**
   * Integration table columns.
   */
  const integrationColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Integration',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900 line-clamp-1">{value}</span>
        ),
      },
      {
        key: 'provider',
        label: 'Provider',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-600">{value}</span>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        sortable: true,
        render: (value) => (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
            {formatTypeLabel(value)}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
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
        key: 'healthMetrics',
        label: 'Uptime',
        sortable: false,
        render: (value) => {
          if (!value || !value.uptime) {
            return <span className="text-xs text-brand-gray-400">—</span>;
          }
          let colorClass = 'text-brand-green-600';
          if (value.uptime < 95) {
            colorClass = 'text-red-600';
          } else if (value.uptime < 99) {
            colorClass = 'text-yellow-600';
          }
          return (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-brand-gray-200 rounded-full max-w-[60px]">
                <div
                  className={`h-2 rounded-full ${value.uptime >= 99 ? 'bg-brand-green-500' : value.uptime >= 95 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(value.uptime, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${colorClass}`}>{value.uptime}%</span>
            </div>
          );
        },
      },
      {
        key: 'healthMetrics',
        label: 'Success Rate',
        sortable: false,
        render: (value) => {
          if (!value || !value.successRate) {
            return <span className="text-xs text-brand-gray-400">—</span>;
          }
          let colorClass = 'text-brand-green-600';
          if (value.successRate < 95) {
            colorClass = 'text-red-600';
          } else if (value.successRate < 99) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-medium ${colorClass}`}>{value.successRate}%</span>
          );
        },
      },
      {
        key: 'lastSync',
        label: 'Last Sync',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-500 whitespace-nowrap">
            {formatDisplayDateTime(value) || '—'}
          </span>
        ),
      },
      {
        key: 'owner',
        label: 'Owner',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
    ];
  }, []);

  /**
   * Sync history table columns for the detail modal.
   */
  const syncHistoryColumns = useMemo(() => {
    return [
      {
        key: 'syncDate',
        label: 'Sync Date',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-500 whitespace-nowrap">
            {formatDisplayDateTime(value) || '—'}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'recordsSynced',
        label: 'Records',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'duration',
        label: 'Duration',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-600">{value}s</span>
        ),
      },
      {
        key: 'errorMessage',
        label: 'Error',
        sortable: false,
        render: (value) => (
          <span className="text-xs text-red-600 line-clamp-2">{value || '—'}</span>
        ),
      },
    ];
  }, []);

  /**
   * Export data for the integration table.
   */
  const integrationExportData = useMemo(() => {
    return integrations.map((intg) => ({
      id: intg.id,
      name: intg.name,
      type: intg.type,
      provider: intg.provider,
      status: intg.status,
      enabled: intg.enabled,
      lastSync: intg.lastSync,
      owner: intg.owner,
      ownerEmail: intg.ownerEmail,
      description: intg.description,
      uptime: intg.healthMetrics ? intg.healthMetrics.uptime : '',
      successRate: intg.healthMetrics ? intg.healthMetrics.successRate : '',
      avgResponseTime: intg.healthMetrics ? intg.healthMetrics.avgResponseTime : '',
      totalRequests: intg.healthMetrics ? intg.healthMetrics.totalRequests : '',
      failedRequests: intg.healthMetrics ? intg.healthMetrics.failedRequests : '',
      lastError: intg.healthMetrics ? intg.healthMetrics.lastError : '',
      lastErrorDate: intg.healthMetrics ? intg.healthMetrics.lastErrorDate : '',
      baseUrl: intg.config ? intg.config.baseUrl : '',
      authType: intg.config ? intg.config.authType : '',
      apiVersion: intg.config ? intg.config.apiVersion : '',
      syncHistoryCount: intg.syncHistory ? intg.syncHistory.length : 0,
    }));
  }, [integrations]);

  /**
   * Handles clicking an integration row to open the detail modal.
   *
   * @param {Object} intg - The integration object
   */
  const handleRowClick = useCallback((intg) => {
    setSelectedIntegration(intg);
    setDetailModalOpen(true);
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedIntegration(null);
  }, []);

  /**
   * Opens the edit integration modal.
   *
   * @param {Object} intg - The integration to edit
   */
  const handleOpenEdit = useCallback((intg) => {
    setSelectedIntegration(intg);
    setEditForm({
      status: intg.status || 'Connected',
      enabled: intg.enabled !== false,
      description: intg.description || '',
    });
    setEditFormError(null);
    setEditModalOpen(true);
  }, []);

  /**
   * Closes the edit integration modal.
   */
  const handleCloseEdit = useCallback(() => {
    setEditModalOpen(false);
    setEditFormError(null);
  }, []);

  /**
   * Handles edit form field changes.
   *
   * @param {string} field - The field name
   * @param {*} value - The new value
   */
  const handleEditFormChange = useCallback((field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handles submitting the edit integration form.
   */
  const handleEditSubmit = useCallback(async () => {
    setEditFormError(null);

    if (!selectedIntegration) {
      setEditFormError('No integration selected.');
      return;
    }

    setEditSubmitting(true);

    try {
      await updateIntegration(selectedIntegration.id, {
        status: editForm.status,
        enabled: editForm.enabled,
        description: editForm.description.trim(),
      });

      try {
        logAction(
          'config_change',
          `Updated integration: ${selectedIntegration.name} (${selectedIntegration.id}). Status: ${editForm.status}. Enabled: ${editForm.enabled}.`,
          'Integration',
          selectedIntegration.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setEditModalOpen(false);
      setDetailModalOpen(false);
      setSelectedIntegration(null);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to update integration.';
      setEditFormError(errorMessage);
    } finally {
      setEditSubmitting(false);
    }
  }, [editForm, selectedIntegration, fetchData]);

  /**
   * Handles toggling an integration's enabled state.
   *
   * @param {Object} intg - The integration to toggle
   */
  const handleToggle = useCallback(async (intg) => {
    if (!intg) {
      return;
    }

    setToggleSubmitting(true);

    try {
      await toggleIntegration(intg.id);

      try {
        logAction(
          'config_change',
          `Toggled integration: ${intg.name} (${intg.id}). Enabled: ${!intg.enabled}.`,
          'Integration',
          intg.id,
          { status: 'success', previousValue: String(intg.enabled), newValue: String(!intg.enabled) }
        );
      } catch {
        // Ignore audit log errors
      }

      setDetailModalOpen(false);
      setSelectedIntegration(null);
      fetchData();
    } catch {
      // Ignore toggle errors
    } finally {
      setToggleSubmitting(false);
    }
  }, [fetchData]);

  /**
   * Handles triggering a sync for an integration.
   *
   * @param {Object} intg - The integration to sync
   */
  const handleSync = useCallback(async (intg) => {
    if (!intg) {
      return;
    }

    setSyncSubmitting(true);

    try {
      await simulateIntegrationSync(intg.id);

      try {
        logAction(
          'config_change',
          `Triggered sync for integration: ${intg.name} (${intg.id}).`,
          'Integration',
          intg.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      // Refresh the selected integration
      const refreshed = await getIntegrationById(intg.id);
      if (refreshed) {
        setSelectedIntegration(refreshed);
      }

      fetchData();
    } catch {
      // Ignore sync errors
    } finally {
      setSyncSubmitting(false);
    }
  }, [fetchData]);

  /**
   * Checks if the current user can perform data entry actions.
   */
  const canEdit = useMemo(() => {
    return hasPermission('data_entry');
  }, [hasPermission]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading integrations..." showLabel />
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-brand-gray-900">
              Integration Management
            </h1>
            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300">
              Simulated
            </span>
          </div>
          <p className="text-sm text-brand-gray-500 mt-1">
            Manage external integrations, monitor health status, and track synchronization across all connected services
          </p>
        </div>
        {integrationExportData.length > 0 && (
          <ExportButton
            data={integrationExportData}
            filename="integration-management"
            title="Integration Management Report"
            sheetName="Integrations"
            label="Export"
            size="md"
          />
        )}
      </div>

      {/* Simulated Integration Disclaimer */}
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
            Simulated Integrations
          </p>
          <p className="text-xs text-yellow-700 mt-0.5 leading-relaxed">
            All integrations displayed on this page are simulated for demonstration purposes.
            No real connections to external services are established. Health metrics, sync history,
            and configuration data are mock values stored in localStorage.
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filterConfig}
        values={filterValues}
        onChange={handleFilterChange}
        onClearAll={handleClearAll}
        showSearch={false}
      />

      {/* Summary KPI Cards */}
      {summaryKPIs && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <MetricCard
            label="Total Integrations"
            value={summaryKPIs.total}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <MetricCard
            label="Connected"
            value={summaryKPIs.connectedCount}
            trend="up"
            trendValue={summaryKPIs.total > 0 ? `${Math.round((summaryKPIs.connectedCount / summaryKPIs.total) * 100)}%` : '0%'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Disconnected"
            value={summaryKPIs.disconnectedCount}
            trend={summaryKPIs.disconnectedCount > 0 ? 'down' : 'up'}
            trendValue={summaryKPIs.disconnectedCount > 0 ? 'Action needed' : 'None'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            }
          />
          <MetricCard
            label="Error"
            value={summaryKPIs.errorCount}
            trend={summaryKPIs.errorCount > 0 ? 'down' : 'up'}
            trendValue={summaryKPIs.errorCount > 0 ? 'Critical' : 'None'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <MetricCard
            label="Enabled"
            value={summaryKPIs.enabledCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <MetricCard
            label="Avg Uptime"
            value={summaryKPIs.avgUptime}
            trend={summaryKPIs.avgUptime >= 99 ? 'up' : summaryKPIs.avgUptime >= 95 ? 'neutral' : 'down'}
            trendValue={summaryKPIs.avgUptime >= 99 ? 'Good' : summaryKPIs.avgUptime >= 95 ? 'Fair' : 'Low'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <MetricCard
            label="Avg Success Rate"
            value={summaryKPIs.avgSuccessRate}
            trend={summaryKPIs.avgSuccessRate >= 98 ? 'up' : summaryKPIs.avgSuccessRate >= 95 ? 'neutral' : 'down'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <MetricCard
            label="Avg Response"
            value={summaryKPIs.avgResponseTime}
            trend={summaryKPIs.avgResponseTime <= 300 ? 'up' : summaryKPIs.avgResponseTime <= 500 ? 'neutral' : 'down'}
            suffix="ms"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        {statusDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={statusDistributionData}
              config={pieChartConfig}
              title="Status Distribution"
              subtitle="Integrations by connection status"
              height={280}
              loading={false}
              emptyMessage="No status data available"
            />
          </div>
        )}

        {/* Type Distribution */}
        {typeDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={typeDistributionData}
              config={pieChartConfig}
              title="Type Distribution"
              subtitle="Integrations by category"
              height={280}
              loading={false}
              emptyMessage="No type data available"
            />
          </div>
        )}

        {/* Uptime & Success Rate Bar Chart */}
        {uptimeChartData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="bar"
              data={uptimeChartData}
              config={uptimeBarConfig}
              title="Health Metrics"
              subtitle="Uptime and success rate by integration"
              height={280}
              loading={false}
              emptyMessage="No health data available"
            />
          </div>
        )}
      </div>

      {/* Integrations with Issues */}
      {integrations.some((intg) => intg.status === 'Error' || intg.status === 'Disconnected') && (
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-brand-gray-900">
              Integrations Requiring Attention
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations
              .filter((intg) => intg.status === 'Error' || intg.status === 'Disconnected')
              .map((intg) => {
                const isError = intg.status === 'Error';
                return (
                  <div
                    key={intg.id}
                    className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isError ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-brand-gray-50 border-brand-gray-200 hover:bg-brand-gray-100'
                    }`}
                    onClick={() => handleRowClick(intg)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRowClick(intg);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View integration ${intg.name}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className={`w-5 h-5 ${isError ? 'text-red-500' : 'text-brand-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-brand-gray-900 truncate">{intg.name}</p>
                        <StatusBadge status={intg.status} size="sm" />
                      </div>
                      <p className="text-xs text-brand-gray-500 mt-0.5">{intg.provider}</p>
                      {intg.healthMetrics && intg.healthMetrics.lastError && (
                        <p className="text-xs text-red-600 mt-1 line-clamp-2">
                          {intg.healthMetrics.lastError}
                        </p>
                      )}
                      {intg.healthMetrics && intg.healthMetrics.lastErrorDate && (
                        <p className="text-[10px] text-brand-gray-400 mt-0.5">
                          Last error: {formatDisplayDateTime(intg.healthMetrics.lastErrorDate)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Integrations Table */}
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-brand-gray-900">
            All Integrations
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({integrations.length})
          </span>
        </div>
        {integrations.length > 0 ? (
          <DataTable
            columns={integrationColumns}
            data={integrations}
            pageSize={10}
            selectable={false}
            searchFields={['name', 'provider', 'type', 'status', 'owner', 'description']}
            emptyMessage="No integrations match the selected filters."
            rowKeyField="id"
            onRowClick={handleRowClick}
            storageKey="integration-management-table"
          />
        ) : (
          <EmptyState
            title="No integrations found"
            description="No integrations match the selected filters. Try adjusting your filter criteria."
            actionLabel="Clear Filters"
            onAction={handleClearAll}
          />
        )}
      </div>

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{integrations.filter((i) => i.status === 'Connected').length} Connected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{integrations.filter((i) => i.status === 'Disconnected').length} Disconnected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{integrations.filter((i) => i.status === 'Error').length} Error</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{integrations.filter((i) => i.enabled).length} Enabled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{integrations.filter((i) => !i.enabled).length} Disabled</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            All integrations are simulated · No real connections
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
        title={selectedIntegration ? selectedIntegration.name : ''}
        size="xl"
      >
        {selectedIntegration && (
          <div className="space-y-6">
            {/* Status and Type */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedIntegration.status} size="md" />
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
                {formatTypeLabel(selectedIntegration.type)}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 ring-1 ring-inset ring-brand-gray-300">
                {selectedIntegration.provider}
              </span>
              {selectedIntegration.enabled ? (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-green-50 text-brand-green-700 ring-1 ring-inset ring-brand-green-300">
                  Enabled
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 ring-1 ring-inset ring-brand-gray-300">
                  Disabled
                </span>
              )}
              {selectedIntegration.status === 'Error' && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-300">
                  Requires Attention
                </span>
              )}
            </div>

            {/* Description */}
            {selectedIntegration.description && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-sm text-brand-gray-700 leading-relaxed">
                  {selectedIntegration.description}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Provider</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedIntegration.provider}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Owner</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedIntegration.owner}</p>
                {selectedIntegration.ownerEmail && (
                  <p className="text-xs text-brand-gray-500 truncate">{selectedIntegration.ownerEmail}</p>
                )}
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Last Sync</p>
                <p className="text-sm font-medium text-brand-gray-900">
                  {formatDisplayDateTime(selectedIntegration.lastSync) || '—'}
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Type</p>
                <p className="text-sm font-medium text-brand-gray-900">{formatTypeLabel(selectedIntegration.type)}</p>
              </div>
            </div>

            {/* Health Metrics */}
            {selectedIntegration.healthMetrics && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Health Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Uptime</p>
                    <p className={`text-sm font-semibold ${selectedIntegration.healthMetrics.uptime >= 99 ? 'text-brand-green-600' : selectedIntegration.healthMetrics.uptime >= 95 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {selectedIntegration.healthMetrics.uptime}%
                    </p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Success Rate</p>
                    <p className={`text-sm font-semibold ${selectedIntegration.healthMetrics.successRate >= 99 ? 'text-brand-green-600' : selectedIntegration.healthMetrics.successRate >= 95 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {selectedIntegration.healthMetrics.successRate}%
                    </p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Avg Response Time</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedIntegration.healthMetrics.avgResponseTime}ms</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Total Requests</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedIntegration.healthMetrics.totalRequests.toLocaleString()}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Failed Requests</p>
                    <p className={`text-sm font-semibold ${selectedIntegration.healthMetrics.failedRequests === 0 ? 'text-brand-green-600' : 'text-red-600'}`}>
                      {selectedIntegration.healthMetrics.failedRequests.toLocaleString()}
                    </p>
                  </div>
                  {selectedIntegration.healthMetrics.lastError && (
                    <div className="bg-red-50 rounded-lg p-3 sm:col-span-3">
                      <p className="text-xs text-brand-gray-500 mb-1">Last Error</p>
                      <p className="text-xs text-red-600 leading-relaxed">{selectedIntegration.healthMetrics.lastError}</p>
                      {selectedIntegration.healthMetrics.lastErrorDate && (
                        <p className="text-[10px] text-brand-gray-400 mt-1">
                          {formatDisplayDateTime(selectedIntegration.healthMetrics.lastErrorDate)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Configuration */}
            {selectedIntegration.config && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Configuration
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Base URL</p>
                    <p className="text-xs font-mono text-brand-gray-600 truncate">{selectedIntegration.config.baseUrl}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Auth Type</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedIntegration.config.authType}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">API Version</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedIntegration.config.apiVersion}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Timeout</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedIntegration.config.timeoutMs}ms</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Retry Attempts</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedIntegration.config.retryAttempts}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">SSL Verify</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedIntegration.config.sslVerify ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  {selectedIntegration.config.organization && (
                    <div className="bg-brand-gray-50 rounded-lg p-3">
                      <p className="text-xs text-brand-gray-500 mb-1">Organization</p>
                      <p className="text-sm font-medium text-brand-gray-900">{selectedIntegration.config.organization}</p>
                    </div>
                  )}
                  {selectedIntegration.config.projectKey && (
                    <div className="bg-brand-gray-50 rounded-lg p-3">
                      <p className="text-xs text-brand-gray-500 mb-1">Project Key</p>
                      <p className="text-xs font-mono text-brand-gray-600">{selectedIntegration.config.projectKey}</p>
                    </div>
                  )}
                  {selectedIntegration.config.webhookUrl && (
                    <div className="bg-brand-gray-50 rounded-lg p-3">
                      <p className="text-xs text-brand-gray-500 mb-1">Webhook URL</p>
                      <p className="text-xs font-mono text-brand-gray-600 truncate">{selectedIntegration.config.webhookUrl}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sync History */}
            {selectedIntegration.syncHistory && selectedIntegration.syncHistory.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Sync History ({selectedIntegration.syncHistory.length})
                </h3>
                <DataTable
                  columns={syncHistoryColumns}
                  data={selectedIntegration.syncHistory.map((s, i) => ({ ...s, id: s.id || `sync-${i}` }))}
                  pageSize={5}
                  selectable={false}
                  searchFields={['status', 'errorMessage']}
                  emptyMessage="No sync history available."
                  rowKeyField="id"
                  storageKey={`integration-detail-sync-${selectedIntegration.id}`}
                />
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-600">
              {selectedIntegration.createdAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Created: {formatDisplayDate(selectedIntegration.createdAt)}</span>
                </div>
              )}
              {selectedIntegration.updatedAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Updated: {formatDisplayDate(selectedIntegration.updatedAt)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {selectedIntegration.status === 'Connected' && (
                  <button
                    onClick={() => handleSync(selectedIntegration)}
                    disabled={syncSubmitting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{syncSubmitting ? 'Syncing...' : 'Trigger Sync'}</span>
                  </button>
                )}
                <button
                  onClick={() => handleOpenEdit(selectedIntegration)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Configure</span>
                </button>
                <button
                  onClick={() => handleToggle(selectedIntegration)}
                  disabled={toggleSubmitting}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedIntegration.enabled
                      ? 'text-yellow-700 bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'
                      : 'text-brand-green-700 bg-brand-green-50 border border-brand-green-200 hover:bg-brand-green-100'
                  }`}
                >
                  {selectedIntegration.enabled ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{toggleSubmitting ? 'Disabling...' : 'Disable'}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{toggleSubmitting ? 'Enabling...' : 'Enable'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Integration Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={handleCloseEdit}
        title={selectedIntegration ? `Configure: ${selectedIntegration.name}` : 'Configure Integration'}
        size="md"
      >
        {selectedIntegration && (
          <div className="space-y-4">
            {editFormError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{editFormError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm text-brand-gray-600">
              <span>Provider:</span>
              <span className="font-medium text-brand-gray-900">{selectedIntegration.provider}</span>
              <span className="text-brand-gray-400">·</span>
              <span>Type:</span>
              <span className="font-medium text-brand-gray-900">{formatTypeLabel(selectedIntegration.type)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-intg-status" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="edit-intg-status"
                  value={editForm.status}
                  onChange={(e) => handleEditFormChange('status', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                  disabled={editSubmitting}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em',
                  }}
                >
                  <option value="Connected">Connected</option>
                  <option value="Disconnected">Disconnected</option>
                  <option value="Error">Error</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Enabled
                </label>
                <div className="flex items-center gap-3 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.enabled}
                      onChange={(e) => handleEditFormChange('enabled', e.target.checked)}
                      className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                      disabled={editSubmitting}
                    />
                    <span className="text-sm text-brand-gray-700">
                      {editForm.enabled ? 'Integration is enabled' : 'Integration is disabled'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="edit-intg-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="edit-intg-description"
                value={editForm.description}
                onChange={(e) => handleEditFormChange('description', e.target.value)}
                placeholder="Brief description of the integration"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
                disabled={editSubmitting}
              />
            </div>

            {/* Simulated Note */}
            <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <svg className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-yellow-700">
                Configuration changes are simulated and stored in localStorage. No real integration connections are modified.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-gray-200">
              <button
                onClick={handleCloseEdit}
                disabled={editSubmitting}
                className="px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={editSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editSubmitting ? (
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
        )}
      </Modal>
    </div>
  );
}
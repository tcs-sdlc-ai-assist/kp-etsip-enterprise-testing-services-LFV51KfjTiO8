/**
 * EnvironmentManagement Component
 * Environment Management screen (FR-015): displays environment inventory in DataTable
 * with status badges (Available/InUse/Maintenance/Down), health check indicators,
 * booking calendar view, add/edit environment modals. Filter by type/status/application.
 * Uses localStorage environment data.
 * @module EnvironmentManagement
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import { getEnvironments } from '../../shared/services/executionService.js';
import { logAction } from '../../shared/services/auditLogService.js';
import { getItem, setItem } from '../../shared/services/storage.js';
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
 * localStorage key for environments data
 * @type {string}
 */
const ENVIRONMENTS_STORAGE_KEY = 'kp_etsip_environments';

/**
 * Status color mapping for charts.
 * @type {Object.<string, string>}
 */
const STATUS_COLORS = {
  Available: '#0f9d58',
  InUse: '#0069cc',
  Maintenance: '#f59e0b',
  Down: '#ef4444',
};

/**
 * Type color mapping for charts.
 * @type {Object.<string, string>}
 */
const TYPE_COLORS = {
  Dev: '#8b5cf6',
  QA: '#0069cc',
  Staging: '#f59e0b',
  UAT: '#f97316',
  Prod: '#0f9d58',
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
 * Loads environments from localStorage.
 * @returns {Array} Array of environment objects
 */
function loadEnvironmentsFromStorage() {
  const data = getItem(ENVIRONMENTS_STORAGE_KEY, null);
  if (!data || !Array.isArray(data)) {
    return [];
  }
  return data;
}

/**
 * Saves environments to localStorage.
 * @param {Array} environments - Array of environment objects
 * @returns {boolean} True if saved successfully
 */
function saveEnvironmentsToStorage(environments) {
  return setItem(ENVIRONMENTS_STORAGE_KEY, environments);
}

/**
 * Generates the next unique environment id.
 * @param {Array} environments - Current environments array
 * @returns {string} Next environment id
 */
function generateNextEnvId(environments) {
  let maxNum = 0;
  for (const env of environments) {
    const match = env.id.match(/^env-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `env-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * EnvironmentManagement page component.
 * Displays environment inventory with filtering, CRUD actions via modals,
 * booking calendar view, health check indicators, and summary KPIs with charts.
 *
 * @returns {React.ReactElement} The environment management page
 */
export default function EnvironmentManagement() {
  const { currentUser, role, hasPermission } = useAuth();

  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    type: '',
    status: '',
    application: '',
  });

  // Modal states
  const [selectedEnv, setSelectedEnv] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: '',
    type: 'QA',
    application: '',
    description: '',
  });
  const [addFormError, setAddFormError] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'QA',
    status: 'Available',
    application: '',
    description: '',
  });
  const [editFormError, setEditFormError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  /**
   * Fetches environments data.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const allEnvs = await getEnvironments();
      setEnvironments(allEnvs || []);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load environments.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

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
      application: '',
    });
  }, []);

  /**
   * Distinct types for filter dropdown.
   */
  const distinctTypes = useMemo(() => {
    const types = new Set();
    for (const env of environments) {
      if (env.type) {
        types.add(env.type);
      }
    }
    return Array.from(types).sort();
  }, [environments]);

  /**
   * Distinct statuses for filter dropdown.
   */
  const distinctStatuses = useMemo(() => {
    const statuses = new Set();
    for (const env of environments) {
      if (env.status) {
        statuses.add(env.status);
      }
    }
    return Array.from(statuses).sort();
  }, [environments]);

  /**
   * Distinct applications for filter dropdown.
   */
  const distinctApplications = useMemo(() => {
    const apps = new Set();
    for (const env of environments) {
      if (env.application) {
        apps.add(env.application);
      }
    }
    return Array.from(apps).sort();
  }, [environments]);

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
          label: t,
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
      {
        key: 'application',
        label: 'Application',
        placeholder: 'All Applications',
        options: distinctApplications.map((a) => ({
          value: a,
          label: a,
        })),
      },
    ];
  }, [distinctTypes, distinctStatuses, distinctApplications]);

  /**
   * Filtered environments based on current filter values.
   */
  const filteredEnvironments = useMemo(() => {
    let result = environments;

    if (filterValues.type) {
      result = result.filter((env) => env.type === filterValues.type);
    }

    if (filterValues.status) {
      result = result.filter((env) => env.status === filterValues.status);
    }

    if (filterValues.application) {
      result = result.filter((env) => env.application === filterValues.application);
    }

    return result;
  }, [environments, filterValues]);

  /**
   * Summary KPIs computed from all environments.
   */
  const summaryKPIs = useMemo(() => {
    if (!environments || environments.length === 0) {
      return null;
    }

    const total = environments.length;
    let availableCount = 0;
    let inUseCount = 0;
    let maintenanceCount = 0;
    let downCount = 0;
    let totalUptime = 0;
    let devCount = 0;
    let qaCount = 0;
    let stagingCount = 0;
    let uatCount = 0;
    let prodCount = 0;

    for (const env of environments) {
      if (env.status === 'Available') {
        availableCount++;
      } else if (env.status === 'InUse') {
        inUseCount++;
      } else if (env.status === 'Maintenance') {
        maintenanceCount++;
      } else if (env.status === 'Down') {
        downCount++;
      }

      totalUptime += env.uptime || 0;

      if (env.type === 'Dev') {
        devCount++;
      } else if (env.type === 'QA') {
        qaCount++;
      } else if (env.type === 'Staging') {
        stagingCount++;
      } else if (env.type === 'UAT') {
        uatCount++;
      } else if (env.type === 'Prod') {
        prodCount++;
      }
    }

    const avgUptime = total > 0 ? Math.round((totalUptime / total) * 100) / 100 : 0;

    return {
      total,
      availableCount,
      inUseCount,
      maintenanceCount,
      downCount,
      avgUptime,
      devCount,
      qaCount,
      stagingCount,
      uatCount,
      prodCount,
    };
  }, [environments]);

  /**
   * Status distribution chart data.
   */
  const statusDistributionData = useMemo(() => {
    const counts = {};
    for (const env of environments) {
      const status = env.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: STATUS_COLORS[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [environments]);

  /**
   * Type distribution chart data.
   */
  const typeDistributionData = useMemo(() => {
    const counts = {};
    for (const env of environments) {
      const type = env.type || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([type, count]) => ({
        name: type,
        value: count,
        color: TYPE_COLORS[type] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [environments]);

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
   * Uptime bar chart data.
   */
  const uptimeChartData = useMemo(() => {
    return filteredEnvironments
      .slice()
      .sort((a, b) => (a.uptime || 0) - (b.uptime || 0))
      .slice(0, 15)
      .map((env) => ({
        name: env.name.length > 25 ? env.name.substring(0, 22) + '...' : env.name,
        uptime: env.uptime || 0,
      }));
  }, [filteredEnvironments]);

  /**
   * Uptime bar chart config.
   */
  const uptimeBarConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'uptime', name: 'Uptime (%)', color: '#0f9d58' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * Upcoming bookings from all environments.
   */
  const upcomingBookings = useMemo(() => {
    const now = new Date().getTime();
    const bookings = [];

    for (const env of environments) {
      if (env.bookings && Array.isArray(env.bookings)) {
        for (const booking of env.bookings) {
          const endTime = new Date(booking.endTime).getTime();
          if (!isNaN(endTime) && endTime > now) {
            bookings.push({
              ...booking,
              environmentName: env.name,
              environmentId: env.id,
              environmentType: env.type,
            });
          }
        }
      }
    }

    bookings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return bookings.slice(0, 10);
  }, [environments]);

  /**
   * Environment table columns.
   */
  const environmentColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Environment',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900 line-clamp-1">{value}</span>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        sortable: true,
        render: (value) => (
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
            value === 'Prod' ? 'bg-brand-green-50 text-brand-green-700 ring-1 ring-inset ring-brand-green-300' :
            value === 'Staging' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300' :
            value === 'UAT' ? 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-300' :
            value === 'QA' ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300' :
            'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-300'
          }`}>
            {value}
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
        key: 'application',
        label: 'Application',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-600 truncate max-w-[150px] block">{value}</span>
        ),
      },
      {
        key: 'uptime',
        label: 'Uptime',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value < 95) {
            colorClass = 'text-red-600';
          } else if (value < 99) {
            colorClass = 'text-yellow-600';
          }
          return (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-brand-gray-200 rounded-full max-w-[60px]">
                <div
                  className={`h-2 rounded-full ${value >= 99 ? 'bg-brand-green-500' : value >= 95 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(value, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${colorClass}`}>{value}%</span>
            </div>
          );
        },
      },
      {
        key: 'owner',
        label: 'Owner',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'lastHealthCheck',
        label: 'Last Health Check',
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
   * Export data for the environment table.
   */
  const environmentExportData = useMemo(() => {
    return filteredEnvironments.map((env) => ({
      id: env.id,
      name: env.name,
      type: env.type,
      status: env.status,
      application: env.application,
      owner: env.owner,
      ownerEmail: env.ownerEmail,
      uptime: env.uptime,
      lastHealthCheck: env.lastHealthCheck,
      description: env.description,
      region: env.configuration ? env.configuration.region : '',
      os: env.configuration ? env.configuration.os : '',
      runtime: env.configuration ? env.configuration.runtime : '',
      database: env.configuration ? env.configuration.database : '',
      cpuCores: env.configuration ? env.configuration.cpuCores : '',
      memoryGB: env.configuration ? env.configuration.memoryGB : '',
      storageGB: env.configuration ? env.configuration.storageGB : '',
      bookingCount: env.bookings ? env.bookings.length : 0,
    }));
  }, [filteredEnvironments]);

  /**
   * Handles clicking an environment row to open the detail modal.
   *
   * @param {Object} env - The environment object
   */
  const handleRowClick = useCallback((env) => {
    setSelectedEnv(env);
    setDetailModalOpen(true);
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedEnv(null);
  }, []);

  /**
   * Opens the add environment modal.
   */
  const handleOpenAdd = useCallback(() => {
    setAddForm({
      name: '',
      type: 'QA',
      application: '',
      description: '',
    });
    setAddFormError(null);
    setAddModalOpen(true);
  }, []);

  /**
   * Closes the add environment modal.
   */
  const handleCloseAdd = useCallback(() => {
    setAddModalOpen(false);
    setAddFormError(null);
  }, []);

  /**
   * Handles add form field changes.
   *
   * @param {string} field - The field name
   * @param {string} value - The new value
   */
  const handleAddFormChange = useCallback((field, value) => {
    setAddForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handles submitting the add environment form.
   */
  const handleAddSubmit = useCallback(async () => {
    setAddFormError(null);

    if (!addForm.name || addForm.name.trim() === '') {
      setAddFormError('Environment name is required.');
      return;
    }

    if (!addForm.application || addForm.application.trim() === '') {
      setAddFormError('Application is required.');
      return;
    }

    setAddSubmitting(true);

    try {
      const allEnvs = loadEnvironmentsFromStorage();
      const now = new Date().toISOString();

      const newEnv = {
        id: generateNextEnvId(allEnvs),
        name: addForm.name.trim(),
        type: addForm.type,
        status: 'Available',
        application: addForm.application.trim(),
        owner: currentUser ? currentUser.name : 'System',
        ownerEmail: currentUser ? currentUser.email : 'system@kp-etsip.gov',
        lastHealthCheck: now,
        uptime: 100.0,
        configuration: {
          os: 'Ubuntu 22.04 LTS',
          runtime: 'Node.js 20.11.0',
          database: 'PostgreSQL 16.1',
          cpuCores: 4,
          memoryGB: 16,
          storageGB: 200,
          region: 'Windhoek-Secondary',
          sslEnabled: true,
          networkZone: `${addForm.type.toLowerCase()}-zone-new`,
        },
        bookings: [],
        description: addForm.description.trim(),
        createdAt: now,
        updatedAt: now,
      };

      allEnvs.push(newEnv);
      saveEnvironmentsToStorage(allEnvs);

      try {
        logAction(
          'create',
          `Created new environment: ${newEnv.name} (${newEnv.id}). Type: ${newEnv.type}. Application: ${newEnv.application}.`,
          'Environment',
          newEnv.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setAddModalOpen(false);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to create environment.';
      setAddFormError(errorMessage);
    } finally {
      setAddSubmitting(false);
    }
  }, [addForm, currentUser, fetchData]);

  /**
   * Opens the edit environment modal.
   *
   * @param {Object} env - The environment to edit
   */
  const handleOpenEdit = useCallback((env) => {
    setSelectedEnv(env);
    setEditForm({
      name: env.name || '',
      type: env.type || 'QA',
      status: env.status || 'Available',
      application: env.application || '',
      description: env.description || '',
    });
    setEditFormError(null);
    setEditModalOpen(true);
  }, []);

  /**
   * Closes the edit environment modal.
   */
  const handleCloseEdit = useCallback(() => {
    setEditModalOpen(false);
    setEditFormError(null);
  }, []);

  /**
   * Handles edit form field changes.
   *
   * @param {string} field - The field name
   * @param {string} value - The new value
   */
  const handleEditFormChange = useCallback((field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handles submitting the edit environment form.
   */
  const handleEditSubmit = useCallback(async () => {
    setEditFormError(null);

    if (!editForm.name || editForm.name.trim() === '') {
      setEditFormError('Environment name is required.');
      return;
    }

    if (!editForm.application || editForm.application.trim() === '') {
      setEditFormError('Application is required.');
      return;
    }

    setEditSubmitting(true);

    try {
      const allEnvs = loadEnvironmentsFromStorage();
      const index = allEnvs.findIndex((e) => e.id === selectedEnv.id);

      if (index === -1) {
        setEditFormError('Environment not found.');
        setEditSubmitting(false);
        return;
      }

      const previousStatus = allEnvs[index].status;

      allEnvs[index] = {
        ...allEnvs[index],
        name: editForm.name.trim(),
        type: editForm.type,
        status: editForm.status,
        application: editForm.application.trim(),
        description: editForm.description.trim(),
        updatedAt: new Date().toISOString(),
      };

      saveEnvironmentsToStorage(allEnvs);

      try {
        logAction(
          'update',
          `Updated environment: ${editForm.name.trim()} (${selectedEnv.id}). Status: ${editForm.status}.`,
          'Environment',
          selectedEnv.id,
          {
            status: 'success',
            previousValue: previousStatus,
            newValue: editForm.status,
          }
        );
      } catch {
        // Ignore audit log errors
      }

      setEditModalOpen(false);
      setDetailModalOpen(false);
      setSelectedEnv(null);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to update environment.';
      setEditFormError(errorMessage);
    } finally {
      setEditSubmitting(false);
    }
  }, [editForm, selectedEnv, fetchData]);

  /**
   * Checks if the current user can perform data entry actions.
   */
  const canEdit = useMemo(() => {
    return hasPermission('data_entry');
  }, [hasPermission]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading environments..." showLabel />
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
          <h1 className="text-2xl font-bold text-brand-gray-900">
            Environment Management
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Manage test environments, monitor health status, and track bookings across all applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Environment</span>
            </button>
          )}
          {environmentExportData.length > 0 && (
            <ExportButton
              data={environmentExportData}
              filename="environment-management"
              title="Environment Management Report"
              sheetName="Environments"
              label="Export"
              size="md"
            />
          )}
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
            label="Total Environments"
            value={summaryKPIs.total}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
          <MetricCard
            label="Available"
            value={summaryKPIs.availableCount}
            trend="up"
            trendValue={summaryKPIs.total > 0 ? `${Math.round((summaryKPIs.availableCount / summaryKPIs.total) * 100)}%` : '0%'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="In Use"
            value={summaryKPIs.inUseCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Maintenance"
            value={summaryKPIs.maintenanceCount}
            trend={summaryKPIs.maintenanceCount > 2 ? 'down' : 'neutral'}
            trendValue={summaryKPIs.maintenanceCount > 2 ? 'High' : ''}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Down"
            value={summaryKPIs.downCount}
            trend={summaryKPIs.downCount > 0 ? 'down' : 'up'}
            trendValue={summaryKPIs.downCount > 0 ? 'Action needed' : 'None'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
            label="Production"
            value={summaryKPIs.prodCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <MetricCard
            label="Non-Prod"
            value={summaryKPIs.devCount + summaryKPIs.qaCount + summaryKPIs.stagingCount + summaryKPIs.uatCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
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
              subtitle="Environments by current status"
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
              subtitle="Environments by type"
              height={280}
              loading={false}
              emptyMessage="No type data available"
            />
          </div>
        )}

        {/* Upcoming Bookings */}
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-sm font-semibold text-brand-gray-900">
              Upcoming Bookings
            </h3>
          </div>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between bg-brand-gray-50 rounded-lg p-2.5 border border-brand-gray-200"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brand-gray-900 truncate">
                      {booking.environmentName}
                    </p>
                    <p className="text-xs text-brand-gray-500 truncate">
                      {booking.application} · {booking.bookedBy}
                    </p>
                    <p className="text-[10px] text-brand-gray-400 truncate mt-0.5">
                      {booking.purpose}
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 ml-2">
                    <span className="text-xs text-brand-gray-500 whitespace-nowrap">
                      {formatDisplayDateTime(booking.startTime)}
                    </span>
                    <span className="text-[10px] text-brand-gray-400 whitespace-nowrap">
                      to {formatDisplayDateTime(booking.endTime)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-sm text-brand-gray-500">
              No upcoming bookings.
            </div>
          )}
        </div>
      </div>

      {/* Uptime Chart */}
      {uptimeChartData.length > 0 && (
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
          <ChartWrapper
            chartType="bar"
            data={uptimeChartData}
            config={uptimeBarConfig}
            title="Environment Uptime"
            subtitle="Uptime percentage by environment (sorted ascending)"
            height={300}
            loading={false}
            emptyMessage="No uptime data available"
          />
        </div>
      )}

      {/* Environments Table */}
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
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-brand-gray-900">
            All Environments
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({filteredEnvironments.length} of {environments.length})
          </span>
        </div>
        {filteredEnvironments.length > 0 ? (
          <DataTable
            columns={environmentColumns}
            data={filteredEnvironments}
            pageSize={10}
            selectable={false}
            searchFields={['name', 'type', 'status', 'application', 'owner', 'description']}
            emptyMessage="No environments match the selected filters."
            rowKeyField="id"
            onRowClick={handleRowClick}
            storageKey="environment-management-table"
          />
        ) : (
          <EmptyState
            title="No environments found"
            description="No environments match the selected filters. Try adjusting your filter criteria."
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
            <span>{environments.filter((e) => e.status === 'Available').length} Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{environments.filter((e) => e.status === 'InUse').length} In Use</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{environments.filter((e) => e.status === 'Maintenance').length} Maintenance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{environments.filter((e) => e.status === 'Down').length} Down</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{environments.filter((e) => e.type === 'Prod').length} Prod</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{environments.filter((e) => e.type === 'Staging').length} Staging</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{environments.filter((e) => e.type === 'QA').length} QA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>{environments.filter((e) => e.type === 'UAT').length} UAT</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>{environments.filter((e) => e.type === 'Dev').length} Dev</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            {filteredEnvironments.length !== environments.length
              ? `Showing ${filteredEnvironments.length} of ${environments.length} environments`
              : `Showing all ${environments.length} environments`}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
        title={selectedEnv ? selectedEnv.name : ''}
        size="xl"
      >
        {selectedEnv && (
          <div className="space-y-6">
            {/* Status and Type */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedEnv.status} size="md" />
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                selectedEnv.type === 'Prod' ? 'bg-brand-green-50 text-brand-green-700 ring-1 ring-inset ring-brand-green-300' :
                selectedEnv.type === 'Staging' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300' :
                selectedEnv.type === 'UAT' ? 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-300' :
                selectedEnv.type === 'QA' ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300' :
                'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-300'
              }`}>
                {selectedEnv.type}
              </span>
              {selectedEnv.status === 'Down' && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-300">
                  Requires Attention
                </span>
              )}
            </div>

            {/* Description */}
            {selectedEnv.description && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-sm text-brand-gray-700 leading-relaxed">
                  {selectedEnv.description}
                </p>
              </div>
            )}

            {/* Health & Uptime */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Uptime</p>
                <p className={`text-xl font-bold ${selectedEnv.uptime >= 99 ? 'text-brand-green-600' : selectedEnv.uptime >= 95 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {selectedEnv.uptime}%
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Application</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedEnv.application}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Owner</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedEnv.owner}</p>
                {selectedEnv.ownerEmail && (
                  <p className="text-xs text-brand-gray-500 truncate">{selectedEnv.ownerEmail}</p>
                )}
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Last Health Check</p>
                <p className="text-sm font-medium text-brand-gray-900">
                  {formatDisplayDateTime(selectedEnv.lastHealthCheck) || '—'}
                </p>
              </div>
            </div>

            {/* Configuration */}
            {selectedEnv.configuration && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Configuration
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">OS</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedEnv.configuration.os}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Runtime</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedEnv.configuration.runtime}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Database</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedEnv.configuration.database}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">CPU Cores</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedEnv.configuration.cpuCores}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Memory</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedEnv.configuration.memoryGB} GB</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Storage</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedEnv.configuration.storageGB} GB</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Region</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedEnv.configuration.region}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">SSL</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedEnv.configuration.sslEnabled ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Network Zone</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedEnv.configuration.networkZone}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bookings */}
            {selectedEnv.bookings && selectedEnv.bookings.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Active Bookings ({selectedEnv.bookings.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedEnv.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between bg-brand-gray-50 rounded-lg p-3 border border-brand-gray-200"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-brand-gray-900">{booking.application}</p>
                        <p className="text-xs text-brand-gray-500">Booked by: {booking.bookedBy}</p>
                        <p className="text-xs text-brand-gray-400 mt-0.5">{booking.purpose}</p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0 ml-3">
                        <span className="text-xs text-brand-gray-500 whitespace-nowrap">
                          {formatDisplayDateTime(booking.startTime)}
                        </span>
                        <span className="text-[10px] text-brand-gray-400 whitespace-nowrap">
                          to {formatDisplayDateTime(booking.endTime)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-600">
              {selectedEnv.createdAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Created: {formatDisplayDate(selectedEnv.createdAt)}</span>
                </div>
              )}
              {selectedEnv.updatedAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Updated: {formatDisplayDate(selectedEnv.updatedAt)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => handleOpenEdit(selectedEnv)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Environment Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={handleCloseAdd}
        title="New Environment"
        size="lg"
      >
        <div className="space-y-4">
          {addFormError && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{addFormError}</p>
            </div>
          )}

          <div>
            <label htmlFor="env-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Environment Name <span className="text-red-500">*</span>
            </label>
            <input
              id="env-name"
              type="text"
              value={addForm.name}
              onChange={(e) => handleAddFormChange('name', e.target.value)}
              placeholder="Enter environment name"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              disabled={addSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="env-type" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Type
              </label>
              <select
                id="env-type"
                value={addForm.type}
                onChange={(e) => handleAddFormChange('type', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={addSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="Dev">Dev</option>
                <option value="QA">QA</option>
                <option value="Staging">Staging</option>
                <option value="UAT">UAT</option>
                <option value="Prod">Prod</option>
              </select>
            </div>

            <div>
              <label htmlFor="env-application" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Application <span className="text-red-500">*</span>
              </label>
              <input
                id="env-application"
                type="text"
                value={addForm.application}
                onChange={(e) => handleAddFormChange('application', e.target.value)}
                placeholder="Application name"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={addSubmitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="env-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="env-description"
              value={addForm.description}
              onChange={(e) => handleAddFormChange('description', e.target.value)}
              placeholder="Brief description of the environment"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
              disabled={addSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-gray-200">
            <button
              onClick={handleCloseAdd}
              disabled={addSubmitting}
              className="px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSubmit}
              disabled={addSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Environment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Environment Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={handleCloseEdit}
        title={selectedEnv ? `Edit: ${selectedEnv.name}` : 'Edit Environment'}
        size="lg"
      >
        {selectedEnv && (
          <div className="space-y-4">
            {editFormError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{editFormError}</p>
              </div>
            )}

            <div>
              <label htmlFor="edit-env-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Environment Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-env-name"
                type="text"
                value={editForm.name}
                onChange={(e) => handleEditFormChange('name', e.target.value)}
                placeholder="Enter environment name"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={editSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="edit-env-type" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="edit-env-type"
                  value={editForm.type}
                  onChange={(e) => handleEditFormChange('type', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                  disabled={editSubmitting}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em',
                  }}
                >
                  <option value="Dev">Dev</option>
                  <option value="QA">QA</option>
                  <option value="Staging">Staging</option>
                  <option value="UAT">UAT</option>
                  <option value="Prod">Prod</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-env-status" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="edit-env-status"
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
                  <option value="Available">Available</option>
                  <option value="InUse">In Use</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Down">Down</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-env-application" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Application <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-env-application"
                  type="text"
                  value={editForm.application}
                  onChange={(e) => handleEditFormChange('application', e.target.value)}
                  placeholder="Application name"
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  disabled={editSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="edit-env-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="edit-env-description"
                value={editForm.description}
                onChange={(e) => handleEditFormChange('description', e.target.value)}
                placeholder="Brief description of the environment"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
                disabled={editSubmitting}
              />
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
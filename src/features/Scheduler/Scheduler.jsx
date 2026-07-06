/**
 * Scheduler Component
 * Scheduler screen (FR-013): displays test execution schedules in DataTable
 * with create/edit/delete/pause/resume actions via modals.
 * Shows next run, last run, frequency, status.
 * Uses schedulerService. Filter by application/frequency/status.
 * @module Scheduler
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getSchedules,
  configureSchedule,
  updateSchedule,
  deleteSchedule,
  pauseSchedule,
  resumeSchedule,
  triggerSchedule,
  getDistinctApplications,
  getDistinctStatuses,
  getDistinctFrequencies,
  getDistinctEnvironments,
  getScheduleCountByStatus,
  getScheduleCountByFrequency,
} from '../../shared/services/schedulerService.js';
import { getDistinctTestAssetSuites } from '../../shared/services/repositoryService.js';
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
  Active: '#0f9d58',
  Paused: '#f59e0b',
  Completed: '#939ba3',
};

/**
 * Frequency color mapping for charts.
 * @type {Object.<string, string>}
 */
const FREQUENCY_COLORS = {
  Daily: '#0069cc',
  Weekly: '#0f9d58',
  Monthly: '#f59e0b',
  OnDemand: '#8b5cf6',
};

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
 * Scheduler page component.
 * Displays test execution schedules with filtering, CRUD actions via modals,
 * and summary KPIs with charts.
 *
 * @returns {React.ReactElement} The scheduler page
 */
export default function Scheduler() {
  const { currentUser, role, hasPermission } = useAuth();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    application: '',
    frequency: '',
    status: '',
    environment: '',
  });

  // Distinct values for filter dropdowns
  const [distinctApplications, setDistinctApplications] = useState([]);
  const [distinctStatuses, setDistinctStatuses] = useState([]);
  const [distinctFrequencies, setDistinctFrequencies] = useState([]);
  const [distinctEnvironments, setDistinctEnvironments] = useState([]);
  const [distinctSuites, setDistinctSuites] = useState([]);

  // Modal states
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: '',
    testSuiteId: '',
    application: '',
    frequency: 'Daily',
    cron: '',
    environment: 'QA',
    description: '',
  });
  const [addFormError, setAddFormError] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    frequency: 'Daily',
    cron: '',
    environment: 'QA',
    description: '',
  });
  const [editFormError, setEditFormError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete state
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Trigger state
  const [triggerSubmitting, setTriggerSubmitting] = useState(false);

  /**
   * Loads distinct filter values.
   */
  useEffect(() => {
    try {
      setDistinctApplications(getDistinctApplications());
      setDistinctStatuses(getDistinctStatuses());
      setDistinctFrequencies(getDistinctFrequencies());
      setDistinctEnvironments(getDistinctEnvironments());
    } catch {
      // Ignore errors loading distinct values
    }

    try {
      const suites = getDistinctTestAssetSuites();
      setDistinctSuites(suites);
    } catch {
      setDistinctSuites([]);
    }
  }, []);

  /**
   * Fetches schedules based on current filters.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {};

      if (filterValues.application) {
        filters.application = filterValues.application;
      }

      if (filterValues.frequency) {
        filters.frequency = filterValues.frequency;
      }

      if (filterValues.status) {
        filters.status = filterValues.status;
      }

      if (filterValues.environment) {
        filters.environment = filterValues.environment;
      }

      const result = await getSchedules(filters);
      setSchedules(result.schedules || []);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load schedules.';
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
      application: '',
      frequency: '',
      status: '',
      environment: '',
    });
  }, []);

  /**
   * Builds the filter configuration for the FilterBar.
   */
  const filterConfig = useMemo(() => {
    return [
      {
        key: 'application',
        label: 'Application',
        placeholder: 'All Applications',
        options: distinctApplications.map((a) => ({
          value: a,
          label: a,
        })),
      },
      {
        key: 'frequency',
        label: 'Frequency',
        placeholder: 'All Frequencies',
        options: distinctFrequencies.map((f) => ({
          value: f,
          label: f,
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
        key: 'environment',
        label: 'Environment',
        placeholder: 'All Environments',
        options: distinctEnvironments.map((e) => ({
          value: e,
          label: e,
        })),
      },
    ];
  }, [distinctApplications, distinctFrequencies, distinctStatuses, distinctEnvironments]);

  /**
   * Summary KPIs computed from all schedules.
   */
  const summaryKPIs = useMemo(() => {
    if (!schedules || schedules.length === 0) {
      return null;
    }

    const total = schedules.length;
    let activeCount = 0;
    let pausedCount = 0;
    let completedCount = 0;
    let dailyCount = 0;
    let weeklyCount = 0;
    let monthlyCount = 0;
    let onDemandCount = 0;

    for (const schedule of schedules) {
      if (schedule.status === 'Active') {
        activeCount++;
      } else if (schedule.status === 'Paused') {
        pausedCount++;
      } else if (schedule.status === 'Completed') {
        completedCount++;
      }

      if (schedule.frequency === 'Daily') {
        dailyCount++;
      } else if (schedule.frequency === 'Weekly') {
        weeklyCount++;
      } else if (schedule.frequency === 'Monthly') {
        monthlyCount++;
      } else if (schedule.frequency === 'OnDemand') {
        onDemandCount++;
      }
    }

    // Find next upcoming run
    let nextUpcomingRun = null;
    const now = new Date().getTime();
    for (const schedule of schedules) {
      if (schedule.status === 'Active' && schedule.nextRun) {
        const nextRunTime = new Date(schedule.nextRun).getTime();
        if (!isNaN(nextRunTime) && nextRunTime > now) {
          if (!nextUpcomingRun || nextRunTime < new Date(nextUpcomingRun).getTime()) {
            nextUpcomingRun = schedule.nextRun;
          }
        }
      }
    }

    return {
      total,
      activeCount,
      pausedCount,
      completedCount,
      dailyCount,
      weeklyCount,
      monthlyCount,
      onDemandCount,
      nextUpcomingRun,
    };
  }, [schedules]);

  /**
   * Status distribution chart data.
   */
  const statusDistributionData = useMemo(() => {
    const counts = {};
    for (const schedule of schedules) {
      const status = schedule.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: STATUS_COLORS[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [schedules]);

  /**
   * Frequency distribution chart data.
   */
  const frequencyDistributionData = useMemo(() => {
    const counts = {};
    for (const schedule of schedules) {
      const frequency = schedule.frequency || 'Unknown';
      counts[frequency] = (counts[frequency] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([frequency, count]) => ({
        name: frequency === 'OnDemand' ? 'On Demand' : frequency,
        value: count,
        color: FREQUENCY_COLORS[frequency] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [schedules]);

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
   * Upcoming schedules for calendar-style view.
   */
  const upcomingSchedules = useMemo(() => {
    const now = new Date().getTime();
    return schedules
      .filter((s) => s.status === 'Active' && s.nextRun && new Date(s.nextRun).getTime() > now)
      .sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime())
      .slice(0, 10);
  }, [schedules]);

  /**
   * Schedule table columns.
   */
  const scheduleColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Schedule',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900 line-clamp-1">{value}</span>
        ),
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
        key: 'frequency',
        label: 'Frequency',
        sortable: true,
        render: (value) => (
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
            value === 'Daily' ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300' :
            value === 'Weekly' ? 'bg-brand-green-50 text-brand-green-700 ring-1 ring-inset ring-brand-green-300' :
            value === 'Monthly' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300' :
            'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-300'
          }`}>
            {value === 'OnDemand' ? 'On Demand' : value}
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
        key: 'environment',
        label: 'Env',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-600">{value}</span>
        ),
      },
      {
        key: 'nextRun',
        label: 'Next Run',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-500 whitespace-nowrap">
            {value ? formatDisplayDateTime(value) : '—'}
          </span>
        ),
      },
      {
        key: 'lastRun',
        label: 'Last Run',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-500 whitespace-nowrap">
            {value ? formatDisplayDateTime(value) : '—'}
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
   * Export data for the schedule table.
   */
  const scheduleExportData = useMemo(() => {
    return schedules.map((schedule) => ({
      id: schedule.id,
      name: schedule.name,
      testSuiteId: schedule.testSuiteId,
      application: schedule.application,
      frequency: schedule.frequency,
      status: schedule.status,
      environment: schedule.environment,
      nextRun: schedule.nextRun,
      lastRun: schedule.lastRun,
      owner: schedule.owner,
      ownerEmail: schedule.ownerEmail,
      cron: schedule.cron,
      description: schedule.description,
      createdDate: schedule.createdDate,
    }));
  }, [schedules]);

  /**
   * Handles clicking a schedule row to open the detail modal.
   *
   * @param {Object} schedule - The schedule object
   */
  const handleRowClick = useCallback((schedule) => {
    setSelectedSchedule(schedule);
    setDetailModalOpen(true);
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedSchedule(null);
  }, []);

  /**
   * Opens the add schedule modal.
   */
  const handleOpenAdd = useCallback(() => {
    setAddForm({
      name: '',
      testSuiteId: '',
      application: '',
      frequency: 'Daily',
      cron: '',
      environment: 'QA',
      description: '',
    });
    setAddFormError(null);
    setAddModalOpen(true);
  }, []);

  /**
   * Closes the add schedule modal.
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
   * Handles submitting the add schedule form.
   */
  const handleAddSubmit = useCallback(async () => {
    setAddFormError(null);

    if (!addForm.name || addForm.name.trim() === '') {
      setAddFormError('Schedule name is required.');
      return;
    }

    if (!addForm.application || addForm.application.trim() === '') {
      setAddFormError('Application is required.');
      return;
    }

    if (!addForm.testSuiteId || addForm.testSuiteId.trim() === '') {
      setAddFormError('Test suite is required.');
      return;
    }

    setAddSubmitting(true);

    try {
      const newSchedule = await configureSchedule({
        name: addForm.name.trim(),
        testSuiteId: addForm.testSuiteId.trim(),
        application: addForm.application.trim(),
        frequency: addForm.frequency,
        cron: addForm.cron.trim(),
        environment: addForm.environment,
        description: addForm.description.trim(),
        enabled: true,
      });

      try {
        logAction(
          'create',
          `Created new schedule: ${newSchedule.name} (${newSchedule.id}). Application: ${newSchedule.application}. Frequency: ${newSchedule.frequency}.`,
          'Schedule',
          newSchedule.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setAddModalOpen(false);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to create schedule.';
      setAddFormError(errorMessage);
    } finally {
      setAddSubmitting(false);
    }
  }, [addForm, fetchData]);

  /**
   * Opens the edit schedule modal.
   *
   * @param {Object} schedule - The schedule to edit
   */
  const handleOpenEdit = useCallback((schedule) => {
    setSelectedSchedule(schedule);
    setEditForm({
      name: schedule.name || '',
      frequency: schedule.frequency || 'Daily',
      cron: schedule.cron || '',
      environment: schedule.environment || 'QA',
      description: schedule.description || '',
    });
    setEditFormError(null);
    setEditModalOpen(true);
  }, []);

  /**
   * Closes the edit schedule modal.
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
   * Handles submitting the edit schedule form.
   */
  const handleEditSubmit = useCallback(async () => {
    setEditFormError(null);

    if (!editForm.name || editForm.name.trim() === '') {
      setEditFormError('Schedule name is required.');
      return;
    }

    setEditSubmitting(true);

    try {
      await updateSchedule(selectedSchedule.id, {
        name: editForm.name.trim(),
        frequency: editForm.frequency,
        cron: editForm.cron.trim(),
        environment: editForm.environment,
        description: editForm.description.trim(),
      });

      try {
        logAction(
          'update',
          `Updated schedule: ${editForm.name.trim()} (${selectedSchedule.id}).`,
          'Schedule',
          selectedSchedule.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setEditModalOpen(false);
      setDetailModalOpen(false);
      setSelectedSchedule(null);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to update schedule.';
      setEditFormError(errorMessage);
    } finally {
      setEditSubmitting(false);
    }
  }, [editForm, selectedSchedule, fetchData]);

  /**
   * Opens the delete confirmation modal.
   *
   * @param {Object} schedule - The schedule to delete
   */
  const handleOpenDelete = useCallback((schedule) => {
    setSelectedSchedule(schedule);
    setDeleteModalOpen(true);
  }, []);

  /**
   * Closes the delete confirmation modal.
   */
  const handleCloseDelete = useCallback(() => {
    setDeleteModalOpen(false);
  }, []);

  /**
   * Handles deleting a schedule.
   */
  const handleDeleteSubmit = useCallback(async () => {
    if (!selectedSchedule) {
      return;
    }

    setDeleteSubmitting(true);

    try {
      await deleteSchedule(selectedSchedule.id);

      try {
        logAction(
          'delete',
          `Deleted schedule: ${selectedSchedule.name} (${selectedSchedule.id}).`,
          'Schedule',
          selectedSchedule.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setDeleteModalOpen(false);
      setDetailModalOpen(false);
      setSelectedSchedule(null);
      fetchData();
    } catch {
      setDeleteModalOpen(false);
    } finally {
      setDeleteSubmitting(false);
    }
  }, [selectedSchedule, fetchData]);

  /**
   * Handles pausing a schedule.
   *
   * @param {Object} schedule - The schedule to pause
   */
  const handlePause = useCallback(async (schedule) => {
    if (!schedule) {
      return;
    }

    try {
      await pauseSchedule(schedule.id);

      setDetailModalOpen(false);
      setSelectedSchedule(null);
      fetchData();
    } catch {
      // Ignore pause errors
    }
  }, [fetchData]);

  /**
   * Handles resuming a schedule.
   *
   * @param {Object} schedule - The schedule to resume
   */
  const handleResume = useCallback(async (schedule) => {
    if (!schedule) {
      return;
    }

    try {
      await resumeSchedule(schedule.id);

      setDetailModalOpen(false);
      setSelectedSchedule(null);
      fetchData();
    } catch {
      // Ignore resume errors
    }
  }, [fetchData]);

  /**
   * Handles triggering a schedule.
   *
   * @param {Object} schedule - The schedule to trigger
   */
  const handleTrigger = useCallback(async (schedule) => {
    if (!schedule) {
      return;
    }

    setTriggerSubmitting(true);

    try {
      await triggerSchedule(schedule.id);

      try {
        logAction(
          'update',
          `Triggered schedule: ${schedule.name} (${schedule.id}).`,
          'Schedule',
          schedule.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setDetailModalOpen(false);
      setSelectedSchedule(null);
      fetchData();
    } catch {
      // Ignore trigger errors
    } finally {
      setTriggerSubmitting(false);
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
        <LoadingSpinner size="lg" label="Loading schedules..." showLabel />
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
            Test Execution Scheduler
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Configure, manage, and monitor test execution schedules across all applications
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
              <span>New Schedule</span>
            </button>
          )}
          {scheduleExportData.length > 0 && (
            <ExportButton
              data={scheduleExportData}
              filename="test-execution-schedules"
              title="Test Execution Schedules Report"
              sheetName="Schedules"
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
            label="Total Schedules"
            value={summaryKPIs.total}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <MetricCard
            label="Active"
            value={summaryKPIs.activeCount}
            trend="up"
            trendValue={summaryKPIs.total > 0 ? `${Math.round((summaryKPIs.activeCount / summaryKPIs.total) * 100)}%` : '0%'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Paused"
            value={summaryKPIs.pausedCount}
            trend={summaryKPIs.pausedCount > 3 ? 'down' : 'neutral'}
            trendValue={summaryKPIs.pausedCount > 3 ? 'Review needed' : ''}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Completed"
            value={summaryKPIs.completedCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <MetricCard
            label="Daily"
            value={summaryKPIs.dailyCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Weekly"
            value={summaryKPIs.weeklyCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <MetricCard
            label="Monthly"
            value={summaryKPIs.monthlyCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <MetricCard
            label="On Demand"
            value={summaryKPIs.onDemandCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Charts and Upcoming Schedules Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        {statusDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={statusDistributionData}
              config={pieChartConfig}
              title="Status Distribution"
              subtitle="Schedules by current status"
              height={280}
              loading={false}
              emptyMessage="No status data available"
            />
          </div>
        )}

        {/* Frequency Distribution */}
        {frequencyDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={frequencyDistributionData}
              config={pieChartConfig}
              title="Frequency Distribution"
              subtitle="Schedules by execution frequency"
              height={280}
              loading={false}
              emptyMessage="No frequency data available"
            />
          </div>
        )}

        {/* Upcoming Schedules Calendar View */}
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
              Upcoming Runs
            </h3>
          </div>
          {upcomingSchedules.length > 0 ? (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {upcomingSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between bg-brand-gray-50 rounded-lg p-2.5 border border-brand-gray-200 cursor-pointer hover:bg-brand-100 transition-colors"
                  onClick={() => handleRowClick(schedule)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(schedule);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View schedule ${schedule.name}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brand-gray-900 truncate">
                      {schedule.name}
                    </p>
                    <p className="text-xs text-brand-gray-500 truncate">
                      {schedule.application} · {schedule.environment}
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 ml-2">
                    <span className="text-xs text-brand-gray-500 whitespace-nowrap">
                      {formatDisplayDateTime(schedule.nextRun)}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full mt-0.5 ${
                      schedule.frequency === 'Daily' ? 'bg-brand-50 text-brand-700' :
                      schedule.frequency === 'Weekly' ? 'bg-brand-green-50 text-brand-green-700' :
                      schedule.frequency === 'Monthly' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-purple-50 text-purple-700'
                    }`}>
                      {schedule.frequency === 'OnDemand' ? 'On Demand' : schedule.frequency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-sm text-brand-gray-500">
              No upcoming scheduled runs.
            </div>
          )}
        </div>
      </div>

      {/* Schedules Table */}
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
          <h2 className="text-lg font-semibold text-brand-gray-900">
            All Schedules
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({schedules.length})
          </span>
        </div>
        {schedules.length > 0 ? (
          <DataTable
            columns={scheduleColumns}
            data={schedules}
            pageSize={10}
            selectable={false}
            searchFields={['name', 'application', 'frequency', 'status', 'environment', 'owner', 'description']}
            emptyMessage="No schedules match the selected filters."
            rowKeyField="id"
            onRowClick={handleRowClick}
            storageKey="scheduler-table"
          />
        ) : (
          <EmptyState
            title="No schedules found"
            description="No schedules match the selected filters. Try adjusting your filter criteria or create a new schedule."
            actionLabel={canEdit ? 'New Schedule' : 'Clear Filters'}
            onAction={canEdit ? handleOpenAdd : handleClearAll}
          />
        )}
      </div>

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{schedules.filter((s) => s.status === 'Active').length} Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{schedules.filter((s) => s.status === 'Paused').length} Paused</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{schedules.filter((s) => s.status === 'Completed').length} Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{schedules.filter((s) => s.frequency === 'Daily').length} Daily</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{schedules.filter((s) => s.frequency === 'Weekly').length} Weekly</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{schedules.filter((s) => s.frequency === 'Monthly').length} Monthly</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>{schedules.filter((s) => s.frequency === 'OnDemand').length} On Demand</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            {schedules.length} total schedules
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
        title={selectedSchedule ? selectedSchedule.name : ''}
        size="xl"
      >
        {selectedSchedule && (
          <div className="space-y-6">
            {/* Status and Frequency */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedSchedule.status} size="md" />
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                selectedSchedule.frequency === 'Daily' ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300' :
                selectedSchedule.frequency === 'Weekly' ? 'bg-brand-green-50 text-brand-green-700 ring-1 ring-inset ring-brand-green-300' :
                selectedSchedule.frequency === 'Monthly' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300' :
                'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-300'
              }`}>
                {selectedSchedule.frequency === 'OnDemand' ? 'On Demand' : selectedSchedule.frequency}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 ring-1 ring-inset ring-brand-gray-300">
                {selectedSchedule.environment}
              </span>
            </div>

            {/* Description */}
            {selectedSchedule.description && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-sm text-brand-gray-700 leading-relaxed">
                  {selectedSchedule.description}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Application</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedSchedule.application}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Test Suite ID</p>
                <p className="text-xs font-mono text-brand-gray-600">{selectedSchedule.testSuiteId}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Owner</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedSchedule.owner}</p>
                {selectedSchedule.ownerEmail && (
                  <p className="text-xs text-brand-gray-500 truncate">{selectedSchedule.ownerEmail}</p>
                )}
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Environment</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedSchedule.environment}</p>
              </div>
            </div>

            {/* Schedule Timing */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Next Run</p>
                <p className="text-sm font-medium text-brand-gray-900">
                  {selectedSchedule.nextRun ? formatDisplayDateTime(selectedSchedule.nextRun) : '—'}
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Last Run</p>
                <p className="text-sm font-medium text-brand-gray-900">
                  {selectedSchedule.lastRun ? formatDisplayDateTime(selectedSchedule.lastRun) : '—'}
                </p>
              </div>
              {selectedSchedule.cron && (
                <div className="bg-brand-gray-50 rounded-lg p-3">
                  <p className="text-xs text-brand-gray-500 mb-1">Cron Expression</p>
                  <p className="text-xs font-mono text-brand-gray-700">{selectedSchedule.cron}</p>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-600">
              {selectedSchedule.createdDate && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Created: {formatDisplayDate(selectedSchedule.createdDate)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {canEdit && selectedSchedule.status !== 'Completed' && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {selectedSchedule.status === 'Active' && (
                  <button
                    onClick={() => handleTrigger(selectedSchedule)}
                    disabled={triggerSubmitting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{triggerSubmitting ? 'Triggering...' : 'Trigger Now'}</span>
                  </button>
                )}
                {selectedSchedule.status === 'Active' && (
                  <button
                    onClick={() => handlePause(selectedSchedule)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md hover:bg-yellow-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Pause</span>
                  </button>
                )}
                {selectedSchedule.status === 'Paused' && (
                  <button
                    onClick={() => handleResume(selectedSchedule)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-green-500 rounded-md hover:bg-brand-green-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Resume</span>
                  </button>
                )}
                <button
                  onClick={() => handleOpenEdit(selectedSchedule)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleOpenDelete(selectedSchedule)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Schedule Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={handleCloseAdd}
        title="New Schedule"
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
            <label htmlFor="sched-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Schedule Name <span className="text-red-500">*</span>
            </label>
            <input
              id="sched-name"
              type="text"
              value={addForm.name}
              onChange={(e) => handleAddFormChange('name', e.target.value)}
              placeholder="Enter schedule name"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              disabled={addSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sched-application" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Application <span className="text-red-500">*</span>
              </label>
              <select
                id="sched-application"
                value={addForm.application}
                onChange={(e) => handleAddFormChange('application', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={addSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="">Select application...</option>
                {distinctApplications.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sched-suite" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Test Suite <span className="text-red-500">*</span>
              </label>
              <select
                id="sched-suite"
                value={addForm.testSuiteId}
                onChange={(e) => handleAddFormChange('testSuiteId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={addSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="">Select test suite...</option>
                {distinctSuites.map((s) => (
                  <option key={s} value={`suite-${s.toLowerCase().replace(/\s+/g, '-')}`}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sched-frequency" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Frequency
              </label>
              <select
                id="sched-frequency"
                value={addForm.frequency}
                onChange={(e) => handleAddFormChange('frequency', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={addSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="OnDemand">On Demand</option>
              </select>
            </div>

            <div>
              <label htmlFor="sched-environment" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Environment
              </label>
              <select
                id="sched-environment"
                value={addForm.environment}
                onChange={(e) => handleAddFormChange('environment', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={addSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="QA">QA</option>
                <option value="Staging">Staging</option>
                <option value="Prod">Prod</option>
              </select>
            </div>

            <div>
              <label htmlFor="sched-cron" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Cron Expression
              </label>
              <input
                id="sched-cron"
                type="text"
                value={addForm.cron}
                onChange={(e) => handleAddFormChange('cron', e.target.value)}
                placeholder="0 8 * * *"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
                disabled={addSubmitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="sched-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="sched-description"
              value={addForm.description}
              onChange={(e) => handleAddFormChange('description', e.target.value)}
              placeholder="Brief description of the schedule"
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
                  <span>Create Schedule</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Schedule Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={handleCloseEdit}
        title={selectedSchedule ? `Edit: ${selectedSchedule.name}` : 'Edit Schedule'}
        size="lg"
      >
        {selectedSchedule && (
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
              <label htmlFor="edit-sched-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Schedule Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-sched-name"
                type="text"
                value={editForm.name}
                onChange={(e) => handleEditFormChange('name', e.target.value)}
                placeholder="Enter schedule name"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={editSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="edit-sched-frequency" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  id="edit-sched-frequency"
                  value={editForm.frequency}
                  onChange={(e) => handleEditFormChange('frequency', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                  disabled={editSubmitting}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em',
                  }}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="OnDemand">On Demand</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-sched-environment" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Environment
                </label>
                <select
                  id="edit-sched-environment"
                  value={editForm.environment}
                  onChange={(e) => handleEditFormChange('environment', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                  disabled={editSubmitting}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em',
                  }}
                >
                  <option value="QA">QA</option>
                  <option value="Staging">Staging</option>
                  <option value="Prod">Prod</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-sched-cron" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Cron Expression
                </label>
                <input
                  id="edit-sched-cron"
                  type="text"
                  value={editForm.cron}
                  onChange={(e) => handleEditFormChange('cron', e.target.value)}
                  placeholder="0 8 * * *"
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
                  disabled={editSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="edit-sched-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="edit-sched-description"
                value={editForm.description}
                onChange={(e) => handleEditFormChange('description', e.target.value)}
                placeholder="Brief description of the schedule"
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={handleCloseDelete}
        title="Delete Schedule"
        size="sm"
      >
        {selectedSchedule && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-brand-gray-700">
                  Are you sure you want to delete <strong>{selectedSchedule.name}</strong>? This will permanently remove the schedule and it cannot be recovered.
                </p>
                <p className="text-xs text-brand-gray-500 mt-2">
                  Application: {selectedSchedule.application} · Frequency: {selectedSchedule.frequency}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-gray-200">
              <button
                onClick={handleCloseDelete}
                disabled={deleteSubmitting}
                className="px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={deleteSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
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
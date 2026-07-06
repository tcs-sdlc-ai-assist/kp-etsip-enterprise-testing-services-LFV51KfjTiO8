/**
 * TestExecutionDashboard Component
 * Test Execution Dashboard screen (FR-011): displays execution visibility with MetricCards
 * (total executions, pass rate, fail rate, in-progress count), execution breakdown by type
 * (manual/automated) pie chart, execution trend line chart, recent executions DataTable
 * with drill-down. Uses executionService.getExecutions().
 * Filter by application/type/status/date.
 * @module TestExecutionDashboard
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getExecutions,
  getExecutionMetrics,
  getDistinctApplications,
  getDistinctStatuses,
  getDistinctSuiteNames,
  getDistinctEnvironments,
} from '../../shared/services/executionService.js';
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
  Passed: '#0f9d58',
  Failed: '#ef4444',
  Blocked: '#f97316',
  InProgress: '#0069cc',
  Queued: '#939ba3',
};

/**
 * Type color mapping for charts.
 * @type {Object.<string, string>}
 */
const TYPE_COLORS = {
  Automated: '#0069cc',
  Manual: '#f59e0b',
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
 * TestExecutionDashboard page component.
 * Displays execution visibility with KPI cards, execution breakdown charts,
 * trend charts, recent executions table, and filtering by application/type/status.
 *
 * @returns {React.ReactElement} The test execution dashboard page
 */
export default function TestExecutionDashboard() {
  const { currentUser, role } = useAuth();

  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    application: '',
    type: '',
    status: '',
    environment: '',
  });

  // Distinct values for filter dropdowns
  const [distinctApplications, setDistinctApplications] = useState([]);
  const [distinctStatuses, setDistinctStatuses] = useState([]);
  const [distinctEnvironments, setDistinctEnvironments] = useState([]);

  // Detail modal state
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  /**
   * Loads distinct filter values.
   */
  useEffect(() => {
    try {
      setDistinctApplications(getDistinctApplications());
      setDistinctStatuses(getDistinctStatuses());
      setDistinctEnvironments(getDistinctEnvironments());
    } catch {
      // Ignore errors loading distinct values
    }
  }, []);

  /**
   * Fetches executions based on current filters.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {};

      if (filterValues.application) {
        filters.application = filterValues.application;
      }

      if (filterValues.type) {
        filters.type = filterValues.type;
      }

      if (filterValues.status) {
        filters.status = filterValues.status;
      }

      if (filterValues.environment) {
        filters.environment = filterValues.environment;
      }

      const result = await getExecutions(filters);
      setExecutions(result.executions || []);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load execution data.';
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
      type: '',
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
        key: 'type',
        label: 'Type',
        placeholder: 'All Types',
        options: [
          { value: 'Automated', label: 'Automated' },
          { value: 'Manual', label: 'Manual' },
        ],
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
  }, [distinctApplications, distinctStatuses, distinctEnvironments]);

  /**
   * Summary KPIs computed from all executions.
   */
  const summaryKPIs = useMemo(() => {
    if (!executions || executions.length === 0) {
      return null;
    }

    const total = executions.length;
    let passedCount = 0;
    let failedCount = 0;
    let blockedCount = 0;
    let inProgressCount = 0;
    let queuedCount = 0;
    let automatedCount = 0;
    let manualCount = 0;
    let totalDuration = 0;
    let durationCount = 0;

    for (const exec of executions) {
      if (exec.status === 'Passed') {
        passedCount++;
      } else if (exec.status === 'Failed') {
        failedCount++;
      } else if (exec.status === 'Blocked') {
        blockedCount++;
      } else if (exec.status === 'InProgress') {
        inProgressCount++;
      } else if (exec.status === 'Queued') {
        queuedCount++;
      }

      if (exec.type === 'Automated') {
        automatedCount++;
      } else {
        manualCount++;
      }

      if (exec.duration !== null && exec.duration !== undefined) {
        totalDuration += exec.duration;
        durationCount++;
      }
    }

    const completedCount = passedCount + failedCount;
    const passRate = completedCount > 0
      ? Math.round((passedCount / completedCount) * 1000) / 10
      : 0;
    const failRate = completedCount > 0
      ? Math.round((failedCount / completedCount) * 1000) / 10
      : 0;

    const avgDuration = durationCount > 0
      ? Math.round((totalDuration / durationCount) * 10) / 10
      : 0;

    return {
      total,
      passedCount,
      failedCount,
      blockedCount,
      inProgressCount,
      queuedCount,
      automatedCount,
      manualCount,
      passRate,
      failRate,
      avgDuration,
    };
  }, [executions]);

  /**
   * Status distribution chart data.
   */
  const statusDistributionData = useMemo(() => {
    if (!executions || executions.length === 0) {
      return [];
    }

    const counts = {};
    for (const exec of executions) {
      const status = exec.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: STATUS_COLORS[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [executions]);

  /**
   * Type distribution chart data.
   */
  const typeDistributionData = useMemo(() => {
    if (!executions || executions.length === 0) {
      return [];
    }

    const counts = {};
    for (const exec of executions) {
      const type = exec.type || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([type, count]) => ({
        name: type,
        value: count,
        color: TYPE_COLORS[type] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [executions]);

  /**
   * Execution trend data grouped by date.
   */
  const executionTrendData = useMemo(() => {
    if (!executions || executions.length === 0) {
      return [];
    }

    const completedExecutions = executions.filter(
      (exec) => exec.status === 'Passed' || exec.status === 'Failed'
    );

    if (completedExecutions.length === 0) {
      return [];
    }

    const dateMap = {};

    for (const exec of completedExecutions) {
      if (!exec.startTime) {
        continue;
      }
      const date = new Date(exec.startTime);
      if (isNaN(date.getTime())) {
        continue;
      }
      const dateKey = date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { date: dateKey, passed: 0, failed: 0, total: 0, passRate: 0, timestamp: date.getTime() };
      }

      dateMap[dateKey].total++;
      if (exec.status === 'Passed') {
        dateMap[dateKey].passed++;
      } else if (exec.status === 'Failed') {
        dateMap[dateKey].failed++;
      }
    }

    const trendArray = Object.values(dateMap);
    trendArray.sort((a, b) => a.timestamp - b.timestamp);

    for (const entry of trendArray) {
      entry.passRate = entry.total > 0
        ? Math.round((entry.passed / entry.total) * 1000) / 10
        : 0;
    }

    return trendArray.slice(-12);
  }, [executions]);

  /**
   * Application distribution chart data.
   */
  const applicationDistributionData = useMemo(() => {
    if (!executions || executions.length === 0) {
      return [];
    }

    const counts = {};
    for (const exec of executions) {
      const app = exec.application || 'Unknown';
      counts[app] = (counts[app] || 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([app, count]) => ({
        name: app.length > 20 ? app.substring(0, 17) + '...' : app,
        executions: count,
      }));
  }, [executions]);

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
   * Trend chart config for pass rate.
   */
  const trendChartConfig = useMemo(() => {
    return {
      xAxisKey: 'date',
      series: [
        { dataKey: 'passRate', name: 'Pass Rate (%)', color: '#0f9d58' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * Execution count trend chart config.
   */
  const executionCountChartConfig = useMemo(() => {
    return {
      xAxisKey: 'date',
      series: [
        { dataKey: 'passed', name: 'Passed', color: '#0f9d58' },
        { dataKey: 'failed', name: 'Failed', color: '#ef4444' },
      ],
      showLegend: true,
      stacked: true,
    };
  }, []);

  /**
   * Application distribution bar chart config.
   */
  const applicationBarConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'executions', name: 'Executions', color: '#0069cc' },
      ],
      showLegend: true,
    };
  }, []);

  /**
   * Execution table columns.
   */
  const executionColumns = useMemo(() => {
    return [
      {
        key: 'id',
        label: 'Execution ID',
        sortable: true,
        render: (value) => (
          <span className="text-xs font-mono text-brand-gray-600">{value}</span>
        ),
      },
      {
        key: 'suiteName',
        label: 'Suite',
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
        key: 'type',
        label: 'Type',
        sortable: true,
        render: (value) => (
          <span className={`text-sm font-medium ${value === 'Automated' ? 'text-brand-500' : 'text-yellow-600'}`}>
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
        key: 'environment',
        label: 'Env',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-600">{value}</span>
        ),
      },
      {
        key: 'duration',
        label: 'Duration',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-600">
            {value !== null && value !== undefined ? `${value}s` : '—'}
          </span>
        ),
      },
      {
        key: 'executor',
        label: 'Executor',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'startTime',
        label: 'Date',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-500 whitespace-nowrap">
            {formatDisplayDate(value) || '—'}
          </span>
        ),
      },
    ];
  }, []);

  /**
   * Export data for the execution table.
   */
  const executionExportData = useMemo(() => {
    return executions.map((exec) => ({
      id: exec.id,
      testAssetId: exec.testAssetId,
      suiteName: exec.suiteName,
      application: exec.application,
      type: exec.type,
      status: exec.status,
      executor: exec.executor,
      executorEmail: exec.executorEmail,
      startTime: exec.startTime,
      endTime: exec.endTime,
      duration: exec.duration,
      environment: exec.environment,
      hasAIAnalysis: exec.aiAnalysis ? 'Yes' : 'No',
      evidenceCount: exec.evidence ? exec.evidence.length : 0,
      logCount: exec.logs ? exec.logs.length : 0,
    }));
  }, [executions]);

  /**
   * Handles clicking an execution row to open the detail modal.
   *
   * @param {Object} exec - The execution object
   */
  const handleRowClick = useCallback((exec) => {
    setSelectedExecution(exec);
    setDetailModalOpen(true);
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedExecution(null);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading execution data..." showLabel />
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
            Test Execution Dashboard
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Execution visibility, pass/fail rates, trends, and monitoring across all applications
          </p>
        </div>
        {executionExportData.length > 0 && (
          <ExportButton
            data={executionExportData}
            filename="test-execution-dashboard"
            title="Test Execution Dashboard Report"
            sheetName="Executions"
            label="Export"
            size="md"
          />
        )}
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
            label="Total Executions"
            value={summaryKPIs.total}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <MetricCard
            label="Pass Rate"
            value={summaryKPIs.passRate}
            trend={summaryKPIs.passRate >= 90 ? 'up' : summaryKPIs.passRate >= 75 ? 'neutral' : 'down'}
            trendValue={summaryKPIs.passRate >= 90 ? 'Good' : summaryKPIs.passRate >= 75 ? 'Fair' : 'Low'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Fail Rate"
            value={summaryKPIs.failRate}
            trend={summaryKPIs.failRate <= 5 ? 'up' : summaryKPIs.failRate <= 15 ? 'neutral' : 'down'}
            trendValue={summaryKPIs.failRate <= 5 ? 'Low' : summaryKPIs.failRate <= 15 ? 'Moderate' : 'High'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="In Progress"
            value={summaryKPIs.inProgressCount}
            trend={summaryKPIs.inProgressCount > 5 ? 'down' : 'neutral'}
            trendValue={summaryKPIs.inProgressCount > 5 ? 'High' : ''}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Passed"
            value={summaryKPIs.passedCount}
            trend="up"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <MetricCard
            label="Failed"
            value={summaryKPIs.failedCount}
            trend={summaryKPIs.failedCount === 0 ? 'up' : 'down'}
            trendValue={summaryKPIs.failedCount === 0 ? 'None' : 'Action needed'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            }
          />
          <MetricCard
            label="Automated"
            value={summaryKPIs.automatedCount}
            trend="up"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <MetricCard
            label="Avg Duration"
            value={summaryKPIs.avgDuration}
            trend="neutral"
            suffix="s"
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
              title="Execution Status Distribution"
              subtitle="Executions by current status"
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
              title="Execution Type Breakdown"
              subtitle="Automated vs. manual executions"
              height={280}
              loading={false}
              emptyMessage="No type data available"
            />
          </div>
        )}

        {/* Application Distribution */}
        {applicationDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="bar"
              data={applicationDistributionData}
              config={applicationBarConfig}
              title="Executions by Application"
              subtitle="Top applications by execution count"
              height={280}
              loading={false}
              emptyMessage="No application data available"
            />
          </div>
        )}
      </div>

      {/* Trend Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pass Rate Trend */}
        {executionTrendData.length > 1 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="line"
              data={executionTrendData}
              config={trendChartConfig}
              title="Pass Rate Trend"
              subtitle="Pass rate over recent execution dates"
              height={280}
              loading={false}
              emptyMessage="Not enough data for trend"
            />
          </div>
        )}

        {/* Execution Count Trend */}
        {executionTrendData.length > 1 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="bar"
              data={executionTrendData}
              config={executionCountChartConfig}
              title="Execution History"
              subtitle="Passed vs. failed executions over time"
              height={280}
              loading={false}
              emptyMessage="Not enough data for chart"
            />
          </div>
        )}

        {executionTrendData.length <= 1 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm flex items-center justify-center min-h-[280px] lg:col-span-2">
            <div className="text-center">
              <svg className="w-10 h-10 text-brand-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <p className="text-sm text-brand-gray-500">Not enough data for trend charts</p>
            </div>
          </div>
        )}
      </div>

      {/* Executions Table */}
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
            Recent Executions
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({executions.length})
          </span>
        </div>
        {executions.length > 0 ? (
          <DataTable
            columns={executionColumns}
            data={executions}
            pageSize={10}
            selectable={false}
            searchFields={['id', 'suiteName', 'application', 'type', 'status', 'environment', 'executor']}
            emptyMessage="No executions match the selected filters."
            rowKeyField="id"
            onRowClick={handleRowClick}
            storageKey="test-execution-dashboard-table"
          />
        ) : (
          <EmptyState
            title="No executions found"
            description="No executions match the selected filters. Try adjusting your filter criteria."
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
            <span>{executions.filter((e) => e.status === 'Passed').length} Passed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{executions.filter((e) => e.status === 'Failed').length} Failed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>{executions.filter((e) => e.status === 'Blocked').length} Blocked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{executions.filter((e) => e.status === 'InProgress').length} In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{executions.filter((e) => e.status === 'Queued').length} Queued</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{executions.filter((e) => e.type === 'Automated').length} Automated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{executions.filter((e) => e.type === 'Manual').length} Manual</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            {executions.length} total executions
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
        title={selectedExecution ? `Execution: ${selectedExecution.id}` : ''}
        size="xl"
      >
        {selectedExecution && (
          <div className="space-y-6">
            {/* Status and Type */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedExecution.status} size="md" />
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${selectedExecution.type === 'Automated' ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300' : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300'}`}>
                {selectedExecution.type}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 ring-1 ring-inset ring-brand-gray-300">
                {selectedExecution.environment}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Application</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedExecution.application}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Suite</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedExecution.suiteName}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Executor</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedExecution.executor}</p>
                {selectedExecution.executorEmail && (
                  <p className="text-xs text-brand-gray-500 truncate">{selectedExecution.executorEmail}</p>
                )}
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Duration</p>
                <p className="text-sm font-medium text-brand-gray-900">
                  {selectedExecution.duration !== null && selectedExecution.duration !== undefined
                    ? `${selectedExecution.duration}s`
                    : '—'}
                </p>
              </div>
            </div>

            {/* Dates */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-600">
              {selectedExecution.startTime && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Started: {formatDisplayDateTime(selectedExecution.startTime)}</span>
                </div>
              )}
              {selectedExecution.endTime && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Ended: {formatDisplayDateTime(selectedExecution.endTime)}</span>
                </div>
              )}
            </div>

            {/* Test Asset ID */}
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Test Asset ID</p>
              <p className="text-xs font-mono text-brand-gray-600">{selectedExecution.testAssetId}</p>
            </div>

            {/* AI Analysis */}
            {selectedExecution.aiAnalysis && (
              <div className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
                <h3 className="text-sm font-semibold text-brand-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Analysis
                  {selectedExecution.aiAnalysis.confidence > 0 && (
                    <span className="text-xs text-brand-gray-500 font-normal">
                      ({selectedExecution.aiAnalysis.confidence}% confidence)
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  {selectedExecution.aiAnalysis.summary && (
                    <div>
                      <p className="text-xs text-brand-gray-500 mb-0.5">Summary</p>
                      <p className="text-sm text-brand-gray-700">{selectedExecution.aiAnalysis.summary}</p>
                    </div>
                  )}
                  {selectedExecution.aiAnalysis.rootCause && (
                    <div>
                      <p className="text-xs text-brand-gray-500 mb-0.5">Root Cause</p>
                      <p className="text-sm text-brand-gray-700">{selectedExecution.aiAnalysis.rootCause}</p>
                    </div>
                  )}
                  {selectedExecution.aiAnalysis.recommendation && (
                    <div>
                      <p className="text-xs text-brand-gray-500 mb-0.5">Recommendation</p>
                      <p className="text-sm text-brand-gray-700">{selectedExecution.aiAnalysis.recommendation}</p>
                    </div>
                  )}
                  {selectedExecution.aiAnalysis.relatedDefects && selectedExecution.aiAnalysis.relatedDefects.length > 0 && (
                    <div>
                      <p className="text-xs text-brand-gray-500 mb-0.5">Related Defects</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedExecution.aiAnalysis.relatedDefects.map((defect, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-300"
                          >
                            {defect}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Evidence */}
            {selectedExecution.evidence && selectedExecution.evidence.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Evidence ({selectedExecution.evidence.length})
                </h3>
                <div className="space-y-2">
                  {selectedExecution.evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between bg-brand-gray-50 rounded-lg p-3 border border-brand-gray-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <svg className="w-4 h-4 text-brand-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="min-w-0">
                          <p className="text-sm text-brand-gray-700 truncate">{ev.name}</p>
                          <p className="text-xs text-brand-gray-500">{ev.type} · {formatDisplayDate(ev.capturedAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Execution Logs */}
            {selectedExecution.logs && selectedExecution.logs.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Execution Logs ({selectedExecution.logs.length})
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto bg-brand-gray-900 rounded-lg p-3">
                  {selectedExecution.logs.map((log, index) => {
                    let textColor = 'text-brand-gray-300';
                    if (log.level === 'error') {
                      textColor = 'text-red-400';
                    } else if (log.level === 'warn') {
                      textColor = 'text-yellow-400';
                    } else if (log.level === 'debug') {
                      textColor = 'text-brand-gray-500';
                    }

                    return (
                      <div key={index} className="flex gap-2 text-xs font-mono">
                        <span className="text-brand-gray-500 whitespace-nowrap flex-shrink-0">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                        </span>
                        <span className={`uppercase w-12 flex-shrink-0 ${textColor}`}>
                          [{log.level}]
                        </span>
                        <span className={textColor}>
                          {log.message}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
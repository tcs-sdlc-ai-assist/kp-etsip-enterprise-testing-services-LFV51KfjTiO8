/**
 * ReleaseReadiness Component
 * Release Readiness Dashboard (FR-007): displays release-level quality status with MetricCards
 * (releases in progress, quality gate pass rate, avg defect density), release list DataTable
 * with status badges, drill-down to ReleaseDetail, filter by application/status/date.
 * Uses DashboardService.getReleaseDashboardData().
 * @module ReleaseReadiness
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getReleaseDashboardData,
  getReleaseById,
  getDistinctReleaseStatuses,
  getDistinctReleaseApplications,
  getQualityGateData,
} from '../../shared/services/dashboardService.js';
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
  Planning: '#939ba3',
  InProgress: '#0069cc',
  ReadyForRelease: '#5b9ae3',
  Released: '#0f9d58',
  'Rolled Back': '#ef4444',
};

/**
 * Quality gate status color mapping for charts.
 * @type {Object.<string, string>}
 */
const QG_STATUS_COLORS = {
  Passed: '#0f9d58',
  Failed: '#ef4444',
  Pending: '#f59e0b',
  Waived: '#f97316',
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
 * ReleaseReadiness page component.
 * Displays release-level quality status with KPI cards, release list table,
 * drill-down to release detail, and filtering by application/status/date.
 *
 * @returns {React.ReactElement} The release readiness dashboard page
 */
export default function ReleaseReadiness() {
  const { currentUser, role } = useAuth();

  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    application: '',
    status: '',
    qualityGateStatus: '',
  });

  // Distinct values for filter dropdowns
  const [distinctStatuses, setDistinctStatuses] = useState([]);
  const [distinctApplications, setDistinctApplications] = useState([]);

  // Detail modal state
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Quality gate data
  const [qualityGateData, setQualityGateData] = useState(null);

  /**
   * Loads distinct filter values.
   */
  useEffect(() => {
    try {
      setDistinctStatuses(getDistinctReleaseStatuses());
      setDistinctApplications(getDistinctReleaseApplications());
    } catch {
      // Ignore errors loading distinct values
    }
  }, []);

  /**
   * Fetches release data based on current filters.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {};

      if (filterValues.application) {
        filters.application = filterValues.application;
      }

      if (filterValues.status) {
        filters.status = filterValues.status;
      }

      if (filterValues.qualityGateStatus) {
        filters.qualityGateStatus = filterValues.qualityGateStatus;
      }

      const [releaseResult, qgResult] = await Promise.all([
        getReleaseDashboardData(filters),
        getQualityGateData(),
      ]);

      setReleases(releaseResult.releases || []);
      setQualityGateData(qgResult);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load release data.';
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
      status: '',
      qualityGateStatus: '',
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
        key: 'status',
        label: 'Status',
        placeholder: 'All Statuses',
        options: distinctStatuses.map((s) => ({
          value: s,
          label: formatStatusLabel(s),
        })),
      },
      {
        key: 'qualityGateStatus',
        label: 'Quality Gate',
        placeholder: 'All Quality Gates',
        options: [
          { value: 'Passed', label: 'Passed' },
          { value: 'Failed', label: 'Failed' },
          { value: 'Pending', label: 'Pending' },
          { value: 'Waived', label: 'Waived' },
        ],
      },
    ];
  }, [distinctStatuses, distinctApplications]);

  /**
   * Summary KPIs computed from all releases.
   */
  const summaryKPIs = useMemo(() => {
    if (!releases || releases.length === 0) {
      return null;
    }

    const total = releases.length;
    let inProgressCount = 0;
    let releasedCount = 0;
    let rolledBackCount = 0;
    let readyForReleaseCount = 0;
    let planningCount = 0;
    let totalQualityScore = 0;
    let totalTestCoverage = 0;
    let totalDefectsOpen = 0;
    let totalDefectsClosed = 0;
    let qgPassedCount = 0;
    let qgFailedCount = 0;
    let qgPendingCount = 0;

    for (const release of releases) {
      if (release.status === 'InProgress') {
        inProgressCount++;
      } else if (release.status === 'Released') {
        releasedCount++;
      } else if (release.status === 'Rolled Back') {
        rolledBackCount++;
      } else if (release.status === 'ReadyForRelease') {
        readyForReleaseCount++;
      } else if (release.status === 'Planning') {
        planningCount++;
      }

      totalQualityScore += release.qualityScore || 0;
      totalTestCoverage += release.testCoverage || 0;
      totalDefectsOpen += release.defectsOpen || 0;
      totalDefectsClosed += release.defectsClosed || 0;

      if (release.qualityGateStatus === 'Passed') {
        qgPassedCount++;
      } else if (release.qualityGateStatus === 'Failed') {
        qgFailedCount++;
      } else if (release.qualityGateStatus === 'Pending') {
        qgPendingCount++;
      }
    }

    const evaluatedCount = qgPassedCount + qgFailedCount;
    const qgPassRate = evaluatedCount > 0
      ? Math.round((qgPassedCount / evaluatedCount) * 1000) / 10
      : 0;

    return {
      total,
      inProgressCount,
      releasedCount,
      rolledBackCount,
      readyForReleaseCount,
      planningCount,
      avgQualityScore: total > 0 ? Math.round((totalQualityScore / total) * 10) / 10 : 0,
      avgTestCoverage: total > 0 ? Math.round((totalTestCoverage / total) * 10) / 10 : 0,
      totalDefectsOpen,
      totalDefectsClosed,
      qgPassRate,
      qgPassedCount,
      qgFailedCount,
      qgPendingCount,
    };
  }, [releases]);

  /**
   * Status distribution chart data.
   */
  const statusDistributionData = useMemo(() => {
    const counts = {};
    for (const release of releases) {
      const status = release.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: STATUS_COLORS[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [releases]);

  /**
   * Quality gate status distribution chart data.
   */
  const qgDistributionData = useMemo(() => {
    const counts = {};
    for (const release of releases) {
      const qgStatus = release.qualityGateStatus || 'Unknown';
      counts[qgStatus] = (counts[qgStatus] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: QG_STATUS_COLORS[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [releases]);

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
   * Quality gate pass rate bar chart data from quality gate data.
   */
  const qualityGatePassRateData = useMemo(() => {
    if (!qualityGateData || !qualityGateData.passRates || qualityGateData.passRates.length === 0) {
      return [];
    }
    return qualityGateData.passRates.map((gate) => ({
      name: gate.gateName,
      passRate: gate.passRate,
      passed: gate.passed,
      failed: gate.failed,
      waived: gate.waived,
    }));
  }, [qualityGateData]);

  /**
   * Quality gate pass rate bar chart config.
   */
  const qualityGateBarConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'passRate', name: 'Pass Rate (%)', color: '#0f9d58' },
      ],
      showLegend: true,
      layout: 'vertical',
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * Release table columns.
   */
  const releaseColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Release',
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
        key: 'version',
        label: 'Version',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">v{value}</span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'qualityGateStatus',
        label: 'Quality Gate',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'testCoverage',
        label: 'Coverage',
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-brand-gray-200 rounded-full max-w-[60px]">
              <div
                className="h-2 bg-brand-500 rounded-full"
                style={{ width: `${Math.min(value, 100)}%` }}
              />
            </div>
            <span className="text-xs text-brand-gray-600">{value}%</span>
          </div>
        ),
      },
      {
        key: 'qualityScore',
        label: 'Quality',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value < 70) {
            colorClass = 'text-red-600';
          } else if (value < 80) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-semibold ${colorClass}`}>{value}</span>
          );
        },
      },
      {
        key: 'defectsOpen',
        label: 'Open Defects',
        sortable: true,
        render: (value) => (
          <span className={`text-sm font-medium ${value > 0 ? 'text-red-600' : 'text-brand-green-600'}`}>
            {value}
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
      {
        key: 'releaseDate',
        label: 'Release Date',
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
   * Export data for the release table.
   */
  const releaseExportData = useMemo(() => {
    return releases.map((release) => ({
      id: release.id,
      name: release.name,
      application: release.application,
      version: release.version,
      status: release.status,
      qualityGateStatus: release.qualityGateStatus,
      testCoverage: release.testCoverage,
      qualityScore: release.qualityScore,
      defectsOpen: release.defectsOpen,
      defectsClosed: release.defectsClosed,
      owner: release.owner,
      ownerEmail: release.ownerEmail,
      releaseDate: release.releaseDate,
      environments: release.environments ? release.environments.join(', ') : '',
      description: release.description,
    }));
  }, [releases]);

  /**
   * Handles clicking a release row to open the detail modal.
   *
   * @param {Object} release - The release object
   */
  const handleRowClick = useCallback((release) => {
    setSelectedRelease(release);
    setDetailModalOpen(true);
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedRelease(null);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading release readiness data..." showLabel />
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

  if (!releases || releases.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">
              Release Readiness
            </h1>
            <p className="text-sm text-brand-gray-500 mt-1">
              Release-level quality status and readiness tracking
            </p>
          </div>
        </div>
        <FilterBar
          filters={filterConfig}
          values={filterValues}
          onChange={handleFilterChange}
          onClearAll={handleClearAll}
          showSearch={false}
        />
        <div className="mt-6">
          <EmptyState
            title="No releases found"
            description="No releases match the selected filters. Try adjusting your filter criteria."
            actionLabel="Clear Filters"
            onAction={handleClearAll}
          />
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
            Release Readiness
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Release-level quality status, quality gate pass rates, and deployment readiness
          </p>
        </div>
        {releaseExportData.length > 0 && (
          <ExportButton
            data={releaseExportData}
            filename="release-readiness"
            title="Release Readiness Report"
            sheetName="Releases"
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
            label="Total Releases"
            value={summaryKPIs.total}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
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
            label="Ready for Release"
            value={summaryKPIs.readyForReleaseCount}
            trend="up"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Released"
            value={summaryKPIs.releasedCount}
            trend="up"
            trendValue={summaryKPIs.total > 0 ? `${Math.round((summaryKPIs.releasedCount / summaryKPIs.total) * 100)}%` : '0%'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <MetricCard
            label="QG Pass Rate"
            value={summaryKPIs.qgPassRate}
            trend={summaryKPIs.qgPassRate >= 85 ? 'up' : summaryKPIs.qgPassRate >= 70 ? 'neutral' : 'down'}
            trendValue={summaryKPIs.qgPassRate >= 85 ? 'Good' : summaryKPIs.qgPassRate >= 70 ? 'Fair' : 'Low'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <MetricCard
            label="Avg Quality Score"
            value={summaryKPIs.avgQualityScore}
            trend={summaryKPIs.avgQualityScore >= 85 ? 'up' : summaryKPIs.avgQualityScore >= 75 ? 'neutral' : 'down'}
            suffix="/100"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <MetricCard
            label="Open Defects"
            value={summaryKPIs.totalDefectsOpen}
            trend={summaryKPIs.totalDefectsOpen > 10 ? 'down' : 'up'}
            trendValue={summaryKPIs.totalDefectsOpen > 10 ? 'High' : 'Manageable'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Rolled Back"
            value={summaryKPIs.rolledBackCount}
            trend={summaryKPIs.rolledBackCount > 0 ? 'down' : 'up'}
            trendValue={summaryKPIs.rolledBackCount > 0 ? 'Action needed' : 'None'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Release Status Distribution */}
        {statusDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={statusDistributionData}
              config={pieChartConfig}
              title="Release Status Distribution"
              subtitle="Releases by current status"
              height={280}
              loading={false}
              emptyMessage="No status data available"
            />
          </div>
        )}

        {/* Quality Gate Status Distribution */}
        {qgDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={qgDistributionData}
              config={pieChartConfig}
              title="Quality Gate Status"
              subtitle="Releases by quality gate outcome"
              height={280}
              loading={false}
              emptyMessage="No quality gate data available"
            />
          </div>
        )}

        {/* Quality Gate Pass Rates */}
        {qualityGatePassRateData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="bar"
              data={qualityGatePassRateData}
              config={qualityGateBarConfig}
              title="Quality Gate Pass Rates"
              subtitle="Pass rate by quality gate type"
              height={280}
              loading={false}
              emptyMessage="No quality gate pass rate data available"
            />
          </div>
        )}
      </div>

      {/* Releases Table */}
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
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
          <h2 className="text-lg font-semibold text-brand-gray-900">
            All Releases
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({releases.length})
          </span>
        </div>
        <DataTable
          columns={releaseColumns}
          data={releases}
          pageSize={10}
          selectable={false}
          searchFields={['name', 'application', 'version', 'status', 'qualityGateStatus', 'owner', 'description']}
          emptyMessage="No releases match the selected filters."
          rowKeyField="id"
          onRowClick={handleRowClick}
          storageKey="release-readiness-table"
        />
      </div>

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{releases.filter((r) => r.status === 'Planning').length} Planning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{releases.filter((r) => r.status === 'InProgress').length} In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-blue-400" />
            <span>{releases.filter((r) => r.status === 'ReadyForRelease').length} Ready for Release</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{releases.filter((r) => r.status === 'Released').length} Released</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{releases.filter((r) => r.status === 'Rolled Back').length} Rolled Back</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            {releases.length} total releases
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
        title={selectedRelease ? selectedRelease.name : ''}
        size="xl"
      >
        {selectedRelease && (
          <div className="space-y-6">
            {/* Status and Quality Gate */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedRelease.status} size="md" />
              <StatusBadge status={selectedRelease.qualityGateStatus} size="md" />
              {selectedRelease.status === 'Rolled Back' && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-300">
                  Rolled Back
                </span>
              )}
            </div>

            {/* Description */}
            {selectedRelease.description && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-sm text-brand-gray-700 leading-relaxed">
                  {selectedRelease.description}
                </p>
              </div>
            )}

            {/* Quality Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Quality Score</p>
                <p className={`text-xl font-bold ${selectedRelease.qualityScore >= 80 ? 'text-brand-green-600' : selectedRelease.qualityScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {selectedRelease.qualityScore}
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Test Coverage</p>
                <p className="text-xl font-bold text-brand-gray-900">
                  {selectedRelease.testCoverage}%
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Open Defects</p>
                <p className={`text-xl font-bold ${selectedRelease.defectsOpen > 0 ? 'text-red-600' : 'text-brand-green-600'}`}>
                  {selectedRelease.defectsOpen}
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Closed Defects</p>
                <p className="text-xl font-bold text-brand-gray-900">
                  {selectedRelease.defectsClosed}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Application</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedRelease.application}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Version</p>
                <p className="text-sm font-medium text-brand-gray-900">v{selectedRelease.version}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Owner</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedRelease.owner}</p>
                {selectedRelease.ownerEmail && (
                  <p className="text-xs text-brand-gray-500 truncate">{selectedRelease.ownerEmail}</p>
                )}
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Release Date</p>
                <p className="text-sm font-medium text-brand-gray-900">
                  {formatDisplayDate(selectedRelease.releaseDate) || '—'}
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Quality Gate</p>
                <StatusBadge status={selectedRelease.qualityGateStatus} size="md" />
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Environments</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedRelease.environments && selectedRelease.environments.length > 0 ? (
                    selectedRelease.environments.map((env, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300"
                      >
                        {env}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-brand-gray-500">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline */}
            {selectedRelease.timeline && selectedRelease.timeline.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Release Timeline
                </h3>
                <div className="space-y-3">
                  {selectedRelease.timeline.map((entry, index) => {
                    const isLast = index === selectedRelease.timeline.length - 1;
                    return (
                      <div key={index} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isLast ? 'bg-brand-500' : 'bg-brand-green-500'}`} />
                          {index < selectedRelease.timeline.length - 1 && (
                            <div className="w-0.5 flex-1 bg-brand-gray-200 mt-1" />
                          )}
                        </div>
                        <div className="pb-3 min-w-0">
                          <p className="text-sm font-medium text-brand-gray-900">
                            {entry.event}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-brand-gray-500">
                              {formatDisplayDate(entry.date)}
                            </span>
                            <span className="text-xs text-brand-gray-400">
                              {entry.actor}
                            </span>
                            <StatusBadge status={entry.status} size="sm" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-600">
              {selectedRelease.createdAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Created: {formatDisplayDate(selectedRelease.createdAt)}</span>
                </div>
              )}
              {selectedRelease.updatedAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Updated: {formatDisplayDate(selectedRelease.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
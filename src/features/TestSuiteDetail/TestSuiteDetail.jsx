/**
 * TestSuiteDetail Component
 * Test Suite Detail screen (FR-010): displays suite details (name, description, test cases list,
 * owner, status), execution history table with pass/fail rates, trend chart, and linked test assets.
 * Uses localStorage test asset and execution data.
 * @module TestSuiteDetail
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import { getTestAssets } from '../../shared/services/repositoryService.js';
import { getExecutions } from '../../shared/services/executionService.js';
import MetricCard from '../../shared/components/MetricCard.jsx';
import ChartWrapper from '../../shared/components/ChartWrapper.jsx';
import DataTable from '../../shared/components/DataTable.jsx';
import ExportButton from '../../shared/components/ExportButton.jsx';
import LoadingSpinner from '../../shared/components/LoadingSpinner.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import EmptyState from '../../shared/components/EmptyState.jsx';

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
 * TestSuiteDetail page component.
 * Displays suite details including name, description, test cases list, owner, status,
 * execution history table with pass/fail rates, trend chart, and linked test assets.
 *
 * @returns {React.ReactElement} The test suite detail page
 */
export default function TestSuiteDetail() {
  const { currentUser, role } = useAuth();
  const { suiteId } = useParams();
  const navigate = useNavigate();

  const [testAssets, setTestAssets] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches test assets and executions for the suite.
   */
  const fetchData = useCallback(async () => {
    if (!suiteId) {
      setError('No suite ID provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const decodedSuiteId = decodeURIComponent(suiteId);

      const assetsResult = await getTestAssets({});
      const allAssets = assetsResult.testAssets || [];

      const suiteAssets = allAssets.filter(
        (asset) => asset.suiteId === decodedSuiteId || asset.suite === decodedSuiteId
      );

      if (suiteAssets.length === 0) {
        setError('Test suite not found. No test assets match the provided suite identifier.');
        setLoading(false);
        return;
      }

      setTestAssets(suiteAssets);

      const execResult = await getExecutions({});
      const allExecutions = execResult.executions || [];

      const suiteName = suiteAssets[0].suite;
      const suiteExecutions = allExecutions.filter(
        (exec) => exec.suiteName === suiteName
      );

      suiteExecutions.sort((a, b) => {
        const dateA = new Date(a.startTime).getTime();
        const dateB = new Date(b.startTime).getTime();
        return dateB - dateA;
      });

      setExecutions(suiteExecutions);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load test suite details.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [suiteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Suite metadata derived from the first test asset in the suite.
   */
  const suiteInfo = useMemo(() => {
    if (!testAssets || testAssets.length === 0) {
      return null;
    }

    const first = testAssets[0];

    const owners = new Set();
    const applications = new Set();
    const statuses = {};
    const types = {};
    const priorities = {};
    let totalVersion = 0;

    for (const asset of testAssets) {
      if (asset.owner) {
        owners.add(asset.owner);
      }
      if (asset.application) {
        applications.add(asset.application);
      }

      const status = asset.status || 'Unknown';
      statuses[status] = (statuses[status] || 0) + 1;

      const type = asset.type || 'Unknown';
      types[type] = (types[type] || 0) + 1;

      const priority = asset.priority || 'unknown';
      priorities[priority] = (priorities[priority] || 0) + 1;

      totalVersion += asset.version || 0;
    }

    const activeCount = statuses['Active'] || 0;
    const draftCount = statuses['Draft'] || 0;
    const retiredCount = statuses['Retired'] || 0;

    let overallStatus = 'Active';
    if (retiredCount === testAssets.length) {
      overallStatus = 'Retired';
    } else if (draftCount === testAssets.length) {
      overallStatus = 'Draft';
    } else if (activeCount === 0 && draftCount > 0) {
      overallStatus = 'Draft';
    }

    return {
      suiteId: first.suiteId,
      suiteName: first.suite,
      application: first.application,
      applicationId: first.applicationId,
      owner: Array.from(owners).join(', '),
      ownerEmail: first.ownerEmail || '',
      applications: Array.from(applications),
      totalAssets: testAssets.length,
      activeCount,
      draftCount,
      retiredCount,
      automatedCount: types['Automated'] || 0,
      manualCount: types['Manual'] || 0,
      overallStatus,
      statuses,
      types,
      priorities,
    };
  }, [testAssets]);

  /**
   * Execution summary KPIs.
   */
  const executionKPIs = useMemo(() => {
    if (!executions || executions.length === 0) {
      return null;
    }

    const total = executions.length;
    let passedCount = 0;
    let failedCount = 0;
    let blockedCount = 0;
    let inProgressCount = 0;
    let queuedCount = 0;
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

      if (exec.duration !== null && exec.duration !== undefined) {
        totalDuration += exec.duration;
        durationCount++;
      }
    }

    const completedCount = passedCount + failedCount;
    const passRate = completedCount > 0
      ? Math.round((passedCount / completedCount) * 1000) / 10
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
      passRate,
      avgDuration,
    };
  }, [executions]);

  /**
   * Execution status distribution chart data.
   */
  const executionStatusData = useMemo(() => {
    if (!executions || executions.length === 0) {
      return [];
    }

    const counts = {};
    for (const exec of executions) {
      const status = exec.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    const statusColors = {
      Passed: '#0f9d58',
      Failed: '#ef4444',
      Blocked: '#f97316',
      InProgress: '#0069cc',
      Queued: '#939ba3',
    };

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: statusColors[status] || '#939ba3',
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
   * Trend chart config.
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
   * Test asset table columns.
   */
  const testAssetColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Test Asset',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900 line-clamp-2">{value}</span>
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
        key: 'priority',
        label: 'Priority',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
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
        key: 'version',
        label: 'Version',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">v{value}</span>
        ),
      },
      {
        key: 'lastModified',
        label: 'Last Modified',
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
   * Execution history table columns.
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
        key: 'testAssetId',
        label: 'Test Asset',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
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
   * Export data for the suite detail.
   */
  const exportData = useMemo(() => {
    if (!suiteInfo) {
      return [];
    }

    return testAssets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      suite: asset.suite,
      suiteId: asset.suiteId,
      application: asset.application,
      type: asset.type,
      status: asset.status,
      priority: asset.priority,
      owner: asset.owner,
      ownerEmail: asset.ownerEmail,
      version: asset.version,
      lastModified: asset.lastModified,
      tags: asset.tags ? asset.tags.join(', ') : '',
      description: asset.description,
    }));
  }, [suiteInfo, testAssets]);

  /**
   * Handles navigating back.
   */
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading test suite details..." showLabel />
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
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
      </div>
    );
  }

  if (!suiteInfo) {
    return (
      <div className="p-6">
        <EmptyState
          title="Test suite not found"
          description="The requested test suite could not be found. It may have been removed or the ID is incorrect."
          actionLabel="Go Back"
          onAction={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={handleBack}
            className="mt-1 p-1.5 rounded-md text-brand-gray-500 hover:text-brand-gray-700 hover:bg-brand-gray-100 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-brand-gray-900">
                {suiteInfo.suiteName}
              </h1>
              <StatusBadge status={suiteInfo.overallStatus} size="md" />
            </div>
            <p className="text-sm text-brand-gray-500 mt-1">
              {suiteInfo.application} · {suiteInfo.totalAssets} test asset{suiteInfo.totalAssets !== 1 ? 's' : ''} · Owned by {suiteInfo.owner}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {exportData.length > 0 && (
            <ExportButton
              data={exportData}
              filename={`test-suite-${suiteInfo.suiteId || 'detail'}`}
              title={`Test Suite Detail: ${suiteInfo.suiteName}`}
              sheetName="Test Suite"
              label="Export"
              size="md"
            />
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <MetricCard
          label="Test Assets"
          value={suiteInfo.totalAssets}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <MetricCard
          label="Active"
          value={suiteInfo.activeCount}
          trend="up"
          trendValue={suiteInfo.totalAssets > 0 ? `${Math.round((suiteInfo.activeCount / suiteInfo.totalAssets) * 100)}%` : '0%'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Automated"
          value={suiteInfo.automatedCount}
          trend="up"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <MetricCard
          label="Manual"
          value={suiteInfo.manualCount}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
        {executionKPIs && (
          <>
            <MetricCard
              label="Executions"
              value={executionKPIs.total}
              trend="neutral"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <MetricCard
              label="Pass Rate"
              value={executionKPIs.passRate}
              trend={executionKPIs.passRate >= 90 ? 'up' : executionKPIs.passRate >= 75 ? 'neutral' : 'down'}
              trendValue={executionKPIs.passRate >= 90 ? 'Good' : executionKPIs.passRate >= 75 ? 'Fair' : 'Low'}
              suffix="%"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
            />
            <MetricCard
              label="Failed"
              value={executionKPIs.failedCount}
              trend={executionKPIs.failedCount === 0 ? 'up' : 'down'}
              trendValue={executionKPIs.failedCount === 0 ? 'None' : 'Action needed'}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <MetricCard
              label="Avg Duration"
              value={executionKPIs.avgDuration}
              trend="neutral"
              suffix="s"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </>
        )}
      </div>

      {/* Suite Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Suite Info */}
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-brand-gray-900">Suite Details</h2>

          <div className="space-y-3">
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Suite Name</p>
              <p className="text-sm font-medium text-brand-gray-900">{suiteInfo.suiteName}</p>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Application</p>
              <p className="text-sm font-medium text-brand-gray-900">{suiteInfo.application}</p>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Owner</p>
              <p className="text-sm font-medium text-brand-gray-900">{suiteInfo.owner}</p>
              {suiteInfo.ownerEmail && (
                <p className="text-xs text-brand-gray-500 truncate">{suiteInfo.ownerEmail}</p>
              )}
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Status</p>
              <StatusBadge status={suiteInfo.overallStatus} size="md" />
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Suite ID</p>
              <p className="text-xs font-mono text-brand-gray-600">{suiteInfo.suiteId}</p>
            </div>
          </div>

          {/* Asset Type Breakdown */}
          <div>
            <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
              Asset Breakdown
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-gray-600">Automated</span>
                <span className="text-sm font-medium text-brand-500">{suiteInfo.automatedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-gray-600">Manual</span>
                <span className="text-sm font-medium text-yellow-600">{suiteInfo.manualCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-gray-600">Active</span>
                <span className="text-sm font-medium text-brand-green-600">{suiteInfo.activeCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-gray-600">Draft</span>
                <span className="text-sm font-medium text-brand-gray-600">{suiteInfo.draftCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-gray-600">Retired</span>
                <span className="text-sm font-medium text-brand-gray-500">{suiteInfo.retiredCount}</span>
              </div>
            </div>
          </div>

          {/* Automation Rate */}
          <div>
            <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
              Automation Rate
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-brand-gray-200 rounded-full">
                <div
                  className="h-3 bg-brand-500 rounded-full"
                  style={{
                    width: `${suiteInfo.totalAssets > 0 ? Math.round((suiteInfo.automatedCount / suiteInfo.totalAssets) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-brand-gray-900">
                {suiteInfo.totalAssets > 0 ? Math.round((suiteInfo.automatedCount / suiteInfo.totalAssets) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Execution Status Distribution */}
            {executionStatusData.length > 0 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <ChartWrapper
                  chartType="pie"
                  data={executionStatusData}
                  config={pieChartConfig}
                  title="Execution Status"
                  subtitle="Distribution of execution outcomes"
                  height={250}
                  loading={false}
                  emptyMessage="No execution data available"
                />
              </div>
            )}

            {/* Pass Rate Trend */}
            {executionTrendData.length > 1 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <ChartWrapper
                  chartType="line"
                  data={executionTrendData}
                  config={trendChartConfig}
                  title="Pass Rate Trend"
                  subtitle="Pass rate over recent executions"
                  height={250}
                  loading={false}
                  emptyMessage="Not enough data for trend"
                />
              </div>
            )}

            {executionStatusData.length === 0 && executionTrendData.length <= 1 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm flex items-center justify-center min-h-[250px] md:col-span-2">
                <div className="text-center">
                  <svg className="w-10 h-10 text-brand-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  <p className="text-sm text-brand-gray-500">No execution data available for this suite</p>
                </div>
              </div>
            )}
          </div>

          {/* Execution Count Trend */}
          {executionTrendData.length > 1 && (
            <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
              <ChartWrapper
                chartType="bar"
                data={executionTrendData}
                config={executionCountChartConfig}
                title="Execution History"
                subtitle="Passed vs. failed executions over time"
                height={250}
                loading={false}
                emptyMessage="Not enough data for chart"
              />
            </div>
          )}
        </div>
      </div>

      {/* Linked Test Assets Table */}
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h2 className="text-lg font-semibold text-brand-gray-900">
            Linked Test Assets
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({testAssets.length})
          </span>
        </div>
        {testAssets.length > 0 ? (
          <DataTable
            columns={testAssetColumns}
            data={testAssets}
            pageSize={10}
            selectable={false}
            searchFields={['name', 'type', 'status', 'priority', 'owner', 'description']}
            emptyMessage="No test assets found in this suite."
            rowKeyField="id"
            storageKey={`suite-detail-assets-${suiteId}`}
          />
        ) : (
          <div className="flex items-center justify-center py-8 text-sm text-brand-gray-500">
            No test assets found in this suite.
          </div>
        )}
      </div>

      {/* Execution History Table */}
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
            Execution History
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
            searchFields={['id', 'testAssetId', 'type', 'status', 'environment', 'executor']}
            emptyMessage="No executions found for this suite."
            rowKeyField="id"
            storageKey={`suite-detail-execs-${suiteId}`}
          />
        ) : (
          <div className="flex items-center justify-center py-8 text-sm text-brand-gray-500">
            No executions found for this suite.
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{suiteInfo.suiteName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{suiteInfo.activeCount} Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{suiteInfo.draftCount} Draft</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-500" />
            <span>{suiteInfo.retiredCount} Retired</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{suiteInfo.automatedCount} Automated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{suiteInfo.manualCount} Manual</span>
          </div>
          {executionKPIs && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-green-500" />
                <span>{executionKPIs.passedCount} Passed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>{executionKPIs.failedCount} Failed</span>
              </div>
            </>
          )}
          <div className="ml-auto text-[10px] text-brand-gray-400">
            {executions.length} total executions
          </div>
        </div>
      </div>
    </div>
  );
}
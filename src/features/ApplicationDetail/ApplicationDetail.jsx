/**
 * ApplicationDetail Component
 * Application Detail screen (FR-006): displays full quality profile for a selected application
 * including quality score, test coverage, automation rate, defect history chart, release history,
 * environment status, and linked test assets. Uses RepositoryService.getApplicationById().
 * Read-only detail view with export option.
 * @module ApplicationDetail
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import { getApplicationById } from '../../shared/services/repositoryService.js';
import { getTestAssets } from '../../shared/services/repositoryService.js';
import { getReleaseDashboardData } from '../../shared/services/dashboardService.js';
import { getEnvironments } from '../../shared/services/executionService.js';
import { getExecutionsByApplication } from '../../shared/services/executionService.js';
import { getAutomationHealthByApp } from '../../shared/services/dashboardService.js';
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
 * ApplicationDetail page component.
 * Displays full quality profile for a selected application including quality score,
 * test coverage, automation rate, defect history chart, release history,
 * environment status, and linked test assets.
 *
 * @returns {React.ReactElement} The application detail page
 */
export default function ApplicationDetail() {
  const { currentUser, role } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Related data
  const [testAssets, setTestAssets] = useState([]);
  const [testAssetsLoading, setTestAssetsLoading] = useState(false);

  const [releases, setReleases] = useState([]);
  const [releasesLoading, setReleasesLoading] = useState(false);

  const [environments, setEnvironments] = useState([]);
  const [environmentsLoading, setEnvironmentsLoading] = useState(false);

  const [executions, setExecutions] = useState([]);
  const [executionsLoading, setExecutionsLoading] = useState(false);

  const [automationHealth, setAutomationHealth] = useState(null);

  /**
   * Fetches the application data by id.
   */
  const fetchApplication = useCallback(async () => {
    if (!id) {
      setError('No application ID provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const app = await getApplicationById(id);
      if (!app) {
        setError('Application not found.');
        setLoading(false);
        return;
      }
      setApplication(app);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load application details.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  /**
   * Fetches related test assets for the application.
   */
  const fetchTestAssets = useCallback(async () => {
    if (!application) {
      return;
    }

    setTestAssetsLoading(true);

    try {
      const result = await getTestAssets({ application: application.name });
      setTestAssets(result.testAssets || []);
    } catch {
      setTestAssets([]);
    } finally {
      setTestAssetsLoading(false);
    }
  }, [application]);

  /**
   * Fetches related releases for the application.
   */
  const fetchReleases = useCallback(async () => {
    if (!application) {
      return;
    }

    setReleasesLoading(true);

    try {
      const result = await getReleaseDashboardData({ application: application.name });
      setReleases(result.releases || []);
    } catch {
      setReleases([]);
    } finally {
      setReleasesLoading(false);
    }
  }, [application]);

  /**
   * Fetches related environments for the application.
   */
  const fetchEnvironments = useCallback(async () => {
    if (!application) {
      return;
    }

    setEnvironmentsLoading(true);

    try {
      const allEnvs = await getEnvironments();
      const appEnvs = allEnvs.filter(
        (env) => env.application === application.name || env.application === 'Multiple'
      );
      setEnvironments(appEnvs);
    } catch {
      setEnvironments([]);
    } finally {
      setEnvironmentsLoading(false);
    }
  }, [application]);

  /**
   * Fetches recent executions for the application.
   */
  const fetchExecutions = useCallback(async () => {
    if (!application) {
      return;
    }

    setExecutionsLoading(true);

    try {
      const execs = await getExecutionsByApplication(application.name);
      setExecutions(execs.slice(0, 20));
    } catch {
      setExecutions([]);
    } finally {
      setExecutionsLoading(false);
    }
  }, [application]);

  /**
   * Fetches automation health data for the application.
   */
  const fetchAutomationHealth = useCallback(async () => {
    if (!application) {
      return;
    }

    try {
      const health = await getAutomationHealthByApp(application.id);
      setAutomationHealth(health);
    } catch {
      setAutomationHealth(null);
    }
  }, [application]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  useEffect(() => {
    if (application) {
      fetchTestAssets();
      fetchReleases();
      fetchEnvironments();
      fetchExecutions();
      fetchAutomationHealth();
    }
  }, [application, fetchTestAssets, fetchReleases, fetchEnvironments, fetchExecutions, fetchAutomationHealth]);

  /**
   * Automation trend chart data from automation health.
   */
  const automationTrendData = useMemo(() => {
    if (!automationHealth || !automationHealth.trendData || automationHealth.trendData.length === 0) {
      return [];
    }
    return automationHealth.trendData;
  }, [automationHealth]);

  /**
   * Automation trend chart config.
   */
  const automationTrendConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'automationRate', name: 'Automation Rate', color: '#0069cc' },
        { dataKey: 'passRate', name: 'Pass Rate', color: '#0f9d58' },
        { dataKey: 'flakyTestRate', name: 'Flaky Rate', color: '#ef4444' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

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
   * Test assets table columns.
   */
  const testAssetColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Test Asset',
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
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'suite',
        label: 'Suite',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-600 truncate max-w-[150px] block">{value}</span>
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
   * Release table columns.
   */
  const releaseColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Release',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
        ),
      },
      {
        key: 'version',
        label: 'Version',
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
   * Environment table columns.
   */
  const environmentColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Environment',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
        ),
      },
      {
        key: 'type',
        label: 'Type',
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
            <span className={`text-sm font-medium ${colorClass}`}>{value}%</span>
          );
        },
      },
      {
        key: 'lastHealthCheck',
        label: 'Last Health Check',
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
   * Execution table columns.
   */
  const executionColumns = useMemo(() => {
    return [
      {
        key: 'suiteName',
        label: 'Suite',
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
   * Export data for the application detail.
   */
  const exportData = useMemo(() => {
    if (!application) {
      return [];
    }

    return [{
      id: application.id,
      name: application.name,
      portfolio: application.portfolio,
      owner: application.owner,
      ownerEmail: application.ownerEmail,
      status: application.status,
      qualityScore: application.qualityScore,
      testCoverage: application.testCoverage,
      automationRate: application.automationRate,
      riskLevel: application.riskLevel,
      environment: application.environment,
      lastRelease: application.lastRelease,
      description: application.description,
      techStack: application.techStack ? application.techStack.join(', ') : '',
      archived: application.archived,
      totalTestAssets: testAssets.length,
      totalReleases: releases.length,
      totalEnvironments: environments.length,
      totalExecutions: executions.length,
    }];
  }, [application, testAssets, releases, environments, executions]);

  /**
   * Handles navigating back to the application repository.
   */
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading application details..." showLabel />
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
            onClick={fetchApplication}
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

  if (!application) {
    return (
      <div className="p-6">
        <EmptyState
          title="Application not found"
          description="The requested application could not be found. It may have been removed or the ID is incorrect."
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
                {application.name}
              </h1>
              <StatusBadge status={application.status} size="md" />
              <StatusBadge status={application.riskLevel} size="md" />
              {application.archived && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 ring-1 ring-inset ring-brand-gray-300">
                  Archived
                </span>
              )}
            </div>
            <p className="text-sm text-brand-gray-500 mt-1">
              {application.portfolio} · Owned by {application.owner}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {exportData.length > 0 && (
            <ExportButton
              data={exportData}
              filename={`application-detail-${application.id}`}
              title={`Application Detail: ${application.name}`}
              sheetName="Application Detail"
              label="Export"
              size="md"
            />
          )}
        </div>
      </div>

      {/* Description */}
      {application.description && (
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
            Description
          </h3>
          <p className="text-sm text-brand-gray-700 leading-relaxed">
            {application.description}
          </p>
        </div>
      )}

      {/* Quality KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Quality Score"
          value={application.qualityScore}
          trend={application.qualityScore >= 80 ? 'up' : application.qualityScore >= 70 ? 'neutral' : 'down'}
          trendValue={application.qualityScore >= 80 ? 'Good' : application.qualityScore >= 70 ? 'Fair' : 'Needs attention'}
          suffix="/100"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Test Coverage"
          value={application.testCoverage}
          trend={application.testCoverage >= 75 ? 'up' : application.testCoverage >= 60 ? 'neutral' : 'down'}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <MetricCard
          label="Automation Rate"
          value={application.automationRate}
          trend={application.automationRate >= 60 ? 'up' : application.automationRate >= 40 ? 'neutral' : 'down'}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <MetricCard
          label="Test Assets"
          value={testAssets.length}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <MetricCard
          label="Releases"
          value={releases.length}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          }
        />
        <MetricCard
          label="Environments"
          value={environments.length}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Application Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-brand-gray-900">Application Details</h2>

          <div className="space-y-3">
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Portfolio</p>
              <p className="text-sm font-medium text-brand-gray-900">{application.portfolio}</p>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Owner</p>
              <p className="text-sm font-medium text-brand-gray-900">{application.owner}</p>
              {application.ownerEmail && (
                <p className="text-xs text-brand-gray-500 truncate">{application.ownerEmail}</p>
              )}
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Environment</p>
              <p className="text-sm font-medium text-brand-gray-900 capitalize">
                {application.environment || '—'}
              </p>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Last Release</p>
              <p className="text-sm font-medium text-brand-gray-900">
                {formatDisplayDate(application.lastRelease) || '—'}
              </p>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Risk Level</p>
              <StatusBadge status={application.riskLevel} size="md" />
            </div>
          </div>

          {/* Tech Stack */}
          {application.techStack && application.techStack.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {application.techStack.map((tech, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="space-y-2 text-sm text-brand-gray-600 pt-2 border-t border-brand-gray-200">
            {application.createdAt && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Created: {formatDisplayDate(application.createdAt)}</span>
              </div>
            )}
            {application.updatedAt && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Updated: {formatDisplayDate(application.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Automation Trend Chart */}
          {automationTrendData.length > 0 && (
            <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
              <ChartWrapper
                chartType="area"
                data={automationTrendData}
                config={automationTrendConfig}
                title="Automation & Quality Trends"
                subtitle="6-month trend for automation rate, pass rate, and flaky test rate"
                height={280}
                loading={false}
                emptyMessage="No automation trend data available"
              />
            </div>
          )}

          {/* Execution Status Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {executionStatusData.length > 0 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <ChartWrapper
                  chartType="pie"
                  data={executionStatusData}
                  config={pieChartConfig}
                  title="Execution Status"
                  subtitle="Recent test execution results"
                  height={250}
                  loading={false}
                  emptyMessage="No execution data available"
                />
              </div>
            )}

            {/* Automation Health Summary */}
            {automationHealth && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-brand-gray-900 mb-3">Automation Health</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-brand-gray-600">Health Status</span>
                    <StatusBadge status={automationHealth.healthStatus} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-brand-gray-600">Automated Tests</span>
                    <span className="text-sm font-medium text-brand-gray-900">{automationHealth.totalAutomatedTests}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-brand-gray-600">Manual Tests</span>
                    <span className="text-sm font-medium text-brand-gray-900">{automationHealth.totalManualTests}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-brand-gray-600">Pass Rate</span>
                    <span className={`text-sm font-semibold ${automationHealth.passRate >= 95 ? 'text-brand-green-600' : automationHealth.passRate >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {automationHealth.passRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-brand-gray-600">Flaky Rate</span>
                    <span className={`text-sm font-semibold ${automationHealth.flakyTestRate <= 3 ? 'text-brand-green-600' : automationHealth.flakyTestRate <= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {automationHealth.flakyTestRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-brand-gray-600">Avg Execution Time</span>
                    <span className="text-sm font-medium text-brand-gray-900">{automationHealth.avgExecutionTime}s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-brand-gray-600">Failed Tests</span>
                    <span className={`text-sm font-semibold ${automationHealth.failedTests === 0 ? 'text-brand-green-600' : 'text-red-600'}`}>
                      {automationHealth.failedTests}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-brand-gray-600">Framework</span>
                    <span className="text-sm font-medium text-brand-gray-900">{automationHealth.framework}</span>
                  </div>
                  {automationHealth.lastRun && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-brand-gray-600">Last Run</span>
                      <span className="text-xs text-brand-gray-500">{formatDisplayDate(automationHealth.lastRun)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!automationHealth && executionStatusData.length === 0 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm flex items-center justify-center min-h-[250px]">
                <div className="text-center">
                  <svg className="w-10 h-10 text-brand-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  <p className="text-sm text-brand-gray-500">No automation data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Release History Table */}
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
            Release History
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({releases.length})
          </span>
        </div>
        {releasesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-xs text-brand-gray-400">Loading releases...</p>
            </div>
          </div>
        ) : releases.length > 0 ? (
          <DataTable
            columns={releaseColumns}
            data={releases}
            pageSize={5}
            selectable={false}
            searchFields={['name', 'version', 'status', 'qualityGateStatus']}
            emptyMessage="No releases found for this application."
            rowKeyField="id"
            storageKey={`app-detail-releases-${id}`}
          />
        ) : (
          <div className="flex items-center justify-center py-8 text-sm text-brand-gray-500">
            No releases found for this application.
          </div>
        )}
      </div>

      {/* Environment Status Table */}
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
            Environment Status
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({environments.length})
          </span>
        </div>
        {environmentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-xs text-brand-gray-400">Loading environments...</p>
            </div>
          </div>
        ) : environments.length > 0 ? (
          <DataTable
            columns={environmentColumns}
            data={environments}
            pageSize={5}
            selectable={false}
            searchFields={['name', 'type', 'status']}
            emptyMessage="No environments found for this application."
            rowKeyField="id"
            storageKey={`app-detail-envs-${id}`}
          />
        ) : (
          <div className="flex items-center justify-center py-8 text-sm text-brand-gray-500">
            No environments found for this application.
          </div>
        )}
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
        {testAssetsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-xs text-brand-gray-400">Loading test assets...</p>
            </div>
          </div>
        ) : testAssets.length > 0 ? (
          <DataTable
            columns={testAssetColumns}
            data={testAssets}
            pageSize={10}
            selectable={false}
            searchFields={['name', 'suite', 'type', 'status', 'priority']}
            emptyMessage="No test assets found for this application."
            rowKeyField="id"
            storageKey={`app-detail-tests-${id}`}
          />
        ) : (
          <div className="flex items-center justify-center py-8 text-sm text-brand-gray-500">
            No test assets found for this application.
          </div>
        )}
      </div>

      {/* Recent Executions Table */}
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
        {executionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-xs text-brand-gray-400">Loading executions...</p>
            </div>
          </div>
        ) : executions.length > 0 ? (
          <DataTable
            columns={executionColumns}
            data={executions}
            pageSize={10}
            selectable={false}
            searchFields={['suiteName', 'type', 'status', 'environment', 'executor']}
            emptyMessage="No executions found for this application."
            rowKeyField="id"
            storageKey={`app-detail-execs-${id}`}
          />
        ) : (
          <div className="flex items-center justify-center py-8 text-sm text-brand-gray-500">
            No executions found for this application.
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>Quality Score: {application.qualityScore}/100</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>Test Coverage: {application.testCoverage}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Automation: {application.automationRate}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{testAssets.length} Test Assets</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>{releases.length} Releases</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>{environments.length} Environments</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            Last updated: {formatDisplayDate(application.updatedAt) || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
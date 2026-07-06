/**
 * ReleaseDetail Component
 * Release Detail screen (FR-008): displays all details for a selected release
 * including version, status, quality gate criteria table, test coverage metrics,
 * defect breakdown chart, environment readiness, timeline, and owner.
 * Uses localStorage release data. Read-only detail view.
 * @module ReleaseDetail
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import { getReleaseById, getQualityGateData, getPostDeploymentData } from '../../shared/services/dashboardService.js';
import { getExecutionsByApplication } from '../../shared/services/executionService.js';
import { getEnvironments } from '../../shared/services/executionService.js';
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
 * ReleaseDetail page component.
 * Displays full details for a selected release including version, status,
 * quality gate criteria table, test coverage metrics, defect breakdown chart,
 * environment readiness, timeline, and owner.
 *
 * @returns {React.ReactElement} The release detail page
 */
export default function ReleaseDetail() {
  const { currentUser, role } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Related data
  const [qualityGate, setQualityGate] = useState(null);
  const [qualityGateLoading, setQualityGateLoading] = useState(false);

  const [executions, setExecutions] = useState([]);
  const [executionsLoading, setExecutionsLoading] = useState(false);

  const [environments, setEnvironments] = useState([]);
  const [environmentsLoading, setEnvironmentsLoading] = useState(false);

  const [postDeployment, setPostDeployment] = useState(null);
  const [postDeploymentLoading, setPostDeploymentLoading] = useState(false);

  /**
   * Fetches the release data by id.
   */
  const fetchRelease = useCallback(async () => {
    if (!id) {
      setError('No release ID provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rel = await getReleaseById(id);
      if (!rel) {
        setError('Release not found.');
        setLoading(false);
        return;
      }
      setRelease(rel);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load release details.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  /**
   * Fetches related quality gate data for the release.
   */
  const fetchQualityGate = useCallback(async () => {
    if (!release) {
      return;
    }

    setQualityGateLoading(true);

    try {
      const result = await getQualityGateData({ releaseId: release.id });
      const gates = result.qualityGates || [];
      if (gates.length > 0) {
        setQualityGate(gates[0]);
      } else {
        setQualityGate(null);
      }
    } catch {
      setQualityGate(null);
    } finally {
      setQualityGateLoading(false);
    }
  }, [release]);

  /**
   * Fetches recent executions for the release's application.
   */
  const fetchExecutions = useCallback(async () => {
    if (!release) {
      return;
    }

    setExecutionsLoading(true);

    try {
      const execs = await getExecutionsByApplication(release.application);
      setExecutions(execs.slice(0, 20));
    } catch {
      setExecutions([]);
    } finally {
      setExecutionsLoading(false);
    }
  }, [release]);

  /**
   * Fetches environments related to the release.
   */
  const fetchEnvironments = useCallback(async () => {
    if (!release) {
      return;
    }

    setEnvironmentsLoading(true);

    try {
      const allEnvs = await getEnvironments();
      const releaseEnvNames = release.environments || [];
      const appEnvs = allEnvs.filter(
        (env) =>
          env.application === release.application ||
          env.application === 'Multiple' ||
          releaseEnvNames.some((rEnv) => env.type === rEnv || env.name.toLowerCase().includes(rEnv.toLowerCase()))
      );
      setEnvironments(appEnvs);
    } catch {
      setEnvironments([]);
    } finally {
      setEnvironmentsLoading(false);
    }
  }, [release]);

  /**
   * Fetches post-deployment data for the release.
   */
  const fetchPostDeployment = useCallback(async () => {
    if (!release) {
      return;
    }

    setPostDeploymentLoading(true);

    try {
      const result = await getPostDeploymentData({ applicationId: release.application });
      const deployments = result.deployments || [];
      const match = deployments.find((d) => d.releaseId === release.id);
      setPostDeployment(match || null);
    } catch {
      setPostDeployment(null);
    } finally {
      setPostDeploymentLoading(false);
    }
  }, [release]);

  useEffect(() => {
    fetchRelease();
  }, [fetchRelease]);

  useEffect(() => {
    if (release) {
      fetchQualityGate();
      fetchExecutions();
      fetchEnvironments();
      fetchPostDeployment();
    }
  }, [release, fetchQualityGate, fetchExecutions, fetchEnvironments, fetchPostDeployment]);

  /**
   * Quality gate criteria table columns.
   */
  const qualityGateCriteriaColumns = useMemo(() => {
    return [
      {
        key: 'metric',
        label: 'Metric',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
        ),
      },
      {
        key: 'threshold',
        label: 'Threshold',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'actual',
        label: 'Actual',
        sortable: true,
        render: (value, row) => {
          let colorClass = 'text-brand-gray-700';
          if (row.passed) {
            colorClass = 'text-brand-green-600';
          } else {
            colorClass = 'text-red-600';
          }
          return (
            <span className={`text-sm font-semibold ${colorClass}`}>{value}</span>
          );
        },
      },
      {
        key: 'passed',
        label: 'Result',
        sortable: true,
        render: (value) => (
          <StatusBadge status={value ? 'Passed' : 'Failed'} size="sm" />
        ),
      },
    ];
  }, []);

  /**
   * Quality gate criteria data for the table.
   */
  const qualityGateCriteriaData = useMemo(() => {
    if (!qualityGate || !qualityGate.criteria || qualityGate.criteria.length === 0) {
      return [];
    }
    return qualityGate.criteria.map((criterion, index) => ({
      id: `criterion-${index}`,
      ...criterion,
    }));
  }, [qualityGate]);

  /**
   * Defect breakdown chart data.
   */
  const defectBreakdownData = useMemo(() => {
    if (!release) {
      return [];
    }

    const data = [];
    if (release.defectsOpen > 0) {
      data.push({
        name: 'Open Defects',
        value: release.defectsOpen,
        color: '#ef4444',
      });
    }
    if (release.defectsClosed > 0) {
      data.push({
        name: 'Closed Defects',
        value: release.defectsClosed,
        color: '#0f9d58',
      });
    }

    return data;
  }, [release]);

  /**
   * Pie chart config for defect breakdown.
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
   * Export data for the release detail.
   */
  const exportData = useMemo(() => {
    if (!release) {
      return [];
    }

    return [{
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
      totalEnvironments: environments.length,
      totalExecutions: executions.length,
    }];
  }, [release, environments, executions]);

  /**
   * Handles navigating back.
   */
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading release details..." showLabel />
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
            onClick={fetchRelease}
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

  if (!release) {
    return (
      <div className="p-6">
        <EmptyState
          title="Release not found"
          description="The requested release could not be found. It may have been removed or the ID is incorrect."
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
                {release.name}
              </h1>
              <StatusBadge status={release.status} size="md" />
              <StatusBadge status={release.qualityGateStatus} size="md" />
              {release.status === 'Rolled Back' && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-300">
                  Rolled Back
                </span>
              )}
            </div>
            <p className="text-sm text-brand-gray-500 mt-1">
              {release.application} · v{release.version} · Owned by {release.owner}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {exportData.length > 0 && (
            <ExportButton
              data={exportData}
              filename={`release-detail-${release.id}`}
              title={`Release Detail: ${release.name}`}
              sheetName="Release Detail"
              label="Export"
              size="md"
            />
          )}
        </div>
      </div>

      {/* Description */}
      {release.description && (
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
            Description
          </h3>
          <p className="text-sm text-brand-gray-700 leading-relaxed">
            {release.description}
          </p>
        </div>
      )}

      {/* Quality KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Quality Score"
          value={release.qualityScore}
          trend={release.qualityScore >= 80 ? 'up' : release.qualityScore >= 70 ? 'neutral' : 'down'}
          trendValue={release.qualityScore >= 80 ? 'Good' : release.qualityScore >= 70 ? 'Fair' : 'Needs attention'}
          suffix="/100"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Test Coverage"
          value={release.testCoverage}
          trend={release.testCoverage >= 75 ? 'up' : release.testCoverage >= 60 ? 'neutral' : 'down'}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <MetricCard
          label="Open Defects"
          value={release.defectsOpen}
          trend={release.defectsOpen === 0 ? 'up' : 'down'}
          trendValue={release.defectsOpen === 0 ? 'None' : 'Action needed'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Closed Defects"
          value={release.defectsClosed}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Environments"
          value={release.environments ? release.environments.length : 0}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <MetricCard
          label="Executions"
          value={executions.length}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </div>

      {/* Release Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-brand-gray-900">Release Details</h2>

          <div className="space-y-3">
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Application</p>
              <p className="text-sm font-medium text-brand-gray-900">{release.application}</p>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Version</p>
              <p className="text-sm font-medium text-brand-gray-900">v{release.version}</p>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Owner</p>
              <p className="text-sm font-medium text-brand-gray-900">{release.owner}</p>
              {release.ownerEmail && (
                <p className="text-xs text-brand-gray-500 truncate">{release.ownerEmail}</p>
              )}
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Release Date</p>
              <p className="text-sm font-medium text-brand-gray-900">
                {formatDisplayDate(release.releaseDate) || '—'}
              </p>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Status</p>
              <StatusBadge status={release.status} size="md" />
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Quality Gate</p>
              <StatusBadge status={release.qualityGateStatus} size="md" />
            </div>
          </div>

          {/* Environments */}
          {release.environments && release.environments.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                Target Environments
              </h3>
              <div className="flex flex-wrap gap-2">
                {release.environments.map((env, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300"
                  >
                    {env}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="space-y-2 text-sm text-brand-gray-600 pt-2 border-t border-brand-gray-200">
            {release.createdAt && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Created: {formatDisplayDate(release.createdAt)}</span>
              </div>
            )}
            {release.updatedAt && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Updated: {formatDisplayDate(release.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Charts & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Defect Breakdown */}
            {defectBreakdownData.length > 0 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <ChartWrapper
                  chartType="pie"
                  data={defectBreakdownData}
                  config={pieChartConfig}
                  title="Defect Breakdown"
                  subtitle="Open vs. closed defects for this release"
                  height={250}
                  loading={false}
                  emptyMessage="No defect data available"
                />
              </div>
            )}

            {/* Execution Status Distribution */}
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

            {defectBreakdownData.length === 0 && executionStatusData.length === 0 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm flex items-center justify-center min-h-[250px] md:col-span-2">
                <div className="text-center">
                  <svg className="w-10 h-10 text-brand-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  <p className="text-sm text-brand-gray-500">No chart data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Post-Deployment Summary */}
          {postDeployment && (
            <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-brand-gray-900 mb-3">Post-Deployment Monitoring</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-brand-gray-50 rounded-lg p-3">
                  <p className="text-xs text-brand-gray-500 mb-1">Status</p>
                  <StatusBadge status={postDeployment.status} size="md" />
                </div>
                <div className="bg-brand-gray-50 rounded-lg p-3">
                  <p className="text-xs text-brand-gray-500 mb-1">Response Time</p>
                  <p className="text-sm font-medium text-brand-gray-900">
                    {postDeployment.monitoringMetrics.responseTime}ms
                  </p>
                </div>
                <div className="bg-brand-gray-50 rounded-lg p-3">
                  <p className="text-xs text-brand-gray-500 mb-1">Error Rate</p>
                  <p className={`text-sm font-semibold ${postDeployment.monitoringMetrics.errorRate <= 1 ? 'text-brand-green-600' : postDeployment.monitoringMetrics.errorRate <= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {postDeployment.monitoringMetrics.errorRate}%
                  </p>
                </div>
                <div className="bg-brand-gray-50 rounded-lg p-3">
                  <p className="text-xs text-brand-gray-500 mb-1">Uptime</p>
                  <p className={`text-sm font-semibold ${postDeployment.monitoringMetrics.uptimePercentage >= 99.9 ? 'text-brand-green-600' : postDeployment.monitoringMetrics.uptimePercentage >= 99 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {postDeployment.monitoringMetrics.uptimePercentage}%
                  </p>
                </div>
              </div>

              {/* Performance Impact */}
              {postDeployment.performanceImpact && (
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-brand-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-brand-gray-500">Performance:</span>
                    <StatusBadge status={postDeployment.performanceImpact.assessment === 'improved' ? 'Passed' : postDeployment.performanceImpact.assessment === 'neutral' ? 'Pending' : 'Failed'} size="sm" />
                  </div>
                  {postDeployment.rollbackRequired && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-300">
                      Rollback Required
                    </span>
                  )}
                  {postDeployment.productionIncidents && postDeployment.productionIncidents.length > 0 && (
                    <span className="text-xs text-red-600 font-medium">
                      {postDeployment.productionIncidents.length} incident{postDeployment.productionIncidents.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}

              {/* Notes */}
              {postDeployment.notes && (
                <p className="mt-3 text-xs text-brand-gray-500 leading-relaxed">
                  {postDeployment.notes}
                </p>
              )}
            </div>
          )}

          {/* Timeline */}
          {release.timeline && release.timeline.length > 0 && (
            <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-brand-gray-900 mb-4">Release Timeline</h3>
              <div className="space-y-3">
                {release.timeline.map((entry, index) => {
                  const isLast = index === release.timeline.length - 1;
                  return (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isLast ? 'bg-brand-500' : 'bg-brand-green-500'}`} />
                        {index < release.timeline.length - 1 && (
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
        </div>
      </div>

      {/* Quality Gate Criteria Table */}
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
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-brand-gray-900">
            Quality Gate Criteria
          </h2>
          {qualityGate && (
            <StatusBadge status={qualityGate.overallStatus} size="sm" />
          )}
        </div>
        {qualityGateLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-xs text-brand-gray-400">Loading quality gate data...</p>
            </div>
          </div>
        ) : qualityGateCriteriaData.length > 0 ? (
          <DataTable
            columns={qualityGateCriteriaColumns}
            data={qualityGateCriteriaData}
            pageSize={10}
            selectable={false}
            searchFields={['metric']}
            emptyMessage="No quality gate criteria found for this release."
            rowKeyField="id"
            storageKey={`release-detail-qg-${id}`}
          />
        ) : (
          <div className="flex items-center justify-center py-8 text-sm text-brand-gray-500">
            No quality gate criteria found for this release.
          </div>
        )}
      </div>

      {/* Environment Readiness Table */}
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
            Environment Readiness
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
            emptyMessage="No environments found for this release."
            rowKeyField="id"
            storageKey={`release-detail-envs-${id}`}
          />
        ) : (
          <div className="flex items-center justify-center py-8 text-sm text-brand-gray-500">
            No environments found for this release.
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>Quality Score: {release.qualityScore}/100</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>Test Coverage: {release.testCoverage}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{release.defectsOpen} Open Defects</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{release.defectsClosed} Closed Defects</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>{release.environments ? release.environments.length : 0} Environments</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            Last updated: {formatDisplayDate(release.updatedAt) || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
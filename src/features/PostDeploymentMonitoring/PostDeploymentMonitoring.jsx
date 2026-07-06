/**
 * PostDeploymentMonitoring Component
 * Post Deployment Monitoring screen (FR-020): displays production outcomes linked to releases
 * with MetricCards (deployments this month, incident rate, rollback rate), outcomes DataTable
 * with drill-down, incident trend chart, and correlation view linking test quality to production
 * outcomes. Uses localStorage post-deployment data.
 * @module PostDeploymentMonitoring
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getPostDeploymentData,
  getReleaseDashboardData,
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
  healthy: '#0f9d58',
  degraded: '#f59e0b',
  incident: '#f97316',
  rolled_back: '#ef4444',
};

/**
 * Performance assessment color mapping for charts.
 * @type {Object.<string, string>}
 */
const ASSESSMENT_COLORS = {
  improved: '#0f9d58',
  neutral: '#939ba3',
  degraded: '#ef4444',
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
 * PostDeploymentMonitoring page component.
 * Displays production outcomes linked to releases with KPI cards, outcomes DataTable
 * with drill-down, incident trend chart, and correlation view linking test quality
 * to production outcomes.
 *
 * @returns {React.ReactElement} The post-deployment monitoring page
 */
export default function PostDeploymentMonitoring() {
  const { currentUser, role } = useAuth();

  const [deployments, setDeployments] = useState([]);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    status: '',
    environment: '',
    application: '',
  });

  // Detail modal state
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  /**
   * Fetches post-deployment and release data.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {};

      if (filterValues.status) {
        filters.status = filterValues.status;
      }

      if (filterValues.environment) {
        filters.environment = filterValues.environment;
      }

      const [pdResult, releaseResult] = await Promise.all([
        getPostDeploymentData(filters),
        getReleaseDashboardData(),
      ]);

      let filteredDeployments = pdResult.deployments || [];

      if (filterValues.application) {
        filteredDeployments = filteredDeployments.filter(
          (d) => d.application === filterValues.application
        );
      }

      setDeployments(filteredDeployments);
      setReleases(releaseResult.releases || []);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load post-deployment monitoring data.';
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
      status: '',
      environment: '',
      application: '',
    });
  }, []);

  /**
   * Distinct statuses for filter dropdown.
   */
  const distinctStatuses = useMemo(() => {
    const statuses = new Set();
    for (const d of deployments) {
      if (d.status) {
        statuses.add(d.status);
      }
    }
    return Array.from(statuses).sort();
  }, [deployments]);

  /**
   * Distinct environments for filter dropdown.
   */
  const distinctEnvironments = useMemo(() => {
    const envs = new Set();
    for (const d of deployments) {
      if (d.environment) {
        envs.add(d.environment);
      }
    }
    return Array.from(envs).sort();
  }, [deployments]);

  /**
   * Distinct applications for filter dropdown.
   */
  const distinctApplications = useMemo(() => {
    const apps = new Set();
    for (const d of deployments) {
      if (d.application) {
        apps.add(d.application);
      }
    }
    return Array.from(apps).sort();
  }, [deployments]);

  /**
   * Builds the filter configuration for the FilterBar.
   */
  const filterConfig = useMemo(() => {
    return [
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
          label: e.charAt(0).toUpperCase() + e.slice(1),
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
  }, [distinctStatuses, distinctEnvironments, distinctApplications]);

  /**
   * Summary KPIs computed from all deployments.
   */
  const summaryKPIs = useMemo(() => {
    if (!deployments || deployments.length === 0) {
      return null;
    }

    const total = deployments.length;
    let healthyCount = 0;
    let degradedCount = 0;
    let incidentCount = 0;
    let rolledBackCount = 0;
    let totalIncidents = 0;
    let totalResponseTime = 0;
    let totalErrorRate = 0;
    let totalUptime = 0;
    let metricsCount = 0;
    let improvedCount = 0;
    let neutralCount = 0;
    let degradedAssessmentCount = 0;
    let totalAffectedUsers = 0;

    for (const d of deployments) {
      if (d.status === 'healthy') {
        healthyCount++;
      } else if (d.status === 'degraded') {
        degradedCount++;
      } else if (d.status === 'incident') {
        incidentCount++;
      } else if (d.status === 'rolled_back') {
        rolledBackCount++;
      }

      if (d.productionIncidents && Array.isArray(d.productionIncidents)) {
        totalIncidents += d.productionIncidents.length;
      }

      if (d.monitoringMetrics && d.monitoringMetrics.responseTime > 0) {
        totalResponseTime += d.monitoringMetrics.responseTime;
        totalErrorRate += d.monitoringMetrics.errorRate;
        totalUptime += d.monitoringMetrics.uptimePercentage;
        metricsCount++;
      }

      if (d.performanceImpact) {
        if (d.performanceImpact.assessment === 'improved') {
          improvedCount++;
        } else if (d.performanceImpact.assessment === 'neutral') {
          neutralCount++;
        } else if (d.performanceImpact.assessment === 'degraded') {
          degradedAssessmentCount++;
        }
      }

      if (d.userImpact) {
        totalAffectedUsers += d.userImpact.affectedUsers || 0;
      }
    }

    const incidentRate = total > 0
      ? Math.round((incidentCount / total) * 1000) / 10
      : 0;

    const rollbackRate = total > 0
      ? Math.round((rolledBackCount / total) * 1000) / 10
      : 0;

    const avgResponseTime = metricsCount > 0
      ? Math.round(totalResponseTime / metricsCount)
      : 0;

    const avgErrorRate = metricsCount > 0
      ? Math.round((totalErrorRate / metricsCount) * 100) / 100
      : 0;

    const avgUptime = metricsCount > 0
      ? Math.round((totalUptime / metricsCount) * 100) / 100
      : 0;

    return {
      total,
      healthyCount,
      degradedCount,
      incidentCount,
      rolledBackCount,
      totalIncidents,
      incidentRate,
      rollbackRate,
      avgResponseTime,
      avgErrorRate,
      avgUptime,
      improvedCount,
      neutralCount,
      degradedAssessmentCount,
      totalAffectedUsers,
    };
  }, [deployments]);

  /**
   * Status distribution chart data.
   */
  const statusDistributionData = useMemo(() => {
    if (!deployments || deployments.length === 0) {
      return [];
    }

    const counts = {};
    for (const d of deployments) {
      const status = d.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: STATUS_COLORS[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [deployments]);

  /**
   * Performance assessment distribution chart data.
   */
  const assessmentDistributionData = useMemo(() => {
    if (!deployments || deployments.length === 0) {
      return [];
    }

    const counts = {};
    for (const d of deployments) {
      if (d.performanceImpact && d.performanceImpact.assessment) {
        const assessment = d.performanceImpact.assessment;
        counts[assessment] = (counts[assessment] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([assessment, count]) => ({
        name: assessment.charAt(0).toUpperCase() + assessment.slice(1),
        value: count,
        color: ASSESSMENT_COLORS[assessment] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [deployments]);

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
   * Incident trend data grouped by month.
   */
  const incidentTrendData = useMemo(() => {
    if (!deployments || deployments.length === 0) {
      return [];
    }

    const monthMap = {};

    for (const d of deployments) {
      if (!d.deployDate) {
        continue;
      }
      const date = new Date(d.deployDate);
      if (isNaN(date.getTime())) {
        continue;
      }
      const monthKey = date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
      });

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthKey,
          deployments: 0,
          incidents: 0,
          rollbacks: 0,
          timestamp: date.getTime(),
        };
      }

      monthMap[monthKey].deployments++;

      if (d.productionIncidents && Array.isArray(d.productionIncidents)) {
        monthMap[monthKey].incidents += d.productionIncidents.length;
      }

      if (d.rollbackRequired) {
        monthMap[monthKey].rollbacks++;
      }
    }

    const trendArray = Object.values(monthMap);
    trendArray.sort((a, b) => a.timestamp - b.timestamp);

    return trendArray;
  }, [deployments]);

  /**
   * Incident trend chart config.
   */
  const incidentTrendConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'deployments', name: 'Deployments', color: '#0069cc' },
        { dataKey: 'incidents', name: 'Incidents', color: '#ef4444' },
        { dataKey: 'rollbacks', name: 'Rollbacks', color: '#f97316' },
      ],
      showLegend: true,
    };
  }, []);

  /**
   * Correlation data linking test quality to production outcomes.
   */
  const correlationData = useMemo(() => {
    if (!deployments || deployments.length === 0) {
      return [];
    }

    const releaseMap = {};
    for (const r of releases) {
      releaseMap[r.id] = r;
    }

    return deployments
      .filter((d) => {
        const release = releaseMap[d.releaseId];
        return release && d.monitoringMetrics && d.monitoringMetrics.responseTime > 0;
      })
      .map((d) => {
        const release = releaseMap[d.releaseId];
        const appName = d.application || 'Unknown';
        return {
          name: appName.length > 18 ? appName.substring(0, 15) + '...' : appName,
          testCoverage: release ? release.testCoverage : 0,
          qualityScore: release ? release.qualityScore : 0,
          errorRate: d.monitoringMetrics.errorRate,
        };
      })
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 15);
  }, [deployments, releases]);

  /**
   * Correlation bar chart config.
   */
  const correlationBarConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'qualityScore', name: 'Quality Score', color: '#0069cc' },
        { dataKey: 'testCoverage', name: 'Test Coverage (%)', color: '#0f9d58' },
        { dataKey: 'errorRate', name: 'Error Rate (%)', color: '#ef4444' },
      ],
      showLegend: true,
    };
  }, []);

  /**
   * Response time trend data.
   */
  const responseTimeTrendData = useMemo(() => {
    if (!deployments || deployments.length === 0) {
      return [];
    }

    return deployments
      .filter((d) => d.monitoringMetrics && d.monitoringMetrics.responseTime > 0 && d.deployDate)
      .sort((a, b) => new Date(a.deployDate).getTime() - new Date(b.deployDate).getTime())
      .map((d) => ({
        date: formatDisplayDate(d.deployDate),
        responseTime: d.monitoringMetrics.responseTime,
        errorRate: d.monitoringMetrics.errorRate,
        timestamp: new Date(d.deployDate).getTime(),
      }))
      .slice(-12);
  }, [deployments]);

  /**
   * Response time trend chart config.
   */
  const responseTimeTrendConfig = useMemo(() => {
    return {
      xAxisKey: 'date',
      series: [
        { dataKey: 'responseTime', name: 'Avg Response Time (ms)', color: '#0069cc' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}ms`,
    };
  }, []);

  /**
   * Deployment outcomes table columns.
   */
  const deploymentColumns = useMemo(() => {
    return [
      {
        key: 'release',
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
          <span className="text-xs text-brand-gray-600 capitalize">{value}</span>
        ),
      },
      {
        key: 'performanceImpact',
        label: 'Performance',
        sortable: false,
        render: (value) => {
          if (!value || !value.assessment) {
            return <span className="text-xs text-brand-gray-400">—</span>;
          }
          return <StatusBadge status={value.assessment === 'improved' ? 'Passed' : value.assessment === 'neutral' ? 'Pending' : 'Failed'} size="sm" />;
        },
      },
      {
        key: 'monitoringMetrics',
        label: 'Error Rate',
        sortable: false,
        render: (value) => {
          if (!value || value.errorRate === undefined) {
            return <span className="text-xs text-brand-gray-400">—</span>;
          }
          let colorClass = 'text-brand-green-600';
          if (value.errorRate > 3) {
            colorClass = 'text-red-600';
          } else if (value.errorRate > 1) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-medium ${colorClass}`}>{value.errorRate}%</span>
          );
        },
      },
      {
        key: 'rollbackRequired',
        label: 'Rollback',
        sortable: true,
        render: (value) => (
          <span className={`text-sm font-medium ${value ? 'text-red-600' : 'text-brand-green-600'}`}>
            {value ? 'Yes' : 'No'}
          </span>
        ),
      },
      {
        key: 'deployedBy',
        label: 'Deployed By',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'deployDate',
        label: 'Deploy Date',
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
   * Export data for the deployment outcomes table.
   */
  const deploymentExportData = useMemo(() => {
    return deployments.map((d) => ({
      id: d.id,
      release: d.release,
      releaseId: d.releaseId,
      application: d.application,
      applicationId: d.applicationId,
      status: d.status,
      environment: d.environment,
      deployDate: d.deployDate,
      deployedBy: d.deployedBy,
      deployedByEmail: d.deployedByEmail,
      rollbackRequired: d.rollbackRequired,
      monitoringWindow: d.monitoringWindow,
      performanceAssessment: d.performanceImpact ? d.performanceImpact.assessment : '',
      responseTimeDelta: d.performanceImpact ? d.performanceImpact.responseTimeDelta : '',
      errorRateDelta: d.performanceImpact ? d.performanceImpact.errorRateDelta : '',
      avgResponseTime: d.monitoringMetrics ? d.monitoringMetrics.responseTime : '',
      errorRate: d.monitoringMetrics ? d.monitoringMetrics.errorRate : '',
      uptimePercentage: d.monitoringMetrics ? d.monitoringMetrics.uptimePercentage : '',
      affectedUsers: d.userImpact ? d.userImpact.affectedUsers : 0,
      incidentCount: d.productionIncidents ? d.productionIncidents.length : 0,
      notes: d.notes,
    }));
  }, [deployments]);

  /**
   * Handles clicking a deployment row to open the detail modal.
   *
   * @param {Object} deployment - The deployment object
   */
  const handleRowClick = useCallback((deployment) => {
    setSelectedDeployment(deployment);
    setDetailModalOpen(true);
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedDeployment(null);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading post-deployment monitoring data..." showLabel />
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

  if (!deployments || deployments.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">
              Post-Deployment Monitoring
            </h1>
            <p className="text-sm text-brand-gray-500 mt-1">
              Production outcomes, incident tracking, and deployment quality correlation
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
            title="No deployment data found"
            description="No post-deployment monitoring data matches the selected filters. Try adjusting your filter criteria."
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
            Post-Deployment Monitoring
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Production outcomes, incident tracking, performance impact, and deployment quality correlation
          </p>
        </div>
        {deploymentExportData.length > 0 && (
          <ExportButton
            data={deploymentExportData}
            filename="post-deployment-monitoring"
            title="Post-Deployment Monitoring Report"
            sheetName="Deployments"
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
            label="Total Deployments"
            value={summaryKPIs.total}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            }
          />
          <MetricCard
            label="Healthy"
            value={summaryKPIs.healthyCount}
            trend="up"
            trendValue={summaryKPIs.total > 0 ? `${Math.round((summaryKPIs.healthyCount / summaryKPIs.total) * 100)}%` : '0%'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Degraded"
            value={summaryKPIs.degradedCount}
            trend={summaryKPIs.degradedCount > 2 ? 'down' : 'neutral'}
            trendValue={summaryKPIs.degradedCount > 2 ? 'High' : ''}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Incidents"
            value={summaryKPIs.totalIncidents}
            trend={summaryKPIs.totalIncidents > 5 ? 'down' : summaryKPIs.totalIncidents > 0 ? 'neutral' : 'up'}
            trendValue={summaryKPIs.totalIncidents > 5 ? 'High' : summaryKPIs.totalIncidents === 0 ? 'None' : ''}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <MetricCard
            label="Incident Rate"
            value={summaryKPIs.incidentRate}
            trend={summaryKPIs.incidentRate <= 10 ? 'up' : summaryKPIs.incidentRate <= 20 ? 'neutral' : 'down'}
            trendValue={summaryKPIs.incidentRate <= 10 ? 'Low' : summaryKPIs.incidentRate <= 20 ? 'Moderate' : 'High'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <MetricCard
            label="Rollback Rate"
            value={summaryKPIs.rollbackRate}
            trend={summaryKPIs.rollbackRate <= 5 ? 'up' : summaryKPIs.rollbackRate <= 15 ? 'neutral' : 'down'}
            trendValue={summaryKPIs.rollbackRate <= 5 ? 'Low' : summaryKPIs.rollbackRate <= 15 ? 'Moderate' : 'High'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            }
          />
          <MetricCard
            label="Avg Response Time"
            value={summaryKPIs.avgResponseTime}
            trend={summaryKPIs.avgResponseTime <= 300 ? 'up' : summaryKPIs.avgResponseTime <= 500 ? 'neutral' : 'down'}
            suffix="ms"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Avg Uptime"
            value={summaryKPIs.avgUptime}
            trend={summaryKPIs.avgUptime >= 99.5 ? 'up' : summaryKPIs.avgUptime >= 99 ? 'neutral' : 'down'}
            trendValue={summaryKPIs.avgUptime >= 99.5 ? 'Good' : summaryKPIs.avgUptime >= 99 ? 'Fair' : 'Low'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        {statusDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={statusDistributionData}
              config={pieChartConfig}
              title="Deployment Status Distribution"
              subtitle="Outcomes by deployment status"
              height={280}
              loading={false}
              emptyMessage="No status data available"
            />
          </div>
        )}

        {/* Performance Assessment Distribution */}
        {assessmentDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={assessmentDistributionData}
              config={pieChartConfig}
              title="Performance Impact"
              subtitle="Deployments by performance assessment"
              height={280}
              loading={false}
              emptyMessage="No performance data available"
            />
          </div>
        )}

        {/* Incident Trend */}
        {incidentTrendData.length > 1 ? (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="bar"
              data={incidentTrendData}
              config={incidentTrendConfig}
              title="Deployment & Incident Trend"
              subtitle="Monthly deployments, incidents, and rollbacks"
              height={280}
              loading={false}
              emptyMessage="Not enough data for trend"
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm flex items-center justify-center min-h-[280px]">
            <div className="text-center">
              <svg className="w-10 h-10 text-brand-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <p className="text-sm text-brand-gray-500">Not enough data for trend chart</p>
            </div>
          </div>
        )}
      </div>

      {/* Charts Row 2: Correlation & Response Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality-Production Correlation */}
        {correlationData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="bar"
              data={correlationData}
              config={correlationBarConfig}
              title="Quality vs. Production Outcomes"
              subtitle="Correlation between test quality and production error rates"
              height={300}
              loading={false}
              emptyMessage="No correlation data available"
            />
          </div>
        )}

        {/* Response Time Trend */}
        {responseTimeTrendData.length > 1 ? (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="area"
              data={responseTimeTrendData}
              config={responseTimeTrendConfig}
              title="Response Time Trend"
              subtitle="Average response time across deployments"
              height={300}
              loading={false}
              emptyMessage="Not enough data for trend"
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <svg className="w-10 h-10 text-brand-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <p className="text-sm text-brand-gray-500">Not enough data for response time trend</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Incidents Panel */}
      {deployments.some((d) => d.productionIncidents && d.productionIncidents.length > 0) && (
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
              Recent Production Incidents
            </h2>
          </div>
          <div className="space-y-3">
            {deployments
              .filter((d) => d.productionIncidents && d.productionIncidents.length > 0)
              .slice(0, 5)
              .flatMap((d) =>
                d.productionIncidents.map((incident) => ({
                  ...incident,
                  releaseName: d.release,
                  application: d.application,
                  deployDate: d.deployDate,
                }))
              )
              .slice(0, 8)
              .map((incident) => {
                let borderColor = 'border-brand-gray-200';
                let bgColor = 'bg-brand-gray-50';
                let iconColor = 'text-brand-gray-400';

                if (incident.severity === 'critical') {
                  borderColor = 'border-red-200';
                  bgColor = 'bg-red-50';
                  iconColor = 'text-red-500';
                } else if (incident.severity === 'high') {
                  borderColor = 'border-orange-200';
                  bgColor = 'bg-orange-50';
                  iconColor = 'text-orange-500';
                } else if (incident.severity === 'medium') {
                  borderColor = 'border-yellow-200';
                  bgColor = 'bg-yellow-50';
                  iconColor = 'text-yellow-500';
                } else if (incident.severity === 'low') {
                  borderColor = 'border-brand-200';
                  bgColor = 'bg-brand-50';
                  iconColor = 'text-brand-500';
                }

                return (
                  <div
                    key={incident.id}
                    className={`flex gap-3 p-3 rounded-lg border ${borderColor} ${bgColor}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className={`w-5 h-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-brand-gray-900">
                          {incident.description}
                        </p>
                        <StatusBadge status={incident.severity} size="sm" />
                        <StatusBadge status={incident.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-brand-gray-500">
                        <span>{incident.application}</span>
                        <span>·</span>
                        <span>{incident.releaseName}</span>
                        <span>·</span>
                        <span>Detected: {formatDisplayDateTime(incident.detectedAt)}</span>
                        {incident.resolvedAt && (
                          <>
                            <span>·</span>
                            <span>Resolved: {formatDisplayDateTime(incident.resolvedAt)}</span>
                          </>
                        )}
                      </div>
                      {incident.rootCause && (
                        <p className="text-xs text-brand-gray-600 mt-1 leading-relaxed line-clamp-2">
                          Root Cause: {incident.rootCause}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Deployment Outcomes Table */}
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
            Deployment Outcomes
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({deployments.length})
          </span>
        </div>
        <DataTable
          columns={deploymentColumns}
          data={deployments}
          pageSize={10}
          selectable={false}
          searchFields={['release', 'application', 'status', 'environment', 'deployedBy', 'notes']}
          emptyMessage="No deployment outcomes match the selected filters."
          rowKeyField="id"
          onRowClick={handleRowClick}
          storageKey="post-deployment-monitoring-table"
        />
      </div>

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{deployments.filter((d) => d.status === 'healthy').length} Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{deployments.filter((d) => d.status === 'degraded').length} Degraded</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>{deployments.filter((d) => d.status === 'incident').length} Incident</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{deployments.filter((d) => d.status === 'rolled_back').length} Rolled Back</span>
          </div>
          {summaryKPIs && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-500" />
                <span>Incident Rate: {summaryKPIs.incidentRate}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Rollback Rate: {summaryKPIs.rollbackRate}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-green-500" />
                <span>Avg Uptime: {summaryKPIs.avgUptime}%</span>
              </div>
            </>
          )}
          <div className="ml-auto text-[10px] text-brand-gray-400">
            {deployments.length} total deployment outcomes
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
        title={selectedDeployment ? selectedDeployment.release : ''}
        size="xl"
      >
        {selectedDeployment && (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedDeployment.status} size="md" />
              {selectedDeployment.performanceImpact && (
                <StatusBadge
                  status={
                    selectedDeployment.performanceImpact.assessment === 'improved'
                      ? 'Passed'
                      : selectedDeployment.performanceImpact.assessment === 'neutral'
                      ? 'Pending'
                      : 'Failed'
                  }
                  size="md"
                />
              )}
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 ring-1 ring-inset ring-brand-gray-300 capitalize">
                {selectedDeployment.environment}
              </span>
              {selectedDeployment.rollbackRequired && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-300">
                  Rollback Required
                </span>
              )}
            </div>

            {/* Notes */}
            {selectedDeployment.notes && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Notes
                </h3>
                <p className="text-sm text-brand-gray-700 leading-relaxed">
                  {selectedDeployment.notes}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Application</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedDeployment.application}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Deployed By</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedDeployment.deployedBy}</p>
                {selectedDeployment.deployedByEmail && (
                  <p className="text-xs text-brand-gray-500 truncate">{selectedDeployment.deployedByEmail}</p>
                )}
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Deploy Date</p>
                <p className="text-sm font-medium text-brand-gray-900">
                  {formatDisplayDateTime(selectedDeployment.deployDate) || '—'}
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Monitoring Window</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedDeployment.monitoringWindow}</p>
              </div>
            </div>

            {/* Monitoring Metrics */}
            {selectedDeployment.monitoringMetrics && selectedDeployment.monitoringMetrics.responseTime > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Monitoring Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Response Time</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedDeployment.monitoringMetrics.responseTime}ms</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Error Rate</p>
                    <p className={`text-sm font-semibold ${selectedDeployment.monitoringMetrics.errorRate <= 1 ? 'text-brand-green-600' : selectedDeployment.monitoringMetrics.errorRate <= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {selectedDeployment.monitoringMetrics.errorRate}%
                    </p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Uptime</p>
                    <p className={`text-sm font-semibold ${selectedDeployment.monitoringMetrics.uptimePercentage >= 99.9 ? 'text-brand-green-600' : selectedDeployment.monitoringMetrics.uptimePercentage >= 99 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {selectedDeployment.monitoringMetrics.uptimePercentage}%
                    </p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Requests/min</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedDeployment.monitoringMetrics.requestsPerMinute}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">P95 Response</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedDeployment.monitoringMetrics.p95ResponseTime}ms</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">P99 Response</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedDeployment.monitoringMetrics.p99ResponseTime}ms</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">CPU Utilization</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedDeployment.monitoringMetrics.cpuUtilization}%</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Memory Utilization</p>
                    <p className="text-sm font-medium text-brand-gray-900">{selectedDeployment.monitoringMetrics.memoryUtilization}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Impact */}
            {selectedDeployment.performanceImpact && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Performance Impact
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Assessment</p>
                    <StatusBadge
                      status={
                        selectedDeployment.performanceImpact.assessment === 'improved'
                          ? 'Passed'
                          : selectedDeployment.performanceImpact.assessment === 'neutral'
                          ? 'Pending'
                          : 'Failed'
                      }
                      size="md"
                    />
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Response Time Δ</p>
                    <p className={`text-sm font-semibold ${selectedDeployment.performanceImpact.responseTimeDelta <= 0 ? 'text-brand-green-600' : 'text-red-600'}`}>
                      {selectedDeployment.performanceImpact.responseTimeDelta > 0 ? '+' : ''}{selectedDeployment.performanceImpact.responseTimeDelta}ms
                    </p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Error Rate Δ</p>
                    <p className={`text-sm font-semibold ${selectedDeployment.performanceImpact.errorRateDelta <= 0 ? 'text-brand-green-600' : 'text-red-600'}`}>
                      {selectedDeployment.performanceImpact.errorRateDelta > 0 ? '+' : ''}{selectedDeployment.performanceImpact.errorRateDelta}%
                    </p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Throughput Δ</p>
                    <p className={`text-sm font-semibold ${selectedDeployment.performanceImpact.throughputDelta >= 0 ? 'text-brand-green-600' : 'text-red-600'}`}>
                      {selectedDeployment.performanceImpact.throughputDelta > 0 ? '+' : ''}{selectedDeployment.performanceImpact.throughputDelta}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* User Impact */}
            {selectedDeployment.userImpact && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  User Impact
                </h3>
                <div className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={selectedDeployment.userImpact.severity === 'none' ? 'Passed' : selectedDeployment.userImpact.severity === 'minimal' ? 'Pending' : 'Failed'} size="sm" />
                      <span className="text-sm font-medium text-brand-gray-900 capitalize">
                        {selectedDeployment.userImpact.severity} Impact
                      </span>
                    </div>
                    <span className="text-sm text-brand-gray-600">
                      {selectedDeployment.userImpact.affectedUsers} of {selectedDeployment.userImpact.totalUsers} users ({selectedDeployment.userImpact.impactPercentage}%)
                    </span>
                  </div>
                  <p className="text-xs text-brand-gray-600 leading-relaxed">
                    {selectedDeployment.userImpact.description}
                  </p>
                </div>
              </div>
            )}

            {/* Production Incidents */}
            {selectedDeployment.productionIncidents && selectedDeployment.productionIncidents.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Production Incidents ({selectedDeployment.productionIncidents.length})
                </h3>
                <div className="space-y-3">
                  {selectedDeployment.productionIncidents.map((incident) => (
                    <div
                      key={incident.id}
                      className={`p-3 rounded-lg border ${
                        incident.severity === 'critical' ? 'bg-red-50 border-red-200' :
                        incident.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                        incident.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-brand-50 border-brand-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <StatusBadge status={incident.severity} size="sm" />
                        <StatusBadge status={incident.status} size="sm" />
                      </div>
                      <p className="text-sm text-brand-gray-700 leading-relaxed mt-1">
                        {incident.description}
                      </p>
                      {incident.rootCause && (
                        <p className="text-xs text-brand-gray-600 mt-1">
                          <span className="font-medium">Root Cause:</span> {incident.rootCause}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-brand-gray-500">
                        <span>Detected: {formatDisplayDateTime(incident.detectedAt)}</span>
                        {incident.resolvedAt && (
                          <span>Resolved: {formatDisplayDateTime(incident.resolvedAt)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-600">
              {selectedDeployment.deployDate && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Deployed: {formatDisplayDateTime(selectedDeployment.deployDate)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
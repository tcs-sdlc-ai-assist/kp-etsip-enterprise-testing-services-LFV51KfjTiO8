/**
 * AutomationIntelligence Component
 * Automation Intelligence screen (FR-014): displays enterprise automation health with MetricCards
 * (overall automation rate, flaky test rate, avg execution time, ROI), automation rate by application
 * bar chart, framework distribution pie chart, trend line chart, and recommendations panel.
 * Uses localStorage automation data.
 * @module AutomationIntelligence
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getAutomationMetrics,
} from '../../shared/services/dashboardService.js';
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
 * AutomationIntelligence page component.
 * Displays enterprise automation health with KPI cards, automation rate by application bar chart,
 * framework distribution pie chart, trend line chart, flaky tests table, and recommendations panel.
 *
 * @returns {React.ReactElement} The automation intelligence page
 */
export default function AutomationIntelligence() {
  const { currentUser, role } = useAuth();

  const [automationData, setAutomationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches automation metrics data.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAutomationMetrics();
      setAutomationData(data);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load automation intelligence data.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Executive summary KPIs from automation data.
   */
  const executiveSummary = useMemo(() => {
    if (!automationData || !automationData.executiveSummary) {
      return null;
    }
    return automationData.executiveSummary;
  }, [automationData]);

  /**
   * ROI metrics from automation data.
   */
  const roiMetrics = useMemo(() => {
    if (!automationData || !automationData.roiMetrics) {
      return null;
    }
    return automationData.roiMetrics;
  }, [automationData]);

  /**
   * Application health data for bar chart.
   */
  const applicationHealthChartData = useMemo(() => {
    if (!automationData || !automationData.applicationHealth || automationData.applicationHealth.length === 0) {
      return [];
    }

    return automationData.applicationHealth
      .slice()
      .sort((a, b) => b.automationRate - a.automationRate)
      .slice(0, 15)
      .map((app) => ({
        name: app.name.length > 20 ? app.name.substring(0, 17) + '...' : app.name,
        automationRate: app.automationRate,
        passRate: app.passRate,
      }));
  }, [automationData]);

  /**
   * Application health bar chart config.
   */
  const applicationHealthBarConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'automationRate', name: 'Automation Rate (%)', color: '#0069cc' },
        { dataKey: 'passRate', name: 'Pass Rate (%)', color: '#0f9d58' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * Framework distribution pie chart data.
   */
  const frameworkDistributionData = useMemo(() => {
    if (!automationData || !automationData.frameworkDistribution || automationData.frameworkDistribution.length === 0) {
      return [];
    }

    return automationData.frameworkDistribution
      .filter((f) => f.applicationCount > 0)
      .map((f) => ({
        name: f.framework,
        value: f.applicationCount,
        color: f.color,
      }));
  }, [automationData]);

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
   * Coverage by priority pie chart data.
   */
  const coverageByPriorityData = useMemo(() => {
    if (!automationData || !automationData.coverageByPriority || automationData.coverageByPriority.length === 0) {
      return [];
    }

    return automationData.coverageByPriority.map((c) => ({
      name: c.priority.charAt(0).toUpperCase() + c.priority.slice(1),
      value: c.automatedTests,
      color: c.color,
    }));
  }, [automationData]);

  /**
   * ROI trend chart data.
   */
  const roiTrendData = useMemo(() => {
    if (!roiMetrics || !roiMetrics.monthlySavings || roiMetrics.monthlySavings.length === 0) {
      return [];
    }
    return roiMetrics.monthlySavings;
  }, [roiMetrics]);

  /**
   * ROI trend chart config.
   */
  const roiTrendConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'hoursSaved', name: 'Hours Saved', color: '#0069cc' },
      ],
      showLegend: true,
    };
  }, []);

  /**
   * Cost savings trend chart config.
   */
  const costSavingsTrendConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'costSavings', name: 'Cost Savings (NAD)', color: '#0f9d58' },
      ],
      showLegend: true,
      valueFormatter: (value) => `NAD ${(value / 1000).toFixed(0)}k`,
    };
  }, []);

  /**
   * Application health table columns.
   */
  const applicationHealthColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Application',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900 line-clamp-1">{value}</span>
        ),
      },
      {
        key: 'automationRate',
        label: 'Automation Rate',
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-brand-gray-200 rounded-full max-w-[80px]">
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
        key: 'passRate',
        label: 'Pass Rate',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value < 90) {
            colorClass = 'text-red-600';
          } else if (value < 95) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-semibold ${colorClass}`}>{value}%</span>
          );
        },
      },
      {
        key: 'flakyTestRate',
        label: 'Flaky Rate',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value > 5) {
            colorClass = 'text-red-600';
          } else if (value > 3) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-medium ${colorClass}`}>{value}%</span>
          );
        },
      },
      {
        key: 'totalAutomatedTests',
        label: 'Automated',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'totalManualTests',
        label: 'Manual',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'avgExecutionTime',
        label: 'Avg Time',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-600">{value}s</span>
        ),
      },
      {
        key: 'framework',
        label: 'Framework',
        sortable: true,
        render: (value) => (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
            {value}
          </span>
        ),
      },
      {
        key: 'healthStatus',
        label: 'Health',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'lastRun',
        label: 'Last Run',
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
   * Flaky tests table columns.
   */
  const flakyTestColumns = useMemo(() => {
    return [
      {
        key: 'testName',
        label: 'Test Name',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900 line-clamp-2">{value}</span>
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
        key: 'flakyRate',
        label: 'Flaky Rate',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value > 10) {
            colorClass = 'text-red-600';
          } else if (value > 5) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-semibold ${colorClass}`}>{value}%</span>
          );
        },
      },
      {
        key: 'failureCount',
        label: 'Failures',
        sortable: true,
        render: (value) => (
          <span className={`text-sm font-medium ${value > 0 ? 'text-red-600' : 'text-brand-green-600'}`}>
            {value}
          </span>
        ),
      },
      {
        key: 'executionCount',
        label: 'Executions',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'rootCause',
        label: 'Root Cause',
        sortable: false,
        render: (value) => (
          <span className="text-xs text-brand-gray-600 line-clamp-2">{value}</span>
        ),
      },
      {
        key: 'lastFailure',
        label: 'Last Failure',
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
   * Export data for the automation intelligence page.
   */
  const exportData = useMemo(() => {
    if (!automationData || !automationData.applicationHealth) {
      return [];
    }

    return automationData.applicationHealth.map((app) => ({
      applicationId: app.applicationId,
      name: app.name,
      automationRate: app.automationRate,
      passRate: app.passRate,
      flakyTestRate: app.flakyTestRate,
      avgExecutionTime: app.avgExecutionTime,
      totalAutomatedTests: app.totalAutomatedTests,
      totalManualTests: app.totalManualTests,
      failedTests: app.failedTests,
      blockedTests: app.blockedTests,
      framework: app.framework,
      healthStatus: app.healthStatus,
      lastRun: app.lastRun,
    }));
  }, [automationData]);

  /**
   * Sparkline data for automation rate KPI.
   */
  const automationRateSparkline = useMemo(() => {
    if (!automationData || !automationData.applicationHealth || automationData.applicationHealth.length === 0) {
      return [];
    }

    const firstApp = automationData.applicationHealth[0];
    if (!firstApp || !firstApp.trendData || firstApp.trendData.length === 0) {
      return [];
    }

    // Aggregate automation rate across all apps by month
    const monthMap = {};
    for (const app of automationData.applicationHealth) {
      if (app.trendData) {
        for (const point of app.trendData) {
          if (!monthMap[point.month]) {
            monthMap[point.month] = { total: 0, count: 0 };
          }
          monthMap[point.month].total += point.automationRate;
          monthMap[point.month].count++;
        }
      }
    }

    return Object.values(monthMap).map((m) =>
      m.count > 0 ? Math.round((m.total / m.count) * 10) / 10 : 0
    );
  }, [automationData]);

  /**
   * Recommendations based on automation data.
   */
  const recommendations = useMemo(() => {
    if (!automationData) {
      return [];
    }

    const recs = [];

    // Check for low automation rate applications
    if (automationData.applicationHealth) {
      const lowAutomation = automationData.applicationHealth.filter((app) => app.automationRate < 50);
      if (lowAutomation.length > 0) {
        recs.push({
          id: 'rec-001',
          severity: 'high',
          title: `${lowAutomation.length} application${lowAutomation.length !== 1 ? 's' : ''} with automation rate below 50%`,
          description: `Applications: ${lowAutomation.map((a) => a.name).join(', ')}. Consider prioritizing automation for these applications to improve test coverage and reduce manual effort.`,
          category: 'Automation Coverage',
        });
      }
    }

    // Check for high flaky test rates
    if (automationData.topFlakyTests) {
      const criticalFlaky = automationData.topFlakyTests.filter((t) => t.flakyRate > 10);
      if (criticalFlaky.length > 0) {
        recs.push({
          id: 'rec-002',
          severity: 'critical',
          title: `${criticalFlaky.length} test${criticalFlaky.length !== 1 ? 's' : ''} with flaky rate above 10%`,
          description: `These tests are unreliable and may be masking real defects. Investigate root causes: ${criticalFlaky.map((t) => t.testName).slice(0, 3).join('; ')}.`,
          category: 'Test Reliability',
        });
      }
    }

    // Check for critical health status applications
    if (automationData.applicationHealth) {
      const criticalApps = automationData.applicationHealth.filter((app) => app.healthStatus === 'critical');
      if (criticalApps.length > 0) {
        recs.push({
          id: 'rec-003',
          severity: 'critical',
          title: `${criticalApps.length} application${criticalApps.length !== 1 ? 's' : ''} with critical automation health`,
          description: `Applications: ${criticalApps.map((a) => a.name).join(', ')}. Immediate attention required to stabilize test automation.`,
          category: 'Health Status',
        });
      }
    }

    // Check for low priority automation coverage
    if (automationData.coverageByPriority) {
      const lowPriorityCoverage = automationData.coverageByPriority.filter(
        (c) => c.priority === 'critical' && c.automationRate < 90
      );
      if (lowPriorityCoverage.length > 0) {
        recs.push({
          id: 'rec-004',
          severity: 'high',
          title: 'Critical priority tests not fully automated',
          description: `Only ${lowPriorityCoverage[0].automationRate}% of critical priority tests are automated. Target 90%+ automation for critical tests to ensure release confidence.`,
          category: 'Priority Coverage',
        });
      }
    }

    // ROI recommendation
    if (roiMetrics && roiMetrics.regressionCycleReduction < 80) {
      recs.push({
        id: 'rec-005',
        severity: 'medium',
        title: 'Regression cycle reduction below target',
        description: `Current regression cycle reduction is ${roiMetrics.regressionCycleReduction}%. Target is 80%. Increasing automation coverage for regression suites will improve cycle time.`,
        category: 'Efficiency',
      });
    }

    // Framework consolidation
    if (automationData.frameworkDistribution) {
      const activeFrameworks = automationData.frameworkDistribution.filter((f) => f.applicationCount > 0 && f.framework !== 'Manual Only');
      if (activeFrameworks.length > 3) {
        recs.push({
          id: 'rec-006',
          severity: 'low',
          title: 'Multiple automation frameworks in use',
          description: `${activeFrameworks.length} different automation frameworks are in use. Consider consolidating to reduce maintenance overhead and improve team efficiency.`,
          category: 'Framework Strategy',
        });
      }
    }

    return recs;
  }, [automationData, roiMetrics]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading automation intelligence data..." showLabel />
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

  if (!automationData || !executiveSummary) {
    return (
      <div className="p-6">
        <EmptyState
          title="No automation data available"
          description="Automation intelligence metrics could not be loaded. Please try again later."
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
            Automation Intelligence
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Enterprise automation health, ROI metrics, framework distribution, and actionable recommendations
          </p>
        </div>
        {exportData.length > 0 && (
          <ExportButton
            data={exportData}
            filename="automation-intelligence"
            title="Automation Intelligence Report"
            sheetName="Automation Health"
            label="Export"
            size="md"
          />
        )}
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <MetricCard
          label="Automation Rate"
          value={executiveSummary.overallAutomationRate}
          trend={executiveSummary.overallAutomationRate >= 60 ? 'up' : executiveSummary.overallAutomationRate >= 40 ? 'neutral' : 'down'}
          trendValue={`+${executiveSummary.automationGrowthRate}%/mo`}
          sparklineData={automationRateSparkline}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <MetricCard
          label="Pass Rate"
          value={executiveSummary.overallPassRate}
          trend={executiveSummary.overallPassRate >= 95 ? 'up' : executiveSummary.overallPassRate >= 90 ? 'neutral' : 'down'}
          trendValue={executiveSummary.overallPassRate >= 95 ? 'Good' : executiveSummary.overallPassRate >= 90 ? 'Fair' : 'Low'}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Flaky Rate"
          value={executiveSummary.overallFlakyRate}
          trend={executiveSummary.overallFlakyRate <= 3 ? 'up' : executiveSummary.overallFlakyRate <= 5 ? 'neutral' : 'down'}
          trendValue={executiveSummary.overallFlakyRate <= 3 ? 'Low' : executiveSummary.overallFlakyRate <= 5 ? 'Moderate' : 'High'}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Avg Exec Time"
          value={executiveSummary.avgExecutionTime}
          trend="neutral"
          suffix="s"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Automated Tests"
          value={executiveSummary.totalAutomatedTests}
          trend="up"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <MetricCard
          label="Manual Tests"
          value={executiveSummary.totalManualTests}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
        <MetricCard
          label="Hours Saved/mo"
          value={roiMetrics ? roiMetrics.totalManualHoursSaved : 0}
          trend="up"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Automation ROI"
          value={roiMetrics ? roiMetrics.automationROI : 0}
          trend={roiMetrics && roiMetrics.automationROI >= 100 ? 'up' : 'neutral'}
          trendValue={roiMetrics && roiMetrics.automationROI >= 100 ? 'Positive' : ''}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      {/* Secondary KPI Row */}
      {roiMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Cost Savings/mo"
            value={roiMetrics.costSavingsPerMonth}
            trend="up"
            prefix="NAD "
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Defects by Automation"
            value={roiMetrics.defectsFoundByAutomation}
            trend="up"
            trendValue={`vs ${roiMetrics.defectsFoundByManual} manual`}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <MetricCard
            label="Regression Reduction"
            value={roiMetrics.regressionCycleReduction}
            trend={roiMetrics.regressionCycleReduction >= 70 ? 'up' : 'neutral'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <MetricCard
            label="Release Confidence"
            value={roiMetrics.releaseConfidenceScore}
            trend={roiMetrics.releaseConfidenceScore >= 85 ? 'up' : roiMetrics.releaseConfidenceScore >= 75 ? 'neutral' : 'down'}
            trendValue={roiMetrics.releaseConfidenceScore >= 85 ? 'High' : roiMetrics.releaseConfidenceScore >= 75 ? 'Moderate' : 'Low'}
            suffix="/100"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Automation Rate by Application */}
        {applicationHealthChartData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="bar"
              data={applicationHealthChartData}
              config={applicationHealthBarConfig}
              title="Automation & Pass Rate by Application"
              subtitle="Top applications by automation rate"
              height={320}
              loading={false}
              emptyMessage="No application data available"
            />
          </div>
        )}

        {/* Framework Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {frameworkDistributionData.length > 0 && (
            <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
              <ChartWrapper
                chartType="pie"
                data={frameworkDistributionData}
                config={pieChartConfig}
                title="Framework Distribution"
                subtitle="Applications by automation framework"
                height={280}
                loading={false}
                emptyMessage="No framework data available"
              />
            </div>
          )}

          {coverageByPriorityData.length > 0 && (
            <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
              <ChartWrapper
                chartType="pie"
                data={coverageByPriorityData}
                config={pieChartConfig}
                title="Automated Tests by Priority"
                subtitle="Automation coverage by test priority"
                height={280}
                loading={false}
                emptyMessage="No priority coverage data available"
              />
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: ROI Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roiTrendData.length > 1 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="area"
              data={roiTrendData}
              config={roiTrendConfig}
              title="Manual Hours Saved Trend"
              subtitle="Monthly hours saved through test automation"
              height={280}
              loading={false}
              emptyMessage="No ROI trend data available"
            />
          </div>
        )}

        {roiTrendData.length > 1 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="line"
              data={roiTrendData}
              config={costSavingsTrendConfig}
              title="Cost Savings Trend"
              subtitle="Monthly estimated cost savings in NAD"
              height={280}
              loading={false}
              emptyMessage="No cost savings data available"
            />
          </div>
        )}
      </div>

      {/* Recommendations Panel */}
      {recommendations.length > 0 && (
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
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-brand-gray-900">
              AI Recommendations
            </h2>
            <span className="text-sm text-brand-gray-500">
              ({recommendations.length})
            </span>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec) => {
              let borderColor = 'border-brand-gray-200';
              let bgColor = 'bg-brand-gray-50';
              let iconColor = 'text-brand-gray-400';

              if (rec.severity === 'critical') {
                borderColor = 'border-red-200';
                bgColor = 'bg-red-50';
                iconColor = 'text-red-500';
              } else if (rec.severity === 'high') {
                borderColor = 'border-orange-200';
                bgColor = 'bg-orange-50';
                iconColor = 'text-orange-500';
              } else if (rec.severity === 'medium') {
                borderColor = 'border-yellow-200';
                bgColor = 'bg-yellow-50';
                iconColor = 'text-yellow-500';
              } else if (rec.severity === 'low') {
                borderColor = 'border-brand-200';
                bgColor = 'bg-brand-50';
                iconColor = 'text-brand-500';
              }

              return (
                <div
                  key={rec.id}
                  className={`flex gap-3 p-3 rounded-lg border ${borderColor} ${bgColor}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className={`w-5 h-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-brand-gray-900">
                        {rec.title}
                      </p>
                      <StatusBadge status={rec.severity} size="sm" />
                      <span className="text-[10px] text-brand-gray-400">
                        {rec.category}
                      </span>
                    </div>
                    <p className="text-xs text-brand-gray-600 mt-1 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Application Health Table */}
      {automationData.applicationHealth && automationData.applicationHealth.length > 0 && (
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
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-brand-gray-900">
              Application Automation Health
            </h2>
            <span className="text-sm text-brand-gray-500">
              ({automationData.applicationHealth.length})
            </span>
          </div>
          <DataTable
            columns={applicationHealthColumns}
            data={automationData.applicationHealth}
            pageSize={10}
            selectable={false}
            searchFields={['name', 'framework', 'healthStatus']}
            emptyMessage="No application automation health data available."
            rowKeyField="applicationId"
            storageKey="automation-intelligence-app-health"
          />
        </div>
      )}

      {/* Top Flaky Tests Table */}
      {automationData.topFlakyTests && automationData.topFlakyTests.length > 0 && (
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
              Top Flaky Tests
            </h2>
            <span className="text-sm text-brand-gray-500">
              ({automationData.topFlakyTests.length})
            </span>
          </div>
          <DataTable
            columns={flakyTestColumns}
            data={automationData.topFlakyTests}
            pageSize={10}
            selectable={false}
            searchFields={['testName', 'application', 'rootCause']}
            emptyMessage="No flaky tests detected."
            rowKeyField="testId"
            storageKey="automation-intelligence-flaky-tests"
          />
        </div>
      )}

      {/* Coverage by Priority Detail */}
      {automationData.coverageByPriority && automationData.coverageByPriority.length > 0 && (
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
              Automation Coverage by Priority
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {automationData.coverageByPriority.map((coverage) => {
              let rateColorClass = 'text-brand-green-600';
              if (coverage.automationRate < 50) {
                rateColorClass = 'text-red-600';
              } else if (coverage.automationRate < 70) {
                rateColorClass = 'text-yellow-600';
              }

              return (
                <div
                  key={coverage.priority}
                  className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge status={coverage.priority} size="md" />
                    <span className={`text-lg font-bold ${rateColorClass}`}>
                      {coverage.automationRate}%
                    </span>
                  </div>
                  <div className="h-2 bg-brand-gray-200 rounded-full mb-3">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.min(coverage.automationRate, 100)}%`,
                        backgroundColor: coverage.color,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-brand-gray-600">
                    <span>{coverage.automatedTests} automated</span>
                    <span>{coverage.totalTests} total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Framework Details */}
      {automationData.frameworkDistribution && automationData.frameworkDistribution.length > 0 && (
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-brand-gray-900">
              Framework Details
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {automationData.frameworkDistribution.map((framework) => (
              <div
                key={framework.framework}
                className="flex flex-col gap-2 p-3 bg-brand-gray-50 rounded-lg border border-brand-gray-200"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: framework.color }}
                  />
                  <p className="text-sm font-medium text-brand-gray-900 truncate">
                    {framework.framework}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-brand-gray-500">Applications</span>
                    <span className="text-sm font-medium text-brand-gray-900">{framework.applicationCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-brand-gray-500">Tests</span>
                    <span className="text-sm font-medium text-brand-gray-900">{framework.testCount}</span>
                  </div>
                  {framework.avgPassRate > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-brand-gray-500">Avg Pass Rate</span>
                      <span className={`text-sm font-semibold ${framework.avgPassRate >= 95 ? 'text-brand-green-600' : framework.avgPassRate >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {framework.avgPassRate}%
                      </span>
                    </div>
                  )}
                  {framework.avgExecutionTime > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-brand-gray-500">Avg Time</span>
                      <span className="text-xs text-brand-gray-700">{framework.avgExecutionTime}s</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>Automation Rate: {executiveSummary.overallAutomationRate}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>Pass Rate: {executiveSummary.overallPassRate}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Flaky Rate: {executiveSummary.overallFlakyRate}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{executiveSummary.totalAutomatedTests} Automated Tests</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{executiveSummary.totalManualTests} Manual Tests</span>
          </div>
          {roiMetrics && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-green-500" />
              <span>NAD {(roiMetrics.costSavingsPerMonth / 1000).toFixed(0)}k saved/month</span>
            </div>
          )}
          <div className="ml-auto text-[10px] text-brand-gray-400">
            Growth: +{executiveSummary.automationGrowthRate}% month-over-month
          </div>
        </div>
      </div>
    </div>
  );
}
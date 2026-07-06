/**
 * AdoptionImpact Component
 * Adoption and Impact Dashboard screen (FR-021): displays platform usage metrics with MetricCards
 * (active users, login frequency, feature adoption rate), usage by portfolio/application breakdown
 * charts, value realization metrics (time saved, defects prevented, automation ROI), trend charts.
 * Uses DashboardService.getAdoptionMetrics().
 * @module AdoptionImpact
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getAdoptionMetrics,
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
 * AdoptionImpact page component.
 * Displays platform usage metrics, adoption by portfolio/application/role,
 * value realization metrics, trend charts, and user engagement segmentation.
 *
 * @returns {React.ReactElement} The adoption and impact dashboard page
 */
export default function AdoptionImpact() {
  const { currentUser, role } = useAuth();

  const [adoptionData, setAdoptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches adoption metrics data.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAdoptionMetrics();
      setAdoptionData(data);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load adoption and impact data.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Executive summary from adoption data.
   */
  const executiveSummary = useMemo(() => {
    if (!adoptionData || !adoptionData.executiveSummary) {
      return null;
    }
    return adoptionData.executiveSummary;
  }, [adoptionData]);

  /**
   * Platform usage metrics from adoption data.
   */
  const platformUsage = useMemo(() => {
    if (!adoptionData || !adoptionData.platformUsage) {
      return null;
    }
    return adoptionData.platformUsage;
  }, [adoptionData]);

  /**
   * Value realization metrics from adoption data.
   */
  const valueRealization = useMemo(() => {
    if (!adoptionData || !adoptionData.valueRealization) {
      return null;
    }
    return adoptionData.valueRealization;
  }, [adoptionData]);

  /**
   * Login frequency trend chart data.
   */
  const loginFrequencyData = useMemo(() => {
    if (!platformUsage || !platformUsage.loginFrequency || platformUsage.loginFrequency.length === 0) {
      return [];
    }
    return platformUsage.loginFrequency;
  }, [platformUsage]);

  /**
   * Login frequency trend chart config.
   */
  const loginFrequencyConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'totalLogins', name: 'Total Logins', color: '#0069cc' },
        { dataKey: 'uniqueUsers', name: 'Unique Users', color: '#0f9d58' },
      ],
      showLegend: true,
    };
  }, []);

  /**
   * Value realization monthly trend chart data.
   */
  const valueRealizationTrendData = useMemo(() => {
    if (!valueRealization || !valueRealization.monthlyTrend || valueRealization.monthlyTrend.length === 0) {
      return [];
    }
    return valueRealization.monthlyTrend;
  }, [valueRealization]);

  /**
   * Time saved trend chart config.
   */
  const timeSavedTrendConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'timeSaved', name: 'Hours Saved', color: '#0069cc' },
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
   * Defects prevented trend chart config.
   */
  const defectsPreventedTrendConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'defectsPrevented', name: 'Defects Prevented', color: '#ef4444' },
      ],
      showLegend: true,
    };
  }, []);

  /**
   * Feature usage bar chart data (top 10).
   */
  const featureUsageChartData = useMemo(() => {
    if (!platformUsage || !platformUsage.featureUsage || platformUsage.featureUsage.length === 0) {
      return [];
    }

    return platformUsage.featureUsage
      .slice()
      .sort((a, b) => b.adoptionRate - a.adoptionRate)
      .slice(0, 12)
      .map((f) => ({
        name: f.feature.length > 18 ? f.feature.substring(0, 15) + '...' : f.feature,
        adoptionRate: f.adoptionRate,
        uniqueUsers: f.uniqueUsers,
      }));
  }, [platformUsage]);

  /**
   * Feature usage bar chart config.
   */
  const featureUsageBarConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'adoptionRate', name: 'Adoption Rate (%)', color: '#0069cc' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * Portfolio adoption bar chart data.
   */
  const portfolioAdoptionChartData = useMemo(() => {
    if (!adoptionData || !adoptionData.portfolioAdoption || adoptionData.portfolioAdoption.length === 0) {
      return [];
    }

    return adoptionData.portfolioAdoption
      .slice()
      .sort((a, b) => b.adoptionRate - a.adoptionRate)
      .slice(0, 12)
      .map((p) => ({
        name: p.name.length > 20 ? p.name.substring(0, 17) + '...' : p.name,
        adoptionRate: p.adoptionRate,
        featureUtilization: p.featureUtilization,
      }));
  }, [adoptionData]);

  /**
   * Portfolio adoption bar chart config.
   */
  const portfolioAdoptionBarConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'adoptionRate', name: 'Adoption Rate (%)', color: '#0069cc' },
        { dataKey: 'featureUtilization', name: 'Feature Utilization (%)', color: '#0f9d58' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * User engagement segments pie chart data.
   */
  const userEngagementData = useMemo(() => {
    if (!adoptionData || !adoptionData.userEngagementSegments || adoptionData.userEngagementSegments.length === 0) {
      return [];
    }

    return adoptionData.userEngagementSegments.map((seg) => ({
      name: seg.segment,
      value: seg.count,
      color: seg.color,
    }));
  }, [adoptionData]);

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
   * Application adoption table columns.
   */
  const applicationAdoptionColumns = useMemo(() => {
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
        key: 'adoptionRate',
        label: 'Adoption Rate',
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
        key: 'activeUsers',
        label: 'Active Users',
        sortable: true,
        render: (value, row) => (
          <span className="text-sm text-brand-gray-700">{value} / {row.totalUsers}</span>
        ),
      },
      {
        key: 'satisfactionScore',
        label: 'Satisfaction',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value < 75) {
            colorClass = 'text-red-600';
          } else if (value < 85) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-semibold ${colorClass}`}>{value}</span>
          );
        },
      },
      {
        key: 'taskCompletionRate',
        label: 'Task Completion',
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-brand-gray-200 rounded-full max-w-[60px]">
              <div
                className="h-2 bg-brand-green-500 rounded-full"
                style={{ width: `${Math.min(value, 100)}%` }}
              />
            </div>
            <span className="text-xs text-brand-gray-600">{value}%</span>
          </div>
        ),
      },
      {
        key: 'avgDailyUsage',
        label: 'Avg Daily Usage',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'trend',
        label: 'Trend',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          let icon = '↑';
          if (value === 'down') {
            colorClass = 'text-red-600';
            icon = '↓';
          } else if (value === 'stable') {
            colorClass = 'text-brand-gray-500';
            icon = '→';
          }
          return (
            <span className={`text-sm font-medium ${colorClass}`}>{icon} {value.charAt(0).toUpperCase() + value.slice(1)}</span>
          );
        },
      },
    ];
  }, []);

  /**
   * Portfolio adoption table columns.
   */
  const portfolioAdoptionColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Portfolio',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
        ),
      },
      {
        key: 'adoptionRate',
        label: 'Adoption Rate',
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
        key: 'activeUsers',
        label: 'Active Users',
        sortable: true,
        render: (value, row) => (
          <span className="text-sm text-brand-gray-700">{value} / {row.totalUsers}</span>
        ),
      },
      {
        key: 'featureUtilization',
        label: 'Feature Utilization',
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-brand-gray-200 rounded-full max-w-[60px]">
              <div
                className="h-2 bg-brand-green-500 rounded-full"
                style={{ width: `${Math.min(value, 100)}%` }}
              />
            </div>
            <span className="text-xs text-brand-gray-600">{value}%</span>
          </div>
        ),
      },
      {
        key: 'avgSessionDuration',
        label: 'Avg Session',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value} min</span>
        ),
      },
      {
        key: 'timeSavedHours',
        label: 'Hours Saved/mo',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-green-600">{value}</span>
        ),
      },
      {
        key: 'topFeature',
        label: 'Top Feature',
        sortable: true,
        render: (value) => (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
            {value}
          </span>
        ),
      },
      {
        key: 'trend',
        label: 'Trend',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          let icon = '↑';
          if (value === 'down') {
            colorClass = 'text-red-600';
            icon = '↓';
          } else if (value === 'stable') {
            colorClass = 'text-brand-gray-500';
            icon = '→';
          }
          return (
            <span className={`text-sm font-medium ${colorClass}`}>{icon} {value.charAt(0).toUpperCase() + value.slice(1)}</span>
          );
        },
      },
    ];
  }, []);

  /**
   * Role adoption table columns.
   */
  const roleAdoptionColumns = useMemo(() => {
    return [
      {
        key: 'label',
        label: 'Role',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
        ),
      },
      {
        key: 'adoptionRate',
        label: 'Adoption Rate',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value < 60) {
            colorClass = 'text-red-600';
          } else if (value < 80) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-semibold ${colorClass}`}>{value}%</span>
          );
        },
      },
      {
        key: 'activeUsers',
        label: 'Active Users',
        sortable: true,
        render: (value, row) => (
          <span className="text-sm text-brand-gray-700">{value} / {row.totalUsers}</span>
        ),
      },
      {
        key: 'avgSessionDuration',
        label: 'Avg Session',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value} min</span>
        ),
      },
      {
        key: 'mostUsedFeature',
        label: 'Most Used Feature',
        sortable: true,
        render: (value) => (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
            {value}
          </span>
        ),
      },
    ];
  }, []);

  /**
   * Feature usage table columns.
   */
  const featureUsageColumns = useMemo(() => {
    return [
      {
        key: 'feature',
        label: 'Feature',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
        ),
      },
      {
        key: 'adoptionRate',
        label: 'Adoption Rate',
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
        key: 'uniqueUsers',
        label: 'Unique Users',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'usageCount',
        label: 'Usage Count',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value.toLocaleString()}</span>
        ),
      },
      {
        key: 'trend',
        label: 'Trend',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          let icon = '↑';
          if (value === 'down') {
            colorClass = 'text-red-600';
            icon = '↓';
          } else if (value === 'stable') {
            colorClass = 'text-brand-gray-500';
            icon = '→';
          }
          return (
            <span className={`text-sm font-medium ${colorClass}`}>{icon} {value.charAt(0).toUpperCase() + value.slice(1)}</span>
          );
        },
      },
    ];
  }, []);

  /**
   * Export data for the adoption dashboard.
   */
  const exportData = useMemo(() => {
    if (!adoptionData || !adoptionData.applicationAdoption) {
      return [];
    }

    return adoptionData.applicationAdoption.map((app) => ({
      applicationId: app.applicationId,
      name: app.name,
      totalUsers: app.totalUsers,
      activeUsers: app.activeUsers,
      adoptionRate: app.adoptionRate,
      avgDailyUsage: app.avgDailyUsage,
      satisfactionScore: app.satisfactionScore,
      taskCompletionRate: app.taskCompletionRate,
      trend: app.trend,
    }));
  }, [adoptionData]);

  /**
   * Login frequency sparkline data for KPI card.
   */
  const loginSparkline = useMemo(() => {
    if (!platformUsage || !platformUsage.loginFrequency || platformUsage.loginFrequency.length === 0) {
      return [];
    }
    return platformUsage.loginFrequency.map((l) => l.totalLogins);
  }, [platformUsage]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading adoption and impact data..." showLabel />
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

  if (!adoptionData || !executiveSummary) {
    return (
      <div className="p-6">
        <EmptyState
          title="No adoption data available"
          description="Adoption and impact metrics could not be loaded. Please try again later."
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
            Adoption & Impact Dashboard
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Platform usage metrics, feature adoption rates, value realization, and user engagement analytics
          </p>
        </div>
        {exportData.length > 0 && (
          <ExportButton
            data={exportData}
            filename="adoption-impact-dashboard"
            title="Adoption & Impact Dashboard Report"
            sheetName="Adoption Metrics"
            label="Export"
            size="md"
          />
        )}
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Overall Adoption Rate"
          value={executiveSummary.overallAdoptionRate}
          trend={executiveSummary.overallAdoptionRate >= 80 ? 'up' : executiveSummary.overallAdoptionRate >= 60 ? 'neutral' : 'down'}
          trendValue={`+${executiveSummary.monthOverMonthGrowth}%/mo`}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <MetricCard
          label="Active Users"
          value={platformUsage ? platformUsage.activeUsers : 0}
          trend="up"
          trendValue={platformUsage ? `${Math.round((platformUsage.activeUsers / platformUsage.totalRegisteredUsers) * 100)}% of total` : ''}
          sparklineData={loginSparkline}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Avg Daily Logins"
          value={platformUsage ? platformUsage.avgDailyLogins : 0}
          trend="up"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          }
        />
        <MetricCard
          label="Avg Session Duration"
          value={platformUsage ? platformUsage.avgSessionDuration : 0}
          trend="neutral"
          suffix=" min"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Feature Utilization"
          value={executiveSummary.featureUtilizationRate}
          trend={executiveSummary.featureUtilizationRate >= 70 ? 'up' : executiveSummary.featureUtilizationRate >= 50 ? 'neutral' : 'down'}
          trendValue={executiveSummary.featureUtilizationRate >= 70 ? 'Good' : executiveSummary.featureUtilizationRate >= 50 ? 'Fair' : 'Low'}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <MetricCard
          label="User Satisfaction"
          value={executiveSummary.userSatisfactionScore}
          trend={executiveSummary.userSatisfactionScore >= 85 ? 'up' : executiveSummary.userSatisfactionScore >= 75 ? 'neutral' : 'down'}
          trendValue={executiveSummary.userSatisfactionScore >= 85 ? 'High' : executiveSummary.userSatisfactionScore >= 75 ? 'Moderate' : 'Low'}
          suffix="/100"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Value Realization KPI Row */}
      {valueRealization && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <MetricCard
            label="Hours Saved/mo"
            value={valueRealization.timeSavedHoursPerMonth}
            trend="up"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Cost Savings/mo"
            value={valueRealization.costSavingsNAD}
            trend="up"
            prefix="NAD "
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Defects Prevented"
            value={valueRealization.defectsPreventedByAI}
            trend="up"
            trendValue="by AI"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <MetricCard
            label="Automation ROI"
            value={valueRealization.automationROI}
            trend={valueRealization.automationROI >= 100 ? 'up' : 'neutral'}
            trendValue={valueRealization.automationROI >= 100 ? 'Positive' : ''}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <MetricCard
            label="Manual Reduction"
            value={valueRealization.manualProcessReduction}
            trend="up"
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <MetricCard
            label="Data Accuracy ↑"
            value={valueRealization.dataAccuracyImprovement}
            trend="up"
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Reporting Saved"
            value={valueRealization.reportingTimeSaved}
            trend="up"
            suffix=" hrs"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <MetricCard
            label="Decision Time ↓"
            value={valueRealization.decisionTimeReduction}
            trend="up"
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Charts Row 1: Login Frequency & Feature Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Login Frequency Trend */}
        {loginFrequencyData.length > 1 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="area"
              data={loginFrequencyData}
              config={loginFrequencyConfig}
              title="Login Frequency Trend"
              subtitle="Monthly total logins and unique users"
              height={300}
              loading={false}
              emptyMessage="No login frequency data available"
            />
          </div>
        )}

        {/* Feature Adoption Bar Chart */}
        {featureUsageChartData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="bar"
              data={featureUsageChartData}
              config={featureUsageBarConfig}
              title="Feature Adoption Rates"
              subtitle="Adoption rate by feature (top 12)"
              height={300}
              loading={false}
              emptyMessage="No feature usage data available"
            />
          </div>
        )}
      </div>

      {/* Charts Row 2: Portfolio Adoption & User Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Adoption Bar Chart */}
        {portfolioAdoptionChartData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm lg:col-span-2">
            <ChartWrapper
              chartType="bar"
              data={portfolioAdoptionChartData}
              config={portfolioAdoptionBarConfig}
              title="Adoption by Portfolio"
              subtitle="Adoption rate and feature utilization by portfolio"
              height={320}
              loading={false}
              emptyMessage="No portfolio adoption data available"
            />
          </div>
        )}

        {/* User Engagement Segments Pie Chart */}
        {userEngagementData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={userEngagementData}
              config={pieChartConfig}
              title="User Engagement Segments"
              subtitle="Users by engagement level"
              height={320}
              loading={false}
              emptyMessage="No engagement data available"
            />
          </div>
        )}
      </div>

      {/* Charts Row 3: Value Realization Trends */}
      {valueRealizationTrendData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="area"
              data={valueRealizationTrendData}
              config={timeSavedTrendConfig}
              title="Hours Saved Trend"
              subtitle="Monthly hours saved through platform usage"
              height={280}
              loading={false}
              emptyMessage="No time saved data available"
            />
          </div>

          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="line"
              data={valueRealizationTrendData}
              config={costSavingsTrendConfig}
              title="Cost Savings Trend"
              subtitle="Monthly estimated cost savings in NAD"
              height={280}
              loading={false}
              emptyMessage="No cost savings data available"
            />
          </div>

          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="bar"
              data={valueRealizationTrendData}
              config={defectsPreventedTrendConfig}
              title="Defects Prevented Trend"
              subtitle="Monthly defects prevented by AI insights"
              height={280}
              loading={false}
              emptyMessage="No defects prevented data available"
            />
          </div>
        </div>
      )}

      {/* User Engagement Segment Details */}
      {adoptionData.userEngagementSegments && adoptionData.userEngagementSegments.length > 0 && (
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-brand-gray-900">
              User Engagement Breakdown
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {adoptionData.userEngagementSegments.map((segment) => (
              <div
                key={segment.segment}
                className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: segment.color }}
                    />
                    <p className="text-sm font-medium text-brand-gray-900">{segment.segment}</p>
                  </div>
                  <span className="text-lg font-bold text-brand-gray-900">{segment.count}</span>
                </div>
                <div className="h-2 bg-brand-gray-200 rounded-full mb-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(segment.percentage, 100)}%`,
                      backgroundColor: segment.color,
                    }}
                  />
                </div>
                <p className="text-xs text-brand-gray-500 leading-relaxed">
                  {segment.description}
                </p>
                <p className="text-xs text-brand-gray-400 mt-1">
                  {segment.percentage}% of total users
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio Adoption Table */}
      {adoptionData.portfolioAdoption && adoptionData.portfolioAdoption.length > 0 && (
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
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-brand-gray-900">
              Adoption by Portfolio
            </h2>
            <span className="text-sm text-brand-gray-500">
              ({adoptionData.portfolioAdoption.length})
            </span>
          </div>
          <DataTable
            columns={portfolioAdoptionColumns}
            data={adoptionData.portfolioAdoption}
            pageSize={10}
            selectable={false}
            searchFields={['name', 'topFeature', 'trend']}
            emptyMessage="No portfolio adoption data available."
            rowKeyField="portfolioId"
            storageKey="adoption-impact-portfolio"
          />
        </div>
      )}

      {/* Application Adoption Table */}
      {adoptionData.applicationAdoption && adoptionData.applicationAdoption.length > 0 && (
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
              Adoption by Application
            </h2>
            <span className="text-sm text-brand-gray-500">
              ({adoptionData.applicationAdoption.length})
            </span>
          </div>
          <DataTable
            columns={applicationAdoptionColumns}
            data={adoptionData.applicationAdoption}
            pageSize={10}
            selectable={false}
            searchFields={['name', 'trend']}
            emptyMessage="No application adoption data available."
            rowKeyField="applicationId"
            storageKey="adoption-impact-application"
          />
        </div>
      )}

      {/* Role Adoption Table */}
      {adoptionData.roleAdoption && adoptionData.roleAdoption.length > 0 && (
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
              Adoption by Role
            </h2>
            <span className="text-sm text-brand-gray-500">
              ({adoptionData.roleAdoption.length})
            </span>
          </div>
          <DataTable
            columns={roleAdoptionColumns}
            data={adoptionData.roleAdoption}
            pageSize={10}
            selectable={false}
            searchFields={['label', 'role', 'mostUsedFeature']}
            emptyMessage="No role adoption data available."
            rowKeyField="role"
            storageKey="adoption-impact-role"
          />
        </div>
      )}

      {/* Feature Usage Table */}
      {platformUsage && platformUsage.featureUsage && platformUsage.featureUsage.length > 0 && (
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-brand-gray-900">
              Feature Usage Details
            </h2>
            <span className="text-sm text-brand-gray-500">
              ({platformUsage.featureUsage.length})
            </span>
          </div>
          <DataTable
            columns={featureUsageColumns}
            data={platformUsage.featureUsage}
            pageSize={10}
            selectable={false}
            searchFields={['feature', 'trend']}
            emptyMessage="No feature usage data available."
            rowKeyField="feature"
            storageKey="adoption-impact-feature-usage"
          />
        </div>
      )}

      {/* Total Value Delivered */}
      {executiveSummary && (
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
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-brand-gray-900">
              Total Value Delivered
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-brand-green-50 rounded-lg p-4 border border-brand-green-200">
              <p className="text-xs text-brand-gray-500 mb-1">Total Value (NAD)</p>
              <p className="text-2xl font-bold text-brand-green-600">
                NAD {(executiveSummary.totalValueDeliveredNAD / 1000000).toFixed(2)}M
              </p>
              <p className="text-xs text-brand-gray-500 mt-1">Cumulative value delivered</p>
            </div>
            <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
              <p className="text-xs text-brand-gray-500 mb-1">MoM Growth</p>
              <p className="text-2xl font-bold text-brand-500">
                +{executiveSummary.monthOverMonthGrowth}%
              </p>
              <p className="text-xs text-brand-gray-500 mt-1">Month-over-month adoption growth</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="text-xs text-brand-gray-500 mb-1">Avg Time to Competency</p>
              <p className="text-2xl font-bold text-yellow-600">
                {executiveSummary.avgTimeToCompetency} days
              </p>
              <p className="text-xs text-brand-gray-500 mt-1">Average onboarding time</p>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
              <p className="text-xs text-brand-gray-500 mb-1">Peak Concurrent Users</p>
              <p className="text-2xl font-bold text-brand-gray-900">
                {platformUsage ? platformUsage.peakConcurrentUsers : 0}
              </p>
              <p className="text-xs text-brand-gray-500 mt-1">Maximum simultaneous users</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>Adoption Rate: {executiveSummary.overallAdoptionRate}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{platformUsage ? platformUsage.activeUsers : 0} Active Users</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Feature Utilization: {executiveSummary.featureUtilizationRate}%</span>
          </div>
          {valueRealization && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-green-500" />
                <span>{valueRealization.timeSavedHoursPerMonth} hrs saved/month</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-500" />
                <span>NAD {(valueRealization.costSavingsNAD / 1000).toFixed(0)}k saved/month</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>{valueRealization.defectsPreventedByAI} defects prevented</span>
              </div>
            </>
          )}
          <div className="ml-auto text-[10px] text-brand-gray-400">
            Last updated: {adoptionData.lastUpdated ? formatDisplayDate(adoptionData.lastUpdated) : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
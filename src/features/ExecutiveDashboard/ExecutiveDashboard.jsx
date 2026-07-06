/**
 * ExecutiveDashboard Component
 * Executive Dashboard screen (FR-002): displays enterprise-level quality KPIs,
 * trend charts, portfolio breakdown table, and filter bar.
 * Uses DashboardService.getMetrics(). Role-gated for executive personas.
 * @module ExecutiveDashboard
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getMetrics,
  getMonthlyTrends,
  getAllPortfolios,
  getDashboardSummary,
  getDistinctPortfolioNames,
} from '../../shared/services/dashboardService.js';
import MetricCard from '../../shared/components/MetricCard.jsx';
import ChartWrapper from '../../shared/components/ChartWrapper.jsx';
import DataTable from '../../shared/components/DataTable.jsx';
import FilterBar from '../../shared/components/FilterBar.jsx';
import ExportButton from '../../shared/components/ExportButton.jsx';
import LoadingSpinner from '../../shared/components/LoadingSpinner.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import EmptyState from '../../shared/components/EmptyState.jsx';

/**
 * ExecutiveDashboard page component.
 * Displays enterprise-level quality KPIs, 12-month trend charts,
 * portfolio breakdown table, and filter bar for executive personas.
 *
 * @returns {React.ReactElement} The executive dashboard page
 */
export default function ExecutiveDashboard() {
  const { currentUser, role } = useAuth();

  const [metrics, setMetrics] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    portfolio: '',
    riskLevel: '',
    dateRange: 'all',
  });

  // Distinct values for filter dropdowns
  const [distinctPortfolios, setDistinctPortfolios] = useState([]);

  /**
   * Loads distinct filter values.
   */
  useEffect(() => {
    try {
      const portfolioNames = getDistinctPortfolioNames();
      setDistinctPortfolios(portfolioNames);
    } catch {
      // Ignore errors loading distinct values
    }
  }, []);

  /**
   * Fetches dashboard data based on current filters.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {};

      if (filterValues.portfolio) {
        filters.portfolio = filterValues.portfolio;
      }

      if (filterValues.riskLevel) {
        filters.riskLevel = filterValues.riskLevel;
      }

      if (filterValues.dateRange && filterValues.dateRange !== 'all') {
        filters.dateRange = filterValues.dateRange;
      }

      const [metricsData, portfolioData, summaryData] = await Promise.all([
        getMetrics(filters),
        getAllPortfolios(),
        getDashboardSummary(),
      ]);

      setMetrics(metricsData);
      setSummary(summaryData);

      // Apply portfolio filter to portfolio list if needed
      let filteredPortfolios = portfolioData;
      if (filterValues.portfolio) {
        filteredPortfolios = portfolioData.filter(
          (p) => p.name === filterValues.portfolio
        );
      }
      if (filterValues.riskLevel) {
        const riskMap = {
          low: (score) => score >= 85,
          medium: (score) => score >= 70 && score < 85,
          high: (score) => score >= 55 && score < 70,
          critical: (score) => score < 55,
        };
        const riskFn = riskMap[filterValues.riskLevel];
        if (riskFn) {
          filteredPortfolios = filteredPortfolios.filter((p) => riskFn(p.qualityScore));
        }
      }

      setPortfolios(filteredPortfolios);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load dashboard data.';
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
      portfolio: '',
      riskLevel: '',
      dateRange: 'all',
    });
  }, []);

  /**
   * Builds the filter configuration for the FilterBar.
   */
  const filterConfig = useMemo(() => {
    return [
      {
        key: 'portfolio',
        label: 'Portfolio',
        placeholder: 'All Portfolios',
        options: distinctPortfolios.map((name) => ({
          value: name,
          label: name,
        })),
      },
      {
        key: 'riskLevel',
        label: 'Risk Level',
        placeholder: 'All Risk Levels',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'critical', label: 'Critical' },
        ],
      },
      {
        key: 'dateRange',
        label: 'Time Period',
        placeholder: 'All Time',
        options: [
          { value: 'all', label: 'All Time' },
          { value: 'last30', label: 'Last 30 Days' },
          { value: 'last90', label: 'Last 90 Days' },
          { value: 'last180', label: 'Last 6 Months' },
          { value: 'last365', label: 'Last 12 Months' },
        ],
      },
    ];
  }, [distinctPortfolios]);

  /**
   * Executive KPIs from metrics data.
   */
  const executiveKPIs = useMemo(() => {
    if (!metrics || !metrics.executiveKPIs) {
      return null;
    }
    return metrics.executiveKPIs;
  }, [metrics]);

  /**
   * Monthly trend data for charts.
   */
  const monthlyTrends = useMemo(() => {
    if (!metrics || !metrics.monthlyTrends) {
      return [];
    }
    return metrics.monthlyTrends;
  }, [metrics]);

  /**
   * Portfolio breakdown data for the table.
   */
  const portfolioBreakdowns = useMemo(() => {
    if (!metrics || !metrics.portfolioBreakdowns) {
      return [];
    }

    let breakdowns = metrics.portfolioBreakdowns;

    if (filterValues.portfolio) {
      breakdowns = breakdowns.filter((pb) => pb.name === filterValues.portfolio);
    }

    if (filterValues.riskLevel) {
      breakdowns = breakdowns.filter((pb) => pb.riskLevel === filterValues.riskLevel);
    }

    return breakdowns;
  }, [metrics, filterValues.portfolio, filterValues.riskLevel]);

  /**
   * Quality gate pass rates for chart.
   */
  const qualityGatePassRates = useMemo(() => {
    if (!metrics || !metrics.qualityGatePassRates) {
      return [];
    }
    return metrics.qualityGatePassRates;
  }, [metrics]);

  /**
   * Sparkline data for KPI cards.
   */
  const qualityScoreSparkline = useMemo(() => {
    return monthlyTrends.map((t) => t.qualityScore);
  }, [monthlyTrends]);

  const testCoverageSparkline = useMemo(() => {
    return monthlyTrends.map((t) => t.testCoverage);
  }, [monthlyTrends]);

  const automationRateSparkline = useMemo(() => {
    return monthlyTrends.map((t) => t.automationRate);
  }, [monthlyTrends]);

  const defectDensitySparkline = useMemo(() => {
    return monthlyTrends.map((t) => t.defectDensity);
  }, [monthlyTrends]);

  const releaseSuccessSparkline = useMemo(() => {
    return monthlyTrends.map((t) => t.releaseSuccessRate);
  }, [monthlyTrends]);

  /**
   * Trend chart configuration for quality score and test coverage.
   */
  const qualityTrendConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'qualityScore', name: 'Quality Score', color: '#0069cc' },
        { dataKey: 'testCoverage', name: 'Test Coverage', color: '#0f9d58' },
        { dataKey: 'automationRate', name: 'Automation Rate', color: '#f59e0b' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * Trend chart configuration for defect density.
   */
  const defectTrendConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'defectDensity', name: 'Defect Density', color: '#ef4444' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value} /KLOC`,
    };
  }, []);

  /**
   * Trend chart configuration for releases.
   */
  const releaseTrendConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'releaseSuccessRate', name: 'Release Success Rate', color: '#0f9d58' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * Quality gate pass rate chart config.
   */
  const qualityGateChartData = useMemo(() => {
    return qualityGatePassRates.map((gate) => ({
      name: gate.gateName,
      passRate: gate.passRate,
      passed: gate.passed,
      failed: gate.failed,
      waived: gate.waived,
    }));
  }, [qualityGatePassRates]);

  const qualityGateChartConfig = useMemo(() => {
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
   * Portfolio breakdown table columns.
   */
  const portfolioColumns = useMemo(() => {
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
        key: 'applicationCount',
        label: 'Apps',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'qualityScore',
        label: 'Quality Score',
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
        key: 'testCoverage',
        label: 'Test Coverage',
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
        key: 'automationRate',
        label: 'Automation',
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-brand-gray-200 rounded-full max-w-[80px]">
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
        key: 'defectDensity',
        label: 'Defect Density',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value > 3.0) {
            colorClass = 'text-red-600';
          } else if (value > 2.0) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm ${colorClass}`}>{value}</span>
          );
        },
      },
      {
        key: 'riskLevel',
        label: 'Risk',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'openDefects',
        label: 'Open Defects',
        sortable: true,
        render: (value) => (
          <span className={`text-sm font-medium ${value > 0 ? 'text-red-600' : 'text-brand-green-600'}`}>
            {value}
          </span>
        ),
      },
      {
        key: 'releaseSuccessRate',
        label: 'Release Success',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value < 70) {
            colorClass = 'text-red-600';
          } else if (value < 85) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-medium ${colorClass}`}>{value}%</span>
          );
        },
      },
    ];
  }, []);

  /**
   * Export data for the portfolio breakdown table.
   */
  const portfolioExportData = useMemo(() => {
    return portfolioBreakdowns.map((pb) => ({
      portfolioId: pb.portfolioId,
      name: pb.name,
      applicationCount: pb.applicationCount,
      qualityScore: pb.qualityScore,
      testCoverage: pb.testCoverage,
      automationRate: pb.automationRate,
      defectDensity: pb.defectDensity,
      riskLevel: pb.riskLevel,
      openDefects: pb.openDefects,
      releaseSuccessRate: pb.releaseSuccessRate,
    }));
  }, [portfolioBreakdowns]);

  /**
   * Computes trend direction for KPI cards.
   */
  const computeTrend = useCallback((sparkline) => {
    if (!sparkline || sparkline.length < 2) {
      return { trend: 'neutral', trendValue: '' };
    }
    const current = sparkline[sparkline.length - 1];
    const previous = sparkline[sparkline.length - 2];
    const diff = current - previous;
    if (diff > 0) {
      return { trend: 'up', trendValue: `+${diff.toFixed(1)}` };
    }
    if (diff < 0) {
      return { trend: 'down', trendValue: `${diff.toFixed(1)}` };
    }
    return { trend: 'neutral', trendValue: '0' };
  }, []);

  /**
   * Computes inverted trend for defect density (lower is better).
   */
  const computeInvertedTrend = useCallback((sparkline) => {
    if (!sparkline || sparkline.length < 2) {
      return { trend: 'neutral', trendValue: '' };
    }
    const current = sparkline[sparkline.length - 1];
    const previous = sparkline[sparkline.length - 2];
    const diff = current - previous;
    if (diff < 0) {
      return { trend: 'up', trendValue: `${diff.toFixed(1)}` };
    }
    if (diff > 0) {
      return { trend: 'down', trendValue: `+${diff.toFixed(1)}` };
    }
    return { trend: 'neutral', trendValue: '0' };
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading executive dashboard..." showLabel />
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

  if (!executiveKPIs) {
    return (
      <div className="p-6">
        <EmptyState
          title="No dashboard data available"
          description="Dashboard metrics could not be loaded. Please try again later."
          actionLabel="Retry"
          onAction={fetchData}
        />
      </div>
    );
  }

  const qualityTrend = computeTrend(qualityScoreSparkline);
  const coverageTrend = computeTrend(testCoverageSparkline);
  const automationTrend = computeTrend(automationRateSparkline);
  const defectTrend = computeInvertedTrend(defectDensitySparkline);
  const releaseTrend = computeTrend(releaseSuccessSparkline);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-gray-900">
            Executive Dashboard
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Enterprise-wide quality metrics and programme performance overview
          </p>
        </div>
        {portfolioExportData.length > 0 && (
          <ExportButton
            data={portfolioExportData}
            filename="executive-dashboard"
            title="Executive Dashboard Report"
            sheetName="Portfolio Breakdown"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <MetricCard
          label="Avg Quality Score"
          value={executiveKPIs.avgQualityScore}
          trend={qualityTrend.trend}
          trendValue={qualityTrend.trendValue}
          sparklineData={qualityScoreSparkline}
          suffix="/100"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Total Applications"
          value={executiveKPIs.totalApplications}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
        <MetricCard
          label="Automation Rate"
          value={executiveKPIs.automationRate}
          trend={automationTrend.trend}
          trendValue={automationTrend.trendValue}
          sparklineData={automationRateSparkline}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <MetricCard
          label="Defect Density"
          value={executiveKPIs.defectDensity}
          trend={defectTrend.trend}
          trendValue={defectTrend.trendValue}
          sparklineData={defectDensitySparkline}
          suffix="/KLOC"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Release Success Rate"
          value={executiveKPIs.releaseSuccessRate}
          trend={releaseTrend.trend}
          trendValue={releaseTrend.trendValue}
          sparklineData={releaseSuccessSparkline}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          }
        />
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Test Coverage"
          value={executiveKPIs.avgTestCoverage}
          trend={coverageTrend.trend}
          trendValue={coverageTrend.trendValue}
          sparklineData={testCoverageSparkline}
          suffix="%"
        />
        <MetricCard
          label="Open Defects"
          value={executiveKPIs.openDefects}
          trend={executiveKPIs.openDefects > 20 ? 'down' : 'up'}
          trendValue={executiveKPIs.openDefects > 20 ? 'High' : 'Manageable'}
        />
        <MetricCard
          label="Total Releases"
          value={executiveKPIs.totalReleases}
          trend="neutral"
        />
        <MetricCard
          label="Pending Approvals"
          value={executiveKPIs.pendingApprovals}
          trend={executiveKPIs.pendingApprovals > 5 ? 'down' : 'neutral'}
          trendValue={executiveKPIs.pendingApprovals > 5 ? 'Needs attention' : ''}
        />
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Trends */}
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
          <ChartWrapper
            chartType="area"
            data={monthlyTrends}
            config={qualityTrendConfig}
            title="Quality, Coverage & Automation Trends"
            subtitle="12-month trend across all portfolios"
            height={300}
            loading={false}
            emptyMessage="No trend data available"
          />
        </div>

        {/* Defect Density Trend */}
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
          <ChartWrapper
            chartType="line"
            data={monthlyTrends}
            config={defectTrendConfig}
            title="Defect Density Trend"
            subtitle="Average defects per KLOC over 12 months"
            height={300}
            loading={false}
            emptyMessage="No defect trend data available"
          />
        </div>
      </div>

      {/* Release Success & Quality Gate Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Release Success Rate Trend */}
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
          <ChartWrapper
            chartType="line"
            data={monthlyTrends}
            config={releaseTrendConfig}
            title="Release Success Rate Trend"
            subtitle="Percentage of releases passing quality gates"
            height={280}
            loading={false}
            emptyMessage="No release trend data available"
          />
        </div>

        {/* Quality Gate Pass Rates */}
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
          <ChartWrapper
            chartType="bar"
            data={qualityGateChartData}
            config={qualityGateChartConfig}
            title="Quality Gate Pass Rates"
            subtitle="Pass rate by quality gate type"
            height={280}
            loading={false}
            emptyMessage="No quality gate data available"
          />
        </div>
      </div>

      {/* Status Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Status Distribution */}
        {metrics.applicationStatusDistribution && metrics.applicationStatusDistribution.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={metrics.applicationStatusDistribution.map((item) => ({
                name: item.status,
                value: item.count,
                color: item.color,
              }))}
              config={{
                dataKey: 'value',
                nameKey: 'name',
                showLegend: true,
                innerRadius: 40,
                outerRadius: '75%',
              }}
              title="Application Status"
              subtitle="Distribution by current status"
              height={250}
              loading={false}
            />
          </div>
        )}

        {/* Risk Distribution */}
        {metrics.riskDistribution && metrics.riskDistribution.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={metrics.riskDistribution.map((item) => ({
                name: item.riskLevel,
                value: item.count,
                color: item.color,
              }))}
              config={{
                dataKey: 'value',
                nameKey: 'name',
                showLegend: true,
                innerRadius: 40,
                outerRadius: '75%',
              }}
              title="Risk Distribution"
              subtitle="Applications by risk level"
              height={250}
              loading={false}
            />
          </div>
        )}

        {/* Demand Status Distribution */}
        {metrics.demandStatusDistribution && metrics.demandStatusDistribution.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={metrics.demandStatusDistribution.map((item) => ({
                name: item.status,
                value: item.count,
                color: item.color,
              }))}
              config={{
                dataKey: 'value',
                nameKey: 'name',
                showLegend: true,
                innerRadius: 40,
                outerRadius: '75%',
              }}
              title="Demand Status"
              subtitle="Demand items by status"
              height={250}
              loading={false}
            />
          </div>
        )}
      </div>

      {/* Portfolio Breakdown Table */}
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
            Portfolio Quality Breakdown
          </h2>
        </div>
        <DataTable
          columns={portfolioColumns}
          data={portfolioBreakdowns}
          pageSize={10}
          selectable={false}
          searchFields={['name', 'riskLevel']}
          emptyMessage="No portfolio data available for the selected filters."
          rowKeyField="portfolioId"
          storageKey="executive-dashboard-portfolios"
        />
      </div>

      {/* Top Defect Applications */}
      {metrics.topDefectApplications && metrics.topDefectApplications.length > 0 && (
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
              Top Defect Applications
            </h2>
            <span className="text-sm text-brand-gray-500">
              Applications with the highest open defect counts
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {metrics.topDefectApplications.slice(0, 5).map((app) => (
              <div
                key={app.applicationId}
                className="flex flex-col gap-1 p-3 bg-brand-gray-50 rounded-lg border border-brand-gray-200"
              >
                <p className="text-sm font-medium text-brand-gray-900 truncate" title={app.name}>
                  {app.name}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-gray-500">Open Defects</span>
                  <span className="text-sm font-bold text-red-600">{app.openDefects}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-gray-500">Density</span>
                  <span className="text-xs text-brand-gray-700">{app.defectDensity}</span>
                </div>
                <div className="mt-1">
                  <StatusBadge status={app.riskLevel} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      {summary && (
        <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              <span>{summary.totalPortfolios} Portfolios</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-green-500" />
              <span>{summary.totalReleases} Releases ({summary.releasesInProgress} in progress)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Quality Gate Pass Rate: {summary.qualityGatePassRate}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Governance Compliance: {summary.governanceComplianceRate}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-blue-500" />
              <span>Env Uptime: {summary.environmentUptime}%</span>
            </div>
            <div className="ml-auto text-[10px] text-brand-gray-400">
              Last updated: {metrics.lastUpdated ? new Date(metrics.lastUpdated).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
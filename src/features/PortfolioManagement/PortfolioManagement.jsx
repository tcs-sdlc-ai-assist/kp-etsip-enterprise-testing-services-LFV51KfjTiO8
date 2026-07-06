/**
 * PortfolioManagement Component
 * Portfolio Management screen (FR-003): displays list of portfolios with quality metrics,
 * drill-down to individual portfolio detail view with trend charts,
 * filter by status/owner/quality score. Uses DashboardService and RepositoryService.
 * Includes export functionality.
 * @module PortfolioManagement
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getAllPortfolios,
  getPortfolioMetrics,
  getDistinctPortfolioNames,
} from '../../shared/services/dashboardService.js';
import { getApplications } from '../../shared/services/repositoryService.js';
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
 * Determines a risk level label from a quality score.
 *
 * @param {number} score - Quality score (0-100)
 * @returns {string} Risk level: 'low' | 'medium' | 'high' | 'critical'
 */
function getRiskLevelFromScore(score) {
  if (score >= 85) {
    return 'low';
  }
  if (score >= 70) {
    return 'medium';
  }
  if (score >= 55) {
    return 'high';
  }
  return 'critical';
}

/**
 * PortfolioManagement page component.
 * Displays a list of portfolios with quality metrics, drill-down to individual
 * portfolio detail view with trend charts, filter by status/owner/quality score.
 *
 * @returns {React.ReactElement} The portfolio management page
 */
export default function PortfolioManagement() {
  const { currentUser, role } = useAuth();

  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail modal state
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailApplications, setDetailApplications] = useState([]);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    status: '',
    owner: '',
    riskLevel: '',
  });

  /**
   * Fetches all portfolio data.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const portfolioData = await getAllPortfolios();
      setPortfolios(portfolioData || []);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load portfolio data.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

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
      owner: '',
      riskLevel: '',
    });
  }, []);

  /**
   * Distinct owners for filter dropdown.
   */
  const distinctOwners = useMemo(() => {
    const owners = new Set();
    for (const p of portfolios) {
      if (p.owner) {
        owners.add(p.owner);
      }
    }
    return Array.from(owners).sort();
  }, [portfolios]);

  /**
   * Distinct statuses for filter dropdown.
   */
  const distinctStatuses = useMemo(() => {
    const statuses = new Set();
    for (const p of portfolios) {
      if (p.status) {
        statuses.add(p.status);
      }
    }
    return Array.from(statuses).sort();
  }, [portfolios]);

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
          label: s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '),
        })),
      },
      {
        key: 'owner',
        label: 'Owner',
        placeholder: 'All Owners',
        options: distinctOwners.map((o) => ({
          value: o,
          label: o,
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
    ];
  }, [distinctStatuses, distinctOwners]);

  /**
   * Filtered portfolios based on current filter values.
   */
  const filteredPortfolios = useMemo(() => {
    let result = portfolios;

    if (filterValues.status) {
      result = result.filter((p) => p.status === filterValues.status);
    }

    if (filterValues.owner) {
      result = result.filter((p) => p.owner === filterValues.owner);
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
        result = result.filter((p) => riskFn(p.qualityScore));
      }
    }

    return result;
  }, [portfolios, filterValues]);

  /**
   * Summary KPIs computed from all portfolios.
   */
  const summaryKPIs = useMemo(() => {
    if (!portfolios || portfolios.length === 0) {
      return null;
    }

    const totalPortfolios = portfolios.length;
    let totalApps = 0;
    let totalQualityScore = 0;
    let totalTestCoverage = 0;
    let totalDefectDensity = 0;

    for (const p of portfolios) {
      totalApps += p.applicationCount || 0;
      totalQualityScore += p.qualityScore || 0;
      totalTestCoverage += p.testCoverage || 0;
      totalDefectDensity += p.defectDensity || 0;
    }

    return {
      totalPortfolios,
      totalApplications: totalApps,
      avgQualityScore: totalPortfolios > 0 ? Math.round((totalQualityScore / totalPortfolios) * 10) / 10 : 0,
      avgTestCoverage: totalPortfolios > 0 ? Math.round((totalTestCoverage / totalPortfolios) * 10) / 10 : 0,
      avgDefectDensity: totalPortfolios > 0 ? Math.round((totalDefectDensity / totalPortfolios) * 100) / 100 : 0,
    };
  }, [portfolios]);

  /**
   * Handles clicking a portfolio row to open the detail modal.
   *
   * @param {Object} portfolio - The portfolio object
   */
  const handlePortfolioClick = useCallback(async (portfolio) => {
    setSelectedPortfolio(portfolio);
    setDetailLoading(true);
    setDetailApplications([]);

    try {
      const result = await getApplications({ portfolio: portfolio.name });
      setDetailApplications(result.applications || []);
    } catch {
      setDetailApplications([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setSelectedPortfolio(null);
    setDetailApplications([]);
  }, []);

  /**
   * Portfolio table columns.
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
        key: 'owner',
        label: 'Owner',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
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
        key: 'qualityScore',
        label: 'Risk',
        sortable: false,
        render: (value) => {
          const riskLevel = getRiskLevelFromScore(value);
          return <StatusBadge status={riskLevel} size="sm" />;
        },
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
    ];
  }, []);

  /**
   * Detail application table columns.
   */
  const applicationColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Application',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
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
        key: 'riskLevel',
        label: 'Risk',
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
    ];
  }, []);

  /**
   * Export data for the portfolio table.
   */
  const portfolioExportData = useMemo(() => {
    return filteredPortfolios.map((p) => ({
      id: p.id,
      name: p.name,
      owner: p.owner,
      ownerEmail: p.ownerEmail,
      applicationCount: p.applicationCount,
      qualityScore: p.qualityScore,
      testCoverage: p.testCoverage,
      defectDensity: p.defectDensity,
      status: p.status,
    }));
  }, [filteredPortfolios]);

  /**
   * Trend chart configuration for the detail modal.
   */
  const trendChartConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'qualityScore', name: 'Quality Score', color: '#0069cc' },
        { dataKey: 'testCoverage', name: 'Test Coverage', color: '#0f9d58' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * Defect density trend chart configuration for the detail modal.
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
   * Quality score distribution chart data.
   */
  const qualityDistributionData = useMemo(() => {
    if (!filteredPortfolios || filteredPortfolios.length === 0) {
      return [];
    }

    let low = 0;
    let medium = 0;
    let high = 0;
    let critical = 0;

    for (const p of filteredPortfolios) {
      const risk = getRiskLevelFromScore(p.qualityScore);
      if (risk === 'low') {
        low++;
      } else if (risk === 'medium') {
        medium++;
      } else if (risk === 'high') {
        high++;
      } else {
        critical++;
      }
    }

    return [
      { name: 'Low Risk', value: low, color: '#0f9d58' },
      { name: 'Medium Risk', value: medium, color: '#f59e0b' },
      { name: 'High Risk', value: high, color: '#f97316' },
      { name: 'Critical Risk', value: critical, color: '#ef4444' },
    ].filter((item) => item.value > 0);
  }, [filteredPortfolios]);

  /**
   * Quality distribution chart config.
   */
  const qualityDistributionConfig = useMemo(() => {
    return {
      dataKey: 'value',
      nameKey: 'name',
      showLegend: true,
      innerRadius: 40,
      outerRadius: '75%',
    };
  }, []);

  /**
   * Portfolio comparison bar chart data.
   */
  const comparisonChartData = useMemo(() => {
    return filteredPortfolios
      .slice()
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 10)
      .map((p) => ({
        name: p.name.length > 20 ? p.name.substring(0, 17) + '...' : p.name,
        qualityScore: p.qualityScore,
        testCoverage: p.testCoverage,
      }));
  }, [filteredPortfolios]);

  /**
   * Portfolio comparison bar chart config.
   */
  const comparisonChartConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'qualityScore', name: 'Quality Score', color: '#0069cc' },
        { dataKey: 'testCoverage', name: 'Test Coverage', color: '#0f9d58' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading portfolio data..." showLabel />
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

  if (!portfolios || portfolios.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="No portfolio data available"
          description="Portfolio metrics could not be loaded. Please try again later."
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
            Portfolio Management
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Quality metrics and performance overview across all portfolios
          </p>
        </div>
        {portfolioExportData.length > 0 && (
          <ExportButton
            data={portfolioExportData}
            filename="portfolio-management"
            title="Portfolio Management Report"
            sheetName="Portfolios"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            label="Total Portfolios"
            value={summaryKPIs.totalPortfolios}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            }
          />
          <MetricCard
            label="Total Applications"
            value={summaryKPIs.totalApplications}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
          <MetricCard
            label="Avg Quality Score"
            value={summaryKPIs.avgQualityScore}
            trend={summaryKPIs.avgQualityScore >= 80 ? 'up' : summaryKPIs.avgQualityScore >= 70 ? 'neutral' : 'down'}
            trendValue={summaryKPIs.avgQualityScore >= 80 ? 'Good' : summaryKPIs.avgQualityScore >= 70 ? 'Fair' : 'Needs attention'}
            suffix="/100"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Avg Test Coverage"
            value={summaryKPIs.avgTestCoverage}
            trend={summaryKPIs.avgTestCoverage >= 75 ? 'up' : summaryKPIs.avgTestCoverage >= 60 ? 'neutral' : 'down'}
            trendValue={summaryKPIs.avgTestCoverage >= 75 ? 'Good' : summaryKPIs.avgTestCoverage >= 60 ? 'Fair' : 'Low'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <MetricCard
            label="Avg Defect Density"
            value={summaryKPIs.avgDefectDensity}
            trend={summaryKPIs.avgDefectDensity <= 1.5 ? 'up' : summaryKPIs.avgDefectDensity <= 2.5 ? 'neutral' : 'down'}
            trendValue={summaryKPIs.avgDefectDensity <= 1.5 ? 'Low' : summaryKPIs.avgDefectDensity <= 2.5 ? 'Moderate' : 'High'}
            suffix="/KLOC"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Comparison Bar Chart */}
        {comparisonChartData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="bar"
              data={comparisonChartData}
              config={comparisonChartConfig}
              title="Portfolio Quality Comparison"
              subtitle="Top portfolios by quality score"
              height={300}
              loading={false}
              emptyMessage="No portfolio data available"
            />
          </div>
        )}

        {/* Risk Distribution Pie Chart */}
        {qualityDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={qualityDistributionData}
              config={qualityDistributionConfig}
              title="Risk Distribution"
              subtitle="Portfolios by risk level based on quality score"
              height={300}
              loading={false}
              emptyMessage="No risk distribution data available"
            />
          </div>
        )}
      </div>

      {/* Portfolio Table */}
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
            All Portfolios
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({filteredPortfolios.length} of {portfolios.length})
          </span>
        </div>
        <DataTable
          columns={portfolioColumns}
          data={filteredPortfolios}
          pageSize={10}
          selectable={false}
          searchFields={['name', 'owner', 'status']}
          emptyMessage="No portfolios match the selected filters."
          rowKeyField="id"
          onRowClick={handlePortfolioClick}
          storageKey="portfolio-management-table"
        />
      </div>

      {/* Portfolio Detail Modal */}
      <Modal
        isOpen={selectedPortfolio !== null}
        onClose={handleCloseDetail}
        title={selectedPortfolio ? `${selectedPortfolio.name} — Portfolio Detail` : ''}
        size="xl"
      >
        {selectedPortfolio && (
          <div className="space-y-6">
            {/* Portfolio Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Quality Score</p>
                <p className={`text-xl font-bold ${selectedPortfolio.qualityScore >= 80 ? 'text-brand-green-600' : selectedPortfolio.qualityScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {selectedPortfolio.qualityScore}
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Test Coverage</p>
                <p className="text-xl font-bold text-brand-gray-900">
                  {selectedPortfolio.testCoverage}%
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Defect Density</p>
                <p className={`text-xl font-bold ${selectedPortfolio.defectDensity <= 1.5 ? 'text-brand-green-600' : selectedPortfolio.defectDensity <= 2.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {selectedPortfolio.defectDensity}
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Applications</p>
                <p className="text-xl font-bold text-brand-gray-900">
                  {selectedPortfolio.applicationCount}
                </p>
              </div>
            </div>

            {/* Portfolio Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-brand-gray-600">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Owner: {selectedPortfolio.owner}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={selectedPortfolio.status} size="sm" />
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={getRiskLevelFromScore(selectedPortfolio.qualityScore)} size="sm" />
              </div>
            </div>

            {/* Description */}
            {selectedPortfolio.description && (
              <p className="text-sm text-brand-gray-600 leading-relaxed">
                {selectedPortfolio.description}
              </p>
            )}

            {/* Trend Charts */}
            {selectedPortfolio.trendData && selectedPortfolio.trendData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-brand-gray-50 rounded-lg p-4">
                  <ChartWrapper
                    chartType="area"
                    data={selectedPortfolio.trendData}
                    config={trendChartConfig}
                    title="Quality & Coverage Trends"
                    subtitle="6-month trend"
                    height={220}
                    loading={false}
                    emptyMessage="No trend data available"
                  />
                </div>
                <div className="bg-brand-gray-50 rounded-lg p-4">
                  <ChartWrapper
                    chartType="line"
                    data={selectedPortfolio.trendData}
                    config={defectTrendConfig}
                    title="Defect Density Trend"
                    subtitle="6-month trend"
                    height={220}
                    loading={false}
                    emptyMessage="No defect trend data available"
                  />
                </div>
              </div>
            )}

            {/* Applications in Portfolio */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-4 h-4 text-brand-500 flex-shrink-0"
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
                <h3 className="text-sm font-semibold text-brand-gray-900">
                  Applications in Portfolio
                </h3>
              </div>

              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    <p className="text-xs text-brand-gray-400">Loading applications...</p>
                  </div>
                </div>
              ) : detailApplications.length > 0 ? (
                <DataTable
                  columns={applicationColumns}
                  data={detailApplications}
                  pageSize={5}
                  selectable={false}
                  searchFields={['name', 'owner', 'status', 'riskLevel']}
                  emptyMessage="No applications found in this portfolio."
                  rowKeyField="id"
                  storageKey="portfolio-detail-apps"
                />
              ) : (
                <div className="flex items-center justify-center py-8 text-sm text-brand-gray-500">
                  No applications found in this portfolio.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{portfolios.length} Portfolios</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{portfolios.filter((p) => getRiskLevelFromScore(p.qualityScore) === 'low').length} Low Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{portfolios.filter((p) => getRiskLevelFromScore(p.qualityScore) === 'medium').length} Medium Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>{portfolios.filter((p) => getRiskLevelFromScore(p.qualityScore) === 'high').length} High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{portfolios.filter((p) => getRiskLevelFromScore(p.qualityScore) === 'critical').length} Critical Risk</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            {filteredPortfolios.length !== portfolios.length
              ? `Showing ${filteredPortfolios.length} of ${portfolios.length} portfolios`
              : `Showing all ${portfolios.length} portfolios`}
          </div>
        </div>
      </div>
    </div>
  );
}
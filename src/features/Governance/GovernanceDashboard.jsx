/**
 * GovernanceDashboard Component
 * Governance Dashboard screen (FR-018): displays adherence metrics with MetricCards
 * (overall compliance rate, procedures compliant/non-compliant/partial), compliance by category
 * bar chart, trend line chart, procedures DataTable with drill-down to GovernanceProcedureDetail.
 * Filter by category/status. Uses DashboardService.getGovernanceMetrics().
 * @module GovernanceDashboard
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getGovernanceMetrics,
  getGovernanceProcedureById,
  getDistinctGovernanceCategories,
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
  Compliant: '#0f9d58',
  NonCompliant: '#ef4444',
  Partial: '#f59e0b',
};

/**
 * Category color mapping for charts.
 * @type {Object.<string, string>}
 */
const CATEGORY_COLORS = {
  'Data Management': '#0069cc',
  'Financial Controls': '#0f9d58',
  'HR Compliance': '#f59e0b',
  'ICT Security': '#8b5cf6',
  'Procurement': '#f97316',
  'Programme Management': '#06b6d4',
  'Quality Assurance': '#ec4899',
  'Regulatory': '#14b8a6',
  'Governance & Compliance': '#6366f1',
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
 * GovernanceDashboard page component.
 * Displays adherence metrics with KPI cards, compliance by category bar chart,
 * compliance trend line chart, procedures DataTable with drill-down, and filtering
 * by category/status.
 *
 * @returns {React.ReactElement} The governance dashboard page
 */
export default function GovernanceDashboard() {
  const { currentUser, role } = useAuth();

  const [governanceData, setGovernanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    category: '',
    status: '',
  });

  // Distinct values for filter dropdowns
  const [distinctCategories, setDistinctCategories] = useState([]);

  // Detail modal state
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  /**
   * Loads distinct filter values.
   */
  useEffect(() => {
    try {
      setDistinctCategories(getDistinctGovernanceCategories());
    } catch {
      // Ignore errors loading distinct values
    }
  }, []);

  /**
   * Fetches governance metrics data.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getGovernanceMetrics();
      setGovernanceData(data);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load governance data.';
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
      category: '',
      status: '',
    });
  }, []);

  /**
   * Builds the filter configuration for the FilterBar.
   */
  const filterConfig = useMemo(() => {
    return [
      {
        key: 'category',
        label: 'Category',
        placeholder: 'All Categories',
        options: distinctCategories.map((c) => ({
          value: c,
          label: c,
        })),
      },
      {
        key: 'status',
        label: 'Status',
        placeholder: 'All Statuses',
        options: [
          { value: 'Compliant', label: 'Compliant' },
          { value: 'NonCompliant', label: 'Non-Compliant' },
          { value: 'Partial', label: 'Partial' },
        ],
      },
    ];
  }, [distinctCategories]);

  /**
   * Filtered procedures based on current filter values.
   */
  const filteredProcedures = useMemo(() => {
    if (!governanceData || !governanceData.procedures) {
      return [];
    }

    let result = governanceData.procedures;

    if (filterValues.category) {
      result = result.filter((p) => p.category === filterValues.category);
    }

    if (filterValues.status) {
      result = result.filter((p) => p.status === filterValues.status);
    }

    return result;
  }, [governanceData, filterValues]);

  /**
   * Summary KPIs from governance data.
   */
  const summaryKPIs = useMemo(() => {
    if (!governanceData) {
      return null;
    }

    return {
      totalProcedures: governanceData.totalProcedures || 0,
      compliantCount: governanceData.compliantCount || 0,
      nonCompliantCount: governanceData.nonCompliantCount || 0,
      partialCount: governanceData.partialCount || 0,
      averageComplianceRate: governanceData.averageComplianceRate || 0,
      highRiskCount: governanceData.highRiskProcedures ? governanceData.highRiskProcedures.length : 0,
    };
  }, [governanceData]);

  /**
   * Status distribution chart data.
   */
  const statusDistributionData = useMemo(() => {
    if (!governanceData || !governanceData.statusDistribution) {
      return [];
    }

    return Object.entries(governanceData.statusDistribution)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: STATUS_COLORS[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [governanceData]);

  /**
   * Category distribution bar chart data.
   */
  const categoryDistributionData = useMemo(() => {
    if (!governanceData || !governanceData.procedures || governanceData.procedures.length === 0) {
      return [];
    }

    const categoryMap = {};
    for (const proc of governanceData.procedures) {
      const cat = proc.category || 'Unknown';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { totalCompliance: 0, count: 0 };
      }
      categoryMap[cat].totalCompliance += proc.complianceRate || 0;
      categoryMap[cat].count++;
    }

    return Object.entries(categoryMap)
      .map(([category, data]) => ({
        name: category.length > 22 ? category.substring(0, 19) + '...' : category,
        complianceRate: data.count > 0 ? Math.round((data.totalCompliance / data.count) * 10) / 10 : 0,
        procedures: data.count,
      }))
      .sort((a, b) => a.complianceRate - b.complianceRate);
  }, [governanceData]);

  /**
   * Category bar chart config.
   */
  const categoryBarConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'complianceRate', name: 'Avg Compliance Rate (%)', color: '#0069cc' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * Compliance trend data from audit histories across all procedures.
   */
  const complianceTrendData = useMemo(() => {
    if (!governanceData || !governanceData.procedures || governanceData.procedures.length === 0) {
      return [];
    }

    const dateMap = {};

    for (const proc of governanceData.procedures) {
      if (proc.auditHistory && Array.isArray(proc.auditHistory)) {
        for (const audit of proc.auditHistory) {
          if (!audit.auditDate) {
            continue;
          }
          const date = new Date(audit.auditDate);
          if (isNaN(date.getTime())) {
            continue;
          }
          const dateKey = date.toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'short',
          });

          if (!dateMap[dateKey]) {
            dateMap[dateKey] = { date: dateKey, totalScore: 0, count: 0, timestamp: date.getTime() };
          }

          dateMap[dateKey].totalScore += audit.score || 0;
          dateMap[dateKey].count++;
        }
      }
    }

    const trendArray = Object.values(dateMap);
    trendArray.sort((a, b) => a.timestamp - b.timestamp);

    for (const entry of trendArray) {
      entry.avgComplianceRate = entry.count > 0
        ? Math.round((entry.totalScore / entry.count) * 10) / 10
        : 0;
    }

    return trendArray.slice(-12);
  }, [governanceData]);

  /**
   * Compliance trend chart config.
   */
  const trendChartConfig = useMemo(() => {
    return {
      xAxisKey: 'date',
      series: [
        { dataKey: 'avgComplianceRate', name: 'Avg Compliance Rate (%)', color: '#0069cc' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
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
   * Procedures table columns.
   */
  const procedureColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Procedure',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900 line-clamp-2">{value}</span>
        ),
      },
      {
        key: 'category',
        label: 'Category',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-600 truncate max-w-[150px] block">{value}</span>
        ),
      },
      {
        key: 'complianceRate',
        label: 'Compliance',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value < 70) {
            colorClass = 'text-red-600';
          } else if (value < 85) {
            colorClass = 'text-yellow-600';
          }
          return (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-brand-gray-200 rounded-full max-w-[60px]">
                <div
                  className={`h-2 rounded-full ${value >= 85 ? 'bg-brand-green-500' : value >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(value, 100)}%` }}
                />
              </div>
              <span className={`text-sm font-semibold ${colorClass}`}>{value}%</span>
            </div>
          );
        },
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
        key: 'lastAuditDate',
        label: 'Last Audit',
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
   * Audit history table columns for the detail modal.
   */
  const auditHistoryColumns = useMemo(() => {
    return [
      {
        key: 'auditDate',
        label: 'Audit Date',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-500 whitespace-nowrap">
            {formatDisplayDate(value) || '—'}
          </span>
        ),
      },
      {
        key: 'auditor',
        label: 'Auditor',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'result',
        label: 'Result',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'score',
        label: 'Score',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value < 70) {
            colorClass = 'text-red-600';
          } else if (value < 85) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-semibold ${colorClass}`}>{value}%</span>
          );
        },
      },
      {
        key: 'finding',
        label: 'Finding',
        sortable: false,
        render: (value) => (
          <span className="text-xs text-brand-gray-600 line-clamp-2">{value}</span>
        ),
      },
    ];
  }, []);

  /**
   * Export data for the procedures table.
   */
  const procedureExportData = useMemo(() => {
    return filteredProcedures.map((proc) => ({
      id: proc.id,
      name: proc.name,
      category: proc.category,
      complianceRate: proc.complianceRate,
      status: proc.status,
      owner: proc.owner,
      ownerEmail: proc.ownerEmail,
      lastAuditDate: proc.lastAuditDate,
      description: proc.description,
      applicablePortfolios: proc.applicablePortfolios ? proc.applicablePortfolios.join(', ') : '',
      auditCount: proc.auditHistory ? proc.auditHistory.length : 0,
    }));
  }, [filteredProcedures]);

  /**
   * Handles clicking a procedure row to open the detail modal.
   *
   * @param {Object} procedure - The governance procedure object
   */
  const handleRowClick = useCallback((procedure) => {
    setSelectedProcedure(procedure);
    setDetailModalOpen(true);
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedProcedure(null);
  }, []);

  /**
   * High risk procedures from governance data.
   */
  const highRiskProcedures = useMemo(() => {
    if (!governanceData || !governanceData.highRiskProcedures) {
      return [];
    }
    return governanceData.highRiskProcedures;
  }, [governanceData]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading governance data..." showLabel />
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

  if (!governanceData) {
    return (
      <div className="p-6">
        <EmptyState
          title="No governance data available"
          description="Governance metrics could not be loaded. Please try again later."
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
            Governance Dashboard
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Compliance adherence metrics, audit findings, and governance procedure monitoring
          </p>
        </div>
        {procedureExportData.length > 0 && (
          <ExportButton
            data={procedureExportData}
            filename="governance-dashboard"
            title="Governance Dashboard Report"
            sheetName="Governance Procedures"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            label="Avg Compliance Rate"
            value={summaryKPIs.averageComplianceRate}
            trend={summaryKPIs.averageComplianceRate >= 85 ? 'up' : summaryKPIs.averageComplianceRate >= 70 ? 'neutral' : 'down'}
            trendValue={summaryKPIs.averageComplianceRate >= 85 ? 'Good' : summaryKPIs.averageComplianceRate >= 70 ? 'Fair' : 'Needs attention'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <MetricCard
            label="Total Procedures"
            value={summaryKPIs.totalProcedures}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <MetricCard
            label="Compliant"
            value={summaryKPIs.compliantCount}
            trend="up"
            trendValue={summaryKPIs.totalProcedures > 0 ? `${Math.round((summaryKPIs.compliantCount / summaryKPIs.totalProcedures) * 100)}%` : '0%'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Non-Compliant"
            value={summaryKPIs.nonCompliantCount}
            trend={summaryKPIs.nonCompliantCount > 0 ? 'down' : 'up'}
            trendValue={summaryKPIs.nonCompliantCount > 0 ? 'Action needed' : 'None'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <MetricCard
            label="Partial"
            value={summaryKPIs.partialCount}
            trend={summaryKPIs.partialCount > 3 ? 'down' : 'neutral'}
            trendValue={summaryKPIs.partialCount > 3 ? 'Review needed' : ''}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="High Risk"
            value={summaryKPIs.highRiskCount}
            trend={summaryKPIs.highRiskCount > 0 ? 'down' : 'up'}
            trendValue={summaryKPIs.highRiskCount > 0 ? 'Below 70%' : 'None'}
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
        {/* Status Distribution */}
        {statusDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={statusDistributionData}
              config={pieChartConfig}
              title="Compliance Status Distribution"
              subtitle="Procedures by compliance status"
              height={280}
              loading={false}
              emptyMessage="No status data available"
            />
          </div>
        )}

        {/* Category Compliance Bar Chart */}
        {categoryDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="bar"
              data={categoryDistributionData}
              config={categoryBarConfig}
              title="Compliance by Category"
              subtitle="Average compliance rate per category"
              height={280}
              loading={false}
              emptyMessage="No category data available"
            />
          </div>
        )}

        {/* Compliance Trend Line Chart */}
        {complianceTrendData.length > 1 ? (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="line"
              data={complianceTrendData}
              config={trendChartConfig}
              title="Compliance Trend"
              subtitle="Average compliance rate over audit periods"
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

      {/* High Risk Procedures */}
      {highRiskProcedures.length > 0 && (
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
              High Risk Procedures
            </h2>
            <span className="text-sm text-brand-gray-500">
              Compliance rate below 70%
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {highRiskProcedures.map((proc) => (
              <div
                key={proc.id}
                className="flex flex-col gap-2 p-3 bg-red-50 rounded-lg border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => handleRowClick(proc)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(proc);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View procedure ${proc.name}`}
              >
                <p className="text-sm font-medium text-brand-gray-900 line-clamp-2" title={proc.name}>
                  {proc.name}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-gray-500">{proc.category}</span>
                  <span className="text-sm font-bold text-red-600">{proc.complianceRate}%</span>
                </div>
                <div className="h-2 bg-red-200 rounded-full">
                  <div
                    className="h-2 bg-red-500 rounded-full"
                    style={{ width: `${Math.min(proc.complianceRate, 100)}%` }}
                  />
                </div>
                <StatusBadge status={proc.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Procedures Table */}
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
            All Governance Procedures
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({filteredProcedures.length} of {governanceData.totalProcedures})
          </span>
        </div>
        {filteredProcedures.length > 0 ? (
          <DataTable
            columns={procedureColumns}
            data={filteredProcedures}
            pageSize={10}
            selectable={false}
            searchFields={['name', 'category', 'status', 'owner', 'description']}
            emptyMessage="No governance procedures match the selected filters."
            rowKeyField="id"
            onRowClick={handleRowClick}
            storageKey="governance-dashboard-table"
          />
        ) : (
          <EmptyState
            title="No procedures found"
            description="No governance procedures match the selected filters. Try adjusting your filter criteria."
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
            <span>{governanceData.compliantCount} Compliant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{governanceData.nonCompliantCount} Non-Compliant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{governanceData.partialCount} Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>Avg Compliance: {governanceData.averageComplianceRate}%</span>
          </div>
          {governanceData.highRiskProcedures && governanceData.highRiskProcedures.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>{governanceData.highRiskProcedures.length} High Risk</span>
            </div>
          )}
          <div className="ml-auto text-[10px] text-brand-gray-400">
            {filteredProcedures.length !== governanceData.totalProcedures
              ? `Showing ${filteredProcedures.length} of ${governanceData.totalProcedures} procedures`
              : `Showing all ${governanceData.totalProcedures} procedures`}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
        title={selectedProcedure ? selectedProcedure.name : ''}
        size="xl"
      >
        {selectedProcedure && (
          <div className="space-y-6">
            {/* Status and Category */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedProcedure.status} size="md" />
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
                {selectedProcedure.category}
              </span>
            </div>

            {/* Description */}
            {selectedProcedure.description && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-sm text-brand-gray-700 leading-relaxed">
                  {selectedProcedure.description}
                </p>
              </div>
            )}

            {/* Compliance Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Compliance Rate</p>
                <p className={`text-xl font-bold ${selectedProcedure.complianceRate >= 85 ? 'text-brand-green-600' : selectedProcedure.complianceRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {selectedProcedure.complianceRate}%
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Status</p>
                <StatusBadge status={selectedProcedure.status} size="md" />
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Owner</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedProcedure.owner}</p>
                {selectedProcedure.ownerEmail && (
                  <p className="text-xs text-brand-gray-500 truncate">{selectedProcedure.ownerEmail}</p>
                )}
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Last Audit</p>
                <p className="text-sm font-medium text-brand-gray-900">
                  {formatDisplayDate(selectedProcedure.lastAuditDate) || '—'}
                </p>
              </div>
            </div>

            {/* Compliance Progress Bar */}
            <div className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-brand-gray-700">Compliance Progress</span>
                <span className={`text-sm font-bold ${selectedProcedure.complianceRate >= 85 ? 'text-brand-green-600' : selectedProcedure.complianceRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {selectedProcedure.complianceRate}%
                </span>
              </div>
              <div className="h-3 bg-brand-gray-200 rounded-full">
                <div
                  className={`h-3 rounded-full ${selectedProcedure.complianceRate >= 85 ? 'bg-brand-green-500' : selectedProcedure.complianceRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(selectedProcedure.complianceRate, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-brand-gray-500">
                <span>0%</span>
                <span className="text-brand-gray-400">Target: 85%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Applicable Portfolios */}
            {selectedProcedure.applicablePortfolios && selectedProcedure.applicablePortfolios.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Applicable Portfolios
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProcedure.applicablePortfolios.map((portfolio, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300"
                    >
                      {portfolio}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Audit History */}
            {selectedProcedure.auditHistory && selectedProcedure.auditHistory.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Audit History ({selectedProcedure.auditHistory.length})
                </h3>
                <DataTable
                  columns={auditHistoryColumns}
                  data={selectedProcedure.auditHistory.map((audit, i) => ({ ...audit, id: audit.id || `audit-${i}` }))}
                  pageSize={5}
                  selectable={false}
                  searchFields={['auditor', 'finding', 'result']}
                  emptyMessage="No audit history available."
                  rowKeyField="id"
                  storageKey={`governance-detail-audit-${selectedProcedure.id}`}
                />
              </div>
            )}

            {/* Corrective Actions from Audit History */}
            {selectedProcedure.auditHistory && selectedProcedure.auditHistory.some((a) => a.correctiveAction) && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Corrective Actions
                </h3>
                <div className="space-y-2">
                  {selectedProcedure.auditHistory
                    .filter((a) => a.correctiveAction)
                    .map((audit, index) => (
                      <div
                        key={index}
                        className="flex gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-brand-gray-700 leading-relaxed">
                            {audit.correctiveAction}
                          </p>
                          <p className="text-[10px] text-brand-gray-400 mt-1">
                            {formatDisplayDate(audit.auditDate)} · {audit.auditor}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-600">
              {selectedProcedure.createdAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Created: {formatDisplayDate(selectedProcedure.createdAt)}</span>
                </div>
              )}
              {selectedProcedure.updatedAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Updated: {formatDisplayDate(selectedProcedure.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
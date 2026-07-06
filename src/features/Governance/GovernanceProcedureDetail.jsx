/**
 * GovernanceProcedureDetail Component
 * Governance Procedure Detail screen (FR-019): displays procedure details (name, category,
 * description, compliance rate, owner, applicable portfolios), audit history table with
 * dates/findings/actions, and status timeline. Uses localStorage governance data.
 * @module GovernanceProcedureDetail
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import { getGovernanceProcedureById } from '../../shared/services/dashboardService.js';
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
 * GovernanceProcedureDetail page component.
 * Displays procedure details including name, category, description, compliance rate,
 * owner, applicable portfolios, audit history table, and status timeline.
 *
 * @returns {React.ReactElement} The governance procedure detail page
 */
export default function GovernanceProcedureDetail() {
  const { currentUser, role } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [procedure, setProcedure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches the governance procedure data by id.
   */
  const fetchProcedure = useCallback(async () => {
    if (!id) {
      setError('No procedure ID provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const proc = await getGovernanceProcedureById(id);
      if (!proc) {
        setError('Governance procedure not found.');
        setLoading(false);
        return;
      }
      setProcedure(proc);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load governance procedure details.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProcedure();
  }, [fetchProcedure]);

  /**
   * Audit history table columns.
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
      {
        key: 'correctiveAction',
        label: 'Corrective Action',
        sortable: false,
        render: (value) => (
          <span className="text-xs text-brand-gray-600 line-clamp-2">{value || '—'}</span>
        ),
      },
    ];
  }, []);

  /**
   * Audit history data for the table.
   */
  const auditHistoryData = useMemo(() => {
    if (!procedure || !procedure.auditHistory || procedure.auditHistory.length === 0) {
      return [];
    }
    return procedure.auditHistory
      .slice()
      .sort((a, b) => new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime())
      .map((audit, i) => ({ ...audit, id: audit.id || `audit-${i}` }));
  }, [procedure]);

  /**
   * Compliance trend chart data from audit history.
   */
  const complianceTrendData = useMemo(() => {
    if (!procedure || !procedure.auditHistory || procedure.auditHistory.length === 0) {
      return [];
    }

    return procedure.auditHistory
      .slice()
      .sort((a, b) => new Date(a.auditDate).getTime() - new Date(b.auditDate).getTime())
      .map((audit) => ({
        date: formatDisplayDate(audit.auditDate),
        score: audit.score || 0,
        timestamp: new Date(audit.auditDate).getTime(),
      }));
  }, [procedure]);

  /**
   * Compliance trend chart config.
   */
  const trendChartConfig = useMemo(() => {
    return {
      xAxisKey: 'date',
      series: [
        { dataKey: 'score', name: 'Compliance Score (%)', color: '#0069cc' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * Audit result distribution chart data.
   */
  const auditResultDistributionData = useMemo(() => {
    if (!procedure || !procedure.auditHistory || procedure.auditHistory.length === 0) {
      return [];
    }

    const counts = {};
    for (const audit of procedure.auditHistory) {
      const result = audit.result || 'Unknown';
      counts[result] = (counts[result] || 0) + 1;
    }

    const resultColors = {
      Compliant: '#0f9d58',
      NonCompliant: '#ef4444',
      Partial: '#f59e0b',
    };

    return Object.entries(counts)
      .map(([result, count]) => ({
        name: formatStatusLabel(result),
        value: count,
        color: resultColors[result] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [procedure]);

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
   * Export data for the procedure detail.
   */
  const exportData = useMemo(() => {
    if (!procedure) {
      return [];
    }

    return [{
      id: procedure.id,
      name: procedure.name,
      category: procedure.category,
      complianceRate: procedure.complianceRate,
      status: procedure.status,
      owner: procedure.owner,
      ownerEmail: procedure.ownerEmail,
      lastAuditDate: procedure.lastAuditDate,
      description: procedure.description,
      applicablePortfolios: procedure.applicablePortfolios ? procedure.applicablePortfolios.join(', ') : '',
      auditCount: procedure.auditHistory ? procedure.auditHistory.length : 0,
    }];
  }, [procedure]);

  /**
   * Handles navigating back.
   */
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading governance procedure details..." showLabel />
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
            onClick={fetchProcedure}
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

  if (!procedure) {
    return (
      <div className="p-6">
        <EmptyState
          title="Governance procedure not found"
          description="The requested governance procedure could not be found. It may have been removed or the ID is incorrect."
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
                {procedure.name}
              </h1>
              <StatusBadge status={procedure.status} size="md" />
            </div>
            <p className="text-sm text-brand-gray-500 mt-1">
              {procedure.category} · Owned by {procedure.owner}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {exportData.length > 0 && (
            <ExportButton
              data={exportData}
              filename={`governance-procedure-${procedure.id}`}
              title={`Governance Procedure: ${procedure.name}`}
              sheetName="Procedure Detail"
              label="Export"
              size="md"
            />
          )}
        </div>
      </div>

      {/* Description */}
      {procedure.description && (
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
            Description
          </h3>
          <p className="text-sm text-brand-gray-700 leading-relaxed">
            {procedure.description}
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Compliance Rate"
          value={procedure.complianceRate}
          trend={procedure.complianceRate >= 85 ? 'up' : procedure.complianceRate >= 70 ? 'neutral' : 'down'}
          trendValue={procedure.complianceRate >= 85 ? 'Good' : procedure.complianceRate >= 70 ? 'Fair' : 'Needs attention'}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <MetricCard
          label="Status"
          value={formatStatusLabel(procedure.status)}
          trend={procedure.status === 'Compliant' ? 'up' : procedure.status === 'NonCompliant' ? 'down' : 'neutral'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Audit Count"
          value={procedure.auditHistory ? procedure.auditHistory.length : 0}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <MetricCard
          label="Category"
          value={procedure.category}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
        />
        <MetricCard
          label="Portfolios"
          value={procedure.applicablePortfolios ? procedure.applicablePortfolios.length : 0}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
        <MetricCard
          label="Last Audit"
          value={formatDisplayDate(procedure.lastAuditDate) || '—'}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Procedure Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-brand-gray-900">Procedure Details</h2>

          <div className="space-y-3">
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Category</p>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
                {procedure.category}
              </span>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Owner</p>
              <p className="text-sm font-medium text-brand-gray-900">{procedure.owner}</p>
              {procedure.ownerEmail && (
                <p className="text-xs text-brand-gray-500 truncate">{procedure.ownerEmail}</p>
              )}
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Status</p>
              <StatusBadge status={procedure.status} size="md" />
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Last Audit Date</p>
              <p className="text-sm font-medium text-brand-gray-900">
                {formatDisplayDate(procedure.lastAuditDate) || '—'}
              </p>
            </div>
          </div>

          {/* Compliance Progress Bar */}
          <div>
            <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
              Compliance Progress
            </h3>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-brand-gray-700">Current Rate</span>
              <span className={`text-sm font-bold ${procedure.complianceRate >= 85 ? 'text-brand-green-600' : procedure.complianceRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {procedure.complianceRate}%
              </span>
            </div>
            <div className="h-3 bg-brand-gray-200 rounded-full">
              <div
                className={`h-3 rounded-full ${procedure.complianceRate >= 85 ? 'bg-brand-green-500' : procedure.complianceRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(procedure.complianceRate, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-brand-gray-500">
              <span>0%</span>
              <span className="text-brand-gray-400">Target: 85%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Applicable Portfolios */}
          {procedure.applicablePortfolios && procedure.applicablePortfolios.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                Applicable Portfolios
              </h3>
              <div className="flex flex-wrap gap-2">
                {procedure.applicablePortfolios.map((portfolio, index) => (
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

          {/* Dates */}
          <div className="space-y-2 text-sm text-brand-gray-600 pt-2 border-t border-brand-gray-200">
            {procedure.createdAt && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Created: {formatDisplayDate(procedure.createdAt)}</span>
              </div>
            )}
            {procedure.updatedAt && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Updated: {formatDisplayDate(procedure.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Charts & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Compliance Trend Chart */}
            {complianceTrendData.length > 1 ? (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <ChartWrapper
                  chartType="line"
                  data={complianceTrendData}
                  config={trendChartConfig}
                  title="Compliance Score Trend"
                  subtitle="Score progression across audit periods"
                  height={250}
                  loading={false}
                  emptyMessage="Not enough data for trend"
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm flex items-center justify-center min-h-[250px]">
                <div className="text-center">
                  <svg className="w-10 h-10 text-brand-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  <p className="text-sm text-brand-gray-500">Not enough data for trend chart</p>
                </div>
              </div>
            )}

            {/* Audit Result Distribution */}
            {auditResultDistributionData.length > 0 ? (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <ChartWrapper
                  chartType="pie"
                  data={auditResultDistributionData}
                  config={pieChartConfig}
                  title="Audit Result Distribution"
                  subtitle="Results across all audits"
                  height={250}
                  loading={false}
                  emptyMessage="No audit result data available"
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm flex items-center justify-center min-h-[250px]">
                <div className="text-center">
                  <svg className="w-10 h-10 text-brand-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  <p className="text-sm text-brand-gray-500">No audit result data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Status Timeline */}
          {procedure.auditHistory && procedure.auditHistory.length > 0 && (
            <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-brand-gray-900 mb-4">Compliance Timeline</h3>
              <div className="space-y-3">
                {procedure.auditHistory
                  .slice()
                  .sort((a, b) => new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime())
                  .map((audit, index) => {
                    const isLatest = index === 0;
                    const isCompliant = audit.result === 'Compliant';
                    const isNonCompliant = audit.result === 'NonCompliant';

                    let dotColor = 'bg-yellow-500';
                    if (isCompliant) {
                      dotColor = 'bg-brand-green-500';
                    } else if (isNonCompliant) {
                      dotColor = 'bg-red-500';
                    }

                    if (isLatest) {
                      dotColor = 'bg-brand-500';
                    }

                    return (
                      <div key={audit.id || index} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${dotColor}`} />
                          {index < procedure.auditHistory.length - 1 && (
                            <div className="w-0.5 flex-1 bg-brand-gray-200 mt-1" />
                          )}
                        </div>
                        <div className="pb-3 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-brand-gray-900">
                              Audit by {audit.auditor}
                            </p>
                            <StatusBadge status={audit.result} size="sm" />
                            <span className={`text-xs font-semibold ${audit.score >= 85 ? 'text-brand-green-600' : audit.score >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {audit.score}%
                            </span>
                            {isLatest && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-brand-500 text-white">
                                Latest
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-brand-gray-500 mt-0.5">
                            {formatDisplayDate(audit.auditDate)}
                          </p>
                          <p className="text-xs text-brand-gray-600 mt-1 leading-relaxed line-clamp-2">
                            {audit.finding}
                          </p>
                          {audit.correctiveAction && (
                            <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1.5 bg-yellow-50 border border-yellow-200 rounded-md">
                              <svg className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <p className="text-[10px] text-yellow-700 leading-relaxed">
                                {audit.correctiveAction}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audit History Table */}
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
            Audit History
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({auditHistoryData.length})
          </span>
        </div>
        {auditHistoryData.length > 0 ? (
          <DataTable
            columns={auditHistoryColumns}
            data={auditHistoryData}
            pageSize={10}
            selectable={false}
            searchFields={['auditor', 'finding', 'result', 'correctiveAction']}
            emptyMessage="No audit history available for this procedure."
            rowKeyField="id"
            storageKey={`governance-procedure-detail-audit-${id}`}
          />
        ) : (
          <div className="flex items-center justify-center py-8 text-sm text-brand-gray-500">
            No audit history available for this procedure.
          </div>
        )}
      </div>

      {/* Corrective Actions Summary */}
      {procedure.auditHistory && procedure.auditHistory.some((a) => a.correctiveAction) && (
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg
              className="w-5 h-5 text-yellow-500 flex-shrink-0"
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
              Corrective Actions
            </h2>
          </div>
          <div className="space-y-3">
            {procedure.auditHistory
              .filter((a) => a.correctiveAction)
              .sort((a, b) => new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime())
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
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-brand-gray-400">
                        {formatDisplayDate(audit.auditDate)}
                      </span>
                      <span className="text-[10px] text-brand-gray-400">
                        {audit.auditor}
                      </span>
                      <StatusBadge status={audit.result} size="sm" />
                    </div>
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
            <span>Compliance Rate: {procedure.complianceRate}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${procedure.status === 'Compliant' ? 'bg-brand-green-500' : procedure.status === 'NonCompliant' ? 'bg-red-500' : 'bg-yellow-500'}`} />
            <span>Status: {formatStatusLabel(procedure.status)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{procedure.auditHistory ? procedure.auditHistory.length : 0} Audits</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>{procedure.applicablePortfolios ? procedure.applicablePortfolios.length : 0} Portfolios</span>
          </div>
          {procedure.auditHistory && procedure.auditHistory.some((a) => a.correctiveAction) && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>{procedure.auditHistory.filter((a) => a.correctiveAction).length} Corrective Actions</span>
            </div>
          )}
          <div className="ml-auto text-[10px] text-brand-gray-400">
            Last updated: {formatDisplayDate(procedure.updatedAt) || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
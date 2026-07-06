/**
 * ApplicationRepository Component
 * Application Repository screen (FR-005): displays enterprise application inventory in DataTable
 * with search, filter (portfolio/status/risk), add/edit/archive actions via modals, export button,
 * drill-down links to ApplicationDetail. Uses RepositoryService and ExportService.
 * Logs actions via AuditLogService.
 * @module ApplicationRepository
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getApplications,
  addApplication,
  editApplication,
  archiveApplication,
  getDistinctPortfolios,
  getDistinctAppStatuses,
  getDistinctRiskLevels,
} from '../../shared/services/repositoryService.js';
import { logAction } from '../../shared/services/auditLogService.js';
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
  active: '#0f9d58',
  inactive: '#939ba3',
  archived: '#78828c',
  in_development: '#0069cc',
  deprecated: '#f59e0b',
};

/**
 * Risk level color mapping for charts.
 * @type {Object.<string, string>}
 */
const RISK_COLORS = {
  low: '#0f9d58',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

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
 * ApplicationRepository page component.
 * Displays enterprise application inventory with filtering, CRUD actions via modals,
 * export functionality, and summary KPIs with charts.
 *
 * @returns {React.ReactElement} The application repository page
 */
export default function ApplicationRepository() {
  const { currentUser, role, hasPermission } = useAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    portfolio: '',
    status: '',
    riskLevel: '',
  });

  // Distinct values for filter dropdowns
  const [distinctPortfolios, setDistinctPortfolios] = useState([]);
  const [distinctStatuses, setDistinctStatuses] = useState([]);
  const [distinctRiskLevels, setDistinctRiskLevels] = useState([]);

  // Modal states
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: '',
    portfolio: '',
    owner: '',
    ownerEmail: '',
    status: 'active',
    riskLevel: 'medium',
    environment: 'development',
    description: '',
    techStack: '',
  });
  const [addFormError, setAddFormError] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    portfolio: '',
    owner: '',
    ownerEmail: '',
    status: 'active',
    riskLevel: 'medium',
    environment: 'production',
    description: '',
    qualityScore: 0,
    testCoverage: 0,
    automationRate: 0,
  });
  const [editFormError, setEditFormError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Archive state
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);

  /**
   * Loads distinct filter values.
   */
  useEffect(() => {
    try {
      setDistinctPortfolios(getDistinctPortfolios());
      setDistinctStatuses(getDistinctAppStatuses());
      setDistinctRiskLevels(getDistinctRiskLevels());
    } catch {
      // Ignore errors loading distinct values
    }
  }, []);

  /**
   * Fetches applications based on current filters.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = { includeArchived: true };

      if (filterValues.portfolio) {
        filters.portfolio = filterValues.portfolio;
      }

      if (filterValues.status) {
        filters.status = filterValues.status;
      }

      if (filterValues.riskLevel) {
        filters.riskLevel = filterValues.riskLevel;
      }

      const result = await getApplications(filters);
      setApplications(result.applications || []);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load applications.';
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
      status: '',
      riskLevel: '',
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
        options: distinctPortfolios.map((p) => ({
          value: p,
          label: p,
        })),
      },
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
        key: 'riskLevel',
        label: 'Risk Level',
        placeholder: 'All Risk Levels',
        options: distinctRiskLevels.map((r) => ({
          value: r,
          label: r.charAt(0).toUpperCase() + r.slice(1),
        })),
      },
    ];
  }, [distinctPortfolios, distinctStatuses, distinctRiskLevels]);

  /**
   * Summary KPIs computed from all applications.
   */
  const summaryKPIs = useMemo(() => {
    if (!applications || applications.length === 0) {
      return null;
    }

    const total = applications.length;
    let activeCount = 0;
    let totalQualityScore = 0;
    let totalTestCoverage = 0;
    let totalAutomationRate = 0;
    let criticalRiskCount = 0;
    let highRiskCount = 0;

    for (const app of applications) {
      if (app.status === 'active') {
        activeCount++;
      }
      totalQualityScore += app.qualityScore || 0;
      totalTestCoverage += app.testCoverage || 0;
      totalAutomationRate += app.automationRate || 0;
      if (app.riskLevel === 'critical') {
        criticalRiskCount++;
      }
      if (app.riskLevel === 'high') {
        highRiskCount++;
      }
    }

    return {
      total,
      activeCount,
      avgQualityScore: total > 0 ? Math.round((totalQualityScore / total) * 10) / 10 : 0,
      avgTestCoverage: total > 0 ? Math.round((totalTestCoverage / total) * 10) / 10 : 0,
      avgAutomationRate: total > 0 ? Math.round((totalAutomationRate / total) * 10) / 10 : 0,
      criticalRiskCount,
      highRiskCount,
    };
  }, [applications]);

  /**
   * Status distribution chart data.
   */
  const statusDistributionData = useMemo(() => {
    const counts = {};
    for (const app of applications) {
      const status = app.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: STATUS_COLORS[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [applications]);

  /**
   * Risk distribution chart data.
   */
  const riskDistributionData = useMemo(() => {
    const counts = {};
    for (const app of applications) {
      const risk = app.riskLevel || 'unknown';
      counts[risk] = (counts[risk] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([risk, count]) => ({
        name: risk.charAt(0).toUpperCase() + risk.slice(1),
        value: count,
        color: RISK_COLORS[risk] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [applications]);

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
   * Application table columns.
   */
  const appColumns = useMemo(() => {
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
        key: 'portfolio',
        label: 'Portfolio',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-600 truncate max-w-[150px] block">{value}</span>
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
        key: 'lastRelease',
        label: 'Last Release',
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
   * Export data for the application table.
   */
  const appExportData = useMemo(() => {
    return applications.map((app) => ({
      id: app.id,
      name: app.name,
      portfolio: app.portfolio,
      owner: app.owner,
      ownerEmail: app.ownerEmail,
      status: app.status,
      qualityScore: app.qualityScore,
      testCoverage: app.testCoverage,
      automationRate: app.automationRate,
      riskLevel: app.riskLevel,
      environment: app.environment,
      lastRelease: app.lastRelease,
      description: app.description,
      techStack: app.techStack ? app.techStack.join(', ') : '',
      archived: app.archived,
    }));
  }, [applications]);

  /**
   * Handles clicking an application row to open the detail modal.
   *
   * @param {Object} app - The application object
   */
  const handleRowClick = useCallback((app) => {
    setSelectedApp(app);
    setDetailModalOpen(true);
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedApp(null);
  }, []);

  /**
   * Opens the add application modal.
   */
  const handleOpenAdd = useCallback(() => {
    setAddForm({
      name: '',
      portfolio: '',
      owner: currentUser ? currentUser.name : '',
      ownerEmail: currentUser ? currentUser.email : '',
      status: 'active',
      riskLevel: 'medium',
      environment: 'development',
      description: '',
      techStack: '',
    });
    setAddFormError(null);
    setAddModalOpen(true);
  }, [currentUser]);

  /**
   * Closes the add application modal.
   */
  const handleCloseAdd = useCallback(() => {
    setAddModalOpen(false);
    setAddFormError(null);
  }, []);

  /**
   * Handles add form field changes.
   *
   * @param {string} field - The field name
   * @param {string} value - The new value
   */
  const handleAddFormChange = useCallback((field, value) => {
    setAddForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handles submitting the add application form.
   */
  const handleAddSubmit = useCallback(async () => {
    setAddFormError(null);

    if (!addForm.name || addForm.name.trim() === '') {
      setAddFormError('Application name is required.');
      return;
    }

    if (!addForm.portfolio || addForm.portfolio.trim() === '') {
      setAddFormError('Portfolio is required.');
      return;
    }

    if (!addForm.owner || addForm.owner.trim() === '') {
      setAddFormError('Owner is required.');
      return;
    }

    setAddSubmitting(true);

    try {
      const techStackArray = addForm.techStack
        ? addForm.techStack.split(',').map((t) => t.trim()).filter((t) => t !== '')
        : [];

      const newApp = await addApplication({
        name: addForm.name.trim(),
        portfolio: addForm.portfolio.trim(),
        owner: addForm.owner.trim(),
        ownerEmail: addForm.ownerEmail.trim(),
        status: addForm.status,
        riskLevel: addForm.riskLevel,
        environment: addForm.environment,
        description: addForm.description.trim(),
        techStack: techStackArray,
      });

      try {
        logAction(
          'create',
          `Created new application: ${newApp.name} (${newApp.id}). Portfolio: ${newApp.portfolio}.`,
          'Application',
          newApp.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setAddModalOpen(false);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to create application.';
      setAddFormError(errorMessage);
    } finally {
      setAddSubmitting(false);
    }
  }, [addForm, fetchData]);

  /**
   * Opens the edit application modal.
   *
   * @param {Object} app - The application to edit
   */
  const handleOpenEdit = useCallback((app) => {
    setSelectedApp(app);
    setEditForm({
      name: app.name || '',
      portfolio: app.portfolio || '',
      owner: app.owner || '',
      ownerEmail: app.ownerEmail || '',
      status: app.status || 'active',
      riskLevel: app.riskLevel || 'medium',
      environment: app.environment || 'production',
      description: app.description || '',
      qualityScore: app.qualityScore || 0,
      testCoverage: app.testCoverage || 0,
      automationRate: app.automationRate || 0,
    });
    setEditFormError(null);
    setEditModalOpen(true);
  }, []);

  /**
   * Closes the edit application modal.
   */
  const handleCloseEdit = useCallback(() => {
    setEditModalOpen(false);
    setEditFormError(null);
  }, []);

  /**
   * Handles edit form field changes.
   *
   * @param {string} field - The field name
   * @param {string|number} value - The new value
   */
  const handleEditFormChange = useCallback((field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handles submitting the edit application form.
   */
  const handleEditSubmit = useCallback(async () => {
    setEditFormError(null);

    if (!editForm.name || editForm.name.trim() === '') {
      setEditFormError('Application name is required.');
      return;
    }

    if (!editForm.portfolio || editForm.portfolio.trim() === '') {
      setEditFormError('Portfolio is required.');
      return;
    }

    if (!editForm.owner || editForm.owner.trim() === '') {
      setEditFormError('Owner is required.');
      return;
    }

    setEditSubmitting(true);

    try {
      const updates = {
        name: editForm.name.trim(),
        portfolio: editForm.portfolio.trim(),
        owner: editForm.owner.trim(),
        ownerEmail: editForm.ownerEmail.trim(),
        status: editForm.status,
        riskLevel: editForm.riskLevel,
        environment: editForm.environment,
        description: editForm.description.trim(),
        qualityScore: Number(editForm.qualityScore) || 0,
        testCoverage: Number(editForm.testCoverage) || 0,
        automationRate: Number(editForm.automationRate) || 0,
      };

      await editApplication(selectedApp.id, updates);

      try {
        logAction(
          'update',
          `Updated application: ${updates.name} (${selectedApp.id}). Portfolio: ${updates.portfolio}.`,
          'Application',
          selectedApp.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setEditModalOpen(false);
      setDetailModalOpen(false);
      setSelectedApp(null);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to update application.';
      setEditFormError(errorMessage);
    } finally {
      setEditSubmitting(false);
    }
  }, [editForm, selectedApp, fetchData]);

  /**
   * Opens the archive confirmation modal.
   *
   * @param {Object} app - The application to archive
   */
  const handleOpenArchive = useCallback((app) => {
    setSelectedApp(app);
    setArchiveModalOpen(true);
  }, []);

  /**
   * Closes the archive confirmation modal.
   */
  const handleCloseArchive = useCallback(() => {
    setArchiveModalOpen(false);
  }, []);

  /**
   * Handles archiving an application.
   */
  const handleArchiveSubmit = useCallback(async () => {
    if (!selectedApp) {
      return;
    }

    setArchiveSubmitting(true);

    try {
      await archiveApplication(selectedApp.id);

      try {
        logAction(
          'delete',
          `Archived application: ${selectedApp.name} (${selectedApp.id}).`,
          'Application',
          selectedApp.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setArchiveModalOpen(false);
      setDetailModalOpen(false);
      setSelectedApp(null);
      fetchData();
    } catch (err) {
      // Show error in archive modal context
      setArchiveModalOpen(false);
    } finally {
      setArchiveSubmitting(false);
    }
  }, [selectedApp, fetchData]);

  /**
   * Checks if the current user can perform data entry actions.
   */
  const canEdit = useMemo(() => {
    return hasPermission('data_entry');
  }, [hasPermission]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading applications..." showLabel />
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-gray-900">
            Application Repository
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Enterprise application inventory with quality metrics and lifecycle management
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Application</span>
            </button>
          )}
          {appExportData.length > 0 && (
            <ExportButton
              data={appExportData}
              filename="application-repository"
              title="Application Repository Report"
              sheetName="Applications"
              label="Export"
              size="md"
            />
          )}
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <MetricCard
            label="Total Applications"
            value={summaryKPIs.total}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
          <MetricCard
            label="Active"
            value={summaryKPIs.activeCount}
            trend="up"
            trendValue={summaryKPIs.total > 0 ? `${Math.round((summaryKPIs.activeCount / summaryKPIs.total) * 100)}%` : '0%'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <MetricCard
            label="Avg Test Coverage"
            value={summaryKPIs.avgTestCoverage}
            trend={summaryKPIs.avgTestCoverage >= 75 ? 'up' : summaryKPIs.avgTestCoverage >= 60 ? 'neutral' : 'down'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <MetricCard
            label="Avg Automation"
            value={summaryKPIs.avgAutomationRate}
            trend={summaryKPIs.avgAutomationRate >= 60 ? 'up' : summaryKPIs.avgAutomationRate >= 40 ? 'neutral' : 'down'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <MetricCard
            label="Critical Risk"
            value={summaryKPIs.criticalRiskCount}
            trend={summaryKPIs.criticalRiskCount > 0 ? 'down' : 'up'}
            trendValue={summaryKPIs.criticalRiskCount > 0 ? 'Action needed' : 'None'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <MetricCard
            label="High Risk"
            value={summaryKPIs.highRiskCount}
            trend={summaryKPIs.highRiskCount > 5 ? 'down' : 'neutral'}
            trendValue={summaryKPIs.highRiskCount > 5 ? 'Elevated' : ''}
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
        {statusDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={statusDistributionData}
              config={pieChartConfig}
              title="Status Distribution"
              subtitle="Applications by current status"
              height={280}
              loading={false}
              emptyMessage="No status data available"
            />
          </div>
        )}

        {riskDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={riskDistributionData}
              config={pieChartConfig}
              title="Risk Distribution"
              subtitle="Applications by risk level"
              height={280}
              loading={false}
              emptyMessage="No risk data available"
            />
          </div>
        )}
      </div>

      {/* Applications Table */}
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
            All Applications
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({applications.length})
          </span>
        </div>
        <DataTable
          columns={appColumns}
          data={applications}
          pageSize={10}
          selectable={false}
          searchFields={['name', 'portfolio', 'owner', 'status', 'riskLevel', 'environment', 'description']}
          emptyMessage="No applications match the selected filters."
          rowKeyField="id"
          onRowClick={handleRowClick}
          storageKey="application-repository-table"
        />
      </div>

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{applications.filter((a) => a.status === 'active').length} Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{applications.filter((a) => a.status === 'in_development').length} In Development</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{applications.filter((a) => a.status === 'inactive').length} Inactive</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{applications.filter((a) => a.status === 'deprecated').length} Deprecated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-500" />
            <span>{applications.filter((a) => a.status === 'archived' || a.archived).length} Archived</span>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
        title={selectedApp ? selectedApp.name : ''}
        size="xl"
      >
        {selectedApp && (
          <div className="space-y-6">
            {/* Status and Risk */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedApp.status} size="md" />
              <StatusBadge status={selectedApp.riskLevel} size="md" />
              {selectedApp.archived && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 ring-1 ring-inset ring-brand-gray-300">
                  Archived
                </span>
              )}
            </div>

            {/* Description */}
            {selectedApp.description && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-sm text-brand-gray-700 leading-relaxed">
                  {selectedApp.description}
                </p>
              </div>
            )}

            {/* Quality Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Quality Score</p>
                <p className={`text-xl font-bold ${selectedApp.qualityScore >= 80 ? 'text-brand-green-600' : selectedApp.qualityScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {selectedApp.qualityScore}
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Test Coverage</p>
                <p className="text-xl font-bold text-brand-gray-900">
                  {selectedApp.testCoverage}%
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Automation Rate</p>
                <p className="text-xl font-bold text-brand-gray-900">
                  {selectedApp.automationRate}%
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Environment</p>
                <p className="text-sm font-medium text-brand-gray-900 capitalize">
                  {selectedApp.environment || '—'}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Portfolio</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedApp.portfolio}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Owner</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedApp.owner}</p>
                {selectedApp.ownerEmail && (
                  <p className="text-xs text-brand-gray-500 truncate">{selectedApp.ownerEmail}</p>
                )}
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Last Release</p>
                <p className="text-sm font-medium text-brand-gray-900">
                  {formatDisplayDate(selectedApp.lastRelease) || '—'}
                </p>
              </div>
            </div>

            {/* Tech Stack */}
            {selectedApp.techStack && selectedApp.techStack.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Tech Stack
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedApp.techStack.map((tech, index) => (
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
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-600">
              {selectedApp.createdAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Created: {formatDisplayDate(selectedApp.createdAt)}</span>
                </div>
              )}
              {selectedApp.updatedAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Updated: {formatDisplayDate(selectedApp.updatedAt)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {canEdit && !selectedApp.archived && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => handleOpenEdit(selectedApp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleOpenArchive(selectedApp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span>Archive</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Application Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={handleCloseAdd}
        title="New Application"
        size="lg"
      >
        <div className="space-y-4">
          {addFormError && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{addFormError}</p>
            </div>
          )}

          <div>
            <label htmlFor="app-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Application Name <span className="text-red-500">*</span>
            </label>
            <input
              id="app-name"
              type="text"
              value={addForm.name}
              onChange={(e) => handleAddFormChange('name', e.target.value)}
              placeholder="Enter application name"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              disabled={addSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="app-portfolio" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Portfolio <span className="text-red-500">*</span>
              </label>
              <select
                id="app-portfolio"
                value={addForm.portfolio}
                onChange={(e) => handleAddFormChange('portfolio', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={addSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="">Select portfolio...</option>
                {distinctPortfolios.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="app-owner" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Owner <span className="text-red-500">*</span>
              </label>
              <input
                id="app-owner"
                type="text"
                value={addForm.owner}
                onChange={(e) => handleAddFormChange('owner', e.target.value)}
                placeholder="Owner name"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={addSubmitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="app-owner-email" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Owner Email
            </label>
            <input
              id="app-owner-email"
              type="email"
              value={addForm.ownerEmail}
              onChange={(e) => handleAddFormChange('ownerEmail', e.target.value)}
              placeholder="owner@kp-etsip.gov"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              disabled={addSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="app-status" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Status
              </label>
              <select
                id="app-status"
                value={addForm.status}
                onChange={(e) => handleAddFormChange('status', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={addSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="active">Active</option>
                <option value="in_development">In Development</option>
                <option value="inactive">Inactive</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </div>

            <div>
              <label htmlFor="app-risk" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Risk Level
              </label>
              <select
                id="app-risk"
                value={addForm.riskLevel}
                onChange={(e) => handleAddFormChange('riskLevel', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={addSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label htmlFor="app-env" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Environment
              </label>
              <select
                id="app-env"
                value={addForm.environment}
                onChange={(e) => handleAddFormChange('environment', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={addSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="uat">UAT</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="app-techstack" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Tech Stack
            </label>
            <input
              id="app-techstack"
              type="text"
              value={addForm.techStack}
              onChange={(e) => handleAddFormChange('techStack', e.target.value)}
              placeholder="React, Node.js, PostgreSQL (comma-separated)"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              disabled={addSubmitting}
            />
          </div>

          <div>
            <label htmlFor="app-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="app-description"
              value={addForm.description}
              onChange={(e) => handleAddFormChange('description', e.target.value)}
              placeholder="Brief description of the application"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
              disabled={addSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-gray-200">
            <button
              onClick={handleCloseAdd}
              disabled={addSubmitting}
              className="px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSubmit}
              disabled={addSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Application</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Application Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={handleCloseEdit}
        title={selectedApp ? `Edit: ${selectedApp.name}` : 'Edit Application'}
        size="lg"
      >
        {selectedApp && (
          <div className="space-y-4">
            {editFormError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{editFormError}</p>
              </div>
            )}

            <div>
              <label htmlFor="edit-app-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Application Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-app-name"
                type="text"
                value={editForm.name}
                onChange={(e) => handleEditFormChange('name', e.target.value)}
                placeholder="Enter application name"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={editSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-app-portfolio" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Portfolio <span className="text-red-500">*</span>
                </label>
                <select
                  id="edit-app-portfolio"
                  value={editForm.portfolio}
                  onChange={(e) => handleEditFormChange('portfolio', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                  disabled={editSubmitting}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em',
                  }}
                >
                  <option value="">Select portfolio...</option>
                  {distinctPortfolios.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-app-owner" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Owner <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-app-owner"
                  type="text"
                  value={editForm.owner}
                  onChange={(e) => handleEditFormChange('owner', e.target.value)}
                  placeholder="Owner name"
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  disabled={editSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="edit-app-owner-email" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Owner Email
              </label>
              <input
                id="edit-app-owner-email"
                type="email"
                value={editForm.ownerEmail}
                onChange={(e) => handleEditFormChange('ownerEmail', e.target.value)}
                placeholder="owner@kp-etsip.gov"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={editSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="edit-app-status" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="edit-app-status"
                  value={editForm.status}
                  onChange={(e) => handleEditFormChange('status', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                  disabled={editSubmitting}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em',
                  }}
                >
                  <option value="active">Active</option>
                  <option value="in_development">In Development</option>
                  <option value="inactive">Inactive</option>
                  <option value="deprecated">Deprecated</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-app-risk" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Risk Level
                </label>
                <select
                  id="edit-app-risk"
                  value={editForm.riskLevel}
                  onChange={(e) => handleEditFormChange('riskLevel', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                  disabled={editSubmitting}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em',
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-app-env" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Environment
                </label>
                <select
                  id="edit-app-env"
                  value={editForm.environment}
                  onChange={(e) => handleEditFormChange('environment', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                  disabled={editSubmitting}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em',
                  }}
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="uat">UAT</option>
                  <option value="production">Production</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="edit-app-quality" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Quality Score (0-100)
                </label>
                <input
                  id="edit-app-quality"
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.qualityScore}
                  onChange={(e) => handleEditFormChange('qualityScore', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  disabled={editSubmitting}
                />
              </div>

              <div>
                <label htmlFor="edit-app-coverage" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Test Coverage (0-100)
                </label>
                <input
                  id="edit-app-coverage"
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.testCoverage}
                  onChange={(e) => handleEditFormChange('testCoverage', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  disabled={editSubmitting}
                />
              </div>

              <div>
                <label htmlFor="edit-app-automation" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Automation Rate (0-100)
                </label>
                <input
                  id="edit-app-automation"
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.automationRate}
                  onChange={(e) => handleEditFormChange('automationRate', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  disabled={editSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="edit-app-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="edit-app-description"
                value={editForm.description}
                onChange={(e) => handleEditFormChange('description', e.target.value)}
                placeholder="Brief description of the application"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
                disabled={editSubmitting}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-gray-200">
              <button
                onClick={handleCloseEdit}
                disabled={editSubmitting}
                className="px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={editSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={archiveModalOpen}
        onClose={handleCloseArchive}
        title="Archive Application"
        size="sm"
      >
        {selectedApp && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-brand-gray-700">
                  Are you sure you want to archive <strong>{selectedApp.name}</strong>? This will mark the application as archived and it will no longer appear in the active inventory.
                </p>
                <p className="text-xs text-brand-gray-500 mt-2">
                  This action can be reversed by an administrator.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-gray-200">
              <button
                onClick={handleCloseArchive}
                disabled={archiveSubmitting}
                className="px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveSubmit}
                disabled={archiveSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {archiveSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <span>Archive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
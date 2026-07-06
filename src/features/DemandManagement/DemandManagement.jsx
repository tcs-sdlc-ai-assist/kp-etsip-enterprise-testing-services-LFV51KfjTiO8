/**
 * DemandManagement Component
 * Demand Management screen (FR-004): displays demand items in DataTable with status workflow
 * (New→InReview→Approved→Assigned→InProgress→Closed). Supports add, prioritize, approve,
 * assign, track, close actions via modals. Uses RepositoryService and AuditLogService.
 * Filter by status/priority/portfolio.
 * @module DemandManagement
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getDemandItems,
  addDemandItem,
  updateDemandItem,
  closeDemandItem,
  addDemandComment,
  getDemandItemById,
  getDistinctDemandStatuses,
  getDistinctDemandPriorities,
  getDistinctDemandPortfolios,
  getDemandCountByStatus,
  getDemandCountByPriority,
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
 * Status workflow order for demand items.
 * @type {string[]}
 */
const STATUS_WORKFLOW = ['New', 'InReview', 'Approved', 'Assigned', 'InProgress', 'Closed'];

/**
 * Status color mapping for charts.
 * @type {Object.<string, string>}
 */
const STATUS_COLORS = {
  New: '#939ba3',
  InReview: '#5b9ae3',
  Approved: '#0069cc',
  Assigned: '#1a5fb4',
  InProgress: '#f59e0b',
  Closed: '#0f9d58',
};

/**
 * Priority color mapping for charts.
 * @type {Object.<string, string>}
 */
const PRIORITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#0f9d58',
};

/**
 * Returns the next valid statuses for a given current status in the workflow.
 *
 * @param {string} currentStatus - The current demand item status
 * @returns {string[]} Array of valid next statuses
 */
function getNextStatuses(currentStatus) {
  const currentIndex = STATUS_WORKFLOW.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex >= STATUS_WORKFLOW.length - 1) {
    return [];
  }
  return STATUS_WORKFLOW.slice(currentIndex + 1);
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
 * DemandManagement page component.
 * Displays demand items with status workflow, filtering, CRUD actions via modals,
 * and summary KPIs with charts.
 *
 * @returns {React.ReactElement} The demand management page
 */
export default function DemandManagement() {
  const { currentUser, role, hasPermission } = useAuth();

  const [demandItems, setDemandItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    status: '',
    priority: '',
    portfolio: '',
  });

  // Distinct values for filter dropdowns
  const [distinctStatuses, setDistinctStatuses] = useState([]);
  const [distinctPriorities, setDistinctPriorities] = useState([]);
  const [distinctPortfolios, setDistinctPortfolios] = useState([]);

  // Modal states
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);

  // Form states
  const [addForm, setAddForm] = useState({
    title: '',
    description: '',
    requestor: '',
    requestorEmail: '',
    priority: 'medium',
    portfolio: '',
    dueDate: '',
  });
  const [addFormError, setAddFormError] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [statusForm, setStatusForm] = useState({
    newStatus: '',
    assignee: '',
    assigneeEmail: '',
  });
  const [statusFormError, setStatusFormError] = useState(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [commentForm, setCommentForm] = useState({
    text: '',
  });
  const [commentFormError, setCommentFormError] = useState(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  /**
   * Loads distinct filter values.
   */
  useEffect(() => {
    try {
      setDistinctStatuses(getDistinctDemandStatuses());
      setDistinctPriorities(getDistinctDemandPriorities());
      setDistinctPortfolios(getDistinctDemandPortfolios());
    } catch {
      // Ignore errors loading distinct values
    }
  }, []);

  /**
   * Fetches demand items based on current filters.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {};

      if (filterValues.status) {
        filters.status = filterValues.status;
      }

      if (filterValues.priority) {
        filters.priority = filterValues.priority;
      }

      if (filterValues.portfolio) {
        filters.portfolio = filterValues.portfolio;
      }

      const result = await getDemandItems(filters);
      setDemandItems(result.demandItems || []);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load demand items.';
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
      priority: '',
      portfolio: '',
    });
  }, []);

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
        key: 'priority',
        label: 'Priority',
        placeholder: 'All Priorities',
        options: distinctPriorities.map((p) => ({
          value: p,
          label: p.charAt(0).toUpperCase() + p.slice(1),
        })),
      },
      {
        key: 'portfolio',
        label: 'Portfolio',
        placeholder: 'All Portfolios',
        options: distinctPortfolios.map((p) => ({
          value: p,
          label: p,
        })),
      },
    ];
  }, [distinctStatuses, distinctPriorities, distinctPortfolios]);

  /**
   * Summary KPIs computed from all demand items.
   */
  const summaryKPIs = useMemo(() => {
    if (!demandItems || demandItems.length === 0) {
      return null;
    }

    const total = demandItems.length;
    let openCount = 0;
    let closedCount = 0;
    let criticalCount = 0;
    let overdueCount = 0;
    const now = new Date().getTime();

    for (const item of demandItems) {
      if (item.status === 'Closed') {
        closedCount++;
      } else {
        openCount++;
      }

      if (item.priority === 'critical') {
        criticalCount++;
      }

      if (item.dueDate && item.status !== 'Closed') {
        const dueTime = new Date(item.dueDate).getTime();
        if (!isNaN(dueTime) && dueTime < now) {
          overdueCount++;
        }
      }
    }

    return {
      total,
      openCount,
      closedCount,
      criticalCount,
      overdueCount,
    };
  }, [demandItems]);

  /**
   * Status distribution chart data.
   */
  const statusDistributionData = useMemo(() => {
    const counts = {};
    for (const item of demandItems) {
      const status = item.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: STATUS_COLORS[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [demandItems]);

  /**
   * Priority distribution chart data.
   */
  const priorityDistributionData = useMemo(() => {
    const counts = {};
    for (const item of demandItems) {
      const priority = item.priority || 'unknown';
      counts[priority] = (counts[priority] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([priority, count]) => ({
        name: priority.charAt(0).toUpperCase() + priority.slice(1),
        value: count,
        color: PRIORITY_COLORS[priority] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [demandItems]);

  /**
   * Status distribution chart config.
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
   * Demand table columns.
   */
  const demandColumns = useMemo(() => {
    return [
      {
        key: 'title',
        label: 'Title',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900 line-clamp-2">{value}</span>
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
        key: 'requestor',
        label: 'Requestor',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'assignee',
        label: 'Assignee',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value || '—'}</span>
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
        key: 'createdDate',
        label: 'Created',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-500 whitespace-nowrap">
            {formatDisplayDate(value)}
          </span>
        ),
      },
      {
        key: 'dueDate',
        label: 'Due Date',
        sortable: true,
        render: (value, row) => {
          if (!value) {
            return <span className="text-xs text-brand-gray-400">—</span>;
          }
          const isOverdue = row.status !== 'Closed' && new Date(value).getTime() < new Date().getTime();
          return (
            <span className={`text-xs whitespace-nowrap ${isOverdue ? 'text-red-600 font-medium' : 'text-brand-gray-500'}`}>
              {formatDisplayDate(value)}
              {isOverdue && (
                <span className="ml-1 text-[10px] text-red-500">Overdue</span>
              )}
            </span>
          );
        },
      },
    ];
  }, []);

  /**
   * Export data for the demand table.
   */
  const demandExportData = useMemo(() => {
    return demandItems.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      requestor: item.requestor,
      requestorEmail: item.requestorEmail,
      priority: item.priority,
      status: item.status,
      assignee: item.assignee,
      assigneeEmail: item.assigneeEmail,
      portfolio: item.portfolio,
      createdDate: item.createdDate,
      dueDate: item.dueDate,
      approver: item.approver,
      commentCount: item.comments ? item.comments.length : 0,
    }));
  }, [demandItems]);

  /**
   * Handles clicking a demand item row to open the detail modal.
   *
   * @param {Object} item - The demand item object
   */
  const handleRowClick = useCallback((item) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedItem(null);
  }, []);

  /**
   * Opens the add demand item modal.
   */
  const handleOpenAdd = useCallback(() => {
    setAddForm({
      title: '',
      description: '',
      requestor: currentUser ? currentUser.name : '',
      requestorEmail: currentUser ? currentUser.email : '',
      priority: 'medium',
      portfolio: '',
      dueDate: '',
    });
    setAddFormError(null);
    setAddModalOpen(true);
  }, [currentUser]);

  /**
   * Closes the add demand item modal.
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
   * Handles submitting the add demand item form.
   */
  const handleAddSubmit = useCallback(async () => {
    setAddFormError(null);

    if (!addForm.title || addForm.title.trim() === '') {
      setAddFormError('Title is required.');
      return;
    }

    if (!addForm.description || addForm.description.trim() === '') {
      setAddFormError('Description is required.');
      return;
    }

    if (!addForm.requestor || addForm.requestor.trim() === '') {
      setAddFormError('Requestor is required.');
      return;
    }

    setAddSubmitting(true);

    try {
      const newItem = await addDemandItem({
        title: addForm.title.trim(),
        description: addForm.description.trim(),
        requestor: addForm.requestor.trim(),
        requestorEmail: addForm.requestorEmail.trim(),
        priority: addForm.priority,
        portfolio: addForm.portfolio.trim(),
        dueDate: addForm.dueDate || '',
      });

      try {
        logAction(
          'create',
          `Created new demand item: ${newItem.title} (${newItem.id}). Priority: ${newItem.priority}.`,
          'DemandItem',
          newItem.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setAddModalOpen(false);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to create demand item.';
      setAddFormError(errorMessage);
    } finally {
      setAddSubmitting(false);
    }
  }, [addForm, fetchData]);

  /**
   * Opens the status change modal for a demand item.
   *
   * @param {Object} item - The demand item
   */
  const handleOpenStatusChange = useCallback((item) => {
    const nextStatuses = getNextStatuses(item.status);
    setSelectedItem(item);
    setStatusForm({
      newStatus: nextStatuses.length > 0 ? nextStatuses[0] : '',
      assignee: item.assignee || '',
      assigneeEmail: item.assigneeEmail || '',
    });
    setStatusFormError(null);
    setStatusModalOpen(true);
  }, []);

  /**
   * Closes the status change modal.
   */
  const handleCloseStatusChange = useCallback(() => {
    setStatusModalOpen(false);
    setStatusFormError(null);
  }, []);

  /**
   * Handles status form field changes.
   *
   * @param {string} field - The field name
   * @param {string} value - The new value
   */
  const handleStatusFormChange = useCallback((field, value) => {
    setStatusForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handles submitting the status change form.
   */
  const handleStatusSubmit = useCallback(async () => {
    setStatusFormError(null);

    if (!statusForm.newStatus) {
      setStatusFormError('Please select a new status.');
      return;
    }

    if (statusForm.newStatus === 'Assigned' && (!statusForm.assignee || statusForm.assignee.trim() === '')) {
      setStatusFormError('Assignee is required when setting status to Assigned.');
      return;
    }

    setStatusSubmitting(true);

    try {
      const updates = {
        status: statusForm.newStatus,
      };

      if (statusForm.assignee && statusForm.assignee.trim() !== '') {
        updates.assignee = statusForm.assignee.trim();
        updates.assigneeEmail = statusForm.assigneeEmail.trim();
      }

      if (statusForm.newStatus === 'Approved' && currentUser) {
        updates.approver = currentUser.name;
        updates.approverEmail = currentUser.email;
      }

      if (statusForm.newStatus === 'Closed') {
        await closeDemandItem(selectedItem.id);
      } else {
        await updateDemandItem(selectedItem.id, updates);
      }

      try {
        const actionType = statusForm.newStatus === 'Approved' ? 'approve' :
          statusForm.newStatus === 'Closed' ? 'update' : 'update';
        logAction(
          actionType,
          `Demand item "${selectedItem.title}" (${selectedItem.id}) status changed from ${selectedItem.status} to ${statusForm.newStatus}.`,
          'DemandItem',
          selectedItem.id,
          {
            status: 'success',
            previousValue: selectedItem.status,
            newValue: statusForm.newStatus,
          }
        );
      } catch {
        // Ignore audit log errors
      }

      setStatusModalOpen(false);
      setDetailModalOpen(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to update demand item status.';
      setStatusFormError(errorMessage);
    } finally {
      setStatusSubmitting(false);
    }
  }, [statusForm, selectedItem, currentUser, fetchData]);

  /**
   * Opens the comment modal for a demand item.
   *
   * @param {Object} item - The demand item
   */
  const handleOpenComment = useCallback((item) => {
    setSelectedItem(item);
    setCommentForm({ text: '' });
    setCommentFormError(null);
    setCommentModalOpen(true);
  }, []);

  /**
   * Closes the comment modal.
   */
  const handleCloseComment = useCallback(() => {
    setCommentModalOpen(false);
    setCommentFormError(null);
  }, []);

  /**
   * Handles submitting the comment form.
   */
  const handleCommentSubmit = useCallback(async () => {
    setCommentFormError(null);

    if (!commentForm.text || commentForm.text.trim() === '') {
      setCommentFormError('Comment text is required.');
      return;
    }

    setCommentSubmitting(true);

    try {
      const author = currentUser ? currentUser.name : 'System';

      await addDemandComment(selectedItem.id, {
        author,
        text: commentForm.text.trim(),
      });

      try {
        logAction(
          'update',
          `Comment added to demand item "${selectedItem.title}" (${selectedItem.id}) by ${author}.`,
          'DemandItem',
          selectedItem.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      // Refresh the selected item
      const refreshedItem = getDemandItemById(selectedItem.id);
      if (refreshedItem) {
        setSelectedItem(refreshedItem);
      }

      setCommentModalOpen(false);
      setCommentForm({ text: '' });
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to add comment.';
      setCommentFormError(errorMessage);
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentForm, selectedItem, currentUser, fetchData]);

  /**
   * Checks if the current user can perform approval actions.
   */
  const canApprove = useMemo(() => {
    return hasPermission('approvals');
  }, [hasPermission]);

  /**
   * Checks if the current user can perform data entry actions.
   */
  const canEdit = useMemo(() => {
    return hasPermission('data_entry');
  }, [hasPermission]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading demand items..." showLabel />
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
            Demand Management
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Track, prioritize, and manage demand items across all portfolios
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
              <span>New Demand</span>
            </button>
          )}
          {demandExportData.length > 0 && (
            <ExportButton
              data={demandExportData}
              filename="demand-management"
              title="Demand Management Report"
              sheetName="Demand Items"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            label="Total Demands"
            value={summaryKPIs.total}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <MetricCard
            label="Open"
            value={summaryKPIs.openCount}
            trend={summaryKPIs.openCount > 20 ? 'down' : 'neutral'}
            trendValue={summaryKPIs.openCount > 20 ? 'High' : ''}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Closed"
            value={summaryKPIs.closedCount}
            trend="up"
            trendValue={summaryKPIs.total > 0 ? `${Math.round((summaryKPIs.closedCount / summaryKPIs.total) * 100)}%` : '0%'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Critical"
            value={summaryKPIs.criticalCount}
            trend={summaryKPIs.criticalCount > 5 ? 'down' : 'neutral'}
            trendValue={summaryKPIs.criticalCount > 5 ? 'Needs attention' : ''}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <MetricCard
            label="Overdue"
            value={summaryKPIs.overdueCount}
            trend={summaryKPIs.overdueCount > 0 ? 'down' : 'up'}
            trendValue={summaryKPIs.overdueCount > 0 ? 'Action needed' : 'On track'}
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
              subtitle="Demand items by current status"
              height={280}
              loading={false}
              emptyMessage="No status data available"
            />
          </div>
        )}

        {priorityDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={priorityDistributionData}
              config={pieChartConfig}
              title="Priority Distribution"
              subtitle="Demand items by priority level"
              height={280}
              loading={false}
              emptyMessage="No priority data available"
            />
          </div>
        )}
      </div>

      {/* Demand Items Table */}
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
            All Demand Items
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({demandItems.length})
          </span>
        </div>
        <DataTable
          columns={demandColumns}
          data={demandItems}
          pageSize={10}
          selectable={false}
          searchFields={['title', 'requestor', 'assignee', 'portfolio', 'status', 'priority']}
          emptyMessage="No demand items match the selected filters."
          rowKeyField="id"
          onRowClick={handleRowClick}
          storageKey="demand-management-table"
        />
      </div>

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{demandItems.filter((d) => d.status === 'New').length} New</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-blue-400" />
            <span>{demandItems.filter((d) => d.status === 'InReview').length} In Review</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{demandItems.filter((d) => d.status === 'Approved').length} Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-blue-500" />
            <span>{demandItems.filter((d) => d.status === 'Assigned').length} Assigned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{demandItems.filter((d) => d.status === 'InProgress').length} In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{demandItems.filter((d) => d.status === 'Closed').length} Closed</span>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
        title={selectedItem ? selectedItem.title : ''}
        size="xl"
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* Status and Priority */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedItem.status} size="md" />
              <StatusBadge status={selectedItem.priority} size="md" />
              {selectedItem.dueDate && selectedItem.status !== 'Closed' && new Date(selectedItem.dueDate).getTime() < new Date().getTime() && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-300">
                  Overdue
                </span>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                Description
              </h3>
              <p className="text-sm text-brand-gray-700 leading-relaxed">
                {selectedItem.description}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Requestor</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedItem.requestor}</p>
                {selectedItem.requestorEmail && (
                  <p className="text-xs text-brand-gray-500 truncate">{selectedItem.requestorEmail}</p>
                )}
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Assignee</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedItem.assignee || '—'}</p>
                {selectedItem.assigneeEmail && (
                  <p className="text-xs text-brand-gray-500 truncate">{selectedItem.assigneeEmail}</p>
                )}
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Portfolio</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedItem.portfolio || '—'}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Approver</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedItem.approver || '—'}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-600">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Created: {formatDisplayDate(selectedItem.createdDate)}</span>
              </div>
              {selectedItem.dueDate && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Due: {formatDisplayDate(selectedItem.dueDate)}</span>
                </div>
              )}
            </div>

            {/* Status Workflow */}
            <div>
              <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                Workflow
              </h3>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {STATUS_WORKFLOW.map((status, index) => {
                  const currentIndex = STATUS_WORKFLOW.indexOf(selectedItem.status);
                  const isCompleted = index < currentIndex;
                  const isCurrent = index === currentIndex;
                  const isFuture = index > currentIndex;

                  return (
                    <div key={status} className="flex items-center">
                      <div
                        className={`flex items-center justify-center min-w-[80px] px-2 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                          isCompleted
                            ? 'bg-brand-green-50 text-brand-green-700 ring-1 ring-inset ring-brand-green-300'
                            : isCurrent
                            ? 'bg-brand-500 text-white'
                            : 'bg-brand-gray-100 text-brand-gray-500'
                        }`}
                      >
                        {isCompleted && (
                          <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {formatStatusLabel(status)}
                      </div>
                      {index < STATUS_WORKFLOW.length - 1 && (
                        <svg
                          className={`w-4 h-4 mx-0.5 flex-shrink-0 ${isCompleted ? 'text-brand-green-400' : 'text-brand-gray-300'}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            {selectedItem.status !== 'Closed' && (canEdit || canApprove) && (
              <div className="flex flex-wrap items-center gap-2">
                {getNextStatuses(selectedItem.status).length > 0 && (
                  <button
                    onClick={() => handleOpenStatusChange(selectedItem)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span>Change Status</span>
                  </button>
                )}
                <button
                  onClick={() => handleOpenComment(selectedItem)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Add Comment</span>
                </button>
              </div>
            )}

            {/* Comments */}
            {selectedItem.comments && selectedItem.comments.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Comments ({selectedItem.comments.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedItem.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-brand-gray-50 rounded-lg p-3 border border-brand-gray-200"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-brand-gray-900">
                          {comment.author}
                        </span>
                        <span className="text-[10px] text-brand-gray-400">
                          {formatDisplayDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-brand-gray-700 leading-relaxed">
                        {comment.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Demand Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={handleCloseAdd}
        title="New Demand Item"
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
            <label htmlFor="demand-title" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="demand-title"
              type="text"
              value={addForm.title}
              onChange={(e) => handleAddFormChange('title', e.target.value)}
              placeholder="Enter demand item title"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              disabled={addSubmitting}
            />
          </div>

          <div>
            <label htmlFor="demand-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="demand-description"
              value={addForm.description}
              onChange={(e) => handleAddFormChange('description', e.target.value)}
              placeholder="Describe the demand in detail"
              rows={4}
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
              disabled={addSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="demand-requestor" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Requestor <span className="text-red-500">*</span>
              </label>
              <input
                id="demand-requestor"
                type="text"
                value={addForm.requestor}
                onChange={(e) => handleAddFormChange('requestor', e.target.value)}
                placeholder="Requestor name"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={addSubmitting}
              />
            </div>

            <div>
              <label htmlFor="demand-requestor-email" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Requestor Email
              </label>
              <input
                id="demand-requestor-email"
                type="email"
                value={addForm.requestorEmail}
                onChange={(e) => handleAddFormChange('requestorEmail', e.target.value)}
                placeholder="requestor@kp-etsip.gov"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={addSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="demand-priority" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Priority
              </label>
              <select
                id="demand-priority"
                value={addForm.priority}
                onChange={(e) => handleAddFormChange('priority', e.target.value)}
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
              <label htmlFor="demand-portfolio" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Portfolio
              </label>
              <select
                id="demand-portfolio"
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
              <label htmlFor="demand-due-date" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Due Date
              </label>
              <input
                id="demand-due-date"
                type="date"
                value={addForm.dueDate}
                onChange={(e) => handleAddFormChange('dueDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={addSubmitting}
              />
            </div>
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
                  <span>Create Demand</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={handleCloseStatusChange}
        title={selectedItem ? `Update Status: ${selectedItem.title}` : 'Update Status'}
        size="md"
      >
        {selectedItem && (
          <div className="space-y-4">
            {statusFormError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{statusFormError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm text-brand-gray-600">
              <span>Current Status:</span>
              <StatusBadge status={selectedItem.status} size="md" />
            </div>

            <div>
              <label htmlFor="status-new" className="block text-sm font-medium text-brand-gray-700 mb-1">
                New Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status-new"
                value={statusForm.newStatus}
                onChange={(e) => handleStatusFormChange('newStatus', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={statusSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                {getNextStatuses(selectedItem.status).map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            {(statusForm.newStatus === 'Assigned' || statusForm.newStatus === 'InProgress') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="status-assignee" className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Assignee {statusForm.newStatus === 'Assigned' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id="status-assignee"
                    type="text"
                    value={statusForm.assignee}
                    onChange={(e) => handleStatusFormChange('assignee', e.target.value)}
                    placeholder="Assignee name"
                    className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    disabled={statusSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="status-assignee-email" className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Assignee Email
                  </label>
                  <input
                    id="status-assignee-email"
                    type="email"
                    value={statusForm.assigneeEmail}
                    onChange={(e) => handleStatusFormChange('assigneeEmail', e.target.value)}
                    placeholder="assignee@kp-etsip.gov"
                    className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    disabled={statusSubmitting}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-gray-200">
              <button
                onClick={handleCloseStatusChange}
                disabled={statusSubmitting}
                className="px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusSubmit}
                disabled={statusSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {statusSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Update Status</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Comment Modal */}
      <Modal
        isOpen={commentModalOpen}
        onClose={handleCloseComment}
        title={selectedItem ? `Add Comment: ${selectedItem.title}` : 'Add Comment'}
        size="md"
      >
        {selectedItem && (
          <div className="space-y-4">
            {commentFormError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{commentFormError}</p>
              </div>
            )}

            <div>
              <label htmlFor="comment-text" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Comment <span className="text-red-500">*</span>
              </label>
              <textarea
                id="comment-text"
                value={commentForm.text}
                onChange={(e) => setCommentForm({ text: e.target.value })}
                placeholder="Enter your comment..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
                disabled={commentSubmitting}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-gray-200">
              <button
                onClick={handleCloseComment}
                disabled={commentSubmitting}
                className="px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={commentSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {commentSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Add Comment</span>
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
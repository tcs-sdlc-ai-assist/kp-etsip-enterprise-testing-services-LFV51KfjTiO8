/**
 * UserRepository Component
 * User Repository screen (FR-026): displays user list in DataTable with search,
 * filter (role/status/portfolio), add/edit/deactivate user modals, access review panel,
 * and audit log for user changes. Uses userManager service. Role-gated for admin personas.
 * Logs actions via AuditLogService.
 * @module UserRepository
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getUsers,
  getUserById,
  addUser,
  updateUser,
  deactivateUser,
  suspendUser,
  reactivateUser,
  reviewAccess,
  syncUserAccess,
  getUserStatusSummary,
  getUserCountByRole,
} from '../../shared/services/userManager.js';
import { logAction } from '../../shared/services/auditLogService.js';
import { getRoles } from '../../shared/services/roles.js';
import { ROLES, ROLE_LABELS, PERMISSIONS } from '../../shared/constants.js';
import MetricCard from '../../shared/components/MetricCard.jsx';
import ChartWrapper from '../../shared/components/ChartWrapper.jsx';
import DataTable from '../../shared/components/DataTable.jsx';
import FilterBar from '../../shared/components/FilterBar.jsx';
import ExportButton from '../../shared/components/ExportButton.jsx';
import LoadingSpinner from '../../shared/components/LoadingSpinner.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import EmptyState from '../../shared/components/EmptyState.jsx';
import Modal from '../../shared/components/Modal.jsx';
import AuditLogPanel from '../../shared/components/AuditLogPanel.jsx';

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
 * Returns a human-readable label for a role key.
 *
 * @param {string} role - The role key
 * @returns {string} Human-readable role label
 */
function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || 'Unknown';
}

/**
 * Returns status badge color classes for a user status.
 *
 * @param {string} status - The user status
 * @returns {{bg: string, text: string}} Tailwind CSS classes
 */
function getStatusClasses(status) {
  switch (status) {
    case 'active':
      return { bg: 'bg-brand-green-50', text: 'text-brand-green-700' };
    case 'inactive':
      return { bg: 'bg-brand-gray-100', text: 'text-brand-gray-600' };
    case 'suspended':
      return { bg: 'bg-red-50', text: 'text-red-700' };
    default:
      return { bg: 'bg-brand-gray-100', text: 'text-brand-gray-600' };
  }
}

/**
 * Status color mapping for charts.
 * @type {Object.<string, string>}
 */
const STATUS_COLORS = {
  active: '#0f9d58',
  inactive: '#939ba3',
  suspended: '#ef4444',
};

/**
 * UserRepository page component.
 * Displays user list with filtering, CRUD actions via modals, access review panel,
 * and audit log for user changes.
 *
 * @returns {React.ReactElement} The user repository page
 */
export default function UserRepository() {
  const { currentUser, role, hasPermission } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    role: '',
    status: '',
    portfolio: '',
  });

  // Active tab
  const [activeTab, setActiveTab] = useState('users');

  // Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [accessReviewModalOpen, setAccessReviewModalOpen] = useState(false);

  // Access review state
  const [accessReviewResult, setAccessReviewResult] = useState(null);
  const [accessReviewLoading, setAccessReviewLoading] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    role: 'viewer',
    portfolio: '',
    status: 'active',
  });
  const [addFormError, setAddFormError] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'viewer',
    portfolio: '',
    status: 'active',
  });
  const [editFormError, setEditFormError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Deactivate state
  const [deactivateSubmitting, setDeactivateSubmitting] = useState(false);
  const [deactivateAction, setDeactivateAction] = useState('deactivate');

  /**
   * Fetches users data.
   */
  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      const allUsers = getUsers();
      setUsers(allUsers || []);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load users.';
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
      role: '',
      status: '',
      portfolio: '',
    });
  }, []);

  /**
   * Distinct roles for filter dropdown.
   */
  const distinctRoles = useMemo(() => {
    const roles = new Set();
    for (const user of users) {
      if (user.role) {
        roles.add(user.role);
      }
    }
    return Array.from(roles).sort();
  }, [users]);

  /**
   * Distinct statuses for filter dropdown.
   */
  const distinctStatuses = useMemo(() => {
    const statuses = new Set();
    for (const user of users) {
      if (user.status) {
        statuses.add(user.status);
      }
    }
    return Array.from(statuses).sort();
  }, [users]);

  /**
   * Distinct portfolios for filter dropdown.
   */
  const distinctPortfolios = useMemo(() => {
    const portfolios = new Set();
    for (const user of users) {
      if (user.portfolio) {
        portfolios.add(user.portfolio);
      }
    }
    return Array.from(portfolios).sort();
  }, [users]);

  /**
   * All available roles for add/edit forms.
   */
  const allRoles = useMemo(() => {
    return Object.entries(ROLE_LABELS).map(([key, label]) => ({
      value: key,
      label,
    }));
  }, []);

  /**
   * Builds the filter configuration for the FilterBar.
   */
  const filterConfig = useMemo(() => {
    return [
      {
        key: 'role',
        label: 'Role',
        placeholder: 'All Roles',
        options: distinctRoles.map((r) => ({
          value: r,
          label: getRoleLabel(r),
        })),
      },
      {
        key: 'status',
        label: 'Status',
        placeholder: 'All Statuses',
        options: distinctStatuses.map((s) => ({
          value: s,
          label: s.charAt(0).toUpperCase() + s.slice(1),
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
  }, [distinctRoles, distinctStatuses, distinctPortfolios]);

  /**
   * Filtered users based on current filter values.
   */
  const filteredUsers = useMemo(() => {
    let result = users;

    if (filterValues.role) {
      result = result.filter((u) => u.role === filterValues.role);
    }

    if (filterValues.status) {
      result = result.filter((u) => u.status === filterValues.status);
    }

    if (filterValues.portfolio) {
      result = result.filter((u) => u.portfolio === filterValues.portfolio);
    }

    return result;
  }, [users, filterValues]);

  /**
   * Summary KPIs computed from all users.
   */
  const summaryKPIs = useMemo(() => {
    if (!users || users.length === 0) {
      return null;
    }

    const summary = getUserStatusSummary();
    const roleCount = getUserCountByRole();
    const uniqueRoles = Object.keys(roleCount).length;

    return {
      total: summary.total,
      active: summary.active,
      inactive: summary.inactive,
      suspended: summary.suspended,
      uniqueRoles,
    };
  }, [users]);

  /**
   * Status distribution chart data.
   */
  const statusDistributionData = useMemo(() => {
    if (!users || users.length === 0) {
      return [];
    }

    const counts = {};
    for (const user of users) {
      const status = user.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        color: STATUS_COLORS[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [users]);

  /**
   * Role distribution chart data.
   */
  const roleDistributionData = useMemo(() => {
    if (!users || users.length === 0) {
      return [];
    }

    const counts = {};
    for (const user of users) {
      const r = user.role || 'unknown';
      counts[r] = (counts[r] || 0) + 1;
    }

    const roleColors = [
      '#0069cc', '#0f9d58', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1',
      '#84cc16', '#a855f7',
    ];

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([r, count], index) => ({
        name: getRoleLabel(r).length > 18 ? getRoleLabel(r).substring(0, 15) + '...' : getRoleLabel(r),
        value: count,
        color: roleColors[index % roleColors.length],
      }))
      .filter((item) => item.value > 0);
  }, [users]);

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
   * User table columns.
   */
  const userColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900 line-clamp-1">{value}</span>
        ),
      },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-600 truncate max-w-[200px] block">{value}</span>
        ),
      },
      {
        key: 'role',
        label: 'Role',
        sortable: true,
        render: (value) => (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
            {getRoleLabel(value)}
          </span>
        ),
      },
      {
        key: 'portfolio',
        label: 'Portfolio',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-600 truncate max-w-[180px] block">{value || '—'}</span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'lastLogin',
        label: 'Last Login',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-500 whitespace-nowrap">
            {formatDisplayDateTime(value) || '—'}
          </span>
        ),
      },
    ];
  }, []);

  /**
   * Export data for the user table.
   */
  const userExportData = useMemo(() => {
    return filteredUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: getRoleLabel(user.role),
      portfolio: user.portfolio,
      status: user.status,
      lastLogin: user.lastLogin,
      applicationAccess: user.applicationAccess ? user.applicationAccess.join(', ') : '',
      notificationEmail: user.notificationPrefs ? user.notificationPrefs.email : '',
      notificationTeams: user.notificationPrefs ? user.notificationPrefs.teams : '',
      notificationInApp: user.notificationPrefs ? user.notificationPrefs.inApp : '',
    }));
  }, [filteredUsers]);

  /**
   * Handles clicking a user row to open the detail modal.
   *
   * @param {Object} user - The user object
   */
  const handleRowClick = useCallback((user) => {
    setSelectedUser(user);
    setDetailModalOpen(true);
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedUser(null);
  }, []);

  /**
   * Opens the add user modal.
   */
  const handleOpenAdd = useCallback(() => {
    setAddForm({
      name: '',
      email: '',
      role: 'viewer',
      portfolio: '',
      status: 'active',
    });
    setAddFormError(null);
    setAddModalOpen(true);
  }, []);

  /**
   * Closes the add user modal.
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
   * Handles submitting the add user form.
   */
  const handleAddSubmit = useCallback(() => {
    setAddFormError(null);

    if (!addForm.name || addForm.name.trim() === '') {
      setAddFormError('Name is required.');
      return;
    }

    if (!addForm.email || addForm.email.trim() === '') {
      setAddFormError('Email is required.');
      return;
    }

    if (!addForm.role) {
      setAddFormError('Role is required.');
      return;
    }

    setAddSubmitting(true);

    try {
      const newUser = addUser({
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        role: addForm.role,
        portfolio: addForm.portfolio.trim(),
        status: addForm.status || 'active',
      });

      try {
        logAction(
          'create',
          `Created new user: ${newUser.name} (${newUser.id}). Role: ${getRoleLabel(newUser.role)}.`,
          'User',
          newUser.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setAddModalOpen(false);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to create user.';
      setAddFormError(errorMessage);
    } finally {
      setAddSubmitting(false);
    }
  }, [addForm, fetchData]);

  /**
   * Opens the edit user modal.
   *
   * @param {Object} user - The user to edit
   */
  const handleOpenEdit = useCallback((user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'viewer',
      portfolio: user.portfolio || '',
      status: user.status || 'active',
    });
    setEditFormError(null);
    setEditModalOpen(true);
  }, []);

  /**
   * Closes the edit user modal.
   */
  const handleCloseEdit = useCallback(() => {
    setEditModalOpen(false);
    setEditFormError(null);
  }, []);

  /**
   * Handles edit form field changes.
   *
   * @param {string} field - The field name
   * @param {string} value - The new value
   */
  const handleEditFormChange = useCallback((field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handles submitting the edit user form.
   */
  const handleEditSubmit = useCallback(() => {
    setEditFormError(null);

    if (!editForm.name || editForm.name.trim() === '') {
      setEditFormError('Name is required.');
      return;
    }

    if (!editForm.email || editForm.email.trim() === '') {
      setEditFormError('Email is required.');
      return;
    }

    if (!editForm.role) {
      setEditFormError('Role is required.');
      return;
    }

    setEditSubmitting(true);

    try {
      const previousRole = selectedUser.role;
      const previousStatus = selectedUser.status;

      const updated = updateUser(selectedUser.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        portfolio: editForm.portfolio.trim(),
        status: editForm.status,
      });

      try {
        let details = `Updated user: ${updated.name} (${selectedUser.id}).`;
        if (previousRole !== editForm.role) {
          details += ` Role changed from ${getRoleLabel(previousRole)} to ${getRoleLabel(editForm.role)}.`;
        }
        if (previousStatus !== editForm.status) {
          details += ` Status changed from ${previousStatus} to ${editForm.status}.`;
        }

        const actionType = previousRole !== editForm.role ? 'role_change' : 'update';

        logAction(
          actionType,
          details,
          'User',
          selectedUser.id,
          {
            status: 'success',
            previousValue: previousRole !== editForm.role ? previousRole : previousStatus,
            newValue: previousRole !== editForm.role ? editForm.role : editForm.status,
          }
        );
      } catch {
        // Ignore audit log errors
      }

      setEditModalOpen(false);
      setDetailModalOpen(false);
      setSelectedUser(null);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to update user.';
      setEditFormError(errorMessage);
    } finally {
      setEditSubmitting(false);
    }
  }, [editForm, selectedUser, fetchData]);

  /**
   * Opens the deactivate/suspend confirmation modal.
   *
   * @param {Object} user - The user to deactivate/suspend
   * @param {string} action - The action: 'deactivate' | 'suspend' | 'reactivate'
   */
  const handleOpenDeactivate = useCallback((user, action) => {
    setSelectedUser(user);
    setDeactivateAction(action);
    setDeactivateModalOpen(true);
  }, []);

  /**
   * Closes the deactivate confirmation modal.
   */
  const handleCloseDeactivate = useCallback(() => {
    setDeactivateModalOpen(false);
  }, []);

  /**
   * Handles deactivating/suspending/reactivating a user.
   */
  const handleDeactivateSubmit = useCallback(() => {
    if (!selectedUser) {
      return;
    }

    setDeactivateSubmitting(true);

    try {
      let updated;
      let actionLabel;

      if (deactivateAction === 'deactivate') {
        updated = deactivateUser(selectedUser.id);
        actionLabel = 'Deactivated';
      } else if (deactivateAction === 'suspend') {
        updated = suspendUser(selectedUser.id);
        actionLabel = 'Suspended';
      } else if (deactivateAction === 'reactivate') {
        updated = reactivateUser(selectedUser.id);
        actionLabel = 'Reactivated';
      }

      try {
        logAction(
          'update',
          `${actionLabel} user: ${selectedUser.name} (${selectedUser.id}). Status changed from ${selectedUser.status} to ${updated.status}.`,
          'User',
          selectedUser.id,
          {
            status: 'success',
            previousValue: selectedUser.status,
            newValue: updated.status,
          }
        );
      } catch {
        // Ignore audit log errors
      }

      setDeactivateModalOpen(false);
      setDetailModalOpen(false);
      setSelectedUser(null);
      fetchData();
    } catch {
      setDeactivateModalOpen(false);
    } finally {
      setDeactivateSubmitting(false);
    }
  }, [selectedUser, deactivateAction, fetchData]);

  /**
   * Opens the access review modal for a user.
   *
   * @param {Object} user - The user to review
   */
  const handleOpenAccessReview = useCallback((user) => {
    setSelectedUser(user);
    setAccessReviewResult(null);
    setAccessReviewLoading(true);
    setAccessReviewModalOpen(true);

    try {
      const result = reviewAccess(user.id);
      setAccessReviewResult(result);
    } catch {
      setAccessReviewResult(null);
    } finally {
      setAccessReviewLoading(false);
    }
  }, []);

  /**
   * Closes the access review modal.
   */
  const handleCloseAccessReview = useCallback(() => {
    setAccessReviewModalOpen(false);
    setAccessReviewResult(null);
  }, []);

  /**
   * Handles syncing a user's access to match their role permissions.
   */
  const handleSyncAccess = useCallback(() => {
    if (!selectedUser) {
      return;
    }

    try {
      syncUserAccess(selectedUser.id);

      try {
        logAction(
          'update',
          `Synchronized access for user: ${selectedUser.name} (${selectedUser.id}). Access aligned to role: ${getRoleLabel(selectedUser.role)}.`,
          'User',
          selectedUser.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      // Refresh the access review
      const result = reviewAccess(selectedUser.id);
      setAccessReviewResult(result);
      fetchData();
    } catch {
      // Ignore sync errors
    }
  }, [selectedUser, fetchData]);

  /**
   * Checks if the current user can perform admin actions.
   */
  const canAdmin = useMemo(() => {
    return hasPermission('user_management');
  }, [hasPermission]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading user repository..." showLabel />
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
            User Repository
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Manage user accounts, roles, access permissions, and review user activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canAdmin && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New User</span>
            </button>
          )}
          {userExportData.length > 0 && (
            <ExportButton
              data={userExportData}
              filename="user-repository"
              title="User Repository Report"
              sheetName="Users"
              label="Export"
              size="md"
            />
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summaryKPIs && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            label="Total Users"
            value={summaryKPIs.total}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Active"
            value={summaryKPIs.active}
            trend="up"
            trendValue={summaryKPIs.total > 0 ? `${Math.round((summaryKPIs.active / summaryKPIs.total) * 100)}%` : '0%'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Inactive"
            value={summaryKPIs.inactive}
            trend={summaryKPIs.inactive > 0 ? 'down' : 'up'}
            trendValue={summaryKPIs.inactive > 0 ? 'Review needed' : 'None'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Suspended"
            value={summaryKPIs.suspended}
            trend={summaryKPIs.suspended > 0 ? 'down' : 'up'}
            trendValue={summaryKPIs.suspended > 0 ? 'Action needed' : 'None'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            }
          />
          <MetricCard
            label="Unique Roles"
            value={summaryKPIs.uniqueRoles}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-brand-gray-200 overflow-x-auto">
        {[
          { key: 'users', label: 'User List' },
          { key: 'charts', label: 'Distribution' },
          { key: 'audit', label: 'Audit Log' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: User List */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Filters */}
          <FilterBar
            filters={filterConfig}
            values={filterValues}
            onChange={handleFilterChange}
            onClearAll={handleClearAll}
            showSearch={false}
          />

          {/* Users Table */}
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
                All Users
              </h2>
              <span className="text-sm text-brand-gray-500">
                ({filteredUsers.length} of {users.length})
              </span>
            </div>
            {filteredUsers.length > 0 ? (
              <DataTable
                columns={userColumns}
                data={filteredUsers}
                pageSize={10}
                selectable={false}
                searchFields={['name', 'email', 'role', 'portfolio', 'status']}
                emptyMessage="No users match the selected filters."
                rowKeyField="id"
                onRowClick={handleRowClick}
                storageKey="user-repository-table"
              />
            ) : (
              <EmptyState
                title="No users found"
                description="No users match the selected filters. Try adjusting your filter criteria."
                actionLabel="Clear Filters"
                onAction={handleClearAll}
              />
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Distribution Charts */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            {statusDistributionData.length > 0 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <ChartWrapper
                  chartType="pie"
                  data={statusDistributionData}
                  config={pieChartConfig}
                  title="Status Distribution"
                  subtitle="Users by account status"
                  height={300}
                  loading={false}
                  emptyMessage="No status data available"
                />
              </div>
            )}

            {/* Role Distribution */}
            {roleDistributionData.length > 0 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <ChartWrapper
                  chartType="pie"
                  data={roleDistributionData}
                  config={pieChartConfig}
                  title="Role Distribution"
                  subtitle="Users by assigned role"
                  height={300}
                  loading={false}
                  emptyMessage="No role data available"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Audit Log */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <AuditLogPanel
              entityType="User"
              title="User Audit Log"
              pageSize={10}
              showExport={true}
              compact={false}
            />
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{users.filter((u) => u.status === 'active').length} Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{users.filter((u) => u.status === 'inactive').length} Inactive</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{users.filter((u) => u.status === 'suspended').length} Suspended</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            {filteredUsers.length !== users.length
              ? `Showing ${filteredUsers.length} of ${users.length} users`
              : `Showing all ${users.length} users`}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
        title={selectedUser ? selectedUser.name : ''}
        size="xl"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* Status and Role */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedUser.status} size="md" />
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
                {getRoleLabel(selectedUser.role)}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Email</p>
                <p className="text-sm font-medium text-brand-gray-900 truncate">{selectedUser.email}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Role</p>
                <p className="text-sm font-medium text-brand-gray-900">{getRoleLabel(selectedUser.role)}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Portfolio</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedUser.portfolio || '—'}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Status</p>
                <StatusBadge status={selectedUser.status} size="md" />
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Last Login</p>
                <p className="text-sm font-medium text-brand-gray-900">
                  {formatDisplayDateTime(selectedUser.lastLogin) || '—'}
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">User ID</p>
                <p className="text-xs font-mono text-brand-gray-600">{selectedUser.id}</p>
              </div>
            </div>

            {/* Application Access */}
            {selectedUser.applicationAccess && selectedUser.applicationAccess.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Feature Access ({selectedUser.applicationAccess.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.applicationAccess.map((access, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300"
                    >
                      {access.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notification Preferences */}
            {selectedUser.notificationPrefs && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Notification Preferences
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${selectedUser.notificationPrefs.email ? 'bg-brand-green-500' : 'bg-brand-gray-400'}`} />
                    <span className="text-sm text-brand-gray-600">Email: {selectedUser.notificationPrefs.email ? 'On' : 'Off'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${selectedUser.notificationPrefs.teams ? 'bg-brand-green-500' : 'bg-brand-gray-400'}`} />
                    <span className="text-sm text-brand-gray-600">Teams: {selectedUser.notificationPrefs.teams ? 'On' : 'Off'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${selectedUser.notificationPrefs.inApp ? 'bg-brand-green-500' : 'bg-brand-gray-400'}`} />
                    <span className="text-sm text-brand-gray-600">In-App: {selectedUser.notificationPrefs.inApp ? 'On' : 'Off'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {canAdmin && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => handleOpenEdit(selectedUser)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleOpenAccessReview(selectedUser)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Access Review</span>
                </button>
                {selectedUser.status === 'active' && (
                  <>
                    <button
                      onClick={() => handleOpenDeactivate(selectedUser, 'deactivate')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md hover:bg-yellow-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Deactivate</span>
                    </button>
                    <button
                      onClick={() => handleOpenDeactivate(selectedUser, 'suspend')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <span>Suspend</span>
                    </button>
                  </>
                )}
                {(selectedUser.status === 'inactive' || selectedUser.status === 'suspended') && (
                  <button
                    onClick={() => handleOpenDeactivate(selectedUser, 'reactivate')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-green-500 rounded-md hover:bg-brand-green-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Reactivate</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add User Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={handleCloseAdd}
        title="New User"
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
            <label htmlFor="user-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="user-name"
              type="text"
              value={addForm.name}
              onChange={(e) => handleAddFormChange('name', e.target.value)}
              placeholder="Enter full name"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              disabled={addSubmitting}
            />
          </div>

          <div>
            <label htmlFor="user-email" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="user-email"
              type="email"
              value={addForm.email}
              onChange={(e) => handleAddFormChange('email', e.target.value)}
              placeholder="user@kp-etsip.gov"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              disabled={addSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="user-role" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="user-role"
                value={addForm.role}
                onChange={(e) => handleAddFormChange('role', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={addSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                {allRoles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="user-status" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Status
              </label>
              <select
                id="user-status"
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
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="user-portfolio" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Portfolio / Department
            </label>
            <input
              id="user-portfolio"
              type="text"
              value={addForm.portfolio}
              onChange={(e) => handleAddFormChange('portfolio', e.target.value)}
              placeholder="Enter portfolio or department"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
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
                  <span>Create User</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={handleCloseEdit}
        title={selectedUser ? `Edit: ${selectedUser.name}` : 'Edit User'}
        size="lg"
      >
        {selectedUser && (
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
              <label htmlFor="edit-user-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-user-name"
                type="text"
                value={editForm.name}
                onChange={(e) => handleEditFormChange('name', e.target.value)}
                placeholder="Enter full name"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={editSubmitting}
              />
            </div>

            <div>
              <label htmlFor="edit-user-email" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-user-email"
                type="email"
                value={editForm.email}
                onChange={(e) => handleEditFormChange('email', e.target.value)}
                placeholder="user@kp-etsip.gov"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={editSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-user-role" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="edit-user-role"
                  value={editForm.role}
                  onChange={(e) => handleEditFormChange('role', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                  disabled={editSubmitting}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em',
                  }}
                >
                  {allRoles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-user-status" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="edit-user-status"
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
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="edit-user-portfolio" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Portfolio / Department
              </label>
              <input
                id="edit-user-portfolio"
                type="text"
                value={editForm.portfolio}
                onChange={(e) => handleEditFormChange('portfolio', e.target.value)}
                placeholder="Enter portfolio or department"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={editSubmitting}
              />
            </div>

            {/* Role change warning */}
            {selectedUser.role !== editForm.role && (
              <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <svg className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-yellow-700">
                  Changing the role from <strong>{getRoleLabel(selectedUser.role)}</strong> to <strong>{getRoleLabel(editForm.role)}</strong> will update the user&apos;s feature access permissions to match the new role.
                </p>
              </div>
            )}

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

      {/* Deactivate/Suspend/Reactivate Confirmation Modal */}
      <Modal
        isOpen={deactivateModalOpen}
        onClose={handleCloseDeactivate}
        title={
          deactivateAction === 'deactivate'
            ? 'Deactivate User'
            : deactivateAction === 'suspend'
            ? 'Suspend User'
            : 'Reactivate User'
        }
        size="sm"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                deactivateAction === 'reactivate' ? 'bg-brand-green-100' : deactivateAction === 'suspend' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                {deactivateAction === 'reactivate' ? (
                  <svg className="w-5 h-5 text-brand-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : deactivateAction === 'suspend' ? (
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm text-brand-gray-700">
                  {deactivateAction === 'deactivate' && (
                    <>Are you sure you want to deactivate <strong>{selectedUser.name}</strong>? This will disable their account and revoke notification preferences.</>
                  )}
                  {deactivateAction === 'suspend' && (
                    <>Are you sure you want to suspend <strong>{selectedUser.name}</strong>? This will immediately block their access and disable notifications.</>
                  )}
                  {deactivateAction === 'reactivate' && (
                    <>Are you sure you want to reactivate <strong>{selectedUser.name}</strong>? This will restore their account access.</>
                  )}
                </p>
                <p className="text-xs text-brand-gray-500 mt-2">
                  {deactivateAction === 'reactivate'
                    ? 'The user will be able to log in again after reactivation.'
                    : 'This action can be reversed by an administrator.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-gray-200">
              <button
                onClick={handleCloseDeactivate}
                disabled={deactivateSubmitting}
                className="px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateSubmit}
                disabled={deactivateSubmitting}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  deactivateAction === 'reactivate'
                    ? 'bg-brand-green-500 hover:bg-brand-green-600'
                    : deactivateAction === 'suspend'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-yellow-500 hover:bg-yellow-600'
                }`}
              >
                {deactivateSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>
                    {deactivateAction === 'deactivate' && 'Deactivate'}
                    {deactivateAction === 'suspend' && 'Suspend'}
                    {deactivateAction === 'reactivate' && 'Reactivate'}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Access Review Modal */}
      <Modal
        isOpen={accessReviewModalOpen}
        onClose={handleCloseAccessReview}
        title={selectedUser ? `Access Review: ${selectedUser.name}` : 'Access Review'}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            {accessReviewLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                  <p className="text-xs text-brand-gray-400">Reviewing access...</p>
                </div>
              </div>
            ) : accessReviewResult ? (
              <>
                {/* Compliance Status */}
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                  accessReviewResult.compliant
                    ? 'bg-brand-green-50 border-brand-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    accessReviewResult.compliant ? 'bg-brand-green-100' : 'bg-yellow-100'
                  }`}>
                    {accessReviewResult.compliant ? (
                      <svg className="w-5 h-5 text-brand-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-gray-900">
                      {accessReviewResult.compliant ? 'Access Compliant' : 'Access Non-Compliant'}
                    </p>
                    <p className="text-xs text-brand-gray-600">
                      {accessReviewResult.compliant
                        ? 'User access matches their role permissions.'
                        : `${accessReviewResult.excessAccess.length} excess and ${accessReviewResult.missingAccess.length} missing permissions detected.`}
                    </p>
                  </div>
                </div>

                {/* Review Details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Role</p>
                    <p className="text-sm font-medium text-brand-gray-900">{getRoleLabel(accessReviewResult.role)}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Granted Permissions</p>
                    <p className="text-sm font-medium text-brand-gray-900">{accessReviewResult.grantedPermissions.length}</p>
                  </div>
                  <div className="bg-brand-gray-50 rounded-lg p-3">
                    <p className="text-xs text-brand-gray-500 mb-1">Current Access</p>
                    <p className="text-sm font-medium text-brand-gray-900">{accessReviewResult.currentAccess.length}</p>
                  </div>
                </div>

                {/* Excess Access */}
                {accessReviewResult.excessAccess.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                      Excess Access ({accessReviewResult.excessAccess.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {accessReviewResult.excessAccess.map((access, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-300"
                        >
                          {access.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Access */}
                {accessReviewResult.missingAccess.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-yellow-600 uppercase tracking-wider mb-2">
                      Missing Access ({accessReviewResult.missingAccess.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {accessReviewResult.missingAccess.map((access, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300"
                        >
                          {access.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Granted Permissions */}
                <div>
                  <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                    Role Granted Permissions ({accessReviewResult.grantedPermissions.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {accessReviewResult.grantedPermissions.map((perm, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300"
                      >
                        {perm.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Review Timestamp */}
                <div className="text-xs text-brand-gray-400">
                  Reviewed: {formatDisplayDateTime(accessReviewResult.reviewedAt)}
                </div>

                {/* Sync Button */}
                {!accessReviewResult.compliant && canAdmin && (
                  <div className="flex items-center justify-end pt-4 border-t border-brand-gray-200">
                    <button
                      onClick={handleSyncAccess}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Sync Access to Role</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-brand-gray-500">
                Unable to perform access review.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
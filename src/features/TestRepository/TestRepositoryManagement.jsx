/**
 * TestRepositoryManagement Component
 * Test Repository Management screen (FR-009): displays enterprise test assets in DataTable
 * with search, filter (type/application/status/suite), create/edit/approve/clone/retire actions
 * via modals, import/export buttons, version history panel.
 * Uses RepositoryService and ExportService. Logs actions via AuditLogService.
 * @module TestRepositoryManagement
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getTestAssets,
  addTestAsset,
  editTestAsset,
  retireTestAsset,
  cloneTestAsset,
  getTestAssetById,
  getTestAssetVersionHistory,
  getDistinctTestAssetApplications,
  getDistinctTestAssetSuites,
  getDistinctTestAssetTags,
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
 * TestRepositoryManagement page component.
 * Displays enterprise test assets with filtering, CRUD actions via modals,
 * version history panel, export functionality, and summary KPIs with charts.
 *
 * @returns {React.ReactElement} The test repository management page
 */
export default function TestRepositoryManagement() {
  const { currentUser, role, hasPermission } = useAuth();

  const [testAssets, setTestAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    type: '',
    application: '',
    status: '',
    suite: '',
    priority: '',
  });

  // Distinct values for filter dropdowns
  const [distinctApplications, setDistinctApplications] = useState([]);
  const [distinctSuites, setDistinctSuites] = useState([]);

  // Modal states
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [retireModalOpen, setRetireModalOpen] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);

  // Version history state
  const [versionHistory, setVersionHistory] = useState(null);
  const [versionLoading, setVersionLoading] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: '',
    applicationId: '',
    application: '',
    suiteId: '',
    suite: '',
    type: 'Manual',
    status: 'Draft',
    priority: 'medium',
    owner: '',
    ownerEmail: '',
    tags: '',
    description: '',
  });
  const [addFormError, setAddFormError] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'Manual',
    status: 'Active',
    priority: 'medium',
    owner: '',
    ownerEmail: '',
    tags: '',
    description: '',
  });
  const [editFormError, setEditFormError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Retire state
  const [retireSubmitting, setRetireSubmitting] = useState(false);

  // Clone state
  const [cloneSubmitting, setCloneSubmitting] = useState(false);

  /**
   * Loads distinct filter values.
   */
  useEffect(() => {
    try {
      setDistinctApplications(getDistinctTestAssetApplications());
      setDistinctSuites(getDistinctTestAssetSuites());
    } catch {
      // Ignore errors loading distinct values
    }
  }, []);

  /**
   * Fetches test assets based on current filters.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {};

      if (filterValues.type) {
        filters.type = filterValues.type;
      }

      if (filterValues.application) {
        filters.application = filterValues.application;
      }

      if (filterValues.status) {
        filters.status = filterValues.status;
      }

      if (filterValues.suite) {
        filters.suite = filterValues.suite;
      }

      if (filterValues.priority) {
        filters.priority = filterValues.priority;
      }

      const result = await getTestAssets(filters);
      setTestAssets(result.testAssets || []);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load test assets.';
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
      type: '',
      application: '',
      status: '',
      suite: '',
      priority: '',
    });
  }, []);

  /**
   * Builds the filter configuration for the FilterBar.
   */
  const filterConfig = useMemo(() => {
    return [
      {
        key: 'type',
        label: 'Type',
        placeholder: 'All Types',
        options: [
          { value: 'Manual', label: 'Manual' },
          { value: 'Automated', label: 'Automated' },
        ],
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
      {
        key: 'status',
        label: 'Status',
        placeholder: 'All Statuses',
        options: [
          { value: 'Active', label: 'Active' },
          { value: 'Draft', label: 'Draft' },
          { value: 'Retired', label: 'Retired' },
        ],
      },
      {
        key: 'suite',
        label: 'Suite',
        placeholder: 'All Suites',
        options: distinctSuites.map((s) => ({
          value: s,
          label: s,
        })),
      },
      {
        key: 'priority',
        label: 'Priority',
        placeholder: 'All Priorities',
        options: [
          { value: 'critical', label: 'Critical' },
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ],
      },
    ];
  }, [distinctApplications, distinctSuites]);

  /**
   * Summary KPIs computed from all test assets.
   */
  const summaryKPIs = useMemo(() => {
    if (!testAssets || testAssets.length === 0) {
      return null;
    }

    const total = testAssets.length;
    let activeCount = 0;
    let draftCount = 0;
    let retiredCount = 0;
    let automatedCount = 0;
    let manualCount = 0;
    let criticalCount = 0;
    let highCount = 0;

    for (const asset of testAssets) {
      if (asset.status === 'Active') {
        activeCount++;
      } else if (asset.status === 'Draft') {
        draftCount++;
      } else if (asset.status === 'Retired') {
        retiredCount++;
      }

      if (asset.type === 'Automated') {
        automatedCount++;
      } else {
        manualCount++;
      }

      if (asset.priority === 'critical') {
        criticalCount++;
      } else if (asset.priority === 'high') {
        highCount++;
      }
    }

    const automationRate = total > 0 ? Math.round((automatedCount / total) * 1000) / 10 : 0;

    return {
      total,
      activeCount,
      draftCount,
      retiredCount,
      automatedCount,
      manualCount,
      criticalCount,
      highCount,
      automationRate,
    };
  }, [testAssets]);

  /**
   * Status distribution chart data.
   */
  const statusDistributionData = useMemo(() => {
    const counts = {};
    for (const asset of testAssets) {
      const status = asset.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    const statusColors = {
      Active: '#0f9d58',
      Draft: '#939ba3',
      Retired: '#78828c',
    };

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: statusColors[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [testAssets]);

  /**
   * Type distribution chart data.
   */
  const typeDistributionData = useMemo(() => {
    const counts = {};
    for (const asset of testAssets) {
      const type = asset.type || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    }

    const typeColors = {
      Automated: '#0069cc',
      Manual: '#f59e0b',
    };

    return Object.entries(counts)
      .map(([type, count]) => ({
        name: type,
        value: count,
        color: typeColors[type] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [testAssets]);

  /**
   * Priority distribution chart data.
   */
  const priorityDistributionData = useMemo(() => {
    const counts = {};
    for (const asset of testAssets) {
      const priority = asset.priority || 'unknown';
      counts[priority] = (counts[priority] || 0) + 1;
    }

    const priorityColors = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#f59e0b',
      low: '#0f9d58',
    };

    return Object.entries(counts)
      .map(([priority, count]) => ({
        name: priority.charAt(0).toUpperCase() + priority.slice(1),
        value: count,
        color: priorityColors[priority] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [testAssets]);

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
   * Test asset table columns.
   */
  const testAssetColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Test Asset',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900 line-clamp-2">{value}</span>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        sortable: true,
        render: (value) => (
          <span className={`text-sm font-medium ${value === 'Automated' ? 'text-brand-500' : 'text-yellow-600'}`}>
            {value}
          </span>
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
        key: 'suite',
        label: 'Suite',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-600 truncate max-w-[150px] block">{value}</span>
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
        key: 'owner',
        label: 'Owner',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'version',
        label: 'Version',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">v{value}</span>
        ),
      },
      {
        key: 'lastModified',
        label: 'Last Modified',
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
   * Export data for the test asset table.
   */
  const testAssetExportData = useMemo(() => {
    return testAssets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      applicationId: asset.applicationId,
      application: asset.application,
      suiteId: asset.suiteId,
      suite: asset.suite,
      status: asset.status,
      priority: asset.priority,
      owner: asset.owner,
      ownerEmail: asset.ownerEmail,
      version: asset.version,
      lastModified: asset.lastModified,
      tags: asset.tags ? asset.tags.join(', ') : '',
      description: asset.description,
    }));
  }, [testAssets]);

  /**
   * Handles clicking a test asset row to open the detail modal.
   *
   * @param {Object} asset - The test asset object
   */
  const handleRowClick = useCallback((asset) => {
    setSelectedAsset(asset);
    setDetailModalOpen(true);
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedAsset(null);
  }, []);

  /**
   * Opens the add test asset modal.
   */
  const handleOpenAdd = useCallback(() => {
    setAddForm({
      name: '',
      applicationId: '',
      application: '',
      suiteId: '',
      suite: '',
      type: 'Manual',
      status: 'Draft',
      priority: 'medium',
      owner: currentUser ? currentUser.name : '',
      ownerEmail: currentUser ? currentUser.email : '',
      tags: '',
      description: '',
    });
    setAddFormError(null);
    setAddModalOpen(true);
  }, [currentUser]);

  /**
   * Closes the add test asset modal.
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
   * Handles submitting the add test asset form.
   */
  const handleAddSubmit = useCallback(async () => {
    setAddFormError(null);

    if (!addForm.name || addForm.name.trim() === '') {
      setAddFormError('Test asset name is required.');
      return;
    }

    if (!addForm.application || addForm.application.trim() === '') {
      setAddFormError('Application is required.');
      return;
    }

    if (!addForm.suite || addForm.suite.trim() === '') {
      setAddFormError('Suite is required.');
      return;
    }

    setAddSubmitting(true);

    try {
      const tagsArray = addForm.tags
        ? addForm.tags.split(',').map((t) => t.trim()).filter((t) => t !== '')
        : [];

      const newAsset = await addTestAsset({
        name: addForm.name.trim(),
        applicationId: addForm.applicationId.trim() || `app-${addForm.application.trim().toLowerCase().replace(/\s+/g, '-')}`,
        application: addForm.application.trim(),
        suiteId: addForm.suiteId.trim() || `suite-${addForm.suite.trim().toLowerCase().replace(/\s+/g, '-')}`,
        suite: addForm.suite.trim(),
        type: addForm.type,
        status: addForm.status,
        priority: addForm.priority,
        owner: addForm.owner.trim(),
        ownerEmail: addForm.ownerEmail.trim(),
        tags: tagsArray,
        description: addForm.description.trim(),
      });

      try {
        logAction(
          'create',
          `Created new test asset: ${newAsset.name} (${newAsset.id}). Application: ${newAsset.application}. Suite: ${newAsset.suite}.`,
          'TestAsset',
          newAsset.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setAddModalOpen(false);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to create test asset.';
      setAddFormError(errorMessage);
    } finally {
      setAddSubmitting(false);
    }
  }, [addForm, fetchData]);

  /**
   * Opens the edit test asset modal.
   *
   * @param {Object} asset - The test asset to edit
   */
  const handleOpenEdit = useCallback((asset) => {
    setSelectedAsset(asset);
    setEditForm({
      name: asset.name || '',
      type: asset.type || 'Manual',
      status: asset.status || 'Active',
      priority: asset.priority || 'medium',
      owner: asset.owner || '',
      ownerEmail: asset.ownerEmail || '',
      tags: asset.tags ? asset.tags.join(', ') : '',
      description: asset.description || '',
    });
    setEditFormError(null);
    setEditModalOpen(true);
  }, []);

  /**
   * Closes the edit test asset modal.
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
   * Handles submitting the edit test asset form.
   */
  const handleEditSubmit = useCallback(async () => {
    setEditFormError(null);

    if (!editForm.name || editForm.name.trim() === '') {
      setEditFormError('Test asset name is required.');
      return;
    }

    setEditSubmitting(true);

    try {
      const tagsArray = editForm.tags
        ? editForm.tags.split(',').map((t) => t.trim()).filter((t) => t !== '')
        : [];

      const updates = {
        name: editForm.name.trim(),
        type: editForm.type,
        status: editForm.status,
        priority: editForm.priority,
        owner: editForm.owner.trim(),
        ownerEmail: editForm.ownerEmail.trim(),
        tags: tagsArray,
        description: editForm.description.trim(),
      };

      await editTestAsset(selectedAsset.id, updates);

      try {
        logAction(
          'update',
          `Updated test asset: ${updates.name} (${selectedAsset.id}). Version incremented.`,
          'TestAsset',
          selectedAsset.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setEditModalOpen(false);
      setDetailModalOpen(false);
      setSelectedAsset(null);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to update test asset.';
      setEditFormError(errorMessage);
    } finally {
      setEditSubmitting(false);
    }
  }, [editForm, selectedAsset, fetchData]);

  /**
   * Opens the retire confirmation modal.
   *
   * @param {Object} asset - The test asset to retire
   */
  const handleOpenRetire = useCallback((asset) => {
    setSelectedAsset(asset);
    setRetireModalOpen(true);
  }, []);

  /**
   * Closes the retire confirmation modal.
   */
  const handleCloseRetire = useCallback(() => {
    setRetireModalOpen(false);
  }, []);

  /**
   * Handles retiring a test asset.
   */
  const handleRetireSubmit = useCallback(async () => {
    if (!selectedAsset) {
      return;
    }

    setRetireSubmitting(true);

    try {
      await retireTestAsset(selectedAsset.id);

      try {
        logAction(
          'update',
          `Retired test asset: ${selectedAsset.name} (${selectedAsset.id}).`,
          'TestAsset',
          selectedAsset.id,
          { status: 'success', previousValue: selectedAsset.status, newValue: 'Retired' }
        );
      } catch {
        // Ignore audit log errors
      }

      setRetireModalOpen(false);
      setDetailModalOpen(false);
      setSelectedAsset(null);
      fetchData();
    } catch {
      setRetireModalOpen(false);
    } finally {
      setRetireSubmitting(false);
    }
  }, [selectedAsset, fetchData]);

  /**
   * Handles cloning a test asset.
   *
   * @param {Object} asset - The test asset to clone
   */
  const handleClone = useCallback(async (asset) => {
    if (!asset) {
      return;
    }

    setCloneSubmitting(true);

    try {
      const cloned = await cloneTestAsset(asset.id);

      try {
        logAction(
          'create',
          `Cloned test asset: ${asset.name} (${asset.id}) → ${cloned.name} (${cloned.id}).`,
          'TestAsset',
          cloned.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setDetailModalOpen(false);
      setSelectedAsset(null);
      fetchData();
    } catch {
      // Ignore clone errors
    } finally {
      setCloneSubmitting(false);
    }
  }, [fetchData]);

  /**
   * Opens the version history modal for a test asset.
   *
   * @param {Object} asset - The test asset
   */
  const handleOpenVersionHistory = useCallback(async (asset) => {
    if (!asset) {
      return;
    }

    setSelectedAsset(asset);
    setVersionLoading(true);
    setVersionHistory(null);
    setVersionModalOpen(true);

    try {
      const history = await getTestAssetVersionHistory(asset.id);
      setVersionHistory(history);
    } catch {
      setVersionHistory(null);
    } finally {
      setVersionLoading(false);
    }
  }, []);

  /**
   * Closes the version history modal.
   */
  const handleCloseVersionHistory = useCallback(() => {
    setVersionModalOpen(false);
    setVersionHistory(null);
  }, []);

  /**
   * Handles approving a test asset (setting status to Active).
   *
   * @param {Object} asset - The test asset to approve
   */
  const handleApprove = useCallback(async (asset) => {
    if (!asset) {
      return;
    }

    try {
      await editTestAsset(asset.id, { status: 'Active' });

      try {
        logAction(
          'approve',
          `Approved test asset: ${asset.name} (${asset.id}). Status changed from ${asset.status} to Active.`,
          'TestAsset',
          asset.id,
          { status: 'success', previousValue: asset.status, newValue: 'Active' }
        );
      } catch {
        // Ignore audit log errors
      }

      setDetailModalOpen(false);
      setSelectedAsset(null);
      fetchData();
    } catch {
      // Ignore approve errors
    }
  }, [fetchData]);

  /**
   * Checks if the current user can perform data entry actions.
   */
  const canEdit = useMemo(() => {
    return hasPermission('data_entry');
  }, [hasPermission]);

  /**
   * Checks if the current user can perform approval actions.
   */
  const canApprove = useMemo(() => {
    return hasPermission('approvals');
  }, [hasPermission]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading test assets..." showLabel />
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
            Test Repository
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Enterprise test asset inventory with version control and lifecycle management
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
              <span>New Test Asset</span>
            </button>
          )}
          {testAssetExportData.length > 0 && (
            <ExportButton
              data={testAssetExportData}
              filename="test-repository"
              title="Test Repository Report"
              sheetName="Test Assets"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <MetricCard
            label="Total Assets"
            value={summaryKPIs.total}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
            label="Draft"
            value={summaryKPIs.draftCount}
            trend={summaryKPIs.draftCount > 10 ? 'down' : 'neutral'}
            trendValue={summaryKPIs.draftCount > 10 ? 'Needs review' : ''}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />
          <MetricCard
            label="Retired"
            value={summaryKPIs.retiredCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            }
          />
          <MetricCard
            label="Automated"
            value={summaryKPIs.automatedCount}
            trend="up"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <MetricCard
            label="Manual"
            value={summaryKPIs.manualCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
          />
          <MetricCard
            label="Automation Rate"
            value={summaryKPIs.automationRate}
            trend={summaryKPIs.automationRate >= 60 ? 'up' : summaryKPIs.automationRate >= 40 ? 'neutral' : 'down'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <MetricCard
            label="Critical"
            value={summaryKPIs.criticalCount}
            trend={summaryKPIs.criticalCount > 0 ? 'down' : 'up'}
            trendValue={summaryKPIs.criticalCount > 0 ? `${summaryKPIs.criticalCount} critical` : 'None'}
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
        {statusDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={statusDistributionData}
              config={pieChartConfig}
              title="Status Distribution"
              subtitle="Test assets by current status"
              height={280}
              loading={false}
              emptyMessage="No status data available"
            />
          </div>
        )}

        {typeDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={typeDistributionData}
              config={pieChartConfig}
              title="Type Distribution"
              subtitle="Automated vs. manual test assets"
              height={280}
              loading={false}
              emptyMessage="No type data available"
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
              subtitle="Test assets by priority level"
              height={280}
              loading={false}
              emptyMessage="No priority data available"
            />
          </div>
        )}
      </div>

      {/* Test Assets Table */}
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
            All Test Assets
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({testAssets.length})
          </span>
        </div>
        <DataTable
          columns={testAssetColumns}
          data={testAssets}
          pageSize={10}
          selectable={false}
          searchFields={['name', 'application', 'suite', 'type', 'status', 'priority', 'owner', 'description']}
          emptyMessage="No test assets match the selected filters."
          rowKeyField="id"
          onRowClick={handleRowClick}
          storageKey="test-repository-table"
        />
      </div>

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{testAssets.filter((a) => a.status === 'Active').length} Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{testAssets.filter((a) => a.status === 'Draft').length} Draft</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-500" />
            <span>{testAssets.filter((a) => a.status === 'Retired').length} Retired</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{testAssets.filter((a) => a.type === 'Automated').length} Automated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{testAssets.filter((a) => a.type === 'Manual').length} Manual</span>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
        title={selectedAsset ? selectedAsset.name : ''}
        size="xl"
      >
        {selectedAsset && (
          <div className="space-y-6">
            {/* Status, Type, and Priority */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedAsset.status} size="md" />
              <StatusBadge status={selectedAsset.priority} size="md" />
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${selectedAsset.type === 'Automated' ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300' : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300'}`}>
                {selectedAsset.type}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 ring-1 ring-inset ring-brand-gray-300">
                v{selectedAsset.version}
              </span>
            </div>

            {/* Description */}
            {selectedAsset.description && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-sm text-brand-gray-700 leading-relaxed">
                  {selectedAsset.description}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Application</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedAsset.application}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Suite</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedAsset.suite}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Owner</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedAsset.owner}</p>
                {selectedAsset.ownerEmail && (
                  <p className="text-xs text-brand-gray-500 truncate">{selectedAsset.ownerEmail}</p>
                )}
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Version</p>
                <p className="text-sm font-medium text-brand-gray-900">v{selectedAsset.version}</p>
              </div>
            </div>

            {/* Tags */}
            {selectedAsset.tags && selectedAsset.tags.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAsset.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Execution History */}
            {selectedAsset.executionHistory && selectedAsset.executionHistory.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Recent Executions ({selectedAsset.executionHistory.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedAsset.executionHistory.slice(0, 5).map((exec) => (
                    <div
                      key={exec.id}
                      className="flex items-center justify-between bg-brand-gray-50 rounded-lg p-3 border border-brand-gray-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <StatusBadge status={exec.result} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm text-brand-gray-700 truncate">
                            {exec.executedBy}
                          </p>
                          <p className="text-xs text-brand-gray-500">
                            {exec.environment} · {exec.duration}s
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-brand-gray-400 whitespace-nowrap">
                        {formatDisplayDate(exec.executedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-600">
              {selectedAsset.createdAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Created: {formatDisplayDate(selectedAsset.createdAt)}</span>
                </div>
              )}
              {selectedAsset.lastModified && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Modified: {formatDisplayDate(selectedAsset.lastModified)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {(canEdit || canApprove) && selectedAsset.status !== 'Retired' && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {canEdit && (
                  <button
                    onClick={() => handleOpenEdit(selectedAsset)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </button>
                )}
                {canApprove && selectedAsset.status === 'Draft' && (
                  <button
                    onClick={() => handleApprove(selectedAsset)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-green-500 rounded-md hover:bg-brand-green-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Approve</span>
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => handleClone(selectedAsset)}
                    disabled={cloneSubmitting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>{cloneSubmitting ? 'Cloning...' : 'Clone'}</span>
                  </button>
                )}
                <button
                  onClick={() => handleOpenVersionHistory(selectedAsset)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Version History</span>
                </button>
                {canEdit && (
                  <button
                    onClick={() => handleOpenRetire(selectedAsset)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <span>Retire</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Test Asset Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={handleCloseAdd}
        title="New Test Asset"
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
            <label htmlFor="test-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Test Asset Name <span className="text-red-500">*</span>
            </label>
            <input
              id="test-name"
              type="text"
              value={addForm.name}
              onChange={(e) => handleAddFormChange('name', e.target.value)}
              placeholder="Enter test asset name"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              disabled={addSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="test-application" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Application <span className="text-red-500">*</span>
              </label>
              <select
                id="test-application"
                value={addForm.application}
                onChange={(e) => handleAddFormChange('application', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={addSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="">Select application...</option>
                {distinctApplications.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="test-suite" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Suite <span className="text-red-500">*</span>
              </label>
              <select
                id="test-suite"
                value={addForm.suite}
                onChange={(e) => handleAddFormChange('suite', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={addSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="">Select suite...</option>
                {distinctSuites.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="test-type" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Type
              </label>
              <select
                id="test-type"
                value={addForm.type}
                onChange={(e) => handleAddFormChange('type', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                disabled={addSubmitting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="Manual">Manual</option>
                <option value="Automated">Automated</option>
              </select>
            </div>

            <div>
              <label htmlFor="test-status" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Status
              </label>
              <select
                id="test-status"
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
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
              </select>
            </div>

            <div>
              <label htmlFor="test-priority" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Priority
              </label>
              <select
                id="test-priority"
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="test-owner" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Owner
              </label>
              <input
                id="test-owner"
                type="text"
                value={addForm.owner}
                onChange={(e) => handleAddFormChange('owner', e.target.value)}
                placeholder="Owner name"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={addSubmitting}
              />
            </div>

            <div>
              <label htmlFor="test-owner-email" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Owner Email
              </label>
              <input
                id="test-owner-email"
                type="email"
                value={addForm.ownerEmail}
                onChange={(e) => handleAddFormChange('ownerEmail', e.target.value)}
                placeholder="owner@kp-etsip.gov"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={addSubmitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="test-tags" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Tags
            </label>
            <input
              id="test-tags"
              type="text"
              value={addForm.tags}
              onChange={(e) => handleAddFormChange('tags', e.target.value)}
              placeholder="regression, smoke, login (comma-separated)"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              disabled={addSubmitting}
            />
          </div>

          <div>
            <label htmlFor="test-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="test-description"
              value={addForm.description}
              onChange={(e) => handleAddFormChange('description', e.target.value)}
              placeholder="Brief description of the test asset"
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
                  <span>Create Test Asset</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Test Asset Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={handleCloseEdit}
        title={selectedAsset ? `Edit: ${selectedAsset.name}` : 'Edit Test Asset'}
        size="lg"
      >
        {selectedAsset && (
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
              <label htmlFor="edit-test-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Test Asset Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-test-name"
                type="text"
                value={editForm.name}
                onChange={(e) => handleEditFormChange('name', e.target.value)}
                placeholder="Enter test asset name"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={editSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="edit-test-type" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="edit-test-type"
                  value={editForm.type}
                  onChange={(e) => handleEditFormChange('type', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                  disabled={editSubmitting}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em',
                  }}
                >
                  <option value="Manual">Manual</option>
                  <option value="Automated">Automated</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-test-status" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="edit-test-status"
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
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-test-priority" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="edit-test-priority"
                  value={editForm.priority}
                  onChange={(e) => handleEditFormChange('priority', e.target.value)}
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-test-owner" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Owner
                </label>
                <input
                  id="edit-test-owner"
                  type="text"
                  value={editForm.owner}
                  onChange={(e) => handleEditFormChange('owner', e.target.value)}
                  placeholder="Owner name"
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  disabled={editSubmitting}
                />
              </div>

              <div>
                <label htmlFor="edit-test-owner-email" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Owner Email
                </label>
                <input
                  id="edit-test-owner-email"
                  type="email"
                  value={editForm.ownerEmail}
                  onChange={(e) => handleEditFormChange('ownerEmail', e.target.value)}
                  placeholder="owner@kp-etsip.gov"
                  className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  disabled={editSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="edit-test-tags" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Tags
              </label>
              <input
                id="edit-test-tags"
                type="text"
                value={editForm.tags}
                onChange={(e) => handleEditFormChange('tags', e.target.value)}
                placeholder="regression, smoke, login (comma-separated)"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={editSubmitting}
              />
            </div>

            <div>
              <label htmlFor="edit-test-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="edit-test-description"
                value={editForm.description}
                onChange={(e) => handleEditFormChange('description', e.target.value)}
                placeholder="Brief description of the test asset"
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

      {/* Retire Confirmation Modal */}
      <Modal
        isOpen={retireModalOpen}
        onClose={handleCloseRetire}
        title="Retire Test Asset"
        size="sm"
      >
        {selectedAsset && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-brand-gray-700">
                  Are you sure you want to retire <strong>{selectedAsset.name}</strong>? This will mark the test asset as retired and it will no longer be available for execution.
                </p>
                <p className="text-xs text-brand-gray-500 mt-2">
                  This action can be reversed by an administrator.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-gray-200">
              <button
                onClick={handleCloseRetire}
                disabled={retireSubmitting}
                className="px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleRetireSubmit}
                disabled={retireSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {retireSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Retiring...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <span>Retire</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Version History Modal */}
      <Modal
        isOpen={versionModalOpen}
        onClose={handleCloseVersionHistory}
        title={selectedAsset ? `Version History: ${selectedAsset.name}` : 'Version History'}
        size="md"
      >
        {versionLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-xs text-brand-gray-400">Loading version history...</p>
            </div>
          </div>
        ) : versionHistory && versionHistory.history && versionHistory.history.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-brand-gray-600">
              <span>Current Version:</span>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
                v{versionHistory.currentVersion}
              </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {versionHistory.history.slice().reverse().map((entry, index) => {
                const isLatest = entry.version === versionHistory.currentVersion;
                return (
                  <div key={entry.version} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isLatest ? 'bg-brand-500' : 'bg-brand-green-500'}`} />
                      {index < versionHistory.history.length - 1 && (
                        <div className="w-0.5 flex-1 bg-brand-gray-200 mt-1" />
                      )}
                    </div>
                    <div className="pb-3 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-brand-gray-900">
                          v{entry.version}
                        </span>
                        {isLatest && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-brand-500 text-white">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-brand-gray-500 mt-0.5">
                        {entry.notes}
                      </p>
                      <p className="text-[10px] text-brand-gray-400 mt-0.5">
                        {formatDisplayDate(entry.modifiedAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-brand-gray-500">
            No version history available.
          </div>
        )}
      </Modal>
    </div>
  );
}
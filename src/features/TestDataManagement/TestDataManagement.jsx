/**
 * TestDataManagement Component
 * Test Data Management screen (FR-016): displays test data assets in DataTable
 * with search, filter (type/status/application/environment), add/edit/refresh/retire actions
 * via modals. Shows data set details, size, last refreshed date.
 * Uses localStorage test data.
 * @module TestDataManagement
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import { logAction } from '../../shared/services/auditLogService.js';
import { getItem, setItem } from '../../shared/services/storage.js';
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
 * localStorage key for test data sets
 * @type {string}
 */
const TEST_DATA_STORAGE_KEY = 'kp_etsip_test_data';

/**
 * Status color mapping for charts.
 * @type {Object.<string, string>}
 */
const STATUS_COLORS = {
  Available: '#0f9d58',
  InUse: '#0069cc',
  Expired: '#939ba3',
};

/**
 * Type color mapping for charts.
 * @type {Object.<string, string>}
 */
const TYPE_COLORS = {
  Synthetic: '#0069cc',
  Masked: '#f59e0b',
  Subset: '#8b5cf6',
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
 * Loads test data sets from localStorage, seeding from mock data if not present.
 * @returns {Array} Array of test data set objects
 */
function loadTestDataFromStorage() {
  let data = getItem(TEST_DATA_STORAGE_KEY, null);
  if (!data || !Array.isArray(data) || data.length === 0) {
    try {
      const mockTestData = require('../../shared/data/mockTestData.js').default;
      data = JSON.parse(JSON.stringify(mockTestData));
      setItem(TEST_DATA_STORAGE_KEY, data);
    } catch {
      data = [];
    }
  }
  return data;
}

/**
 * Saves test data sets to localStorage.
 * @param {Array} testData - Array of test data set objects
 * @returns {boolean} True if saved successfully
 */
function saveTestDataToStorage(testData) {
  return setItem(TEST_DATA_STORAGE_KEY, testData);
}

/**
 * Generates the next unique test data id.
 * @param {Array} testData - Current test data array
 * @returns {string} Next test data id
 */
function generateNextTestDataId(testData) {
  let maxNum = 0;
  for (const td of testData) {
    const match = td.id.match(/^tdata-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `tdata-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * TestDataManagement page component.
 * Displays test data assets with filtering, CRUD actions via modals,
 * and summary KPIs with charts.
 *
 * @returns {React.ReactElement} The test data management page
 */
export default function TestDataManagement() {
  const { currentUser, role, hasPermission } = useAuth();

  const [testData, setTestData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    type: '',
    status: '',
    application: '',
    environment: '',
  });

  // Modal states
  const [selectedDataSet, setSelectedDataSet] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [retireModalOpen, setRetireModalOpen] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: '',
    application: '',
    type: 'Synthetic',
    environment: 'QA',
    size: '',
    description: '',
    tags: '',
  });
  const [addFormError, setAddFormError] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'Synthetic',
    status: 'Available',
    environment: 'QA',
    size: '',
    description: '',
    tags: '',
  });
  const [editFormError, setEditFormError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Retire state
  const [retireSubmitting, setRetireSubmitting] = useState(false);

  // Refresh state
  const [refreshSubmitting, setRefreshSubmitting] = useState(false);

  /**
   * Fetches test data sets.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = loadTestDataFromStorage();
      setTestData(data || []);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load test data sets.';
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
      type: '',
      status: '',
      application: '',
      environment: '',
    });
  }, []);

  /**
   * Distinct types for filter dropdown.
   */
  const distinctTypes = useMemo(() => {
    const types = new Set();
    for (const td of testData) {
      if (td.type) {
        types.add(td.type);
      }
    }
    return Array.from(types).sort();
  }, [testData]);

  /**
   * Distinct statuses for filter dropdown.
   */
  const distinctStatuses = useMemo(() => {
    const statuses = new Set();
    for (const td of testData) {
      if (td.status) {
        statuses.add(td.status);
      }
    }
    return Array.from(statuses).sort();
  }, [testData]);

  /**
   * Distinct applications for filter dropdown.
   */
  const distinctApplications = useMemo(() => {
    const apps = new Set();
    for (const td of testData) {
      if (td.application) {
        apps.add(td.application);
      }
    }
    return Array.from(apps).sort();
  }, [testData]);

  /**
   * Distinct environments for filter dropdown.
   */
  const distinctEnvironments = useMemo(() => {
    const envs = new Set();
    for (const td of testData) {
      if (td.environment) {
        envs.add(td.environment);
      }
    }
    return Array.from(envs).sort();
  }, [testData]);

  /**
   * Builds the filter configuration for the FilterBar.
   */
  const filterConfig = useMemo(() => {
    return [
      {
        key: 'type',
        label: 'Type',
        placeholder: 'All Types',
        options: distinctTypes.map((t) => ({
          value: t,
          label: t,
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
        key: 'application',
        label: 'Application',
        placeholder: 'All Applications',
        options: distinctApplications.map((a) => ({
          value: a,
          label: a,
        })),
      },
      {
        key: 'environment',
        label: 'Environment',
        placeholder: 'All Environments',
        options: distinctEnvironments.map((e) => ({
          value: e,
          label: e,
        })),
      },
    ];
  }, [distinctTypes, distinctStatuses, distinctApplications, distinctEnvironments]);

  /**
   * Filtered test data based on current filter values.
   */
  const filteredTestData = useMemo(() => {
    let result = testData;

    if (filterValues.type) {
      result = result.filter((td) => td.type === filterValues.type);
    }

    if (filterValues.status) {
      result = result.filter((td) => td.status === filterValues.status);
    }

    if (filterValues.application) {
      result = result.filter((td) => td.application === filterValues.application);
    }

    if (filterValues.environment) {
      result = result.filter((td) => td.environment === filterValues.environment);
    }

    return result;
  }, [testData, filterValues]);

  /**
   * Summary KPIs computed from all test data sets.
   */
  const summaryKPIs = useMemo(() => {
    if (!testData || testData.length === 0) {
      return null;
    }

    const total = testData.length;
    let availableCount = 0;
    let inUseCount = 0;
    let expiredCount = 0;
    let syntheticCount = 0;
    let maskedCount = 0;
    let subsetCount = 0;
    let totalSizeMB = 0;

    for (const td of testData) {
      if (td.status === 'Available') {
        availableCount++;
      } else if (td.status === 'InUse') {
        inUseCount++;
      } else if (td.status === 'Expired') {
        expiredCount++;
      }

      if (td.type === 'Synthetic') {
        syntheticCount++;
      } else if (td.type === 'Masked') {
        maskedCount++;
      } else if (td.type === 'Subset') {
        subsetCount++;
      }

      if (td.size) {
        const sizeMatch = td.size.match(/([\d.]+)\s*(GB|MB|KB)/i);
        if (sizeMatch) {
          const value = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2].toUpperCase();
          if (unit === 'GB') {
            totalSizeMB += value * 1024;
          } else if (unit === 'MB') {
            totalSizeMB += value;
          } else if (unit === 'KB') {
            totalSizeMB += value / 1024;
          }
        }
      }
    }

    const totalSizeDisplay = totalSizeMB >= 1024
      ? `${(totalSizeMB / 1024).toFixed(1)} GB`
      : `${Math.round(totalSizeMB)} MB`;

    return {
      total,
      availableCount,
      inUseCount,
      expiredCount,
      syntheticCount,
      maskedCount,
      subsetCount,
      totalSizeDisplay,
      totalSizeMB,
    };
  }, [testData]);

  /**
   * Status distribution chart data.
   */
  const statusDistributionData = useMemo(() => {
    const counts = {};
    for (const td of testData) {
      const status = td.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: STATUS_COLORS[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [testData]);

  /**
   * Type distribution chart data.
   */
  const typeDistributionData = useMemo(() => {
    const counts = {};
    for (const td of testData) {
      const type = td.type || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([type, count]) => ({
        name: type,
        value: count,
        color: TYPE_COLORS[type] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [testData]);

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
   * Application distribution bar chart data.
   */
  const applicationDistributionData = useMemo(() => {
    const counts = {};
    for (const td of filteredTestData) {
      const app = td.application || 'Unknown';
      counts[app] = (counts[app] || 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([app, count]) => ({
        name: app.length > 20 ? app.substring(0, 17) + '...' : app,
        dataSets: count,
      }));
  }, [filteredTestData]);

  /**
   * Application distribution bar chart config.
   */
  const applicationBarConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'dataSets', name: 'Data Sets', color: '#0069cc' },
      ],
      showLegend: true,
    };
  }, []);

  /**
   * Test data table columns.
   */
  const testDataColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Data Set',
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
        key: 'type',
        label: 'Type',
        sortable: true,
        render: (value) => (
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
            value === 'Synthetic' ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300' :
            value === 'Masked' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300' :
            'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-300'
          }`}>
            {value}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'environment',
        label: 'Env',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-600">{value}</span>
        ),
      },
      {
        key: 'size',
        label: 'Size',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
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
        key: 'lastRefreshed',
        label: 'Last Refreshed',
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
   * Export data for the test data table.
   */
  const testDataExportData = useMemo(() => {
    return filteredTestData.map((td) => ({
      id: td.id,
      name: td.name,
      application: td.application,
      type: td.type,
      status: td.status,
      owner: td.owner,
      ownerEmail: td.ownerEmail,
      size: td.size,
      lastRefreshed: td.lastRefreshed,
      environment: td.environment,
      tags: td.tags ? td.tags.join(', ') : '',
      description: td.description,
      createdAt: td.createdAt,
      updatedAt: td.updatedAt,
    }));
  }, [filteredTestData]);

  /**
   * Handles clicking a test data row to open the detail modal.
   *
   * @param {Object} dataSet - The test data set object
   */
  const handleRowClick = useCallback((dataSet) => {
    setSelectedDataSet(dataSet);
    setDetailModalOpen(true);
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedDataSet(null);
  }, []);

  /**
   * Opens the add test data modal.
   */
  const handleOpenAdd = useCallback(() => {
    setAddForm({
      name: '',
      application: '',
      type: 'Synthetic',
      environment: 'QA',
      size: '',
      description: '',
      tags: '',
    });
    setAddFormError(null);
    setAddModalOpen(true);
  }, []);

  /**
   * Closes the add test data modal.
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
   * Handles submitting the add test data form.
   */
  const handleAddSubmit = useCallback(async () => {
    setAddFormError(null);

    if (!addForm.name || addForm.name.trim() === '') {
      setAddFormError('Data set name is required.');
      return;
    }

    if (!addForm.application || addForm.application.trim() === '') {
      setAddFormError('Application is required.');
      return;
    }

    if (!addForm.size || addForm.size.trim() === '') {
      setAddFormError('Size is required.');
      return;
    }

    setAddSubmitting(true);

    try {
      const allData = loadTestDataFromStorage();
      const now = new Date().toISOString();

      const tagsArray = addForm.tags
        ? addForm.tags.split(',').map((t) => t.trim()).filter((t) => t !== '')
        : [];

      const newDataSet = {
        id: generateNextTestDataId(allData),
        name: addForm.name.trim(),
        application: addForm.application.trim(),
        type: addForm.type,
        status: 'Available',
        owner: currentUser ? currentUser.name : 'System',
        ownerEmail: currentUser ? currentUser.email : 'system@kp-etsip.gov',
        size: addForm.size.trim(),
        lastRefreshed: now,
        environment: addForm.environment,
        tags: tagsArray,
        description: addForm.description.trim(),
        createdAt: now,
        updatedAt: now,
      };

      allData.push(newDataSet);
      saveTestDataToStorage(allData);

      try {
        logAction(
          'create',
          `Created new test data set: ${newDataSet.name} (${newDataSet.id}). Application: ${newDataSet.application}. Type: ${newDataSet.type}.`,
          'TestAsset',
          newDataSet.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setAddModalOpen(false);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to create test data set.';
      setAddFormError(errorMessage);
    } finally {
      setAddSubmitting(false);
    }
  }, [addForm, currentUser, fetchData]);

  /**
   * Opens the edit test data modal.
   *
   * @param {Object} dataSet - The test data set to edit
   */
  const handleOpenEdit = useCallback((dataSet) => {
    setSelectedDataSet(dataSet);
    setEditForm({
      name: dataSet.name || '',
      type: dataSet.type || 'Synthetic',
      status: dataSet.status || 'Available',
      environment: dataSet.environment || 'QA',
      size: dataSet.size || '',
      description: dataSet.description || '',
      tags: dataSet.tags ? dataSet.tags.join(', ') : '',
    });
    setEditFormError(null);
    setEditModalOpen(true);
  }, []);

  /**
   * Closes the edit test data modal.
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
   * Handles submitting the edit test data form.
   */
  const handleEditSubmit = useCallback(async () => {
    setEditFormError(null);

    if (!editForm.name || editForm.name.trim() === '') {
      setEditFormError('Data set name is required.');
      return;
    }

    if (!editForm.size || editForm.size.trim() === '') {
      setEditFormError('Size is required.');
      return;
    }

    setEditSubmitting(true);

    try {
      const allData = loadTestDataFromStorage();
      const index = allData.findIndex((td) => td.id === selectedDataSet.id);

      if (index === -1) {
        setEditFormError('Test data set not found.');
        setEditSubmitting(false);
        return;
      }

      const tagsArray = editForm.tags
        ? editForm.tags.split(',').map((t) => t.trim()).filter((t) => t !== '')
        : [];

      allData[index] = {
        ...allData[index],
        name: editForm.name.trim(),
        type: editForm.type,
        status: editForm.status,
        environment: editForm.environment,
        size: editForm.size.trim(),
        description: editForm.description.trim(),
        tags: tagsArray,
        updatedAt: new Date().toISOString(),
      };

      saveTestDataToStorage(allData);

      try {
        logAction(
          'update',
          `Updated test data set: ${editForm.name.trim()} (${selectedDataSet.id}).`,
          'TestAsset',
          selectedDataSet.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setEditModalOpen(false);
      setDetailModalOpen(false);
      setSelectedDataSet(null);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to update test data set.';
      setEditFormError(errorMessage);
    } finally {
      setEditSubmitting(false);
    }
  }, [editForm, selectedDataSet, fetchData]);

  /**
   * Opens the retire confirmation modal.
   *
   * @param {Object} dataSet - The test data set to retire
   */
  const handleOpenRetire = useCallback((dataSet) => {
    setSelectedDataSet(dataSet);
    setRetireModalOpen(true);
  }, []);

  /**
   * Closes the retire confirmation modal.
   */
  const handleCloseRetire = useCallback(() => {
    setRetireModalOpen(false);
  }, []);

  /**
   * Handles retiring a test data set.
   */
  const handleRetireSubmit = useCallback(async () => {
    if (!selectedDataSet) {
      return;
    }

    setRetireSubmitting(true);

    try {
      const allData = loadTestDataFromStorage();
      const index = allData.findIndex((td) => td.id === selectedDataSet.id);

      if (index === -1) {
        setRetireModalOpen(false);
        setRetireSubmitting(false);
        return;
      }

      allData[index] = {
        ...allData[index],
        status: 'Expired',
        updatedAt: new Date().toISOString(),
      };

      saveTestDataToStorage(allData);

      try {
        logAction(
          'update',
          `Retired test data set: ${selectedDataSet.name} (${selectedDataSet.id}).`,
          'TestAsset',
          selectedDataSet.id,
          { status: 'success', previousValue: selectedDataSet.status, newValue: 'Expired' }
        );
      } catch {
        // Ignore audit log errors
      }

      setRetireModalOpen(false);
      setDetailModalOpen(false);
      setSelectedDataSet(null);
      fetchData();
    } catch {
      setRetireModalOpen(false);
    } finally {
      setRetireSubmitting(false);
    }
  }, [selectedDataSet, fetchData]);

  /**
   * Handles refreshing a test data set.
   *
   * @param {Object} dataSet - The test data set to refresh
   */
  const handleRefresh = useCallback(async (dataSet) => {
    if (!dataSet) {
      return;
    }

    setRefreshSubmitting(true);

    try {
      const allData = loadTestDataFromStorage();
      const index = allData.findIndex((td) => td.id === dataSet.id);

      if (index === -1) {
        setRefreshSubmitting(false);
        return;
      }

      const now = new Date().toISOString();

      allData[index] = {
        ...allData[index],
        lastRefreshed: now,
        status: 'Available',
        updatedAt: now,
      };

      saveTestDataToStorage(allData);

      try {
        logAction(
          'update',
          `Refreshed test data set: ${dataSet.name} (${dataSet.id}).`,
          'TestAsset',
          dataSet.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setDetailModalOpen(false);
      setSelectedDataSet(null);
      fetchData();
    } catch {
      // Ignore refresh errors
    } finally {
      setRefreshSubmitting(false);
    }
  }, [fetchData]);

  /**
   * Checks if the current user can perform data entry actions.
   */
  const canEdit = useMemo(() => {
    return hasPermission('data_entry');
  }, [hasPermission]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading test data sets..." showLabel />
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
            Test Data Management
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Manage test data assets, track data set status, and monitor data freshness across all applications
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
              <span>New Data Set</span>
            </button>
          )}
          {testDataExportData.length > 0 && (
            <ExportButton
              data={testDataExportData}
              filename="test-data-management"
              title="Test Data Management Report"
              sheetName="Test Data"
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
            label="Total Data Sets"
            value={summaryKPIs.total}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            }
          />
          <MetricCard
            label="Available"
            value={summaryKPIs.availableCount}
            trend="up"
            trendValue={summaryKPIs.total > 0 ? `${Math.round((summaryKPIs.availableCount / summaryKPIs.total) * 100)}%` : '0%'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="In Use"
            value={summaryKPIs.inUseCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Expired"
            value={summaryKPIs.expiredCount}
            trend={summaryKPIs.expiredCount > 3 ? 'down' : 'neutral'}
            trendValue={summaryKPIs.expiredCount > 3 ? 'Needs refresh' : ''}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Synthetic"
            value={summaryKPIs.syntheticCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            }
          />
          <MetricCard
            label="Masked"
            value={summaryKPIs.maskedCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <MetricCard
            label="Subset"
            value={summaryKPIs.subsetCount}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            }
          />
          <MetricCard
            label="Total Size"
            value={summaryKPIs.totalSizeDisplay}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
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
              title="Status Distribution"
              subtitle="Data sets by current status"
              height={280}
              loading={false}
              emptyMessage="No status data available"
            />
          </div>
        )}

        {/* Type Distribution */}
        {typeDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="pie"
              data={typeDistributionData}
              config={pieChartConfig}
              title="Type Distribution"
              subtitle="Data sets by type"
              height={280}
              loading={false}
              emptyMessage="No type data available"
            />
          </div>
        )}

        {/* Application Distribution */}
        {applicationDistributionData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="bar"
              data={applicationDistributionData}
              config={applicationBarConfig}
              title="Data Sets by Application"
              subtitle="Top applications by data set count"
              height={280}
              loading={false}
              emptyMessage="No application data available"
            />
          </div>
        )}
      </div>

      {/* Test Data Table */}
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
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
            />
          </svg>
          <h2 className="text-lg font-semibold text-brand-gray-900">
            All Test Data Sets
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({filteredTestData.length} of {testData.length})
          </span>
        </div>
        {filteredTestData.length > 0 ? (
          <DataTable
            columns={testDataColumns}
            data={filteredTestData}
            pageSize={10}
            selectable={false}
            searchFields={['name', 'application', 'type', 'status', 'environment', 'owner', 'description']}
            emptyMessage="No test data sets match the selected filters."
            rowKeyField="id"
            onRowClick={handleRowClick}
            storageKey="test-data-management-table"
          />
        ) : (
          <EmptyState
            title="No test data sets found"
            description="No test data sets match the selected filters. Try adjusting your filter criteria."
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
            <span>{testData.filter((td) => td.status === 'Available').length} Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{testData.filter((td) => td.status === 'InUse').length} In Use</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{testData.filter((td) => td.status === 'Expired').length} Expired</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{testData.filter((td) => td.type === 'Synthetic').length} Synthetic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{testData.filter((td) => td.type === 'Masked').length} Masked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>{testData.filter((td) => td.type === 'Subset').length} Subset</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            {filteredTestData.length !== testData.length
              ? `Showing ${filteredTestData.length} of ${testData.length} data sets`
              : `Showing all ${testData.length} data sets`}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
        title={selectedDataSet ? selectedDataSet.name : ''}
        size="xl"
      >
        {selectedDataSet && (
          <div className="space-y-6">
            {/* Status and Type */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedDataSet.status} size="md" />
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                selectedDataSet.type === 'Synthetic' ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300' :
                selectedDataSet.type === 'Masked' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300' :
                'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-300'
              }`}>
                {selectedDataSet.type}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 ring-1 ring-inset ring-brand-gray-300">
                {selectedDataSet.environment}
              </span>
              {selectedDataSet.status === 'Expired' && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-300">
                  Needs Refresh
                </span>
              )}
            </div>

            {/* Description */}
            {selectedDataSet.description && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-sm text-brand-gray-700 leading-relaxed">
                  {selectedDataSet.description}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Application</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedDataSet.application}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Size</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedDataSet.size}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Owner</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedDataSet.owner}</p>
                {selectedDataSet.ownerEmail && (
                  <p className="text-xs text-brand-gray-500 truncate">{selectedDataSet.ownerEmail}</p>
                )}
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Environment</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedDataSet.environment}</p>
              </div>
            </div>

            {/* Tags */}
            {selectedDataSet.tags && selectedDataSet.tags.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedDataSet.tags.map((tag, index) => (
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

            {/* Dates */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-600">
              {selectedDataSet.lastRefreshed && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Last Refreshed: {formatDisplayDateTime(selectedDataSet.lastRefreshed)}</span>
                </div>
              )}
              {selectedDataSet.createdAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Created: {formatDisplayDate(selectedDataSet.createdAt)}</span>
                </div>
              )}
              {selectedDataSet.updatedAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Updated: {formatDisplayDate(selectedDataSet.updatedAt)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {canEdit && selectedDataSet.status !== 'Expired' && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => handleRefresh(selectedDataSet)}
                  disabled={refreshSubmitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{refreshSubmitting ? 'Refreshing...' : 'Refresh Data'}</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(selectedDataSet)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleOpenRetire(selectedDataSet)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span>Retire</span>
                </button>
              </div>
            )}

            {canEdit && selectedDataSet.status === 'Expired' && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => handleRefresh(selectedDataSet)}
                  disabled={refreshSubmitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-green-500 rounded-md hover:bg-brand-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{refreshSubmitting ? 'Refreshing...' : 'Refresh & Reactivate'}</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(selectedDataSet)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Test Data Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={handleCloseAdd}
        title="New Test Data Set"
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
            <label htmlFor="td-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Data Set Name <span className="text-red-500">*</span>
            </label>
            <input
              id="td-name"
              type="text"
              value={addForm.name}
              onChange={(e) => handleAddFormChange('name', e.target.value)}
              placeholder="Enter data set name"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              disabled={addSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="td-application" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Application <span className="text-red-500">*</span>
              </label>
              <select
                id="td-application"
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
              <label htmlFor="td-size" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Size <span className="text-red-500">*</span>
              </label>
              <input
                id="td-size"
                type="text"
                value={addForm.size}
                onChange={(e) => handleAddFormChange('size', e.target.value)}
                placeholder="e.g., 2.4 GB, 890 MB"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={addSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="td-type" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Type
              </label>
              <select
                id="td-type"
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
                <option value="Synthetic">Synthetic</option>
                <option value="Masked">Masked</option>
                <option value="Subset">Subset</option>
              </select>
            </div>

            <div>
              <label htmlFor="td-environment" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Environment
              </label>
              <select
                id="td-environment"
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
                <option value="QA">QA</option>
                <option value="Staging">Staging</option>
                <option value="UAT">UAT</option>
                <option value="Dev">Dev</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="td-tags" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Tags
            </label>
            <input
              id="td-tags"
              type="text"
              value={addForm.tags}
              onChange={(e) => handleAddFormChange('tags', e.target.value)}
              placeholder="regression, smoke, synthetic (comma-separated)"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              disabled={addSubmitting}
            />
          </div>

          <div>
            <label htmlFor="td-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="td-description"
              value={addForm.description}
              onChange={(e) => handleAddFormChange('description', e.target.value)}
              placeholder="Brief description of the test data set"
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
                  <span>Create Data Set</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Test Data Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={handleCloseEdit}
        title={selectedDataSet ? `Edit: ${selectedDataSet.name}` : 'Edit Data Set'}
        size="lg"
      >
        {selectedDataSet && (
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
              <label htmlFor="edit-td-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Data Set Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-td-name"
                type="text"
                value={editForm.name}
                onChange={(e) => handleEditFormChange('name', e.target.value)}
                placeholder="Enter data set name"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={editSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="edit-td-type" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="edit-td-type"
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
                  <option value="Synthetic">Synthetic</option>
                  <option value="Masked">Masked</option>
                  <option value="Subset">Subset</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-td-status" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="edit-td-status"
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
                  <option value="Available">Available</option>
                  <option value="InUse">In Use</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-td-environment" className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Environment
                </label>
                <select
                  id="edit-td-environment"
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
                  <option value="QA">QA</option>
                  <option value="Staging">Staging</option>
                  <option value="UAT">UAT</option>
                  <option value="Dev">Dev</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="edit-td-size" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Size <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-td-size"
                type="text"
                value={editForm.size}
                onChange={(e) => handleEditFormChange('size', e.target.value)}
                placeholder="e.g., 2.4 GB, 890 MB"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={editSubmitting}
              />
            </div>

            <div>
              <label htmlFor="edit-td-tags" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Tags
              </label>
              <input
                id="edit-td-tags"
                type="text"
                value={editForm.tags}
                onChange={(e) => handleEditFormChange('tags', e.target.value)}
                placeholder="regression, smoke, synthetic (comma-separated)"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={editSubmitting}
              />
            </div>

            <div>
              <label htmlFor="edit-td-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="edit-td-description"
                value={editForm.description}
                onChange={(e) => handleEditFormChange('description', e.target.value)}
                placeholder="Brief description of the test data set"
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
        title="Retire Test Data Set"
        size="sm"
      >
        {selectedDataSet && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-brand-gray-700">
                  Are you sure you want to retire <strong>{selectedDataSet.name}</strong>? This will mark the data set as expired and it will no longer be available for test execution.
                </p>
                <p className="text-xs text-brand-gray-500 mt-2">
                  You can refresh the data set later to reactivate it.
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
    </div>
  );
}
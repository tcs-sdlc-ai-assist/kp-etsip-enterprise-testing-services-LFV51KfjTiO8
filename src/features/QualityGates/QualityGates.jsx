/**
 * QualityGates Component
 * Quality Gates screen (FR-017): displays quality gate definitions in DataTable
 * with criteria details (metric, threshold, actual, pass/fail), configure/edit gate modals,
 * overall status indicators. Filter by release/application/status.
 * Uses localStorage quality gate data.
 * @module QualityGates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getQualityGateData,
  getQualityGateById,
  getDistinctQualityGateStatuses,
  getDistinctReleaseApplications,
} from '../../shared/services/dashboardService.js';
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
 * localStorage key for quality gates data
 * @type {string}
 */
const QUALITY_GATES_STORAGE_KEY = 'kp_etsip_quality_gates';

/**
 * Status color mapping for charts.
 * @type {Object.<string, string>}
 */
const STATUS_COLORS = {
  Passed: '#0f9d58',
  Failed: '#ef4444',
  Pending: '#f59e0b',
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
 * Loads quality gates from localStorage.
 * @returns {Array} Array of quality gate objects
 */
function loadQualityGatesFromStorage() {
  const data = getItem(QUALITY_GATES_STORAGE_KEY, null);
  if (!data || !Array.isArray(data)) {
    return [];
  }
  return data;
}

/**
 * Saves quality gates to localStorage.
 * @param {Array} gates - Array of quality gate objects
 * @returns {boolean} True if saved successfully
 */
function saveQualityGatesToStorage(gates) {
  return setItem(QUALITY_GATES_STORAGE_KEY, gates);
}

/**
 * Generates the next unique quality gate id.
 * @param {Array} gates - Current quality gates array
 * @returns {string} Next quality gate id
 */
function generateNextQualityGateId(gates) {
  let maxNum = 0;
  for (const gate of gates) {
    const match = gate.id.match(/^qg-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `qg-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * QualityGates page component.
 * Displays quality gate definitions with filtering, CRUD actions via modals,
 * criteria details, and summary KPIs with charts.
 *
 * @returns {React.ReactElement} The quality gates page
 */
export default function QualityGates() {
  const { currentUser, role, hasPermission } = useAuth();

  const [qualityGateData, setQualityGateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    application: '',
    overallStatus: '',
  });

  // Distinct values for filter dropdowns
  const [distinctApplications, setDistinctApplications] = useState([]);
  const [distinctStatuses, setDistinctStatuses] = useState([]);

  // Modal states
  const [selectedGate, setSelectedGate] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: '',
    release: '',
    releaseId: '',
    application: '',
    description: '',
    criteria: [
      { metric: 'Unit Test Coverage', threshold: 80, actual: 0, passed: false },
      { metric: 'Integration Test Pass Rate', threshold: 95, actual: 0, passed: false },
      { metric: 'Code Quality Score', threshold: 75, actual: 0, passed: false },
      { metric: 'Security Scan', threshold: 0, actual: 0, passed: false },
      { metric: 'Regression Test Suite Pass Rate', threshold: 98, actual: 0, passed: false },
    ],
  });
  const [addFormError, setAddFormError] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    criteria: [],
    description: '',
  });
  const [editFormError, setEditFormError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  /**
   * Loads distinct filter values.
   */
  useEffect(() => {
    try {
      setDistinctStatuses(getDistinctQualityGateStatuses());
      setDistinctApplications(getDistinctReleaseApplications());
    } catch {
      // Ignore errors loading distinct values
    }
  }, []);

  /**
   * Fetches quality gate data based on current filters.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {};

      if (filterValues.application) {
        filters.application = filterValues.application;
      }

      if (filterValues.overallStatus) {
        filters.overallStatus = filterValues.overallStatus;
      }

      const result = await getQualityGateData(filters);
      setQualityGateData(result);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load quality gate data.';
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
      application: '',
      overallStatus: '',
    });
  }, []);

  /**
   * Builds the filter configuration for the FilterBar.
   */
  const filterConfig = useMemo(() => {
    return [
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
        key: 'overallStatus',
        label: 'Status',
        placeholder: 'All Statuses',
        options: distinctStatuses.map((s) => ({
          value: s,
          label: formatStatusLabel(s),
        })),
      },
    ];
  }, [distinctApplications, distinctStatuses]);

  /**
   * Quality gates from the fetched data.
   */
  const qualityGates = useMemo(() => {
    if (!qualityGateData || !qualityGateData.qualityGates) {
      return [];
    }
    return qualityGateData.qualityGates;
  }, [qualityGateData]);

  /**
   * Summary KPIs computed from quality gate data.
   */
  const summaryKPIs = useMemo(() => {
    if (!qualityGateData) {
      return null;
    }

    const total = qualityGateData.total || 0;
    const passedCount = qualityGateData.passedCount || 0;
    const failedCount = qualityGateData.failedCount || 0;
    const pendingCount = qualityGateData.pendingCount || 0;
    const passRate = qualityGateData.passRate || 0;

    // Count total criteria across all gates
    let totalCriteria = 0;
    let passedCriteria = 0;
    let failedCriteria = 0;

    for (const gate of qualityGates) {
      if (gate.criteria && Array.isArray(gate.criteria)) {
        for (const criterion of gate.criteria) {
          totalCriteria++;
          if (criterion.passed) {
            passedCriteria++;
          } else {
            failedCriteria++;
          }
        }
      }
    }

    const criteriaPassRate = totalCriteria > 0
      ? Math.round((passedCriteria / totalCriteria) * 1000) / 10
      : 0;

    return {
      total,
      passedCount,
      failedCount,
      pendingCount,
      passRate,
      totalCriteria,
      passedCriteria,
      failedCriteria,
      criteriaPassRate,
    };
  }, [qualityGateData, qualityGates]);

  /**
   * Status distribution chart data.
   */
  const statusDistributionData = useMemo(() => {
    if (!qualityGates || qualityGates.length === 0) {
      return [];
    }

    const counts = {};
    for (const gate of qualityGates) {
      const status = gate.overallStatus || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: formatStatusLabel(status),
        value: count,
        color: STATUS_COLORS[status] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, [qualityGates]);

  /**
   * Pass rate by gate type bar chart data from quality gate pass rates.
   */
  const passRateBarData = useMemo(() => {
    if (!qualityGateData || !qualityGateData.passRates || qualityGateData.passRates.length === 0) {
      return [];
    }
    return qualityGateData.passRates.map((gate) => ({
      name: gate.gateName.length > 25 ? gate.gateName.substring(0, 22) + '...' : gate.gateName,
      passRate: gate.passRate,
      passed: gate.passed,
      failed: gate.failed,
      waived: gate.waived,
    }));
  }, [qualityGateData]);

  /**
   * Pass rate bar chart config.
   */
  const passRateBarConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'passRate', name: 'Pass Rate (%)', color: '#0f9d58' },
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
   * Application distribution chart data.
   */
  const applicationDistributionData = useMemo(() => {
    if (!qualityGates || qualityGates.length === 0) {
      return [];
    }

    const counts = {};
    for (const gate of qualityGates) {
      const app = gate.application || 'Unknown';
      counts[app] = (counts[app] || 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([app, count]) => ({
        name: app.length > 20 ? app.substring(0, 17) + '...' : app,
        gates: count,
      }));
  }, [qualityGates]);

  /**
   * Application distribution bar chart config.
   */
  const applicationBarConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'gates', name: 'Quality Gates', color: '#0069cc' },
      ],
      showLegend: true,
    };
  }, []);

  /**
   * Quality gate table columns.
   */
  const qualityGateColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Quality Gate',
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
        key: 'release',
        label: 'Release',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'overallStatus',
        label: 'Status',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'criteria',
        label: 'Criteria',
        sortable: false,
        render: (value) => {
          if (!value || !Array.isArray(value)) {
            return <span className="text-xs text-brand-gray-500">—</span>;
          }
          const passed = value.filter((c) => c.passed).length;
          const total = value.length;
          const allPassed = passed === total;
          return (
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-medium ${allPassed ? 'text-brand-green-600' : 'text-red-600'}`}>
                {passed}/{total}
              </span>
              <span className="text-xs text-brand-gray-500">passed</span>
            </div>
          );
        },
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
        key: 'lastEvaluated',
        label: 'Last Evaluated',
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
   * Criteria table columns for the detail modal.
   */
  const criteriaColumns = useMemo(() => {
    return [
      {
        key: 'metric',
        label: 'Metric',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
        ),
      },
      {
        key: 'threshold',
        label: 'Threshold',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'actual',
        label: 'Actual',
        sortable: true,
        render: (value, row) => {
          let colorClass = 'text-brand-gray-700';
          if (row.passed) {
            colorClass = 'text-brand-green-600';
          } else {
            colorClass = 'text-red-600';
          }
          return (
            <span className={`text-sm font-semibold ${colorClass}`}>{value}</span>
          );
        },
      },
      {
        key: 'passed',
        label: 'Result',
        sortable: true,
        render: (value) => (
          <StatusBadge status={value ? 'Passed' : 'Failed'} size="sm" />
        ),
      },
    ];
  }, []);

  /**
   * Export data for the quality gate table.
   */
  const qualityGateExportData = useMemo(() => {
    return qualityGates.map((gate) => ({
      id: gate.id,
      name: gate.name,
      release: gate.release,
      releaseId: gate.releaseId,
      application: gate.application,
      overallStatus: gate.overallStatus,
      owner: gate.owner,
      ownerEmail: gate.ownerEmail,
      lastEvaluated: gate.lastEvaluated,
      description: gate.description,
      totalCriteria: gate.criteria ? gate.criteria.length : 0,
      passedCriteria: gate.criteria ? gate.criteria.filter((c) => c.passed).length : 0,
      failedCriteria: gate.criteria ? gate.criteria.filter((c) => !c.passed).length : 0,
    }));
  }, [qualityGates]);

  /**
   * Handles clicking a quality gate row to open the detail modal.
   *
   * @param {Object} gate - The quality gate object
   */
  const handleRowClick = useCallback((gate) => {
    setSelectedGate(gate);
    setDetailModalOpen(true);
  }, []);

  /**
   * Closes the detail modal.
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedGate(null);
  }, []);

  /**
   * Opens the add quality gate modal.
   */
  const handleOpenAdd = useCallback(() => {
    setAddForm({
      name: '',
      release: '',
      releaseId: '',
      application: '',
      description: '',
      criteria: [
        { metric: 'Unit Test Coverage', threshold: 80, actual: 0, passed: false },
        { metric: 'Integration Test Pass Rate', threshold: 95, actual: 0, passed: false },
        { metric: 'Code Quality Score', threshold: 75, actual: 0, passed: false },
        { metric: 'Security Scan', threshold: 0, actual: 0, passed: false },
        { metric: 'Regression Test Suite Pass Rate', threshold: 98, actual: 0, passed: false },
      ],
    });
    setAddFormError(null);
    setAddModalOpen(true);
  }, []);

  /**
   * Closes the add quality gate modal.
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
   * Handles add form criteria field changes.
   *
   * @param {number} index - The criteria index
   * @param {string} field - The field name
   * @param {*} value - The new value
   */
  const handleAddCriteriaChange = useCallback((index, field, value) => {
    setAddForm((prev) => {
      const newCriteria = [...prev.criteria];
      newCriteria[index] = { ...newCriteria[index], [field]: value };

      // Auto-calculate passed based on threshold and actual
      if (field === 'actual' || field === 'threshold') {
        const threshold = field === 'threshold' ? Number(value) : Number(newCriteria[index].threshold);
        const actual = field === 'actual' ? Number(value) : Number(newCriteria[index].actual);
        // For Security Scan, threshold 0 means 0 critical vulnerabilities expected
        if (newCriteria[index].metric === 'Security Scan') {
          newCriteria[index].passed = actual <= threshold;
        } else if (newCriteria[index].metric === 'Performance Benchmark (ms)') {
          newCriteria[index].passed = actual <= threshold;
        } else {
          newCriteria[index].passed = actual >= threshold;
        }
      }

      return { ...prev, criteria: newCriteria };
    });
  }, []);

  /**
   * Handles submitting the add quality gate form.
   */
  const handleAddSubmit = useCallback(async () => {
    setAddFormError(null);

    if (!addForm.name || addForm.name.trim() === '') {
      setAddFormError('Quality gate name is required.');
      return;
    }

    if (!addForm.application || addForm.application.trim() === '') {
      setAddFormError('Application is required.');
      return;
    }

    if (!addForm.release || addForm.release.trim() === '') {
      setAddFormError('Release is required.');
      return;
    }

    setAddSubmitting(true);

    try {
      const allGates = loadQualityGatesFromStorage();
      const now = new Date().toISOString();

      // Determine overall status from criteria
      const allPassed = addForm.criteria.every((c) => c.passed);
      const anyFailed = addForm.criteria.some((c) => !c.passed);
      const allZeroActual = addForm.criteria.every((c) => Number(c.actual) === 0);
      let overallStatus = 'Pending';
      if (!allZeroActual) {
        overallStatus = allPassed ? 'Passed' : 'Failed';
      }

      const newGate = {
        id: generateNextQualityGateId(allGates),
        name: addForm.name.trim(),
        release: addForm.release.trim(),
        releaseId: addForm.releaseId.trim() || `release-${addForm.release.trim().toLowerCase().replace(/\s+/g, '-')}`,
        application: addForm.application.trim(),
        criteria: addForm.criteria.map((c) => ({
          metric: c.metric,
          threshold: Number(c.threshold),
          actual: Number(c.actual),
          passed: c.passed,
        })),
        overallStatus,
        owner: currentUser ? currentUser.name : 'System',
        ownerEmail: currentUser ? currentUser.email : 'system@kp-etsip.gov',
        lastEvaluated: now,
        description: addForm.description.trim(),
        createdAt: now,
        updatedAt: now,
      };

      allGates.push(newGate);
      saveQualityGatesToStorage(allGates);

      try {
        logAction(
          'create',
          `Created new quality gate: ${newGate.name} (${newGate.id}). Application: ${newGate.application}. Status: ${newGate.overallStatus}.`,
          'Application',
          newGate.id,
          { status: 'success' }
        );
      } catch {
        // Ignore audit log errors
      }

      setAddModalOpen(false);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to create quality gate.';
      setAddFormError(errorMessage);
    } finally {
      setAddSubmitting(false);
    }
  }, [addForm, currentUser, fetchData]);

  /**
   * Opens the edit quality gate modal.
   *
   * @param {Object} gate - The quality gate to edit
   */
  const handleOpenEdit = useCallback((gate) => {
    setSelectedGate(gate);
    setEditForm({
      criteria: gate.criteria ? gate.criteria.map((c) => ({ ...c })) : [],
      description: gate.description || '',
    });
    setEditFormError(null);
    setEditModalOpen(true);
  }, []);

  /**
   * Closes the edit quality gate modal.
   */
  const handleCloseEdit = useCallback(() => {
    setEditModalOpen(false);
    setEditFormError(null);
  }, []);

  /**
   * Handles edit form criteria field changes.
   *
   * @param {number} index - The criteria index
   * @param {string} field - The field name
   * @param {*} value - The new value
   */
  const handleEditCriteriaChange = useCallback((index, field, value) => {
    setEditForm((prev) => {
      const newCriteria = [...prev.criteria];
      newCriteria[index] = { ...newCriteria[index], [field]: value };

      if (field === 'actual' || field === 'threshold') {
        const threshold = field === 'threshold' ? Number(value) : Number(newCriteria[index].threshold);
        const actual = field === 'actual' ? Number(value) : Number(newCriteria[index].actual);
        if (newCriteria[index].metric === 'Security Scan') {
          newCriteria[index].passed = actual <= threshold;
        } else if (newCriteria[index].metric === 'Performance Benchmark (ms)') {
          newCriteria[index].passed = actual <= threshold;
        } else {
          newCriteria[index].passed = actual >= threshold;
        }
      }

      return { ...prev, criteria: newCriteria };
    });
  }, []);

  /**
   * Handles submitting the edit quality gate form.
   */
  const handleEditSubmit = useCallback(async () => {
    setEditFormError(null);

    if (!selectedGate) {
      setEditFormError('No quality gate selected.');
      return;
    }

    setEditSubmitting(true);

    try {
      const allGates = loadQualityGatesFromStorage();
      const index = allGates.findIndex((g) => g.id === selectedGate.id);

      if (index === -1) {
        setEditFormError('Quality gate not found.');
        setEditSubmitting(false);
        return;
      }

      const now = new Date().toISOString();

      const updatedCriteria = editForm.criteria.map((c) => ({
        metric: c.metric,
        threshold: Number(c.threshold),
        actual: Number(c.actual),
        passed: c.passed,
      }));

      // Determine overall status from criteria
      const allPassed = updatedCriteria.every((c) => c.passed);
      const allZeroActual = updatedCriteria.every((c) => Number(c.actual) === 0);
      let overallStatus = 'Pending';
      if (!allZeroActual) {
        overallStatus = allPassed ? 'Passed' : 'Failed';
      }

      allGates[index] = {
        ...allGates[index],
        criteria: updatedCriteria,
        overallStatus,
        description: editForm.description.trim(),
        lastEvaluated: now,
        updatedAt: now,
      };

      saveQualityGatesToStorage(allGates);

      try {
        logAction(
          'update',
          `Updated quality gate: ${allGates[index].name} (${selectedGate.id}). Status: ${overallStatus}.`,
          'Application',
          selectedGate.id,
          { status: 'success', previousValue: selectedGate.overallStatus, newValue: overallStatus }
        );
      } catch {
        // Ignore audit log errors
      }

      setEditModalOpen(false);
      setDetailModalOpen(false);
      setSelectedGate(null);
      fetchData();
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to update quality gate.';
      setEditFormError(errorMessage);
    } finally {
      setEditSubmitting(false);
    }
  }, [editForm, selectedGate, fetchData]);

  /**
   * Checks if the current user can perform data entry actions.
   */
  const canEdit = useMemo(() => {
    return hasPermission('data_entry');
  }, [hasPermission]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading quality gates..." showLabel />
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

  if (!qualityGateData || qualityGates.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-gray-900">
              Quality Gates
            </h1>
            <p className="text-sm text-brand-gray-500 mt-1">
              Define and enforce quality gate criteria for releases
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
                <span>New Quality Gate</span>
              </button>
            )}
          </div>
        </div>
        <FilterBar
          filters={filterConfig}
          values={filterValues}
          onChange={handleFilterChange}
          onClearAll={handleClearAll}
          showSearch={false}
        />
        <div className="mt-6">
          <EmptyState
            title="No quality gates found"
            description="No quality gates match the selected filters. Try adjusting your filter criteria or create a new quality gate."
            actionLabel={canEdit ? 'New Quality Gate' : 'Clear Filters'}
            onAction={canEdit ? handleOpenAdd : handleClearAll}
          />
        </div>

        {/* Add Quality Gate Modal */}
        {renderAddModal()}
      </div>
    );
  }

  /**
   * Renders the add quality gate modal.
   */
  function renderAddModal() {
    return (
      <Modal
        isOpen={addModalOpen}
        onClose={handleCloseAdd}
        title="New Quality Gate"
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
            <label htmlFor="qg-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Quality Gate Name <span className="text-red-500">*</span>
            </label>
            <input
              id="qg-name"
              type="text"
              value={addForm.name}
              onChange={(e) => handleAddFormChange('name', e.target.value)}
              placeholder="Enter quality gate name"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              disabled={addSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="qg-application" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Application <span className="text-red-500">*</span>
              </label>
              <select
                id="qg-application"
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
              <label htmlFor="qg-release" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Release <span className="text-red-500">*</span>
              </label>
              <input
                id="qg-release"
                type="text"
                value={addForm.release}
                onChange={(e) => handleAddFormChange('release', e.target.value)}
                placeholder="e.g., EMIS Core v3.3.0"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                disabled={addSubmitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="qg-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="qg-description"
              value={addForm.description}
              onChange={(e) => handleAddFormChange('description', e.target.value)}
              placeholder="Brief description of the quality gate evaluation"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
              disabled={addSubmitting}
            />
          </div>

          {/* Criteria */}
          <div>
            <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
              Quality Gate Criteria
            </h3>
            <div className="space-y-3">
              {addForm.criteria.map((criterion, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-brand-gray-50 rounded-lg p-3 border border-brand-gray-200"
                >
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-brand-gray-500 mb-1">Metric</label>
                    <p className="text-sm font-medium text-brand-gray-900">{criterion.metric}</p>
                  </div>
                  <div>
                    <label htmlFor={`add-threshold-${index}`} className="block text-xs text-brand-gray-500 mb-1">Threshold</label>
                    <input
                      id={`add-threshold-${index}`}
                      type="number"
                      min="0"
                      value={criterion.threshold}
                      onChange={(e) => handleAddCriteriaChange(index, 'threshold', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                      disabled={addSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor={`add-actual-${index}`} className="block text-xs text-brand-gray-500 mb-1">Actual</label>
                    <input
                      id={`add-actual-${index}`}
                      type="number"
                      min="0"
                      value={criterion.actual}
                      onChange={(e) => handleAddCriteriaChange(index, 'actual', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                      disabled={addSubmitting}
                    />
                  </div>
                </div>
              ))}
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
                  <span>Create Quality Gate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-gray-900">
            Quality Gates
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Define, enforce, and monitor quality gate criteria for all releases across applications
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
              <span>New Quality Gate</span>
            </button>
          )}
          {qualityGateExportData.length > 0 && (
            <ExportButton
              data={qualityGateExportData}
              filename="quality-gates"
              title="Quality Gates Report"
              sheetName="Quality Gates"
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
            label="Total Gates"
            value={summaryKPIs.total}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <MetricCard
            label="Passed"
            value={summaryKPIs.passedCount}
            trend="up"
            trendValue={summaryKPIs.total > 0 ? `${Math.round((summaryKPIs.passedCount / summaryKPIs.total) * 100)}%` : '0%'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Failed"
            value={summaryKPIs.failedCount}
            trend={summaryKPIs.failedCount > 0 ? 'down' : 'up'}
            trendValue={summaryKPIs.failedCount > 0 ? 'Action needed' : 'None'}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Pending"
            value={summaryKPIs.pendingCount}
            trend={summaryKPIs.pendingCount > 3 ? 'down' : 'neutral'}
            trendValue={summaryKPIs.pendingCount > 3 ? 'Review needed' : ''}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Gate Pass Rate"
            value={summaryKPIs.passRate}
            trend={summaryKPIs.passRate >= 85 ? 'up' : summaryKPIs.passRate >= 70 ? 'neutral' : 'down'}
            trendValue={summaryKPIs.passRate >= 85 ? 'Good' : summaryKPIs.passRate >= 70 ? 'Fair' : 'Low'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <MetricCard
            label="Total Criteria"
            value={summaryKPIs.totalCriteria}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <MetricCard
            label="Criteria Passed"
            value={summaryKPIs.passedCriteria}
            trend="up"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <MetricCard
            label="Criteria Pass Rate"
            value={summaryKPIs.criteriaPassRate}
            trend={summaryKPIs.criteriaPassRate >= 90 ? 'up' : summaryKPIs.criteriaPassRate >= 80 ? 'neutral' : 'down'}
            suffix="%"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
              title="Gate Status Distribution"
              subtitle="Quality gates by overall status"
              height={280}
              loading={false}
              emptyMessage="No status data available"
            />
          </div>
        )}

        {/* Pass Rate by Gate Type */}
        {passRateBarData.length > 0 && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <ChartWrapper
              chartType="bar"
              data={passRateBarData}
              config={passRateBarConfig}
              title="Pass Rate by Gate Type"
              subtitle="Pass rate for each quality gate criterion type"
              height={280}
              loading={false}
              emptyMessage="No pass rate data available"
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
              title="Gates by Application"
              subtitle="Number of quality gates per application"
              height={280}
              loading={false}
              emptyMessage="No application data available"
            />
          </div>
        )}
      </div>

      {/* Quality Gates Table */}
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
            All Quality Gates
          </h2>
          <span className="text-sm text-brand-gray-500">
            ({qualityGates.length})
          </span>
        </div>
        <DataTable
          columns={qualityGateColumns}
          data={qualityGates}
          pageSize={10}
          selectable={false}
          searchFields={['name', 'application', 'release', 'overallStatus', 'owner', 'description']}
          emptyMessage="No quality gates match the selected filters."
          rowKeyField="id"
          onRowClick={handleRowClick}
          storageKey="quality-gates-table"
        />
      </div>

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{qualityGates.filter((g) => g.overallStatus === 'Passed').length} Passed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{qualityGates.filter((g) => g.overallStatus === 'Failed').length} Failed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{qualityGates.filter((g) => g.overallStatus === 'Pending').length} Pending</span>
          </div>
          {summaryKPIs && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              <span>Gate Pass Rate: {summaryKPIs.passRate}%</span>
            </div>
          )}
          {summaryKPIs && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-green-500" />
              <span>Criteria Pass Rate: {summaryKPIs.criteriaPassRate}%</span>
            </div>
          )}
          <div className="ml-auto text-[10px] text-brand-gray-400">
            {qualityGates.length} total quality gates
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
        title={selectedGate ? selectedGate.name : ''}
        size="xl"
      >
        {selectedGate && (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedGate.overallStatus} size="md" />
              {selectedGate.criteria && (
                <span className="text-sm text-brand-gray-500">
                  {selectedGate.criteria.filter((c) => c.passed).length}/{selectedGate.criteria.length} criteria passed
                </span>
              )}
            </div>

            {/* Description */}
            {selectedGate.description && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-sm text-brand-gray-700 leading-relaxed">
                  {selectedGate.description}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Application</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedGate.application}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Release</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedGate.release}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Owner</p>
                <p className="text-sm font-medium text-brand-gray-900">{selectedGate.owner}</p>
                {selectedGate.ownerEmail && (
                  <p className="text-xs text-brand-gray-500 truncate">{selectedGate.ownerEmail}</p>
                )}
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Last Evaluated</p>
                <p className="text-sm font-medium text-brand-gray-900">
                  {formatDisplayDate(selectedGate.lastEvaluated) || '—'}
                </p>
              </div>
            </div>

            {/* Overall Status Indicator */}
            <div className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedGate.overallStatus === 'Passed' ? 'bg-brand-green-100' :
                    selectedGate.overallStatus === 'Failed' ? 'bg-red-100' :
                    'bg-yellow-100'
                  }`}>
                    {selectedGate.overallStatus === 'Passed' ? (
                      <svg className="w-5 h-5 text-brand-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : selectedGate.overallStatus === 'Failed' ? (
                      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-gray-900">
                      Overall Status: {formatStatusLabel(selectedGate.overallStatus)}
                    </p>
                    {selectedGate.criteria && (
                      <p className="text-xs text-brand-gray-500">
                        {selectedGate.criteria.filter((c) => c.passed).length} of {selectedGate.criteria.length} criteria met
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={selectedGate.overallStatus} size="md" />
              </div>
            </div>

            {/* Criteria Table */}
            {selectedGate.criteria && selectedGate.criteria.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                  Quality Gate Criteria ({selectedGate.criteria.length})
                </h3>
                <DataTable
                  columns={criteriaColumns}
                  data={selectedGate.criteria.map((c, i) => ({ ...c, id: `criterion-${i}` }))}
                  pageSize={10}
                  selectable={false}
                  searchFields={['metric']}
                  emptyMessage="No criteria defined for this quality gate."
                  rowKeyField="id"
                  storageKey={`qg-detail-criteria-${selectedGate.id}`}
                />
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-brand-gray-600">
              {selectedGate.createdAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Created: {formatDisplayDate(selectedGate.createdAt)}</span>
                </div>
              )}
              {selectedGate.updatedAt && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Updated: {formatDisplayDate(selectedGate.updatedAt)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => handleOpenEdit(selectedGate)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Criteria</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Quality Gate Modal */}
      {renderAddModal()}

      {/* Edit Quality Gate Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={handleCloseEdit}
        title={selectedGate ? `Edit: ${selectedGate.name}` : 'Edit Quality Gate'}
        size="lg"
      >
        {selectedGate && (
          <div className="space-y-4">
            {editFormError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{editFormError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm text-brand-gray-600">
              <span>Application:</span>
              <span className="font-medium text-brand-gray-900">{selectedGate.application}</span>
              <span className="text-brand-gray-400">·</span>
              <span>Release:</span>
              <span className="font-medium text-brand-gray-900">{selectedGate.release}</span>
            </div>

            <div>
              <label htmlFor="edit-qg-description" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="edit-qg-description"
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the quality gate evaluation"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
                disabled={editSubmitting}
              />
            </div>

            {/* Criteria */}
            <div>
              <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                Quality Gate Criteria
              </h3>
              <div className="space-y-3">
                {editForm.criteria.map((criterion, index) => (
                  <div
                    key={index}
                    className={`grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-lg p-3 border ${
                      criterion.passed ? 'bg-brand-green-50 border-brand-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-brand-gray-500 mb-1">Metric</label>
                      <p className="text-sm font-medium text-brand-gray-900">{criterion.metric}</p>
                    </div>
                    <div>
                      <label htmlFor={`edit-threshold-${index}`} className="block text-xs text-brand-gray-500 mb-1">Threshold</label>
                      <input
                        id={`edit-threshold-${index}`}
                        type="number"
                        min="0"
                        value={criterion.threshold}
                        onChange={(e) => handleEditCriteriaChange(index, 'threshold', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                        disabled={editSubmitting}
                      />
                    </div>
                    <div>
                      <label htmlFor={`edit-actual-${index}`} className="block text-xs text-brand-gray-500 mb-1">Actual</label>
                      <input
                        id={`edit-actual-${index}`}
                        type="number"
                        min="0"
                        value={criterion.actual}
                        onChange={(e) => handleEditCriteriaChange(index, 'actual', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                        disabled={editSubmitting}
                      />
                    </div>
                  </div>
                ))}
              </div>
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
    </div>
  );
}
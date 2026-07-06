/**
 * AuditLogPanel Component
 * Reusable audit log panel that displays a filterable, paginated table of audit log entries.
 * Accepts optional entityType and entityId filters to scope logs.
 * Uses auditLogService for data retrieval.
 * @module AuditLogPanel
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  getAuditLogs,
  getDistinctActions,
  getDistinctEntityTypes,
  getDistinctActorRoles,
  getDistinctStatuses,
} from '../services/auditLogService.js';
import DataTable from './DataTable.jsx';
import FilterBar from './FilterBar.jsx';
import StatusBadge from './StatusBadge.jsx';
import ExportButton from './ExportButton.jsx';
import { formatDate } from '../utils/helpers.js';
import { ITEMS_PER_PAGE } from '../constants.js';

/**
 * Formats a timestamp into a human-readable date/time string.
 *
 * @param {string} timestamp - ISO 8601 timestamp
 * @returns {string} Formatted date/time string
 */
function formatTimestamp(timestamp) {
  if (!timestamp) {
    return '';
  }

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '';
    }

    return formatDate(timestamp, {
      locale: 'en-ZA',
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
 * Returns an icon SVG for a given action type.
 *
 * @param {string} action - The audit log action type
 * @returns {React.ReactElement} SVG icon element
 */
function ActionIcon({ action }) {
  const baseClass = 'w-4 h-4 flex-shrink-0';

  switch (action) {
    case 'login':
      return (
        <svg className={`${baseClass} text-brand-green-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      );
    case 'logout':
      return (
        <svg className={`${baseClass} text-brand-gray-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      );
    case 'create':
      return (
        <svg className={`${baseClass} text-brand-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      );
    case 'update':
      return (
        <svg className={`${baseClass} text-yellow-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case 'delete':
      return (
        <svg className={`${baseClass} text-red-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    case 'approve':
      return (
        <svg className={`${baseClass} text-brand-green-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'reject':
      return (
        <svg className={`${baseClass} text-red-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'access_denied':
      return (
        <svg className={`${baseClass} text-red-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      );
    case 'export':
    case 'data_export':
      return (
        <svg className={`${baseClass} text-brand-blue-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      );
    case 'config_change':
      return (
        <svg className={`${baseClass} text-orange-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'role_change':
    case 'password_reset':
      return (
        <svg className={`${baseClass} text-purple-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      );
    case 'data_import':
      return (
        <svg className={`${baseClass} text-brand-green-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      );
    case 'view':
      return (
        <svg className={`${baseClass} text-brand-gray-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
    default:
      return (
        <svg className={`${baseClass} text-brand-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
  }
}

ActionIcon.propTypes = {
  action: PropTypes.string,
};

ActionIcon.defaultProps = {
  action: '',
};

/**
 * Formats an action string for display.
 *
 * @param {string} action - The raw action string
 * @returns {string} Formatted display label
 */
function formatActionLabel(action) {
  if (!action || typeof action !== 'string') {
    return 'Unknown';
  }

  return action
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * AuditLogPanel component for displaying a filterable, paginated table of audit log entries.
 * Supports scoping by entityType and entityId for contextual audit trail views.
 *
 * @param {Object} props - Component props
 * @param {string} [props.entityType] - Optional entity type filter to scope logs (e.g., 'User', 'Application')
 * @param {string} [props.entityId] - Optional entity id filter to scope logs
 * @param {string} [props.title] - Optional panel title (defaults to 'Audit Log')
 * @param {number} [props.pageSize] - Number of rows per page (defaults to ITEMS_PER_PAGE)
 * @param {boolean} [props.showExport] - Whether to show the export button (defaults to true)
 * @param {boolean} [props.compact] - Whether to use compact styling (defaults to false)
 * @param {string} [props.className] - Additional CSS classes for the panel container
 * @param {Function} [props.onEntryClick] - Callback when an audit log entry is clicked, receives the entry object
 * @returns {React.ReactElement} The audit log panel component
 */
export default function AuditLogPanel({
  entityType,
  entityId,
  title,
  pageSize,
  showExport,
  compact,
  className,
  onEntryClick,
}) {
  const effectiveTitle = title || 'Audit Log';
  const effectivePageSize = pageSize || ITEMS_PER_PAGE;
  const effectiveShowExport = showExport !== false;

  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filterValues, setFilterValues] = useState({
    action: '',
    entityType: entityType || '',
    actorRole: '',
    status: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Distinct values for filter dropdowns
  const [distinctActions, setDistinctActions] = useState([]);
  const [distinctEntityTypes, setDistinctEntityTypes] = useState([]);
  const [distinctActorRoles, setDistinctActorRoles] = useState([]);
  const [distinctStatuses, setDistinctStatuses] = useState([]);

  /**
   * Loads distinct filter values from the audit log service.
   */
  useEffect(() => {
    try {
      setDistinctActions(getDistinctActions());
      setDistinctEntityTypes(getDistinctEntityTypes());
      setDistinctActorRoles(getDistinctActorRoles());
      setDistinctStatuses(getDistinctStatuses());
    } catch {
      // Ignore errors loading distinct values
    }
  }, []);

  /**
   * Fetches audit logs based on current filters.
   */
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {};

      if (filterValues.action) {
        filters.action = filterValues.action;
      }

      // If entityType prop is provided, always use it; otherwise use filter value
      if (entityType) {
        filters.entityType = entityType;
      } else if (filterValues.entityType) {
        filters.entityType = filterValues.entityType;
      }

      if (entityId) {
        filters.entityId = entityId;
      }

      if (filterValues.actorRole) {
        filters.actorRole = filterValues.actorRole;
      }

      if (filterValues.status) {
        filters.status = filterValues.status;
      }

      if (searchTerm && searchTerm.trim() !== '') {
        filters.searchTerm = searchTerm.trim();
      }

      const result = await getAuditLogs(filters);

      setLogs(result.logs || []);
      setTotalLogs(result.total || 0);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load audit logs.';
      setError(errorMessage);
      setLogs([]);
      setTotalLogs(0);
    } finally {
      setLoading(false);
    }
  }, [filterValues, searchTerm, entityType, entityId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
   * Handles search input changes.
   *
   * @param {string} term - The search term
   */
  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  /**
   * Handles clearing all filters.
   */
  const handleClearAll = useCallback(() => {
    setFilterValues({
      action: '',
      entityType: entityType || '',
      actorRole: '',
      status: '',
    });
    setSearchTerm('');
  }, [entityType]);

  /**
   * Handles export of audit log data.
   *
   * @param {Object[]} data - The data to export
   */
  const handleExport = useCallback((data) => {
    // ExportButton handles the actual export; this is a pass-through
  }, []);

  /**
   * Builds the filter configuration for the FilterBar.
   */
  const filterConfig = useMemo(() => {
    const filters = [
      {
        key: 'action',
        label: 'Action',
        placeholder: 'All Actions',
        options: distinctActions.map((action) => ({
          value: action,
          label: formatActionLabel(action),
        })),
      },
    ];

    // Only show entity type filter if not scoped by prop
    if (!entityType) {
      filters.push({
        key: 'entityType',
        label: 'Entity Type',
        placeholder: 'All Entity Types',
        options: distinctEntityTypes.map((type) => ({
          value: type,
          label: type,
        })),
      });
    }

    filters.push(
      {
        key: 'actorRole',
        label: 'Actor Role',
        placeholder: 'All Roles',
        options: distinctActorRoles.map((role) => ({
          value: role,
          label: role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        })),
      },
      {
        key: 'status',
        label: 'Status',
        placeholder: 'All Statuses',
        options: distinctStatuses.map((status) => ({
          value: status,
          label: status.charAt(0).toUpperCase() + status.slice(1),
        })),
      }
    );

    return filters;
  }, [distinctActions, distinctEntityTypes, distinctActorRoles, distinctStatuses, entityType]);

  /**
   * Builds the column configuration for the DataTable.
   */
  const columns = useMemo(() => {
    const cols = [
      {
        key: 'action',
        label: 'Action',
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <ActionIcon action={value} />
            <span className="text-sm font-medium text-brand-gray-900">
              {formatActionLabel(value)}
            </span>
          </div>
        ),
      },
      {
        key: 'actor',
        label: 'Actor',
        sortable: true,
        render: (value, row) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-gray-900 truncate">
              {value}
            </p>
            <p className="text-xs text-brand-gray-500 truncate">
              {row.actorRole ? row.actorRole.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : ''}
            </p>
          </div>
        ),
      },
      {
        key: 'details',
        label: 'Details',
        sortable: false,
        render: (value) => (
          <p className={`text-sm text-brand-gray-700 ${compact ? 'truncate max-w-xs' : 'line-clamp-2 max-w-md'}`}>
            {value}
          </p>
        ),
      },
      {
        key: 'entityType',
        label: 'Entity Type',
        sortable: true,
        render: (value) => (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-gray-100 text-brand-gray-700 ring-1 ring-inset ring-brand-gray-300">
            {value}
          </span>
        ),
      },
      {
        key: 'entityId',
        label: 'Entity ID',
        sortable: true,
        render: (value) => (
          <span className="text-xs font-mono text-brand-gray-600">
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
        key: 'timestamp',
        label: 'Timestamp',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-500 whitespace-nowrap">
            {formatTimestamp(value)}
          </span>
        ),
      },
    ];

    // Hide entityType column if scoped by prop
    if (entityType) {
      return cols.filter((col) => col.key !== 'entityType');
    }

    // Hide entityId column if scoped by entityId prop
    if (entityId) {
      return cols.filter((col) => col.key !== 'entityId');
    }

    return cols;
  }, [entityType, entityId, compact]);

  /**
   * Handles row click on the DataTable.
   *
   * @param {Object} row - The clicked row data
   */
  const handleRowClick = useCallback(
    (row) => {
      if (typeof onEntryClick === 'function') {
        onEntryClick(row);
      }
    },
    [onEntryClick]
  );

  /**
   * Prepares data for export by flattening relevant fields.
   */
  const exportData = useMemo(() => {
    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      actor: log.actor,
      actorEmail: log.actorEmail,
      actorRole: log.actorRole,
      timestamp: log.timestamp,
      details: log.details,
      entityType: log.entityType,
      entityId: log.entityId,
      ipAddress: log.ipAddress,
      status: log.status,
      previousValue: log.previousValue || '',
      newValue: log.newValue || '',
    }));
  }, [logs]);

  return (
    <div className={`w-full${className ? ` ${className}` : ''}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
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
              {effectiveTitle}
            </h2>
          </div>
          {entityType && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
              {entityType}
              {entityId ? `: ${entityId}` : ''}
            </span>
          )}
        </div>

        {effectiveShowExport && logs.length > 0 && (
          <ExportButton
            data={exportData}
            filename={`audit-log${entityType ? `-${entityType}` : ''}${entityId ? `-${entityId}` : ''}`}
            title="Audit Log Export"
            sheetName="Audit Logs"
            label="Export"
            size="sm"
            showPowerBI={false}
          />
        )}
      </div>

      {/* Filters */}
      <div className="mb-4">
        <FilterBar
          filters={filterConfig}
          values={filterValues}
          onChange={handleFilterChange}
          onClearAll={handleClearAll}
          showSearch={true}
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search logs..."
        />
      </div>

      {/* Error message */}
      {error && (
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
            onClick={fetchLogs}
            className="ml-auto text-sm font-medium text-red-600 hover:text-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-sm text-brand-gray-400">Loading audit logs...</p>
          </div>
        </div>
      )}

      {/* Data table */}
      {!loading && (
        <DataTable
          columns={columns}
          data={logs}
          pageSize={effectivePageSize}
          selectable={false}
          searchFields={['action', 'actor', 'details', 'entityType', 'entityId', 'status']}
          emptyMessage={
            entityType
              ? `No audit log entries found for ${entityType}${entityId ? ` (${entityId})` : ''}.`
              : 'No audit log entries found matching the current filters.'
          }
          rowKeyField="id"
          onRowClick={onEntryClick ? handleRowClick : undefined}
          onExport={effectiveShowExport ? handleExport : undefined}
          storageKey={`audit-log-panel${entityType ? `-${entityType}` : ''}`}
        />
      )}

      {/* Summary footer */}
      {!loading && logs.length > 0 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <p className="text-xs text-brand-gray-400">
            {totalLogs} total audit log {totalLogs === 1 ? 'entry' : 'entries'}
            {entityType ? ` for ${entityType}` : ''}
            {entityId ? ` (${entityId})` : ''}
          </p>
          <div className="flex items-center gap-3">
            {logs.filter((l) => l.status === 'success').length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-brand-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green-500" />
                {logs.filter((l) => l.status === 'success').length} success
              </span>
            )}
            {logs.filter((l) => l.status === 'failure').length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {logs.filter((l) => l.status === 'failure').length} failure
              </span>
            )}
            {logs.filter((l) => l.status === 'warning').length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                {logs.filter((l) => l.status === 'warning').length} warning
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

AuditLogPanel.propTypes = {
  entityType: PropTypes.string,
  entityId: PropTypes.string,
  title: PropTypes.string,
  pageSize: PropTypes.number,
  showExport: PropTypes.bool,
  compact: PropTypes.bool,
  className: PropTypes.string,
  onEntryClick: PropTypes.func,
};

AuditLogPanel.defaultProps = {
  entityType: undefined,
  entityId: undefined,
  title: 'Audit Log',
  pageSize: undefined,
  showExport: true,
  compact: false,
  className: undefined,
  onEntryClick: undefined,
};
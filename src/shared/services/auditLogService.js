/**
 * Audit Log Service (AuditLogManager / AuditLogService)
 * Manages audit log entries with localStorage persistence, filtering, PII masking, and export.
 * Implements both LLD AuditLogManager and AuditLogService interfaces.
 * @module auditLogService
 */

import { getItem, setItem, maskPII } from './storage.js';
import { getSession } from './authManager.js';
import mockAuditLogs from '../data/mockAuditLogs.js';

/**
 * localStorage key for audit log entries
 * @type {string}
 */
const AUDIT_LOGS_STORAGE_KEY = 'kp_etsip_audit_logs';

/**
 * Maximum number of audit log entries to retain in localStorage
 * @type {number}
 */
const MAX_LOG_ENTRIES = 500;

/**
 * Simulated network delay in milliseconds from environment config.
 * @type {number}
 */
const MOCK_DELAY_MS = parseInt(import.meta.env.VITE_MOCK_DELAY_MS || '300', 10);

/**
 * Returns a promise that resolves after the configured mock delay.
 * @returns {Promise<void>}
 */
function simulateDelay() {
  if (MOCK_DELAY_MS <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

/**
 * Loads audit logs from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockAuditLogs.js').MockAuditLog[]} Array of audit log entries
 */
function loadLogs() {
  let logs = getItem(AUDIT_LOGS_STORAGE_KEY, null);
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    logs = JSON.parse(JSON.stringify(mockAuditLogs));
    setItem(AUDIT_LOGS_STORAGE_KEY, logs);
  }
  return logs;
}

/**
 * Persists the audit logs array to localStorage.
 * @param {import('../data/mockAuditLogs.js').MockAuditLog[]} logs - Array of audit log entries
 * @returns {boolean} True if persisted successfully
 */
function saveLogs(logs) {
  return setItem(AUDIT_LOGS_STORAGE_KEY, logs);
}

/**
 * Generates the next unique audit log id based on existing logs.
 * @param {import('../data/mockAuditLogs.js').MockAuditLog[]} logs - Current logs array
 * @returns {string} Next audit log id (e.g., 'audit-log-066')
 */
function generateNextLogId(logs) {
  let maxNum = 0;
  for (const log of logs) {
    const match = log.id.match(/^audit-log-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `audit-log-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Logs an action to the audit trail.
 * Automatically captures the current session user as the actor.
 * Enforces the maximum log entry limit by removing oldest entries.
 *
 * @param {string} action - Action performed: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'export' | 'approve' | 'reject' | 'role_change' | 'password_reset' | 'access_denied' | 'config_change' | 'data_import' | 'data_export' | 'view'
 * @param {string} details - Human-readable description of the action
 * @param {string} entityType - Type of entity affected: 'User' | 'Role' | 'Application' | 'Release' | 'DemandItem' | 'TestAsset' | 'Execution' | 'Environment' | 'Integration' | 'GovernanceProcedure' | 'Notification' | 'Schedule' | 'Report' | 'Budget' | 'System'
 * @param {string} entityId - Identifier of the affected entity
 * @param {Object} [options] - Optional additional fields
 * @param {string} [options.previousValue] - Previous value before change
 * @param {string} [options.newValue] - New value after change
 * @param {string} [options.status] - Outcome status: 'success' | 'failure' | 'warning' (defaults to 'success')
 * @param {string} [options.actor] - Override actor name (fake PII)
 * @param {string} [options.actorEmail] - Override actor email (fake PII)
 * @param {string} [options.actorRole] - Override actor role
 * @param {string} [options.ipAddress] - Simulated IP address
 * @returns {import('../data/mockAuditLogs.js').MockAuditLog} The created audit log entry
 */
export function logAction(action, details, entityType, entityId, options = {}) {
  if (!action || typeof action !== 'string') {
    throw new Error('Action is required and must be a string.');
  }

  if (!details || typeof details !== 'string') {
    throw new Error('Details is required and must be a string.');
  }

  if (!entityType || typeof entityType !== 'string') {
    throw new Error('EntityType is required and must be a string.');
  }

  if (!entityId || typeof entityId !== 'string') {
    throw new Error('EntityId is required and must be a string.');
  }

  const session = getSession();

  const actor = options.actor || (session ? session.name : 'System');
  const actorEmail = options.actorEmail || (session ? session.email : 'system@kp-etsip.gov');
  const actorRole = options.actorRole || (session ? session.role : 'admin');

  const logs = loadLogs();

  const entry = {
    id: generateNextLogId(logs),
    action,
    actor,
    actorEmail,
    actorRole,
    timestamp: new Date().toISOString(),
    details,
    entityType,
    entityId,
    ipAddress: options.ipAddress || '192.168.10.1',
    status: options.status || 'success',
  };

  if (options.previousValue !== undefined) {
    entry.previousValue = options.previousValue;
  }

  if (options.newValue !== undefined) {
    entry.newValue = options.newValue;
  }

  logs.unshift(entry);

  // Enforce maximum log entries
  if (logs.length > MAX_LOG_ENTRIES) {
    logs.length = MAX_LOG_ENTRIES;
  }

  saveLogs(logs);

  return entry;
}

/**
 * @typedef {Object} AuditLogFilter
 * @property {string} [action] - Filter by action type
 * @property {string} [actor] - Filter by actor name (partial match, case-insensitive)
 * @property {string} [actorRole] - Filter by actor role
 * @property {string} [entityType] - Filter by entity type
 * @property {string} [entityId] - Filter by entity id
 * @property {string} [status] - Filter by status: 'success' | 'failure' | 'warning'
 * @property {string} [startDate] - Filter by start date (ISO 8601, inclusive)
 * @property {string} [endDate] - Filter by end date (ISO 8601, inclusive)
 * @property {string} [searchTerm] - Search term to match against details, actor, or entityId (case-insensitive)
 * @property {number} [limit] - Maximum number of results to return
 * @property {number} [offset] - Number of results to skip (for pagination)
 */

/**
 * Retrieves audit log entries with optional filtering.
 * Results are returned in reverse chronological order (newest first).
 *
 * @param {AuditLogFilter} [filters] - Optional filter criteria
 * @returns {Promise<{logs: import('../data/mockAuditLogs.js').MockAuditLog[], total: number}>} Filtered logs and total count before pagination
 */
export async function getAuditLogs(filters = {}) {
  await simulateDelay();

  let logs = loadLogs();

  // Sort by timestamp descending (newest first)
  logs.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });

  // Apply filters
  if (filters.action) {
    logs = logs.filter((log) => log.action === filters.action);
  }

  if (filters.actor) {
    const actorLower = filters.actor.toLowerCase();
    logs = logs.filter((log) => log.actor.toLowerCase().includes(actorLower));
  }

  if (filters.actorRole) {
    logs = logs.filter((log) => log.actorRole === filters.actorRole);
  }

  if (filters.entityType) {
    logs = logs.filter((log) => log.entityType === filters.entityType);
  }

  if (filters.entityId) {
    logs = logs.filter((log) => log.entityId === filters.entityId);
  }

  if (filters.status) {
    logs = logs.filter((log) => log.status === filters.status);
  }

  if (filters.startDate) {
    const startTime = new Date(filters.startDate).getTime();
    if (!isNaN(startTime)) {
      logs = logs.filter((log) => new Date(log.timestamp).getTime() >= startTime);
    }
  }

  if (filters.endDate) {
    const endTime = new Date(filters.endDate).getTime();
    if (!isNaN(endTime)) {
      logs = logs.filter((log) => new Date(log.timestamp).getTime() <= endTime);
    }
  }

  if (filters.searchTerm) {
    const termLower = filters.searchTerm.toLowerCase();
    logs = logs.filter((log) =>
      log.details.toLowerCase().includes(termLower) ||
      log.actor.toLowerCase().includes(termLower) ||
      log.entityId.toLowerCase().includes(termLower) ||
      log.action.toLowerCase().includes(termLower)
    );
  }

  const total = logs.length;

  // Apply pagination
  if (filters.offset !== undefined && filters.offset > 0) {
    logs = logs.slice(filters.offset);
  }

  if (filters.limit !== undefined && filters.limit > 0) {
    logs = logs.slice(0, filters.limit);
  }

  return { logs, total };
}

/**
 * Retrieves all audit log entries without filtering (synchronous).
 * Results are returned in reverse chronological order (newest first).
 *
 * @returns {import('../data/mockAuditLogs.js').MockAuditLog[]} All audit log entries
 */
export function getAllLogs() {
  const logs = loadLogs();
  logs.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });
  return logs;
}

/**
 * Retrieves a single audit log entry by its id.
 *
 * @param {string} id - The audit log entry id
 * @returns {import('../data/mockAuditLogs.js').MockAuditLog|null} The audit log entry or null if not found
 */
export function getLogById(id) {
  if (!id) {
    return null;
  }
  const logs = loadLogs();
  return logs.find((log) => log.id === id) || null;
}

/**
 * Returns audit logs for a specific entity.
 *
 * @param {string} entityType - The entity type
 * @param {string} entityId - The entity id
 * @returns {import('../data/mockAuditLogs.js').MockAuditLog[]} Array of matching audit log entries
 */
export function getLogsByEntity(entityType, entityId) {
  if (!entityType || !entityId) {
    return [];
  }
  const logs = loadLogs();
  return logs
    .filter((log) => log.entityType === entityType && log.entityId === entityId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Returns audit logs for a specific actor.
 *
 * @param {string} actorEmail - The actor's email address
 * @returns {import('../data/mockAuditLogs.js').MockAuditLog[]} Array of matching audit log entries
 */
export function getLogsByActor(actorEmail) {
  if (!actorEmail) {
    return [];
  }
  const logs = loadLogs();
  return logs
    .filter((log) => log.actorEmail === actorEmail)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Returns the distinct action types present in the audit logs.
 *
 * @returns {string[]} Array of unique action type strings
 */
export function getDistinctActions() {
  const logs = loadLogs();
  const actions = new Set();
  for (const log of logs) {
    actions.add(log.action);
  }
  return Array.from(actions).sort();
}

/**
 * Returns the distinct entity types present in the audit logs.
 *
 * @returns {string[]} Array of unique entity type strings
 */
export function getDistinctEntityTypes() {
  const logs = loadLogs();
  const types = new Set();
  for (const log of logs) {
    types.add(log.entityType);
  }
  return Array.from(types).sort();
}

/**
 * Returns the distinct actor roles present in the audit logs.
 *
 * @returns {string[]} Array of unique actor role strings
 */
export function getDistinctActorRoles() {
  const logs = loadLogs();
  const roles = new Set();
  for (const log of logs) {
    roles.add(log.actorRole);
  }
  return Array.from(roles).sort();
}

/**
 * Returns the distinct statuses present in the audit logs.
 *
 * @returns {string[]} Array of unique status strings
 */
export function getDistinctStatuses() {
  const logs = loadLogs();
  const statuses = new Set();
  for (const log of logs) {
    statuses.add(log.status);
  }
  return Array.from(statuses).sort();
}

/**
 * Returns a summary of audit log counts grouped by action type.
 *
 * @returns {Object.<string, number>} Object mapping action types to counts
 */
export function getLogCountByAction() {
  const logs = loadLogs();
  const counts = {};
  for (const log of logs) {
    counts[log.action] = (counts[log.action] || 0) + 1;
  }
  return counts;
}

/**
 * Returns a summary of audit log counts grouped by status.
 *
 * @returns {Object.<string, number>} Object mapping statuses to counts
 */
export function getLogCountByStatus() {
  const logs = loadLogs();
  const counts = {};
  for (const log of logs) {
    counts[log.status] = (counts[log.status] || 0) + 1;
  }
  return counts;
}

/**
 * Returns a summary of audit log counts grouped by entity type.
 *
 * @returns {Object.<string, number>} Object mapping entity types to counts
 */
export function getLogCountByEntityType() {
  const logs = loadLogs();
  const counts = {};
  for (const log of logs) {
    counts[log.entityType] = (counts[log.entityType] || 0) + 1;
  }
  return counts;
}

/**
 * Clears all audit log entries from localStorage.
 * Logs the clear action itself before clearing.
 *
 * @returns {boolean} True if logs were cleared successfully
 */
export function clearLogs() {
  try {
    logAction('delete', 'All audit logs cleared by administrator.', 'System', 'audit-logs', {
      status: 'success',
    });
  } catch {
    // Ignore logging errors during clear
  }

  return setItem(AUDIT_LOGS_STORAGE_KEY, []);
}

/**
 * Exports all audit log entries with PII fields masked for safe reporting.
 *
 * @returns {Object[]} Array of masked audit log entries
 */
export function exportMaskedLogs() {
  const logs = loadLogs();
  return logs.map((log) => maskPII(log));
}

/**
 * Exports all audit log entries as-is (for authorized users only).
 * The caller is responsible for checking authorization before calling this.
 *
 * @returns {import('../data/mockAuditLogs.js').MockAuditLog[]} Array of all audit log entries
 */
export function exportLogs() {
  return JSON.parse(JSON.stringify(loadLogs()));
}

/**
 * Resets the audit log repository to the original mock data.
 * Useful for testing or resetting the application state.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetAuditLogs() {
  const freshLogs = JSON.parse(JSON.stringify(mockAuditLogs));
  return saveLogs(freshLogs);
}

/**
 * Returns the total number of audit log entries.
 *
 * @returns {number} Total count of audit log entries
 */
export function getLogCount() {
  const logs = loadLogs();
  return logs.length;
}

/**
 * Returns recent audit log entries up to the specified limit.
 *
 * @param {number} [limit=10] - Maximum number of recent entries to return
 * @returns {import('../data/mockAuditLogs.js').MockAuditLog[]} Array of recent audit log entries
 */
export function getRecentLogs(limit = 10) {
  const logs = loadLogs();
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return logs.slice(0, limit);
}

/**
 * Returns audit logs that indicate failures or warnings.
 *
 * @returns {import('../data/mockAuditLogs.js').MockAuditLog[]} Array of failure/warning audit log entries
 */
export function getFailureLogs() {
  const logs = loadLogs();
  return logs
    .filter((log) => log.status === 'failure' || log.status === 'warning')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Returns audit logs related to security events (access_denied, login failures, role_change, password_reset).
 *
 * @returns {import('../data/mockAuditLogs.js').MockAuditLog[]} Array of security-related audit log entries
 */
export function getSecurityLogs() {
  const securityActions = new Set(['access_denied', 'role_change', 'password_reset', 'config_change']);
  const logs = loadLogs();
  return logs
    .filter((log) => securityActions.has(log.action) || (log.action === 'login' && log.status === 'failure'))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
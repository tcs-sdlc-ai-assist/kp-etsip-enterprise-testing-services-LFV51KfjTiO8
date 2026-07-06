/**
 * Platform Administration Service (PlatformAdminManager)
 * Manages platform configuration, retention policies, system health, and integrations.
 * Implements LLD PlatformAdminManager interface with localStorage persistence.
 * @module platformAdminService
 */

import { getItem, setItem } from './storage.js';
import { logAction } from './auditLogService.js';
import { getSession } from './authManager.js';
import mockIntegrations from '../data/mockIntegrations.js';

/**
 * localStorage keys for platform admin data
 * @type {Object.<string, string>}
 */
const STORAGE_KEYS = {
  PLATFORM_CONFIG: 'kp_etsip_platform_config',
  RETENTION_POLICIES: 'kp_etsip_retention_policies',
  INTEGRATIONS: 'kp_etsip_integrations',
};

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

// ---------------------------------------------------------------------------
// Default Data
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PlatformConfig
 * @property {string} appTitle - Application title displayed in the browser tab and header
 * @property {string} defaultRole - Default user role for development
 * @property {number} mockDelayMs - Simulated network delay in milliseconds
 * @property {number} defaultPageSize - Default number of items per page for paginated views
 * @property {string} dateFormat - Default date format used across the application
 * @property {string} theme - Current theme: 'light' | 'dark'
 * @property {string} language - Current language code
 * @property {boolean} maintenanceMode - Whether the platform is in maintenance mode
 * @property {string} maintenanceMessage - Message displayed during maintenance mode
 * @property {boolean} auditLoggingEnabled - Whether audit logging is enabled
 * @property {boolean} notificationsEnabled - Whether notifications are enabled
 * @property {number} sessionTimeoutMinutes - Session timeout in minutes
 * @property {number} maxLoginAttempts - Maximum number of login attempts before lockout
 * @property {string} lastUpdated - ISO 8601 timestamp of last configuration update
 * @property {string} updatedBy - Name of the person who last updated the configuration
 */

/**
 * Default platform configuration
 * @type {PlatformConfig}
 */
const DEFAULT_PLATFORM_CONFIG = {
  appTitle: import.meta.env.VITE_APP_TITLE || 'KP-ETSIP',
  defaultRole: import.meta.env.VITE_DEFAULT_ROLE || 'viewer',
  mockDelayMs: parseInt(import.meta.env.VITE_MOCK_DELAY_MS || '300', 10),
  defaultPageSize: 10,
  dateFormat: 'YYYY-MM-DD',
  theme: 'light',
  language: 'en',
  maintenanceMode: false,
  maintenanceMessage: 'The system is currently undergoing scheduled maintenance. Please try again later.',
  auditLoggingEnabled: true,
  notificationsEnabled: true,
  sessionTimeoutMinutes: 30,
  maxLoginAttempts: 5,
  lastUpdated: '2024-06-13T10:00:00Z',
  updatedBy: 'Leonard Haufiku',
};

/**
 * @typedef {Object} RetentionPolicy
 * @property {string} id - Unique retention policy identifier
 * @property {string} name - Policy name
 * @property {string} entityType - Entity type this policy applies to: 'AuditLog' | 'Notification' | 'Execution' | 'TestData' | 'Report' | 'Session'
 * @property {number} retentionDays - Number of days to retain data
 * @property {string} action - Action to take when retention period expires: 'archive' | 'delete' | 'anonymize'
 * @property {boolean} enabled - Whether the policy is active
 * @property {string} description - Brief description of the retention policy
 * @property {string} lastExecuted - ISO 8601 timestamp of last policy execution
 * @property {string} nextExecution - ISO 8601 timestamp of next scheduled execution
 * @property {string} createdAt - ISO 8601 creation timestamp
 * @property {string} updatedAt - ISO 8601 last update timestamp
 */

/**
 * Default retention policies
 * @type {RetentionPolicy[]}
 */
const DEFAULT_RETENTION_POLICIES = [
  {
    id: 'rp-001',
    name: 'Audit Log Retention',
    entityType: 'AuditLog',
    retentionDays: 365,
    action: 'archive',
    enabled: true,
    description: 'Retains audit log entries for 365 days before archiving to long-term storage.',
    lastExecuted: '2024-06-01T02:00:00Z',
    nextExecution: '2024-07-01T02:00:00Z',
    createdAt: '2022-01-15T08:00:00Z',
    updatedAt: '2024-06-01T02:00:00Z',
  },
  {
    id: 'rp-002',
    name: 'Notification Retention',
    entityType: 'Notification',
    retentionDays: 90,
    action: 'delete',
    enabled: true,
    description: 'Deletes notification entries older than 90 days to manage storage.',
    lastExecuted: '2024-06-01T03:00:00Z',
    nextExecution: '2024-07-01T03:00:00Z',
    createdAt: '2022-03-10T08:00:00Z',
    updatedAt: '2024-06-01T03:00:00Z',
  },
  {
    id: 'rp-003',
    name: 'Test Execution Retention',
    entityType: 'Execution',
    retentionDays: 180,
    action: 'archive',
    enabled: true,
    description: 'Archives test execution records older than 180 days for historical reference.',
    lastExecuted: '2024-06-01T04:00:00Z',
    nextExecution: '2024-07-01T04:00:00Z',
    createdAt: '2022-04-01T08:00:00Z',
    updatedAt: '2024-06-01T04:00:00Z',
  },
  {
    id: 'rp-004',
    name: 'Test Data Retention',
    entityType: 'TestData',
    retentionDays: 120,
    action: 'delete',
    enabled: true,
    description: 'Deletes expired test data sets older than 120 days to free storage.',
    lastExecuted: '2024-06-01T05:00:00Z',
    nextExecution: '2024-07-01T05:00:00Z',
    createdAt: '2022-06-15T08:00:00Z',
    updatedAt: '2024-06-01T05:00:00Z',
  },
  {
    id: 'rp-005',
    name: 'Report Retention',
    entityType: 'Report',
    retentionDays: 730,
    action: 'archive',
    enabled: true,
    description: 'Retains generated reports for 2 years before archiving.',
    lastExecuted: '2024-06-01T06:00:00Z',
    nextExecution: '2024-07-01T06:00:00Z',
    createdAt: '2022-01-20T08:00:00Z',
    updatedAt: '2024-06-01T06:00:00Z',
  },
  {
    id: 'rp-006',
    name: 'Session Data Retention',
    entityType: 'Session',
    retentionDays: 30,
    action: 'delete',
    enabled: true,
    description: 'Deletes expired session data older than 30 days.',
    lastExecuted: '2024-06-01T07:00:00Z',
    nextExecution: '2024-07-01T07:00:00Z',
    createdAt: '2022-08-01T08:00:00Z',
    updatedAt: '2024-06-01T07:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Data Loaders
// ---------------------------------------------------------------------------

/**
 * Loads platform configuration from localStorage, seeding from defaults if not present.
 * @returns {PlatformConfig}
 */
function loadPlatformConfig() {
  let config = getItem(STORAGE_KEYS.PLATFORM_CONFIG, null);
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    config = JSON.parse(JSON.stringify(DEFAULT_PLATFORM_CONFIG));
    setItem(STORAGE_KEYS.PLATFORM_CONFIG, config);
  }
  return config;
}

/**
 * Persists the platform configuration to localStorage.
 * @param {PlatformConfig} config - The platform configuration object
 * @returns {boolean} True if persisted successfully
 */
function savePlatformConfig(config) {
  return setItem(STORAGE_KEYS.PLATFORM_CONFIG, config);
}

/**
 * Loads retention policies from localStorage, seeding from defaults if not present.
 * @returns {RetentionPolicy[]}
 */
function loadRetentionPolicies() {
  let policies = getItem(STORAGE_KEYS.RETENTION_POLICIES, null);
  if (!policies || !Array.isArray(policies) || policies.length === 0) {
    policies = JSON.parse(JSON.stringify(DEFAULT_RETENTION_POLICIES));
    setItem(STORAGE_KEYS.RETENTION_POLICIES, policies);
  }
  return policies;
}

/**
 * Persists the retention policies array to localStorage.
 * @param {RetentionPolicy[]} policies - Array of retention policy objects
 * @returns {boolean} True if persisted successfully
 */
function saveRetentionPolicies(policies) {
  return setItem(STORAGE_KEYS.RETENTION_POLICIES, policies);
}

/**
 * Loads integrations from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockIntegrations.js').MockIntegration[]}
 */
function loadIntegrations() {
  let integrations = getItem(STORAGE_KEYS.INTEGRATIONS, null);
  if (!integrations || !Array.isArray(integrations) || integrations.length === 0) {
    integrations = JSON.parse(JSON.stringify(mockIntegrations));
    setItem(STORAGE_KEYS.INTEGRATIONS, integrations);
  }
  return integrations;
}

/**
 * Persists the integrations array to localStorage.
 * @param {import('../data/mockIntegrations.js').MockIntegration[]} integrations - Array of integration objects
 * @returns {boolean} True if persisted successfully
 */
function saveIntegrations(integrations) {
  return setItem(STORAGE_KEYS.INTEGRATIONS, integrations);
}

// ---------------------------------------------------------------------------
// Platform Configuration
// ---------------------------------------------------------------------------

/**
 * Retrieves the current platform configuration.
 *
 * @returns {Promise<PlatformConfig>} The platform configuration
 */
export async function getPlatformConfig() {
  await simulateDelay();

  return loadPlatformConfig();
}

/**
 * Retrieves the current platform configuration synchronously.
 *
 * @returns {PlatformConfig} The platform configuration
 */
export function getPlatformConfigSync() {
  return loadPlatformConfig();
}

/**
 * Updates the platform configuration with the provided partial configuration.
 * Merges the provided fields with the existing configuration.
 * Logs the configuration change to the audit trail.
 *
 * @param {Partial<PlatformConfig>} config - Partial configuration object with fields to update
 * @returns {Promise<PlatformConfig>} The updated platform configuration
 * @throws {Error} If config is not a valid object
 */
export async function updatePlatformConfig(config) {
  await simulateDelay();

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Configuration must be a non-null object.');
  }

  const currentConfig = loadPlatformConfig();

  // Do not allow overwriting certain internal fields directly
  const { lastUpdated: _ignoredLastUpdated, updatedBy: _ignoredUpdatedBy, ...safeUpdates } = config;

  const session = getSession();
  const updatedBy = session ? session.name : 'System';

  const updatedConfig = {
    ...currentConfig,
    ...safeUpdates,
    lastUpdated: new Date().toISOString(),
    updatedBy,
  };

  savePlatformConfig(updatedConfig);

  try {
    const changedFields = Object.keys(safeUpdates).join(', ');
    logAction(
      'config_change',
      `Platform configuration updated. Changed fields: ${changedFields}.`,
      'System',
      'platform-config',
      { status: 'success' }
    );
  } catch {
    // Ignore audit log errors during config update
  }

  return updatedConfig;
}

/**
 * Checks if the platform is currently in maintenance mode.
 *
 * @returns {boolean} True if maintenance mode is enabled
 */
export function isMaintenanceMode() {
  const config = loadPlatformConfig();
  return config.maintenanceMode === true;
}

/**
 * Enables maintenance mode with an optional custom message.
 *
 * @param {string} [message] - Custom maintenance message
 * @returns {Promise<PlatformConfig>} The updated platform configuration
 */
export async function enableMaintenanceMode(message) {
  const updates = { maintenanceMode: true };
  if (message && typeof message === 'string') {
    updates.maintenanceMessage = message;
  }
  return updatePlatformConfig(updates);
}

/**
 * Disables maintenance mode.
 *
 * @returns {Promise<PlatformConfig>} The updated platform configuration
 */
export async function disableMaintenanceMode() {
  return updatePlatformConfig({ maintenanceMode: false });
}

// ---------------------------------------------------------------------------
// Retention Policies
// ---------------------------------------------------------------------------

/**
 * Retrieves all retention policies.
 *
 * @returns {Promise<RetentionPolicy[]>} Array of retention policy objects
 */
export async function getRetentionPolicies() {
  await simulateDelay();

  return loadRetentionPolicies();
}

/**
 * Retrieves all retention policies synchronously.
 *
 * @returns {RetentionPolicy[]} Array of retention policy objects
 */
export function getRetentionPoliciesSync() {
  return loadRetentionPolicies();
}

/**
 * Retrieves a single retention policy by its id.
 *
 * @param {string} id - The retention policy id
 * @returns {Promise<RetentionPolicy|null>} The retention policy or null if not found
 */
export async function getRetentionPolicyById(id) {
  await simulateDelay();

  if (!id) {
    return null;
  }

  const policies = loadRetentionPolicies();
  return policies.find((p) => p.id === id) || null;
}

/**
 * Updates an existing retention policy's fields.
 * Logs the change to the audit trail.
 *
 * @param {Object} policy - Partial retention policy object with fields to update. Must include 'id'.
 * @param {string} policy.id - The retention policy id to update
 * @param {string} [policy.name] - Updated policy name
 * @param {number} [policy.retentionDays] - Updated retention days
 * @param {string} [policy.action] - Updated action: 'archive' | 'delete' | 'anonymize'
 * @param {boolean} [policy.enabled] - Updated enabled state
 * @param {string} [policy.description] - Updated description
 * @returns {Promise<RetentionPolicy>} The updated retention policy
 * @throws {Error} If policy is not a valid object or id is missing or not found
 */
export async function updateRetentionPolicy(policy) {
  await simulateDelay();

  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    throw new Error('Retention policy must be a non-null object.');
  }

  if (!policy.id || typeof policy.id !== 'string') {
    throw new Error('Retention policy id is required and must be a string.');
  }

  const policies = loadRetentionPolicies();
  const index = policies.findIndex((p) => p.id === policy.id);

  if (index === -1) {
    throw new Error(`Retention policy with id ${policy.id} not found.`);
  }

  // Do not allow overwriting the id or createdAt
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...safeUpdates } = policy;

  policies[index] = {
    ...policies[index],
    ...safeUpdates,
    updatedAt: new Date().toISOString(),
  };

  saveRetentionPolicies(policies);

  try {
    logAction(
      'config_change',
      `Retention policy "${policies[index].name}" (${policy.id}) updated.`,
      'System',
      policy.id,
      { status: 'success' }
    );
  } catch {
    // Ignore audit log errors
  }

  return policies[index];
}

/**
 * Simulates execution of a retention policy.
 * In this mock implementation, it updates the lastExecuted and nextExecution timestamps.
 *
 * @param {string} id - The retention policy id to execute
 * @returns {Promise<RetentionPolicy>} The updated retention policy after simulated execution
 * @throws {Error} If policy is not found or not enabled
 */
export async function simulateRetentionPolicy(id) {
  await simulateDelay();

  if (!id) {
    throw new Error('Retention policy id is required.');
  }

  const policies = loadRetentionPolicies();
  const index = policies.findIndex((p) => p.id === id);

  if (index === -1) {
    throw new Error(`Retention policy with id ${id} not found.`);
  }

  if (!policies[index].enabled) {
    throw new Error(`Retention policy "${policies[index].name}" is disabled and cannot be executed.`);
  }

  const now = new Date();
  const nextExecution = new Date(now);
  nextExecution.setDate(nextExecution.getDate() + 30);

  policies[index] = {
    ...policies[index],
    lastExecuted: now.toISOString(),
    nextExecution: nextExecution.toISOString(),
    updatedAt: now.toISOString(),
  };

  saveRetentionPolicies(policies);

  try {
    logAction(
      'config_change',
      `Retention policy "${policies[index].name}" (${id}) executed. Action: ${policies[index].action}. Retention: ${policies[index].retentionDays} days.`,
      'System',
      id,
      { status: 'success' }
    );
  } catch {
    // Ignore audit log errors
  }

  return policies[index];
}

/**
 * Returns the distinct entity types present in the retention policies.
 *
 * @returns {string[]} Array of unique entity type strings
 */
export function getDistinctRetentionEntityTypes() {
  const policies = loadRetentionPolicies();
  const types = new Set();
  for (const policy of policies) {
    if (policy.entityType) {
      types.add(policy.entityType);
    }
  }
  return Array.from(types).sort();
}

// ---------------------------------------------------------------------------
// System Health
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} SystemHealthMetrics
 * @property {string} status - Overall system status: 'healthy' | 'degraded' | 'down'
 * @property {number} uptime - System uptime percentage (0-100)
 * @property {number} activeUsers - Number of currently active users
 * @property {number} totalUsers - Total number of registered users
 * @property {number} storageUsedMB - Estimated localStorage usage in megabytes
 * @property {number} storageQuotaMB - Estimated localStorage quota in megabytes
 * @property {number} storageUsagePercent - Storage usage percentage (0-100)
 * @property {number} totalIntegrations - Total number of integrations
 * @property {number} connectedIntegrations - Number of connected integrations
 * @property {number} errorIntegrations - Number of integrations in error state
 * @property {number} totalEnvironments - Total number of environments
 * @property {number} availableEnvironments - Number of available environments
 * @property {number} downEnvironments - Number of down environments
 * @property {boolean} maintenanceMode - Whether maintenance mode is enabled
 * @property {boolean} auditLoggingEnabled - Whether audit logging is enabled
 * @property {boolean} notificationsEnabled - Whether notifications are enabled
 * @property {string} lastChecked - ISO 8601 timestamp of last health check
 * @property {Array<{component: string, status: string, message: string}>} components - Component health details
 */

/**
 * Estimates the current localStorage usage in bytes.
 * @returns {number} Estimated usage in bytes
 */
function estimateStorageUsage() {
  try {
    let totalSize = 0;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        const value = window.localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }
    // Each character is approximately 2 bytes in UTF-16
    return totalSize * 2;
  } catch {
    return 0;
  }
}

/**
 * Retrieves system health metrics including storage usage, integration status,
 * environment status, and component health.
 *
 * @returns {Promise<SystemHealthMetrics>} System health metrics
 */
export async function getSystemHealth() {
  await simulateDelay();

  const config = loadPlatformConfig();
  const integrations = loadIntegrations();

  // Calculate integration metrics
  let connectedIntegrations = 0;
  let errorIntegrations = 0;
  let disconnectedIntegrations = 0;

  for (const intg of integrations) {
    if (intg.status === 'Connected') {
      connectedIntegrations++;
    } else if (intg.status === 'Error') {
      errorIntegrations++;
    } else if (intg.status === 'Disconnected') {
      disconnectedIntegrations++;
    }
  }

  // Load environments for health check
  const environmentsKey = 'kp_etsip_environments';
  let environments = getItem(environmentsKey, []);
  if (!Array.isArray(environments)) {
    environments = [];
  }

  let availableEnvironments = 0;
  let downEnvironments = 0;

  for (const env of environments) {
    if (env.status === 'Available') {
      availableEnvironments++;
    } else if (env.status === 'Down') {
      downEnvironments++;
    }
  }

  // Load users for active count
  const usersKey = 'kp_etsip_users';
  let users = getItem(usersKey, []);
  if (!Array.isArray(users)) {
    users = [];
  }

  const activeUsers = users.filter((u) => u.status === 'active').length;
  const totalUsers = users.length;

  // Estimate storage usage
  const storageUsedBytes = estimateStorageUsage();
  const storageUsedMB = Math.round((storageUsedBytes / (1024 * 1024)) * 100) / 100;
  const storageQuotaMB = 5; // Typical localStorage quota is ~5MB
  const storageUsagePercent = storageQuotaMB > 0
    ? Math.round((storageUsedMB / storageQuotaMB) * 10000) / 100
    : 0;

  // Determine overall status
  let overallStatus = 'healthy';
  if (downEnvironments > 0 || errorIntegrations > 1) {
    overallStatus = 'degraded';
  }
  if (config.maintenanceMode) {
    overallStatus = 'degraded';
  }
  if (storageUsagePercent > 90) {
    overallStatus = 'degraded';
  }

  // Build component health details
  const components = [
    {
      component: 'Authentication Service',
      status: 'healthy',
      message: 'Mock authentication service operational.',
    },
    {
      component: 'User Repository',
      status: totalUsers > 0 ? 'healthy' : 'degraded',
      message: totalUsers > 0
        ? `${totalUsers} users registered, ${activeUsers} active.`
        : 'No users found in repository.',
    },
    {
      component: 'Audit Log Service',
      status: config.auditLoggingEnabled ? 'healthy' : 'degraded',
      message: config.auditLoggingEnabled
        ? 'Audit logging is enabled and operational.'
        : 'Audit logging is disabled.',
    },
    {
      component: 'Notification Service',
      status: config.notificationsEnabled ? 'healthy' : 'degraded',
      message: config.notificationsEnabled
        ? 'Notification service is enabled and operational.'
        : 'Notification service is disabled.',
    },
    {
      component: 'Integration Hub',
      status: errorIntegrations === 0 ? 'healthy' : 'degraded',
      message: `${connectedIntegrations} connected, ${disconnectedIntegrations} disconnected, ${errorIntegrations} in error state.`,
    },
    {
      component: 'Environment Manager',
      status: downEnvironments === 0 ? 'healthy' : 'degraded',
      message: `${availableEnvironments} available, ${downEnvironments} down out of ${environments.length} total.`,
    },
    {
      component: 'Storage',
      status: storageUsagePercent < 80 ? 'healthy' : (storageUsagePercent < 90 ? 'degraded' : 'down'),
      message: `${storageUsedMB} MB used of ${storageQuotaMB} MB quota (${storageUsagePercent}%).`,
    },
  ];

  // If any component is down, overall is down
  if (components.some((c) => c.status === 'down')) {
    overallStatus = 'down';
  }

  return {
    status: overallStatus,
    uptime: 99.2,
    activeUsers,
    totalUsers,
    storageUsedMB,
    storageQuotaMB,
    storageUsagePercent,
    totalIntegrations: integrations.length,
    connectedIntegrations,
    errorIntegrations,
    totalEnvironments: environments.length,
    availableEnvironments,
    downEnvironments,
    maintenanceMode: config.maintenanceMode,
    auditLoggingEnabled: config.auditLoggingEnabled,
    notificationsEnabled: config.notificationsEnabled,
    lastChecked: new Date().toISOString(),
    components,
  };
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} IntegrationFilter
 * @property {string} [type] - Filter by integration type
 * @property {string} [status] - Filter by status: 'Connected' | 'Disconnected' | 'Error'
 * @property {string} [provider] - Filter by provider name (partial match, case-insensitive)
 * @property {string} [searchTerm] - Search term to match against name, provider, or description (case-insensitive)
 * @property {boolean} [enabledOnly] - If true, only return enabled integrations
 */

/**
 * Retrieves integrations with optional filtering.
 *
 * @param {IntegrationFilter} [filters] - Optional filter criteria
 * @returns {Promise<{integrations: import('../data/mockIntegrations.js').MockIntegration[], total: number}>} Filtered integrations and total count
 */
export async function getIntegrations(filters = {}) {
  await simulateDelay();

  let integrations = loadIntegrations();

  if (filters.type) {
    integrations = integrations.filter((intg) => intg.type === filters.type);
  }

  if (filters.status) {
    integrations = integrations.filter((intg) => intg.status === filters.status);
  }

  if (filters.provider) {
    const providerLower = filters.provider.toLowerCase();
    integrations = integrations.filter((intg) =>
      intg.provider.toLowerCase().includes(providerLower)
    );
  }

  if (filters.enabledOnly) {
    integrations = integrations.filter((intg) => intg.enabled === true);
  }

  if (filters.searchTerm) {
    const termLower = filters.searchTerm.toLowerCase();
    integrations = integrations.filter((intg) =>
      intg.name.toLowerCase().includes(termLower) ||
      intg.provider.toLowerCase().includes(termLower) ||
      intg.description.toLowerCase().includes(termLower)
    );
  }

  return { integrations, total: integrations.length };
}

/**
 * Retrieves all integrations without filtering (synchronous).
 *
 * @returns {import('../data/mockIntegrations.js').MockIntegration[]} Array of all integration objects
 */
export function getAllIntegrations() {
  return loadIntegrations();
}

/**
 * Retrieves a single integration by its id.
 *
 * @param {string} id - The integration id
 * @returns {Promise<import('../data/mockIntegrations.js').MockIntegration|null>} The integration or null if not found
 */
export async function getIntegrationById(id) {
  await simulateDelay();

  if (!id) {
    return null;
  }

  const integrations = loadIntegrations();
  return integrations.find((intg) => intg.id === id) || null;
}

/**
 * Updates an existing integration's configuration and status.
 * Logs the change to the audit trail.
 *
 * @param {string} id - The integration id to update
 * @param {Object} config - Partial integration object with fields to update
 * @returns {Promise<import('../data/mockIntegrations.js').MockIntegration>} The updated integration
 * @throws {Error} If integration is not found or id is missing
 */
export async function updateIntegration(id, config) {
  await simulateDelay();

  if (!id || typeof id !== 'string') {
    throw new Error('Integration id is required and must be a string.');
  }

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Integration configuration must be a non-null object.');
  }

  const integrations = loadIntegrations();
  const index = integrations.findIndex((intg) => intg.id === id);

  if (index === -1) {
    throw new Error(`Integration with id ${id} not found.`);
  }

  // Do not allow overwriting the id or createdAt
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...safeUpdates } = config;

  integrations[index] = {
    ...integrations[index],
    ...safeUpdates,
    updatedAt: new Date().toISOString(),
  };

  saveIntegrations(integrations);

  try {
    logAction(
      'config_change',
      `Integration "${integrations[index].name}" (${id}) configuration updated.`,
      'Integration',
      id,
      { status: 'success' }
    );
  } catch {
    // Ignore audit log errors
  }

  return integrations[index];
}

/**
 * Toggles the enabled state of an integration.
 *
 * @param {string} id - The integration id to toggle
 * @returns {Promise<import('../data/mockIntegrations.js').MockIntegration>} The updated integration
 * @throws {Error} If integration is not found
 */
export async function toggleIntegration(id) {
  if (!id) {
    throw new Error('Integration id is required.');
  }

  const integrations = loadIntegrations();
  const integration = integrations.find((intg) => intg.id === id);

  if (!integration) {
    throw new Error(`Integration with id ${id} not found.`);
  }

  return updateIntegration(id, { enabled: !integration.enabled });
}

/**
 * Simulates a sync operation for an integration.
 * Updates the lastSync timestamp and adds a sync history entry.
 *
 * @param {string} id - The integration id to sync
 * @returns {Promise<import('../data/mockIntegrations.js').MockIntegration>} The updated integration
 * @throws {Error} If integration is not found or not connected
 */
export async function simulateIntegrationSync(id) {
  await simulateDelay();

  if (!id) {
    throw new Error('Integration id is required.');
  }

  const integrations = loadIntegrations();
  const index = integrations.findIndex((intg) => intg.id === id);

  if (index === -1) {
    throw new Error(`Integration with id ${id} not found.`);
  }

  if (integrations[index].status !== 'Connected') {
    throw new Error(`Integration "${integrations[index].name}" is not connected. Current status: ${integrations[index].status}.`);
  }

  const now = new Date().toISOString();

  // Generate a new sync history entry
  const syncHistory = integrations[index].syncHistory || [];
  const syncId = `sync-${id.replace('intg-', '')}-${syncHistory.length + 1}`;
  const newSyncEntry = {
    id: syncId,
    syncDate: now,
    status: 'Success',
    recordsSynced: Math.floor(Math.random() * 200) + 10,
    duration: Math.floor(Math.random() * 60) + 5,
  };

  syncHistory.unshift(newSyncEntry);

  // Keep only the last 10 sync history entries
  if (syncHistory.length > 10) {
    syncHistory.length = 10;
  }

  integrations[index] = {
    ...integrations[index],
    lastSync: now,
    syncHistory,
    updatedAt: now,
  };

  saveIntegrations(integrations);

  try {
    logAction(
      'config_change',
      `Integration "${integrations[index].name}" (${id}) sync completed. ${newSyncEntry.recordsSynced} records synced.`,
      'Integration',
      id,
      { status: 'success' }
    );
  } catch {
    // Ignore audit log errors
  }

  return integrations[index];
}

/**
 * Returns the distinct integration types present in the repository.
 *
 * @returns {string[]} Array of unique integration type strings
 */
export function getDistinctIntegrationTypes() {
  const integrations = loadIntegrations();
  const types = new Set();
  for (const intg of integrations) {
    if (intg.type) {
      types.add(intg.type);
    }
  }
  return Array.from(types).sort();
}

/**
 * Returns the distinct integration statuses present in the repository.
 *
 * @returns {string[]} Array of unique integration status strings
 */
export function getDistinctIntegrationStatuses() {
  const integrations = loadIntegrations();
  const statuses = new Set();
  for (const intg of integrations) {
    if (intg.status) {
      statuses.add(intg.status);
    }
  }
  return Array.from(statuses).sort();
}

/**
 * Returns a count summary of integrations grouped by status.
 *
 * @returns {Object.<string, number>} Object mapping statuses to counts
 */
export function getIntegrationCountByStatus() {
  const integrations = loadIntegrations();
  const counts = {};
  for (const intg of integrations) {
    const status = intg.status || 'Unknown';
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}

/**
 * Returns a count summary of integrations grouped by type.
 *
 * @returns {Object.<string, number>} Object mapping types to counts
 */
export function getIntegrationCountByType() {
  const integrations = loadIntegrations();
  const counts = {};
  for (const intg of integrations) {
    const type = intg.type || 'Unknown';
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Reset Functions
// ---------------------------------------------------------------------------

/**
 * Resets the platform configuration to the default values.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetPlatformConfig() {
  return savePlatformConfig(JSON.parse(JSON.stringify(DEFAULT_PLATFORM_CONFIG)));
}

/**
 * Resets the retention policies to the default values.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetRetentionPolicies() {
  return saveRetentionPolicies(JSON.parse(JSON.stringify(DEFAULT_RETENTION_POLICIES)));
}

/**
 * Resets the integrations to the original mock data.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetIntegrations() {
  return saveIntegrations(JSON.parse(JSON.stringify(mockIntegrations)));
}

/**
 * Resets all platform admin data to their initial state.
 *
 * @returns {boolean} True if all resets were successful
 */
export function resetAll() {
  const configReset = resetPlatformConfig();
  const policiesReset = resetRetentionPolicies();
  const integrationsReset = resetIntegrations();
  return configReset && policiesReset && integrationsReset;
}
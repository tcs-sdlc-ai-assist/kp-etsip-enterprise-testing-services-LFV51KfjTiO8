/**
 * Execution Orchestration Service (ExecutionOrchestrationContext service layer)
 * Manages execution lifecycle, status updates, logs, evidence, and AI analysis.
 * Implements LLD ExecutionOrchestrationContext interface with localStorage persistence.
 * @module executionService
 */

import { getItem, setItem } from './storage.js';
import { getSession } from './authManager.js';
import { logAction } from './auditLogService.js';
import mockExecutions from '../data/mockExecutions.js';
import mockEnvironments from '../data/mockEnvironments.js';
import mockSchedules from '../data/mockSchedules.js';

/**
 * localStorage keys for execution data
 * @type {Object.<string, string>}
 */
const STORAGE_KEYS = {
  EXECUTIONS: 'kp_etsip_executions',
  ENVIRONMENTS: 'kp_etsip_environments',
  SCHEDULES: 'kp_etsip_schedules',
};

/**
 * Maximum number of execution entries to retain in localStorage
 * @type {number}
 */
const MAX_EXECUTION_ENTRIES = 500;

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
// Data Loaders
// ---------------------------------------------------------------------------

/**
 * Loads executions from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockExecutions.js').MockExecution[]} Array of execution objects
 */
function loadExecutions() {
  let data = getItem(STORAGE_KEYS.EXECUTIONS, null);
  if (!data || !Array.isArray(data) || data.length === 0) {
    data = JSON.parse(JSON.stringify(mockExecutions));
    setItem(STORAGE_KEYS.EXECUTIONS, data);
  }
  return data;
}

/**
 * Persists the executions array to localStorage.
 * @param {import('../data/mockExecutions.js').MockExecution[]} executions - Array of execution objects
 * @returns {boolean} True if persisted successfully
 */
function saveExecutions(executions) {
  return setItem(STORAGE_KEYS.EXECUTIONS, executions);
}

/**
 * Loads environments from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockEnvironments.js').MockEnvironment[]} Array of environment objects
 */
function loadEnvironments() {
  let data = getItem(STORAGE_KEYS.ENVIRONMENTS, null);
  if (!data || !Array.isArray(data) || data.length === 0) {
    data = JSON.parse(JSON.stringify(mockEnvironments));
    setItem(STORAGE_KEYS.ENVIRONMENTS, data);
  }
  return data;
}

/**
 * Loads schedules from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockSchedules.js').MockSchedule[]} Array of schedule objects
 */
function loadSchedules() {
  let data = getItem(STORAGE_KEYS.SCHEDULES, null);
  if (!data || !Array.isArray(data) || data.length === 0) {
    data = JSON.parse(JSON.stringify(mockSchedules));
    setItem(STORAGE_KEYS.SCHEDULES, data);
  }
  return data;
}

/**
 * Persists the schedules array to localStorage.
 * @param {import('../data/mockSchedules.js').MockSchedule[]} schedules - Array of schedule objects
 * @returns {boolean} True if persisted successfully
 */
function saveSchedules(schedules) {
  return setItem(STORAGE_KEYS.SCHEDULES, schedules);
}

/**
 * Generates the next unique execution id based on existing executions.
 * @param {import('../data/mockExecutions.js').MockExecution[]} executions - Current executions array
 * @returns {string} Next execution id (e.g., 'exec-0106')
 */
function generateNextExecutionId(executions) {
  let maxNum = 0;
  for (const exec of executions) {
    const match = exec.id.match(/^exec-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `exec-${String(maxNum + 1).padStart(4, '0')}`;
}

// ---------------------------------------------------------------------------
// Execution CRUD & Lifecycle
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ExecutionConfig
 * @property {string} testAssetId - The test asset id to execute
 * @property {string} suiteName - The test suite name
 * @property {string} application - The application name
 * @property {string} [type] - Execution type: 'Manual' | 'Automated' (defaults to 'Automated')
 * @property {string} [environment] - Execution environment: 'QA' | 'Staging' | 'Prod' (defaults to 'QA')
 * @property {string} [executor] - Name of the executor (fake PII)
 * @property {string} [executorEmail] - Executor email (fake PII)
 */

/**
 * Starts a new simulated test execution.
 * Creates an execution record with status 'Queued', persists it, and simulates
 * a transition to 'InProgress' after a short delay.
 *
 * @param {ExecutionConfig} config - Execution configuration
 * @returns {Promise<import('../data/mockExecutions.js').MockExecution>} The created execution
 * @throws {Error} If required fields are missing
 */
export async function startExecution(config) {
  await simulateDelay();

  if (!config || typeof config !== 'object') {
    throw new Error('Execution config must be a non-null object.');
  }

  if (!config.testAssetId || typeof config.testAssetId !== 'string') {
    throw new Error('testAssetId is required and must be a string.');
  }

  if (!config.suiteName || typeof config.suiteName !== 'string') {
    throw new Error('suiteName is required and must be a string.');
  }

  if (!config.application || typeof config.application !== 'string') {
    throw new Error('application is required and must be a string.');
  }

  const validEnvironments = ['QA', 'Staging', 'Prod'];
  const environment = config.environment || 'QA';
  if (!validEnvironments.includes(environment)) {
    throw new Error(`Invalid environment: ${environment}. Must be one of: ${validEnvironments.join(', ')}.`);
  }

  const validTypes = ['Manual', 'Automated'];
  const type = config.type || 'Automated';
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}.`);
  }

  const session = getSession();
  const executor = config.executor || (session ? session.name : 'System');
  const executorEmail = config.executorEmail || (session ? session.email : 'system@kp-etsip.gov');

  const executions = loadExecutions();
  const now = new Date().toISOString();

  const newExecution = {
    id: generateNextExecutionId(executions),
    testAssetId: config.testAssetId,
    suiteName: config.suiteName,
    application: config.application,
    type,
    status: 'Queued',
    executor,
    executorEmail,
    startTime: now,
    endTime: null,
    duration: null,
    environment,
    logs: [
      { timestamp: now, level: 'info', message: `Execution queued for ${config.testAssetId}` },
    ],
    evidence: [],
    aiAnalysis: null,
  };

  executions.unshift(newExecution);

  // Enforce maximum execution entries
  if (executions.length > MAX_EXECUTION_ENTRIES) {
    executions.length = MAX_EXECUTION_ENTRIES;
  }

  saveExecutions(executions);

  try {
    logAction(
      'create',
      `Started execution ${newExecution.id} for ${config.application} - ${config.suiteName} on ${environment}.`,
      'Execution',
      newExecution.id,
      { status: 'success' }
    );
  } catch {
    // Ignore audit log errors
  }

  return newExecution;
}

/**
 * @typedef {Object} ExecutionFilter
 * @property {string} [testAssetId] - Filter by test asset id
 * @property {string} [application] - Filter by application name (exact match)
 * @property {string} [suiteName] - Filter by suite name (exact match)
 * @property {string} [status] - Filter by status: 'Passed' | 'Failed' | 'Blocked' | 'InProgress' | 'Queued'
 * @property {string} [type] - Filter by type: 'Manual' | 'Automated'
 * @property {string} [environment] - Filter by environment: 'QA' | 'Staging' | 'Prod'
 * @property {string} [executor] - Filter by executor name (partial match, case-insensitive)
 * @property {string} [searchTerm] - Search term to match against application, suiteName, executor, or id (case-insensitive)
 * @property {string} [startDate] - Filter by start date (ISO 8601, inclusive)
 * @property {string} [endDate] - Filter by end date (ISO 8601, inclusive)
 * @property {number} [limit] - Maximum number of results to return
 * @property {number} [offset] - Number of results to skip (for pagination)
 * @property {string} [sortBy] - Field to sort by: 'startTime' | 'duration' | 'status' | 'application' (defaults to 'startTime')
 * @property {string} [sortOrder] - Sort order: 'asc' | 'desc' (defaults to 'desc')
 */

/**
 * Retrieves executions with optional filtering, sorting, and pagination.
 *
 * @param {ExecutionFilter} [filters] - Optional filter criteria
 * @returns {Promise<{executions: import('../data/mockExecutions.js').MockExecution[], total: number}>} Filtered executions and total count before pagination
 */
export async function getExecutions(filters = {}) {
  await simulateDelay();

  let executions = loadExecutions();

  if (filters.testAssetId) {
    executions = executions.filter((e) => e.testAssetId === filters.testAssetId);
  }

  if (filters.application) {
    executions = executions.filter((e) => e.application === filters.application);
  }

  if (filters.suiteName) {
    executions = executions.filter((e) => e.suiteName === filters.suiteName);
  }

  if (filters.status) {
    executions = executions.filter((e) => e.status === filters.status);
  }

  if (filters.type) {
    executions = executions.filter((e) => e.type === filters.type);
  }

  if (filters.environment) {
    executions = executions.filter((e) => e.environment === filters.environment);
  }

  if (filters.executor) {
    const executorLower = filters.executor.toLowerCase();
    executions = executions.filter((e) => e.executor.toLowerCase().includes(executorLower));
  }

  if (filters.searchTerm) {
    const termLower = filters.searchTerm.toLowerCase();
    executions = executions.filter((e) =>
      e.application.toLowerCase().includes(termLower) ||
      e.suiteName.toLowerCase().includes(termLower) ||
      e.executor.toLowerCase().includes(termLower) ||
      e.id.toLowerCase().includes(termLower) ||
      (e.testAssetId && e.testAssetId.toLowerCase().includes(termLower))
    );
  }

  if (filters.startDate) {
    const startTime = new Date(filters.startDate).getTime();
    if (!isNaN(startTime)) {
      executions = executions.filter((e) => new Date(e.startTime).getTime() >= startTime);
    }
  }

  if (filters.endDate) {
    const endTime = new Date(filters.endDate).getTime();
    if (!isNaN(endTime)) {
      executions = executions.filter((e) => new Date(e.startTime).getTime() <= endTime);
    }
  }

  // Sorting
  const sortBy = filters.sortBy || 'startTime';
  const sortOrder = filters.sortOrder || 'desc';
  const multiplier = sortOrder === 'desc' ? -1 : 1;

  const statusOrder = { Queued: 0, InProgress: 1, Passed: 2, Failed: 3, Blocked: 4 };

  executions.sort((a, b) => {
    if (sortBy === 'status') {
      const valA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 5;
      const valB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 5;
      return multiplier * (valA - valB);
    }

    if (sortBy === 'startTime') {
      const dateA = new Date(a.startTime || 0).getTime();
      const dateB = new Date(b.startTime || 0).getTime();
      return multiplier * (dateA - dateB);
    }

    if (sortBy === 'duration') {
      const durA = a.duration !== null && a.duration !== undefined ? a.duration : -1;
      const durB = b.duration !== null && b.duration !== undefined ? b.duration : -1;
      return multiplier * (durA - durB);
    }

    let valA = a[sortBy];
    let valB = b[sortBy];

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB || '').toLowerCase();
      return multiplier * valA.localeCompare(valB);
    }

    if (typeof valA === 'number') {
      return multiplier * (valA - (valB || 0));
    }

    return 0;
  });

  const total = executions.length;

  // Pagination
  if (filters.offset !== undefined && filters.offset > 0) {
    executions = executions.slice(filters.offset);
  }

  if (filters.limit !== undefined && filters.limit > 0) {
    executions = executions.slice(0, filters.limit);
  }

  return { executions, total };
}

/**
 * Retrieves a single execution by its id.
 *
 * @param {string} id - The execution id
 * @returns {Promise<import('../data/mockExecutions.js').MockExecution|null>} The execution or null if not found
 */
export async function getExecutionById(id) {
  await simulateDelay();

  if (!id) {
    return null;
  }

  const executions = loadExecutions();
  return executions.find((e) => e.id === id) || null;
}

/**
 * Retrieves a single execution by its id (synchronous).
 *
 * @param {string} id - The execution id
 * @returns {import('../data/mockExecutions.js').MockExecution|null} The execution or null if not found
 */
export function getExecutionByIdSync(id) {
  if (!id) {
    return null;
  }

  const executions = loadExecutions();
  return executions.find((e) => e.id === id) || null;
}

/**
 * Retrieves the current status of an execution.
 *
 * @param {string} executionId - The execution id
 * @returns {Promise<{executionId: string, status: string, progress: number, logs: Array, error: Object|null}|null>} Execution status or null if not found
 */
export async function getExecutionStatus(executionId) {
  await simulateDelay();

  if (!executionId) {
    return null;
  }

  const executions = loadExecutions();
  const execution = executions.find((e) => e.id === executionId);

  if (!execution) {
    return null;
  }

  // Calculate progress based on status
  let progress = 0;
  switch (execution.status) {
    case 'Queued':
      progress = 0;
      break;
    case 'InProgress':
      progress = 50;
      break;
    case 'Passed':
    case 'Failed':
    case 'Blocked':
      progress = 100;
      break;
    default:
      progress = 0;
  }

  // If InProgress, estimate progress from logs
  if (execution.status === 'InProgress' && execution.logs && execution.logs.length > 0) {
    const stepLogs = execution.logs.filter((log) =>
      log.message && log.message.toLowerCase().includes('step')
    );
    if (stepLogs.length > 0) {
      const lastStepLog = stepLogs[stepLogs.length - 1];
      const stepMatch = lastStepLog.message.match(/step\s+(\d+)\s+of\s+(\d+)/i);
      if (stepMatch) {
        const currentStep = parseInt(stepMatch[1], 10);
        const totalSteps = parseInt(stepMatch[2], 10);
        if (totalSteps > 0) {
          progress = Math.round((currentStep / totalSteps) * 100);
        }
      }
    }
  }

  return {
    executionId: execution.id,
    status: execution.status,
    progress,
    logs: execution.logs || [],
    error: execution.aiAnalysis && execution.status === 'Failed'
      ? { summary: execution.aiAnalysis.summary, rootCause: execution.aiAnalysis.rootCause }
      : null,
  };
}

/**
 * Updates the status of an execution.
 * Appends a log entry for the status change.
 * If the new status is a terminal status (Passed, Failed, Blocked), sets the endTime and duration.
 *
 * @param {string} id - The execution id to update
 * @param {string} status - The new status: 'Queued' | 'InProgress' | 'Passed' | 'Failed' | 'Blocked'
 * @param {Object} [options] - Optional additional fields
 * @param {string} [options.logMessage] - Custom log message for the status change
 * @param {string} [options.logLevel] - Log level: 'info' | 'warn' | 'error' | 'debug' (defaults to 'info')
 * @param {Object} [options.aiAnalysis] - AI analysis object to attach (for failures)
 * @returns {Promise<import('../data/mockExecutions.js').MockExecution>} The updated execution
 * @throws {Error} If execution is not found or status is invalid
 */
export async function updateExecutionStatus(id, status, options = {}) {
  await simulateDelay();

  if (!id) {
    throw new Error('Execution id is required.');
  }

  const validStatuses = ['Queued', 'InProgress', 'Passed', 'Failed', 'Blocked'];
  if (!status || !validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}.`);
  }

  const executions = loadExecutions();
  const index = executions.findIndex((e) => e.id === id);

  if (index === -1) {
    throw new Error(`Execution with id ${id} not found.`);
  }

  const now = new Date().toISOString();
  const terminalStatuses = new Set(['Passed', 'Failed', 'Blocked']);
  const isTerminal = terminalStatuses.has(status);

  const logs = executions[index].logs ? [...executions[index].logs] : [];

  const logLevel = options.logLevel || (status === 'Failed' ? 'error' : (status === 'Blocked' ? 'warn' : 'info'));
  const logMessage = options.logMessage || `Execution status changed to ${status}`;

  logs.push({
    timestamp: now,
    level: logLevel,
    message: logMessage,
  });

  const updates = {
    status,
    logs,
  };

  if (isTerminal) {
    updates.endTime = now;
    const startTime = new Date(executions[index].startTime).getTime();
    const endTime = new Date(now).getTime();
    updates.duration = Math.round((endTime - startTime) / 1000);
  }

  if (options.aiAnalysis && typeof options.aiAnalysis === 'object') {
    updates.aiAnalysis = options.aiAnalysis;
  }

  executions[index] = {
    ...executions[index],
    ...updates,
  };

  saveExecutions(executions);

  try {
    logAction(
      'update',
      `Execution ${id} status updated to ${status}. Application: ${executions[index].application}.`,
      'Execution',
      id,
      { status: 'success', previousValue: executions[index].status, newValue: status }
    );
  } catch {
    // Ignore audit log errors
  }

  return executions[index];
}

/**
 * Retrieves the logs for a specific execution.
 *
 * @param {string} id - The execution id
 * @returns {Promise<import('../data/mockExecutions.js').ExecutionLog[]>} Array of log entries
 */
export async function getExecutionLogs(id) {
  await simulateDelay();

  if (!id) {
    return [];
  }

  const executions = loadExecutions();
  const execution = executions.find((e) => e.id === id);

  if (!execution) {
    return [];
  }

  return execution.logs || [];
}

/**
 * Retrieves the evidence attachments for a specific execution.
 *
 * @param {string} id - The execution id
 * @returns {Promise<import('../data/mockExecutions.js').ExecutionEvidence[]>} Array of evidence objects
 */
export async function getExecutionEvidence(id) {
  await simulateDelay();

  if (!id) {
    return [];
  }

  const executions = loadExecutions();
  const execution = executions.find((e) => e.id === id);

  if (!execution) {
    return [];
  }

  return execution.evidence || [];
}

/**
 * Retrieves the AI analysis for a specific execution.
 *
 * @param {string} id - The execution id
 * @returns {Promise<import('../data/mockExecutions.js').AIAnalysis|null>} AI analysis object or null
 */
export async function getAIAnalysis(id) {
  await simulateDelay();

  if (!id) {
    return null;
  }

  const executions = loadExecutions();
  const execution = executions.find((e) => e.id === id);

  if (!execution) {
    return null;
  }

  return execution.aiAnalysis || null;
}

/**
 * Appends a log entry to an execution.
 *
 * @param {string} id - The execution id
 * @param {string} level - Log level: 'info' | 'warn' | 'error' | 'debug'
 * @param {string} message - Log message
 * @returns {import('../data/mockExecutions.js').MockExecution|null} The updated execution or null if not found
 */
export function appendExecutionLog(id, level, message) {
  if (!id || !message) {
    return null;
  }

  const validLevels = ['info', 'warn', 'error', 'debug'];
  const logLevel = validLevels.includes(level) ? level : 'info';

  const executions = loadExecutions();
  const index = executions.findIndex((e) => e.id === id);

  if (index === -1) {
    return null;
  }

  const logs = executions[index].logs ? [...executions[index].logs] : [];
  logs.push({
    timestamp: new Date().toISOString(),
    level: logLevel,
    message,
  });

  executions[index] = {
    ...executions[index],
    logs,
  };

  saveExecutions(executions);

  return executions[index];
}

/**
 * Adds evidence to an execution.
 *
 * @param {string} id - The execution id
 * @param {Object} evidence - The evidence object
 * @param {string} evidence.type - Evidence type: 'screenshot' | 'log_file' | 'video' | 'report'
 * @param {string} evidence.name - Evidence file name
 * @param {string} [evidence.url] - Simulated URL to evidence
 * @returns {import('../data/mockExecutions.js').MockExecution|null} The updated execution or null if not found
 * @throws {Error} If required fields are missing
 */
export function addExecutionEvidence(id, evidence) {
  if (!id) {
    throw new Error('Execution id is required.');
  }

  if (!evidence || typeof evidence !== 'object') {
    throw new Error('Evidence must be a non-null object.');
  }

  if (!evidence.type || typeof evidence.type !== 'string') {
    throw new Error('Evidence type is required and must be a string.');
  }

  if (!evidence.name || typeof evidence.name !== 'string') {
    throw new Error('Evidence name is required and must be a string.');
  }

  const executions = loadExecutions();
  const index = executions.findIndex((e) => e.id === id);

  if (index === -1) {
    return null;
  }

  const existingEvidence = executions[index].evidence ? [...executions[index].evidence] : [];
  const evidenceId = `ev-${id.replace('exec-', '')}-${existingEvidence.length + 1}`;

  const newEvidence = {
    id: evidenceId,
    type: evidence.type,
    name: evidence.name,
    url: evidence.url || `/evidence/${id}/${evidence.name}`,
    capturedAt: new Date().toISOString(),
  };

  existingEvidence.push(newEvidence);

  executions[index] = {
    ...executions[index],
    evidence: existingEvidence,
  };

  saveExecutions(executions);

  return executions[index];
}

/**
 * Sets the AI analysis for an execution.
 *
 * @param {string} id - The execution id
 * @param {Object} analysis - The AI analysis object
 * @param {string} analysis.summary - AI-generated summary
 * @param {string} [analysis.rootCause] - AI-suggested root cause
 * @param {string} [analysis.recommendation] - AI-suggested next action
 * @param {number} [analysis.confidence] - Confidence score (0-100)
 * @param {string[]} [analysis.relatedDefects] - Array of related defect IDs
 * @returns {import('../data/mockExecutions.js').MockExecution|null} The updated execution or null if not found
 * @throws {Error} If required fields are missing
 */
export function setAIAnalysis(id, analysis) {
  if (!id) {
    throw new Error('Execution id is required.');
  }

  if (!analysis || typeof analysis !== 'object') {
    throw new Error('AI analysis must be a non-null object.');
  }

  if (!analysis.summary || typeof analysis.summary !== 'string') {
    throw new Error('AI analysis summary is required and must be a string.');
  }

  const executions = loadExecutions();
  const index = executions.findIndex((e) => e.id === id);

  if (index === -1) {
    return null;
  }

  const aiAnalysis = {
    summary: analysis.summary,
    rootCause: analysis.rootCause || '',
    recommendation: analysis.recommendation || '',
    confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0,
    relatedDefects: Array.isArray(analysis.relatedDefects) ? analysis.relatedDefects : [],
  };

  executions[index] = {
    ...executions[index],
    aiAnalysis,
  };

  saveExecutions(executions);

  return executions[index];
}

// ---------------------------------------------------------------------------
// Execution Metrics & Aggregations
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ExecutionMetricsSummary
 * @property {number} totalExecutions - Total number of executions
 * @property {number} passedCount - Number of passed executions
 * @property {number} failedCount - Number of failed executions
 * @property {number} blockedCount - Number of blocked executions
 * @property {number} inProgressCount - Number of in-progress executions
 * @property {number} queuedCount - Number of queued executions
 * @property {number} passRate - Overall pass rate percentage (0-100)
 * @property {number} averageDuration - Average execution duration in seconds
 * @property {Object.<string, number>} statusDistribution - Count of executions by status
 * @property {Object.<string, number>} applicationDistribution - Count of executions by application
 * @property {Object.<string, number>} environmentDistribution - Count of executions by environment
 * @property {Object.<string, number>} typeDistribution - Count of executions by type
 */

/**
 * Retrieves execution metrics summary.
 *
 * @returns {Promise<ExecutionMetricsSummary>} Execution metrics
 */
export async function getExecutionMetrics() {
  await simulateDelay();

  const executions = loadExecutions();

  const totalExecutions = executions.length;
  let passedCount = 0;
  let failedCount = 0;
  let blockedCount = 0;
  let inProgressCount = 0;
  let queuedCount = 0;
  let totalDuration = 0;
  let durationCount = 0;
  const statusDistribution = {};
  const applicationDistribution = {};
  const environmentDistribution = {};
  const typeDistribution = {};

  for (const exec of executions) {
    if (exec.status === 'Passed') {
      passedCount++;
    } else if (exec.status === 'Failed') {
      failedCount++;
    } else if (exec.status === 'Blocked') {
      blockedCount++;
    } else if (exec.status === 'InProgress') {
      inProgressCount++;
    } else if (exec.status === 'Queued') {
      queuedCount++;
    }

    if (exec.duration !== null && exec.duration !== undefined) {
      totalDuration += exec.duration;
      durationCount++;
    }

    const status = exec.status || 'Unknown';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;

    const app = exec.application || 'Unknown';
    applicationDistribution[app] = (applicationDistribution[app] || 0) + 1;

    const env = exec.environment || 'Unknown';
    environmentDistribution[env] = (environmentDistribution[env] || 0) + 1;

    const type = exec.type || 'Unknown';
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;
  }

  const completedCount = passedCount + failedCount;
  const passRate = completedCount > 0
    ? Math.round((passedCount / completedCount) * 1000) / 10
    : 0;

  const averageDuration = durationCount > 0
    ? Math.round((totalDuration / durationCount) * 10) / 10
    : 0;

  return {
    totalExecutions,
    passedCount,
    failedCount,
    blockedCount,
    inProgressCount,
    queuedCount,
    passRate,
    averageDuration,
    statusDistribution,
    applicationDistribution,
    environmentDistribution,
    typeDistribution,
  };
}

/**
 * Retrieves executions for a specific test asset.
 *
 * @param {string} testAssetId - The test asset id
 * @returns {Promise<import('../data/mockExecutions.js').MockExecution[]>} Array of executions for the test asset
 */
export async function getExecutionsByTestAsset(testAssetId) {
  await simulateDelay();

  if (!testAssetId) {
    return [];
  }

  const executions = loadExecutions();
  return executions
    .filter((e) => e.testAssetId === testAssetId)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

/**
 * Retrieves executions for a specific application.
 *
 * @param {string} application - The application name
 * @returns {Promise<import('../data/mockExecutions.js').MockExecution[]>} Array of executions for the application
 */
export async function getExecutionsByApplication(application) {
  await simulateDelay();

  if (!application) {
    return [];
  }

  const executions = loadExecutions();
  return executions
    .filter((e) => e.application === application)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

/**
 * Retrieves recent executions up to the specified limit.
 *
 * @param {number} [limit=10] - Maximum number of recent entries to return
 * @returns {import('../data/mockExecutions.js').MockExecution[]} Array of recent executions
 */
export function getRecentExecutions(limit = 10) {
  const executions = loadExecutions();
  executions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  return executions.slice(0, limit);
}

/**
 * Retrieves failed executions.
 *
 * @returns {import('../data/mockExecutions.js').MockExecution[]} Array of failed executions
 */
export function getFailedExecutions() {
  const executions = loadExecutions();
  return executions
    .filter((e) => e.status === 'Failed')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

/**
 * Retrieves in-progress and queued executions.
 *
 * @returns {import('../data/mockExecutions.js').MockExecution[]} Array of active executions
 */
export function getActiveExecutions() {
  const executions = loadExecutions();
  return executions
    .filter((e) => e.status === 'InProgress' || e.status === 'Queued')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

// ---------------------------------------------------------------------------
// Distinct Values
// ---------------------------------------------------------------------------

/**
 * Returns the distinct execution statuses present in the repository.
 *
 * @returns {string[]} Array of unique status strings
 */
export function getDistinctStatuses() {
  const executions = loadExecutions();
  const statuses = new Set();
  for (const exec of executions) {
    if (exec.status) {
      statuses.add(exec.status);
    }
  }
  return Array.from(statuses).sort();
}

/**
 * Returns the distinct application names present in the executions.
 *
 * @returns {string[]} Array of unique application name strings
 */
export function getDistinctApplications() {
  const executions = loadExecutions();
  const apps = new Set();
  for (const exec of executions) {
    if (exec.application) {
      apps.add(exec.application);
    }
  }
  return Array.from(apps).sort();
}

/**
 * Returns the distinct suite names present in the executions.
 *
 * @returns {string[]} Array of unique suite name strings
 */
export function getDistinctSuiteNames() {
  const executions = loadExecutions();
  const suites = new Set();
  for (const exec of executions) {
    if (exec.suiteName) {
      suites.add(exec.suiteName);
    }
  }
  return Array.from(suites).sort();
}

/**
 * Returns the distinct environments present in the executions.
 *
 * @returns {string[]} Array of unique environment strings
 */
export function getDistinctEnvironments() {
  const executions = loadExecutions();
  const envs = new Set();
  for (const exec of executions) {
    if (exec.environment) {
      envs.add(exec.environment);
    }
  }
  return Array.from(envs).sort();
}

/**
 * Returns the distinct executor names present in the executions.
 *
 * @returns {string[]} Array of unique executor name strings
 */
export function getDistinctExecutors() {
  const executions = loadExecutions();
  const executors = new Set();
  for (const exec of executions) {
    if (exec.executor) {
      executors.add(exec.executor);
    }
  }
  return Array.from(executors).sort();
}

// ---------------------------------------------------------------------------
// Environment Helpers
// ---------------------------------------------------------------------------

/**
 * Retrieves all environments.
 *
 * @returns {Promise<import('../data/mockEnvironments.js').MockEnvironment[]>} Array of environment objects
 */
export async function getEnvironments() {
  await simulateDelay();

  return loadEnvironments();
}

/**
 * Retrieves a single environment by its id.
 *
 * @param {string} id - The environment id
 * @returns {Promise<import('../data/mockEnvironments.js').MockEnvironment|null>} The environment or null if not found
 */
export async function getEnvironmentById(id) {
  await simulateDelay();

  if (!id) {
    return null;
  }

  const environments = loadEnvironments();
  return environments.find((env) => env.id === id) || null;
}

/**
 * Retrieves environments filtered by status.
 *
 * @param {string} status - Environment status: 'Available' | 'InUse' | 'Maintenance' | 'Down'
 * @returns {import('../data/mockEnvironments.js').MockEnvironment[]} Array of matching environments
 */
export function getEnvironmentsByStatus(status) {
  if (!status) {
    return [];
  }
  const environments = loadEnvironments();
  return environments.filter((env) => env.status === status);
}

// ---------------------------------------------------------------------------
// Schedule Helpers
// ---------------------------------------------------------------------------

/**
 * Retrieves all schedules.
 *
 * @returns {Promise<import('../data/mockSchedules.js').MockSchedule[]>} Array of schedule objects
 */
export async function getSchedules() {
  await simulateDelay();

  return loadSchedules();
}

/**
 * Retrieves a single schedule by its id.
 *
 * @param {string} id - The schedule id
 * @returns {Promise<import('../data/mockSchedules.js').MockSchedule|null>} The schedule or null if not found
 */
export async function getScheduleById(id) {
  await simulateDelay();

  if (!id) {
    return null;
  }

  const schedules = loadSchedules();
  return schedules.find((s) => s.id === id) || null;
}

/**
 * @typedef {Object} ScheduleConfig
 * @property {string} testSuiteId - The test suite id
 * @property {string} application - The application name
 * @property {string} name - Schedule name
 * @property {string} [frequency] - Schedule frequency: 'Daily' | 'Weekly' | 'Monthly' | 'OnDemand' (defaults to 'Daily')
 * @property {string} [cron] - Cron expression for the schedule
 * @property {string} [environment] - Execution environment: 'QA' | 'Staging' | 'Prod' (defaults to 'QA')
 * @property {boolean} [enabled] - Whether the schedule is enabled (defaults to true)
 * @property {string} [owner] - Schedule owner name (fake PII)
 * @property {string} [ownerEmail] - Owner email address (fake PII)
 * @property {string} [description] - Brief description
 */

/**
 * Configures a new schedule for test execution.
 *
 * @param {ScheduleConfig} config - Schedule configuration
 * @returns {Promise<import('../data/mockSchedules.js').MockSchedule>} The created schedule
 * @throws {Error} If required fields are missing
 */
export async function configureSchedule(config) {
  await simulateDelay();

  if (!config || typeof config !== 'object') {
    throw new Error('Schedule config must be a non-null object.');
  }

  if (!config.testSuiteId || typeof config.testSuiteId !== 'string') {
    throw new Error('testSuiteId is required and must be a string.');
  }

  if (!config.application || typeof config.application !== 'string') {
    throw new Error('application is required and must be a string.');
  }

  if (!config.name || typeof config.name !== 'string') {
    throw new Error('name is required and must be a string.');
  }

  const validFrequencies = ['Daily', 'Weekly', 'Monthly', 'OnDemand'];
  const frequency = config.frequency || 'Daily';
  if (!validFrequencies.includes(frequency)) {
    throw new Error(`Invalid frequency: ${frequency}. Must be one of: ${validFrequencies.join(', ')}.`);
  }

  const validEnvironments = ['QA', 'Staging', 'Prod'];
  const environment = config.environment || 'QA';
  if (!validEnvironments.includes(environment)) {
    throw new Error(`Invalid environment: ${environment}. Must be one of: ${validEnvironments.join(', ')}.`);
  }

  const session = getSession();
  const owner = config.owner || (session ? session.name : 'System');
  const ownerEmail = config.ownerEmail || (session ? session.email : 'system@kp-etsip.gov');

  const schedules = loadSchedules();

  // Generate next schedule id
  let maxNum = 0;
  for (const s of schedules) {
    const match = s.id.match(/^sched-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  const scheduleId = `sched-${String(maxNum + 1).padStart(3, '0')}`;

  // Calculate next run based on frequency
  const now = new Date();
  let nextRun;
  switch (frequency) {
    case 'Daily':
      nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(8, 0, 0, 0);
      break;
    case 'Weekly':
      nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay() + 1) % 7 || 7);
      nextRun.setHours(8, 0, 0, 0);
      break;
    case 'Monthly':
      nextRun = new Date(now);
      nextRun.setMonth(nextRun.getMonth() + 1);
      nextRun.setDate(1);
      nextRun.setHours(8, 0, 0, 0);
      break;
    case 'OnDemand':
    default:
      nextRun = null;
      break;
  }

  const newSchedule = {
    id: scheduleId,
    name: config.name,
    testSuiteId: config.testSuiteId,
    application: config.application,
    frequency,
    nextRun: nextRun ? nextRun.toISOString() : null,
    lastRun: null,
    status: config.enabled !== false ? 'Active' : 'Paused',
    environment,
    owner,
    ownerEmail,
    createdDate: now.toISOString(),
    cron: config.cron || '',
    description: config.description || '',
  };

  schedules.push(newSchedule);
  saveSchedules(schedules);

  try {
    logAction(
      'create',
      `Schedule "${config.name}" (${scheduleId}) created for ${config.application}. Frequency: ${frequency}. Environment: ${environment}.`,
      'Schedule',
      scheduleId,
      { status: 'success' }
    );
  } catch {
    // Ignore audit log errors
  }

  return newSchedule;
}

/**
 * Updates an existing schedule's fields.
 *
 * @param {string} id - The schedule id to update
 * @param {Object} data - Partial schedule object with fields to update
 * @returns {Promise<import('../data/mockSchedules.js').MockSchedule>} The updated schedule
 * @throws {Error} If schedule is not found or id is missing
 */
export async function updateSchedule(id, data) {
  await simulateDelay();

  if (!id) {
    throw new Error('Schedule id is required.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Update data must be a non-null object.');
  }

  const schedules = loadSchedules();
  const index = schedules.findIndex((s) => s.id === id);

  if (index === -1) {
    throw new Error(`Schedule with id ${id} not found.`);
  }

  // Do not allow overwriting the id or createdDate
  const { id: _ignoredId, createdDate: _ignoredCreatedDate, ...safeUpdates } = data;

  schedules[index] = {
    ...schedules[index],
    ...safeUpdates,
  };

  saveSchedules(schedules);

  try {
    logAction(
      'update',
      `Schedule "${schedules[index].name}" (${id}) updated.`,
      'Schedule',
      id,
      { status: 'success' }
    );
  } catch {
    // Ignore audit log errors
  }

  return schedules[index];
}

/**
 * Toggles the status of a schedule between 'Active' and 'Paused'.
 *
 * @param {string} id - The schedule id to toggle
 * @returns {Promise<import('../data/mockSchedules.js').MockSchedule>} The updated schedule
 * @throws {Error} If schedule is not found
 */
export async function toggleScheduleStatus(id) {
  if (!id) {
    throw new Error('Schedule id is required.');
  }

  const schedules = loadSchedules();
  const schedule = schedules.find((s) => s.id === id);

  if (!schedule) {
    throw new Error(`Schedule with id ${id} not found.`);
  }

  const newStatus = schedule.status === 'Active' ? 'Paused' : 'Active';
  return updateSchedule(id, { status: newStatus });
}

/**
 * Returns the distinct schedule statuses present in the repository.
 *
 * @returns {string[]} Array of unique status strings
 */
export function getDistinctScheduleStatuses() {
  const schedules = loadSchedules();
  const statuses = new Set();
  for (const s of schedules) {
    if (s.status) {
      statuses.add(s.status);
    }
  }
  return Array.from(statuses).sort();
}

/**
 * Returns the distinct schedule frequencies present in the repository.
 *
 * @returns {string[]} Array of unique frequency strings
 */
export function getDistinctScheduleFrequencies() {
  const schedules = loadSchedules();
  const frequencies = new Set();
  for (const s of schedules) {
    if (s.frequency) {
      frequencies.add(s.frequency);
    }
  }
  return Array.from(frequencies).sort();
}

// ---------------------------------------------------------------------------
// Simulated Execution Flow
// ---------------------------------------------------------------------------

/**
 * Simulates a complete execution flow for a given execution id.
 * Transitions the execution through Queued -> InProgress -> Passed/Failed.
 * This is a fire-and-forget simulation that updates localStorage asynchronously.
 *
 * @param {string} executionId - The execution id to simulate
 * @param {Object} [options] - Simulation options
 * @param {boolean} [options.shouldFail] - Whether the execution should fail (defaults to false)
 * @param {number} [options.stepCount] - Number of steps to simulate (defaults to 5)
 * @param {number} [options.stepDelayMs] - Delay between steps in milliseconds (defaults to 500)
 * @returns {Promise<void>}
 */
export async function simulateExecutionFlow(executionId, options = {}) {
  if (!executionId) {
    return;
  }

  const shouldFail = options.shouldFail === true;
  const stepCount = typeof options.stepCount === 'number' && options.stepCount > 0 ? options.stepCount : 5;
  const stepDelayMs = typeof options.stepDelayMs === 'number' && options.stepDelayMs >= 0 ? options.stepDelayMs : 500;

  // Transition to InProgress
  try {
    await updateExecutionStatus(executionId, 'InProgress', {
      logMessage: 'Execution started',
      logLevel: 'info',
    });
  } catch {
    return;
  }

  // Simulate steps
  for (let step = 1; step <= stepCount; step++) {
    await new Promise((resolve) => setTimeout(resolve, stepDelayMs));

    const isLastStep = step === stepCount;
    const isFailStep = shouldFail && isLastStep;

    if (isFailStep) {
      appendExecutionLog(executionId, 'error', `Step ${step} of ${stepCount} failed`);
    } else {
      appendExecutionLog(executionId, 'info', `Step ${step} of ${stepCount} completed`);
    }
  }

  // Final status
  const finalStatus = shouldFail ? 'Failed' : 'Passed';
  const finalLogMessage = shouldFail
    ? `Execution completed - FAILED`
    : `Execution completed - PASSED`;
  const finalLogLevel = shouldFail ? 'error' : 'info';

  const aiAnalysis = shouldFail
    ? {
        summary: 'Execution failed during the final step.',
        rootCause: 'Simulated failure for testing purposes.',
        recommendation: 'Review the test configuration and retry.',
        confidence: 75,
        relatedDefects: [],
      }
    : undefined;

  try {
    await updateExecutionStatus(executionId, finalStatus, {
      logMessage: finalLogMessage,
      logLevel: finalLogLevel,
      aiAnalysis,
    });
  } catch {
    // Ignore errors during simulation
  }
}

// ---------------------------------------------------------------------------
// Reset Functions
// ---------------------------------------------------------------------------

/**
 * Resets the execution repository to the original mock data.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetExecutions() {
  const freshExecutions = JSON.parse(JSON.stringify(mockExecutions));
  return saveExecutions(freshExecutions);
}

/**
 * Resets the schedules repository to the original mock data.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetSchedules() {
  const freshSchedules = JSON.parse(JSON.stringify(mockSchedules));
  return saveSchedules(freshSchedules);
}

/**
 * Resets all execution-related data to the original mock data.
 *
 * @returns {boolean} True if all resets were successful
 */
export function resetAll() {
  const execReset = resetExecutions();
  const schedReset = resetSchedules();
  return execReset && schedReset;
}
/**
 * Scheduler Data Service (SchedulerComponent support)
 * CRUD operations for test execution schedules via localStorage.
 * Implements LLD SchedulerComponent/configureSchedule interface.
 * @module schedulerService
 */

import { getItem, setItem } from './storage.js';
import { getSession } from './authManager.js';
import { logAction } from './auditLogService.js';
import mockSchedules from '../data/mockSchedules.js';

/**
 * localStorage key for schedule entries
 * @type {string}
 */
const SCHEDULES_STORAGE_KEY = 'kp_etsip_schedules';

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
 * Loads schedules from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockSchedules.js').MockSchedule[]} Array of schedule objects
 */
function loadSchedules() {
  let data = getItem(SCHEDULES_STORAGE_KEY, null);
  if (!data || !Array.isArray(data) || data.length === 0) {
    data = JSON.parse(JSON.stringify(mockSchedules));
    setItem(SCHEDULES_STORAGE_KEY, data);
  }
  return data;
}

/**
 * Persists the schedules array to localStorage.
 * @param {import('../data/mockSchedules.js').MockSchedule[]} schedules - Array of schedule objects
 * @returns {boolean} True if persisted successfully
 */
function saveSchedules(schedules) {
  return setItem(SCHEDULES_STORAGE_KEY, schedules);
}

/**
 * Generates the next unique schedule id based on existing schedules.
 * @param {import('../data/mockSchedules.js').MockSchedule[]} schedules - Current schedules array
 * @returns {string} Next schedule id (e.g., 'sched-029')
 */
function generateNextScheduleId(schedules) {
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
  return `sched-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * @typedef {Object} ScheduleFilter
 * @property {string} [application] - Filter by application name (exact match)
 * @property {string} [status] - Filter by status: 'Active' | 'Paused' | 'Completed'
 * @property {string} [frequency] - Filter by frequency: 'Daily' | 'Weekly' | 'Monthly' | 'OnDemand'
 * @property {string} [environment] - Filter by environment: 'QA' | 'Staging' | 'Prod'
 * @property {string} [owner] - Filter by owner name (partial match, case-insensitive)
 * @property {string} [searchTerm] - Search term to match against name, application, owner, or description (case-insensitive)
 * @property {number} [limit] - Maximum number of results to return
 * @property {number} [offset] - Number of results to skip (for pagination)
 * @property {string} [sortBy] - Field to sort by: 'name' | 'nextRun' | 'lastRun' | 'application' | 'status' (defaults to 'name')
 * @property {string} [sortOrder] - Sort order: 'asc' | 'desc' (defaults to 'asc')
 */

/**
 * Retrieves schedules with optional filtering, sorting, and pagination.
 *
 * @param {ScheduleFilter} [filters] - Optional filter criteria
 * @returns {Promise<{schedules: import('../data/mockSchedules.js').MockSchedule[], total: number}>} Filtered schedules and total count before pagination
 */
export async function getSchedules(filters = {}) {
  await simulateDelay();

  let schedules = loadSchedules();

  if (filters.application) {
    schedules = schedules.filter((s) => s.application === filters.application);
  }

  if (filters.status) {
    schedules = schedules.filter((s) => s.status === filters.status);
  }

  if (filters.frequency) {
    schedules = schedules.filter((s) => s.frequency === filters.frequency);
  }

  if (filters.environment) {
    schedules = schedules.filter((s) => s.environment === filters.environment);
  }

  if (filters.owner) {
    const ownerLower = filters.owner.toLowerCase();
    schedules = schedules.filter((s) => s.owner.toLowerCase().includes(ownerLower));
  }

  if (filters.searchTerm) {
    const termLower = filters.searchTerm.toLowerCase();
    schedules = schedules.filter((s) =>
      s.name.toLowerCase().includes(termLower) ||
      s.application.toLowerCase().includes(termLower) ||
      s.owner.toLowerCase().includes(termLower) ||
      (s.description && s.description.toLowerCase().includes(termLower))
    );
  }

  // Sorting
  const sortBy = filters.sortBy || 'name';
  const sortOrder = filters.sortOrder || 'asc';
  const multiplier = sortOrder === 'desc' ? -1 : 1;

  const statusOrder = { Active: 0, Paused: 1, Completed: 2 };

  schedules.sort((a, b) => {
    if (sortBy === 'status') {
      const valA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 3;
      const valB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 3;
      return multiplier * (valA - valB);
    }

    if (sortBy === 'nextRun' || sortBy === 'lastRun') {
      const dateA = a[sortBy] ? new Date(a[sortBy]).getTime() : 0;
      const dateB = b[sortBy] ? new Date(b[sortBy]).getTime() : 0;
      return multiplier * (dateA - dateB);
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

  const total = schedules.length;

  // Pagination
  if (filters.offset !== undefined && filters.offset > 0) {
    schedules = schedules.slice(filters.offset);
  }

  if (filters.limit !== undefined && filters.limit > 0) {
    schedules = schedules.slice(0, filters.limit);
  }

  return { schedules, total };
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
 * Retrieves a single schedule by its id (synchronous).
 *
 * @param {string} id - The schedule id
 * @returns {import('../data/mockSchedules.js').MockSchedule|null} The schedule or null if not found
 */
export function getScheduleByIdSync(id) {
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
 * Implements the LLD configureSchedule interface.
 *
 * @param {ScheduleConfig} config - Schedule configuration
 * @returns {Promise<import('../data/mockSchedules.js').MockSchedule>} The created schedule
 * @throws {Error} If required fields are missing or values are invalid
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
    id: generateNextScheduleId(schedules),
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
      `Schedule "${config.name}" (${newSchedule.id}) created for ${config.application}. Frequency: ${frequency}. Environment: ${environment}.`,
      'Schedule',
      newSchedule.id,
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

  // Validate frequency if provided
  if (data.frequency) {
    const validFrequencies = ['Daily', 'Weekly', 'Monthly', 'OnDemand'];
    if (!validFrequencies.includes(data.frequency)) {
      throw new Error(`Invalid frequency: ${data.frequency}. Must be one of: ${validFrequencies.join(', ')}.`);
    }
  }

  // Validate environment if provided
  if (data.environment) {
    const validEnvironments = ['QA', 'Staging', 'Prod'];
    if (!validEnvironments.includes(data.environment)) {
      throw new Error(`Invalid environment: ${data.environment}. Must be one of: ${validEnvironments.join(', ')}.`);
    }
  }

  // Validate status if provided
  if (data.status) {
    const validStatuses = ['Active', 'Paused', 'Completed'];
    if (!validStatuses.includes(data.status)) {
      throw new Error(`Invalid status: ${data.status}. Must be one of: ${validStatuses.join(', ')}.`);
    }
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
 * Deletes a schedule by its id.
 *
 * @param {string} id - The schedule id to delete
 * @returns {Promise<boolean>} True if the schedule was deleted, false if not found
 * @throws {Error} If id is missing
 */
export async function deleteSchedule(id) {
  await simulateDelay();

  if (!id) {
    throw new Error('Schedule id is required.');
  }

  const schedules = loadSchedules();
  const index = schedules.findIndex((s) => s.id === id);

  if (index === -1) {
    return false;
  }

  const deletedSchedule = schedules[index];
  schedules.splice(index, 1);
  saveSchedules(schedules);

  try {
    logAction(
      'delete',
      `Schedule "${deletedSchedule.name}" (${id}) deleted.`,
      'Schedule',
      id,
      { status: 'success' }
    );
  } catch {
    // Ignore audit log errors
  }

  return true;
}

/**
 * Pauses a schedule by setting its status to 'Paused'.
 *
 * @param {string} id - The schedule id to pause
 * @returns {Promise<import('../data/mockSchedules.js').MockSchedule>} The updated schedule
 * @throws {Error} If schedule is not found or already paused/completed
 */
export async function pauseSchedule(id) {
  if (!id) {
    throw new Error('Schedule id is required.');
  }

  const schedules = loadSchedules();
  const schedule = schedules.find((s) => s.id === id);

  if (!schedule) {
    throw new Error(`Schedule with id ${id} not found.`);
  }

  if (schedule.status === 'Paused') {
    throw new Error(`Schedule "${schedule.name}" is already paused.`);
  }

  if (schedule.status === 'Completed') {
    throw new Error(`Schedule "${schedule.name}" is completed and cannot be paused.`);
  }

  const previousStatus = schedule.status;

  const updated = await updateSchedule(id, { status: 'Paused' });

  try {
    logAction(
      'update',
      `Schedule "${updated.name}" (${id}) paused.`,
      'Schedule',
      id,
      { status: 'success', previousValue: previousStatus, newValue: 'Paused' }
    );
  } catch {
    // Ignore audit log errors
  }

  return updated;
}

/**
 * Resumes a paused schedule by setting its status to 'Active'.
 *
 * @param {string} id - The schedule id to resume
 * @returns {Promise<import('../data/mockSchedules.js').MockSchedule>} The updated schedule
 * @throws {Error} If schedule is not found or not paused
 */
export async function resumeSchedule(id) {
  if (!id) {
    throw new Error('Schedule id is required.');
  }

  const schedules = loadSchedules();
  const schedule = schedules.find((s) => s.id === id);

  if (!schedule) {
    throw new Error(`Schedule with id ${id} not found.`);
  }

  if (schedule.status === 'Active') {
    throw new Error(`Schedule "${schedule.name}" is already active.`);
  }

  if (schedule.status === 'Completed') {
    throw new Error(`Schedule "${schedule.name}" is completed and cannot be resumed.`);
  }

  const previousStatus = schedule.status;

  const updated = await updateSchedule(id, { status: 'Active' });

  try {
    logAction(
      'update',
      `Schedule "${updated.name}" (${id}) resumed.`,
      'Schedule',
      id,
      { status: 'success', previousValue: previousStatus, newValue: 'Active' }
    );
  } catch {
    // Ignore audit log errors
  }

  return updated;
}

/**
 * Toggles the status of a schedule between 'Active' and 'Paused'.
 *
 * @param {string} id - The schedule id to toggle
 * @returns {Promise<import('../data/mockSchedules.js').MockSchedule>} The updated schedule
 * @throws {Error} If schedule is not found or completed
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

  if (schedule.status === 'Completed') {
    throw new Error(`Schedule "${schedule.name}" is completed and cannot be toggled.`);
  }

  if (schedule.status === 'Active') {
    return pauseSchedule(id);
  }

  return resumeSchedule(id);
}

/**
 * Retrieves schedules for a specific application.
 *
 * @param {string} application - The application name
 * @returns {Promise<import('../data/mockSchedules.js').MockSchedule[]>} Array of schedules for the application
 */
export async function getSchedulesByApplication(application) {
  await simulateDelay();

  if (!application) {
    return [];
  }

  const schedules = loadSchedules();
  return schedules
    .filter((s) => s.application === application)
    .sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return nameA.localeCompare(nameB);
    });
}

/**
 * Retrieves active schedules only.
 *
 * @returns {import('../data/mockSchedules.js').MockSchedule[]} Array of active schedules
 */
export function getActiveSchedules() {
  const schedules = loadSchedules();
  return schedules
    .filter((s) => s.status === 'Active')
    .sort((a, b) => {
      const dateA = a.nextRun ? new Date(a.nextRun).getTime() : Infinity;
      const dateB = b.nextRun ? new Date(b.nextRun).getTime() : Infinity;
      return dateA - dateB;
    });
}

/**
 * Retrieves schedules that are due to run (nextRun is in the past or now).
 *
 * @returns {import('../data/mockSchedules.js').MockSchedule[]} Array of due schedules
 */
export function getDueSchedules() {
  const schedules = loadSchedules();
  const now = new Date().getTime();
  return schedules
    .filter((s) => s.status === 'Active' && s.nextRun && new Date(s.nextRun).getTime() <= now)
    .sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime());
}

/**
 * Returns the distinct application names present in the schedules.
 *
 * @returns {string[]} Array of unique application name strings
 */
export function getDistinctApplications() {
  const schedules = loadSchedules();
  const apps = new Set();
  for (const s of schedules) {
    if (s.application) {
      apps.add(s.application);
    }
  }
  return Array.from(apps).sort();
}

/**
 * Returns the distinct schedule statuses present in the repository.
 *
 * @returns {string[]} Array of unique status strings
 */
export function getDistinctStatuses() {
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
export function getDistinctFrequencies() {
  const schedules = loadSchedules();
  const frequencies = new Set();
  for (const s of schedules) {
    if (s.frequency) {
      frequencies.add(s.frequency);
    }
  }
  return Array.from(frequencies).sort();
}

/**
 * Returns the distinct environments present in the schedules.
 *
 * @returns {string[]} Array of unique environment strings
 */
export function getDistinctEnvironments() {
  const schedules = loadSchedules();
  const envs = new Set();
  for (const s of schedules) {
    if (s.environment) {
      envs.add(s.environment);
    }
  }
  return Array.from(envs).sort();
}

/**
 * Returns a count summary of schedules grouped by status.
 *
 * @returns {Object.<string, number>} Object mapping statuses to counts
 */
export function getScheduleCountByStatus() {
  const schedules = loadSchedules();
  const counts = {};
  for (const s of schedules) {
    const status = s.status || 'Unknown';
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}

/**
 * Returns a count summary of schedules grouped by frequency.
 *
 * @returns {Object.<string, number>} Object mapping frequencies to counts
 */
export function getScheduleCountByFrequency() {
  const schedules = loadSchedules();
  const counts = {};
  for (const s of schedules) {
    const frequency = s.frequency || 'Unknown';
    counts[frequency] = (counts[frequency] || 0) + 1;
  }
  return counts;
}

/**
 * Returns a count summary of schedules grouped by environment.
 *
 * @returns {Object.<string, number>} Object mapping environments to counts
 */
export function getScheduleCountByEnvironment() {
  const schedules = loadSchedules();
  const counts = {};
  for (const s of schedules) {
    const env = s.environment || 'Unknown';
    counts[env] = (counts[env] || 0) + 1;
  }
  return counts;
}

/**
 * Returns the total number of schedules.
 *
 * @returns {number} Total count of schedules
 */
export function getScheduleCount() {
  const schedules = loadSchedules();
  return schedules.length;
}

/**
 * Simulates triggering a schedule's next execution.
 * Updates the lastRun to now and calculates the next nextRun based on frequency.
 *
 * @param {string} id - The schedule id to trigger
 * @returns {Promise<import('../data/mockSchedules.js').MockSchedule>} The updated schedule
 * @throws {Error} If schedule is not found or not active
 */
export async function triggerSchedule(id) {
  await simulateDelay();

  if (!id) {
    throw new Error('Schedule id is required.');
  }

  const schedules = loadSchedules();
  const index = schedules.findIndex((s) => s.id === id);

  if (index === -1) {
    throw new Error(`Schedule with id ${id} not found.`);
  }

  if (schedules[index].status !== 'Active') {
    throw new Error(`Schedule "${schedules[index].name}" is not active. Current status: ${schedules[index].status}.`);
  }

  const now = new Date();
  let nextRun = null;

  switch (schedules[index].frequency) {
    case 'Daily':
      nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(8, 0, 0, 0);
      break;
    case 'Weekly':
      nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + 7);
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

  schedules[index] = {
    ...schedules[index],
    lastRun: now.toISOString(),
    nextRun: nextRun ? nextRun.toISOString() : null,
  };

  saveSchedules(schedules);

  try {
    logAction(
      'update',
      `Schedule "${schedules[index].name}" (${id}) triggered. Next run: ${nextRun ? nextRun.toISOString() : 'N/A'}.`,
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
 * Resets the schedule repository to the original mock data.
 * Useful for testing or resetting the application state.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetSchedules() {
  const freshSchedules = JSON.parse(JSON.stringify(mockSchedules));
  return saveSchedules(freshSchedules);
}
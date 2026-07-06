/**
 * Repository Data Service (RepositoryService)
 * CRUD operations for applications, test assets, and demand items via localStorage.
 * Implements LLD RepositoryService interface.
 * @module repositoryService
 */

import { getItem, setItem } from './storage.js';
import mockApplications from '../data/mockApplications.js';
import mockTestAssets from '../data/mockTestAssets.js';
import mockDemand from '../data/mockDemand.js';

/**
 * localStorage keys for repository entities
 * @type {Object.<string, string>}
 */
const STORAGE_KEYS = {
  APPLICATIONS: 'kp_etsip_applications',
  TEST_ASSETS: 'kp_etsip_test_assets',
  DEMAND_ITEMS: 'kp_etsip_demand_items',
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
// Applications
// ---------------------------------------------------------------------------

/**
 * Loads applications from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockApplications.js').MockApplication[]} Array of application objects
 */
function loadApplications() {
  let apps = getItem(STORAGE_KEYS.APPLICATIONS, null);
  if (!apps || !Array.isArray(apps) || apps.length === 0) {
    apps = JSON.parse(JSON.stringify(mockApplications));
    setItem(STORAGE_KEYS.APPLICATIONS, apps);
  }
  return apps;
}

/**
 * Persists the applications array to localStorage.
 * @param {import('../data/mockApplications.js').MockApplication[]} apps - Array of application objects
 * @returns {boolean} True if persisted successfully
 */
function saveApplications(apps) {
  return setItem(STORAGE_KEYS.APPLICATIONS, apps);
}

/**
 * Generates the next unique application id based on existing applications.
 * @param {import('../data/mockApplications.js').MockApplication[]} apps - Current applications array
 * @returns {string} Next application id (e.g., 'app-056')
 */
function generateNextAppId(apps) {
  let maxNum = 0;
  for (const app of apps) {
    const match = app.id.match(/^app-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `app-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * @typedef {Object} ApplicationFilter
 * @property {string} [portfolio] - Filter by portfolio name (exact match)
 * @property {string} [status] - Filter by status: 'active' | 'inactive' | 'archived' | 'in_development' | 'deprecated'
 * @property {string} [riskLevel] - Filter by risk level: 'critical' | 'high' | 'medium' | 'low'
 * @property {string} [owner] - Filter by owner name (partial match, case-insensitive)
 * @property {string} [searchTerm] - Search term to match against name, portfolio, owner, or description (case-insensitive)
 * @property {boolean} [includeArchived] - Whether to include archived applications (defaults to false)
 * @property {number} [limit] - Maximum number of results to return
 * @property {number} [offset] - Number of results to skip (for pagination)
 * @property {string} [sortBy] - Field to sort by: 'name' | 'qualityScore' | 'testCoverage' | 'lastRelease' (defaults to 'name')
 * @property {string} [sortOrder] - Sort order: 'asc' | 'desc' (defaults to 'asc')
 */

/**
 * Retrieves applications with optional filtering, sorting, and pagination.
 *
 * @param {ApplicationFilter} [filters] - Optional filter criteria
 * @returns {Promise<{applications: import('../data/mockApplications.js').MockApplication[], total: number}>} Filtered applications and total count before pagination
 */
export async function getApplications(filters = {}) {
  await simulateDelay();

  let apps = loadApplications();

  // Exclude archived by default
  if (!filters.includeArchived) {
    apps = apps.filter((app) => !app.archived);
  }

  if (filters.portfolio) {
    apps = apps.filter((app) => app.portfolio === filters.portfolio);
  }

  if (filters.status) {
    apps = apps.filter((app) => app.status === filters.status);
  }

  if (filters.riskLevel) {
    apps = apps.filter((app) => app.riskLevel === filters.riskLevel);
  }

  if (filters.owner) {
    const ownerLower = filters.owner.toLowerCase();
    apps = apps.filter((app) => app.owner.toLowerCase().includes(ownerLower));
  }

  if (filters.searchTerm) {
    const termLower = filters.searchTerm.toLowerCase();
    apps = apps.filter((app) =>
      app.name.toLowerCase().includes(termLower) ||
      app.portfolio.toLowerCase().includes(termLower) ||
      app.owner.toLowerCase().includes(termLower) ||
      app.description.toLowerCase().includes(termLower)
    );
  }

  // Sorting
  const sortBy = filters.sortBy || 'name';
  const sortOrder = filters.sortOrder || 'asc';
  const multiplier = sortOrder === 'desc' ? -1 : 1;

  apps.sort((a, b) => {
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

  const total = apps.length;

  // Pagination
  if (filters.offset !== undefined && filters.offset > 0) {
    apps = apps.slice(filters.offset);
  }

  if (filters.limit !== undefined && filters.limit > 0) {
    apps = apps.slice(0, filters.limit);
  }

  return { applications: apps, total };
}

/**
 * Retrieves a single application by its id.
 *
 * @param {string} id - The application id
 * @returns {Promise<import('../data/mockApplications.js').MockApplication|null>} The application or null if not found
 */
export async function getApplicationById(id) {
  await simulateDelay();

  if (!id) {
    return null;
  }

  const apps = loadApplications();
  return apps.find((app) => app.id === id) || null;
}

/**
 * Adds a new application to the repository.
 *
 * @param {Object} app - The application object to add
 * @param {string} app.name - Application name
 * @param {string} app.portfolio - Portfolio/department assignment
 * @param {string} app.owner - Application owner (fake PII)
 * @param {string} [app.ownerEmail] - Owner email address (fake PII)
 * @param {string} [app.status] - Application status (defaults to 'active')
 * @param {number} [app.qualityScore] - Quality score (0-100, defaults to 0)
 * @param {number} [app.testCoverage] - Test coverage percentage (0-100, defaults to 0)
 * @param {number} [app.automationRate] - Automation rate percentage (0-100, defaults to 0)
 * @param {string} [app.riskLevel] - Risk level (defaults to 'medium')
 * @param {string} [app.environment] - Deployment environment (defaults to 'development')
 * @param {string[]} [app.techStack] - Array of technologies used
 * @param {string} [app.description] - Brief description
 * @returns {Promise<import('../data/mockApplications.js').MockApplication>} The created application
 * @throws {Error} If required fields are missing
 */
export async function addApplication(app) {
  await simulateDelay();

  if (!app || typeof app !== 'object') {
    throw new Error('Application must be a non-null object.');
  }

  if (!app.name || typeof app.name !== 'string') {
    throw new Error('Application name is required and must be a string.');
  }

  if (!app.portfolio || typeof app.portfolio !== 'string') {
    throw new Error('Application portfolio is required and must be a string.');
  }

  if (!app.owner || typeof app.owner !== 'string') {
    throw new Error('Application owner is required and must be a string.');
  }

  const apps = loadApplications();

  const now = new Date().toISOString();

  const newApp = {
    id: generateNextAppId(apps),
    name: app.name,
    portfolio: app.portfolio,
    owner: app.owner,
    ownerEmail: app.ownerEmail || '',
    status: app.status || 'active',
    qualityScore: typeof app.qualityScore === 'number' ? app.qualityScore : 0,
    testCoverage: typeof app.testCoverage === 'number' ? app.testCoverage : 0,
    automationRate: typeof app.automationRate === 'number' ? app.automationRate : 0,
    riskLevel: app.riskLevel || 'medium',
    lastRelease: app.lastRelease || '',
    environment: app.environment || 'development',
    techStack: Array.isArray(app.techStack) ? app.techStack : [],
    description: app.description || '',
    createdAt: now,
    updatedAt: now,
    archived: false,
  };

  apps.push(newApp);
  saveApplications(apps);

  return newApp;
}

/**
 * Updates an existing application's fields.
 *
 * @param {string} id - The application id to update
 * @param {Object} data - Partial application object with fields to update
 * @returns {Promise<import('../data/mockApplications.js').MockApplication>} The updated application
 * @throws {Error} If application is not found or id is missing
 */
export async function editApplication(id, data) {
  await simulateDelay();

  if (!id) {
    throw new Error('Application id is required.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Update data must be a non-null object.');
  }

  const apps = loadApplications();
  const index = apps.findIndex((app) => app.id === id);

  if (index === -1) {
    throw new Error(`Application with id ${id} not found.`);
  }

  // Do not allow overwriting the id or createdAt
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...safeUpdates } = data;

  apps[index] = {
    ...apps[index],
    ...safeUpdates,
    updatedAt: new Date().toISOString(),
  };

  saveApplications(apps);

  return apps[index];
}

/**
 * Archives an application by setting its archived flag to true.
 *
 * @param {string} id - The application id to archive
 * @returns {Promise<import('../data/mockApplications.js').MockApplication>} The archived application
 * @throws {Error} If application is not found
 */
export async function archiveApplication(id) {
  await simulateDelay();

  if (!id) {
    throw new Error('Application id is required.');
  }

  const apps = loadApplications();
  const index = apps.findIndex((app) => app.id === id);

  if (index === -1) {
    throw new Error(`Application with id ${id} not found.`);
  }

  apps[index] = {
    ...apps[index],
    archived: true,
    status: 'archived',
    updatedAt: new Date().toISOString(),
  };

  saveApplications(apps);

  return apps[index];
}

/**
 * Returns the distinct portfolio names present in the applications.
 *
 * @returns {string[]} Array of unique portfolio name strings
 */
export function getDistinctPortfolios() {
  const apps = loadApplications();
  const portfolios = new Set();
  for (const app of apps) {
    if (app.portfolio) {
      portfolios.add(app.portfolio);
    }
  }
  return Array.from(portfolios).sort();
}

/**
 * Returns the distinct statuses present in the applications.
 *
 * @returns {string[]} Array of unique status strings
 */
export function getDistinctAppStatuses() {
  const apps = loadApplications();
  const statuses = new Set();
  for (const app of apps) {
    if (app.status) {
      statuses.add(app.status);
    }
  }
  return Array.from(statuses).sort();
}

/**
 * Returns the distinct risk levels present in the applications.
 *
 * @returns {string[]} Array of unique risk level strings
 */
export function getDistinctRiskLevels() {
  const apps = loadApplications();
  const levels = new Set();
  for (const app of apps) {
    if (app.riskLevel) {
      levels.add(app.riskLevel);
    }
  }
  return Array.from(levels).sort();
}

/**
 * Resets the application repository to the original mock data.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetApplications() {
  const freshApps = JSON.parse(JSON.stringify(mockApplications));
  return saveApplications(freshApps);
}

// ---------------------------------------------------------------------------
// Test Assets
// ---------------------------------------------------------------------------

/**
 * Loads test assets from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockTestAssets.js').MockTestAsset[]} Array of test asset objects
 */
function loadTestAssets() {
  let assets = getItem(STORAGE_KEYS.TEST_ASSETS, null);
  if (!assets || !Array.isArray(assets) || assets.length === 0) {
    assets = JSON.parse(JSON.stringify(mockTestAssets));
    setItem(STORAGE_KEYS.TEST_ASSETS, assets);
  }
  return assets;
}

/**
 * Persists the test assets array to localStorage.
 * @param {import('../data/mockTestAssets.js').MockTestAsset[]} assets - Array of test asset objects
 * @returns {boolean} True if persisted successfully
 */
function saveTestAssets(assets) {
  return setItem(STORAGE_KEYS.TEST_ASSETS, assets);
}

/**
 * Generates the next unique test asset id based on existing assets.
 * @param {import('../data/mockTestAssets.js').MockTestAsset[]} assets - Current test assets array
 * @returns {string} Next test asset id (e.g., 'test-086')
 */
function generateNextTestAssetId(assets) {
  let maxNum = 0;
  for (const asset of assets) {
    const match = asset.id.match(/^test-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `test-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * @typedef {Object} TestAssetFilter
 * @property {string} [applicationId] - Filter by application id
 * @property {string} [application] - Filter by application name (exact match)
 * @property {string} [suiteId] - Filter by suite id
 * @property {string} [suite] - Filter by suite name (exact match)
 * @property {string} [type] - Filter by type: 'Manual' | 'Automated'
 * @property {string} [status] - Filter by status: 'Active' | 'Draft' | 'Retired'
 * @property {string} [priority] - Filter by priority: 'critical' | 'high' | 'medium' | 'low'
 * @property {string} [owner] - Filter by owner name (partial match, case-insensitive)
 * @property {string} [searchTerm] - Search term to match against name, application, suite, tags, or description (case-insensitive)
 * @property {string[]} [tags] - Filter by tags (any match)
 * @property {number} [limit] - Maximum number of results to return
 * @property {number} [offset] - Number of results to skip (for pagination)
 * @property {string} [sortBy] - Field to sort by: 'name' | 'priority' | 'lastModified' | 'version' (defaults to 'name')
 * @property {string} [sortOrder] - Sort order: 'asc' | 'desc' (defaults to 'asc')
 */

/**
 * Retrieves test assets with optional filtering, sorting, and pagination.
 *
 * @param {TestAssetFilter} [filters] - Optional filter criteria
 * @returns {Promise<{testAssets: import('../data/mockTestAssets.js').MockTestAsset[], total: number}>} Filtered test assets and total count before pagination
 */
export async function getTestAssets(filters = {}) {
  await simulateDelay();

  let assets = loadTestAssets();

  if (filters.applicationId) {
    assets = assets.filter((a) => a.applicationId === filters.applicationId);
  }

  if (filters.application) {
    assets = assets.filter((a) => a.application === filters.application);
  }

  if (filters.suiteId) {
    assets = assets.filter((a) => a.suiteId === filters.suiteId);
  }

  if (filters.suite) {
    assets = assets.filter((a) => a.suite === filters.suite);
  }

  if (filters.type) {
    assets = assets.filter((a) => a.type === filters.type);
  }

  if (filters.status) {
    assets = assets.filter((a) => a.status === filters.status);
  }

  if (filters.priority) {
    assets = assets.filter((a) => a.priority === filters.priority);
  }

  if (filters.owner) {
    const ownerLower = filters.owner.toLowerCase();
    assets = assets.filter((a) => a.owner.toLowerCase().includes(ownerLower));
  }

  if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
    const filterTagsLower = filters.tags.map((t) => t.toLowerCase());
    assets = assets.filter((a) => {
      if (!a.tags || !Array.isArray(a.tags)) {
        return false;
      }
      const assetTagsLower = a.tags.map((t) => t.toLowerCase());
      return filterTagsLower.some((ft) => assetTagsLower.includes(ft));
    });
  }

  if (filters.searchTerm) {
    const termLower = filters.searchTerm.toLowerCase();
    assets = assets.filter((a) =>
      a.name.toLowerCase().includes(termLower) ||
      a.application.toLowerCase().includes(termLower) ||
      a.suite.toLowerCase().includes(termLower) ||
      a.description.toLowerCase().includes(termLower) ||
      (a.tags && a.tags.some((tag) => tag.toLowerCase().includes(termLower)))
    );
  }

  // Sorting
  const sortBy = filters.sortBy || 'name';
  const sortOrder = filters.sortOrder || 'asc';
  const multiplier = sortOrder === 'desc' ? -1 : 1;

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  assets.sort((a, b) => {
    if (sortBy === 'priority') {
      const valA = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 4;
      const valB = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 4;
      return multiplier * (valA - valB);
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

  const total = assets.length;

  // Pagination
  if (filters.offset !== undefined && filters.offset > 0) {
    assets = assets.slice(filters.offset);
  }

  if (filters.limit !== undefined && filters.limit > 0) {
    assets = assets.slice(0, filters.limit);
  }

  return { testAssets: assets, total };
}

/**
 * Retrieves a single test asset by its id.
 *
 * @param {string} id - The test asset id
 * @returns {import('../data/mockTestAssets.js').MockTestAsset|null} The test asset or null if not found
 */
export function getTestAssetById(id) {
  if (!id) {
    return null;
  }
  const assets = loadTestAssets();
  return assets.find((a) => a.id === id) || null;
}

/**
 * Adds a new test asset to the repository.
 *
 * @param {Object} asset - The test asset object to add
 * @param {string} asset.name - Test asset name
 * @param {string} asset.applicationId - Associated application id
 * @param {string} asset.application - Associated application name
 * @param {string} asset.suiteId - Associated test suite id
 * @param {string} asset.suite - Associated test suite name
 * @param {string} [asset.type] - Test type (defaults to 'Manual')
 * @param {string} [asset.status] - Status (defaults to 'Draft')
 * @param {string} [asset.priority] - Priority (defaults to 'medium')
 * @param {string} [asset.owner] - Owner name (fake PII)
 * @param {string} [asset.ownerEmail] - Owner email (fake PII)
 * @param {string[]} [asset.tags] - Descriptive tags
 * @param {string} [asset.description] - Brief description
 * @returns {Promise<import('../data/mockTestAssets.js').MockTestAsset>} The created test asset
 * @throws {Error} If required fields are missing
 */
export async function addTestAsset(asset) {
  await simulateDelay();

  if (!asset || typeof asset !== 'object') {
    throw new Error('Test asset must be a non-null object.');
  }

  if (!asset.name || typeof asset.name !== 'string') {
    throw new Error('Test asset name is required and must be a string.');
  }

  if (!asset.applicationId || typeof asset.applicationId !== 'string') {
    throw new Error('Test asset applicationId is required and must be a string.');
  }

  if (!asset.application || typeof asset.application !== 'string') {
    throw new Error('Test asset application name is required and must be a string.');
  }

  if (!asset.suiteId || typeof asset.suiteId !== 'string') {
    throw new Error('Test asset suiteId is required and must be a string.');
  }

  if (!asset.suite || typeof asset.suite !== 'string') {
    throw new Error('Test asset suite name is required and must be a string.');
  }

  const assets = loadTestAssets();
  const now = new Date().toISOString();

  const newAsset = {
    id: generateNextTestAssetId(assets),
    name: asset.name,
    type: asset.type || 'Manual',
    applicationId: asset.applicationId,
    application: asset.application,
    suiteId: asset.suiteId,
    suite: asset.suite,
    status: asset.status || 'Draft',
    priority: asset.priority || 'medium',
    owner: asset.owner || '',
    ownerEmail: asset.ownerEmail || '',
    version: 1,
    lastModified: now,
    executionHistory: [],
    tags: Array.isArray(asset.tags) ? asset.tags : [],
    description: asset.description || '',
    createdAt: now,
  };

  assets.push(newAsset);
  saveTestAssets(assets);

  return newAsset;
}

/**
 * Updates an existing test asset's fields. Increments version on update.
 *
 * @param {string} id - The test asset id to update
 * @param {Object} data - Partial test asset object with fields to update
 * @returns {Promise<import('../data/mockTestAssets.js').MockTestAsset>} The updated test asset
 * @throws {Error} If test asset is not found or id is missing
 */
export async function editTestAsset(id, data) {
  await simulateDelay();

  if (!id) {
    throw new Error('Test asset id is required.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Update data must be a non-null object.');
  }

  const assets = loadTestAssets();
  const index = assets.findIndex((a) => a.id === id);

  if (index === -1) {
    throw new Error(`Test asset with id ${id} not found.`);
  }

  // Do not allow overwriting the id or createdAt
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...safeUpdates } = data;

  const currentVersion = assets[index].version || 1;

  assets[index] = {
    ...assets[index],
    ...safeUpdates,
    version: currentVersion + 1,
    lastModified: new Date().toISOString(),
  };

  saveTestAssets(assets);

  return assets[index];
}

/**
 * Retires a test asset by setting its status to 'Retired'.
 *
 * @param {string} id - The test asset id to retire
 * @returns {Promise<import('../data/mockTestAssets.js').MockTestAsset>} The retired test asset
 * @throws {Error} If test asset is not found
 */
export async function retireTestAsset(id) {
  await simulateDelay();

  if (!id) {
    throw new Error('Test asset id is required.');
  }

  const assets = loadTestAssets();
  const index = assets.findIndex((a) => a.id === id);

  if (index === -1) {
    throw new Error(`Test asset with id ${id} not found.`);
  }

  assets[index] = {
    ...assets[index],
    status: 'Retired',
    lastModified: new Date().toISOString(),
  };

  saveTestAssets(assets);

  return assets[index];
}

/**
 * Clones a test asset, creating a new copy with a new id and version 1.
 *
 * @param {string} id - The test asset id to clone
 * @returns {Promise<import('../data/mockTestAssets.js').MockTestAsset>} The cloned test asset
 * @throws {Error} If test asset is not found
 */
export async function cloneTestAsset(id) {
  await simulateDelay();

  if (!id) {
    throw new Error('Test asset id is required.');
  }

  const assets = loadTestAssets();
  const source = assets.find((a) => a.id === id);

  if (!source) {
    throw new Error(`Test asset with id ${id} not found.`);
  }

  const now = new Date().toISOString();

  const cloned = {
    ...JSON.parse(JSON.stringify(source)),
    id: generateNextTestAssetId(assets),
    name: `${source.name} (Copy)`,
    status: 'Draft',
    version: 1,
    lastModified: now,
    executionHistory: [],
    createdAt: now,
  };

  assets.push(cloned);
  saveTestAssets(assets);

  return cloned;
}

/**
 * Returns the version history for a test asset based on its execution history
 * and current version number.
 *
 * @param {string} id - The test asset id
 * @returns {Promise<{id: string, name: string, currentVersion: number, history: Array<{version: number, modifiedAt: string, notes: string}>}>} Version history object
 * @throws {Error} If test asset is not found
 */
export async function getTestAssetVersionHistory(id) {
  await simulateDelay();

  if (!id) {
    throw new Error('Test asset id is required.');
  }

  const assets = loadTestAssets();
  const asset = assets.find((a) => a.id === id);

  if (!asset) {
    throw new Error(`Test asset with id ${id} not found.`);
  }

  const currentVersion = asset.version || 1;
  const history = [];

  // Build version history from execution history entries and version number
  for (let v = 1; v <= currentVersion; v++) {
    const entry = {
      version: v,
      modifiedAt: v === currentVersion ? asset.lastModified : (asset.createdAt || ''),
      notes: v === 1 ? 'Initial version' : `Updated to version ${v}`,
    };

    // Try to find execution history entries that might correspond to this version
    if (asset.executionHistory && Array.isArray(asset.executionHistory)) {
      const execForVersion = asset.executionHistory.find((exec) => {
        if (exec.notes) {
          return true;
        }
        return false;
      });
      if (execForVersion && v === currentVersion) {
        entry.notes = execForVersion.notes || entry.notes;
      }
    }

    history.push(entry);
  }

  return {
    id: asset.id,
    name: asset.name,
    currentVersion,
    history,
  };
}

/**
 * Returns the distinct application names present in the test assets.
 *
 * @returns {string[]} Array of unique application name strings
 */
export function getDistinctTestAssetApplications() {
  const assets = loadTestAssets();
  const applications = new Set();
  for (const asset of assets) {
    if (asset.application) {
      applications.add(asset.application);
    }
  }
  return Array.from(applications).sort();
}

/**
 * Returns the distinct suite names present in the test assets.
 *
 * @returns {string[]} Array of unique suite name strings
 */
export function getDistinctTestAssetSuites() {
  const assets = loadTestAssets();
  const suites = new Set();
  for (const asset of assets) {
    if (asset.suite) {
      suites.add(asset.suite);
    }
  }
  return Array.from(suites).sort();
}

/**
 * Returns the distinct tags present in the test assets.
 *
 * @returns {string[]} Array of unique tag strings
 */
export function getDistinctTestAssetTags() {
  const assets = loadTestAssets();
  const tags = new Set();
  for (const asset of assets) {
    if (asset.tags && Array.isArray(asset.tags)) {
      for (const tag of asset.tags) {
        tags.add(tag);
      }
    }
  }
  return Array.from(tags).sort();
}

/**
 * Resets the test asset repository to the original mock data.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetTestAssets() {
  const freshAssets = JSON.parse(JSON.stringify(mockTestAssets));
  return saveTestAssets(freshAssets);
}

// ---------------------------------------------------------------------------
// Demand Items
// ---------------------------------------------------------------------------

/**
 * Loads demand items from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockDemand.js').MockDemandItem[]} Array of demand item objects
 */
function loadDemandItems() {
  let items = getItem(STORAGE_KEYS.DEMAND_ITEMS, null);
  if (!items || !Array.isArray(items) || items.length === 0) {
    items = JSON.parse(JSON.stringify(mockDemand));
    setItem(STORAGE_KEYS.DEMAND_ITEMS, items);
  }
  return items;
}

/**
 * Persists the demand items array to localStorage.
 * @param {import('../data/mockDemand.js').MockDemandItem[]} items - Array of demand item objects
 * @returns {boolean} True if persisted successfully
 */
function saveDemandItems(items) {
  return setItem(STORAGE_KEYS.DEMAND_ITEMS, items);
}

/**
 * Generates the next unique demand item id based on existing items.
 * @param {import('../data/mockDemand.js').MockDemandItem[]} items - Current demand items array
 * @returns {string} Next demand item id (e.g., 'demand-046')
 */
function generateNextDemandId(items) {
  let maxNum = 0;
  for (const item of items) {
    const match = item.id.match(/^demand-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `demand-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * @typedef {Object} DemandItemFilter
 * @property {string} [status] - Filter by status: 'New' | 'InReview' | 'Approved' | 'Assigned' | 'InProgress' | 'Closed'
 * @property {string} [priority] - Filter by priority: 'critical' | 'high' | 'medium' | 'low'
 * @property {string} [portfolio] - Filter by portfolio name (exact match)
 * @property {string} [requestor] - Filter by requestor name (partial match, case-insensitive)
 * @property {string} [assignee] - Filter by assignee name (partial match, case-insensitive)
 * @property {string} [searchTerm] - Search term to match against title, description, requestor, assignee, or portfolio (case-insensitive)
 * @property {number} [limit] - Maximum number of results to return
 * @property {number} [offset] - Number of results to skip (for pagination)
 * @property {string} [sortBy] - Field to sort by: 'title' | 'priority' | 'createdDate' | 'dueDate' | 'status' (defaults to 'createdDate')
 * @property {string} [sortOrder] - Sort order: 'asc' | 'desc' (defaults to 'desc')
 */

/**
 * Retrieves demand items with optional filtering, sorting, and pagination.
 *
 * @param {DemandItemFilter} [filters] - Optional filter criteria
 * @returns {Promise<{demandItems: import('../data/mockDemand.js').MockDemandItem[], total: number}>} Filtered demand items and total count before pagination
 */
export async function getDemandItems(filters = {}) {
  await simulateDelay();

  let items = loadDemandItems();

  if (filters.status) {
    items = items.filter((item) => item.status === filters.status);
  }

  if (filters.priority) {
    items = items.filter((item) => item.priority === filters.priority);
  }

  if (filters.portfolio) {
    items = items.filter((item) => item.portfolio === filters.portfolio);
  }

  if (filters.requestor) {
    const requestorLower = filters.requestor.toLowerCase();
    items = items.filter((item) => item.requestor.toLowerCase().includes(requestorLower));
  }

  if (filters.assignee) {
    const assigneeLower = filters.assignee.toLowerCase();
    items = items.filter((item) => item.assignee && item.assignee.toLowerCase().includes(assigneeLower));
  }

  if (filters.searchTerm) {
    const termLower = filters.searchTerm.toLowerCase();
    items = items.filter((item) =>
      item.title.toLowerCase().includes(termLower) ||
      item.description.toLowerCase().includes(termLower) ||
      item.requestor.toLowerCase().includes(termLower) ||
      (item.assignee && item.assignee.toLowerCase().includes(termLower)) ||
      item.portfolio.toLowerCase().includes(termLower)
    );
  }

  // Sorting
  const sortBy = filters.sortBy || 'createdDate';
  const sortOrder = filters.sortOrder || 'desc';
  const multiplier = sortOrder === 'desc' ? -1 : 1;

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const statusOrder = { New: 0, InReview: 1, Approved: 2, Assigned: 3, InProgress: 4, Closed: 5 };

  items.sort((a, b) => {
    if (sortBy === 'priority') {
      const valA = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 4;
      const valB = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 4;
      return multiplier * (valA - valB);
    }

    if (sortBy === 'status') {
      const valA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 6;
      const valB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 6;
      return multiplier * (valA - valB);
    }

    if (sortBy === 'createdDate' || sortBy === 'dueDate') {
      const dateA = new Date(a[sortBy] || 0).getTime();
      const dateB = new Date(b[sortBy] || 0).getTime();
      return multiplier * (dateA - dateB);
    }

    let valA = a[sortBy];
    let valB = b[sortBy];

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB || '').toLowerCase();
      return multiplier * valA.localeCompare(valB);
    }

    return 0;
  });

  const total = items.length;

  // Pagination
  if (filters.offset !== undefined && filters.offset > 0) {
    items = items.slice(filters.offset);
  }

  if (filters.limit !== undefined && filters.limit > 0) {
    items = items.slice(0, filters.limit);
  }

  return { demandItems: items, total };
}

/**
 * Retrieves a single demand item by its id.
 *
 * @param {string} id - The demand item id
 * @returns {import('../data/mockDemand.js').MockDemandItem|null} The demand item or null if not found
 */
export function getDemandItemById(id) {
  if (!id) {
    return null;
  }
  const items = loadDemandItems();
  return items.find((item) => item.id === id) || null;
}

/**
 * Adds a new demand item to the repository.
 *
 * @param {Object} item - The demand item object to add
 * @param {string} item.title - Demand item title
 * @param {string} item.description - Detailed description
 * @param {string} item.requestor - Requestor name (fake PII)
 * @param {string} [item.requestorEmail] - Requestor email (fake PII)
 * @param {string} [item.priority] - Priority level (defaults to 'medium')
 * @param {string} [item.status] - Status (defaults to 'New')
 * @param {string} [item.assignee] - Assignee name (fake PII)
 * @param {string} [item.assigneeEmail] - Assignee email (fake PII)
 * @param {string} [item.portfolio] - Portfolio/department
 * @param {string} [item.dueDate] - ISO 8601 due date
 * @param {string} [item.approver] - Approver name (fake PII)
 * @param {string} [item.approverEmail] - Approver email (fake PII)
 * @returns {Promise<import('../data/mockDemand.js').MockDemandItem>} The created demand item
 * @throws {Error} If required fields are missing
 */
export async function addDemandItem(item) {
  await simulateDelay();

  if (!item || typeof item !== 'object') {
    throw new Error('Demand item must be a non-null object.');
  }

  if (!item.title || typeof item.title !== 'string') {
    throw new Error('Demand item title is required and must be a string.');
  }

  if (!item.description || typeof item.description !== 'string') {
    throw new Error('Demand item description is required and must be a string.');
  }

  if (!item.requestor || typeof item.requestor !== 'string') {
    throw new Error('Demand item requestor is required and must be a string.');
  }

  const items = loadDemandItems();
  const now = new Date().toISOString();

  const newItem = {
    id: generateNextDemandId(items),
    title: item.title,
    description: item.description,
    requestor: item.requestor,
    requestorEmail: item.requestorEmail || '',
    priority: item.priority || 'medium',
    status: item.status || 'New',
    assignee: item.assignee || '',
    assigneeEmail: item.assigneeEmail || '',
    portfolio: item.portfolio || '',
    createdDate: now,
    dueDate: item.dueDate || '',
    approver: item.approver || '',
    approverEmail: item.approverEmail || '',
    comments: [],
  };

  items.push(newItem);
  saveDemandItems(items);

  return newItem;
}

/**
 * Updates an existing demand item's fields.
 *
 * @param {string} id - The demand item id to update
 * @param {Object} data - Partial demand item object with fields to update
 * @returns {Promise<import('../data/mockDemand.js').MockDemandItem>} The updated demand item
 * @throws {Error} If demand item is not found or id is missing
 */
export async function updateDemandItem(id, data) {
  await simulateDelay();

  if (!id) {
    throw new Error('Demand item id is required.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Update data must be a non-null object.');
  }

  const items = loadDemandItems();
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error(`Demand item with id ${id} not found.`);
  }

  // Do not allow overwriting the id or createdDate
  const { id: _ignoredId, createdDate: _ignoredCreatedDate, ...safeUpdates } = data;

  items[index] = {
    ...items[index],
    ...safeUpdates,
  };

  saveDemandItems(items);

  return items[index];
}

/**
 * Closes a demand item by setting its status to 'Closed'.
 *
 * @param {string} id - The demand item id to close
 * @returns {Promise<import('../data/mockDemand.js').MockDemandItem>} The closed demand item
 * @throws {Error} If demand item is not found
 */
export async function closeDemandItem(id) {
  await simulateDelay();

  if (!id) {
    throw new Error('Demand item id is required.');
  }

  const items = loadDemandItems();
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error(`Demand item with id ${id} not found.`);
  }

  items[index] = {
    ...items[index],
    status: 'Closed',
  };

  saveDemandItems(items);

  return items[index];
}

/**
 * Adds a comment to a demand item.
 *
 * @param {string} id - The demand item id
 * @param {Object} comment - The comment object
 * @param {string} comment.author - Comment author name (fake PII)
 * @param {string} comment.text - Comment text
 * @returns {Promise<import('../data/mockDemand.js').MockDemandItem>} The updated demand item
 * @throws {Error} If demand item is not found or comment is invalid
 */
export async function addDemandComment(id, comment) {
  await simulateDelay();

  if (!id) {
    throw new Error('Demand item id is required.');
  }

  if (!comment || typeof comment !== 'object') {
    throw new Error('Comment must be a non-null object.');
  }

  if (!comment.author || typeof comment.author !== 'string') {
    throw new Error('Comment author is required and must be a string.');
  }

  if (!comment.text || typeof comment.text !== 'string') {
    throw new Error('Comment text is required and must be a string.');
  }

  const items = loadDemandItems();
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error(`Demand item with id ${id} not found.`);
  }

  const comments = items[index].comments || [];

  // Generate comment id
  let maxCommentNum = 0;
  for (const c of comments) {
    const match = c.id.match(/^comment-\d+-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxCommentNum) {
        maxCommentNum = num;
      }
    }
  }

  const demandNum = id.replace('demand-', '');
  const newComment = {
    id: `comment-${demandNum}-${maxCommentNum + 1}`,
    author: comment.author,
    text: comment.text,
    createdAt: new Date().toISOString(),
  };

  comments.push(newComment);
  items[index] = { ...items[index], comments };

  saveDemandItems(items);

  return items[index];
}

/**
 * Returns the distinct statuses present in the demand items.
 *
 * @returns {string[]} Array of unique status strings
 */
export function getDistinctDemandStatuses() {
  const items = loadDemandItems();
  const statuses = new Set();
  for (const item of items) {
    if (item.status) {
      statuses.add(item.status);
    }
  }
  return Array.from(statuses).sort();
}

/**
 * Returns the distinct priorities present in the demand items.
 *
 * @returns {string[]} Array of unique priority strings
 */
export function getDistinctDemandPriorities() {
  const items = loadDemandItems();
  const priorities = new Set();
  for (const item of items) {
    if (item.priority) {
      priorities.add(item.priority);
    }
  }
  return Array.from(priorities).sort();
}

/**
 * Returns the distinct portfolios present in the demand items.
 *
 * @returns {string[]} Array of unique portfolio strings
 */
export function getDistinctDemandPortfolios() {
  const items = loadDemandItems();
  const portfolios = new Set();
  for (const item of items) {
    if (item.portfolio) {
      portfolios.add(item.portfolio);
    }
  }
  return Array.from(portfolios).sort();
}

/**
 * Returns a count summary of demand items grouped by status.
 *
 * @returns {Object.<string, number>} Object mapping statuses to counts
 */
export function getDemandCountByStatus() {
  const items = loadDemandItems();
  const counts = {};
  for (const item of items) {
    const status = item.status || 'Unknown';
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}

/**
 * Returns a count summary of demand items grouped by priority.
 *
 * @returns {Object.<string, number>} Object mapping priorities to counts
 */
export function getDemandCountByPriority() {
  const items = loadDemandItems();
  const counts = {};
  for (const item of items) {
    const priority = item.priority || 'Unknown';
    counts[priority] = (counts[priority] || 0) + 1;
  }
  return counts;
}

/**
 * Resets the demand items repository to the original mock data.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetDemandItems() {
  const freshItems = JSON.parse(JSON.stringify(mockDemand));
  return saveDemandItems(freshItems);
}

/**
 * Resets all repository data (applications, test assets, demand items) to original mock data.
 *
 * @returns {boolean} True if all resets were successful
 */
export function resetAll() {
  const appsReset = resetApplications();
  const assetsReset = resetTestAssets();
  const demandReset = resetDemandItems();
  return appsReset && assetsReset && demandReset;
}
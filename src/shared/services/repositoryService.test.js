import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for RepositoryService
 * Tests CRUD operations for applications, test assets, and demand items.
 * @module repositoryService.test
 */

// Mock storage module before importing repositoryService
vi.mock('./storage.js', () => {
  const store = {};
  return {
    getItem: vi.fn((key, defaultValue) => {
      if (store[key] !== undefined) {
        return JSON.parse(JSON.stringify(store[key]));
      }
      return defaultValue;
    }),
    setItem: vi.fn((key, value) => {
      store[key] = JSON.parse(JSON.stringify(value));
      return true;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
      return true;
    }),
    maskPII: vi.fn((obj) => obj),
    initializeStorage: vi.fn(() => true),
    resetAll: vi.fn(() => true),
    clearAll: vi.fn(() => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
      return true;
    }),
    _store: store,
  };
});

// Mock authManager to avoid side effects
vi.mock('./authManager.js', () => ({
  getSession: vi.fn(() => ({
    userId: 'user-001',
    name: 'Test User',
    email: 'test@kp-etsip.gov',
    role: 'admin',
    portfolio: 'Test Portfolio',
    applicationAccess: [],
    token: 'mock-token',
    loginAt: '2024-06-13T08:00:00Z',
  })),
  checkAccess: vi.fn(() => true),
}));

// Mock auditLogService to avoid side effects
vi.mock('./auditLogService.js', () => ({
  logAction: vi.fn(),
}));

import {
  getApplications,
  getApplicationById,
  addApplication,
  editApplication,
  archiveApplication,
  getDistinctPortfolios,
  getDistinctAppStatuses,
  getDistinctRiskLevels,
  resetApplications,
  getTestAssets,
  getTestAssetById,
  addTestAsset,
  editTestAsset,
  retireTestAsset,
  cloneTestAsset,
  getDistinctTestAssetApplications,
  getDistinctTestAssetSuites,
  resetTestAssets,
  getDemandItems,
  getDemandItemById,
  addDemandItem,
  updateDemandItem,
  closeDemandItem,
  addDemandComment,
  getDistinctDemandStatuses,
  getDistinctDemandPriorities,
  getDemandCountByStatus,
  resetDemandItems,
  resetAll,
} from './repositoryService.js';

import { _store } from './storage.js';

describe('RepositoryService', () => {
  beforeEach(() => {
    // Clear the mock store before each test
    for (const key of Object.keys(_store)) {
      delete _store[key];
    }
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Applications
  // -------------------------------------------------------------------------
  describe('Applications', () => {
    describe('getApplications', () => {
      it('returns all non-archived applications by default', async () => {
        const result = await getApplications();
        expect(result).toBeDefined();
        expect(result.applications).toBeDefined();
        expect(Array.isArray(result.applications)).toBe(true);
        expect(result.total).toBeGreaterThan(0);

        // Should not include archived applications by default
        const archivedApps = result.applications.filter((app) => app.archived === true);
        expect(archivedApps.length).toBe(0);
      });

      it('includes archived applications when includeArchived is true', async () => {
        const result = await getApplications({ includeArchived: true });
        expect(result).toBeDefined();
        expect(result.applications).toBeDefined();

        const archivedApps = result.applications.filter((app) => app.archived === true);
        expect(archivedApps.length).toBeGreaterThan(0);
      });

      it('filters applications by portfolio', async () => {
        const result = await getApplications({ portfolio: 'Education Management' });
        expect(result).toBeDefined();
        expect(result.applications.length).toBeGreaterThan(0);

        for (const app of result.applications) {
          expect(app.portfolio).toBe('Education Management');
        }
      });

      it('filters applications by status', async () => {
        const result = await getApplications({ status: 'active' });
        expect(result).toBeDefined();
        expect(result.applications.length).toBeGreaterThan(0);

        for (const app of result.applications) {
          expect(app.status).toBe('active');
        }
      });

      it('filters applications by riskLevel', async () => {
        const result = await getApplications({ riskLevel: 'low' });
        expect(result).toBeDefined();
        expect(result.applications.length).toBeGreaterThan(0);

        for (const app of result.applications) {
          expect(app.riskLevel).toBe('low');
        }
      });

      it('filters applications by searchTerm', async () => {
        const result = await getApplications({ searchTerm: 'EMIS' });
        expect(result).toBeDefined();
        expect(result.applications.length).toBeGreaterThan(0);

        for (const app of result.applications) {
          const matchesSearch =
            app.name.toLowerCase().includes('emis') ||
            app.portfolio.toLowerCase().includes('emis') ||
            app.owner.toLowerCase().includes('emis') ||
            app.description.toLowerCase().includes('emis');
          expect(matchesSearch).toBe(true);
        }
      });

      it('returns empty array when no applications match filters', async () => {
        const result = await getApplications({ portfolio: 'NonExistentPortfolio' });
        expect(result).toBeDefined();
        expect(result.applications).toEqual([]);
        expect(result.total).toBe(0);
      });

      it('supports pagination with limit and offset', async () => {
        const allResult = await getApplications();
        const paginatedResult = await getApplications({ limit: 5, offset: 0 });

        expect(paginatedResult.applications.length).toBeLessThanOrEqual(5);
        expect(paginatedResult.total).toBe(allResult.total);
      });

      it('sorts applications by name ascending by default', async () => {
        const result = await getApplications({ sortBy: 'name', sortOrder: 'asc' });
        expect(result.applications.length).toBeGreaterThan(1);

        for (let i = 1; i < result.applications.length; i++) {
          const prev = result.applications[i - 1].name.toLowerCase();
          const curr = result.applications[i].name.toLowerCase();
          expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
        }
      });

      it('sorts applications by qualityScore descending', async () => {
        const result = await getApplications({ sortBy: 'qualityScore', sortOrder: 'desc' });
        expect(result.applications.length).toBeGreaterThan(1);

        for (let i = 1; i < result.applications.length; i++) {
          expect(result.applications[i - 1].qualityScore).toBeGreaterThanOrEqual(
            result.applications[i].qualityScore
          );
        }
      });
    });

    describe('getApplicationById', () => {
      it('returns an application by id', async () => {
        const app = await getApplicationById('app-001');
        expect(app).toBeDefined();
        expect(app.id).toBe('app-001');
        expect(app.name).toBe('EMIS Core');
      });

      it('returns null for non-existent id', async () => {
        const app = await getApplicationById('app-999');
        expect(app).toBeNull();
      });

      it('returns null for empty id', async () => {
        const app = await getApplicationById('');
        expect(app).toBeNull();
      });
    });

    describe('addApplication', () => {
      it('creates a new application and persists it', async () => {
        const newApp = await addApplication({
          name: 'Test Application',
          portfolio: 'Education Management',
          owner: 'Test Owner',
          ownerEmail: 'test@kp-etsip.gov',
          status: 'active',
          riskLevel: 'low',
          environment: 'development',
          description: 'A test application',
          techStack: ['React', 'Node.js'],
        });

        expect(newApp).toBeDefined();
        expect(newApp.id).toBeDefined();
        expect(newApp.name).toBe('Test Application');
        expect(newApp.portfolio).toBe('Education Management');
        expect(newApp.owner).toBe('Test Owner');
        expect(newApp.status).toBe('active');
        expect(newApp.riskLevel).toBe('low');
        expect(newApp.archived).toBe(false);
        expect(newApp.createdAt).toBeDefined();
        expect(newApp.updatedAt).toBeDefined();
        expect(newApp.techStack).toEqual(['React', 'Node.js']);

        // Verify it was persisted
        const fetched = await getApplicationById(newApp.id);
        expect(fetched).toBeDefined();
        expect(fetched.name).toBe('Test Application');
      });

      it('assigns default values for optional fields', async () => {
        const newApp = await addApplication({
          name: 'Minimal App',
          portfolio: 'Test Portfolio',
          owner: 'Test Owner',
        });

        expect(newApp.status).toBe('active');
        expect(newApp.riskLevel).toBe('medium');
        expect(newApp.environment).toBe('development');
        expect(newApp.qualityScore).toBe(0);
        expect(newApp.testCoverage).toBe(0);
        expect(newApp.automationRate).toBe(0);
        expect(newApp.techStack).toEqual([]);
        expect(newApp.description).toBe('');
        expect(newApp.archived).toBe(false);
      });

      it('throws error when name is missing', async () => {
        await expect(
          addApplication({ portfolio: 'Test', owner: 'Test' })
        ).rejects.toThrow('Application name is required');
      });

      it('throws error when portfolio is missing', async () => {
        await expect(
          addApplication({ name: 'Test', owner: 'Test' })
        ).rejects.toThrow('Application portfolio is required');
      });

      it('throws error when owner is missing', async () => {
        await expect(
          addApplication({ name: 'Test', portfolio: 'Test' })
        ).rejects.toThrow('Application owner is required');
      });

      it('throws error when input is not an object', async () => {
        await expect(addApplication(null)).rejects.toThrow();
      });
    });

    describe('editApplication', () => {
      it('updates application fields correctly', async () => {
        const updated = await editApplication('app-001', {
          name: 'Updated EMIS Core',
          qualityScore: 99,
        });

        expect(updated).toBeDefined();
        expect(updated.id).toBe('app-001');
        expect(updated.name).toBe('Updated EMIS Core');
        expect(updated.qualityScore).toBe(99);
        expect(updated.updatedAt).toBeDefined();
      });

      it('does not overwrite the id field', async () => {
        const updated = await editApplication('app-001', {
          id: 'app-999',
          name: 'Attempted ID Override',
        });

        expect(updated.id).toBe('app-001');
        expect(updated.name).toBe('Attempted ID Override');
      });

      it('throws error for non-existent application', async () => {
        await expect(
          editApplication('app-999', { name: 'Test' })
        ).rejects.toThrow('not found');
      });

      it('throws error when id is missing', async () => {
        await expect(
          editApplication('', { name: 'Test' })
        ).rejects.toThrow('Application id is required');
      });

      it('throws error when data is not an object', async () => {
        await expect(
          editApplication('app-001', null)
        ).rejects.toThrow();
      });
    });

    describe('archiveApplication', () => {
      it('sets archived flag and status to archived', async () => {
        const archived = await archiveApplication('app-001');

        expect(archived).toBeDefined();
        expect(archived.id).toBe('app-001');
        expect(archived.archived).toBe(true);
        expect(archived.status).toBe('archived');
        expect(archived.updatedAt).toBeDefined();
      });

      it('persists the archived state', async () => {
        await archiveApplication('app-001');

        const fetched = await getApplicationById('app-001');
        expect(fetched.archived).toBe(true);
        expect(fetched.status).toBe('archived');
      });

      it('throws error for non-existent application', async () => {
        await expect(archiveApplication('app-999')).rejects.toThrow('not found');
      });

      it('throws error when id is missing', async () => {
        await expect(archiveApplication('')).rejects.toThrow('Application id is required');
      });
    });

    describe('getDistinctPortfolios', () => {
      it('returns an array of unique portfolio names', () => {
        const portfolios = getDistinctPortfolios();
        expect(Array.isArray(portfolios)).toBe(true);
        expect(portfolios.length).toBeGreaterThan(0);

        // Check uniqueness
        const uniqueSet = new Set(portfolios);
        expect(uniqueSet.size).toBe(portfolios.length);
      });

      it('returns sorted portfolio names', () => {
        const portfolios = getDistinctPortfolios();
        for (let i = 1; i < portfolios.length; i++) {
          expect(portfolios[i - 1].localeCompare(portfolios[i])).toBeLessThanOrEqual(0);
        }
      });
    });

    describe('getDistinctAppStatuses', () => {
      it('returns an array of unique status strings', () => {
        const statuses = getDistinctAppStatuses();
        expect(Array.isArray(statuses)).toBe(true);
        expect(statuses.length).toBeGreaterThan(0);
        expect(statuses).toContain('active');
      });
    });

    describe('getDistinctRiskLevels', () => {
      it('returns an array of unique risk level strings', () => {
        const levels = getDistinctRiskLevels();
        expect(Array.isArray(levels)).toBe(true);
        expect(levels.length).toBeGreaterThan(0);
        expect(levels).toContain('low');
        expect(levels).toContain('medium');
      });
    });

    describe('resetApplications', () => {
      it('resets applications to original mock data', async () => {
        // Modify an application
        await editApplication('app-001', { name: 'Modified Name' });
        const modified = await getApplicationById('app-001');
        expect(modified.name).toBe('Modified Name');

        // Reset
        const result = resetApplications();
        expect(result).toBe(true);

        // Verify reset
        const reset = await getApplicationById('app-001');
        expect(reset.name).toBe('EMIS Core');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Test Assets
  // -------------------------------------------------------------------------
  describe('Test Assets', () => {
    describe('getTestAssets', () => {
      it('returns all test assets by default', async () => {
        const result = await getTestAssets();
        expect(result).toBeDefined();
        expect(result.testAssets).toBeDefined();
        expect(Array.isArray(result.testAssets)).toBe(true);
        expect(result.total).toBeGreaterThan(0);
      });

      it('filters test assets by type', async () => {
        const result = await getTestAssets({ type: 'Automated' });
        expect(result.testAssets.length).toBeGreaterThan(0);

        for (const asset of result.testAssets) {
          expect(asset.type).toBe('Automated');
        }
      });

      it('filters test assets by application', async () => {
        const result = await getTestAssets({ application: 'EMIS Core' });
        expect(result.testAssets.length).toBeGreaterThan(0);

        for (const asset of result.testAssets) {
          expect(asset.application).toBe('EMIS Core');
        }
      });

      it('filters test assets by status', async () => {
        const result = await getTestAssets({ status: 'Active' });
        expect(result.testAssets.length).toBeGreaterThan(0);

        for (const asset of result.testAssets) {
          expect(asset.status).toBe('Active');
        }
      });

      it('filters test assets by priority', async () => {
        const result = await getTestAssets({ priority: 'critical' });
        expect(result.testAssets.length).toBeGreaterThan(0);

        for (const asset of result.testAssets) {
          expect(asset.priority).toBe('critical');
        }
      });

      it('filters test assets by suite', async () => {
        const result = await getTestAssets({ suite: 'Authentication Suite' });
        expect(result.testAssets.length).toBeGreaterThan(0);

        for (const asset of result.testAssets) {
          expect(asset.suite).toBe('Authentication Suite');
        }
      });

      it('filters test assets by searchTerm', async () => {
        const result = await getTestAssets({ searchTerm: 'login' });
        expect(result.testAssets.length).toBeGreaterThan(0);

        for (const asset of result.testAssets) {
          const matchesSearch =
            asset.name.toLowerCase().includes('login') ||
            asset.application.toLowerCase().includes('login') ||
            asset.suite.toLowerCase().includes('login') ||
            asset.description.toLowerCase().includes('login') ||
            (asset.tags && asset.tags.some((tag) => tag.toLowerCase().includes('login')));
          expect(matchesSearch).toBe(true);
        }
      });

      it('filters test assets by tags', async () => {
        const result = await getTestAssets({ tags: ['regression'] });
        expect(result.testAssets.length).toBeGreaterThan(0);

        for (const asset of result.testAssets) {
          const hasTag = asset.tags && asset.tags.some((t) => t.toLowerCase() === 'regression');
          expect(hasTag).toBe(true);
        }
      });

      it('returns empty array when no test assets match filters', async () => {
        const result = await getTestAssets({ application: 'NonExistentApp' });
        expect(result.testAssets).toEqual([]);
        expect(result.total).toBe(0);
      });

      it('supports pagination with limit and offset', async () => {
        const allResult = await getTestAssets();
        const paginatedResult = await getTestAssets({ limit: 5, offset: 0 });

        expect(paginatedResult.testAssets.length).toBeLessThanOrEqual(5);
        expect(paginatedResult.total).toBe(allResult.total);
      });
    });

    describe('getTestAssetById', () => {
      it('returns a test asset by id', () => {
        const asset = getTestAssetById('test-001');
        expect(asset).toBeDefined();
        expect(asset.id).toBe('test-001');
        expect(asset.name).toBe('Verify user login with valid credentials');
      });

      it('returns null for non-existent id', () => {
        const asset = getTestAssetById('test-999');
        expect(asset).toBeNull();
      });

      it('returns null for empty id', () => {
        const asset = getTestAssetById('');
        expect(asset).toBeNull();
      });
    });

    describe('addTestAsset', () => {
      it('creates a new test asset and persists it', async () => {
        const newAsset = await addTestAsset({
          name: 'New Test Case',
          applicationId: 'app-001',
          application: 'EMIS Core',
          suiteId: 'suite-001',
          suite: 'Authentication Suite',
          type: 'Automated',
          status: 'Draft',
          priority: 'high',
          owner: 'Test Owner',
          ownerEmail: 'test@kp-etsip.gov',
          tags: ['smoke', 'new'],
          description: 'A new test case for testing.',
        });

        expect(newAsset).toBeDefined();
        expect(newAsset.id).toBeDefined();
        expect(newAsset.name).toBe('New Test Case');
        expect(newAsset.type).toBe('Automated');
        expect(newAsset.status).toBe('Draft');
        expect(newAsset.version).toBe(1);
        expect(newAsset.executionHistory).toEqual([]);
        expect(newAsset.tags).toEqual(['smoke', 'new']);

        // Verify persistence
        const fetched = getTestAssetById(newAsset.id);
        expect(fetched).toBeDefined();
        expect(fetched.name).toBe('New Test Case');
      });

      it('throws error when name is missing', async () => {
        await expect(
          addTestAsset({
            applicationId: 'app-001',
            application: 'EMIS Core',
            suiteId: 'suite-001',
            suite: 'Auth Suite',
          })
        ).rejects.toThrow('name is required');
      });

      it('throws error when applicationId is missing', async () => {
        await expect(
          addTestAsset({
            name: 'Test',
            application: 'EMIS Core',
            suiteId: 'suite-001',
            suite: 'Auth Suite',
          })
        ).rejects.toThrow('applicationId is required');
      });

      it('throws error when suiteId is missing', async () => {
        await expect(
          addTestAsset({
            name: 'Test',
            applicationId: 'app-001',
            application: 'EMIS Core',
            suite: 'Auth Suite',
          })
        ).rejects.toThrow('suiteId is required');
      });
    });

    describe('editTestAsset', () => {
      it('updates test asset fields and increments version', async () => {
        const original = getTestAssetById('test-001');
        const originalVersion = original.version;

        const updated = await editTestAsset('test-001', {
          name: 'Updated Test Name',
          priority: 'low',
        });

        expect(updated.id).toBe('test-001');
        expect(updated.name).toBe('Updated Test Name');
        expect(updated.priority).toBe('low');
        expect(updated.version).toBe(originalVersion + 1);
        expect(updated.lastModified).toBeDefined();
      });

      it('throws error for non-existent test asset', async () => {
        await expect(
          editTestAsset('test-999', { name: 'Test' })
        ).rejects.toThrow('not found');
      });

      it('throws error when id is missing', async () => {
        await expect(
          editTestAsset('', { name: 'Test' })
        ).rejects.toThrow('Test asset id is required');
      });
    });

    describe('retireTestAsset', () => {
      it('sets status to Retired', async () => {
        const retired = await retireTestAsset('test-001');
        expect(retired.id).toBe('test-001');
        expect(retired.status).toBe('Retired');
      });

      it('throws error for non-existent test asset', async () => {
        await expect(retireTestAsset('test-999')).rejects.toThrow('not found');
      });
    });

    describe('cloneTestAsset', () => {
      it('creates a copy with new id and version 1', async () => {
        const cloned = await cloneTestAsset('test-001');

        expect(cloned).toBeDefined();
        expect(cloned.id).not.toBe('test-001');
        expect(cloned.name).toContain('(Copy)');
        expect(cloned.status).toBe('Draft');
        expect(cloned.version).toBe(1);
        expect(cloned.executionHistory).toEqual([]);

        // Verify persistence
        const fetched = getTestAssetById(cloned.id);
        expect(fetched).toBeDefined();
        expect(fetched.name).toContain('(Copy)');
      });

      it('throws error for non-existent test asset', async () => {
        await expect(cloneTestAsset('test-999')).rejects.toThrow('not found');
      });
    });

    describe('getDistinctTestAssetApplications', () => {
      it('returns an array of unique application names', () => {
        const apps = getDistinctTestAssetApplications();
        expect(Array.isArray(apps)).toBe(true);
        expect(apps.length).toBeGreaterThan(0);
        expect(apps).toContain('EMIS Core');

        const uniqueSet = new Set(apps);
        expect(uniqueSet.size).toBe(apps.length);
      });
    });

    describe('getDistinctTestAssetSuites', () => {
      it('returns an array of unique suite names', () => {
        const suites = getDistinctTestAssetSuites();
        expect(Array.isArray(suites)).toBe(true);
        expect(suites.length).toBeGreaterThan(0);
        expect(suites).toContain('Authentication Suite');
      });
    });

    describe('resetTestAssets', () => {
      it('resets test assets to original mock data', async () => {
        await editTestAsset('test-001', { name: 'Modified Test' });
        const modified = getTestAssetById('test-001');
        expect(modified.name).toBe('Modified Test');

        const result = resetTestAssets();
        expect(result).toBe(true);

        const reset = getTestAssetById('test-001');
        expect(reset.name).toBe('Verify user login with valid credentials');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Demand Items
  // -------------------------------------------------------------------------
  describe('Demand Items', () => {
    describe('getDemandItems', () => {
      it('returns all demand items by default', async () => {
        const result = await getDemandItems();
        expect(result).toBeDefined();
        expect(result.demandItems).toBeDefined();
        expect(Array.isArray(result.demandItems)).toBe(true);
        expect(result.total).toBeGreaterThan(0);
      });

      it('filters demand items by status', async () => {
        const result = await getDemandItems({ status: 'Approved' });
        expect(result.demandItems.length).toBeGreaterThan(0);

        for (const item of result.demandItems) {
          expect(item.status).toBe('Approved');
        }
      });

      it('filters demand items by priority', async () => {
        const result = await getDemandItems({ priority: 'critical' });
        expect(result.demandItems.length).toBeGreaterThan(0);

        for (const item of result.demandItems) {
          expect(item.priority).toBe('critical');
        }
      });

      it('filters demand items by portfolio', async () => {
        const result = await getDemandItems({ portfolio: 'Education Management' });
        expect(result.demandItems.length).toBeGreaterThan(0);

        for (const item of result.demandItems) {
          expect(item.portfolio).toBe('Education Management');
        }
      });

      it('filters demand items by searchTerm', async () => {
        const result = await getDemandItems({ searchTerm: 'EMIS' });
        expect(result.demandItems.length).toBeGreaterThan(0);

        for (const item of result.demandItems) {
          const matchesSearch =
            item.title.toLowerCase().includes('emis') ||
            item.description.toLowerCase().includes('emis') ||
            item.requestor.toLowerCase().includes('emis') ||
            (item.assignee && item.assignee.toLowerCase().includes('emis')) ||
            item.portfolio.toLowerCase().includes('emis');
          expect(matchesSearch).toBe(true);
        }
      });

      it('returns empty array when no demand items match filters', async () => {
        const result = await getDemandItems({ portfolio: 'NonExistentPortfolio' });
        expect(result.demandItems).toEqual([]);
        expect(result.total).toBe(0);
      });

      it('sorts demand items by createdDate descending by default', async () => {
        const result = await getDemandItems({ sortBy: 'createdDate', sortOrder: 'desc' });
        expect(result.demandItems.length).toBeGreaterThan(1);

        for (let i = 1; i < result.demandItems.length; i++) {
          const prevDate = new Date(result.demandItems[i - 1].createdDate).getTime();
          const currDate = new Date(result.demandItems[i].createdDate).getTime();
          expect(prevDate).toBeGreaterThanOrEqual(currDate);
        }
      });

      it('supports pagination with limit and offset', async () => {
        const allResult = await getDemandItems();
        const paginatedResult = await getDemandItems({ limit: 5, offset: 0 });

        expect(paginatedResult.demandItems.length).toBeLessThanOrEqual(5);
        expect(paginatedResult.total).toBe(allResult.total);
      });
    });

    describe('getDemandItemById', () => {
      it('returns a demand item by id', () => {
        const item = getDemandItemById('demand-001');
        expect(item).toBeDefined();
        expect(item.id).toBe('demand-001');
        expect(item.title).toContain('EMIS Core');
      });

      it('returns null for non-existent id', () => {
        const item = getDemandItemById('demand-999');
        expect(item).toBeNull();
      });

      it('returns null for empty id', () => {
        const item = getDemandItemById('');
        expect(item).toBeNull();
      });
    });

    describe('addDemandItem', () => {
      it('creates a new demand item and persists it', async () => {
        const newItem = await addDemandItem({
          title: 'New Demand Item',
          description: 'A test demand item for unit testing.',
          requestor: 'Test Requestor',
          requestorEmail: 'requestor@kp-etsip.gov',
          priority: 'high',
          portfolio: 'Education Management',
          dueDate: '2024-12-31T17:00:00Z',
        });

        expect(newItem).toBeDefined();
        expect(newItem.id).toBeDefined();
        expect(newItem.title).toBe('New Demand Item');
        expect(newItem.description).toBe('A test demand item for unit testing.');
        expect(newItem.requestor).toBe('Test Requestor');
        expect(newItem.priority).toBe('high');
        expect(newItem.status).toBe('New');
        expect(newItem.comments).toEqual([]);
        expect(newItem.createdDate).toBeDefined();

        // Verify persistence
        const fetched = getDemandItemById(newItem.id);
        expect(fetched).toBeDefined();
        expect(fetched.title).toBe('New Demand Item');
      });

      it('assigns default values for optional fields', async () => {
        const newItem = await addDemandItem({
          title: 'Minimal Demand',
          description: 'Minimal description.',
          requestor: 'Test Requestor',
        });

        expect(newItem.priority).toBe('medium');
        expect(newItem.status).toBe('New');
        expect(newItem.assignee).toBe('');
        expect(newItem.portfolio).toBe('');
        expect(newItem.dueDate).toBe('');
        expect(newItem.approver).toBe('');
      });

      it('throws error when title is missing', async () => {
        await expect(
          addDemandItem({ description: 'Test', requestor: 'Test' })
        ).rejects.toThrow('title is required');
      });

      it('throws error when description is missing', async () => {
        await expect(
          addDemandItem({ title: 'Test', requestor: 'Test' })
        ).rejects.toThrow('description is required');
      });

      it('throws error when requestor is missing', async () => {
        await expect(
          addDemandItem({ title: 'Test', description: 'Test' })
        ).rejects.toThrow('requestor is required');
      });
    });

    describe('updateDemandItem', () => {
      it('updates demand item fields correctly', async () => {
        const updated = await updateDemandItem('demand-001', {
          status: 'InProgress',
          assignee: 'New Assignee',
        });

        expect(updated).toBeDefined();
        expect(updated.id).toBe('demand-001');
        expect(updated.status).toBe('InProgress');
        expect(updated.assignee).toBe('New Assignee');
      });

      it('does not overwrite the id field', async () => {
        const updated = await updateDemandItem('demand-001', {
          id: 'demand-999',
          status: 'InReview',
        });

        expect(updated.id).toBe('demand-001');
        expect(updated.status).toBe('InReview');
      });

      it('throws error for non-existent demand item', async () => {
        await expect(
          updateDemandItem('demand-999', { status: 'Closed' })
        ).rejects.toThrow('not found');
      });

      it('throws error when id is missing', async () => {
        await expect(
          updateDemandItem('', { status: 'Closed' })
        ).rejects.toThrow('Demand item id is required');
      });
    });

    describe('closeDemandItem', () => {
      it('sets status to Closed', async () => {
        const closed = await closeDemandItem('demand-001');
        expect(closed).toBeDefined();
        expect(closed.id).toBe('demand-001');
        expect(closed.status).toBe('Closed');
      });

      it('persists the closed state', async () => {
        await closeDemandItem('demand-001');
        const fetched = getDemandItemById('demand-001');
        expect(fetched.status).toBe('Closed');
      });

      it('throws error for non-existent demand item', async () => {
        await expect(closeDemandItem('demand-999')).rejects.toThrow('not found');
      });
    });

    describe('addDemandComment', () => {
      it('adds a comment to a demand item', async () => {
        const updated = await addDemandComment('demand-001', {
          author: 'Test Author',
          text: 'This is a test comment.',
        });

        expect(updated).toBeDefined();
        expect(updated.comments).toBeDefined();
        expect(updated.comments.length).toBeGreaterThan(0);

        const lastComment = updated.comments[updated.comments.length - 1];
        expect(lastComment.author).toBe('Test Author');
        expect(lastComment.text).toBe('This is a test comment.');
        expect(lastComment.id).toBeDefined();
        expect(lastComment.createdAt).toBeDefined();
      });

      it('throws error when author is missing', async () => {
        await expect(
          addDemandComment('demand-001', { text: 'Test' })
        ).rejects.toThrow('author is required');
      });

      it('throws error when text is missing', async () => {
        await expect(
          addDemandComment('demand-001', { author: 'Test' })
        ).rejects.toThrow('text is required');
      });

      it('throws error for non-existent demand item', async () => {
        await expect(
          addDemandComment('demand-999', { author: 'Test', text: 'Test' })
        ).rejects.toThrow('not found');
      });
    });

    describe('Demand workflow: New → InReview → Approved → Assigned → InProgress → Closed', () => {
      it('transitions a demand item through the full workflow', async () => {
        // Create a new demand item
        const newItem = await addDemandItem({
          title: 'Workflow Test Demand',
          description: 'Testing the full demand workflow.',
          requestor: 'Workflow Tester',
          priority: 'high',
          portfolio: 'Education Management',
        });

        expect(newItem.status).toBe('New');

        // Transition to InReview
        const inReview = await updateDemandItem(newItem.id, { status: 'InReview' });
        expect(inReview.status).toBe('InReview');

        // Transition to Approved
        const approved = await updateDemandItem(newItem.id, {
          status: 'Approved',
          approver: 'Test Approver',
        });
        expect(approved.status).toBe('Approved');
        expect(approved.approver).toBe('Test Approver');

        // Transition to Assigned
        const assigned = await updateDemandItem(newItem.id, {
          status: 'Assigned',
          assignee: 'Test Assignee',
          assigneeEmail: 'assignee@kp-etsip.gov',
        });
        expect(assigned.status).toBe('Assigned');
        expect(assigned.assignee).toBe('Test Assignee');

        // Transition to InProgress
        const inProgress = await updateDemandItem(newItem.id, { status: 'InProgress' });
        expect(inProgress.status).toBe('InProgress');

        // Add a comment
        const withComment = await addDemandComment(newItem.id, {
          author: 'Test Assignee',
          text: 'Work completed. Ready for closure.',
        });
        expect(withComment.comments.length).toBeGreaterThan(0);

        // Close the demand item
        const closed = await closeDemandItem(newItem.id);
        expect(closed.status).toBe('Closed');

        // Verify final state
        const finalItem = getDemandItemById(newItem.id);
        expect(finalItem.status).toBe('Closed');
        expect(finalItem.approver).toBe('Test Approver');
        expect(finalItem.assignee).toBe('Test Assignee');
      });
    });

    describe('getDistinctDemandStatuses', () => {
      it('returns an array of unique status strings', () => {
        const statuses = getDistinctDemandStatuses();
        expect(Array.isArray(statuses)).toBe(true);
        expect(statuses.length).toBeGreaterThan(0);
        expect(statuses).toContain('New');
        expect(statuses).toContain('Approved');
      });
    });

    describe('getDistinctDemandPriorities', () => {
      it('returns an array of unique priority strings', () => {
        const priorities = getDistinctDemandPriorities();
        expect(Array.isArray(priorities)).toBe(true);
        expect(priorities.length).toBeGreaterThan(0);
        expect(priorities).toContain('critical');
        expect(priorities).toContain('medium');
      });
    });

    describe('getDemandCountByStatus', () => {
      it('returns an object mapping statuses to counts', () => {
        const counts = getDemandCountByStatus();
        expect(typeof counts).toBe('object');
        expect(Object.keys(counts).length).toBeGreaterThan(0);

        for (const count of Object.values(counts)) {
          expect(typeof count).toBe('number');
          expect(count).toBeGreaterThan(0);
        }
      });
    });

    describe('resetDemandItems', () => {
      it('resets demand items to original mock data', async () => {
        await updateDemandItem('demand-001', { title: 'Modified Title' });
        const modified = getDemandItemById('demand-001');
        expect(modified.title).toBe('Modified Title');

        const result = resetDemandItems();
        expect(result).toBe(true);

        const reset = getDemandItemById('demand-001');
        expect(reset.title).toContain('EMIS Core');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Reset All
  // -------------------------------------------------------------------------
  describe('resetAll', () => {
    it('resets all repository data to original mock data', async () => {
      // Modify data in each repository
      await editApplication('app-001', { name: 'Modified App' });
      await editTestAsset('test-001', { name: 'Modified Test' });
      await updateDemandItem('demand-001', { title: 'Modified Demand' });

      // Reset all
      const result = resetAll();
      expect(result).toBe(true);

      // Verify all repositories are reset
      const app = await getApplicationById('app-001');
      expect(app.name).toBe('EMIS Core');

      const asset = getTestAssetById('test-001');
      expect(asset.name).toBe('Verify user login with valid credentials');

      const demand = getDemandItemById('demand-001');
      expect(demand.title).toContain('EMIS Core');
    });
  });
});
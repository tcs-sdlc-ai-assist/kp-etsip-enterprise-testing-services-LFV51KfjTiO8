import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for DashboardService
 * Tests getMetrics returns expected KPI structure, getPortfolioMetrics filters correctly,
 * getGovernanceMetrics aggregates compliance data, getAdoptionMetrics returns usage data.
 * @module dashboardService.test
 */

// Mock storage module before importing dashboardService
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
  getMetrics,
  getExecutiveKPIs,
  getMonthlyTrends,
  getAllPortfolios,
  getPortfolioMetrics,
  getPortfolioByName,
  getPortfolioBreakdowns,
  getDistinctPortfolioNames,
  getReleaseDashboardData,
  getReleaseById,
  getDistinctReleaseStatuses,
  getDistinctReleaseApplications,
  getGovernanceMetrics,
  getGovernanceProcedureById,
  getDistinctGovernanceCategories,
  getAdoptionMetrics,
  getPlatformUsageMetrics,
  getValueRealizationMetrics,
  getAutomationMetrics,
  getAutomationHealthByApp,
  getQualityGateData,
  getQualityGateById,
  getDistinctQualityGateStatuses,
  getPostDeploymentData,
  getEnvironmentMetrics,
  getExecutionMetrics,
  getIntegrationMetrics,
  getDashboardSummary,
  resetAll,
} from './dashboardService.js';

import { _store } from './storage.js';

describe('DashboardService', () => {
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
  // getMetrics
  // -------------------------------------------------------------------------
  describe('getMetrics', () => {
    it('returns expected KPI structure with executiveKPIs', async () => {
      const metrics = await getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.executiveKPIs).toBeDefined();
      expect(typeof metrics.executiveKPIs.totalApplications).toBe('number');
      expect(typeof metrics.executiveKPIs.activeApplications).toBe('number');
      expect(typeof metrics.executiveKPIs.avgQualityScore).toBe('number');
      expect(typeof metrics.executiveKPIs.automationRate).toBe('number');
      expect(typeof metrics.executiveKPIs.defectDensity).toBe('number');
      expect(typeof metrics.executiveKPIs.releaseSuccessRate).toBe('number');
      expect(typeof metrics.executiveKPIs.avgTestCoverage).toBe('number');
      expect(typeof metrics.executiveKPIs.totalReleases).toBe('number');
      expect(typeof metrics.executiveKPIs.openDefects).toBe('number');
      expect(typeof metrics.executiveKPIs.totalEnvironments).toBe('number');
      expect(typeof metrics.executiveKPIs.environmentUptime).toBe('number');
      expect(typeof metrics.executiveKPIs.totalDemandItems).toBe('number');
      expect(typeof metrics.executiveKPIs.pendingApprovals).toBe('number');
    });

    it('returns monthlyTrends as an array', async () => {
      const metrics = await getMetrics();
      expect(metrics.monthlyTrends).toBeDefined();
      expect(Array.isArray(metrics.monthlyTrends)).toBe(true);
      expect(metrics.monthlyTrends.length).toBeGreaterThan(0);
    });

    it('returns monthlyTrends with expected data points', async () => {
      const metrics = await getMetrics();
      const trend = metrics.monthlyTrends[0];
      expect(trend.month).toBeDefined();
      expect(typeof trend.qualityScore).toBe('number');
      expect(typeof trend.testCoverage).toBe('number');
      expect(typeof trend.automationRate).toBe('number');
      expect(typeof trend.defectDensity).toBe('number');
      expect(typeof trend.releaseCount).toBe('number');
      expect(typeof trend.releaseSuccessRate).toBe('number');
    });

    it('returns portfolioBreakdowns as an array', async () => {
      const metrics = await getMetrics();
      expect(metrics.portfolioBreakdowns).toBeDefined();
      expect(Array.isArray(metrics.portfolioBreakdowns)).toBe(true);
      expect(metrics.portfolioBreakdowns.length).toBeGreaterThan(0);
    });

    it('returns portfolioBreakdowns with expected fields', async () => {
      const metrics = await getMetrics();
      const breakdown = metrics.portfolioBreakdowns[0];
      expect(breakdown.portfolioId).toBeDefined();
      expect(breakdown.name).toBeDefined();
      expect(typeof breakdown.applicationCount).toBe('number');
      expect(typeof breakdown.qualityScore).toBe('number');
      expect(typeof breakdown.testCoverage).toBe('number');
      expect(typeof breakdown.automationRate).toBe('number');
      expect(typeof breakdown.defectDensity).toBe('number');
      expect(breakdown.riskLevel).toBeDefined();
      expect(typeof breakdown.openDefects).toBe('number');
      expect(typeof breakdown.releaseSuccessRate).toBe('number');
    });

    it('returns qualityGatePassRates as an array', async () => {
      const metrics = await getMetrics();
      expect(metrics.qualityGatePassRates).toBeDefined();
      expect(Array.isArray(metrics.qualityGatePassRates)).toBe(true);
      expect(metrics.qualityGatePassRates.length).toBeGreaterThan(0);
    });

    it('returns applicationStatusDistribution as an array', async () => {
      const metrics = await getMetrics();
      expect(metrics.applicationStatusDistribution).toBeDefined();
      expect(Array.isArray(metrics.applicationStatusDistribution)).toBe(true);
      expect(metrics.applicationStatusDistribution.length).toBeGreaterThan(0);
    });

    it('returns riskDistribution as an array', async () => {
      const metrics = await getMetrics();
      expect(metrics.riskDistribution).toBeDefined();
      expect(Array.isArray(metrics.riskDistribution)).toBe(true);
      expect(metrics.riskDistribution.length).toBeGreaterThan(0);
    });

    it('returns topDefectApplications as an array', async () => {
      const metrics = await getMetrics();
      expect(metrics.topDefectApplications).toBeDefined();
      expect(Array.isArray(metrics.topDefectApplications)).toBe(true);
      expect(metrics.topDefectApplications.length).toBeGreaterThan(0);
    });

    it('returns lastUpdated as a string', async () => {
      const metrics = await getMetrics();
      expect(metrics.lastUpdated).toBeDefined();
      expect(typeof metrics.lastUpdated).toBe('string');
    });

    it('filters portfolioBreakdowns by portfolio name', async () => {
      const metrics = await getMetrics({ portfolio: 'Education Management' });
      expect(metrics.portfolioBreakdowns.length).toBeGreaterThan(0);

      for (const pb of metrics.portfolioBreakdowns) {
        expect(pb.name).toBe('Education Management');
      }
    });

    it('filters portfolioBreakdowns by riskLevel', async () => {
      const metrics = await getMetrics({ riskLevel: 'low' });
      expect(metrics.portfolioBreakdowns.length).toBeGreaterThan(0);

      for (const pb of metrics.portfolioBreakdowns) {
        expect(pb.riskLevel).toBe('low');
      }
    });

    it('returns empty portfolioBreakdowns for non-existent portfolio', async () => {
      const metrics = await getMetrics({ portfolio: 'NonExistentPortfolio' });
      expect(metrics.portfolioBreakdowns).toEqual([]);
    });

    it('filters monthlyTrends by dateRange last30', async () => {
      const metrics = await getMetrics({ dateRange: 'last30' });
      expect(metrics.monthlyTrends.length).toBeLessThanOrEqual(1);
    });

    it('filters monthlyTrends by dateRange last90', async () => {
      const metrics = await getMetrics({ dateRange: 'last90' });
      expect(metrics.monthlyTrends.length).toBeLessThanOrEqual(3);
    });

    it('filters monthlyTrends by dateRange last180', async () => {
      const metrics = await getMetrics({ dateRange: 'last180' });
      expect(metrics.monthlyTrends.length).toBeLessThanOrEqual(6);
    });

    it('returns all monthlyTrends when dateRange is all', async () => {
      const metricsAll = await getMetrics({ dateRange: 'all' });
      const metricsDefault = await getMetrics();
      expect(metricsAll.monthlyTrends.length).toBe(metricsDefault.monthlyTrends.length);
    });

    it('returns unmodified metrics when no filters are provided', async () => {
      const metrics = await getMetrics({});
      expect(metrics.executiveKPIs).toBeDefined();
      expect(metrics.monthlyTrends.length).toBe(12);
      expect(metrics.portfolioBreakdowns.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // getExecutiveKPIs
  // -------------------------------------------------------------------------
  describe('getExecutiveKPIs', () => {
    it('returns executive KPIs with all expected fields', async () => {
      const kpis = await getExecutiveKPIs();
      expect(kpis).toBeDefined();
      expect(typeof kpis.totalApplications).toBe('number');
      expect(typeof kpis.activeApplications).toBe('number');
      expect(typeof kpis.avgQualityScore).toBe('number');
      expect(typeof kpis.automationRate).toBe('number');
      expect(typeof kpis.defectDensity).toBe('number');
      expect(typeof kpis.releaseSuccessRate).toBe('number');
      expect(typeof kpis.avgTestCoverage).toBe('number');
      expect(typeof kpis.totalReleases).toBe('number');
      expect(typeof kpis.openDefects).toBe('number');
      expect(typeof kpis.closedDefects).toBe('number');
    });

    it('returns positive values for key metrics', async () => {
      const kpis = await getExecutiveKPIs();
      expect(kpis.totalApplications).toBeGreaterThan(0);
      expect(kpis.activeApplications).toBeGreaterThan(0);
      expect(kpis.avgQualityScore).toBeGreaterThan(0);
      expect(kpis.avgQualityScore).toBeLessThanOrEqual(100);
      expect(kpis.automationRate).toBeGreaterThanOrEqual(0);
      expect(kpis.automationRate).toBeLessThanOrEqual(100);
    });
  });

  // -------------------------------------------------------------------------
  // getMonthlyTrends
  // -------------------------------------------------------------------------
  describe('getMonthlyTrends', () => {
    it('returns all monthly trends by default', async () => {
      const trends = await getMonthlyTrends();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBe(12);
    });

    it('returns limited monthly trends when months parameter is provided', async () => {
      const trends = await getMonthlyTrends(3);
      expect(trends.length).toBe(3);
    });

    it('returns all trends when months exceeds available data', async () => {
      const trends = await getMonthlyTrends(100);
      expect(trends.length).toBe(12);
    });

    it('returns trends with correct structure', async () => {
      const trends = await getMonthlyTrends(1);
      expect(trends.length).toBe(1);
      const trend = trends[0];
      expect(trend.month).toBeDefined();
      expect(typeof trend.qualityScore).toBe('number');
      expect(typeof trend.testCoverage).toBe('number');
      expect(typeof trend.automationRate).toBe('number');
      expect(typeof trend.defectDensity).toBe('number');
    });
  });

  // -------------------------------------------------------------------------
  // getAllPortfolios
  // -------------------------------------------------------------------------
  describe('getAllPortfolios', () => {
    it('returns all portfolios as an array', async () => {
      const portfolios = await getAllPortfolios();
      expect(Array.isArray(portfolios)).toBe(true);
      expect(portfolios.length).toBeGreaterThan(0);
    });

    it('returns portfolios with expected fields', async () => {
      const portfolios = await getAllPortfolios();
      const portfolio = portfolios[0];
      expect(portfolio.id).toBeDefined();
      expect(portfolio.name).toBeDefined();
      expect(portfolio.owner).toBeDefined();
      expect(typeof portfolio.applicationCount).toBe('number');
      expect(typeof portfolio.qualityScore).toBe('number');
      expect(typeof portfolio.testCoverage).toBe('number');
      expect(typeof portfolio.defectDensity).toBe('number');
      expect(portfolio.status).toBeDefined();
    });

    it('returns portfolios with trendData arrays', async () => {
      const portfolios = await getAllPortfolios();
      const portfolio = portfolios[0];
      expect(portfolio.trendData).toBeDefined();
      expect(Array.isArray(portfolio.trendData)).toBe(true);
      expect(portfolio.trendData.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // getPortfolioMetrics
  // -------------------------------------------------------------------------
  describe('getPortfolioMetrics', () => {
    it('returns a portfolio by id', async () => {
      const portfolio = await getPortfolioMetrics('portfolio-001');
      expect(portfolio).toBeDefined();
      expect(portfolio.id).toBe('portfolio-001');
      expect(portfolio.name).toBe('Education Management');
    });

    it('returns null for non-existent portfolio id', async () => {
      const portfolio = await getPortfolioMetrics('portfolio-999');
      expect(portfolio).toBeNull();
    });

    it('returns null for empty portfolio id', async () => {
      const portfolio = await getPortfolioMetrics('');
      expect(portfolio).toBeNull();
    });

    it('returns null for null portfolio id', async () => {
      const portfolio = await getPortfolioMetrics(null);
      expect(portfolio).toBeNull();
    });

    it('returns portfolio with correct quality metrics', async () => {
      const portfolio = await getPortfolioMetrics('portfolio-001');
      expect(portfolio).toBeDefined();
      expect(typeof portfolio.qualityScore).toBe('number');
      expect(portfolio.qualityScore).toBeGreaterThanOrEqual(0);
      expect(portfolio.qualityScore).toBeLessThanOrEqual(100);
      expect(typeof portfolio.testCoverage).toBe('number');
      expect(typeof portfolio.defectDensity).toBe('number');
    });
  });

  // -------------------------------------------------------------------------
  // getPortfolioByName
  // -------------------------------------------------------------------------
  describe('getPortfolioByName', () => {
    it('returns a portfolio by name', async () => {
      const portfolio = await getPortfolioByName('Education Management');
      expect(portfolio).toBeDefined();
      expect(portfolio.name).toBe('Education Management');
    });

    it('returns null for non-existent portfolio name', async () => {
      const portfolio = await getPortfolioByName('NonExistentPortfolio');
      expect(portfolio).toBeNull();
    });

    it('returns null for empty name', async () => {
      const portfolio = await getPortfolioByName('');
      expect(portfolio).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getPortfolioBreakdowns
  // -------------------------------------------------------------------------
  describe('getPortfolioBreakdowns', () => {
    it('returns portfolio breakdowns as an array', async () => {
      const breakdowns = await getPortfolioBreakdowns();
      expect(Array.isArray(breakdowns)).toBe(true);
      expect(breakdowns.length).toBeGreaterThan(0);
    });

    it('returns breakdowns with riskLevel field', async () => {
      const breakdowns = await getPortfolioBreakdowns();
      for (const breakdown of breakdowns) {
        expect(breakdown.riskLevel).toBeDefined();
        expect(['low', 'medium', 'high', 'critical']).toContain(breakdown.riskLevel);
      }
    });
  });

  // -------------------------------------------------------------------------
  // getDistinctPortfolioNames
  // -------------------------------------------------------------------------
  describe('getDistinctPortfolioNames', () => {
    it('returns an array of unique portfolio name strings', () => {
      const names = getDistinctPortfolioNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);

      const uniqueSet = new Set(names);
      expect(uniqueSet.size).toBe(names.length);
    });

    it('returns sorted portfolio names', () => {
      const names = getDistinctPortfolioNames();
      for (let i = 1; i < names.length; i++) {
        expect(names[i - 1].localeCompare(names[i])).toBeLessThanOrEqual(0);
      }
    });

    it('contains known portfolio names', () => {
      const names = getDistinctPortfolioNames();
      expect(names).toContain('Education Management');
      expect(names).toContain('Finance & Administration');
    });
  });

  // -------------------------------------------------------------------------
  // getReleaseDashboardData
  // -------------------------------------------------------------------------
  describe('getReleaseDashboardData', () => {
    it('returns releases and total count', async () => {
      const result = await getReleaseDashboardData();
      expect(result).toBeDefined();
      expect(result.releases).toBeDefined();
      expect(Array.isArray(result.releases)).toBe(true);
      expect(result.total).toBeGreaterThan(0);
    });

    it('returns releases with expected fields', async () => {
      const result = await getReleaseDashboardData();
      const release = result.releases[0];
      expect(release.id).toBeDefined();
      expect(release.name).toBeDefined();
      expect(release.application).toBeDefined();
      expect(release.version).toBeDefined();
      expect(release.status).toBeDefined();
      expect(release.qualityGateStatus).toBeDefined();
    });

    it('returns statusDistribution object', async () => {
      const result = await getReleaseDashboardData();
      expect(result.statusDistribution).toBeDefined();
      expect(typeof result.statusDistribution).toBe('object');
    });

    it('filters releases by status', async () => {
      const result = await getReleaseDashboardData({ status: 'Released' });
      expect(result.releases.length).toBeGreaterThan(0);

      for (const release of result.releases) {
        expect(release.status).toBe('Released');
      }
    });

    it('filters releases by application', async () => {
      const result = await getReleaseDashboardData({ application: 'EMIS Core' });
      expect(result.releases.length).toBeGreaterThan(0);

      for (const release of result.releases) {
        expect(release.application).toBe('EMIS Core');
      }
    });

    it('filters releases by qualityGateStatus', async () => {
      const result = await getReleaseDashboardData({ qualityGateStatus: 'Passed' });
      expect(result.releases.length).toBeGreaterThan(0);

      for (const release of result.releases) {
        expect(release.qualityGateStatus).toBe('Passed');
      }
    });

    it('filters releases by searchTerm', async () => {
      const result = await getReleaseDashboardData({ searchTerm: 'EMIS' });
      expect(result.releases.length).toBeGreaterThan(0);

      for (const release of result.releases) {
        const matchesSearch =
          release.name.toLowerCase().includes('emis') ||
          release.application.toLowerCase().includes('emis') ||
          release.description.toLowerCase().includes('emis');
        expect(matchesSearch).toBe(true);
      }
    });

    it('returns empty array when no releases match filters', async () => {
      const result = await getReleaseDashboardData({ application: 'NonExistentApp' });
      expect(result.releases).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('supports pagination with limit and offset', async () => {
      const allResult = await getReleaseDashboardData();
      const paginatedResult = await getReleaseDashboardData({ limit: 5, offset: 0 });

      expect(paginatedResult.releases.length).toBeLessThanOrEqual(5);
      expect(paginatedResult.total).toBe(allResult.total);
    });
  });

  // -------------------------------------------------------------------------
  // getReleaseById
  // -------------------------------------------------------------------------
  describe('getReleaseById', () => {
    it('returns a release by id', async () => {
      const release = await getReleaseById('release-001');
      expect(release).toBeDefined();
      expect(release.id).toBe('release-001');
      expect(release.name).toBe('EMIS Core v3.2.0');
    });

    it('returns null for non-existent release id', async () => {
      const release = await getReleaseById('release-999');
      expect(release).toBeNull();
    });

    it('returns null for empty release id', async () => {
      const release = await getReleaseById('');
      expect(release).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getDistinctReleaseStatuses
  // -------------------------------------------------------------------------
  describe('getDistinctReleaseStatuses', () => {
    it('returns an array of unique release status strings', () => {
      const statuses = getDistinctReleaseStatuses();
      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBeGreaterThan(0);

      const uniqueSet = new Set(statuses);
      expect(uniqueSet.size).toBe(statuses.length);
    });

    it('contains known release statuses', () => {
      const statuses = getDistinctReleaseStatuses();
      expect(statuses).toContain('Released');
      expect(statuses).toContain('InProgress');
    });
  });

  // -------------------------------------------------------------------------
  // getDistinctReleaseApplications
  // -------------------------------------------------------------------------
  describe('getDistinctReleaseApplications', () => {
    it('returns an array of unique application names from releases', () => {
      const apps = getDistinctReleaseApplications();
      expect(Array.isArray(apps)).toBe(true);
      expect(apps.length).toBeGreaterThan(0);
      expect(apps).toContain('EMIS Core');

      const uniqueSet = new Set(apps);
      expect(uniqueSet.size).toBe(apps.length);
    });
  });

  // -------------------------------------------------------------------------
  // getGovernanceMetrics
  // -------------------------------------------------------------------------
  describe('getGovernanceMetrics', () => {
    it('returns governance metrics with all expected fields', async () => {
      const result = await getGovernanceMetrics();
      expect(result).toBeDefined();
      expect(result.procedures).toBeDefined();
      expect(Array.isArray(result.procedures)).toBe(true);
      expect(result.procedures.length).toBeGreaterThan(0);
      expect(typeof result.totalProcedures).toBe('number');
      expect(typeof result.compliantCount).toBe('number');
      expect(typeof result.nonCompliantCount).toBe('number');
      expect(typeof result.partialCount).toBe('number');
      expect(typeof result.averageComplianceRate).toBe('number');
    });

    it('returns correct total procedure count', async () => {
      const result = await getGovernanceMetrics();
      expect(result.totalProcedures).toBe(result.procedures.length);
    });

    it('returns compliance counts that sum to total', async () => {
      const result = await getGovernanceMetrics();
      const sum = result.compliantCount + result.nonCompliantCount + result.partialCount;
      expect(sum).toBe(result.totalProcedures);
    });

    it('returns averageComplianceRate between 0 and 100', async () => {
      const result = await getGovernanceMetrics();
      expect(result.averageComplianceRate).toBeGreaterThanOrEqual(0);
      expect(result.averageComplianceRate).toBeLessThanOrEqual(100);
    });

    it('returns categoryDistribution as an object', async () => {
      const result = await getGovernanceMetrics();
      expect(result.categoryDistribution).toBeDefined();
      expect(typeof result.categoryDistribution).toBe('object');
      expect(Object.keys(result.categoryDistribution).length).toBeGreaterThan(0);
    });

    it('returns statusDistribution as an object', async () => {
      const result = await getGovernanceMetrics();
      expect(result.statusDistribution).toBeDefined();
      expect(typeof result.statusDistribution).toBe('object');
      expect(Object.keys(result.statusDistribution).length).toBeGreaterThan(0);
    });

    it('returns highRiskProcedures as an array of procedures with compliance below 70%', async () => {
      const result = await getGovernanceMetrics();
      expect(result.highRiskProcedures).toBeDefined();
      expect(Array.isArray(result.highRiskProcedures)).toBe(true);

      for (const proc of result.highRiskProcedures) {
        expect(proc.complianceRate).toBeLessThan(70);
      }
    });

    it('returns highRiskProcedures sorted by complianceRate ascending', async () => {
      const result = await getGovernanceMetrics();
      if (result.highRiskProcedures.length > 1) {
        for (let i = 1; i < result.highRiskProcedures.length; i++) {
          expect(result.highRiskProcedures[i - 1].complianceRate)
            .toBeLessThanOrEqual(result.highRiskProcedures[i].complianceRate);
        }
      }
    });

    it('returns procedures with auditHistory arrays', async () => {
      const result = await getGovernanceMetrics();
      for (const proc of result.procedures) {
        expect(proc.auditHistory).toBeDefined();
        expect(Array.isArray(proc.auditHistory)).toBe(true);
        expect(proc.auditHistory.length).toBeGreaterThan(0);
      }
    });

    it('returns procedures with valid compliance statuses', async () => {
      const result = await getGovernanceMetrics();
      const validStatuses = ['Compliant', 'NonCompliant', 'Partial'];
      for (const proc of result.procedures) {
        expect(validStatuses).toContain(proc.status);
      }
    });
  });

  // -------------------------------------------------------------------------
  // getGovernanceProcedureById
  // -------------------------------------------------------------------------
  describe('getGovernanceProcedureById', () => {
    it('returns a governance procedure by id', async () => {
      const proc = await getGovernanceProcedureById('gov-001');
      expect(proc).toBeDefined();
      expect(proc.id).toBe('gov-001');
      expect(proc.name).toBe('Data Privacy and Protection Policy');
    });

    it('returns null for non-existent procedure id', async () => {
      const proc = await getGovernanceProcedureById('gov-999');
      expect(proc).toBeNull();
    });

    it('returns null for empty procedure id', async () => {
      const proc = await getGovernanceProcedureById('');
      expect(proc).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getDistinctGovernanceCategories
  // -------------------------------------------------------------------------
  describe('getDistinctGovernanceCategories', () => {
    it('returns an array of unique category strings', () => {
      const categories = getDistinctGovernanceCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);

      const uniqueSet = new Set(categories);
      expect(uniqueSet.size).toBe(categories.length);
    });

    it('contains known governance categories', () => {
      const categories = getDistinctGovernanceCategories();
      expect(categories).toContain('Data Management');
      expect(categories).toContain('Financial Controls');
    });
  });

  // -------------------------------------------------------------------------
  // getAdoptionMetrics
  // -------------------------------------------------------------------------
  describe('getAdoptionMetrics', () => {
    it('returns adoption metrics with all expected top-level fields', async () => {
      const result = await getAdoptionMetrics();
      expect(result).toBeDefined();
      expect(result.platformUsage).toBeDefined();
      expect(result.valueRealization).toBeDefined();
      expect(result.portfolioAdoption).toBeDefined();
      expect(result.applicationAdoption).toBeDefined();
      expect(result.roleAdoption).toBeDefined();
      expect(result.userEngagementSegments).toBeDefined();
      expect(result.executiveSummary).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
    });

    it('returns platformUsage with expected fields', async () => {
      const result = await getAdoptionMetrics();
      const usage = result.platformUsage;
      expect(typeof usage.activeUsers).toBe('number');
      expect(typeof usage.totalRegisteredUsers).toBe('number');
      expect(typeof usage.activeUserRate).toBe('number');
      expect(typeof usage.avgDailyLogins).toBe('number');
      expect(typeof usage.avgSessionDuration).toBe('number');
      expect(typeof usage.peakConcurrentUsers).toBe('number');
      expect(usage.loginFrequency).toBeDefined();
      expect(Array.isArray(usage.loginFrequency)).toBe(true);
      expect(usage.loginFrequency.length).toBeGreaterThan(0);
      expect(usage.featureUsage).toBeDefined();
      expect(Array.isArray(usage.featureUsage)).toBe(true);
      expect(usage.featureUsage.length).toBeGreaterThan(0);
    });

    it('returns valueRealization with expected fields', async () => {
      const result = await getAdoptionMetrics();
      const value = result.valueRealization;
      expect(typeof value.timeSavedHoursPerMonth).toBe('number');
      expect(typeof value.defectsPreventedByAI).toBe('number');
      expect(typeof value.automationROI).toBe('number');
      expect(typeof value.manualProcessReduction).toBe('number');
      expect(typeof value.costSavingsNAD).toBe('number');
      expect(value.monthlyTrend).toBeDefined();
      expect(Array.isArray(value.monthlyTrend)).toBe(true);
      expect(value.monthlyTrend.length).toBeGreaterThan(0);
    });

    it('returns portfolioAdoption as an array with expected fields', async () => {
      const result = await getAdoptionMetrics();
      expect(Array.isArray(result.portfolioAdoption)).toBe(true);
      expect(result.portfolioAdoption.length).toBeGreaterThan(0);

      const portfolio = result.portfolioAdoption[0];
      expect(portfolio.portfolioId).toBeDefined();
      expect(portfolio.name).toBeDefined();
      expect(typeof portfolio.totalUsers).toBe('number');
      expect(typeof portfolio.activeUsers).toBe('number');
      expect(typeof portfolio.adoptionRate).toBe('number');
      expect(portfolio.trend).toBeDefined();
    });

    it('returns applicationAdoption as an array with expected fields', async () => {
      const result = await getAdoptionMetrics();
      expect(Array.isArray(result.applicationAdoption)).toBe(true);
      expect(result.applicationAdoption.length).toBeGreaterThan(0);

      const app = result.applicationAdoption[0];
      expect(app.applicationId).toBeDefined();
      expect(app.name).toBeDefined();
      expect(typeof app.totalUsers).toBe('number');
      expect(typeof app.activeUsers).toBe('number');
      expect(typeof app.adoptionRate).toBe('number');
      expect(typeof app.satisfactionScore).toBe('number');
    });

    it('returns roleAdoption as an array', async () => {
      const result = await getAdoptionMetrics();
      expect(Array.isArray(result.roleAdoption)).toBe(true);
      expect(result.roleAdoption.length).toBeGreaterThan(0);
    });

    it('returns userEngagementSegments as an array', async () => {
      const result = await getAdoptionMetrics();
      expect(Array.isArray(result.userEngagementSegments)).toBe(true);
      expect(result.userEngagementSegments.length).toBeGreaterThan(0);

      const segment = result.userEngagementSegments[0];
      expect(segment.segment).toBeDefined();
      expect(typeof segment.count).toBe('number');
      expect(typeof segment.percentage).toBe('number');
      expect(segment.color).toBeDefined();
    });

    it('returns executiveSummary with expected fields', async () => {
      const result = await getAdoptionMetrics();
      const summary = result.executiveSummary;
      expect(typeof summary.overallAdoptionRate).toBe('number');
      expect(typeof summary.monthOverMonthGrowth).toBe('number');
      expect(typeof summary.totalValueDeliveredNAD).toBe('number');
      expect(typeof summary.userSatisfactionScore).toBe('number');
      expect(typeof summary.featureUtilizationRate).toBe('number');
    });

    it('returns adoption rates between 0 and 100', async () => {
      const result = await getAdoptionMetrics();
      expect(result.executiveSummary.overallAdoptionRate).toBeGreaterThanOrEqual(0);
      expect(result.executiveSummary.overallAdoptionRate).toBeLessThanOrEqual(100);
    });
  });

  // -------------------------------------------------------------------------
  // getPlatformUsageMetrics
  // -------------------------------------------------------------------------
  describe('getPlatformUsageMetrics', () => {
    it('returns platform usage metrics', async () => {
      const usage = await getPlatformUsageMetrics();
      expect(usage).toBeDefined();
      expect(typeof usage.activeUsers).toBe('number');
      expect(typeof usage.totalRegisteredUsers).toBe('number');
      expect(usage.activeUsers).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // getValueRealizationMetrics
  // -------------------------------------------------------------------------
  describe('getValueRealizationMetrics', () => {
    it('returns value realization metrics', async () => {
      const value = await getValueRealizationMetrics();
      expect(value).toBeDefined();
      expect(typeof value.timeSavedHoursPerMonth).toBe('number');
      expect(typeof value.costSavingsNAD).toBe('number');
      expect(value.timeSavedHoursPerMonth).toBeGreaterThan(0);
      expect(value.costSavingsNAD).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // getAutomationMetrics
  // -------------------------------------------------------------------------
  describe('getAutomationMetrics', () => {
    it('returns automation metrics with expected structure', async () => {
      const result = await getAutomationMetrics();
      expect(result).toBeDefined();
      expect(result.applicationHealth).toBeDefined();
      expect(Array.isArray(result.applicationHealth)).toBe(true);
      expect(result.applicationHealth.length).toBeGreaterThan(0);
      expect(result.frameworkDistribution).toBeDefined();
      expect(result.roiMetrics).toBeDefined();
      expect(result.coverageByPriority).toBeDefined();
      expect(result.topFlakyTests).toBeDefined();
      expect(result.executiveSummary).toBeDefined();
    });

    it('returns executiveSummary with automation rate', async () => {
      const result = await getAutomationMetrics();
      expect(typeof result.executiveSummary.overallAutomationRate).toBe('number');
      expect(typeof result.executiveSummary.overallPassRate).toBe('number');
      expect(typeof result.executiveSummary.overallFlakyRate).toBe('number');
      expect(typeof result.executiveSummary.totalAutomatedTests).toBe('number');
      expect(typeof result.executiveSummary.totalManualTests).toBe('number');
    });
  });

  // -------------------------------------------------------------------------
  // getAutomationHealthByApp
  // -------------------------------------------------------------------------
  describe('getAutomationHealthByApp', () => {
    it('returns automation health for a specific application', async () => {
      const health = await getAutomationHealthByApp('app-001');
      expect(health).toBeDefined();
      expect(health.applicationId).toBe('app-001');
      expect(health.name).toBe('EMIS Core');
      expect(typeof health.automationRate).toBe('number');
      expect(typeof health.passRate).toBe('number');
    });

    it('returns null for non-existent application id', async () => {
      const health = await getAutomationHealthByApp('app-999');
      expect(health).toBeNull();
    });

    it('returns null for empty application id', async () => {
      const health = await getAutomationHealthByApp('');
      expect(health).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getQualityGateData
  // -------------------------------------------------------------------------
  describe('getQualityGateData', () => {
    it('returns quality gate data with expected structure', async () => {
      const result = await getQualityGateData();
      expect(result).toBeDefined();
      expect(result.qualityGates).toBeDefined();
      expect(Array.isArray(result.qualityGates)).toBe(true);
      expect(result.qualityGates.length).toBeGreaterThan(0);
      expect(typeof result.total).toBe('number');
      expect(typeof result.passedCount).toBe('number');
      expect(typeof result.failedCount).toBe('number');
      expect(typeof result.pendingCount).toBe('number');
      expect(typeof result.passRate).toBe('number');
      expect(result.passRates).toBeDefined();
      expect(Array.isArray(result.passRates)).toBe(true);
    });

    it('returns consistent counts', async () => {
      const result = await getQualityGateData();
      const sum = result.passedCount + result.failedCount + result.pendingCount;
      expect(sum).toBe(result.total);
    });

    it('filters quality gates by application', async () => {
      const result = await getQualityGateData({ application: 'EMIS Core' });
      expect(result.qualityGates.length).toBeGreaterThan(0);

      for (const gate of result.qualityGates) {
        expect(gate.application).toBe('EMIS Core');
      }
    });

    it('filters quality gates by overallStatus', async () => {
      const result = await getQualityGateData({ overallStatus: 'Passed' });
      expect(result.qualityGates.length).toBeGreaterThan(0);

      for (const gate of result.qualityGates) {
        expect(gate.overallStatus).toBe('Passed');
      }
    });

    it('returns empty array when no quality gates match filters', async () => {
      const result = await getQualityGateData({ application: 'NonExistentApp' });
      expect(result.qualityGates).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // getQualityGateById
  // -------------------------------------------------------------------------
  describe('getQualityGateById', () => {
    it('returns a quality gate by id', async () => {
      const gate = await getQualityGateById('qg-001');
      expect(gate).toBeDefined();
      expect(gate.id).toBe('qg-001');
    });

    it('returns null for non-existent quality gate id', async () => {
      const gate = await getQualityGateById('qg-999');
      expect(gate).toBeNull();
    });

    it('returns null for empty quality gate id', async () => {
      const gate = await getQualityGateById('');
      expect(gate).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getDistinctQualityGateStatuses
  // -------------------------------------------------------------------------
  describe('getDistinctQualityGateStatuses', () => {
    it('returns an array of unique quality gate status strings', () => {
      const statuses = getDistinctQualityGateStatuses();
      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses).toContain('Passed');
    });
  });

  // -------------------------------------------------------------------------
  // getPostDeploymentData
  // -------------------------------------------------------------------------
  describe('getPostDeploymentData', () => {
    it('returns post-deployment data with expected structure', async () => {
      const result = await getPostDeploymentData();
      expect(result).toBeDefined();
      expect(result.deployments).toBeDefined();
      expect(Array.isArray(result.deployments)).toBe(true);
      expect(result.deployments.length).toBeGreaterThan(0);
      expect(typeof result.total).toBe('number');
      expect(result.statusDistribution).toBeDefined();
    });

    it('filters deployments by status', async () => {
      const result = await getPostDeploymentData({ status: 'healthy' });
      expect(result.deployments.length).toBeGreaterThan(0);

      for (const deployment of result.deployments) {
        expect(deployment.status).toBe('healthy');
      }
    });

    it('returns deployments sorted by deploy date descending', async () => {
      const result = await getPostDeploymentData();
      if (result.deployments.length > 1) {
        for (let i = 1; i < result.deployments.length; i++) {
          const prevDate = new Date(result.deployments[i - 1].deployDate || 0).getTime();
          const currDate = new Date(result.deployments[i].deployDate || 0).getTime();
          expect(prevDate).toBeGreaterThanOrEqual(currDate);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // getEnvironmentMetrics
  // -------------------------------------------------------------------------
  describe('getEnvironmentMetrics', () => {
    it('returns environment metrics with expected structure', async () => {
      const result = await getEnvironmentMetrics();
      expect(result).toBeDefined();
      expect(result.environments).toBeDefined();
      expect(Array.isArray(result.environments)).toBe(true);
      expect(result.environments.length).toBeGreaterThan(0);
      expect(typeof result.total).toBe('number');
      expect(typeof result.availableCount).toBe('number');
      expect(typeof result.inUseCount).toBe('number');
      expect(typeof result.maintenanceCount).toBe('number');
      expect(typeof result.downCount).toBe('number');
      expect(typeof result.averageUptime).toBe('number');
      expect(result.typeDistribution).toBeDefined();
      expect(result.statusDistribution).toBeDefined();
    });

    it('returns consistent status counts', async () => {
      const result = await getEnvironmentMetrics();
      const sum = result.availableCount + result.inUseCount + result.maintenanceCount + result.downCount;
      expect(sum).toBe(result.total);
    });

    it('returns averageUptime between 0 and 100', async () => {
      const result = await getEnvironmentMetrics();
      expect(result.averageUptime).toBeGreaterThanOrEqual(0);
      expect(result.averageUptime).toBeLessThanOrEqual(100);
    });
  });

  // -------------------------------------------------------------------------
  // getExecutionMetrics
  // -------------------------------------------------------------------------
  describe('getExecutionMetrics', () => {
    it('returns execution metrics with expected structure', async () => {
      const result = await getExecutionMetrics();
      expect(result).toBeDefined();
      expect(typeof result.totalExecutions).toBe('number');
      expect(typeof result.passedCount).toBe('number');
      expect(typeof result.failedCount).toBe('number');
      expect(typeof result.blockedCount).toBe('number');
      expect(typeof result.inProgressCount).toBe('number');
      expect(typeof result.queuedCount).toBe('number');
      expect(typeof result.passRate).toBe('number');
      expect(typeof result.averageDuration).toBe('number');
      expect(result.statusDistribution).toBeDefined();
      expect(result.applicationDistribution).toBeDefined();
    });

    it('returns consistent status counts', async () => {
      const result = await getExecutionMetrics();
      const sum = result.passedCount + result.failedCount + result.blockedCount +
        result.inProgressCount + result.queuedCount;
      expect(sum).toBe(result.totalExecutions);
    });

    it('calculates pass rate correctly', async () => {
      const result = await getExecutionMetrics();
      const completedCount = result.passedCount + result.failedCount;
      if (completedCount > 0) {
        const expectedPassRate = Math.round((result.passedCount / completedCount) * 1000) / 10;
        expect(result.passRate).toBe(expectedPassRate);
      }
    });
  });

  // -------------------------------------------------------------------------
  // getIntegrationMetrics
  // -------------------------------------------------------------------------
  describe('getIntegrationMetrics', () => {
    it('returns integration metrics with expected structure', async () => {
      const result = await getIntegrationMetrics();
      expect(result).toBeDefined();
      expect(result.integrations).toBeDefined();
      expect(Array.isArray(result.integrations)).toBe(true);
      expect(result.integrations.length).toBeGreaterThan(0);
      expect(typeof result.total).toBe('number');
      expect(typeof result.connectedCount).toBe('number');
      expect(typeof result.disconnectedCount).toBe('number');
      expect(typeof result.errorCount).toBe('number');
      expect(typeof result.averageUptime).toBe('number');
      expect(typeof result.averageSuccessRate).toBe('number');
      expect(result.typeDistribution).toBeDefined();
      expect(result.statusDistribution).toBeDefined();
    });

    it('returns consistent status counts', async () => {
      const result = await getIntegrationMetrics();
      const sum = result.connectedCount + result.disconnectedCount + result.errorCount;
      expect(sum).toBe(result.total);
    });
  });

  // -------------------------------------------------------------------------
  // getDashboardSummary
  // -------------------------------------------------------------------------
  describe('getDashboardSummary', () => {
    it('returns a combined dashboard summary with all expected fields', async () => {
      const summary = await getDashboardSummary();
      expect(summary).toBeDefined();
      expect(summary.executiveKPIs).toBeDefined();
      expect(typeof summary.totalPortfolios).toBe('number');
      expect(typeof summary.totalReleases).toBe('number');
      expect(typeof summary.releasesInProgress).toBe('number');
      expect(typeof summary.totalQualityGates).toBe('number');
      expect(typeof summary.qualityGatePassRate).toBe('number');
      expect(typeof summary.governanceComplianceRate).toBe('number');
      expect(typeof summary.adoptionRate).toBe('number');
      expect(typeof summary.automationRate).toBe('number');
      expect(typeof summary.environmentUptime).toBe('number');
      expect(typeof summary.executionPassRate).toBe('number');
      expect(typeof summary.integrationHealthRate).toBe('number');
    });

    it('returns positive values for key summary metrics', async () => {
      const summary = await getDashboardSummary();
      expect(summary.totalPortfolios).toBeGreaterThan(0);
      expect(summary.totalReleases).toBeGreaterThan(0);
      expect(summary.totalQualityGates).toBeGreaterThan(0);
    });

    it('returns rates between 0 and 100', async () => {
      const summary = await getDashboardSummary();
      expect(summary.qualityGatePassRate).toBeGreaterThanOrEqual(0);
      expect(summary.qualityGatePassRate).toBeLessThanOrEqual(100);
      expect(summary.governanceComplianceRate).toBeGreaterThanOrEqual(0);
      expect(summary.governanceComplianceRate).toBeLessThanOrEqual(100);
      expect(summary.adoptionRate).toBeGreaterThanOrEqual(0);
      expect(summary.adoptionRate).toBeLessThanOrEqual(100);
      expect(summary.automationRate).toBeGreaterThanOrEqual(0);
      expect(summary.automationRate).toBeLessThanOrEqual(100);
      expect(summary.environmentUptime).toBeGreaterThanOrEqual(0);
      expect(summary.environmentUptime).toBeLessThanOrEqual(100);
      expect(summary.executionPassRate).toBeGreaterThanOrEqual(0);
      expect(summary.executionPassRate).toBeLessThanOrEqual(100);
      expect(summary.integrationHealthRate).toBeGreaterThanOrEqual(0);
      expect(summary.integrationHealthRate).toBeLessThanOrEqual(100);
    });
  });

  // -------------------------------------------------------------------------
  // resetAll
  // -------------------------------------------------------------------------
  describe('resetAll', () => {
    it('resets all dashboard data to original mock data', () => {
      const result = resetAll();
      expect(result).toBe(true);
    });

    it('data is consistent after reset', async () => {
      resetAll();

      const metrics = await getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.executiveKPIs).toBeDefined();
      expect(metrics.monthlyTrends.length).toBe(12);
      expect(metrics.portfolioBreakdowns.length).toBeGreaterThan(0);

      const portfolios = await getAllPortfolios();
      expect(portfolios.length).toBeGreaterThan(0);

      const governance = await getGovernanceMetrics();
      expect(governance.totalProcedures).toBeGreaterThan(0);

      const adoption = await getAdoptionMetrics();
      expect(adoption.executiveSummary.overallAdoptionRate).toBeGreaterThan(0);
    });
  });
});
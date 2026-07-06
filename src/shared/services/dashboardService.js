/**
 * Dashboard Data Service (DashboardService)
 * Aggregates mock data from localStorage for dashboard consumption.
 * Implements LLD DashboardService interface.
 * @module dashboardService
 */

import { getItem, setItem } from './storage.js';
import mockDashboardMetrics from '../data/mockDashboardMetrics.js';
import mockPortfolios from '../data/mockPortfolios.js';
import mockReleases from '../data/mockReleases.js';
import mockQualityGates from '../data/mockQualityGates.js';
import mockGovernance from '../data/mockGovernance.js';
import mockAdoption from '../data/mockAdoption.js';
import mockAutomation from '../data/mockAutomation.js';
import mockPostDeployment from '../data/mockPostDeployment.js';
import mockEnvironments from '../data/mockEnvironments.js';
import mockExecutions from '../data/mockExecutions.js';
import mockIntegrations from '../data/mockIntegrations.js';

/**
 * localStorage keys for dashboard data
 * @type {Object.<string, string>}
 */
const STORAGE_KEYS = {
  DASHBOARD_METRICS: 'kp_etsip_dashboard_metrics',
  PORTFOLIOS: 'kp_etsip_portfolios',
  RELEASES: 'kp_etsip_releases',
  QUALITY_GATES: 'kp_etsip_quality_gates',
  GOVERNANCE: 'kp_etsip_governance',
  ADOPTION: 'kp_etsip_adoption',
  AUTOMATION: 'kp_etsip_automation',
  POST_DEPLOYMENT: 'kp_etsip_post_deployment',
  ENVIRONMENTS: 'kp_etsip_environments',
  EXECUTIONS: 'kp_etsip_executions',
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
// Data Loaders
// ---------------------------------------------------------------------------

/**
 * Loads dashboard metrics from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockDashboardMetrics.js').MockDashboardMetrics}
 */
function loadDashboardMetrics() {
  let data = getItem(STORAGE_KEYS.DASHBOARD_METRICS, null);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    data = JSON.parse(JSON.stringify(mockDashboardMetrics));
    setItem(STORAGE_KEYS.DASHBOARD_METRICS, data);
  }
  return data;
}

/**
 * Loads portfolios from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockPortfolios.js').MockPortfolio[]}
 */
function loadPortfolios() {
  let data = getItem(STORAGE_KEYS.PORTFOLIOS, null);
  if (!data || !Array.isArray(data) || data.length === 0) {
    data = JSON.parse(JSON.stringify(mockPortfolios));
    setItem(STORAGE_KEYS.PORTFOLIOS, data);
  }
  return data;
}

/**
 * Loads releases from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockReleases.js').MockRelease[]}
 */
function loadReleases() {
  let data = getItem(STORAGE_KEYS.RELEASES, null);
  if (!data || !Array.isArray(data) || data.length === 0) {
    data = JSON.parse(JSON.stringify(mockReleases));
    setItem(STORAGE_KEYS.RELEASES, data);
  }
  return data;
}

/**
 * Loads quality gates from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockQualityGates.js').MockQualityGate[]}
 */
function loadQualityGates() {
  let data = getItem(STORAGE_KEYS.QUALITY_GATES, null);
  if (!data || !Array.isArray(data) || data.length === 0) {
    data = JSON.parse(JSON.stringify(mockQualityGates));
    setItem(STORAGE_KEYS.QUALITY_GATES, data);
  }
  return data;
}

/**
 * Loads governance data from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockGovernance.js').MockGovernanceProcedure[]}
 */
function loadGovernance() {
  let data = getItem(STORAGE_KEYS.GOVERNANCE, null);
  if (!data || !Array.isArray(data) || data.length === 0) {
    data = JSON.parse(JSON.stringify(mockGovernance));
    setItem(STORAGE_KEYS.GOVERNANCE, data);
  }
  return data;
}

/**
 * Loads adoption data from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockAdoption.js').MockAdoptionData}
 */
function loadAdoption() {
  let data = getItem(STORAGE_KEYS.ADOPTION, null);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    data = JSON.parse(JSON.stringify(mockAdoption));
    setItem(STORAGE_KEYS.ADOPTION, data);
  }
  return data;
}

/**
 * Loads automation data from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockAutomation.js').MockAutomationData}
 */
function loadAutomation() {
  let data = getItem(STORAGE_KEYS.AUTOMATION, null);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    data = JSON.parse(JSON.stringify(mockAutomation));
    setItem(STORAGE_KEYS.AUTOMATION, data);
  }
  return data;
}

/**
 * Loads post-deployment data from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockPostDeployment.js').MockPostDeployment[]}
 */
function loadPostDeployment() {
  let data = getItem(STORAGE_KEYS.POST_DEPLOYMENT, null);
  if (!data || !Array.isArray(data) || data.length === 0) {
    data = JSON.parse(JSON.stringify(mockPostDeployment));
    setItem(STORAGE_KEYS.POST_DEPLOYMENT, data);
  }
  return data;
}

/**
 * Loads environments from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockEnvironments.js').MockEnvironment[]}
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
 * Loads executions from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockExecutions.js').MockExecution[]}
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
 * Loads integrations from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockIntegrations.js').MockIntegration[]}
 */
function loadIntegrations() {
  let data = getItem(STORAGE_KEYS.INTEGRATIONS, null);
  if (!data || !Array.isArray(data) || data.length === 0) {
    data = JSON.parse(JSON.stringify(mockIntegrations));
    setItem(STORAGE_KEYS.INTEGRATIONS, data);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Executive Dashboard Metrics
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} MetricsFilter
 * @property {string} [portfolio] - Filter by portfolio name
 * @property {string} [dateRange] - Date range filter: 'last30' | 'last90' | 'last180' | 'last365' | 'all'
 * @property {string} [riskLevel] - Filter by risk level: 'critical' | 'high' | 'medium' | 'low'
 * @property {string} [status] - Filter by application status
 */

/**
 * Retrieves executive dashboard metrics with optional filtering.
 * Returns executive KPIs, monthly trends, portfolio breakdowns, quality gate pass rates,
 * status distributions, risk distributions, and top defect applications.
 *
 * @param {MetricsFilter} [filters] - Optional filter criteria
 * @returns {Promise<import('../data/mockDashboardMetrics.js').MockDashboardMetrics>} Dashboard metrics
 */
export async function getMetrics(filters = {}) {
  await simulateDelay();

  const metrics = loadDashboardMetrics();

  if (!filters || Object.keys(filters).length === 0) {
    return metrics;
  }

  let result = JSON.parse(JSON.stringify(metrics));

  // Filter portfolio breakdowns
  if (filters.portfolio) {
    result.portfolioBreakdowns = result.portfolioBreakdowns.filter(
      (pb) => pb.name === filters.portfolio
    );
  }

  if (filters.riskLevel) {
    result.portfolioBreakdowns = result.portfolioBreakdowns.filter(
      (pb) => pb.riskLevel === filters.riskLevel
    );
  }

  // Filter monthly trends by date range
  if (filters.dateRange && filters.dateRange !== 'all') {
    const monthsToKeep = getMonthsForRange(filters.dateRange);
    if (monthsToKeep > 0 && monthsToKeep < result.monthlyTrends.length) {
      result.monthlyTrends = result.monthlyTrends.slice(-monthsToKeep);
    }
  }

  // Filter top defect applications by risk level
  if (filters.riskLevel) {
    result.topDefectApplications = result.topDefectApplications.filter(
      (app) => app.riskLevel === filters.riskLevel
    );
  }

  return result;
}

/**
 * Converts a date range string to a number of months.
 * @param {string} dateRange - Date range string
 * @returns {number} Number of months
 */
function getMonthsForRange(dateRange) {
  switch (dateRange) {
    case 'last30':
      return 1;
    case 'last90':
      return 3;
    case 'last180':
      return 6;
    case 'last365':
      return 12;
    default:
      return 0;
  }
}

/**
 * Retrieves the executive KPIs summary.
 *
 * @returns {Promise<import('../data/mockDashboardMetrics.js').ExecutiveKPI>} Executive KPIs
 */
export async function getExecutiveKPIs() {
  await simulateDelay();

  const metrics = loadDashboardMetrics();
  return metrics.executiveKPIs;
}

/**
 * Retrieves the monthly trend data.
 *
 * @param {number} [months] - Number of months to return (defaults to all)
 * @returns {Promise<import('../data/mockDashboardMetrics.js').MonthlyTrendDataPoint[]>} Monthly trend data
 */
export async function getMonthlyTrends(months) {
  await simulateDelay();

  const metrics = loadDashboardMetrics();
  let trends = metrics.monthlyTrends || [];

  if (typeof months === 'number' && months > 0 && months < trends.length) {
    trends = trends.slice(-months);
  }

  return trends;
}

// ---------------------------------------------------------------------------
// Portfolio Metrics
// ---------------------------------------------------------------------------

/**
 * Retrieves all portfolio metrics.
 *
 * @returns {Promise<import('../data/mockPortfolios.js').MockPortfolio[]>} Array of portfolio objects
 */
export async function getAllPortfolios() {
  await simulateDelay();

  return loadPortfolios();
}

/**
 * Retrieves metrics for a specific portfolio by its id.
 *
 * @param {string} portfolioId - The portfolio id
 * @returns {Promise<import('../data/mockPortfolios.js').MockPortfolio|null>} The portfolio or null if not found
 */
export async function getPortfolioMetrics(portfolioId) {
  await simulateDelay();

  if (!portfolioId) {
    return null;
  }

  const portfolios = loadPortfolios();
  return portfolios.find((p) => p.id === portfolioId) || null;
}

/**
 * Retrieves portfolio metrics by portfolio name.
 *
 * @param {string} portfolioName - The portfolio name
 * @returns {Promise<import('../data/mockPortfolios.js').MockPortfolio|null>} The portfolio or null if not found
 */
export async function getPortfolioByName(portfolioName) {
  await simulateDelay();

  if (!portfolioName) {
    return null;
  }

  const portfolios = loadPortfolios();
  return portfolios.find((p) => p.name === portfolioName) || null;
}

/**
 * Retrieves portfolio breakdowns from the dashboard metrics.
 *
 * @returns {Promise<import('../data/mockDashboardMetrics.js').PortfolioBreakdown[]>} Portfolio breakdowns
 */
export async function getPortfolioBreakdowns() {
  await simulateDelay();

  const metrics = loadDashboardMetrics();
  return metrics.portfolioBreakdowns || [];
}

/**
 * Returns the distinct portfolio names.
 *
 * @returns {string[]} Array of unique portfolio name strings
 */
export function getDistinctPortfolioNames() {
  const portfolios = loadPortfolios();
  return portfolios.map((p) => p.name).sort();
}

// ---------------------------------------------------------------------------
// Release Dashboard Data
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ReleaseFilter
 * @property {string} [status] - Filter by release status: 'Planning' | 'InProgress' | 'ReadyForRelease' | 'Released' | 'Rolled Back'
 * @property {string} [application] - Filter by application name
 * @property {string} [qualityGateStatus] - Filter by quality gate status: 'Passed' | 'Failed' | 'Pending' | 'Waived'
 * @property {string} [searchTerm] - Search term to match against name, application, or description
 * @property {number} [limit] - Maximum number of results to return
 * @property {number} [offset] - Number of results to skip (for pagination)
 * @property {string} [sortBy] - Field to sort by: 'name' | 'releaseDate' | 'qualityScore' | 'status' (defaults to 'releaseDate')
 * @property {string} [sortOrder] - Sort order: 'asc' | 'desc' (defaults to 'desc')
 */

/**
 * Retrieves release dashboard data with optional filtering.
 *
 * @param {ReleaseFilter} [filters] - Optional filter criteria
 * @returns {Promise<{releases: import('../data/mockReleases.js').MockRelease[], total: number, statusDistribution: Object.<string, number>}>} Filtered releases, total count, and status distribution
 */
export async function getReleaseDashboardData(filters = {}) {
  await simulateDelay();

  let releases = loadReleases();

  if (filters.status) {
    releases = releases.filter((r) => r.status === filters.status);
  }

  if (filters.application) {
    releases = releases.filter((r) => r.application === filters.application);
  }

  if (filters.qualityGateStatus) {
    releases = releases.filter((r) => r.qualityGateStatus === filters.qualityGateStatus);
  }

  if (filters.searchTerm) {
    const termLower = filters.searchTerm.toLowerCase();
    releases = releases.filter((r) =>
      r.name.toLowerCase().includes(termLower) ||
      r.application.toLowerCase().includes(termLower) ||
      r.description.toLowerCase().includes(termLower)
    );
  }

  // Sorting
  const sortBy = filters.sortBy || 'releaseDate';
  const sortOrder = filters.sortOrder || 'desc';
  const multiplier = sortOrder === 'desc' ? -1 : 1;

  const statusOrder = { Planning: 0, InProgress: 1, ReadyForRelease: 2, Released: 3, 'Rolled Back': 4 };

  releases.sort((a, b) => {
    if (sortBy === 'status') {
      const valA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 5;
      const valB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 5;
      return multiplier * (valA - valB);
    }

    if (sortBy === 'releaseDate') {
      const dateA = new Date(a.releaseDate || 0).getTime();
      const dateB = new Date(b.releaseDate || 0).getTime();
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

  // Compute status distribution before pagination
  const statusDistribution = {};
  for (const r of releases) {
    const status = r.status || 'Unknown';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  }

  const total = releases.length;

  // Pagination
  if (filters.offset !== undefined && filters.offset > 0) {
    releases = releases.slice(filters.offset);
  }

  if (filters.limit !== undefined && filters.limit > 0) {
    releases = releases.slice(0, filters.limit);
  }

  return { releases, total, statusDistribution };
}

/**
 * Retrieves a single release by its id.
 *
 * @param {string} releaseId - The release id
 * @returns {Promise<import('../data/mockReleases.js').MockRelease|null>} The release or null if not found
 */
export async function getReleaseById(releaseId) {
  await simulateDelay();

  if (!releaseId) {
    return null;
  }

  const releases = loadReleases();
  return releases.find((r) => r.id === releaseId) || null;
}

/**
 * Returns the distinct release statuses.
 *
 * @returns {string[]} Array of unique release status strings
 */
export function getDistinctReleaseStatuses() {
  const releases = loadReleases();
  const statuses = new Set();
  for (const r of releases) {
    if (r.status) {
      statuses.add(r.status);
    }
  }
  return Array.from(statuses).sort();
}

/**
 * Returns the distinct application names from releases.
 *
 * @returns {string[]} Array of unique application name strings
 */
export function getDistinctReleaseApplications() {
  const releases = loadReleases();
  const apps = new Set();
  for (const r of releases) {
    if (r.application) {
      apps.add(r.application);
    }
  }
  return Array.from(apps).sort();
}

// ---------------------------------------------------------------------------
// Governance Metrics
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} GovernanceMetricsResult
 * @property {import('../data/mockGovernance.js').MockGovernanceProcedure[]} procedures - All governance procedures
 * @property {number} totalProcedures - Total number of procedures
 * @property {number} compliantCount - Number of compliant procedures
 * @property {number} nonCompliantCount - Number of non-compliant procedures
 * @property {number} partialCount - Number of partially compliant procedures
 * @property {number} averageComplianceRate - Average compliance rate across all procedures (0-100)
 * @property {Object.<string, number>} categoryDistribution - Count of procedures by category
 * @property {Object.<string, number>} statusDistribution - Count of procedures by compliance status
 * @property {import('../data/mockGovernance.js').MockGovernanceProcedure[]} highRiskProcedures - Procedures with compliance rate below 70%
 */

/**
 * Retrieves governance metrics including compliance rates, distributions, and high-risk procedures.
 *
 * @returns {Promise<GovernanceMetricsResult>} Governance metrics
 */
export async function getGovernanceMetrics() {
  await simulateDelay();

  const procedures = loadGovernance();

  const totalProcedures = procedures.length;
  let compliantCount = 0;
  let nonCompliantCount = 0;
  let partialCount = 0;
  let totalComplianceRate = 0;
  const categoryDistribution = {};
  const statusDistribution = {};

  for (const proc of procedures) {
    totalComplianceRate += proc.complianceRate || 0;

    if (proc.status === 'Compliant') {
      compliantCount++;
    } else if (proc.status === 'NonCompliant') {
      nonCompliantCount++;
    } else if (proc.status === 'Partial') {
      partialCount++;
    }

    const cat = proc.category || 'Unknown';
    categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;

    const status = proc.status || 'Unknown';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  }

  const averageComplianceRate = totalProcedures > 0
    ? Math.round((totalComplianceRate / totalProcedures) * 10) / 10
    : 0;

  const highRiskProcedures = procedures
    .filter((proc) => proc.complianceRate < 70)
    .sort((a, b) => a.complianceRate - b.complianceRate);

  return {
    procedures,
    totalProcedures,
    compliantCount,
    nonCompliantCount,
    partialCount,
    averageComplianceRate,
    categoryDistribution,
    statusDistribution,
    highRiskProcedures,
  };
}

/**
 * Retrieves a single governance procedure by its id.
 *
 * @param {string} procedureId - The governance procedure id
 * @returns {Promise<import('../data/mockGovernance.js').MockGovernanceProcedure|null>} The procedure or null if not found
 */
export async function getGovernanceProcedureById(procedureId) {
  await simulateDelay();

  if (!procedureId) {
    return null;
  }

  const procedures = loadGovernance();
  return procedures.find((p) => p.id === procedureId) || null;
}

/**
 * Returns the distinct governance categories.
 *
 * @returns {string[]} Array of unique category strings
 */
export function getDistinctGovernanceCategories() {
  const procedures = loadGovernance();
  const categories = new Set();
  for (const proc of procedures) {
    if (proc.category) {
      categories.add(proc.category);
    }
  }
  return Array.from(categories).sort();
}

// ---------------------------------------------------------------------------
// Adoption Metrics
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} AdoptionMetricsResult
 * @property {import('../data/mockAdoption.js').PlatformUsageMetrics} platformUsage - Platform usage metrics
 * @property {import('../data/mockAdoption.js').ValueRealizationMetrics} valueRealization - Value realization metrics
 * @property {import('../data/mockAdoption.js').PortfolioAdoption[]} portfolioAdoption - Adoption by portfolio
 * @property {import('../data/mockAdoption.js').ApplicationAdoption[]} applicationAdoption - Adoption by application
 * @property {import('../data/mockAdoption.js').RoleAdoption[]} roleAdoption - Adoption by role
 * @property {import('../data/mockAdoption.js').UserEngagementSegment[]} userEngagementSegments - User engagement segments
 * @property {Object} executiveSummary - Executive summary metrics
 * @property {string} lastUpdated - ISO 8601 timestamp
 */

/**
 * Retrieves adoption and impact metrics.
 *
 * @returns {Promise<AdoptionMetricsResult>} Adoption metrics
 */
export async function getAdoptionMetrics() {
  await simulateDelay();

  return loadAdoption();
}

/**
 * Retrieves platform usage metrics from adoption data.
 *
 * @returns {Promise<import('../data/mockAdoption.js').PlatformUsageMetrics>} Platform usage metrics
 */
export async function getPlatformUsageMetrics() {
  await simulateDelay();

  const adoption = loadAdoption();
  return adoption.platformUsage;
}

/**
 * Retrieves value realization metrics from adoption data.
 *
 * @returns {Promise<import('../data/mockAdoption.js').ValueRealizationMetrics>} Value realization metrics
 */
export async function getValueRealizationMetrics() {
  await simulateDelay();

  const adoption = loadAdoption();
  return adoption.valueRealization;
}

// ---------------------------------------------------------------------------
// Quality Gate Data
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} QualityGateFilter
 * @property {string} [application] - Filter by application name
 * @property {string} [overallStatus] - Filter by overall status: 'Passed' | 'Failed' | 'Pending'
 * @property {string} [releaseId] - Filter by release id
 * @property {string} [searchTerm] - Search term to match against name, release, or application
 */

/**
 * @typedef {Object} QualityGateDataResult
 * @property {import('../data/mockQualityGates.js').MockQualityGate[]} qualityGates - Filtered quality gates
 * @property {number} total - Total count
 * @property {number} passedCount - Number of passed gates
 * @property {number} failedCount - Number of failed gates
 * @property {number} pendingCount - Number of pending gates
 * @property {number} passRate - Overall pass rate percentage (0-100)
 * @property {import('../data/mockDashboardMetrics.js').QualityGatePassRate[]} passRates - Quality gate pass rates from dashboard metrics
 */

/**
 * Retrieves quality gate data with optional filtering.
 *
 * @param {QualityGateFilter} [filters] - Optional filter criteria
 * @returns {Promise<QualityGateDataResult>} Quality gate data
 */
export async function getQualityGateData(filters = {}) {
  await simulateDelay();

  let gates = loadQualityGates();

  if (filters.application) {
    gates = gates.filter((g) => g.application === filters.application);
  }

  if (filters.overallStatus) {
    gates = gates.filter((g) => g.overallStatus === filters.overallStatus);
  }

  if (filters.releaseId) {
    gates = gates.filter((g) => g.releaseId === filters.releaseId);
  }

  if (filters.searchTerm) {
    const termLower = filters.searchTerm.toLowerCase();
    gates = gates.filter((g) =>
      g.name.toLowerCase().includes(termLower) ||
      g.release.toLowerCase().includes(termLower) ||
      g.application.toLowerCase().includes(termLower)
    );
  }

  const total = gates.length;
  let passedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;

  for (const gate of gates) {
    if (gate.overallStatus === 'Passed') {
      passedCount++;
    } else if (gate.overallStatus === 'Failed') {
      failedCount++;
    } else if (gate.overallStatus === 'Pending') {
      pendingCount++;
    }
  }

  const evaluatedCount = passedCount + failedCount;
  const passRate = evaluatedCount > 0
    ? Math.round((passedCount / evaluatedCount) * 1000) / 10
    : 0;

  const metrics = loadDashboardMetrics();
  const passRates = metrics.qualityGatePassRates || [];

  return {
    qualityGates: gates,
    total,
    passedCount,
    failedCount,
    pendingCount,
    passRate,
    passRates,
  };
}

/**
 * Retrieves a single quality gate by its id.
 *
 * @param {string} qualityGateId - The quality gate id
 * @returns {Promise<import('../data/mockQualityGates.js').MockQualityGate|null>} The quality gate or null if not found
 */
export async function getQualityGateById(qualityGateId) {
  await simulateDelay();

  if (!qualityGateId) {
    return null;
  }

  const gates = loadQualityGates();
  return gates.find((g) => g.id === qualityGateId) || null;
}

/**
 * Returns the distinct quality gate statuses.
 *
 * @returns {string[]} Array of unique quality gate status strings
 */
export function getDistinctQualityGateStatuses() {
  const gates = loadQualityGates();
  const statuses = new Set();
  for (const g of gates) {
    if (g.overallStatus) {
      statuses.add(g.overallStatus);
    }
  }
  return Array.from(statuses).sort();
}

// ---------------------------------------------------------------------------
// Automation Metrics
// ---------------------------------------------------------------------------

/**
 * Retrieves automation intelligence metrics.
 *
 * @returns {Promise<import('../data/mockAutomation.js').MockAutomationData>} Automation metrics
 */
export async function getAutomationMetrics() {
  await simulateDelay();

  return loadAutomation();
}

/**
 * Retrieves automation health for a specific application.
 *
 * @param {string} applicationId - The application id
 * @returns {Promise<import('../data/mockAutomation.js').ApplicationAutomationHealth|null>} Application automation health or null
 */
export async function getAutomationHealthByApp(applicationId) {
  await simulateDelay();

  if (!applicationId) {
    return null;
  }

  const automation = loadAutomation();
  const health = automation.applicationHealth || [];
  return health.find((h) => h.applicationId === applicationId) || null;
}

// ---------------------------------------------------------------------------
// Post-Deployment Metrics
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PostDeploymentFilter
 * @property {string} [applicationId] - Filter by application id
 * @property {string} [status] - Filter by deployment status: 'healthy' | 'degraded' | 'incident' | 'rolled_back'
 * @property {string} [environment] - Filter by environment: 'production' | 'staging'
 */

/**
 * Retrieves post-deployment monitoring data with optional filtering.
 *
 * @param {PostDeploymentFilter} [filters] - Optional filter criteria
 * @returns {Promise<{deployments: import('../data/mockPostDeployment.js').MockPostDeployment[], total: number, statusDistribution: Object.<string, number>}>} Post-deployment data
 */
export async function getPostDeploymentData(filters = {}) {
  await simulateDelay();

  let deployments = loadPostDeployment();

  if (filters.applicationId) {
    deployments = deployments.filter((d) => d.applicationId === filters.applicationId);
  }

  if (filters.status) {
    deployments = deployments.filter((d) => d.status === filters.status);
  }

  if (filters.environment) {
    deployments = deployments.filter((d) => d.environment === filters.environment);
  }

  // Sort by deploy date descending
  deployments.sort((a, b) => {
    const dateA = new Date(a.deployDate || 0).getTime();
    const dateB = new Date(b.deployDate || 0).getTime();
    return dateB - dateA;
  });

  const statusDistribution = {};
  for (const d of deployments) {
    const status = d.status || 'Unknown';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  }

  return {
    deployments,
    total: deployments.length,
    statusDistribution,
  };
}

// ---------------------------------------------------------------------------
// Environment Metrics
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} EnvironmentMetricsResult
 * @property {import('../data/mockEnvironments.js').MockEnvironment[]} environments - All environments
 * @property {number} total - Total number of environments
 * @property {number} availableCount - Number of available environments
 * @property {number} inUseCount - Number of in-use environments
 * @property {number} maintenanceCount - Number of environments under maintenance
 * @property {number} downCount - Number of down environments
 * @property {number} averageUptime - Average uptime percentage across all environments
 * @property {Object.<string, number>} typeDistribution - Count of environments by type
 * @property {Object.<string, number>} statusDistribution - Count of environments by status
 */

/**
 * Retrieves environment metrics.
 *
 * @returns {Promise<EnvironmentMetricsResult>} Environment metrics
 */
export async function getEnvironmentMetrics() {
  await simulateDelay();

  const environments = loadEnvironments();

  const total = environments.length;
  let availableCount = 0;
  let inUseCount = 0;
  let maintenanceCount = 0;
  let downCount = 0;
  let totalUptime = 0;
  const typeDistribution = {};
  const statusDistribution = {};

  for (const env of environments) {
    totalUptime += env.uptime || 0;

    if (env.status === 'Available') {
      availableCount++;
    } else if (env.status === 'InUse') {
      inUseCount++;
    } else if (env.status === 'Maintenance') {
      maintenanceCount++;
    } else if (env.status === 'Down') {
      downCount++;
    }

    const type = env.type || 'Unknown';
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;

    const status = env.status || 'Unknown';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  }

  const averageUptime = total > 0
    ? Math.round((totalUptime / total) * 100) / 100
    : 0;

  return {
    environments,
    total,
    availableCount,
    inUseCount,
    maintenanceCount,
    downCount,
    averageUptime,
    typeDistribution,
    statusDistribution,
  };
}

// ---------------------------------------------------------------------------
// Execution Metrics
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ExecutionMetricsResult
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
 */

/**
 * Retrieves execution metrics summary.
 *
 * @returns {Promise<ExecutionMetricsResult>} Execution metrics
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
  };
}

// ---------------------------------------------------------------------------
// Integration Metrics
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} IntegrationMetricsResult
 * @property {import('../data/mockIntegrations.js').MockIntegration[]} integrations - All integrations
 * @property {number} total - Total number of integrations
 * @property {number} connectedCount - Number of connected integrations
 * @property {number} disconnectedCount - Number of disconnected integrations
 * @property {number} errorCount - Number of integrations in error state
 * @property {number} averageUptime - Average uptime percentage across all integrations
 * @property {number} averageSuccessRate - Average success rate across all integrations
 * @property {Object.<string, number>} typeDistribution - Count of integrations by type
 * @property {Object.<string, number>} statusDistribution - Count of integrations by status
 */

/**
 * Retrieves integration metrics.
 *
 * @returns {Promise<IntegrationMetricsResult>} Integration metrics
 */
export async function getIntegrationMetrics() {
  await simulateDelay();

  const integrations = loadIntegrations();

  const total = integrations.length;
  let connectedCount = 0;
  let disconnectedCount = 0;
  let errorCount = 0;
  let totalUptime = 0;
  let totalSuccessRate = 0;
  const typeDistribution = {};
  const statusDistribution = {};

  for (const intg of integrations) {
    if (intg.status === 'Connected') {
      connectedCount++;
    } else if (intg.status === 'Disconnected') {
      disconnectedCount++;
    } else if (intg.status === 'Error') {
      errorCount++;
    }

    if (intg.healthMetrics) {
      totalUptime += intg.healthMetrics.uptime || 0;
      totalSuccessRate += intg.healthMetrics.successRate || 0;
    }

    const type = intg.type || 'Unknown';
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;

    const status = intg.status || 'Unknown';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  }

  const averageUptime = total > 0
    ? Math.round((totalUptime / total) * 100) / 100
    : 0;

  const averageSuccessRate = total > 0
    ? Math.round((totalSuccessRate / total) * 100) / 100
    : 0;

  return {
    integrations,
    total,
    connectedCount,
    disconnectedCount,
    errorCount,
    averageUptime,
    averageSuccessRate,
    typeDistribution,
    statusDistribution,
  };
}

// ---------------------------------------------------------------------------
// Combined Dashboard Summary
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} DashboardSummary
 * @property {import('../data/mockDashboardMetrics.js').ExecutiveKPI} executiveKPIs - Executive KPIs
 * @property {number} totalPortfolios - Total number of portfolios
 * @property {number} totalReleases - Total number of releases
 * @property {number} releasesInProgress - Number of releases in progress
 * @property {number} totalQualityGates - Total number of quality gates
 * @property {number} qualityGatePassRate - Quality gate pass rate percentage
 * @property {number} governanceComplianceRate - Average governance compliance rate
 * @property {number} adoptionRate - Overall platform adoption rate
 * @property {number} automationRate - Overall automation rate
 * @property {number} environmentUptime - Average environment uptime
 * @property {number} executionPassRate - Overall execution pass rate
 * @property {number} integrationHealthRate - Average integration success rate
 */

/**
 * Retrieves a combined dashboard summary with key metrics from all domains.
 *
 * @returns {Promise<DashboardSummary>} Combined dashboard summary
 */
export async function getDashboardSummary() {
  await simulateDelay();

  const metrics = loadDashboardMetrics();
  const portfolios = loadPortfolios();
  const releases = loadReleases();
  const gates = loadQualityGates();
  const governance = loadGovernance();
  const adoption = loadAdoption();
  const automation = loadAutomation();
  const environments = loadEnvironments();
  const executions = loadExecutions();
  const integrations = loadIntegrations();

  // Quality gate pass rate
  const evaluatedGates = gates.filter((g) => g.overallStatus === 'Passed' || g.overallStatus === 'Failed');
  const passedGates = gates.filter((g) => g.overallStatus === 'Passed');
  const qualityGatePassRate = evaluatedGates.length > 0
    ? Math.round((passedGates.length / evaluatedGates.length) * 1000) / 10
    : 0;

  // Governance compliance rate
  let totalCompliance = 0;
  for (const proc of governance) {
    totalCompliance += proc.complianceRate || 0;
  }
  const governanceComplianceRate = governance.length > 0
    ? Math.round((totalCompliance / governance.length) * 10) / 10
    : 0;

  // Environment uptime
  let totalUptime = 0;
  for (const env of environments) {
    totalUptime += env.uptime || 0;
  }
  const environmentUptime = environments.length > 0
    ? Math.round((totalUptime / environments.length) * 100) / 100
    : 0;

  // Execution pass rate
  const completedExecs = executions.filter((e) => e.status === 'Passed' || e.status === 'Failed');
  const passedExecs = executions.filter((e) => e.status === 'Passed');
  const executionPassRate = completedExecs.length > 0
    ? Math.round((passedExecs.length / completedExecs.length) * 1000) / 10
    : 0;

  // Integration health rate
  let totalSuccessRate = 0;
  for (const intg of integrations) {
    if (intg.healthMetrics) {
      totalSuccessRate += intg.healthMetrics.successRate || 0;
    }
  }
  const integrationHealthRate = integrations.length > 0
    ? Math.round((totalSuccessRate / integrations.length) * 100) / 100
    : 0;

  return {
    executiveKPIs: metrics.executiveKPIs,
    totalPortfolios: portfolios.length,
    totalReleases: releases.length,
    releasesInProgress: releases.filter((r) => r.status === 'InProgress').length,
    totalQualityGates: gates.length,
    qualityGatePassRate,
    governanceComplianceRate,
    adoptionRate: adoption.executiveSummary ? adoption.executiveSummary.overallAdoptionRate : 0,
    automationRate: automation.executiveSummary ? automation.executiveSummary.overallAutomationRate : 0,
    environmentUptime,
    executionPassRate,
    integrationHealthRate,
  };
}

// ---------------------------------------------------------------------------
// Reset Functions
// ---------------------------------------------------------------------------

/**
 * Resets the dashboard metrics to the original mock data.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetDashboardMetrics() {
  return setItem(STORAGE_KEYS.DASHBOARD_METRICS, JSON.parse(JSON.stringify(mockDashboardMetrics)));
}

/**
 * Resets the portfolios to the original mock data.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetPortfolios() {
  return setItem(STORAGE_KEYS.PORTFOLIOS, JSON.parse(JSON.stringify(mockPortfolios)));
}

/**
 * Resets the releases to the original mock data.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetReleases() {
  return setItem(STORAGE_KEYS.RELEASES, JSON.parse(JSON.stringify(mockReleases)));
}

/**
 * Resets the quality gates to the original mock data.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetQualityGates() {
  return setItem(STORAGE_KEYS.QUALITY_GATES, JSON.parse(JSON.stringify(mockQualityGates)));
}

/**
 * Resets the governance data to the original mock data.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetGovernance() {
  return setItem(STORAGE_KEYS.GOVERNANCE, JSON.parse(JSON.stringify(mockGovernance)));
}

/**
 * Resets the adoption data to the original mock data.
 *
 * @returns {boolean} True if reset was successful
 */
export function resetAdoption() {
  return setItem(STORAGE_KEYS.ADOPTION, JSON.parse(JSON.stringify(mockAdoption)));
}

/**
 * Resets all dashboard-related data to the original mock data.
 *
 * @returns {boolean} True if all resets were successful
 */
export function resetAll() {
  const results = [
    resetDashboardMetrics(),
    resetPortfolios(),
    resetReleases(),
    resetQualityGates(),
    resetGovernance(),
    resetAdoption(),
    setItem(STORAGE_KEYS.AUTOMATION, JSON.parse(JSON.stringify(mockAutomation))),
    setItem(STORAGE_KEYS.POST_DEPLOYMENT, JSON.parse(JSON.stringify(mockPostDeployment))),
    setItem(STORAGE_KEYS.ENVIRONMENTS, JSON.parse(JSON.stringify(mockEnvironments))),
    setItem(STORAGE_KEYS.EXECUTIONS, JSON.parse(JSON.stringify(mockExecutions))),
    setItem(STORAGE_KEYS.INTEGRATIONS, JSON.parse(JSON.stringify(mockIntegrations))),
  ];

  return results.every((r) => r === true);
}
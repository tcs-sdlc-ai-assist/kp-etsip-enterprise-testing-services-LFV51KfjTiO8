/**
 * Mock Integration Data Seed
 * 10+ integrations with full metadata for integration management and monitoring.
 * Used by IntegrationService and IntegrationDashboard screens.
 * @module mockIntegrations
 */

/**
 * @typedef {Object} IntegrationHealthMetrics
 * @property {number} uptime - Uptime percentage (0-100)
 * @property {number} avgResponseTime - Average response time in milliseconds
 * @property {number} successRate - Success rate percentage (0-100)
 * @property {number} totalRequests - Total number of requests made
 * @property {number} failedRequests - Number of failed requests
 * @property {string} lastError - Description of the last error or empty string if none
 * @property {string} lastErrorDate - ISO 8601 timestamp of last error or empty string if none
 */

/**
 * @typedef {Object} IntegrationConfig
 * @property {string} baseUrl - Base URL of the integration endpoint
 * @property {string} authType - Authentication type: 'OAuth2' | 'APIKey' | 'BasicAuth' | 'Token' | 'Certificate'
 * @property {string} apiVersion - API version string
 * @property {number} timeoutMs - Request timeout in milliseconds
 * @property {number} retryAttempts - Number of retry attempts on failure
 * @property {boolean} sslVerify - Whether SSL certificate verification is enabled
 * @property {string} [projectKey] - Project key or identifier (if applicable)
 * @property {string} [organization] - Organization name (if applicable)
 * @property {string} [webhookUrl] - Webhook callback URL (if applicable)
 */

/**
 * @typedef {Object} SyncHistoryEntry
 * @property {string} id - Unique sync entry identifier
 * @property {string} syncDate - ISO 8601 sync timestamp
 * @property {string} status - Sync status: 'Success' | 'Failed' | 'Partial'
 * @property {number} recordsSynced - Number of records synced
 * @property {number} duration - Sync duration in seconds
 * @property {string} [errorMessage] - Error message if sync failed
 */

/**
 * @typedef {Object} MockIntegration
 * @property {string} id - Unique integration identifier
 * @property {string} name - Integration name
 * @property {string} type - Integration type: 'TestManagement' | 'ProjectManagement' | 'CI_CD' | 'CodeQuality' | 'VersionControl' | 'Communication' | 'Monitoring' | 'Documentation' | 'Security'
 * @property {string} provider - Provider/vendor name
 * @property {string} status - Integration status: 'Connected' | 'Disconnected' | 'Error'
 * @property {string} lastSync - ISO 8601 last sync timestamp
 * @property {string} description - Brief description of the integration
 * @property {IntegrationConfig} config - Integration configuration details
 * @property {IntegrationHealthMetrics} healthMetrics - Health and performance metrics
 * @property {SyncHistoryEntry[]} syncHistory - Array of sync history entries
 * @property {string} owner - Integration owner name (fake PII)
 * @property {string} ownerEmail - Owner email address (fake PII)
 * @property {string} createdAt - ISO 8601 creation timestamp
 * @property {string} updatedAt - ISO 8601 last update timestamp
 * @property {boolean} enabled - Whether the integration is enabled
 */

/**
 * Array of 14 pre-provisioned mock integrations covering various types, providers, and statuses.
 * All names and emails are fictitious.
 * @type {MockIntegration[]}
 */
const mockIntegrations = [
  {
    id: 'intg-001',
    name: 'Azure DevOps - ETSIP Boards',
    type: 'ProjectManagement',
    provider: 'Azure DevOps',
    status: 'Connected',
    lastSync: '2024-06-13T08:30:00Z',
    description: 'Integration with Azure DevOps for work item tracking, sprint management, and backlog synchronization across ETSIP programmes.',
    config: {
      baseUrl: 'https://dev.azure.com/kp-etsip',
      authType: 'OAuth2',
      apiVersion: '7.1',
      timeoutMs: 30000,
      retryAttempts: 3,
      sslVerify: true,
      organization: 'kp-etsip',
      projectKey: 'ETSIP-MAIN',
    },
    healthMetrics: {
      uptime: 99.85,
      avgResponseTime: 245,
      successRate: 99.2,
      totalRequests: 15420,
      failedRequests: 123,
      lastError: 'Rate limit exceeded on bulk work item query',
      lastErrorDate: '2024-06-10T14:22:00Z',
    },
    syncHistory: [
      { id: 'sync-001-1', syncDate: '2024-06-13T08:30:00Z', status: 'Success', recordsSynced: 342, duration: 45 },
      { id: 'sync-001-2', syncDate: '2024-06-12T08:30:00Z', status: 'Success', recordsSynced: 318, duration: 42 },
      { id: 'sync-001-3', syncDate: '2024-06-11T08:30:00Z', status: 'Success', recordsSynced: 325, duration: 48 },
      { id: 'sync-001-4', syncDate: '2024-06-10T08:30:00Z', status: 'Partial', recordsSynced: 280, duration: 65, errorMessage: 'Rate limit exceeded on bulk work item query. 42 items deferred.' },
    ],
    owner: 'Erastus Negonga',
    ownerEmail: 'erastus.negonga@kp-etsip.gov',
    createdAt: '2022-03-15T08:00:00Z',
    updatedAt: '2024-06-13T08:30:00Z',
    enabled: true,
  },
  {
    id: 'intg-002',
    name: 'qTest Manager',
    type: 'TestManagement',
    provider: 'Tricentis qTest',
    status: 'Connected',
    lastSync: '2024-06-13T07:45:00Z',
    description: 'Test case management integration for centralized test repository, execution tracking, and defect linkage across all ETSIP applications.',
    config: {
      baseUrl: 'https://kp-etsip.qtestnet.com/api/v3',
      authType: 'Token',
      apiVersion: 'v3',
      timeoutMs: 25000,
      retryAttempts: 3,
      sslVerify: true,
      projectKey: 'ETSIP-QA',
    },
    healthMetrics: {
      uptime: 99.70,
      avgResponseTime: 310,
      successRate: 98.8,
      totalRequests: 22150,
      failedRequests: 266,
      lastError: 'Connection timeout during large test suite export',
      lastErrorDate: '2024-06-08T16:10:00Z',
    },
    syncHistory: [
      { id: 'sync-002-1', syncDate: '2024-06-13T07:45:00Z', status: 'Success', recordsSynced: 185, duration: 38 },
      { id: 'sync-002-2', syncDate: '2024-06-12T07:45:00Z', status: 'Success', recordsSynced: 192, duration: 40 },
      { id: 'sync-002-3', syncDate: '2024-06-11T07:45:00Z', status: 'Success', recordsSynced: 178, duration: 36 },
    ],
    owner: 'Absalom Nghishekwa',
    ownerEmail: 'absalom.nghishekwa@kp-etsip.gov',
    createdAt: '2022-04-01T08:00:00Z',
    updatedAt: '2024-06-13T07:45:00Z',
    enabled: true,
  },
  {
    id: 'intg-003',
    name: 'Jira Align - Portfolio Management',
    type: 'ProjectManagement',
    provider: 'Atlassian Jira Align',
    status: 'Connected',
    lastSync: '2024-06-13T09:00:00Z',
    description: 'Enterprise agile planning integration for portfolio-level visibility, strategic theme tracking, and cross-programme dependency management.',
    config: {
      baseUrl: 'https://kp-etsip.jiraalign.com/rest/align/api/2',
      authType: 'OAuth2',
      apiVersion: '2.0',
      timeoutMs: 35000,
      retryAttempts: 2,
      sslVerify: true,
      organization: 'kp-etsip',
    },
    healthMetrics: {
      uptime: 99.60,
      avgResponseTime: 420,
      successRate: 98.5,
      totalRequests: 8930,
      failedRequests: 134,
      lastError: 'Authentication token expired during sync cycle',
      lastErrorDate: '2024-06-05T11:30:00Z',
    },
    syncHistory: [
      { id: 'sync-003-1', syncDate: '2024-06-13T09:00:00Z', status: 'Success', recordsSynced: 95, duration: 55 },
      { id: 'sync-003-2', syncDate: '2024-06-12T09:00:00Z', status: 'Success', recordsSynced: 88, duration: 52 },
      { id: 'sync-003-3', syncDate: '2024-06-11T09:00:00Z', status: 'Success', recordsSynced: 91, duration: 58 },
    ],
    owner: 'Kleopas Nghimtina',
    ownerEmail: 'kleopas.nghimtina@kp-etsip.gov',
    createdAt: '2022-06-15T08:00:00Z',
    updatedAt: '2024-06-13T09:00:00Z',
    enabled: true,
  },
  {
    id: 'intg-004',
    name: 'Jenkins CI/CD Pipeline',
    type: 'CI_CD',
    provider: 'Jenkins',
    status: 'Connected',
    lastSync: '2024-06-13T09:15:00Z',
    description: 'Continuous integration and deployment pipeline integration for automated build triggers, test execution, and deployment status tracking.',
    config: {
      baseUrl: 'https://jenkins.kp-etsip.gov/api/json',
      authType: 'APIKey',
      apiVersion: 'latest',
      timeoutMs: 20000,
      retryAttempts: 3,
      sslVerify: true,
      webhookUrl: 'https://kp-etsip.gov/webhooks/jenkins',
    },
    healthMetrics: {
      uptime: 99.92,
      avgResponseTime: 180,
      successRate: 99.5,
      totalRequests: 45200,
      failedRequests: 226,
      lastError: 'Build agent temporarily unavailable',
      lastErrorDate: '2024-06-09T03:15:00Z',
    },
    syncHistory: [
      { id: 'sync-004-1', syncDate: '2024-06-13T09:15:00Z', status: 'Success', recordsSynced: 28, duration: 12 },
      { id: 'sync-004-2', syncDate: '2024-06-12T09:15:00Z', status: 'Success', recordsSynced: 35, duration: 15 },
      { id: 'sync-004-3', syncDate: '2024-06-11T09:15:00Z', status: 'Success', recordsSynced: 22, duration: 10 },
      { id: 'sync-004-4', syncDate: '2024-06-10T09:15:00Z', status: 'Success', recordsSynced: 30, duration: 14 },
    ],
    owner: 'Leonard Haufiku',
    ownerEmail: 'leonard.haufiku@kp-etsip.gov',
    createdAt: '2022-02-01T08:00:00Z',
    updatedAt: '2024-06-13T09:15:00Z',
    enabled: true,
  },
  {
    id: 'intg-005',
    name: 'SonarQube Code Quality',
    type: 'CodeQuality',
    provider: 'SonarQube',
    status: 'Connected',
    lastSync: '2024-06-13T06:00:00Z',
    description: 'Static code analysis integration for code quality metrics, security vulnerability detection, and technical debt tracking across all ETSIP applications.',
    config: {
      baseUrl: 'https://sonar.kp-etsip.gov/api',
      authType: 'Token',
      apiVersion: '10.4',
      timeoutMs: 30000,
      retryAttempts: 2,
      sslVerify: true,
      organization: 'kp-etsip',
    },
    healthMetrics: {
      uptime: 99.88,
      avgResponseTime: 290,
      successRate: 99.3,
      totalRequests: 18750,
      failedRequests: 131,
      lastError: 'Analysis timeout on large codebase scan',
      lastErrorDate: '2024-06-07T02:45:00Z',
    },
    syncHistory: [
      { id: 'sync-005-1', syncDate: '2024-06-13T06:00:00Z', status: 'Success', recordsSynced: 55, duration: 120 },
      { id: 'sync-005-2', syncDate: '2024-06-12T06:00:00Z', status: 'Success', recordsSynced: 52, duration: 115 },
      { id: 'sync-005-3', syncDate: '2024-06-11T06:00:00Z', status: 'Success', recordsSynced: 55, duration: 118 },
    ],
    owner: 'Absalom Nghishekwa',
    ownerEmail: 'absalom.nghishekwa@kp-etsip.gov',
    createdAt: '2022-05-10T08:00:00Z',
    updatedAt: '2024-06-13T06:00:00Z',
    enabled: true,
  },
  {
    id: 'intg-006',
    name: 'GitHub Enterprise',
    type: 'VersionControl',
    provider: 'GitHub',
    status: 'Connected',
    lastSync: '2024-06-13T09:30:00Z',
    description: 'Version control integration for source code repository management, pull request tracking, and commit history synchronization.',
    config: {
      baseUrl: 'https://github.kp-etsip.gov/api/v3',
      authType: 'OAuth2',
      apiVersion: 'v3',
      timeoutMs: 20000,
      retryAttempts: 3,
      sslVerify: true,
      organization: 'kp-etsip',
    },
    healthMetrics: {
      uptime: 99.97,
      avgResponseTime: 150,
      successRate: 99.8,
      totalRequests: 62300,
      failedRequests: 125,
      lastError: 'Webhook delivery failed for push event',
      lastErrorDate: '2024-06-04T18:20:00Z',
    },
    syncHistory: [
      { id: 'sync-006-1', syncDate: '2024-06-13T09:30:00Z', status: 'Success', recordsSynced: 145, duration: 18 },
      { id: 'sync-006-2', syncDate: '2024-06-12T09:30:00Z', status: 'Success', recordsSynced: 132, duration: 16 },
      { id: 'sync-006-3', syncDate: '2024-06-11T09:30:00Z', status: 'Success', recordsSynced: 158, duration: 20 },
    ],
    owner: 'Leonard Haufiku',
    ownerEmail: 'leonard.haufiku@kp-etsip.gov',
    createdAt: '2022-01-20T08:00:00Z',
    updatedAt: '2024-06-13T09:30:00Z',
    enabled: true,
  },
  {
    id: 'intg-007',
    name: 'Microsoft Teams Notifications',
    type: 'Communication',
    provider: 'Microsoft Teams',
    status: 'Connected',
    lastSync: '2024-06-13T09:45:00Z',
    description: 'Communication integration for sending automated notifications, alerts, and status updates to Microsoft Teams channels.',
    config: {
      baseUrl: 'https://graph.microsoft.com/v1.0',
      authType: 'OAuth2',
      apiVersion: 'v1.0',
      timeoutMs: 15000,
      retryAttempts: 2,
      sslVerify: true,
      webhookUrl: 'https://outlook.office.com/webhook/kp-etsip/notifications',
    },
    healthMetrics: {
      uptime: 99.75,
      avgResponseTime: 200,
      successRate: 99.1,
      totalRequests: 34500,
      failedRequests: 311,
      lastError: 'Channel not found for deployment notification',
      lastErrorDate: '2024-06-11T10:05:00Z',
    },
    syncHistory: [
      { id: 'sync-007-1', syncDate: '2024-06-13T09:45:00Z', status: 'Success', recordsSynced: 48, duration: 5 },
      { id: 'sync-007-2', syncDate: '2024-06-12T09:45:00Z', status: 'Success', recordsSynced: 52, duration: 6 },
      { id: 'sync-007-3', syncDate: '2024-06-11T09:45:00Z', status: 'Partial', recordsSynced: 40, duration: 8, errorMessage: 'Channel not found for deployment notification. 12 messages deferred.' },
    ],
    owner: 'Erastus Negonga',
    ownerEmail: 'erastus.negonga@kp-etsip.gov',
    createdAt: '2022-08-01T08:00:00Z',
    updatedAt: '2024-06-13T09:45:00Z',
    enabled: true,
  },
  {
    id: 'intg-008',
    name: 'Grafana Monitoring',
    type: 'Monitoring',
    provider: 'Grafana',
    status: 'Connected',
    lastSync: '2024-06-13T09:50:00Z',
    description: 'Infrastructure and application monitoring integration for real-time metrics collection, alerting, and performance dashboard synchronization.',
    config: {
      baseUrl: 'https://grafana.kp-etsip.gov/api',
      authType: 'APIKey',
      apiVersion: 'v1',
      timeoutMs: 15000,
      retryAttempts: 3,
      sslVerify: true,
    },
    healthMetrics: {
      uptime: 99.90,
      avgResponseTime: 120,
      successRate: 99.6,
      totalRequests: 98400,
      failedRequests: 394,
      lastError: 'Dashboard query timeout on high-cardinality metric',
      lastErrorDate: '2024-06-06T22:30:00Z',
    },
    syncHistory: [
      { id: 'sync-008-1', syncDate: '2024-06-13T09:50:00Z', status: 'Success', recordsSynced: 220, duration: 8 },
      { id: 'sync-008-2', syncDate: '2024-06-12T09:50:00Z', status: 'Success', recordsSynced: 215, duration: 9 },
      { id: 'sync-008-3', syncDate: '2024-06-11T09:50:00Z', status: 'Success', recordsSynced: 218, duration: 8 },
    ],
    owner: 'Erastus Negonga',
    ownerEmail: 'erastus.negonga@kp-etsip.gov',
    createdAt: '2023-01-15T08:00:00Z',
    updatedAt: '2024-06-13T09:50:00Z',
    enabled: true,
  },
  {
    id: 'intg-009',
    name: 'Confluence Documentation',
    type: 'Documentation',
    provider: 'Atlassian Confluence',
    status: 'Disconnected',
    lastSync: '2024-06-10T14:00:00Z',
    description: 'Documentation integration for synchronizing test documentation, release notes, and knowledge base articles with Confluence spaces.',
    config: {
      baseUrl: 'https://kp-etsip.atlassian.net/wiki/rest/api',
      authType: 'BasicAuth',
      apiVersion: 'v2',
      timeoutMs: 25000,
      retryAttempts: 2,
      sslVerify: true,
      projectKey: 'ETSIP-DOCS',
    },
    healthMetrics: {
      uptime: 94.50,
      avgResponseTime: 380,
      successRate: 92.1,
      totalRequests: 5620,
      failedRequests: 444,
      lastError: 'Authentication credentials expired. API token needs renewal.',
      lastErrorDate: '2024-06-10T14:00:00Z',
    },
    syncHistory: [
      { id: 'sync-009-1', syncDate: '2024-06-10T14:00:00Z', status: 'Failed', recordsSynced: 0, duration: 3, errorMessage: 'Authentication credentials expired. API token needs renewal.' },
      { id: 'sync-009-2', syncDate: '2024-06-09T14:00:00Z', status: 'Success', recordsSynced: 32, duration: 28 },
      { id: 'sync-009-3', syncDate: '2024-06-08T14:00:00Z', status: 'Success', recordsSynced: 28, duration: 25 },
    ],
    owner: 'Maria Nghidishange',
    ownerEmail: 'maria.nghidishange@kp-etsip.gov',
    createdAt: '2023-03-01T08:00:00Z',
    updatedAt: '2024-06-10T14:00:00Z',
    enabled: true,
  },
  {
    id: 'intg-010',
    name: 'OWASP ZAP Security Scanner',
    type: 'Security',
    provider: 'OWASP ZAP',
    status: 'Connected',
    lastSync: '2024-06-12T22:00:00Z',
    description: 'Security scanning integration for automated vulnerability detection, OWASP Top 10 compliance checking, and security report generation.',
    config: {
      baseUrl: 'https://zap.kp-etsip.gov/JSON',
      authType: 'APIKey',
      apiVersion: '2.14',
      timeoutMs: 60000,
      retryAttempts: 1,
      sslVerify: true,
    },
    healthMetrics: {
      uptime: 99.40,
      avgResponseTime: 850,
      successRate: 97.8,
      totalRequests: 4280,
      failedRequests: 94,
      lastError: 'Scan timeout on complex single-page application',
      lastErrorDate: '2024-06-09T23:45:00Z',
    },
    syncHistory: [
      { id: 'sync-010-1', syncDate: '2024-06-12T22:00:00Z', status: 'Success', recordsSynced: 14, duration: 480 },
      { id: 'sync-010-2', syncDate: '2024-06-09T22:00:00Z', status: 'Partial', recordsSynced: 10, duration: 520, errorMessage: 'Scan timeout on complex single-page application. 4 targets skipped.' },
      { id: 'sync-010-3', syncDate: '2024-06-06T22:00:00Z', status: 'Success', recordsSynced: 14, duration: 465 },
    ],
    owner: 'Leonard Haufiku',
    ownerEmail: 'leonard.haufiku@kp-etsip.gov',
    createdAt: '2023-05-20T08:00:00Z',
    updatedAt: '2024-06-12T22:00:00Z',
    enabled: true,
  },
  {
    id: 'intg-011',
    name: 'Selenium Grid',
    type: 'TestManagement',
    provider: 'Selenium',
    status: 'Connected',
    lastSync: '2024-06-13T07:00:00Z',
    description: 'Distributed test execution integration for running automated browser tests across multiple nodes and browser configurations.',
    config: {
      baseUrl: 'https://selenium-grid.kp-etsip.gov/wd/hub',
      authType: 'BasicAuth',
      apiVersion: '4.18',
      timeoutMs: 45000,
      retryAttempts: 2,
      sslVerify: true,
    },
    healthMetrics: {
      uptime: 99.55,
      avgResponseTime: 520,
      successRate: 98.2,
      totalRequests: 28900,
      failedRequests: 520,
      lastError: 'Chrome node unresponsive during parallel execution',
      lastErrorDate: '2024-06-12T03:20:00Z',
    },
    syncHistory: [
      { id: 'sync-011-1', syncDate: '2024-06-13T07:00:00Z', status: 'Success', recordsSynced: 85, duration: 180 },
      { id: 'sync-011-2', syncDate: '2024-06-12T07:00:00Z', status: 'Partial', recordsSynced: 72, duration: 195, errorMessage: 'Chrome node unresponsive during parallel execution. 13 tests rescheduled.' },
      { id: 'sync-011-3', syncDate: '2024-06-11T07:00:00Z', status: 'Success', recordsSynced: 85, duration: 175 },
    ],
    owner: 'Absalom Nghishekwa',
    ownerEmail: 'absalom.nghishekwa@kp-etsip.gov',
    createdAt: '2022-04-15T08:00:00Z',
    updatedAt: '2024-06-13T07:00:00Z',
    enabled: true,
  },
  {
    id: 'intg-012',
    name: 'Nexus Repository Manager',
    type: 'CI_CD',
    provider: 'Sonatype Nexus',
    status: 'Error',
    lastSync: '2024-06-12T10:30:00Z',
    description: 'Artifact repository integration for managing build artifacts, dependency proxying, and release artifact storage.',
    config: {
      baseUrl: 'https://nexus.kp-etsip.gov/service/rest',
      authType: 'BasicAuth',
      apiVersion: 'v1',
      timeoutMs: 20000,
      retryAttempts: 3,
      sslVerify: true,
    },
    healthMetrics: {
      uptime: 88.20,
      avgResponseTime: 1200,
      successRate: 85.4,
      totalRequests: 12400,
      failedRequests: 1810,
      lastError: 'Storage backend unreachable. Disk quota exceeded on artifact repository.',
      lastErrorDate: '2024-06-12T10:30:00Z',
    },
    syncHistory: [
      { id: 'sync-012-1', syncDate: '2024-06-12T10:30:00Z', status: 'Failed', recordsSynced: 0, duration: 5, errorMessage: 'Storage backend unreachable. Disk quota exceeded on artifact repository.' },
      { id: 'sync-012-2', syncDate: '2024-06-11T10:30:00Z', status: 'Failed', recordsSynced: 0, duration: 4, errorMessage: 'Storage backend unreachable. Disk quota exceeded on artifact repository.' },
      { id: 'sync-012-3', syncDate: '2024-06-10T10:30:00Z', status: 'Success', recordsSynced: 18, duration: 22 },
    ],
    owner: 'Leonard Haufiku',
    ownerEmail: 'leonard.haufiku@kp-etsip.gov',
    createdAt: '2022-07-01T08:00:00Z',
    updatedAt: '2024-06-12T10:30:00Z',
    enabled: true,
  },
  {
    id: 'intg-013',
    name: 'Postman API Testing',
    type: 'TestManagement',
    provider: 'Postman',
    status: 'Connected',
    lastSync: '2024-06-13T08:00:00Z',
    description: 'API testing integration for automated API test collection execution, environment management, and API documentation synchronization.',
    config: {
      baseUrl: 'https://api.getpostman.com',
      authType: 'APIKey',
      apiVersion: 'v10',
      timeoutMs: 20000,
      retryAttempts: 2,
      sslVerify: true,
    },
    healthMetrics: {
      uptime: 99.80,
      avgResponseTime: 195,
      successRate: 99.0,
      totalRequests: 9850,
      failedRequests: 99,
      lastError: 'Collection run exceeded maximum execution time',
      lastErrorDate: '2024-06-07T15:40:00Z',
    },
    syncHistory: [
      { id: 'sync-013-1', syncDate: '2024-06-13T08:00:00Z', status: 'Success', recordsSynced: 42, duration: 25 },
      { id: 'sync-013-2', syncDate: '2024-06-12T08:00:00Z', status: 'Success', recordsSynced: 38, duration: 22 },
      { id: 'sync-013-3', syncDate: '2024-06-11T08:00:00Z', status: 'Success', recordsSynced: 42, duration: 24 },
    ],
    owner: 'Absalom Nghishekwa',
    ownerEmail: 'absalom.nghishekwa@kp-etsip.gov',
    createdAt: '2023-02-10T08:00:00Z',
    updatedAt: '2024-06-13T08:00:00Z',
    enabled: true,
  },
  {
    id: 'intg-014',
    name: 'ServiceNow ITSM',
    type: 'ProjectManagement',
    provider: 'ServiceNow',
    status: 'Disconnected',
    lastSync: '2024-05-28T16:00:00Z',
    description: 'IT service management integration for incident tracking, change request management, and service desk ticket synchronization.',
    config: {
      baseUrl: 'https://kp-etsip.service-now.com/api/now',
      authType: 'OAuth2',
      apiVersion: 'v2',
      timeoutMs: 30000,
      retryAttempts: 3,
      sslVerify: true,
      organization: 'kp-etsip',
    },
    healthMetrics: {
      uptime: 78.50,
      avgResponseTime: 650,
      successRate: 82.3,
      totalRequests: 3200,
      failedRequests: 566,
      lastError: 'OAuth2 refresh token revoked. Re-authorization required.',
      lastErrorDate: '2024-05-28T16:00:00Z',
    },
    syncHistory: [
      { id: 'sync-014-1', syncDate: '2024-05-28T16:00:00Z', status: 'Failed', recordsSynced: 0, duration: 2, errorMessage: 'OAuth2 refresh token revoked. Re-authorization required.' },
      { id: 'sync-014-2', syncDate: '2024-05-27T16:00:00Z', status: 'Success', recordsSynced: 65, duration: 45 },
      { id: 'sync-014-3', syncDate: '2024-05-26T16:00:00Z', status: 'Success', recordsSynced: 58, duration: 42 },
    ],
    owner: 'Erastus Negonga',
    ownerEmail: 'erastus.negonga@kp-etsip.gov',
    createdAt: '2023-08-15T08:00:00Z',
    updatedAt: '2024-05-28T16:00:00Z',
    enabled: false,
  },
];

export default mockIntegrations;
/**
 * Mock Dashboard Metrics Data Seed
 * Executive KPIs, trend arrays, portfolio breakdowns, and quality gate pass rates.
 * Used by DashboardService.
 * @module mockDashboardMetrics
 */

/**
 * @typedef {Object} ExecutiveKPI
 * @property {number} totalApplications - Total number of applications in the system
 * @property {number} activeApplications - Number of active applications
 * @property {number} avgQualityScore - Average quality score across all applications (0-100)
 * @property {number} totalTestCases - Total number of test cases/assets
 * @property {number} automationRate - Overall test automation rate percentage (0-100)
 * @property {number} defectDensity - Average defect density (defects per KLOC)
 * @property {number} releaseSuccessRate - Percentage of releases that passed quality gates (0-100)
 * @property {number} avgTestCoverage - Average test coverage percentage (0-100)
 * @property {number} totalReleases - Total number of releases tracked
 * @property {number} openDefects - Total number of open defects across all applications
 * @property {number} closedDefects - Total number of closed defects across all applications
 * @property {number} totalEnvironments - Total number of environments managed
 * @property {number} environmentUptime - Average environment uptime percentage (0-100)
 * @property {number} totalDemandItems - Total number of demand items
 * @property {number} pendingApprovals - Number of demand items pending approval
 */

/**
 * @typedef {Object} MonthlyTrendDataPoint
 * @property {string} month - Month label (e.g., 'Jul 2023')
 * @property {number} qualityScore - Average quality score for the month (0-100)
 * @property {number} testCoverage - Average test coverage percentage for the month (0-100)
 * @property {number} automationRate - Automation rate percentage for the month (0-100)
 * @property {number} defectDensity - Average defect density for the month (defects per KLOC)
 * @property {number} releaseCount - Number of releases in the month
 * @property {number} releaseSuccessRate - Release success rate for the month (0-100)
 * @property {number} testCasesExecuted - Number of test cases executed in the month
 * @property {number} defectsFound - Number of defects found in the month
 * @property {number} defectsResolved - Number of defects resolved in the month
 */

/**
 * @typedef {Object} PortfolioBreakdown
 * @property {string} portfolioId - Portfolio identifier
 * @property {string} name - Portfolio name
 * @property {number} applicationCount - Number of applications in the portfolio
 * @property {number} qualityScore - Portfolio quality score (0-100)
 * @property {number} testCoverage - Portfolio test coverage percentage (0-100)
 * @property {number} automationRate - Portfolio automation rate percentage (0-100)
 * @property {number} defectDensity - Portfolio defect density (defects per KLOC)
 * @property {string} riskLevel - Portfolio risk level: 'low' | 'medium' | 'high' | 'critical'
 * @property {number} openDefects - Number of open defects in the portfolio
 * @property {number} releaseSuccessRate - Release success rate for the portfolio (0-100)
 */

/**
 * @typedef {Object} QualityGatePassRate
 * @property {string} gateName - Quality gate name
 * @property {number} totalEvaluations - Total number of evaluations
 * @property {number} passed - Number of evaluations that passed
 * @property {number} failed - Number of evaluations that failed
 * @property {number} waived - Number of evaluations that were waived
 * @property {number} passRate - Pass rate percentage (0-100)
 * @property {string} trend - Trend direction: 'up' | 'down' | 'stable'
 */

/**
 * @typedef {Object} StatusDistribution
 * @property {string} status - Status label
 * @property {number} count - Number of items with this status
 * @property {string} color - Color code for the status
 */

/**
 * @typedef {Object} RiskDistribution
 * @property {string} riskLevel - Risk level label
 * @property {number} count - Number of applications at this risk level
 * @property {string} color - Color code for the risk level
 */

/**
 * @typedef {Object} TopDefectApplication
 * @property {string} applicationId - Application identifier
 * @property {string} name - Application name
 * @property {number} openDefects - Number of open defects
 * @property {number} defectDensity - Defect density (defects per KLOC)
 * @property {string} riskLevel - Risk level: 'low' | 'medium' | 'high' | 'critical'
 */

/**
 * @typedef {Object} MockDashboardMetrics
 * @property {ExecutiveKPI} executiveKPIs - Executive-level KPI summary
 * @property {MonthlyTrendDataPoint[]} monthlyTrends - 12-month trend data
 * @property {PortfolioBreakdown[]} portfolioBreakdowns - Quality breakdown by portfolio
 * @property {QualityGatePassRate[]} qualityGatePassRates - Quality gate pass rates
 * @property {StatusDistribution[]} applicationStatusDistribution - Application status distribution
 * @property {RiskDistribution[]} riskDistribution - Application risk level distribution
 * @property {TopDefectApplication[]} topDefectApplications - Top applications by open defects
 * @property {StatusDistribution[]} demandStatusDistribution - Demand item status distribution
 * @property {StatusDistribution[]} releaseStatusDistribution - Release status distribution
 * @property {string} lastUpdated - ISO 8601 timestamp of last data refresh
 */

/**
 * Pre-provisioned mock dashboard metrics for executive dashboards and portfolio views.
 * @type {MockDashboardMetrics}
 */
const mockDashboardMetrics = {
  executiveKPIs: {
    totalApplications: 55,
    activeApplications: 43,
    avgQualityScore: 79,
    totalTestCases: 85,
    automationRate: 58,
    defectDensity: 2.0,
    releaseSuccessRate: 85,
    avgTestCoverage: 72,
    totalReleases: 20,
    openDefects: 21,
    closedDefects: 114,
    totalEnvironments: 20,
    environmentUptime: 99.2,
    totalDemandItems: 45,
    pendingApprovals: 8,
  },

  monthlyTrends: [
    {
      month: 'Jul 2023',
      qualityScore: 68,
      testCoverage: 60,
      automationRate: 42,
      defectDensity: 3.8,
      releaseCount: 3,
      releaseSuccessRate: 67,
      testCasesExecuted: 320,
      defectsFound: 28,
      defectsResolved: 22,
    },
    {
      month: 'Aug 2023',
      qualityScore: 69,
      testCoverage: 61,
      automationRate: 43,
      defectDensity: 3.6,
      releaseCount: 4,
      releaseSuccessRate: 75,
      testCasesExecuted: 345,
      defectsFound: 25,
      defectsResolved: 24,
    },
    {
      month: 'Sep 2023',
      qualityScore: 70,
      testCoverage: 62,
      automationRate: 45,
      defectDensity: 3.4,
      releaseCount: 3,
      releaseSuccessRate: 67,
      testCasesExecuted: 360,
      defectsFound: 30,
      defectsResolved: 27,
    },
    {
      month: 'Oct 2023',
      qualityScore: 71,
      testCoverage: 63,
      automationRate: 47,
      defectDensity: 3.2,
      releaseCount: 5,
      releaseSuccessRate: 80,
      testCasesExecuted: 380,
      defectsFound: 22,
      defectsResolved: 25,
    },
    {
      month: 'Nov 2023',
      qualityScore: 72,
      testCoverage: 64,
      automationRate: 48,
      defectDensity: 3.0,
      releaseCount: 4,
      releaseSuccessRate: 75,
      testCasesExecuted: 400,
      defectsFound: 20,
      defectsResolved: 23,
    },
    {
      month: 'Dec 2023',
      qualityScore: 73,
      testCoverage: 65,
      automationRate: 50,
      defectDensity: 2.9,
      releaseCount: 2,
      releaseSuccessRate: 100,
      testCasesExecuted: 350,
      defectsFound: 15,
      defectsResolved: 20,
    },
    {
      month: 'Jan 2024',
      qualityScore: 74,
      testCoverage: 66,
      automationRate: 51,
      defectDensity: 2.8,
      releaseCount: 4,
      releaseSuccessRate: 75,
      testCasesExecuted: 420,
      defectsFound: 24,
      defectsResolved: 26,
    },
    {
      month: 'Feb 2024',
      qualityScore: 75,
      testCoverage: 67,
      automationRate: 53,
      defectDensity: 2.6,
      releaseCount: 3,
      releaseSuccessRate: 67,
      testCasesExecuted: 440,
      defectsFound: 21,
      defectsResolved: 24,
    },
    {
      month: 'Mar 2024',
      qualityScore: 76,
      testCoverage: 68,
      automationRate: 54,
      defectDensity: 2.5,
      releaseCount: 5,
      releaseSuccessRate: 80,
      testCasesExecuted: 460,
      defectsFound: 19,
      defectsResolved: 22,
    },
    {
      month: 'Apr 2024',
      qualityScore: 77,
      testCoverage: 70,
      automationRate: 56,
      defectDensity: 2.3,
      releaseCount: 4,
      releaseSuccessRate: 75,
      testCasesExecuted: 480,
      defectsFound: 18,
      defectsResolved: 21,
    },
    {
      month: 'May 2024',
      qualityScore: 78,
      testCoverage: 71,
      automationRate: 57,
      defectDensity: 2.1,
      releaseCount: 6,
      releaseSuccessRate: 83,
      testCasesExecuted: 510,
      defectsFound: 16,
      defectsResolved: 20,
    },
    {
      month: 'Jun 2024',
      qualityScore: 79,
      testCoverage: 72,
      automationRate: 58,
      defectDensity: 2.0,
      releaseCount: 5,
      releaseSuccessRate: 85,
      testCasesExecuted: 530,
      defectsFound: 14,
      defectsResolved: 18,
    },
  ],

  portfolioBreakdowns: [
    {
      portfolioId: 'portfolio-001',
      name: 'Education Management',
      applicationCount: 5,
      qualityScore: 80,
      testCoverage: 73,
      automationRate: 55,
      defectDensity: 2.1,
      riskLevel: 'medium',
      openDefects: 4,
      releaseSuccessRate: 80,
    },
    {
      portfolioId: 'portfolio-002',
      name: 'Finance & Administration',
      applicationCount: 4,
      qualityScore: 85,
      testCoverage: 78,
      automationRate: 62,
      defectDensity: 1.5,
      riskLevel: 'low',
      openDefects: 1,
      releaseSuccessRate: 100,
    },
    {
      portfolioId: 'portfolio-003',
      name: 'Examinations & Assessment',
      applicationCount: 2,
      qualityScore: 84,
      testCoverage: 78,
      automationRate: 65,
      defectDensity: 1.8,
      riskLevel: 'low',
      openDefects: 0,
      releaseSuccessRate: 100,
    },
    {
      portfolioId: 'portfolio-004',
      name: 'Human Resources',
      applicationCount: 5,
      qualityScore: 70,
      testCoverage: 62,
      automationRate: 44,
      defectDensity: 3.2,
      riskLevel: 'high',
      openDefects: 5,
      releaseSuccessRate: 60,
    },
    {
      portfolioId: 'portfolio-005',
      name: 'Procurement Management',
      applicationCount: 3,
      qualityScore: 76,
      testCoverage: 68,
      automationRate: 52,
      defectDensity: 2.4,
      riskLevel: 'medium',
      openDefects: 2,
      releaseSuccessRate: 80,
    },
    {
      portfolioId: 'portfolio-006',
      name: 'Regional Education',
      applicationCount: 3,
      qualityScore: 74,
      testCoverage: 64,
      automationRate: 49,
      defectDensity: 2.6,
      riskLevel: 'medium',
      openDefects: 2,
      releaseSuccessRate: 75,
    },
    {
      portfolioId: 'portfolio-007',
      name: 'Curriculum Development',
      applicationCount: 3,
      qualityScore: 78,
      testCoverage: 69,
      automationRate: 53,
      defectDensity: 2.3,
      riskLevel: 'medium',
      openDefects: 1,
      releaseSuccessRate: 100,
    },
    {
      portfolioId: 'portfolio-008',
      name: 'ICT Infrastructure',
      applicationCount: 5,
      qualityScore: 79,
      testCoverage: 72,
      automationRate: 58,
      defectDensity: 2.0,
      riskLevel: 'low',
      openDefects: 2,
      releaseSuccessRate: 100,
    },
    {
      portfolioId: 'portfolio-009',
      name: 'Monitoring & Evaluation',
      applicationCount: 2,
      qualityScore: 88,
      testCoverage: 83,
      automationRate: 73,
      defectDensity: 1.2,
      riskLevel: 'low',
      openDefects: 0,
      releaseSuccessRate: 100,
    },
    {
      portfolioId: 'portfolio-010',
      name: 'Infrastructure Planning',
      applicationCount: 2,
      qualityScore: 69,
      testCoverage: 59,
      automationRate: 42,
      defectDensity: 3.5,
      riskLevel: 'high',
      openDefects: 3,
      releaseSuccessRate: 50,
    },
    {
      portfolioId: 'portfolio-011',
      name: 'Governance & Compliance',
      applicationCount: 3,
      qualityScore: 89,
      testCoverage: 85,
      automationRate: 75,
      defectDensity: 1.0,
      riskLevel: 'low',
      openDefects: 0,
      releaseSuccessRate: 100,
    },
    {
      portfolioId: 'portfolio-012',
      name: 'Data Analytics',
      applicationCount: 3,
      qualityScore: 92,
      testCoverage: 88,
      automationRate: 80,
      defectDensity: 0.8,
      riskLevel: 'low',
      openDefects: 0,
      releaseSuccessRate: 100,
    },
    {
      portfolioId: 'portfolio-013',
      name: 'Development Partnerships',
      applicationCount: 3,
      qualityScore: 82,
      testCoverage: 74,
      automationRate: 61,
      defectDensity: 1.7,
      riskLevel: 'low',
      openDefects: 0,
      releaseSuccessRate: 100,
    },
    {
      portfolioId: 'portfolio-014',
      name: 'Programme Management',
      applicationCount: 4,
      qualityScore: 83,
      testCoverage: 76,
      automationRate: 64,
      defectDensity: 1.9,
      riskLevel: 'low',
      openDefects: 1,
      releaseSuccessRate: 100,
    },
    {
      portfolioId: 'portfolio-015',
      name: 'Quality Assurance',
      applicationCount: 4,
      qualityScore: 90,
      testCoverage: 85,
      automationRate: 78,
      defectDensity: 0.9,
      riskLevel: 'low',
      openDefects: 0,
      releaseSuccessRate: 100,
    },
    {
      portfolioId: 'portfolio-016',
      name: 'Data Migration & Utilities',
      applicationCount: 1,
      qualityScore: 80,
      testCoverage: 73,
      automationRate: 61,
      defectDensity: 2.0,
      riskLevel: 'medium',
      openDefects: 0,
      releaseSuccessRate: 50,
    },
  ],

  qualityGatePassRates: [
    {
      gateName: 'Unit Test Coverage',
      totalEvaluations: 48,
      passed: 42,
      failed: 4,
      waived: 2,
      passRate: 87.5,
      trend: 'up',
    },
    {
      gateName: 'Integration Test Pass Rate',
      totalEvaluations: 48,
      passed: 40,
      failed: 6,
      waived: 2,
      passRate: 83.3,
      trend: 'up',
    },
    {
      gateName: 'Code Quality Score',
      totalEvaluations: 48,
      passed: 44,
      failed: 3,
      waived: 1,
      passRate: 91.7,
      trend: 'stable',
    },
    {
      gateName: 'Security Scan',
      totalEvaluations: 48,
      passed: 38,
      failed: 8,
      waived: 2,
      passRate: 79.2,
      trend: 'up',
    },
    {
      gateName: 'Performance Benchmark',
      totalEvaluations: 36,
      passed: 30,
      failed: 5,
      waived: 1,
      passRate: 83.3,
      trend: 'stable',
    },
    {
      gateName: 'Regression Test Suite',
      totalEvaluations: 48,
      passed: 43,
      failed: 4,
      waived: 1,
      passRate: 89.6,
      trend: 'up',
    },
    {
      gateName: 'Accessibility Compliance',
      totalEvaluations: 30,
      passed: 22,
      failed: 6,
      waived: 2,
      passRate: 73.3,
      trend: 'up',
    },
    {
      gateName: 'Documentation Completeness',
      totalEvaluations: 48,
      passed: 41,
      failed: 5,
      waived: 2,
      passRate: 85.4,
      trend: 'stable',
    },
  ],

  applicationStatusDistribution: [
    { status: 'Active', count: 43, color: '#0f9d58' },
    { status: 'In Development', count: 4, color: '#0069cc' },
    { status: 'Inactive', count: 1, color: '#939ba3' },
    { status: 'Deprecated', count: 2, color: '#f59e0b' },
    { status: 'Archived', count: 2, color: '#78828c' },
  ],

  riskDistribution: [
    { riskLevel: 'Low', count: 26, color: '#0f9d58' },
    { riskLevel: 'Medium', count: 18, color: '#f59e0b' },
    { riskLevel: 'High', count: 7, color: '#f97316' },
    { riskLevel: 'Critical', count: 4, color: '#ef4444' },
  ],

  topDefectApplications: [
    {
      applicationId: 'app-030',
      name: 'Performance Appraisal System',
      openDefects: 5,
      defectDensity: 4.2,
      riskLevel: 'high',
    },
    {
      applicationId: 'app-010',
      name: 'School Infrastructure DB',
      openDefects: 4,
      defectDensity: 3.8,
      riskLevel: 'high',
    },
    {
      applicationId: 'app-033',
      name: 'Legacy Student Records',
      openDefects: 3,
      defectDensity: 5.1,
      riskLevel: 'critical',
    },
    {
      applicationId: 'app-054',
      name: 'Legacy HR System',
      openDefects: 3,
      defectDensity: 4.8,
      riskLevel: 'critical',
    },
    {
      applicationId: 'app-026',
      name: 'Payroll Integration Module',
      openDefects: 3,
      defectDensity: 3.5,
      riskLevel: 'high',
    },
    {
      applicationId: 'app-024',
      name: 'Network Monitoring Dashboard',
      openDefects: 2,
      defectDensity: 3.2,
      riskLevel: 'high',
    },
    {
      applicationId: 'app-046',
      name: 'Hostel Management System',
      openDefects: 2,
      defectDensity: 3.0,
      riskLevel: 'high',
    },
    {
      applicationId: 'app-029',
      name: 'Special Needs Education Tracker',
      openDefects: 2,
      defectDensity: 2.9,
      riskLevel: 'high',
    },
    {
      applicationId: 'app-022',
      name: 'Scholarship Management',
      openDefects: 2,
      defectDensity: 2.8,
      riskLevel: 'high',
    },
    {
      applicationId: 'app-049',
      name: 'Old Procurement System',
      openDefects: 2,
      defectDensity: 4.5,
      riskLevel: 'critical',
    },
  ],

  demandStatusDistribution: [
    { status: 'New', count: 9, color: '#939ba3' },
    { status: 'In Review', count: 6, color: '#5b9ae3' },
    { status: 'Approved', count: 8, color: '#0069cc' },
    { status: 'Assigned', count: 6, color: '#1a5fb4' },
    { status: 'In Progress', count: 9, color: '#f59e0b' },
    { status: 'Closed', count: 7, color: '#0f9d58' },
  ],

  releaseStatusDistribution: [
    { status: 'Planning', count: 2, color: '#939ba3' },
    { status: 'In Progress', count: 4, color: '#0069cc' },
    { status: 'Ready for Release', count: 3, color: '#5b9ae3' },
    { status: 'Released', count: 11, color: '#0f9d58' },
    { status: 'Rolled Back', count: 2, color: '#ef4444' },
  ],

  lastUpdated: '2024-06-13T10:00:00Z',
};

export default mockDashboardMetrics;
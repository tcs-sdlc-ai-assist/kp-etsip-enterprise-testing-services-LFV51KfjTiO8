/**
 * Mock Automation Intelligence Data Seed
 * Automation health metrics per application, framework distribution, and ROI metrics.
 * Used by AutomationDashboard and AutomationIntelligence screens.
 * @module mockAutomation
 */

/**
 * @typedef {Object} AutomationTrendDataPoint
 * @property {string} month - Month label (e.g., 'Jan 2024')
 * @property {number} automationRate - Automation rate percentage (0-100)
 * @property {number} passRate - Pass rate percentage (0-100)
 * @property {number} flakyTestRate - Flaky test rate percentage (0-100)
 * @property {number} avgExecutionTime - Average execution time in seconds
 * @property {number} testsExecuted - Number of tests executed in the month
 */

/**
 * @typedef {Object} ApplicationAutomationHealth
 * @property {string} applicationId - Application identifier
 * @property {string} name - Application name
 * @property {number} automationRate - Test automation rate percentage (0-100)
 * @property {number} flakyTestRate - Flaky test rate percentage (0-100)
 * @property {number} avgExecutionTime - Average execution time in seconds
 * @property {number} passRate - Overall pass rate percentage (0-100)
 * @property {number} totalAutomatedTests - Total number of automated tests
 * @property {number} totalManualTests - Total number of manual tests
 * @property {number} failedTests - Number of failed tests in the last cycle
 * @property {number} blockedTests - Number of blocked tests in the last cycle
 * @property {string} framework - Primary automation framework used
 * @property {string} lastRun - ISO 8601 timestamp of last automation run
 * @property {string} healthStatus - Health status: 'healthy' | 'warning' | 'critical'
 * @property {AutomationTrendDataPoint[]} trendData - Monthly trend data
 */

/**
 * @typedef {Object} FrameworkDistribution
 * @property {string} framework - Framework name
 * @property {number} applicationCount - Number of applications using this framework
 * @property {number} testCount - Total number of automated tests using this framework
 * @property {number} avgPassRate - Average pass rate across applications using this framework (0-100)
 * @property {number} avgExecutionTime - Average execution time in seconds
 * @property {string} color - Color code for chart rendering
 */

/**
 * @typedef {Object} AutomationROIMetrics
 * @property {number} totalManualHoursSaved - Total manual testing hours saved per month
 * @property {number} costSavingsPerMonth - Estimated cost savings per month in NAD
 * @property {number} defectsFoundByAutomation - Number of defects found by automated tests
 * @property {number} defectsFoundByManual - Number of defects found by manual tests
 * @property {number} avgTimeToFeedback - Average time to feedback in minutes for automated tests
 * @property {number} avgManualTimeToFeedback - Average time to feedback in minutes for manual tests
 * @property {number} regressionCycleReduction - Percentage reduction in regression cycle time (0-100)
 * @property {number} releaseConfidenceScore - Release confidence score based on automation coverage (0-100)
 * @property {Array<{month: string, hoursSaved: number, costSavings: number}>} monthlySavings - Monthly ROI trend data
 */

/**
 * @typedef {Object} AutomationCoverageByPriority
 * @property {string} priority - Priority level: 'critical' | 'high' | 'medium' | 'low'
 * @property {number} totalTests - Total number of tests at this priority
 * @property {number} automatedTests - Number of automated tests at this priority
 * @property {number} automationRate - Automation rate percentage (0-100)
 * @property {string} color - Color code for chart rendering
 */

/**
 * @typedef {Object} FlakyTestEntry
 * @property {string} testId - Test asset identifier
 * @property {string} testName - Test name
 * @property {string} application - Application name
 * @property {number} flakyRate - Flaky rate percentage (0-100)
 * @property {number} failureCount - Number of failures in the last 30 days
 * @property {number} executionCount - Number of executions in the last 30 days
 * @property {string} lastFailure - ISO 8601 timestamp of last failure
 * @property {string} rootCause - Suspected root cause
 */

/**
 * @typedef {Object} MockAutomationData
 * @property {ApplicationAutomationHealth[]} applicationHealth - Automation health metrics per application
 * @property {FrameworkDistribution[]} frameworkDistribution - Framework usage distribution
 * @property {AutomationROIMetrics} roiMetrics - Return on investment metrics
 * @property {AutomationCoverageByPriority[]} coverageByPriority - Automation coverage by test priority
 * @property {FlakyTestEntry[]} topFlakyTests - Top flaky tests across all applications
 * @property {Object} executiveSummary - Executive summary metrics
 * @property {number} executiveSummary.overallAutomationRate - Overall automation rate (0-100)
 * @property {number} executiveSummary.overallPassRate - Overall pass rate (0-100)
 * @property {number} executiveSummary.overallFlakyRate - Overall flaky test rate (0-100)
 * @property {number} executiveSummary.totalAutomatedTests - Total automated tests across all applications
 * @property {number} executiveSummary.totalManualTests - Total manual tests across all applications
 * @property {number} executiveSummary.avgExecutionTime - Average execution time in seconds
 * @property {number} executiveSummary.automationGrowthRate - Month-over-month automation growth rate percentage
 * @property {string} lastUpdated - ISO 8601 timestamp of last data refresh
 */

/**
 * Pre-provisioned mock automation intelligence data for dashboards and analytics views.
 * @type {MockAutomationData}
 */
const mockAutomation = {
  applicationHealth: [
    {
      applicationId: 'app-001',
      name: 'EMIS Core',
      automationRate: 78,
      flakyTestRate: 3.2,
      avgExecutionTime: 18,
      passRate: 96.5,
      totalAutomatedTests: 42,
      totalManualTests: 12,
      failedTests: 2,
      blockedTests: 0,
      framework: 'Playwright',
      lastRun: '2024-06-13T08:00:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 68, passRate: 92.0, flakyTestRate: 5.1, avgExecutionTime: 22, testsExecuted: 180 },
        { month: 'Feb 2024', automationRate: 70, passRate: 93.0, flakyTestRate: 4.8, avgExecutionTime: 21, testsExecuted: 195 },
        { month: 'Mar 2024', automationRate: 72, passRate: 93.5, flakyTestRate: 4.5, avgExecutionTime: 20, testsExecuted: 210 },
        { month: 'Apr 2024', automationRate: 74, passRate: 94.5, flakyTestRate: 4.0, avgExecutionTime: 19, testsExecuted: 225 },
        { month: 'May 2024', automationRate: 76, passRate: 95.5, flakyTestRate: 3.5, avgExecutionTime: 18, testsExecuted: 240 },
        { month: 'Jun 2024', automationRate: 78, passRate: 96.5, flakyTestRate: 3.2, avgExecutionTime: 18, testsExecuted: 255 },
      ],
    },
    {
      applicationId: 'app-002',
      name: 'Budget Tracker',
      automationRate: 71,
      flakyTestRate: 4.1,
      avgExecutionTime: 15,
      passRate: 94.8,
      totalAutomatedTests: 28,
      totalManualTests: 11,
      failedTests: 1,
      blockedTests: 1,
      framework: 'Playwright',
      lastRun: '2024-06-13T09:00:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 60, passRate: 90.0, flakyTestRate: 6.0, avgExecutionTime: 19, testsExecuted: 120 },
        { month: 'Feb 2024', automationRate: 62, passRate: 91.0, flakyTestRate: 5.5, avgExecutionTime: 18, testsExecuted: 130 },
        { month: 'Mar 2024', automationRate: 64, passRate: 92.0, flakyTestRate: 5.2, avgExecutionTime: 17, testsExecuted: 140 },
        { month: 'Apr 2024', automationRate: 67, passRate: 93.0, flakyTestRate: 4.8, avgExecutionTime: 16, testsExecuted: 150 },
        { month: 'May 2024', automationRate: 69, passRate: 94.0, flakyTestRate: 4.4, avgExecutionTime: 16, testsExecuted: 160 },
        { month: 'Jun 2024', automationRate: 71, passRate: 94.8, flakyTestRate: 4.1, avgExecutionTime: 15, testsExecuted: 170 },
      ],
    },
    {
      applicationId: 'app-003',
      name: 'Learner Assessment Portal',
      automationRate: 65,
      flakyTestRate: 5.5,
      avgExecutionTime: 25,
      passRate: 91.2,
      totalAutomatedTests: 22,
      totalManualTests: 12,
      failedTests: 3,
      blockedTests: 1,
      framework: 'Selenium',
      lastRun: '2024-06-12T09:00:00Z',
      healthStatus: 'warning',
      trendData: [
        { month: 'Jan 2024', automationRate: 55, passRate: 87.0, flakyTestRate: 7.5, avgExecutionTime: 30, testsExecuted: 95 },
        { month: 'Feb 2024', automationRate: 57, passRate: 88.0, flakyTestRate: 7.0, avgExecutionTime: 29, testsExecuted: 100 },
        { month: 'Mar 2024', automationRate: 59, passRate: 89.0, flakyTestRate: 6.5, avgExecutionTime: 28, testsExecuted: 108 },
        { month: 'Apr 2024', automationRate: 61, passRate: 90.0, flakyTestRate: 6.2, avgExecutionTime: 27, testsExecuted: 115 },
        { month: 'May 2024', automationRate: 63, passRate: 90.5, flakyTestRate: 5.8, avgExecutionTime: 26, testsExecuted: 120 },
        { month: 'Jun 2024', automationRate: 65, passRate: 91.2, flakyTestRate: 5.5, avgExecutionTime: 25, testsExecuted: 128 },
      ],
    },
    {
      applicationId: 'app-004',
      name: 'Teacher Registry',
      automationRate: 55,
      flakyTestRate: 6.8,
      avgExecutionTime: 20,
      passRate: 88.5,
      totalAutomatedTests: 15,
      totalManualTests: 12,
      failedTests: 4,
      blockedTests: 0,
      framework: 'Selenium',
      lastRun: '2024-06-11T08:00:00Z',
      healthStatus: 'warning',
      trendData: [
        { month: 'Jan 2024', automationRate: 42, passRate: 83.0, flakyTestRate: 9.0, avgExecutionTime: 25, testsExecuted: 70 },
        { month: 'Feb 2024', automationRate: 44, passRate: 84.0, flakyTestRate: 8.5, avgExecutionTime: 24, testsExecuted: 75 },
        { month: 'Mar 2024', automationRate: 47, passRate: 85.5, flakyTestRate: 8.0, avgExecutionTime: 23, testsExecuted: 80 },
        { month: 'Apr 2024', automationRate: 50, passRate: 86.5, flakyTestRate: 7.5, avgExecutionTime: 22, testsExecuted: 85 },
        { month: 'May 2024', automationRate: 53, passRate: 87.5, flakyTestRate: 7.2, avgExecutionTime: 21, testsExecuted: 90 },
        { month: 'Jun 2024', automationRate: 55, passRate: 88.5, flakyTestRate: 6.8, avgExecutionTime: 20, testsExecuted: 95 },
      ],
    },
    {
      applicationId: 'app-005',
      name: 'Procurement Portal',
      automationRate: 60,
      flakyTestRate: 4.5,
      avgExecutionTime: 22,
      passRate: 92.0,
      totalAutomatedTests: 18,
      totalManualTests: 12,
      failedTests: 2,
      blockedTests: 0,
      framework: 'Playwright',
      lastRun: '2024-06-12T07:30:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 48, passRate: 87.0, flakyTestRate: 6.5, avgExecutionTime: 27, testsExecuted: 80 },
        { month: 'Feb 2024', automationRate: 50, passRate: 88.0, flakyTestRate: 6.0, avgExecutionTime: 26, testsExecuted: 85 },
        { month: 'Mar 2024', automationRate: 52, passRate: 89.0, flakyTestRate: 5.5, avgExecutionTime: 25, testsExecuted: 90 },
        { month: 'Apr 2024', automationRate: 55, passRate: 90.0, flakyTestRate: 5.2, avgExecutionTime: 24, testsExecuted: 95 },
        { month: 'May 2024', automationRate: 58, passRate: 91.0, flakyTestRate: 4.8, avgExecutionTime: 23, testsExecuted: 100 },
        { month: 'Jun 2024', automationRate: 60, passRate: 92.0, flakyTestRate: 4.5, avgExecutionTime: 22, testsExecuted: 108 },
      ],
    },
    {
      applicationId: 'app-006',
      name: 'Regional Data Hub',
      automationRate: 52,
      flakyTestRate: 7.2,
      avgExecutionTime: 35,
      passRate: 86.0,
      totalAutomatedTests: 14,
      totalManualTests: 13,
      failedTests: 3,
      blockedTests: 1,
      framework: 'Playwright',
      lastRun: '2024-06-11T12:00:00Z',
      healthStatus: 'warning',
      trendData: [
        { month: 'Jan 2024', automationRate: 40, passRate: 80.0, flakyTestRate: 10.0, avgExecutionTime: 42, testsExecuted: 60 },
        { month: 'Feb 2024', automationRate: 42, passRate: 81.5, flakyTestRate: 9.5, avgExecutionTime: 40, testsExecuted: 65 },
        { month: 'Mar 2024', automationRate: 44, passRate: 82.5, flakyTestRate: 9.0, avgExecutionTime: 39, testsExecuted: 68 },
        { month: 'Apr 2024', automationRate: 47, passRate: 83.5, flakyTestRate: 8.2, avgExecutionTime: 37, testsExecuted: 72 },
        { month: 'May 2024', automationRate: 50, passRate: 85.0, flakyTestRate: 7.8, avgExecutionTime: 36, testsExecuted: 76 },
        { month: 'Jun 2024', automationRate: 52, passRate: 86.0, flakyTestRate: 7.2, avgExecutionTime: 35, testsExecuted: 80 },
      ],
    },
    {
      applicationId: 'app-007',
      name: 'Curriculum Manager',
      automationRate: 63,
      flakyTestRate: 3.8,
      avgExecutionTime: 19,
      passRate: 93.5,
      totalAutomatedTests: 17,
      totalManualTests: 10,
      failedTests: 1,
      blockedTests: 0,
      framework: 'Playwright',
      lastRun: '2024-06-12T10:00:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 50, passRate: 89.0, flakyTestRate: 5.8, avgExecutionTime: 24, testsExecuted: 75 },
        { month: 'Feb 2024', automationRate: 53, passRate: 90.0, flakyTestRate: 5.3, avgExecutionTime: 23, testsExecuted: 80 },
        { month: 'Mar 2024', automationRate: 55, passRate: 91.0, flakyTestRate: 4.8, avgExecutionTime: 22, testsExecuted: 85 },
        { month: 'Apr 2024', automationRate: 58, passRate: 92.0, flakyTestRate: 4.5, avgExecutionTime: 21, testsExecuted: 88 },
        { month: 'May 2024', automationRate: 61, passRate: 93.0, flakyTestRate: 4.0, avgExecutionTime: 20, testsExecuted: 92 },
        { month: 'Jun 2024', automationRate: 63, passRate: 93.5, flakyTestRate: 3.8, avgExecutionTime: 19, testsExecuted: 96 },
      ],
    },
    {
      applicationId: 'app-009',
      name: 'M&E Dashboard',
      automationRate: 76,
      flakyTestRate: 2.5,
      avgExecutionTime: 16,
      passRate: 97.0,
      totalAutomatedTests: 32,
      totalManualTests: 10,
      failedTests: 1,
      blockedTests: 0,
      framework: 'Playwright',
      lastRun: '2024-06-13T07:00:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 65, passRate: 93.0, flakyTestRate: 4.5, avgExecutionTime: 20, testsExecuted: 150 },
        { month: 'Feb 2024', automationRate: 67, passRate: 94.0, flakyTestRate: 4.0, avgExecutionTime: 19, testsExecuted: 160 },
        { month: 'Mar 2024', automationRate: 69, passRate: 94.5, flakyTestRate: 3.5, avgExecutionTime: 18, testsExecuted: 170 },
        { month: 'Apr 2024', automationRate: 72, passRate: 95.5, flakyTestRate: 3.2, avgExecutionTime: 17, testsExecuted: 180 },
        { month: 'May 2024', automationRate: 74, passRate: 96.0, flakyTestRate: 2.8, avgExecutionTime: 17, testsExecuted: 190 },
        { month: 'Jun 2024', automationRate: 76, passRate: 97.0, flakyTestRate: 2.5, avgExecutionTime: 16, testsExecuted: 200 },
      ],
    },
    {
      applicationId: 'app-013',
      name: 'Audit Trail System',
      automationRate: 84,
      flakyTestRate: 1.8,
      avgExecutionTime: 14,
      passRate: 98.2,
      totalAutomatedTests: 38,
      totalManualTests: 7,
      failedTests: 0,
      blockedTests: 0,
      framework: 'Playwright',
      lastRun: '2024-06-13T06:30:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 75, passRate: 95.0, flakyTestRate: 3.5, avgExecutionTime: 18, testsExecuted: 200 },
        { month: 'Feb 2024', automationRate: 77, passRate: 95.5, flakyTestRate: 3.0, avgExecutionTime: 17, testsExecuted: 210 },
        { month: 'Mar 2024', automationRate: 79, passRate: 96.5, flakyTestRate: 2.8, avgExecutionTime: 16, testsExecuted: 220 },
        { month: 'Apr 2024', automationRate: 81, passRate: 97.0, flakyTestRate: 2.3, avgExecutionTime: 15, testsExecuted: 230 },
        { month: 'May 2024', automationRate: 83, passRate: 97.8, flakyTestRate: 2.0, avgExecutionTime: 15, testsExecuted: 240 },
        { month: 'Jun 2024', automationRate: 84, passRate: 98.2, flakyTestRate: 1.8, avgExecutionTime: 14, testsExecuted: 250 },
      ],
    },
    {
      applicationId: 'app-015',
      name: 'Data Analytics Platform',
      automationRate: 80,
      flakyTestRate: 2.2,
      avgExecutionTime: 20,
      passRate: 97.5,
      totalAutomatedTests: 35,
      totalManualTests: 9,
      failedTests: 1,
      blockedTests: 0,
      framework: 'Playwright',
      lastRun: '2024-06-13T09:00:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 70, passRate: 94.0, flakyTestRate: 4.0, avgExecutionTime: 25, testsExecuted: 170 },
        { month: 'Feb 2024', automationRate: 72, passRate: 94.5, flakyTestRate: 3.5, avgExecutionTime: 24, testsExecuted: 180 },
        { month: 'Mar 2024', automationRate: 74, passRate: 95.5, flakyTestRate: 3.2, avgExecutionTime: 23, testsExecuted: 190 },
        { month: 'Apr 2024', automationRate: 76, passRate: 96.0, flakyTestRate: 2.8, avgExecutionTime: 22, testsExecuted: 200 },
        { month: 'May 2024', automationRate: 78, passRate: 97.0, flakyTestRate: 2.5, avgExecutionTime: 21, testsExecuted: 210 },
        { month: 'Jun 2024', automationRate: 80, passRate: 97.5, flakyTestRate: 2.2, avgExecutionTime: 20, testsExecuted: 220 },
      ],
    },
    {
      applicationId: 'app-020',
      name: 'Programme Coordination Platform',
      automationRate: 74,
      flakyTestRate: 3.0,
      avgExecutionTime: 17,
      passRate: 95.8,
      totalAutomatedTests: 30,
      totalManualTests: 11,
      failedTests: 1,
      blockedTests: 0,
      framework: 'Playwright',
      lastRun: '2024-06-12T08:00:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 62, passRate: 91.0, flakyTestRate: 5.0, avgExecutionTime: 22, testsExecuted: 140 },
        { month: 'Feb 2024', automationRate: 64, passRate: 92.0, flakyTestRate: 4.5, avgExecutionTime: 21, testsExecuted: 148 },
        { month: 'Mar 2024', automationRate: 66, passRate: 93.0, flakyTestRate: 4.2, avgExecutionTime: 20, testsExecuted: 155 },
        { month: 'Apr 2024', automationRate: 69, passRate: 94.0, flakyTestRate: 3.8, avgExecutionTime: 19, testsExecuted: 162 },
        { month: 'May 2024', automationRate: 72, passRate: 95.0, flakyTestRate: 3.3, avgExecutionTime: 18, testsExecuted: 170 },
        { month: 'Jun 2024', automationRate: 74, passRate: 95.8, flakyTestRate: 3.0, avgExecutionTime: 17, testsExecuted: 178 },
      ],
    },
    {
      applicationId: 'app-023',
      name: 'Exam Scheduling Engine',
      automationRate: 66,
      flakyTestRate: 4.0,
      avgExecutionTime: 28,
      passRate: 93.0,
      totalAutomatedTests: 20,
      totalManualTests: 10,
      failedTests: 2,
      blockedTests: 0,
      framework: 'Playwright',
      lastRun: '2024-06-11T07:00:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 54, passRate: 88.0, flakyTestRate: 6.5, avgExecutionTime: 34, testsExecuted: 85 },
        { month: 'Feb 2024', automationRate: 56, passRate: 89.0, flakyTestRate: 6.0, avgExecutionTime: 33, testsExecuted: 90 },
        { month: 'Mar 2024', automationRate: 58, passRate: 90.0, flakyTestRate: 5.5, avgExecutionTime: 32, testsExecuted: 95 },
        { month: 'Apr 2024', automationRate: 61, passRate: 91.0, flakyTestRate: 5.0, avgExecutionTime: 30, testsExecuted: 100 },
        { month: 'May 2024', automationRate: 64, passRate: 92.0, flakyTestRate: 4.5, avgExecutionTime: 29, testsExecuted: 105 },
        { month: 'Jun 2024', automationRate: 66, passRate: 93.0, flakyTestRate: 4.0, avgExecutionTime: 28, testsExecuted: 110 },
      ],
    },
    {
      applicationId: 'app-026',
      name: 'Payroll Integration Module',
      automationRate: 46,
      flakyTestRate: 8.5,
      avgExecutionTime: 32,
      passRate: 82.0,
      totalAutomatedTests: 10,
      totalManualTests: 12,
      failedTests: 4,
      blockedTests: 1,
      framework: 'Selenium',
      lastRun: '2024-06-10T10:00:00Z',
      healthStatus: 'critical',
      trendData: [
        { month: 'Jan 2024', automationRate: 35, passRate: 76.0, flakyTestRate: 12.0, avgExecutionTime: 40, testsExecuted: 45 },
        { month: 'Feb 2024', automationRate: 37, passRate: 77.5, flakyTestRate: 11.0, avgExecutionTime: 38, testsExecuted: 48 },
        { month: 'Mar 2024', automationRate: 39, passRate: 78.5, flakyTestRate: 10.5, avgExecutionTime: 37, testsExecuted: 50 },
        { month: 'Apr 2024', automationRate: 41, passRate: 79.5, flakyTestRate: 10.0, avgExecutionTime: 35, testsExecuted: 52 },
        { month: 'May 2024', automationRate: 44, passRate: 81.0, flakyTestRate: 9.2, avgExecutionTime: 33, testsExecuted: 55 },
        { month: 'Jun 2024', automationRate: 46, passRate: 82.0, flakyTestRate: 8.5, avgExecutionTime: 32, testsExecuted: 58 },
      ],
    },
    {
      applicationId: 'app-027',
      name: 'Reporting Engine',
      automationRate: 82,
      flakyTestRate: 2.0,
      avgExecutionTime: 22,
      passRate: 97.8,
      totalAutomatedTests: 36,
      totalManualTests: 8,
      failedTests: 0,
      blockedTests: 0,
      framework: 'Playwright',
      lastRun: '2024-06-13T07:00:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 72, passRate: 94.0, flakyTestRate: 3.8, avgExecutionTime: 27, testsExecuted: 175 },
        { month: 'Feb 2024', automationRate: 74, passRate: 95.0, flakyTestRate: 3.3, avgExecutionTime: 26, testsExecuted: 185 },
        { month: 'Mar 2024', automationRate: 76, passRate: 95.5, flakyTestRate: 3.0, avgExecutionTime: 25, testsExecuted: 192 },
        { month: 'Apr 2024', automationRate: 78, passRate: 96.5, flakyTestRate: 2.6, avgExecutionTime: 24, testsExecuted: 200 },
        { month: 'May 2024', automationRate: 80, passRate: 97.0, flakyTestRate: 2.3, avgExecutionTime: 23, testsExecuted: 208 },
        { month: 'Jun 2024', automationRate: 82, passRate: 97.8, flakyTestRate: 2.0, avgExecutionTime: 22, testsExecuted: 215 },
      ],
    },
    {
      applicationId: 'app-035',
      name: 'Quality Gate Manager',
      automationRate: 72,
      flakyTestRate: 2.8,
      avgExecutionTime: 15,
      passRate: 96.0,
      totalAutomatedTests: 25,
      totalManualTests: 10,
      failedTests: 1,
      blockedTests: 0,
      framework: 'Playwright',
      lastRun: '2024-06-12T07:00:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 60, passRate: 91.0, flakyTestRate: 5.0, avgExecutionTime: 20, testsExecuted: 110 },
        { month: 'Feb 2024', automationRate: 62, passRate: 92.0, flakyTestRate: 4.5, avgExecutionTime: 19, testsExecuted: 115 },
        { month: 'Mar 2024', automationRate: 64, passRate: 93.0, flakyTestRate: 4.0, avgExecutionTime: 18, testsExecuted: 120 },
        { month: 'Apr 2024', automationRate: 67, passRate: 94.0, flakyTestRate: 3.5, avgExecutionTime: 17, testsExecuted: 125 },
        { month: 'May 2024', automationRate: 70, passRate: 95.0, flakyTestRate: 3.2, avgExecutionTime: 16, testsExecuted: 130 },
        { month: 'Jun 2024', automationRate: 72, passRate: 96.0, flakyTestRate: 2.8, avgExecutionTime: 15, testsExecuted: 135 },
      ],
    },
    {
      applicationId: 'app-039',
      name: 'Test Automation Framework',
      automationRate: 90,
      flakyTestRate: 1.5,
      avgExecutionTime: 45,
      passRate: 98.8,
      totalAutomatedTests: 48,
      totalManualTests: 5,
      failedTests: 0,
      blockedTests: 0,
      framework: 'Playwright',
      lastRun: '2024-06-13T07:00:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 82, passRate: 96.0, flakyTestRate: 3.0, avgExecutionTime: 52, testsExecuted: 250 },
        { month: 'Feb 2024', automationRate: 84, passRate: 96.5, flakyTestRate: 2.7, avgExecutionTime: 50, testsExecuted: 260 },
        { month: 'Mar 2024', automationRate: 85, passRate: 97.0, flakyTestRate: 2.4, avgExecutionTime: 49, testsExecuted: 270 },
        { month: 'Apr 2024', automationRate: 87, passRate: 97.5, flakyTestRate: 2.0, avgExecutionTime: 48, testsExecuted: 280 },
        { month: 'May 2024', automationRate: 89, passRate: 98.2, flakyTestRate: 1.8, avgExecutionTime: 46, testsExecuted: 290 },
        { month: 'Jun 2024', automationRate: 90, passRate: 98.8, flakyTestRate: 1.5, avgExecutionTime: 45, testsExecuted: 300 },
      ],
    },
    {
      applicationId: 'app-040',
      name: 'API Gateway',
      automationRate: 79,
      flakyTestRate: 2.0,
      avgExecutionTime: 12,
      passRate: 97.2,
      totalAutomatedTests: 30,
      totalManualTests: 8,
      failedTests: 1,
      blockedTests: 0,
      framework: 'Postman/Newman',
      lastRun: '2024-06-13T06:00:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 68, passRate: 93.0, flakyTestRate: 4.0, avgExecutionTime: 16, testsExecuted: 145 },
        { month: 'Feb 2024', automationRate: 70, passRate: 94.0, flakyTestRate: 3.5, avgExecutionTime: 15, testsExecuted: 152 },
        { month: 'Mar 2024', automationRate: 72, passRate: 94.5, flakyTestRate: 3.2, avgExecutionTime: 14, testsExecuted: 158 },
        { month: 'Apr 2024', automationRate: 75, passRate: 95.5, flakyTestRate: 2.8, avgExecutionTime: 13, testsExecuted: 165 },
        { month: 'May 2024', automationRate: 77, passRate: 96.5, flakyTestRate: 2.3, avgExecutionTime: 13, testsExecuted: 172 },
        { month: 'Jun 2024', automationRate: 79, passRate: 97.2, flakyTestRate: 2.0, avgExecutionTime: 12, testsExecuted: 180 },
      ],
    },
    {
      applicationId: 'app-047',
      name: 'Governance Dashboard',
      automationRate: 78,
      flakyTestRate: 2.3,
      avgExecutionTime: 14,
      passRate: 96.8,
      totalAutomatedTests: 28,
      totalManualTests: 8,
      failedTests: 1,
      blockedTests: 0,
      framework: 'Playwright',
      lastRun: '2024-06-13T07:00:00Z',
      healthStatus: 'healthy',
      trendData: [
        { month: 'Jan 2024', automationRate: 66, passRate: 92.0, flakyTestRate: 4.5, avgExecutionTime: 19, testsExecuted: 130 },
        { month: 'Feb 2024', automationRate: 68, passRate: 93.0, flakyTestRate: 4.0, avgExecutionTime: 18, testsExecuted: 138 },
        { month: 'Mar 2024', automationRate: 70, passRate: 93.5, flakyTestRate: 3.5, avgExecutionTime: 17, testsExecuted: 145 },
        { month: 'Apr 2024', automationRate: 73, passRate: 94.5, flakyTestRate: 3.2, avgExecutionTime: 16, testsExecuted: 152 },
        { month: 'May 2024', automationRate: 76, passRate: 96.0, flakyTestRate: 2.6, avgExecutionTime: 15, testsExecuted: 160 },
        { month: 'Jun 2024', automationRate: 78, passRate: 96.8, flakyTestRate: 2.3, avgExecutionTime: 14, testsExecuted: 168 },
      ],
    },
    {
      applicationId: 'app-050',
      name: 'Data Migration Utility',
      automationRate: 61,
      flakyTestRate: 5.0,
      avgExecutionTime: 45,
      passRate: 89.5,
      totalAutomatedTests: 16,
      totalManualTests: 10,
      failedTests: 2,
      blockedTests: 1,
      framework: 'Pytest',
      lastRun: '2024-06-11T09:00:00Z',
      healthStatus: 'warning',
      trendData: [
        { month: 'Jan 2024', automationRate: 48, passRate: 83.0, flakyTestRate: 8.0, avgExecutionTime: 55, testsExecuted: 60 },
        { month: 'Feb 2024', automationRate: 50, passRate: 84.5, flakyTestRate: 7.5, avgExecutionTime: 53, testsExecuted: 65 },
        { month: 'Mar 2024', automationRate: 53, passRate: 85.5, flakyTestRate: 7.0, avgExecutionTime: 51, testsExecuted: 68 },
        { month: 'Apr 2024', automationRate: 55, passRate: 87.0, flakyTestRate: 6.2, avgExecutionTime: 49, testsExecuted: 72 },
        { month: 'May 2024', automationRate: 58, passRate: 88.5, flakyTestRate: 5.5, avgExecutionTime: 47, testsExecuted: 76 },
        { month: 'Jun 2024', automationRate: 61, passRate: 89.5, flakyTestRate: 5.0, avgExecutionTime: 45, testsExecuted: 80 },
      ],
    },
  ],

  frameworkDistribution: [
    {
      framework: 'Playwright',
      applicationCount: 14,
      testCount: 385,
      avgPassRate: 96.2,
      avgExecutionTime: 19,
      color: '#0069cc',
    },
    {
      framework: 'Selenium',
      applicationCount: 3,
      testCount: 47,
      avgPassRate: 87.2,
      avgExecutionTime: 25,
      color: '#0f9d58',
    },
    {
      framework: 'Postman/Newman',
      applicationCount: 1,
      testCount: 30,
      avgPassRate: 97.2,
      avgExecutionTime: 12,
      color: '#f59e0b',
    },
    {
      framework: 'Pytest',
      applicationCount: 1,
      testCount: 16,
      avgPassRate: 89.5,
      avgExecutionTime: 45,
      color: '#ef4444',
    },
    {
      framework: 'Manual Only',
      applicationCount: 6,
      testCount: 0,
      avgPassRate: 0,
      avgExecutionTime: 0,
      color: '#939ba3',
    },
  ],

  roiMetrics: {
    totalManualHoursSaved: 342,
    costSavingsPerMonth: 285000,
    defectsFoundByAutomation: 89,
    defectsFoundByManual: 46,
    avgTimeToFeedback: 8,
    avgManualTimeToFeedback: 240,
    regressionCycleReduction: 68,
    releaseConfidenceScore: 87,
    monthlySavings: [
      { month: 'Jan 2024', hoursSaved: 210, costSavings: 175000 },
      { month: 'Feb 2024', hoursSaved: 228, costSavings: 190000 },
      { month: 'Mar 2024', hoursSaved: 252, costSavings: 210000 },
      { month: 'Apr 2024', hoursSaved: 276, costSavings: 230000 },
      { month: 'May 2024', hoursSaved: 306, costSavings: 255000 },
      { month: 'Jun 2024', hoursSaved: 342, costSavings: 285000 },
      { month: 'Jul 2024', hoursSaved: 360, costSavings: 300000 },
      { month: 'Aug 2024', hoursSaved: 378, costSavings: 315000 },
      { month: 'Sep 2024', hoursSaved: 396, costSavings: 330000 },
      { month: 'Oct 2024', hoursSaved: 414, costSavings: 345000 },
      { month: 'Nov 2024', hoursSaved: 432, costSavings: 360000 },
      { month: 'Dec 2024', hoursSaved: 450, costSavings: 375000 },
    ],
  },

  coverageByPriority: [
    {
      priority: 'critical',
      totalTests: 28,
      automatedTests: 24,
      automationRate: 85.7,
      color: '#ef4444',
    },
    {
      priority: 'high',
      totalTests: 42,
      automatedTests: 30,
      automationRate: 71.4,
      color: '#f97316',
    },
    {
      priority: 'medium',
      totalTests: 35,
      automatedTests: 18,
      automationRate: 51.4,
      color: '#f59e0b',
    },
    {
      priority: 'low',
      totalTests: 10,
      automatedTests: 3,
      automationRate: 30.0,
      color: '#0f9d58',
    },
  ],

  topFlakyTests: [
    {
      testId: 'test-016',
      testName: 'Verify regional data sync across regions',
      application: 'Regional Data Hub',
      flakyRate: 18.5,
      failureCount: 5,
      executionCount: 27,
      lastFailure: '2024-06-09T09:02:00Z',
      rootCause: 'Network latency to remote regions exceeds configured sync timeout.',
    },
    {
      testId: 'test-048',
      testName: 'Verify payroll data synchronization',
      application: 'Payroll Integration Module',
      flakyRate: 15.2,
      failureCount: 4,
      executionCount: 26,
      lastFailure: '2024-06-01T10:01:05Z',
      rootCause: 'Allowance code mapping mismatches between HR and finance systems.',
    },
    {
      testId: 'test-003',
      testName: 'Verify session timeout after inactivity',
      application: 'EMIS Core',
      flakyRate: 10.0,
      failureCount: 3,
      executionCount: 30,
      lastFailure: '2024-06-11T09:01:10Z',
      rootCause: 'Session TTL configuration inconsistency between environments.',
    },
    {
      testId: 'test-078',
      testName: 'Verify data migration integrity check',
      application: 'Data Migration Utility',
      flakyRate: 9.5,
      failureCount: 2,
      executionCount: 21,
      lastFailure: '2024-06-03T09:01:35Z',
      rootCause: 'Character encoding differences between source and target databases.',
    },
    {
      testId: 'test-012',
      testName: 'Verify teacher qualification validation',
      application: 'Teacher Registry',
      flakyRate: 8.3,
      failureCount: 2,
      executionCount: 24,
      lastFailure: '2024-06-08T08:00:20Z',
      rootCause: 'Qualification framework configuration not consistently deployed across environments.',
    },
    {
      testId: 'test-007',
      testName: 'Verify budget variance calculation',
      application: 'Budget Tracker',
      flakyRate: 7.1,
      failureCount: 2,
      executionCount: 28,
      lastFailure: '2024-06-09T08:00:16Z',
      rootCause: 'Floating point arithmetic precision loss in variance calculation.',
    },
    {
      testId: 'test-045',
      testName: 'Verify network latency monitoring',
      application: 'Network Monitoring Dashboard',
      flakyRate: 6.5,
      failureCount: 2,
      executionCount: 31,
      lastFailure: '2024-06-05T09:00:45Z',
      rootCause: 'Intermittent network probe timeouts during peak traffic hours.',
    },
    {
      testId: 'test-014',
      testName: 'Verify procurement approval chain',
      application: 'Procurement Portal',
      flakyRate: 5.0,
      failureCount: 1,
      executionCount: 20,
      lastFailure: '2024-05-28T09:00:48Z',
      rootCause: 'Race condition in multi-level approval chain when concurrent approvals occur.',
    },
    {
      testId: 'test-033',
      testName: 'Verify enrollment statistics calculation',
      application: 'School Enrollment System',
      flakyRate: 4.2,
      failureCount: 1,
      executionCount: 24,
      lastFailure: '2024-05-20T08:00:27Z',
      rootCause: 'Stale cache data causing intermittent statistics calculation discrepancies.',
    },
    {
      testId: 'test-066',
      testName: 'Verify API gateway routing',
      application: 'API Gateway',
      flakyRate: 3.3,
      failureCount: 1,
      executionCount: 30,
      lastFailure: '2024-05-15T08:00:16Z',
      rootCause: 'Service discovery lag during rolling deployments causes brief routing failures.',
    },
  ],

  executiveSummary: {
    overallAutomationRate: 58,
    overallPassRate: 93.8,
    overallFlakyRate: 3.9,
    totalAutomatedTests: 478,
    totalManualTests: 207,
    avgExecutionTime: 22,
    automationGrowthRate: 2.4,
  },

  lastUpdated: '2024-06-13T10:00:00Z',
};

export default mockAutomation;
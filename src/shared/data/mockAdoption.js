/**
 * Mock Adoption and Impact Data Seed
 * Platform usage metrics, value realization, and adoption breakdowns by portfolio and application.
 * Used by AdoptionDashboard and ImpactAnalytics screens.
 * @module mockAdoption
 */

/**
 * @typedef {Object} FeatureUsageEntry
 * @property {string} feature - Feature name
 * @property {number} usageCount - Number of times the feature was used in the period
 * @property {number} uniqueUsers - Number of unique users who used the feature
 * @property {number} adoptionRate - Adoption rate percentage (0-100)
 * @property {string} trend - Trend direction: 'up' | 'down' | 'stable'
 */

/**
 * @typedef {Object} LoginFrequencyEntry
 * @property {string} month - Month label (e.g., 'Jan 2024')
 * @property {number} totalLogins - Total number of logins in the month
 * @property {number} uniqueUsers - Number of unique users who logged in
 * @property {number} avgSessionDuration - Average session duration in minutes
 * @property {number} peakConcurrentUsers - Peak concurrent users in the month
 */

/**
 * @typedef {Object} PlatformUsageMetrics
 * @property {number} activeUsers - Number of active users in the current period
 * @property {number} totalRegisteredUsers - Total number of registered users
 * @property {number} activeUserRate - Active user rate percentage (0-100)
 * @property {number} avgDailyLogins - Average daily logins
 * @property {number} avgSessionDuration - Average session duration in minutes
 * @property {number} peakConcurrentUsers - Peak concurrent users
 * @property {LoginFrequencyEntry[]} loginFrequency - Monthly login frequency data
 * @property {FeatureUsageEntry[]} featureUsage - Feature usage breakdown
 */

/**
 * @typedef {Object} ValueRealizationMetrics
 * @property {number} timeSavedHoursPerMonth - Total hours saved per month through platform usage
 * @property {number} defectsPreventedByAI - Number of defects prevented by AI-powered insights
 * @property {number} automationROI - Automation return on investment percentage (0-100+)
 * @property {number} manualProcessReduction - Percentage reduction in manual processes (0-100)
 * @property {number} dataAccuracyImprovement - Percentage improvement in data accuracy (0-100)
 * @property {number} reportingTimeSaved - Hours saved on reporting per month
 * @property {number} decisionTimeReduction - Percentage reduction in decision-making time (0-100)
 * @property {number} costSavingsNAD - Estimated cost savings in NAD per month
 * @property {Array<{month: string, timeSaved: number, defectsPrevented: number, costSavings: number}>} monthlyTrend - Monthly value realization trend
 */

/**
 * @typedef {Object} PortfolioAdoption
 * @property {string} portfolioId - Portfolio identifier
 * @property {string} name - Portfolio name
 * @property {number} totalUsers - Total users in the portfolio
 * @property {number} activeUsers - Active users in the portfolio
 * @property {number} adoptionRate - Adoption rate percentage (0-100)
 * @property {number} avgSessionDuration - Average session duration in minutes
 * @property {number} featureUtilization - Feature utilization percentage (0-100)
 * @property {number} timeSavedHours - Hours saved per month in this portfolio
 * @property {string} trend - Trend direction: 'up' | 'down' | 'stable'
 * @property {string} topFeature - Most used feature in this portfolio
 */

/**
 * @typedef {Object} ApplicationAdoption
 * @property {string} applicationId - Application identifier
 * @property {string} name - Application name
 * @property {number} totalUsers - Total users of the application
 * @property {number} activeUsers - Active users of the application
 * @property {number} adoptionRate - Adoption rate percentage (0-100)
 * @property {number} avgDailyUsage - Average daily usage count
 * @property {number} satisfactionScore - User satisfaction score (0-100)
 * @property {number} taskCompletionRate - Task completion rate percentage (0-100)
 * @property {string} trend - Trend direction: 'up' | 'down' | 'stable'
 */

/**
 * @typedef {Object} RoleAdoption
 * @property {string} role - Role key
 * @property {string} label - Human-readable role label
 * @property {number} totalUsers - Total users with this role
 * @property {number} activeUsers - Active users with this role
 * @property {number} adoptionRate - Adoption rate percentage (0-100)
 * @property {number} avgSessionDuration - Average session duration in minutes
 * @property {string} mostUsedFeature - Most used feature by this role
 */

/**
 * @typedef {Object} UserEngagementSegment
 * @property {string} segment - Segment label: 'Power Users' | 'Regular Users' | 'Occasional Users' | 'Inactive Users'
 * @property {number} count - Number of users in this segment
 * @property {number} percentage - Percentage of total users (0-100)
 * @property {string} color - Color code for chart rendering
 * @property {string} description - Description of the segment criteria
 */

/**
 * @typedef {Object} MockAdoptionData
 * @property {PlatformUsageMetrics} platformUsage - Platform-wide usage metrics
 * @property {ValueRealizationMetrics} valueRealization - Value realization and impact metrics
 * @property {PortfolioAdoption[]} portfolioAdoption - Adoption breakdown by portfolio
 * @property {ApplicationAdoption[]} applicationAdoption - Adoption breakdown by application
 * @property {RoleAdoption[]} roleAdoption - Adoption breakdown by role
 * @property {UserEngagementSegment[]} userEngagementSegments - User engagement segmentation
 * @property {Object} executiveSummary - Executive summary metrics
 * @property {number} executiveSummary.overallAdoptionRate - Overall platform adoption rate (0-100)
 * @property {number} executiveSummary.monthOverMonthGrowth - Month-over-month adoption growth percentage
 * @property {number} executiveSummary.totalValueDeliveredNAD - Total value delivered in NAD
 * @property {number} executiveSummary.userSatisfactionScore - Overall user satisfaction score (0-100)
 * @property {number} executiveSummary.featureUtilizationRate - Overall feature utilization rate (0-100)
 * @property {number} executiveSummary.avgTimeToCompetency - Average time to competency in days
 * @property {string} lastUpdated - ISO 8601 timestamp of last data refresh
 */

/**
 * Pre-provisioned mock adoption and impact data for dashboards and analytics views.
 * @type {MockAdoptionData}
 */
const mockAdoption = {
  platformUsage: {
    activeUsers: 28,
    totalRegisteredUsers: 34,
    activeUserRate: 82.4,
    avgDailyLogins: 22,
    avgSessionDuration: 38,
    peakConcurrentUsers: 18,
    loginFrequency: [
      { month: 'Jan 2024', totalLogins: 485, uniqueUsers: 24, avgSessionDuration: 30, peakConcurrentUsers: 12 },
      { month: 'Feb 2024', totalLogins: 520, uniqueUsers: 25, avgSessionDuration: 31, peakConcurrentUsers: 13 },
      { month: 'Mar 2024', totalLogins: 558, uniqueUsers: 25, avgSessionDuration: 33, peakConcurrentUsers: 14 },
      { month: 'Apr 2024', totalLogins: 592, uniqueUsers: 26, avgSessionDuration: 34, peakConcurrentUsers: 15 },
      { month: 'May 2024', totalLogins: 635, uniqueUsers: 27, avgSessionDuration: 36, peakConcurrentUsers: 16 },
      { month: 'Jun 2024', totalLogins: 672, uniqueUsers: 28, avgSessionDuration: 38, peakConcurrentUsers: 18 },
    ],
    featureUsage: [
      { feature: 'Dashboard', usageCount: 4520, uniqueUsers: 28, adoptionRate: 100, trend: 'stable' },
      { feature: 'Reports', usageCount: 3180, uniqueUsers: 26, adoptionRate: 92.9, trend: 'up' },
      { feature: 'Programmes', usageCount: 2840, uniqueUsers: 24, adoptionRate: 85.7, trend: 'up' },
      { feature: 'Indicators', usageCount: 2450, uniqueUsers: 22, adoptionRate: 78.6, trend: 'up' },
      { feature: 'Analytics', usageCount: 2120, uniqueUsers: 20, adoptionRate: 71.4, trend: 'up' },
      { feature: 'Data Entry', usageCount: 1890, uniqueUsers: 18, adoptionRate: 64.3, trend: 'up' },
      { feature: 'Budget & Finance', usageCount: 1650, uniqueUsers: 16, adoptionRate: 57.1, trend: 'stable' },
      { feature: 'Projects', usageCount: 1480, uniqueUsers: 17, adoptionRate: 60.7, trend: 'up' },
      { feature: 'Notifications', usageCount: 1320, uniqueUsers: 25, adoptionRate: 89.3, trend: 'stable' },
      { feature: 'Approvals', usageCount: 980, uniqueUsers: 12, adoptionRate: 42.9, trend: 'up' },
      { feature: 'Regional Data', usageCount: 870, uniqueUsers: 8, adoptionRate: 28.6, trend: 'stable' },
      { feature: 'School Data', usageCount: 720, uniqueUsers: 7, adoptionRate: 25.0, trend: 'up' },
      { feature: 'Export', usageCount: 690, uniqueUsers: 15, adoptionRate: 53.6, trend: 'up' },
      { feature: 'Audit Log', usageCount: 540, uniqueUsers: 6, adoptionRate: 21.4, trend: 'stable' },
      { feature: 'Procurement', usageCount: 480, uniqueUsers: 4, adoptionRate: 14.3, trend: 'stable' },
      { feature: 'HR', usageCount: 420, uniqueUsers: 3, adoptionRate: 10.7, trend: 'up' },
      { feature: 'ICT Infrastructure', usageCount: 380, uniqueUsers: 3, adoptionRate: 10.7, trend: 'stable' },
      { feature: 'Curriculum', usageCount: 350, uniqueUsers: 4, adoptionRate: 14.3, trend: 'up' },
      { feature: 'User Management', usageCount: 280, uniqueUsers: 2, adoptionRate: 7.1, trend: 'stable' },
      { feature: 'Settings', usageCount: 210, uniqueUsers: 2, adoptionRate: 7.1, trend: 'stable' },
    ],
  },

  valueRealization: {
    timeSavedHoursPerMonth: 486,
    defectsPreventedByAI: 34,
    automationROI: 142,
    manualProcessReduction: 58,
    dataAccuracyImprovement: 23,
    reportingTimeSaved: 128,
    decisionTimeReduction: 35,
    costSavingsNAD: 405000,
    monthlyTrend: [
      { month: 'Jan 2024', timeSaved: 280, defectsPrevented: 18, costSavings: 233000 },
      { month: 'Feb 2024', timeSaved: 310, defectsPrevented: 20, costSavings: 258000 },
      { month: 'Mar 2024', timeSaved: 345, defectsPrevented: 22, costSavings: 288000 },
      { month: 'Apr 2024', timeSaved: 385, defectsPrevented: 25, costSavings: 321000 },
      { month: 'May 2024', timeSaved: 432, defectsPrevented: 29, costSavings: 360000 },
      { month: 'Jun 2024', timeSaved: 486, defectsPrevented: 34, costSavings: 405000 },
      { month: 'Jul 2024', timeSaved: 510, defectsPrevented: 37, costSavings: 425000 },
      { month: 'Aug 2024', timeSaved: 535, defectsPrevented: 40, costSavings: 446000 },
      { month: 'Sep 2024', timeSaved: 560, defectsPrevented: 43, costSavings: 467000 },
      { month: 'Oct 2024', timeSaved: 585, defectsPrevented: 46, costSavings: 488000 },
      { month: 'Nov 2024', timeSaved: 610, defectsPrevented: 49, costSavings: 508000 },
      { month: 'Dec 2024', timeSaved: 635, defectsPrevented: 52, costSavings: 529000 },
    ],
  },

  portfolioAdoption: [
    {
      portfolioId: 'portfolio-001',
      name: 'Education Management',
      totalUsers: 6,
      activeUsers: 5,
      adoptionRate: 83.3,
      avgSessionDuration: 42,
      featureUtilization: 72,
      timeSavedHours: 68,
      trend: 'up',
      topFeature: 'Data Entry',
    },
    {
      portfolioId: 'portfolio-002',
      name: 'Finance & Administration',
      totalUsers: 4,
      activeUsers: 3,
      adoptionRate: 75.0,
      avgSessionDuration: 45,
      featureUtilization: 68,
      timeSavedHours: 52,
      trend: 'stable',
      topFeature: 'Budget & Finance',
    },
    {
      portfolioId: 'portfolio-003',
      name: 'Examinations & Assessment',
      totalUsers: 2,
      activeUsers: 2,
      adoptionRate: 100.0,
      avgSessionDuration: 35,
      featureUtilization: 65,
      timeSavedHours: 38,
      trend: 'up',
      topFeature: 'Reports',
    },
    {
      portfolioId: 'portfolio-004',
      name: 'Human Resources',
      totalUsers: 3,
      activeUsers: 2,
      adoptionRate: 66.7,
      avgSessionDuration: 30,
      featureUtilization: 55,
      timeSavedHours: 34,
      trend: 'up',
      topFeature: 'HR',
    },
    {
      portfolioId: 'portfolio-005',
      name: 'Procurement Management',
      totalUsers: 2,
      activeUsers: 2,
      adoptionRate: 100.0,
      avgSessionDuration: 28,
      featureUtilization: 60,
      timeSavedHours: 26,
      trend: 'stable',
      topFeature: 'Procurement',
    },
    {
      portfolioId: 'portfolio-006',
      name: 'Regional Education',
      totalUsers: 4,
      activeUsers: 3,
      adoptionRate: 75.0,
      avgSessionDuration: 40,
      featureUtilization: 62,
      timeSavedHours: 45,
      trend: 'up',
      topFeature: 'Regional Data',
    },
    {
      portfolioId: 'portfolio-007',
      name: 'Curriculum Development',
      totalUsers: 3,
      activeUsers: 2,
      adoptionRate: 66.7,
      avgSessionDuration: 32,
      featureUtilization: 58,
      timeSavedHours: 28,
      trend: 'up',
      topFeature: 'Curriculum',
    },
    {
      portfolioId: 'portfolio-008',
      name: 'ICT Infrastructure',
      totalUsers: 3,
      activeUsers: 3,
      adoptionRate: 100.0,
      avgSessionDuration: 48,
      featureUtilization: 75,
      timeSavedHours: 56,
      trend: 'stable',
      topFeature: 'ICT Infrastructure',
    },
    {
      portfolioId: 'portfolio-009',
      name: 'Monitoring & Evaluation',
      totalUsers: 3,
      activeUsers: 3,
      adoptionRate: 100.0,
      avgSessionDuration: 52,
      featureUtilization: 82,
      timeSavedHours: 72,
      trend: 'up',
      topFeature: 'Indicators',
    },
    {
      portfolioId: 'portfolio-010',
      name: 'Infrastructure Planning',
      totalUsers: 2,
      activeUsers: 1,
      adoptionRate: 50.0,
      avgSessionDuration: 25,
      featureUtilization: 45,
      timeSavedHours: 18,
      trend: 'stable',
      topFeature: 'Data Entry',
    },
    {
      portfolioId: 'portfolio-011',
      name: 'Governance & Compliance',
      totalUsers: 2,
      activeUsers: 2,
      adoptionRate: 100.0,
      avgSessionDuration: 38,
      featureUtilization: 78,
      timeSavedHours: 42,
      trend: 'up',
      topFeature: 'Audit Log',
    },
    {
      portfolioId: 'portfolio-012',
      name: 'Data Analytics',
      totalUsers: 2,
      activeUsers: 2,
      adoptionRate: 100.0,
      avgSessionDuration: 55,
      featureUtilization: 88,
      timeSavedHours: 65,
      trend: 'up',
      topFeature: 'Analytics',
    },
    {
      portfolioId: 'portfolio-013',
      name: 'Development Partnerships',
      totalUsers: 3,
      activeUsers: 2,
      adoptionRate: 66.7,
      avgSessionDuration: 30,
      featureUtilization: 52,
      timeSavedHours: 22,
      trend: 'stable',
      topFeature: 'Reports',
    },
    {
      portfolioId: 'portfolio-014',
      name: 'Programme Management',
      totalUsers: 3,
      activeUsers: 3,
      adoptionRate: 100.0,
      avgSessionDuration: 44,
      featureUtilization: 76,
      timeSavedHours: 58,
      trend: 'up',
      topFeature: 'Programmes',
    },
    {
      portfolioId: 'portfolio-015',
      name: 'Quality Assurance',
      totalUsers: 3,
      activeUsers: 3,
      adoptionRate: 100.0,
      avgSessionDuration: 50,
      featureUtilization: 85,
      timeSavedHours: 62,
      trend: 'up',
      topFeature: 'Analytics',
    },
    {
      portfolioId: 'portfolio-016',
      name: 'Data Migration & Utilities',
      totalUsers: 1,
      activeUsers: 1,
      adoptionRate: 100.0,
      avgSessionDuration: 35,
      featureUtilization: 60,
      timeSavedHours: 15,
      trend: 'stable',
      topFeature: 'Data Entry',
    },
  ],

  applicationAdoption: [
    {
      applicationId: 'app-001',
      name: 'EMIS Core',
      totalUsers: 18,
      activeUsers: 16,
      adoptionRate: 88.9,
      avgDailyUsage: 42,
      satisfactionScore: 88,
      taskCompletionRate: 94,
      trend: 'up',
    },
    {
      applicationId: 'app-002',
      name: 'Budget Tracker',
      totalUsers: 12,
      activeUsers: 10,
      adoptionRate: 83.3,
      avgDailyUsage: 28,
      satisfactionScore: 85,
      taskCompletionRate: 91,
      trend: 'up',
    },
    {
      applicationId: 'app-003',
      name: 'Learner Assessment Portal',
      totalUsers: 8,
      activeUsers: 7,
      adoptionRate: 87.5,
      avgDailyUsage: 18,
      satisfactionScore: 82,
      taskCompletionRate: 89,
      trend: 'stable',
    },
    {
      applicationId: 'app-004',
      name: 'Teacher Registry',
      totalUsers: 6,
      activeUsers: 5,
      adoptionRate: 83.3,
      avgDailyUsage: 12,
      satisfactionScore: 76,
      taskCompletionRate: 85,
      trend: 'up',
    },
    {
      applicationId: 'app-005',
      name: 'Procurement Portal',
      totalUsers: 5,
      activeUsers: 4,
      adoptionRate: 80.0,
      avgDailyUsage: 10,
      satisfactionScore: 79,
      taskCompletionRate: 87,
      trend: 'stable',
    },
    {
      applicationId: 'app-006',
      name: 'Regional Data Hub',
      totalUsers: 8,
      activeUsers: 6,
      adoptionRate: 75.0,
      avgDailyUsage: 15,
      satisfactionScore: 74,
      taskCompletionRate: 82,
      trend: 'up',
    },
    {
      applicationId: 'app-007',
      name: 'Curriculum Manager',
      totalUsers: 5,
      activeUsers: 4,
      adoptionRate: 80.0,
      avgDailyUsage: 8,
      satisfactionScore: 81,
      taskCompletionRate: 90,
      trend: 'up',
    },
    {
      applicationId: 'app-009',
      name: 'M&E Dashboard',
      totalUsers: 10,
      activeUsers: 9,
      adoptionRate: 90.0,
      avgDailyUsage: 32,
      satisfactionScore: 91,
      taskCompletionRate: 96,
      trend: 'up',
    },
    {
      applicationId: 'app-013',
      name: 'Audit Trail System',
      totalUsers: 6,
      activeUsers: 6,
      adoptionRate: 100.0,
      avgDailyUsage: 22,
      satisfactionScore: 93,
      taskCompletionRate: 98,
      trend: 'stable',
    },
    {
      applicationId: 'app-015',
      name: 'Data Analytics Platform',
      totalUsers: 8,
      activeUsers: 7,
      adoptionRate: 87.5,
      avgDailyUsage: 25,
      satisfactionScore: 90,
      taskCompletionRate: 95,
      trend: 'up',
    },
    {
      applicationId: 'app-020',
      name: 'Programme Coordination Platform',
      totalUsers: 10,
      activeUsers: 8,
      adoptionRate: 80.0,
      avgDailyUsage: 20,
      satisfactionScore: 86,
      taskCompletionRate: 92,
      trend: 'up',
    },
    {
      applicationId: 'app-023',
      name: 'Exam Scheduling Engine',
      totalUsers: 4,
      activeUsers: 3,
      adoptionRate: 75.0,
      avgDailyUsage: 6,
      satisfactionScore: 80,
      taskCompletionRate: 88,
      trend: 'stable',
    },
    {
      applicationId: 'app-027',
      name: 'Reporting Engine',
      totalUsers: 12,
      activeUsers: 11,
      adoptionRate: 91.7,
      avgDailyUsage: 30,
      satisfactionScore: 92,
      taskCompletionRate: 97,
      trend: 'up',
    },
    {
      applicationId: 'app-035',
      name: 'Quality Gate Manager',
      totalUsers: 5,
      activeUsers: 5,
      adoptionRate: 100.0,
      avgDailyUsage: 14,
      satisfactionScore: 87,
      taskCompletionRate: 93,
      trend: 'up',
    },
    {
      applicationId: 'app-039',
      name: 'Test Automation Framework',
      totalUsers: 4,
      activeUsers: 4,
      adoptionRate: 100.0,
      avgDailyUsage: 18,
      satisfactionScore: 94,
      taskCompletionRate: 98,
      trend: 'stable',
    },
    {
      applicationId: 'app-040',
      name: 'API Gateway',
      totalUsers: 6,
      activeUsers: 5,
      adoptionRate: 83.3,
      avgDailyUsage: 16,
      satisfactionScore: 89,
      taskCompletionRate: 95,
      trend: 'stable',
    },
    {
      applicationId: 'app-045',
      name: 'Indicator Tracking System',
      totalUsers: 7,
      activeUsers: 6,
      adoptionRate: 85.7,
      avgDailyUsage: 20,
      satisfactionScore: 85,
      taskCompletionRate: 91,
      trend: 'up',
    },
    {
      applicationId: 'app-047',
      name: 'Governance Dashboard',
      totalUsers: 6,
      activeUsers: 5,
      adoptionRate: 83.3,
      avgDailyUsage: 14,
      satisfactionScore: 90,
      taskCompletionRate: 94,
      trend: 'up',
    },
  ],

  roleAdoption: [
    { role: 'admin', label: 'Administrator', totalUsers: 2, activeUsers: 2, adoptionRate: 100.0, avgSessionDuration: 55, mostUsedFeature: 'User Management' },
    { role: 'viewer', label: 'Viewer', totalUsers: 3, activeUsers: 2, adoptionRate: 66.7, avgSessionDuration: 18, mostUsedFeature: 'Dashboard' },
    { role: 'editor', label: 'Editor', totalUsers: 2, activeUsers: 2, adoptionRate: 100.0, avgSessionDuration: 40, mostUsedFeature: 'Data Entry' },
    { role: 'minister', label: 'Minister', totalUsers: 1, activeUsers: 1, adoptionRate: 100.0, avgSessionDuration: 15, mostUsedFeature: 'Dashboard' },
    { role: 'deputy_minister', label: 'Deputy Minister', totalUsers: 1, activeUsers: 1, adoptionRate: 100.0, avgSessionDuration: 20, mostUsedFeature: 'Reports' },
    { role: 'permanent_secretary', label: 'Permanent Secretary', totalUsers: 1, activeUsers: 1, adoptionRate: 100.0, avgSessionDuration: 35, mostUsedFeature: 'Audit Log' },
    { role: 'director_general', label: 'Director General', totalUsers: 1, activeUsers: 1, adoptionRate: 100.0, avgSessionDuration: 28, mostUsedFeature: 'Approvals' },
    { role: 'director', label: 'Director', totalUsers: 2, activeUsers: 2, adoptionRate: 100.0, avgSessionDuration: 42, mostUsedFeature: 'Programmes' },
    { role: 'deputy_director', label: 'Deputy Director', totalUsers: 1, activeUsers: 1, adoptionRate: 100.0, avgSessionDuration: 32, mostUsedFeature: 'Projects' },
    { role: 'chief_education_officer', label: 'Chief Education Officer', totalUsers: 1, activeUsers: 1, adoptionRate: 100.0, avgSessionDuration: 38, mostUsedFeature: 'Curriculum' },
    { role: 'regional_director', label: 'Regional Director', totalUsers: 3, activeUsers: 3, adoptionRate: 100.0, avgSessionDuration: 40, mostUsedFeature: 'Regional Data' },
    { role: 'school_principal', label: 'School Principal', totalUsers: 2, activeUsers: 2, adoptionRate: 100.0, avgSessionDuration: 22, mostUsedFeature: 'School Data' },
    { role: 'inspector', label: 'Inspector', totalUsers: 2, activeUsers: 2, adoptionRate: 100.0, avgSessionDuration: 35, mostUsedFeature: 'Data Entry' },
    { role: 'curriculum_specialist', label: 'Curriculum Specialist', totalUsers: 2, activeUsers: 1, adoptionRate: 50.0, avgSessionDuration: 30, mostUsedFeature: 'Curriculum' },
    { role: 'finance_officer', label: 'Finance Officer', totalUsers: 2, activeUsers: 1, adoptionRate: 50.0, avgSessionDuration: 45, mostUsedFeature: 'Budget & Finance' },
    { role: 'procurement_officer', label: 'Procurement Officer', totalUsers: 1, activeUsers: 1, adoptionRate: 100.0, avgSessionDuration: 28, mostUsedFeature: 'Procurement' },
    { role: 'hr_officer', label: 'HR Officer', totalUsers: 1, activeUsers: 1, adoptionRate: 100.0, avgSessionDuration: 30, mostUsedFeature: 'HR' },
    { role: 'ict_officer', label: 'ICT Officer', totalUsers: 1, activeUsers: 1, adoptionRate: 100.0, avgSessionDuration: 48, mostUsedFeature: 'ICT Infrastructure' },
    { role: 'm_and_e_officer', label: 'M&E Officer', totalUsers: 2, activeUsers: 2, adoptionRate: 100.0, avgSessionDuration: 52, mostUsedFeature: 'Indicators' },
    { role: 'development_partner', label: 'Development Partner', totalUsers: 2, activeUsers: 2, adoptionRate: 100.0, avgSessionDuration: 25, mostUsedFeature: 'Reports' },
    { role: 'programme_coordinator', label: 'Programme Coordinator', totalUsers: 1, activeUsers: 1, adoptionRate: 100.0, avgSessionDuration: 44, mostUsedFeature: 'Programmes' },
    { role: 'data_analyst', label: 'Data Analyst', totalUsers: 1, activeUsers: 1, adoptionRate: 100.0, avgSessionDuration: 55, mostUsedFeature: 'Analytics' },
  ],

  userEngagementSegments: [
    {
      segment: 'Power Users',
      count: 8,
      percentage: 23.5,
      color: '#0069cc',
      description: 'Users who log in daily and use 5+ features per session.',
    },
    {
      segment: 'Regular Users',
      count: 12,
      percentage: 35.3,
      color: '#0f9d58',
      description: 'Users who log in 3-5 times per week and use 2-4 features per session.',
    },
    {
      segment: 'Occasional Users',
      count: 8,
      percentage: 23.5,
      color: '#f59e0b',
      description: 'Users who log in 1-2 times per week and use 1-2 features per session.',
    },
    {
      segment: 'Inactive Users',
      count: 6,
      percentage: 17.6,
      color: '#ef4444',
      description: 'Users who have not logged in within the last 30 days.',
    },
  ],

  executiveSummary: {
    overallAdoptionRate: 82.4,
    monthOverMonthGrowth: 3.8,
    totalValueDeliveredNAD: 2265000,
    userSatisfactionScore: 86,
    featureUtilizationRate: 68,
    avgTimeToCompetency: 12,
  },

  lastUpdated: '2024-06-13T10:00:00Z',
};

export default mockAdoption;
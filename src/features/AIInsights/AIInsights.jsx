/**
 * AIInsights Component
 * AI Insights screen (FR-023): displays simulated AI-powered insights including
 * predictive quality scores, test optimization recommendations, defect prediction panel,
 * risk assessment, and generative test case suggestions. All AI results are static mock
 * data with clear 'Simulated AI' labels. No real AI/ML execution.
 * @module AIInsights
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getMetrics,
  getAllPortfolios,
  getAutomationMetrics,
  getGovernanceMetrics,
} from '../../shared/services/dashboardService.js';
import { getApplications } from '../../shared/services/repositoryService.js';
import MetricCard from '../../shared/components/MetricCard.jsx';
import ChartWrapper from '../../shared/components/ChartWrapper.jsx';
import DataTable from '../../shared/components/DataTable.jsx';
import ExportButton from '../../shared/components/ExportButton.jsx';
import LoadingSpinner from '../../shared/components/LoadingSpinner.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import EmptyState from '../../shared/components/EmptyState.jsx';

/**
 * Formats a date string for display.
 *
 * @param {string} dateStr - ISO 8601 date string
 * @returns {string} Formatted date string
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) {
    return '';
  }
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Simulated AI predictive quality scores for applications.
 * @type {Array<{applicationId: string, name: string, currentScore: number, predictedScore: number, confidence: number, trend: string, riskFactors: string[], recommendations: string[]}>}
 */
const SIMULATED_PREDICTIVE_SCORES = [
  {
    applicationId: 'app-001',
    name: 'EMIS Core',
    currentScore: 92,
    predictedScore: 94,
    confidence: 88,
    trend: 'up',
    riskFactors: ['Increasing code complexity in data sync module'],
    recommendations: ['Increase unit test coverage for sync module to 90%+', 'Add integration tests for multi-region data flow'],
  },
  {
    applicationId: 'app-002',
    name: 'Budget Tracker',
    currentScore: 88,
    predictedScore: 90,
    confidence: 85,
    trend: 'up',
    riskFactors: ['Floating point precision in financial calculations'],
    recommendations: ['Migrate variance calculations to integer arithmetic', 'Add property-based tests for financial computations'],
  },
  {
    applicationId: 'app-003',
    name: 'Learner Assessment Portal',
    currentScore: 85,
    predictedScore: 83,
    confidence: 78,
    trend: 'down',
    riskFactors: ['Accessibility compliance gaps', 'Growing technical debt in reporting module'],
    recommendations: ['Prioritize WCAG 2.1 AA compliance testing', 'Refactor assessment reporting module', 'Add automated accessibility scans to CI pipeline'],
  },
  {
    applicationId: 'app-004',
    name: 'Teacher Registry',
    currentScore: 78,
    predictedScore: 80,
    confidence: 72,
    trend: 'up',
    riskFactors: ['Qualification validation framework inconsistencies', 'Bulk import feature lacks error recovery'],
    recommendations: ['Standardize qualification framework across environments', 'Implement batch processing with rollback for bulk imports'],
  },
  {
    applicationId: 'app-006',
    name: 'Regional Data Hub',
    currentScore: 76,
    predictedScore: 72,
    confidence: 70,
    trend: 'down',
    riskFactors: ['Network latency in remote regions', 'Offline sync queue overflow risk', 'Data consistency issues during concurrent syncs'],
    recommendations: ['Implement incremental sync with conflict resolution', 'Increase sync timeout for remote regions', 'Add queue overflow protection with backpressure'],
  },
  {
    applicationId: 'app-009',
    name: 'M&E Dashboard',
    currentScore: 90,
    predictedScore: 92,
    confidence: 91,
    trend: 'up',
    riskFactors: ['Predictive analytics module complexity'],
    recommendations: ['Add model accuracy regression tests', 'Implement A/B testing for prediction algorithms'],
  },
  {
    applicationId: 'app-010',
    name: 'School Infrastructure DB',
    currentScore: 71,
    predictedScore: 68,
    confidence: 65,
    trend: 'down',
    riskFactors: ['Legacy database schema constraints', 'Low test automation coverage', 'Missing mobile inspection app integration tests'],
    recommendations: ['Increase automation rate from 45% to 60%', 'Add API contract tests for mobile app integration', 'Plan database schema migration'],
  },
  {
    applicationId: 'app-013',
    name: 'Audit Trail System',
    currentScore: 94,
    predictedScore: 95,
    confidence: 93,
    trend: 'up',
    riskFactors: ['Elasticsearch index growth management'],
    recommendations: ['Implement index lifecycle management policies', 'Add performance tests for large audit log queries'],
  },
  {
    applicationId: 'app-026',
    name: 'Payroll Integration Module',
    currentScore: 72,
    predictedScore: 65,
    confidence: 68,
    trend: 'down',
    riskFactors: ['Allowance code mapping errors', 'Low test coverage at 63%', 'Integration sync failures during peak hours'],
    recommendations: ['Create comprehensive allowance code mapping test suite', 'Increase test coverage to 80%+', 'Add load testing for peak hour scenarios'],
  },
  {
    applicationId: 'app-040',
    name: 'API Gateway',
    currentScore: 90,
    predictedScore: 91,
    confidence: 89,
    trend: 'up',
    riskFactors: ['Service discovery lag during rolling deployments'],
    recommendations: ['Add canary deployment tests', 'Implement circuit breaker pattern tests'],
  },
];

/**
 * Simulated AI defect predictions.
 * @type {Array<{id: string, application: string, module: string, predictedDefects: number, confidence: number, severity: string, rootCauseCategory: string, suggestedAction: string, timeframe: string}>}
 */
const SIMULATED_DEFECT_PREDICTIONS = [
  {
    id: 'dp-001',
    application: 'Regional Data Hub',
    module: 'Data Synchronization',
    predictedDefects: 5,
    confidence: 82,
    severity: 'high',
    rootCauseCategory: 'Concurrency',
    suggestedAction: 'Add mutex locks for concurrent sync operations and implement retry logic with exponential backoff.',
    timeframe: 'Next 30 days',
  },
  {
    id: 'dp-002',
    application: 'Payroll Integration Module',
    module: 'Allowance Code Mapping',
    predictedDefects: 4,
    confidence: 88,
    severity: 'critical',
    rootCauseCategory: 'Data Mapping',
    suggestedAction: 'Create automated validation for allowance code mappings before each sync cycle.',
    timeframe: 'Next 14 days',
  },
  {
    id: 'dp-003',
    application: 'Learner Assessment Portal',
    module: 'Report Generation',
    predictedDefects: 3,
    confidence: 75,
    severity: 'medium',
    rootCauseCategory: 'Performance',
    suggestedAction: 'Optimize report aggregation queries and add pagination for large result sets.',
    timeframe: 'Next 30 days',
  },
  {
    id: 'dp-004',
    application: 'School Infrastructure DB',
    module: 'Condition Survey Entry',
    predictedDefects: 3,
    confidence: 70,
    severity: 'medium',
    rootCauseCategory: 'Validation',
    suggestedAction: 'Add client-side validation for survey form fields and implement offline data caching.',
    timeframe: 'Next 45 days',
  },
  {
    id: 'dp-005',
    application: 'Teacher Registry',
    module: 'Bulk Import',
    predictedDefects: 2,
    confidence: 78,
    severity: 'high',
    rootCauseCategory: 'Error Handling',
    suggestedAction: 'Implement batch processing with per-record error isolation and rollback capability.',
    timeframe: 'Next 21 days',
  },
  {
    id: 'dp-006',
    application: 'Network Monitoring Dashboard',
    module: 'Alert Threshold Engine',
    predictedDefects: 2,
    confidence: 72,
    severity: 'medium',
    rootCauseCategory: 'Configuration',
    suggestedAction: 'Add validation for threshold configuration values and implement configuration drift detection.',
    timeframe: 'Next 30 days',
  },
  {
    id: 'dp-007',
    application: 'EMIS Core',
    module: 'Session Management',
    predictedDefects: 1,
    confidence: 85,
    severity: 'low',
    rootCauseCategory: 'Configuration',
    suggestedAction: 'Standardize session TTL configuration across all environments using environment-specific config files.',
    timeframe: 'Next 60 days',
  },
  {
    id: 'dp-008',
    application: 'Data Migration Utility',
    module: 'Character Encoding',
    predictedDefects: 3,
    confidence: 80,
    severity: 'high',
    rootCauseCategory: 'Data Integrity',
    suggestedAction: 'Enforce UTF-8 encoding validation at source extraction and add checksum verification at each pipeline stage.',
    timeframe: 'Next 14 days',
  },
];

/**
 * Simulated AI risk assessment for portfolios.
 * @type {Array<{portfolio: string, riskScore: number, riskLevel: string, factors: string[], mitigations: string[], trend: string}>}
 */
const SIMULATED_RISK_ASSESSMENTS = [
  {
    portfolio: 'Human Resources',
    riskScore: 72,
    riskLevel: 'high',
    factors: ['Low automation rate (44%)', 'Multiple legacy systems', 'High defect density (3.2/KLOC)', 'Performance appraisal system in development'],
    mitigations: ['Accelerate legacy system decommissioning', 'Increase automation coverage for HR modules', 'Prioritize payroll integration stabilization'],
    trend: 'stable',
  },
  {
    portfolio: 'Infrastructure Planning',
    riskScore: 68,
    riskLevel: 'high',
    factors: ['Lowest test coverage (59%)', 'High defect density (3.5/KLOC)', 'Budget constraints for maintenance', 'Only 2 applications with limited automation'],
    mitigations: ['Increase test coverage to 70%+', 'Implement automated infrastructure condition monitoring', 'Allocate emergency maintenance budget'],
    trend: 'down',
  },
  {
    portfolio: 'Regional Education',
    riskScore: 65,
    riskLevel: 'medium',
    factors: ['Connectivity challenges in rural areas', 'Data submission timeliness issues', 'Offline sync reliability concerns'],
    mitigations: ['Deploy offline-first data collection', 'Implement data compression for low-bandwidth regions', 'Add automated data quality checks'],
    trend: 'up',
  },
  {
    portfolio: 'Procurement Management',
    riskScore: 60,
    riskLevel: 'medium',
    factors: ['Vendor contract compliance gaps', 'Procurement transparency audit findings', 'Legacy system still in use'],
    mitigations: ['Implement automated contract expiry alerts', 'Digitize evaluation criteria documentation', 'Complete legacy system migration'],
    trend: 'up',
  },
  {
    portfolio: 'Education Management',
    riskScore: 55,
    riskLevel: 'medium',
    factors: ['Special needs tracking system needs enhancement', 'Parent portal in development', 'Legacy student records pending decommission'],
    mitigations: ['Prioritize IEP module development', 'Complete legacy data migration', 'Increase test coverage for enrollment system'],
    trend: 'up',
  },
  {
    portfolio: 'Data Analytics',
    riskScore: 22,
    riskLevel: 'low',
    factors: ['AI Insights Engine still in development phase'],
    mitigations: ['Ensure comprehensive testing before production deployment'],
    trend: 'stable',
  },
  {
    portfolio: 'Governance & Compliance',
    riskScore: 18,
    riskLevel: 'low',
    factors: ['High compliance rate maintained'],
    mitigations: ['Continue regular audit cycles'],
    trend: 'stable',
  },
  {
    portfolio: 'Quality Assurance',
    riskScore: 15,
    riskLevel: 'low',
    factors: ['Strong automation framework', 'High pass rates'],
    mitigations: ['Maintain current quality standards'],
    trend: 'stable',
  },
];

/**
 * Simulated AI-generated test case suggestions.
 * @type {Array<{id: string, application: string, testName: string, type: string, priority: string, rationale: string, estimatedEffort: string, category: string}>}
 */
const SIMULATED_TEST_SUGGESTIONS = [
  {
    id: 'ts-001',
    application: 'Regional Data Hub',
    testName: 'Verify concurrent multi-region sync with conflict resolution',
    type: 'Automated',
    priority: 'critical',
    rationale: 'AI detected increasing sync conflicts during peak hours. No existing test covers concurrent sync from 3+ regions simultaneously.',
    estimatedEffort: '4 hours',
    category: 'Integration',
  },
  {
    id: 'ts-002',
    application: 'Payroll Integration Module',
    testName: 'Verify allowance code mapping for all 47 active codes',
    type: 'Automated',
    priority: 'critical',
    rationale: 'Historical defect analysis shows 60% of payroll failures stem from unmapped allowance codes. Current tests only cover 28 of 47 codes.',
    estimatedEffort: '3 hours',
    category: 'Data Validation',
  },
  {
    id: 'ts-003',
    application: 'EMIS Core',
    testName: 'Verify data sync recovery after network interruption',
    type: 'Automated',
    priority: 'high',
    rationale: 'Network reliability analysis shows 12% of sync operations experience interruptions. No test validates recovery behavior.',
    estimatedEffort: '5 hours',
    category: 'Resilience',
  },
  {
    id: 'ts-004',
    application: 'Learner Assessment Portal',
    testName: 'Verify screen reader navigation for assessment entry form',
    type: 'Manual',
    priority: 'high',
    rationale: 'Accessibility audit identified 3 WCAG 2.1 AA violations in the assessment entry form. No accessibility test exists for this flow.',
    estimatedEffort: '2 hours',
    category: 'Accessibility',
  },
  {
    id: 'ts-005',
    application: 'Teacher Registry',
    testName: 'Verify bulk import with 10,000+ records and error recovery',
    type: 'Automated',
    priority: 'high',
    rationale: 'Performance analysis shows bulk import times out for files exceeding 5,000 records. Batch processing needs validation.',
    estimatedEffort: '4 hours',
    category: 'Performance',
  },
  {
    id: 'ts-006',
    application: 'Data Migration Utility',
    testName: 'Verify UTF-8 encoding preservation across all character sets',
    type: 'Automated',
    priority: 'critical',
    rationale: 'Character encoding mismatches caused 3 data corruption incidents. Test should cover Namibian language characters and special symbols.',
    estimatedEffort: '3 hours',
    category: 'Data Integrity',
  },
  {
    id: 'ts-007',
    application: 'Budget Tracker',
    testName: 'Verify budget alert delivery within 60 seconds of threshold breach',
    type: 'Automated',
    priority: 'medium',
    rationale: 'Alert delivery SLA is 60 seconds but no test validates timing. Monitoring shows occasional 90-second delays.',
    estimatedEffort: '2 hours',
    category: 'Performance',
  },
  {
    id: 'ts-008',
    application: 'API Gateway',
    testName: 'Verify graceful degradation during rolling deployment',
    type: 'Automated',
    priority: 'high',
    rationale: 'Service discovery lag during deployments causes brief routing failures. Canary deployment test needed.',
    estimatedEffort: '6 hours',
    category: 'Resilience',
  },
  {
    id: 'ts-009',
    application: 'School Infrastructure DB',
    testName: 'Verify offline photo capture and sync for condition surveys',
    type: 'Manual',
    priority: 'medium',
    rationale: 'Mobile inspection app planned but no test validates offline photo capture workflow with subsequent sync.',
    estimatedEffort: '3 hours',
    category: 'Functional',
  },
  {
    id: 'ts-010',
    application: 'Governance Dashboard',
    testName: 'Verify compliance score recalculation after audit finding update',
    type: 'Automated',
    priority: 'medium',
    rationale: 'Compliance scores should update within 5 minutes of audit finding changes. No test validates recalculation timing.',
    estimatedEffort: '2 hours',
    category: 'Functional',
  },
  {
    id: 'ts-011',
    application: 'Exam Scheduling Engine',
    testName: 'Verify conflict detection with 500+ concurrent exam sessions',
    type: 'Automated',
    priority: 'high',
    rationale: 'Load analysis predicts 500+ concurrent sessions during national exams. Current conflict detection tested with max 50 sessions.',
    estimatedEffort: '5 hours',
    category: 'Performance',
  },
  {
    id: 'ts-012',
    application: 'Notification Service',
    testName: 'Verify SMS delivery fallback when primary gateway is unavailable',
    type: 'Automated',
    priority: 'medium',
    rationale: 'SMS gateway integration lacks failover testing. Rural schools depend on SMS for critical notifications.',
    estimatedEffort: '3 hours',
    category: 'Resilience',
  },
];

/**
 * Simulated AI test optimization recommendations.
 * @type {Array<{id: string, category: string, title: string, description: string, impact: string, effort: string, priority: string, affectedApplications: string[]}>}
 */
const SIMULATED_OPTIMIZATION_RECOMMENDATIONS = [
  {
    id: 'opt-001',
    category: 'Test Suite Optimization',
    title: 'Eliminate redundant authentication tests across 8 applications',
    description: 'AI analysis detected 34 authentication test cases with 78% overlap across applications. Consolidating into a shared authentication test library would reduce maintenance effort by 45%.',
    impact: 'High — saves 12 hours/month in test maintenance',
    effort: '16 hours one-time',
    priority: 'high',
    affectedApplications: ['EMIS Core', 'Budget Tracker', 'M&E Dashboard', 'Audit Trail System', 'Reporting Engine', 'API Gateway', 'Quality Gate Manager', 'Governance Dashboard'],
  },
  {
    id: 'opt-002',
    category: 'Flaky Test Remediation',
    title: 'Stabilize top 5 flaky tests to improve pipeline reliability',
    description: 'The top 5 flaky tests account for 68% of all pipeline retries. Root causes identified: network timeouts (2), race conditions (2), environment configuration (1).',
    impact: 'High — reduces CI pipeline time by 25%',
    effort: '20 hours one-time',
    priority: 'critical',
    affectedApplications: ['Regional Data Hub', 'Payroll Integration Module', 'EMIS Core', 'Data Migration Utility', 'Teacher Registry'],
  },
  {
    id: 'opt-003',
    category: 'Coverage Gap Analysis',
    title: 'Add API contract tests for 6 inter-service integrations',
    description: 'AI identified 6 service-to-service integrations without contract tests. These integrations account for 40% of production incidents in the last quarter.',
    impact: 'High — prevents 40% of integration-related incidents',
    effort: '24 hours one-time',
    priority: 'high',
    affectedApplications: ['API Gateway', 'Notification Service', 'Payroll Integration Module', 'Regional Data Hub', 'Reporting Engine', 'Grant Management System'],
  },
  {
    id: 'opt-004',
    category: 'Execution Time Optimization',
    title: 'Parallelize Data Migration Utility test suite',
    description: 'The Data Migration Utility test suite runs sequentially taking 45 seconds average. Parallelizing independent tests could reduce execution time to 15 seconds.',
    impact: 'Medium — 67% reduction in suite execution time',
    effort: '8 hours one-time',
    priority: 'medium',
    affectedApplications: ['Data Migration Utility'],
  },
  {
    id: 'opt-005',
    category: 'Test Data Management',
    title: 'Implement synthetic data generation for 4 expired test data sets',
    description: 'AI detected 4 test data sets marked as expired. Implementing automated synthetic data generation would eliminate manual refresh cycles.',
    impact: 'Medium — saves 6 hours/month in data refresh',
    effort: '12 hours one-time',
    priority: 'medium',
    affectedApplications: ['Learner Assessment Portal', 'School Infrastructure DB', 'Payroll Integration Module', 'Teacher Registry'],
  },
  {
    id: 'opt-006',
    category: 'Risk-Based Test Prioritization',
    title: 'Reorder regression suite by defect probability',
    description: 'AI analysis of defect patterns suggests reordering the regression suite to run highest-risk tests first. This would detect 80% of defects within the first 30% of test execution.',
    impact: 'High — faster feedback on critical defects',
    effort: '4 hours one-time',
    priority: 'high',
    affectedApplications: ['All applications'],
  },
];

/**
 * AIInsights page component.
 * Displays simulated AI-powered insights including predictive quality scores,
 * test optimization recommendations, defect prediction panel, risk assessment,
 * and generative test case suggestions.
 *
 * @returns {React.ReactElement} The AI insights page
 */
export default function AIInsights() {
  const { currentUser, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard data for context
  const [metrics, setMetrics] = useState(null);
  const [automationData, setAutomationData] = useState(null);

  // Active tab
  const [activeTab, setActiveTab] = useState('predictions');

  /**
   * Fetches supporting data for AI insights context.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [metricsData, autoData] = await Promise.all([
        getMetrics(),
        getAutomationMetrics(),
      ]);

      setMetrics(metricsData);
      setAutomationData(autoData);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load AI insights data.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Executive KPIs from metrics data.
   */
  const executiveKPIs = useMemo(() => {
    if (!metrics || !metrics.executiveKPIs) {
      return null;
    }
    return metrics.executiveKPIs;
  }, [metrics]);

  /**
   * Summary KPIs for AI insights.
   */
  const aiSummaryKPIs = useMemo(() => {
    const totalPredictions = SIMULATED_DEFECT_PREDICTIONS.length;
    const criticalPredictions = SIMULATED_DEFECT_PREDICTIONS.filter((p) => p.severity === 'critical').length;
    const highRiskPortfolios = SIMULATED_RISK_ASSESSMENTS.filter((r) => r.riskLevel === 'high').length;
    const testSuggestions = SIMULATED_TEST_SUGGESTIONS.length;
    const optimizationRecs = SIMULATED_OPTIMIZATION_RECOMMENDATIONS.length;

    const avgConfidence = SIMULATED_PREDICTIVE_SCORES.length > 0
      ? Math.round(SIMULATED_PREDICTIVE_SCORES.reduce((sum, s) => sum + s.confidence, 0) / SIMULATED_PREDICTIVE_SCORES.length)
      : 0;

    const improvingApps = SIMULATED_PREDICTIVE_SCORES.filter((s) => s.trend === 'up').length;
    const decliningApps = SIMULATED_PREDICTIVE_SCORES.filter((s) => s.trend === 'down').length;

    const totalPredictedDefects = SIMULATED_DEFECT_PREDICTIONS.reduce((sum, p) => sum + p.predictedDefects, 0);

    return {
      totalPredictions,
      criticalPredictions,
      highRiskPortfolios,
      testSuggestions,
      optimizationRecs,
      avgConfidence,
      improvingApps,
      decliningApps,
      totalPredictedDefects,
    };
  }, []);

  /**
   * Predictive quality score chart data.
   */
  const predictiveScoreChartData = useMemo(() => {
    return SIMULATED_PREDICTIVE_SCORES
      .slice()
      .sort((a, b) => b.predictedScore - a.predictedScore)
      .map((s) => ({
        name: s.name.length > 18 ? s.name.substring(0, 15) + '...' : s.name,
        currentScore: s.currentScore,
        predictedScore: s.predictedScore,
      }));
  }, []);

  /**
   * Predictive quality score chart config.
   */
  const predictiveScoreChartConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'currentScore', name: 'Current Score', color: '#0069cc' },
        { dataKey: 'predictedScore', name: 'Predicted Score', color: '#0f9d58' },
      ],
      showLegend: true,
    };
  }, []);

  /**
   * Risk assessment chart data.
   */
  const riskAssessmentChartData = useMemo(() => {
    return SIMULATED_RISK_ASSESSMENTS
      .slice()
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)
      .map((r) => ({
        name: r.portfolio.length > 20 ? r.portfolio.substring(0, 17) + '...' : r.portfolio,
        riskScore: r.riskScore,
      }));
  }, []);

  /**
   * Risk assessment chart config.
   */
  const riskAssessmentChartConfig = useMemo(() => {
    return {
      xAxisKey: 'name',
      series: [
        { dataKey: 'riskScore', name: 'Risk Score', color: '#ef4444' },
      ],
      showLegend: true,
    };
  }, []);

  /**
   * Defect prediction severity distribution chart data.
   */
  const defectSeverityData = useMemo(() => {
    const counts = {};
    for (const dp of SIMULATED_DEFECT_PREDICTIONS) {
      const sev = dp.severity || 'unknown';
      counts[sev] = (counts[sev] || 0) + dp.predictedDefects;
    }

    const severityColors = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#f59e0b',
      low: '#0f9d58',
    };

    return Object.entries(counts)
      .map(([severity, count]) => ({
        name: severity.charAt(0).toUpperCase() + severity.slice(1),
        value: count,
        color: severityColors[severity] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, []);

  /**
   * Pie chart config.
   */
  const pieChartConfig = useMemo(() => {
    return {
      dataKey: 'value',
      nameKey: 'name',
      showLegend: true,
      innerRadius: 40,
      outerRadius: '75%',
    };
  }, []);

  /**
   * Test suggestion category distribution chart data.
   */
  const testSuggestionCategoryData = useMemo(() => {
    const counts = {};
    for (const ts of SIMULATED_TEST_SUGGESTIONS) {
      const cat = ts.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    }

    const categoryColors = {
      Integration: '#0069cc',
      'Data Validation': '#0f9d58',
      Resilience: '#f97316',
      Accessibility: '#8b5cf6',
      Performance: '#f59e0b',
      'Data Integrity': '#ef4444',
      Functional: '#06b6d4',
    };

    return Object.entries(counts)
      .map(([category, count]) => ({
        name: category,
        value: count,
        color: categoryColors[category] || '#939ba3',
      }))
      .filter((item) => item.value > 0);
  }, []);

  /**
   * Predictive scores table columns.
   */
  const predictiveScoreColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Application',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900 line-clamp-1">{value}</span>
        ),
      },
      {
        key: 'currentScore',
        label: 'Current',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value < 70) {
            colorClass = 'text-red-600';
          } else if (value < 80) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-semibold ${colorClass}`}>{value}</span>
          );
        },
      },
      {
        key: 'predictedScore',
        label: 'Predicted',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value < 70) {
            colorClass = 'text-red-600';
          } else if (value < 80) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-bold ${colorClass}`}>{value}</span>
          );
        },
      },
      {
        key: 'confidence',
        label: 'Confidence',
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-brand-gray-200 rounded-full max-w-[60px]">
              <div
                className={`h-2 rounded-full ${value >= 80 ? 'bg-brand-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(value, 100)}%` }}
              />
            </div>
            <span className="text-xs text-brand-gray-600">{value}%</span>
          </div>
        ),
      },
      {
        key: 'trend',
        label: 'Trend',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          let icon = '↑';
          if (value === 'down') {
            colorClass = 'text-red-600';
            icon = '↓';
          } else if (value === 'stable') {
            colorClass = 'text-brand-gray-500';
            icon = '→';
          }
          return (
            <span className={`text-sm font-medium ${colorClass}`}>{icon} {value.charAt(0).toUpperCase() + value.slice(1)}</span>
          );
        },
      },
      {
        key: 'riskFactors',
        label: 'Key Risk Factors',
        sortable: false,
        render: (value) => (
          <span className="text-xs text-brand-gray-600 line-clamp-2">
            {Array.isArray(value) ? value.join('; ') : '—'}
          </span>
        ),
      },
    ];
  }, []);

  /**
   * Defect prediction table columns.
   */
  const defectPredictionColumns = useMemo(() => {
    return [
      {
        key: 'application',
        label: 'Application',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
        ),
      },
      {
        key: 'module',
        label: 'Module',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-600">{value}</span>
        ),
      },
      {
        key: 'predictedDefects',
        label: 'Predicted Defects',
        sortable: true,
        render: (value) => (
          <span className={`text-sm font-bold ${value >= 4 ? 'text-red-600' : value >= 2 ? 'text-yellow-600' : 'text-brand-green-600'}`}>
            {value}
          </span>
        ),
      },
      {
        key: 'severity',
        label: 'Severity',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'confidence',
        label: 'Confidence',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}%</span>
        ),
      },
      {
        key: 'rootCauseCategory',
        label: 'Root Cause',
        sortable: true,
        render: (value) => (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
            {value}
          </span>
        ),
      },
      {
        key: 'timeframe',
        label: 'Timeframe',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-500">{value}</span>
        ),
      },
    ];
  }, []);

  /**
   * Test suggestion table columns.
   */
  const testSuggestionColumns = useMemo(() => {
    return [
      {
        key: 'testName',
        label: 'Suggested Test',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900 line-clamp-2">{value}</span>
        ),
      },
      {
        key: 'application',
        label: 'Application',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-600">{value}</span>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        sortable: true,
        render: (value) => (
          <span className={`text-sm font-medium ${value === 'Automated' ? 'text-brand-500' : 'text-yellow-600'}`}>
            {value}
          </span>
        ),
      },
      {
        key: 'priority',
        label: 'Priority',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'category',
        label: 'Category',
        sortable: true,
        render: (value) => (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
            {value}
          </span>
        ),
      },
      {
        key: 'estimatedEffort',
        label: 'Effort',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-600">{value}</span>
        ),
      },
    ];
  }, []);

  /**
   * Risk assessment table columns.
   */
  const riskAssessmentColumns = useMemo(() => {
    return [
      {
        key: 'portfolio',
        label: 'Portfolio',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
        ),
      },
      {
        key: 'riskScore',
        label: 'Risk Score',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value >= 65) {
            colorClass = 'text-red-600';
          } else if (value >= 45) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-bold ${colorClass}`}>{value}</span>
          );
        },
      },
      {
        key: 'riskLevel',
        label: 'Risk Level',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'trend',
        label: 'Trend',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          let icon = '↑';
          if (value === 'down') {
            colorClass = 'text-red-600';
            icon = '↓';
          } else if (value === 'stable') {
            colorClass = 'text-brand-gray-500';
            icon = '→';
          }
          return (
            <span className={`text-sm font-medium ${colorClass}`}>{icon} {value.charAt(0).toUpperCase() + value.slice(1)}</span>
          );
        },
      },
      {
        key: 'factors',
        label: 'Key Factors',
        sortable: false,
        render: (value) => (
          <span className="text-xs text-brand-gray-600 line-clamp-2">
            {Array.isArray(value) ? value.slice(0, 2).join('; ') : '—'}
          </span>
        ),
      },
    ];
  }, []);

  /**
   * Export data for AI insights.
   */
  const exportData = useMemo(() => {
    return SIMULATED_PREDICTIVE_SCORES.map((s) => ({
      applicationId: s.applicationId,
      name: s.name,
      currentScore: s.currentScore,
      predictedScore: s.predictedScore,
      confidence: s.confidence,
      trend: s.trend,
      riskFactors: s.riskFactors.join('; '),
      recommendations: s.recommendations.join('; '),
    }));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading AI insights data..." showLabel />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <svg
            className="w-4 h-4 text-red-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchData}
            className="ml-auto text-sm font-medium text-red-600 hover:text-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-brand-gray-900">
              AI Insights
            </h1>
            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300">
              Simulated AI
            </span>
          </div>
          <p className="text-sm text-brand-gray-500 mt-1">
            AI-powered predictive quality scores, defect predictions, risk assessments, and test optimization recommendations
          </p>
        </div>
        {exportData.length > 0 && (
          <ExportButton
            data={exportData}
            filename="ai-insights"
            title="AI Insights Report"
            sheetName="AI Predictions"
            label="Export"
            size="md"
          />
        )}
      </div>

      {/* Simulated AI Disclaimer */}
      <div className="flex items-start gap-3 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <svg
          className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <div>
          <p className="text-sm font-medium text-yellow-800">
            Simulated AI Insights
          </p>
          <p className="text-xs text-yellow-700 mt-0.5 leading-relaxed">
            All insights, predictions, and recommendations on this page are generated from static mock data for demonstration purposes.
            No real AI/ML models are executed. In a production environment, these would be powered by trained machine learning models
            analyzing historical quality data, defect patterns, and test execution trends.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <MetricCard
          label="Avg AI Confidence"
          value={aiSummaryKPIs.avgConfidence}
          trend={aiSummaryKPIs.avgConfidence >= 80 ? 'up' : 'neutral'}
          trendValue={aiSummaryKPIs.avgConfidence >= 80 ? 'High' : 'Moderate'}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        />
        <MetricCard
          label="Improving Apps"
          value={aiSummaryKPIs.improvingApps}
          trend="up"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <MetricCard
          label="Declining Apps"
          value={aiSummaryKPIs.decliningApps}
          trend={aiSummaryKPIs.decliningApps > 0 ? 'down' : 'up'}
          trendValue={aiSummaryKPIs.decliningApps > 0 ? 'Action needed' : 'None'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          }
        />
        <MetricCard
          label="Predicted Defects"
          value={aiSummaryKPIs.totalPredictedDefects}
          trend={aiSummaryKPIs.totalPredictedDefects > 15 ? 'down' : 'neutral'}
          trendValue="Next 30-60 days"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <MetricCard
          label="Critical Predictions"
          value={aiSummaryKPIs.criticalPredictions}
          trend={aiSummaryKPIs.criticalPredictions > 0 ? 'down' : 'up'}
          trendValue={aiSummaryKPIs.criticalPredictions > 0 ? 'Urgent' : 'None'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="High Risk Portfolios"
          value={aiSummaryKPIs.highRiskPortfolios}
          trend={aiSummaryKPIs.highRiskPortfolios > 2 ? 'down' : 'neutral'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <MetricCard
          label="Test Suggestions"
          value={aiSummaryKPIs.testSuggestions}
          trend="up"
          trendValue="AI generated"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <MetricCard
          label="Optimizations"
          value={aiSummaryKPIs.optimizationRecs}
          trend="up"
          trendValue="Actionable"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-brand-gray-200 overflow-x-auto">
        {[
          { key: 'predictions', label: 'Quality Predictions' },
          { key: 'defects', label: 'Defect Predictions' },
          { key: 'risk', label: 'Risk Assessment' },
          { key: 'tests', label: 'Test Suggestions' },
          { key: 'optimizations', label: 'Optimizations' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Quality Predictions */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {predictiveScoreChartData.length > 0 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <ChartWrapper
                  chartType="bar"
                  data={predictiveScoreChartData}
                  config={predictiveScoreChartConfig}
                  title="Current vs. Predicted Quality Scores"
                  subtitle="AI-predicted quality scores for the next quarter (Simulated)"
                  height={320}
                  loading={false}
                  emptyMessage="No prediction data available"
                />
              </div>
            )}

            {/* Prediction Highlights */}
            <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-5 h-5 text-brand-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-brand-gray-900">
                  AI Prediction Highlights
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300">
                  Simulated
                </span>
              </div>
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {SIMULATED_PREDICTIVE_SCORES
                  .filter((s) => s.trend === 'down')
                  .map((score) => (
                    <div
                      key={score.applicationId}
                      className="flex gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-brand-gray-900">{score.name}</p>
                          <span className="text-xs text-red-600 font-semibold">
                            {score.currentScore} → {score.predictedScore}
                          </span>
                          <span className="text-[10px] text-brand-gray-400">
                            {score.confidence}% confidence
                          </span>
                        </div>
                        <p className="text-xs text-brand-gray-600 mt-1 leading-relaxed">
                          {score.recommendations[0]}
                        </p>
                      </div>
                    </div>
                  ))}
                {SIMULATED_PREDICTIVE_SCORES
                  .filter((s) => s.trend === 'up')
                  .slice(0, 3)
                  .map((score) => (
                    <div
                      key={score.applicationId}
                      className="flex gap-3 p-3 bg-brand-green-50 rounded-lg border border-brand-green-200"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-brand-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-brand-gray-900">{score.name}</p>
                          <span className="text-xs text-brand-green-600 font-semibold">
                            {score.currentScore} → {score.predictedScore}
                          </span>
                          <span className="text-[10px] text-brand-gray-400">
                            {score.confidence}% confidence
                          </span>
                        </div>
                        <p className="text-xs text-brand-gray-600 mt-1 leading-relaxed">
                          {score.recommendations[0]}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Predictive Scores Table */}
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-brand-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-brand-gray-900">
                Predictive Quality Scores
              </h2>
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300">
                Simulated AI
              </span>
              <span className="text-sm text-brand-gray-500">
                ({SIMULATED_PREDICTIVE_SCORES.length})
              </span>
            </div>
            <DataTable
              columns={predictiveScoreColumns}
              data={SIMULATED_PREDICTIVE_SCORES}
              pageSize={10}
              selectable={false}
              searchFields={['name', 'trend']}
              emptyMessage="No predictive scores available."
              rowKeyField="applicationId"
              storageKey="ai-insights-predictive-scores"
            />
          </div>
        </div>
      )}

      {/* Tab Content: Defect Predictions */}
      {activeTab === 'defects' && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {defectSeverityData.length > 0 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <ChartWrapper
                  chartType="pie"
                  data={defectSeverityData}
                  config={pieChartConfig}
                  title="Predicted Defects by Severity"
                  subtitle="AI-predicted defect distribution (Simulated)"
                  height={280}
                  loading={false}
                  emptyMessage="No defect prediction data available"
                />
              </div>
            )}

            {/* Critical Defect Predictions */}
            <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-brand-gray-900">
                  Critical & High Severity Predictions
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300">
                  Simulated AI
                </span>
              </div>
              <div className="space-y-3">
                {SIMULATED_DEFECT_PREDICTIONS
                  .filter((dp) => dp.severity === 'critical' || dp.severity === 'high')
                  .map((dp) => {
                    const isCritical = dp.severity === 'critical';
                    return (
                      <div
                        key={dp.id}
                        className={`flex gap-3 p-3 rounded-lg border ${
                          isCritical ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <svg className={`w-5 h-5 ${isCritical ? 'text-red-500' : 'text-orange-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-brand-gray-900">
                              {dp.application} — {dp.module}
                            </p>
                            <StatusBadge status={dp.severity} size="sm" />
                            <span className="text-xs text-brand-gray-500">
                              {dp.predictedDefects} defects · {dp.confidence}% confidence · {dp.timeframe}
                            </span>
                          </div>
                          <p className="text-xs text-brand-gray-600 mt-1 leading-relaxed">
                            <span className="font-medium">Suggested Action:</span> {dp.suggestedAction}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Defect Predictions Table */}
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-brand-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-brand-gray-900">
                All Defect Predictions
              </h2>
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300">
                Simulated AI
              </span>
              <span className="text-sm text-brand-gray-500">
                ({SIMULATED_DEFECT_PREDICTIONS.length})
              </span>
            </div>
            <DataTable
              columns={defectPredictionColumns}
              data={SIMULATED_DEFECT_PREDICTIONS}
              pageSize={10}
              selectable={false}
              searchFields={['application', 'module', 'severity', 'rootCauseCategory', 'suggestedAction']}
              emptyMessage="No defect predictions available."
              rowKeyField="id"
              storageKey="ai-insights-defect-predictions"
            />
          </div>
        </div>
      )}

      {/* Tab Content: Risk Assessment */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          {/* Risk Chart */}
          {riskAssessmentChartData.length > 0 && (
            <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
              <ChartWrapper
                chartType="bar"
                data={riskAssessmentChartData}
                config={riskAssessmentChartConfig}
                title="Portfolio Risk Scores"
                subtitle="AI-assessed risk scores by portfolio (Simulated — higher = more risk)"
                height={320}
                loading={false}
                emptyMessage="No risk assessment data available"
              />
            </div>
          )}

          {/* High Risk Portfolio Details */}
          {SIMULATED_RISK_ASSESSMENTS.filter((r) => r.riskLevel === 'high').length > 0 && (
            <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-brand-gray-900">
                  High Risk Portfolios — Detailed Analysis
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300">
                  Simulated AI
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {SIMULATED_RISK_ASSESSMENTS
                  .filter((r) => r.riskLevel === 'high')
                  .map((risk) => (
                    <div
                      key={risk.portfolio}
                      className="bg-red-50 rounded-lg p-4 border border-red-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-brand-gray-900">{risk.portfolio}</p>
                          <StatusBadge status={risk.riskLevel} size="sm" />
                        </div>
                        <span className="text-lg font-bold text-red-600">{risk.riskScore}</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-1">Risk Factors</p>
                          <ul className="space-y-0.5">
                            {risk.factors.map((factor, idx) => (
                              <li key={idx} className="text-xs text-brand-gray-600 flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                                {factor}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-1">Recommended Mitigations</p>
                          <ul className="space-y-0.5">
                            {risk.mitigations.map((mitigation, idx) => (
                              <li key={idx} className="text-xs text-brand-green-700 flex items-start gap-1.5">
                                <svg className="w-3 h-3 text-brand-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                {mitigation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Risk Assessment Table */}
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-brand-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-brand-gray-900">
                All Portfolio Risk Assessments
              </h2>
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300">
                Simulated AI
              </span>
              <span className="text-sm text-brand-gray-500">
                ({SIMULATED_RISK_ASSESSMENTS.length})
              </span>
            </div>
            <DataTable
              columns={riskAssessmentColumns}
              data={SIMULATED_RISK_ASSESSMENTS}
              pageSize={10}
              selectable={false}
              searchFields={['portfolio', 'riskLevel', 'trend']}
              emptyMessage="No risk assessments available."
              rowKeyField="portfolio"
              storageKey="ai-insights-risk-assessments"
            />
          </div>
        </div>
      )}

      {/* Tab Content: Test Suggestions */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {testSuggestionCategoryData.length > 0 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <ChartWrapper
                  chartType="pie"
                  data={testSuggestionCategoryData}
                  config={pieChartConfig}
                  title="Suggestions by Category"
                  subtitle="AI-generated test suggestions by category (Simulated)"
                  height={280}
                  loading={false}
                  emptyMessage="No test suggestion data available"
                />
              </div>
            )}

            {/* Top Priority Suggestions */}
            <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-5 h-5 text-brand-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-brand-gray-900">
                  Critical Priority Test Suggestions
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300">
                  Simulated AI
                </span>
              </div>
              <div className="space-y-3 max-h-[240px] overflow-y-auto">
                {SIMULATED_TEST_SUGGESTIONS
                  .filter((ts) => ts.priority === 'critical')
                  .map((ts) => (
                    <div
                      key={ts.id}
                      className="flex gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-brand-gray-900">{ts.testName}</p>
                          <StatusBadge status={ts.priority} size="sm" />
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-brand-gray-500">
                          <span>{ts.application}</span>
                          <span>·</span>
                          <span>{ts.type}</span>
                          <span>·</span>
                          <span>{ts.estimatedEffort}</span>
                          <span>·</span>
                          <span>{ts.category}</span>
                        </div>
                        <p className="text-xs text-brand-gray-600 mt-1 leading-relaxed">
                          <span className="font-medium">Rationale:</span> {ts.rationale}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Test Suggestions Table */}
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-brand-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h2 className="text-lg font-semibold text-brand-gray-900">
                All AI-Generated Test Suggestions
              </h2>
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300">
                Simulated AI
              </span>
              <span className="text-sm text-brand-gray-500">
                ({SIMULATED_TEST_SUGGESTIONS.length})
              </span>
            </div>
            <DataTable
              columns={testSuggestionColumns}
              data={SIMULATED_TEST_SUGGESTIONS}
              pageSize={10}
              selectable={false}
              searchFields={['testName', 'application', 'type', 'priority', 'category', 'rationale']}
              emptyMessage="No test suggestions available."
              rowKeyField="id"
              storageKey="ai-insights-test-suggestions"
            />
          </div>
        </div>
      )}

      {/* Tab Content: Optimizations */}
      {activeTab === 'optimizations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-brand-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-brand-gray-900">
                Test Optimization Recommendations
              </h2>
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300">
                Simulated AI
              </span>
              <span className="text-sm text-brand-gray-500">
                ({SIMULATED_OPTIMIZATION_RECOMMENDATIONS.length} recommendations)
              </span>
            </div>
            <div className="space-y-4">
              {SIMULATED_OPTIMIZATION_RECOMMENDATIONS.map((rec) => {
                let borderColor = 'border-brand-gray-200';
                let bgColor = 'bg-brand-gray-50';
                let iconColor = 'text-brand-gray-400';

                if (rec.priority === 'critical') {
                  borderColor = 'border-red-200';
                  bgColor = 'bg-red-50';
                  iconColor = 'text-red-500';
                } else if (rec.priority === 'high') {
                  borderColor = 'border-orange-200';
                  bgColor = 'bg-orange-50';
                  iconColor = 'text-orange-500';
                } else if (rec.priority === 'medium') {
                  borderColor = 'border-yellow-200';
                  bgColor = 'bg-yellow-50';
                  iconColor = 'text-yellow-500';
                }

                return (
                  <div
                    key={rec.id}
                    className={`rounded-lg border ${borderColor} ${bgColor} p-4`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className={`w-5 h-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-semibold text-brand-gray-900">
                            {rec.title}
                          </p>
                          <StatusBadge status={rec.priority} size="sm" />
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 ring-1 ring-inset ring-brand-gray-300">
                            {rec.category}
                          </span>
                        </div>
                        <p className="text-xs text-brand-gray-600 leading-relaxed mb-2">
                          {rec.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-brand-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            <span className="text-brand-green-700 font-medium">Impact: {rec.impact}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-brand-gray-600">Effort: {rec.effort}</span>
                          </div>
                        </div>
                        {rec.affectedApplications && rec.affectedApplications.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {rec.affectedApplications.slice(0, 5).map((app, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300"
                              >
                                {app}
                              </span>
                            ))}
                            {rec.affectedApplications.length > 5 && (
                              <span className="text-[10px] text-brand-gray-400">
                                +{rec.affectedApplications.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{SIMULATED_PREDICTIVE_SCORES.length} Quality Predictions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{SIMULATED_DEFECT_PREDICTIONS.length} Defect Predictions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{SIMULATED_RISK_ASSESSMENTS.length} Risk Assessments</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{SIMULATED_TEST_SUGGESTIONS.length} Test Suggestions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>{SIMULATED_OPTIMIZATION_RECOMMENDATIONS.length} Optimizations</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            All insights are simulated · No real AI/ML execution
          </div>
        </div>
      </div>
    </div>
  );
}
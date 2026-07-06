/**
 * ReportingAnalytics Component
 * Reporting and Analytics screen (FR-022): provides standard report templates
 * (Quality Summary, Test Coverage, Defect Analysis, Release Readiness) and self-service
 * report builder with metric/filter selection. Export to CSV, Excel, PDF, PowerPoint
 * via ExportService. Simulated Power BI section with placeholder iframe and connection status.
 * Uses DashboardService and ExportService.
 * @module ReportingAnalytics
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getMetrics,
  getAllPortfolios,
  getReleaseDashboardData,
  getExecutionMetrics,
  getAutomationMetrics,
  getGovernanceMetrics,
  getAdoptionMetrics,
  getDashboardSummary,
  getDistinctPortfolioNames,
} from '../../shared/services/dashboardService.js';
import {
  getApplications,
} from '../../shared/services/repositoryService.js';
import MetricCard from '../../shared/components/MetricCard.jsx';
import ChartWrapper from '../../shared/components/ChartWrapper.jsx';
import DataTable from '../../shared/components/DataTable.jsx';
import FilterBar from '../../shared/components/FilterBar.jsx';
import ExportButton from '../../shared/components/ExportButton.jsx';
import LoadingSpinner from '../../shared/components/LoadingSpinner.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import EmptyState from '../../shared/components/EmptyState.jsx';
import Modal from '../../shared/components/Modal.jsx';

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
 * Standard report template definitions.
 * @type {Array<{id: string, name: string, description: string, icon: string, category: string, metrics: string[]}>}
 */
const REPORT_TEMPLATES = [
  {
    id: 'quality-summary',
    name: 'Quality Summary Report',
    description: 'Enterprise-wide quality metrics including quality scores, test coverage, automation rates, and defect density across all portfolios.',
    icon: 'quality',
    category: 'Quality',
    metrics: ['qualityScore', 'testCoverage', 'automationRate', 'defectDensity', 'openDefects'],
  },
  {
    id: 'test-coverage',
    name: 'Test Coverage Report',
    description: 'Detailed test coverage analysis by application and portfolio, including automated vs. manual test distribution and coverage trends.',
    icon: 'coverage',
    category: 'Testing',
    metrics: ['testCoverage', 'automationRate', 'totalTestCases', 'automatedTests', 'manualTests'],
  },
  {
    id: 'defect-analysis',
    name: 'Defect Analysis Report',
    description: 'Comprehensive defect analysis including defect density trends, open vs. closed defects, top defect applications, and root cause distribution.',
    icon: 'defect',
    category: 'Quality',
    metrics: ['defectDensity', 'openDefects', 'closedDefects', 'defectsFound', 'defectsResolved'],
  },
  {
    id: 'release-readiness',
    name: 'Release Readiness Report',
    description: 'Release pipeline status including quality gate pass rates, release success rates, deployment outcomes, and rollback statistics.',
    icon: 'release',
    category: 'Release',
    metrics: ['releaseSuccessRate', 'qualityGatePassRate', 'totalReleases', 'releasesInProgress', 'rolledBack'],
  },
  {
    id: 'automation-roi',
    name: 'Automation ROI Report',
    description: 'Return on investment analysis for test automation including hours saved, cost savings, defects found by automation, and regression cycle reduction.',
    icon: 'automation',
    category: 'Automation',
    metrics: ['automationRate', 'hoursSaved', 'costSavings', 'defectsFoundByAutomation', 'regressionReduction'],
  },
  {
    id: 'governance-compliance',
    name: 'Governance Compliance Report',
    description: 'Governance adherence metrics including compliance rates by category, audit findings, corrective actions, and high-risk procedures.',
    icon: 'governance',
    category: 'Governance',
    metrics: ['complianceRate', 'compliantCount', 'nonCompliantCount', 'partialCount', 'highRiskCount'],
  },
  {
    id: 'adoption-impact',
    name: 'Adoption & Impact Report',
    description: 'Platform adoption metrics including active users, feature utilization, value realization, and user engagement segmentation.',
    icon: 'adoption',
    category: 'Adoption',
    metrics: ['adoptionRate', 'activeUsers', 'featureUtilization', 'timeSaved', 'costSavingsNAD'],
  },
  {
    id: 'executive-summary',
    name: 'Executive Summary Report',
    description: 'High-level executive summary combining key metrics from all domains for leadership review and decision making.',
    icon: 'executive',
    category: 'Executive',
    metrics: ['qualityScore', 'releaseSuccessRate', 'automationRate', 'complianceRate', 'adoptionRate'],
  },
];

/**
 * Available metrics for the self-service report builder.
 * @type {Array<{value: string, label: string, category: string}>}
 */
const AVAILABLE_METRICS = [
  { value: 'qualityScore', label: 'Quality Score', category: 'Quality' },
  { value: 'testCoverage', label: 'Test Coverage', category: 'Quality' },
  { value: 'automationRate', label: 'Automation Rate', category: 'Quality' },
  { value: 'defectDensity', label: 'Defect Density', category: 'Quality' },
  { value: 'openDefects', label: 'Open Defects', category: 'Quality' },
  { value: 'closedDefects', label: 'Closed Defects', category: 'Quality' },
  { value: 'releaseSuccessRate', label: 'Release Success Rate', category: 'Release' },
  { value: 'totalReleases', label: 'Total Releases', category: 'Release' },
  { value: 'qualityGatePassRate', label: 'Quality Gate Pass Rate', category: 'Release' },
  { value: 'totalApplications', label: 'Total Applications', category: 'Portfolio' },
  { value: 'activeApplications', label: 'Active Applications', category: 'Portfolio' },
  { value: 'totalTestCases', label: 'Total Test Cases', category: 'Testing' },
  { value: 'passRate', label: 'Execution Pass Rate', category: 'Testing' },
  { value: 'avgDuration', label: 'Avg Execution Duration', category: 'Testing' },
  { value: 'complianceRate', label: 'Compliance Rate', category: 'Governance' },
  { value: 'adoptionRate', label: 'Adoption Rate', category: 'Adoption' },
  { value: 'activeUsers', label: 'Active Users', category: 'Adoption' },
  { value: 'environmentUptime', label: 'Environment Uptime', category: 'Infrastructure' },
];

/**
 * ReportingAnalytics page component.
 * Provides standard report templates, self-service report builder,
 * export functionality, and simulated Power BI integration.
 *
 * @returns {React.ReactElement} The reporting and analytics page
 */
export default function ReportingAnalytics() {
  const { currentUser, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard data
  const [metrics, setMetrics] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [summary, setSummary] = useState(null);
  const [releases, setReleases] = useState([]);
  const [executionMetrics, setExecutionMetrics] = useState(null);
  const [automationData, setAutomationData] = useState(null);
  const [governanceData, setGovernanceData] = useState(null);
  const [adoptionData, setAdoptionData] = useState(null);
  const [applications, setApplications] = useState([]);

  // Report builder state
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [builderPortfolio, setBuilderPortfolio] = useState('');
  const [builderDateRange, setBuilderDateRange] = useState('all');
  const [builderReportName, setBuilderReportName] = useState('');
  const [generatedReport, setGeneratedReport] = useState(null);
  const [generatedReportModalOpen, setGeneratedReportModalOpen] = useState(false);

  // Template preview state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [templateData, setTemplateData] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('templates');

  // Distinct values
  const [distinctPortfolios, setDistinctPortfolios] = useState([]);

  /**
   * Loads distinct filter values.
   */
  useEffect(() => {
    try {
      const portfolioNames = getDistinctPortfolioNames();
      setDistinctPortfolios(portfolioNames);
    } catch {
      // Ignore errors loading distinct values
    }
  }, []);

  /**
   * Fetches all dashboard data for reporting.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        metricsData,
        portfolioData,
        summaryData,
        releaseResult,
        execMetrics,
        autoData,
        govData,
        adoptData,
        appResult,
      ] = await Promise.all([
        getMetrics(),
        getAllPortfolios(),
        getDashboardSummary(),
        getReleaseDashboardData(),
        getExecutionMetrics(),
        getAutomationMetrics(),
        getGovernanceMetrics(),
        getAdoptionMetrics(),
        getApplications({ includeArchived: false }),
      ]);

      setMetrics(metricsData);
      setPortfolios(portfolioData);
      setSummary(summaryData);
      setReleases(releaseResult.releases || []);
      setExecutionMetrics(execMetrics);
      setAutomationData(autoData);
      setGovernanceData(govData);
      setAdoptionData(adoptData);
      setApplications(appResult.applications || []);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load reporting data.';
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
   * Monthly trend data for charts.
   */
  const monthlyTrends = useMemo(() => {
    if (!metrics || !metrics.monthlyTrends) {
      return [];
    }
    return metrics.monthlyTrends;
  }, [metrics]);

  /**
   * Quality trend chart config.
   */
  const qualityTrendConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'qualityScore', name: 'Quality Score', color: '#0069cc' },
        { dataKey: 'testCoverage', name: 'Test Coverage', color: '#0f9d58' },
        { dataKey: 'automationRate', name: 'Automation Rate', color: '#f59e0b' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * Defect trend chart config.
   */
  const defectTrendConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'defectDensity', name: 'Defect Density', color: '#ef4444' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value} /KLOC`,
    };
  }, []);

  /**
   * Release trend chart config.
   */
  const releaseTrendConfig = useMemo(() => {
    return {
      xAxisKey: 'month',
      series: [
        { dataKey: 'releaseSuccessRate', name: 'Release Success Rate', color: '#0f9d58' },
      ],
      showLegend: true,
      valueFormatter: (value) => `${value}%`,
    };
  }, []);

  /**
   * Portfolio breakdown table columns.
   */
  const portfolioColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Portfolio',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900">{value}</span>
        ),
      },
      {
        key: 'applicationCount',
        label: 'Apps',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'qualityScore',
        label: 'Quality Score',
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
        key: 'testCoverage',
        label: 'Test Coverage',
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-brand-gray-200 rounded-full max-w-[80px]">
              <div
                className="h-2 bg-brand-500 rounded-full"
                style={{ width: `${Math.min(value, 100)}%` }}
              />
            </div>
            <span className="text-xs text-brand-gray-600">{value}%</span>
          </div>
        ),
      },
      {
        key: 'automationRate',
        label: 'Automation',
        sortable: true,
        render: (value) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-brand-gray-200 rounded-full max-w-[80px]">
              <div
                className="h-2 bg-brand-green-500 rounded-full"
                style={{ width: `${Math.min(value, 100)}%` }}
              />
            </div>
            <span className="text-xs text-brand-gray-600">{value}%</span>
          </div>
        ),
      },
      {
        key: 'defectDensity',
        label: 'Defect Density',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value > 3.0) {
            colorClass = 'text-red-600';
          } else if (value > 2.0) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm ${colorClass}`}>{value}</span>
          );
        },
      },
      {
        key: 'riskLevel',
        label: 'Risk',
        sortable: true,
        render: (value) => <StatusBadge status={value} size="sm" />,
      },
      {
        key: 'releaseSuccessRate',
        label: 'Release Success',
        sortable: true,
        render: (value) => {
          let colorClass = 'text-brand-green-600';
          if (value < 70) {
            colorClass = 'text-red-600';
          } else if (value < 85) {
            colorClass = 'text-yellow-600';
          }
          return (
            <span className={`text-sm font-medium ${colorClass}`}>{value}%</span>
          );
        },
      },
    ];
  }, []);

  /**
   * Portfolio breakdowns from metrics.
   */
  const portfolioBreakdowns = useMemo(() => {
    if (!metrics || !metrics.portfolioBreakdowns) {
      return [];
    }
    return metrics.portfolioBreakdowns;
  }, [metrics]);

  /**
   * Export data for portfolio breakdown.
   */
  const portfolioExportData = useMemo(() => {
    return portfolioBreakdowns.map((pb) => ({
      portfolioId: pb.portfolioId,
      name: pb.name,
      applicationCount: pb.applicationCount,
      qualityScore: pb.qualityScore,
      testCoverage: pb.testCoverage,
      automationRate: pb.automationRate,
      defectDensity: pb.defectDensity,
      riskLevel: pb.riskLevel,
      openDefects: pb.openDefects,
      releaseSuccessRate: pb.releaseSuccessRate,
    }));
  }, [portfolioBreakdowns]);

  /**
   * Returns the icon SVG for a report template.
   *
   * @param {string} iconType - The icon type string
   * @returns {React.ReactElement} SVG icon element
   */
  const getTemplateIcon = useCallback((iconType) => {
    const baseClass = 'w-6 h-6';
    switch (iconType) {
      case 'quality':
        return (
          <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'coverage':
        return (
          <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'defect':
        return (
          <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'release':
        return (
          <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        );
      case 'automation':
        return (
          <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'governance':
        return (
          <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'adoption':
        return (
          <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'executive':
        return (
          <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      default:
        return (
          <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  }, []);

  /**
   * Generates template report data based on the selected template.
   *
   * @param {Object} template - The report template object
   */
  const handleGenerateTemplateReport = useCallback(async (template) => {
    if (!template) {
      return;
    }

    setSelectedTemplate(template);
    setTemplateLoading(true);
    setTemplateData(null);
    setTemplatePreviewOpen(true);

    try {
      let reportData = [];

      switch (template.id) {
        case 'quality-summary': {
          reportData = portfolioBreakdowns.map((pb) => ({
            portfolio: pb.name,
            applicationCount: pb.applicationCount,
            qualityScore: pb.qualityScore,
            testCoverage: pb.testCoverage,
            automationRate: pb.automationRate,
            defectDensity: pb.defectDensity,
            riskLevel: pb.riskLevel,
            openDefects: pb.openDefects,
          }));
          break;
        }
        case 'test-coverage': {
          reportData = applications.map((app) => ({
            application: app.name,
            portfolio: app.portfolio,
            testCoverage: app.testCoverage,
            automationRate: app.automationRate,
            qualityScore: app.qualityScore,
            status: app.status,
            riskLevel: app.riskLevel,
          }));
          break;
        }
        case 'defect-analysis': {
          if (metrics && metrics.topDefectApplications) {
            reportData = metrics.topDefectApplications.map((app) => ({
              application: app.name,
              openDefects: app.openDefects,
              defectDensity: app.defectDensity,
              riskLevel: app.riskLevel,
            }));
          }
          break;
        }
        case 'release-readiness': {
          reportData = releases.map((r) => ({
            release: r.name,
            application: r.application,
            version: r.version,
            status: r.status,
            qualityGateStatus: r.qualityGateStatus,
            testCoverage: r.testCoverage,
            qualityScore: r.qualityScore,
            defectsOpen: r.defectsOpen,
            releaseDate: r.releaseDate,
            owner: r.owner,
          }));
          break;
        }
        case 'automation-roi': {
          if (automationData && automationData.applicationHealth) {
            reportData = automationData.applicationHealth.map((app) => ({
              application: app.name,
              automationRate: app.automationRate,
              passRate: app.passRate,
              flakyTestRate: app.flakyTestRate,
              totalAutomatedTests: app.totalAutomatedTests,
              totalManualTests: app.totalManualTests,
              avgExecutionTime: app.avgExecutionTime,
              framework: app.framework,
              healthStatus: app.healthStatus,
            }));
          }
          break;
        }
        case 'governance-compliance': {
          if (governanceData && governanceData.procedures) {
            reportData = governanceData.procedures.map((proc) => ({
              procedure: proc.name,
              category: proc.category,
              complianceRate: proc.complianceRate,
              status: proc.status,
              owner: proc.owner,
              lastAuditDate: proc.lastAuditDate,
            }));
          }
          break;
        }
        case 'adoption-impact': {
          if (adoptionData && adoptionData.applicationAdoption) {
            reportData = adoptionData.applicationAdoption.map((app) => ({
              application: app.name,
              totalUsers: app.totalUsers,
              activeUsers: app.activeUsers,
              adoptionRate: app.adoptionRate,
              satisfactionScore: app.satisfactionScore,
              taskCompletionRate: app.taskCompletionRate,
              trend: app.trend,
            }));
          }
          break;
        }
        case 'executive-summary': {
          reportData = portfolioBreakdowns.map((pb) => ({
            portfolio: pb.name,
            applicationCount: pb.applicationCount,
            qualityScore: pb.qualityScore,
            testCoverage: pb.testCoverage,
            automationRate: pb.automationRate,
            defectDensity: pb.defectDensity,
            riskLevel: pb.riskLevel,
            openDefects: pb.openDefects,
            releaseSuccessRate: pb.releaseSuccessRate,
          }));
          break;
        }
        default:
          reportData = [];
      }

      setTemplateData(reportData);
    } catch {
      setTemplateData([]);
    } finally {
      setTemplateLoading(false);
    }
  }, [portfolioBreakdowns, applications, metrics, releases, automationData, governanceData, adoptionData]);

  /**
   * Closes the template preview modal.
   */
  const handleCloseTemplatePreview = useCallback(() => {
    setTemplatePreviewOpen(false);
    setSelectedTemplate(null);
    setTemplateData(null);
  }, []);

  /**
   * Opens the report builder modal.
   */
  const handleOpenBuilder = useCallback(() => {
    setSelectedMetrics([]);
    setBuilderPortfolio('');
    setBuilderDateRange('all');
    setBuilderReportName('');
    setBuilderModalOpen(true);
  }, []);

  /**
   * Closes the report builder modal.
   */
  const handleCloseBuilder = useCallback(() => {
    setBuilderModalOpen(false);
  }, []);

  /**
   * Toggles a metric selection in the report builder.
   *
   * @param {string} metricValue - The metric value to toggle
   */
  const handleToggleMetric = useCallback((metricValue) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metricValue)) {
        return prev.filter((m) => m !== metricValue);
      }
      return [...prev, metricValue];
    });
  }, []);

  /**
   * Generates a custom report from the report builder.
   */
  const handleGenerateCustomReport = useCallback(() => {
    if (selectedMetrics.length === 0) {
      return;
    }

    const reportName = builderReportName.trim() || 'Custom Report';

    let reportRows = [];

    if (portfolioBreakdowns.length > 0) {
      let filteredBreakdowns = portfolioBreakdowns;
      if (builderPortfolio) {
        filteredBreakdowns = filteredBreakdowns.filter((pb) => pb.name === builderPortfolio);
      }

      reportRows = filteredBreakdowns.map((pb) => {
        const row = { portfolio: pb.name };
        for (const metric of selectedMetrics) {
          if (pb[metric] !== undefined) {
            row[metric] = pb[metric];
          } else if (executiveKPIs && executiveKPIs[metric] !== undefined) {
            row[metric] = executiveKPIs[metric];
          } else if (metric === 'passRate' && executionMetrics) {
            row[metric] = executionMetrics.passRate;
          } else if (metric === 'avgDuration' && executionMetrics) {
            row[metric] = executionMetrics.averageDuration;
          } else if (metric === 'complianceRate' && governanceData) {
            row[metric] = governanceData.averageComplianceRate;
          } else if (metric === 'adoptionRate' && adoptionData && adoptionData.executiveSummary) {
            row[metric] = adoptionData.executiveSummary.overallAdoptionRate;
          } else if (metric === 'activeUsers' && adoptionData && adoptionData.platformUsage) {
            row[metric] = adoptionData.platformUsage.activeUsers;
          } else if (metric === 'environmentUptime' && summary) {
            row[metric] = summary.environmentUptime;
          } else {
            row[metric] = '—';
          }
        }
        return row;
      });
    }

    setGeneratedReport({
      name: reportName,
      data: reportRows,
      metrics: selectedMetrics,
      portfolio: builderPortfolio || 'All Portfolios',
      dateRange: builderDateRange,
      generatedAt: new Date().toISOString(),
    });

    setBuilderModalOpen(false);
    setGeneratedReportModalOpen(true);
  }, [selectedMetrics, builderReportName, builderPortfolio, builderDateRange, portfolioBreakdowns, executiveKPIs, executionMetrics, governanceData, adoptionData, summary]);

  /**
   * Closes the generated report modal.
   */
  const handleCloseGeneratedReport = useCallback(() => {
    setGeneratedReportModalOpen(false);
    setGeneratedReport(null);
  }, []);

  /**
   * Recent reports (simulated).
   */
  const recentReports = useMemo(() => {
    return [
      { id: 'rr-001', name: 'Monthly Quality Summary - May 2024', template: 'Quality Summary', generatedBy: 'Tusnelde Nghifindaka', generatedAt: '2024-06-01T08:00:00Z', format: 'PDF', records: 16 },
      { id: 'rr-002', name: 'Q2 Release Readiness Report', template: 'Release Readiness', generatedBy: 'Kleopas Nghimtina', generatedAt: '2024-06-05T10:00:00Z', format: 'Excel', records: 20 },
      { id: 'rr-003', name: 'Automation ROI Analysis - June 2024', template: 'Automation ROI', generatedBy: 'Absalom Nghishekwa', generatedAt: '2024-06-08T14:00:00Z', format: 'PDF', records: 19 },
      { id: 'rr-004', name: 'Governance Compliance Quarterly', template: 'Governance Compliance', generatedBy: 'Sanet Steenkamp', generatedAt: '2024-06-10T09:00:00Z', format: 'Excel', records: 25 },
      { id: 'rr-005', name: 'Executive Summary - June 2024', template: 'Executive Summary', generatedBy: 'Nangula Iithete', generatedAt: '2024-06-12T07:00:00Z', format: 'PDF', records: 16 },
    ];
  }, []);

  /**
   * Recent reports table columns.
   */
  const recentReportColumns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Report Name',
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-brand-gray-900 line-clamp-1">{value}</span>
        ),
      },
      {
        key: 'template',
        label: 'Template',
        sortable: true,
        render: (value) => (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
            {value}
          </span>
        ),
      },
      {
        key: 'generatedBy',
        label: 'Generated By',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'format',
        label: 'Format',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-600">{value}</span>
        ),
      },
      {
        key: 'records',
        label: 'Records',
        sortable: true,
        render: (value) => (
          <span className="text-sm text-brand-gray-700">{value}</span>
        ),
      },
      {
        key: 'generatedAt',
        label: 'Generated',
        sortable: true,
        render: (value) => (
          <span className="text-xs text-brand-gray-500 whitespace-nowrap">
            {formatDisplayDate(value) || '—'}
          </span>
        ),
      },
    ];
  }, []);

  /**
   * Power BI connection status (simulated).
   */
  const powerBIStatus = useMemo(() => {
    return {
      connected: true,
      lastSync: '2024-06-13T08:00:00Z',
      workspaceId: 'ws-kp-etsip-prod-001',
      datasetCount: 8,
      reportCount: 12,
      dashboardCount: 5,
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading reporting and analytics data..." showLabel />
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

  if (!executiveKPIs) {
    return (
      <div className="p-6">
        <EmptyState
          title="No reporting data available"
          description="Reporting data could not be loaded. Please try again later."
          actionLabel="Retry"
          onAction={fetchData}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-gray-900">
            Reporting & Analytics
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Standard report templates, self-service report builder, and Power BI integration
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenBuilder}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Build Report</span>
          </button>
          {portfolioExportData.length > 0 && (
            <ExportButton
              data={portfolioExportData}
              filename="reporting-analytics"
              title="Reporting & Analytics Export"
              sheetName="Portfolio Data"
              label="Export"
              size="md"
            />
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <MetricCard
          label="Avg Quality Score"
          value={executiveKPIs.avgQualityScore}
          trend={executiveKPIs.avgQualityScore >= 80 ? 'up' : executiveKPIs.avgQualityScore >= 70 ? 'neutral' : 'down'}
          suffix="/100"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Test Coverage"
          value={executiveKPIs.avgTestCoverage}
          trend={executiveKPIs.avgTestCoverage >= 75 ? 'up' : 'neutral'}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <MetricCard
          label="Automation Rate"
          value={executiveKPIs.automationRate}
          trend={executiveKPIs.automationRate >= 60 ? 'up' : 'neutral'}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <MetricCard
          label="Release Success"
          value={executiveKPIs.releaseSuccessRate}
          trend={executiveKPIs.releaseSuccessRate >= 85 ? 'up' : 'neutral'}
          suffix="%"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          }
        />
        <MetricCard
          label="Applications"
          value={executiveKPIs.totalApplications}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <MetricCard
          label="Open Defects"
          value={executiveKPIs.openDefects}
          trend={executiveKPIs.openDefects > 20 ? 'down' : 'up'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Total Releases"
          value={executiveKPIs.totalReleases}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          }
        />
        <MetricCard
          label="Report Templates"
          value={REPORT_TEMPLATES.length}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-brand-gray-200 overflow-x-auto">
        {[
          { key: 'templates', label: 'Report Templates' },
          { key: 'trends', label: 'Trend Analysis' },
          { key: 'portfolio', label: 'Portfolio Breakdown' },
          { key: 'recent', label: 'Recent Reports' },
          { key: 'powerbi', label: 'Power BI' },
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

      {/* Tab Content: Report Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {REPORT_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm hover:shadow-md hover:border-brand-300 transition-all cursor-pointer"
                onClick={() => handleGenerateTemplateReport(template)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleGenerateTemplateReport(template);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Generate ${template.name}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500">
                    {getTemplateIcon(template.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-brand-gray-900 line-clamp-1">
                      {template.name}
                    </h3>
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 mt-1">
                      {template.category}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-brand-gray-500 mt-3 leading-relaxed line-clamp-3">
                  {template.description}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-gray-100">
                  <span className="text-[10px] text-brand-gray-400">
                    {template.metrics.length} metrics
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-500">
                    Generate
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Trend Analysis */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {monthlyTrends.length > 0 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <ChartWrapper
                  chartType="area"
                  data={monthlyTrends}
                  config={qualityTrendConfig}
                  title="Quality, Coverage & Automation Trends"
                  subtitle="12-month trend across all portfolios"
                  height={300}
                  loading={false}
                  emptyMessage="No trend data available"
                />
              </div>
            )}

            {monthlyTrends.length > 0 && (
              <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
                <ChartWrapper
                  chartType="line"
                  data={monthlyTrends}
                  config={defectTrendConfig}
                  title="Defect Density Trend"
                  subtitle="Average defects per KLOC over 12 months"
                  height={300}
                  loading={false}
                  emptyMessage="No defect trend data available"
                />
              </div>
            )}
          </div>

          {monthlyTrends.length > 0 && (
            <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
              <ChartWrapper
                chartType="line"
                data={monthlyTrends}
                config={releaseTrendConfig}
                title="Release Success Rate Trend"
                subtitle="Percentage of releases passing quality gates"
                height={280}
                loading={false}
                emptyMessage="No release trend data available"
              />
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Portfolio Breakdown */}
      {activeTab === 'portfolio' && (
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-brand-gray-900">
                Portfolio Quality Breakdown
              </h2>
              <span className="text-sm text-brand-gray-500">
                ({portfolioBreakdowns.length})
              </span>
            </div>
            <DataTable
              columns={portfolioColumns}
              data={portfolioBreakdowns}
              pageSize={10}
              selectable={false}
              searchFields={['name', 'riskLevel']}
              emptyMessage="No portfolio data available."
              rowKeyField="portfolioId"
              storageKey="reporting-analytics-portfolios"
            />
          </div>
        </div>
      )}

      {/* Tab Content: Recent Reports */}
      {activeTab === 'recent' && (
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-brand-gray-900">
                Recently Generated Reports
              </h2>
              <span className="text-sm text-brand-gray-500">
                ({recentReports.length})
              </span>
            </div>
            <DataTable
              columns={recentReportColumns}
              data={recentReports}
              pageSize={10}
              selectable={false}
              searchFields={['name', 'template', 'generatedBy', 'format']}
              emptyMessage="No recent reports found."
              rowKeyField="id"
              storageKey="reporting-analytics-recent"
            />
          </div>
        </div>
      )}

      {/* Tab Content: Power BI */}
      {activeTab === 'powerbi' && (
        <div className="space-y-6">
          {/* Power BI Connection Status */}
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-yellow-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              <h2 className="text-lg font-semibold text-brand-gray-900">
                Power BI Integration
              </h2>
              <StatusBadge status={powerBIStatus.connected ? 'Connected' : 'Disconnected'} size="sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Connection Status</p>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${powerBIStatus.connected ? 'bg-brand-green-500' : 'bg-red-500'}`} />
                  <p className="text-sm font-medium text-brand-gray-900">
                    {powerBIStatus.connected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Last Sync</p>
                <p className="text-sm font-medium text-brand-gray-900">
                  {formatDisplayDate(powerBIStatus.lastSync) || '—'}
                </p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Workspace ID</p>
                <p className="text-xs font-mono text-brand-gray-600">{powerBIStatus.workspaceId}</p>
              </div>
              <div className="bg-brand-gray-50 rounded-lg p-3">
                <p className="text-xs text-brand-gray-500 mb-1">Assets</p>
                <p className="text-sm font-medium text-brand-gray-900">
                  {powerBIStatus.datasetCount} datasets · {powerBIStatus.reportCount} reports · {powerBIStatus.dashboardCount} dashboards
                </p>
              </div>
            </div>

            {/* Simulated Power BI Embed */}
            <div className="bg-brand-gray-100 rounded-lg border-2 border-dashed border-brand-gray-300 flex flex-col items-center justify-center py-16 px-4">
              <svg className="w-16 h-16 text-brand-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h3 className="text-lg font-semibold text-brand-gray-600 mb-2">
                Power BI Dashboard
              </h3>
              <p className="text-sm text-brand-gray-500 text-center max-w-md mb-4">
                In a production environment, this area would display an embedded Power BI dashboard
                with interactive visualizations connected to the KP-ETSIP data warehouse.
              </p>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300">
                  Simulated Integration
                </span>
                <span className="text-xs text-brand-gray-400">
                  Power BI Embedded would render here
                </span>
              </div>
            </div>

            {/* Power BI Available Reports */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-brand-gray-900 mb-3">Available Power BI Reports</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { name: 'Executive Quality Dashboard', type: 'Dashboard', lastUpdated: '2024-06-13T08:00:00Z' },
                  { name: 'Portfolio Performance Analysis', type: 'Report', lastUpdated: '2024-06-12T14:00:00Z' },
                  { name: 'Test Automation Trends', type: 'Report', lastUpdated: '2024-06-11T10:00:00Z' },
                  { name: 'Release Pipeline Monitor', type: 'Dashboard', lastUpdated: '2024-06-13T06:00:00Z' },
                  { name: 'Defect Root Cause Analysis', type: 'Report', lastUpdated: '2024-06-10T16:00:00Z' },
                  { name: 'Governance Compliance Tracker', type: 'Dashboard', lastUpdated: '2024-06-12T09:00:00Z' },
                ].map((report, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-brand-gray-50 rounded-lg p-3 border border-brand-gray-200"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-yellow-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-gray-900 truncate">{report.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-brand-gray-400">{report.type}</span>
                        <span className="text-[10px] text-brand-gray-400">·</span>
                        <span className="text-[10px] text-brand-gray-400">{formatDisplayDate(report.lastUpdated)}</span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-brand-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>{REPORT_TEMPLATES.length} Report Templates</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
            <span>{portfolioBreakdowns.length} Portfolios</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{AVAILABLE_METRICS.length} Available Metrics</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>{recentReports.length} Recent Reports</span>
          </div>
          {summary && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-green-500" />
              <span>Power BI: {powerBIStatus.connected ? 'Connected' : 'Disconnected'}</span>
            </div>
          )}
          <div className="ml-auto text-[10px] text-brand-gray-400">
            Last updated: {metrics && metrics.lastUpdated ? formatDisplayDate(metrics.lastUpdated) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      <Modal
        isOpen={templatePreviewOpen}
        onClose={handleCloseTemplatePreview}
        title={selectedTemplate ? selectedTemplate.name : ''}
        size="xl"
      >
        {selectedTemplate && (
          <div className="space-y-4">
            {/* Template Info */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
                {selectedTemplate.category}
              </span>
              <span className="text-xs text-brand-gray-500">
                {selectedTemplate.metrics.length} metrics
              </span>
            </div>

            <p className="text-sm text-brand-gray-600 leading-relaxed">
              {selectedTemplate.description}
            </p>

            {/* Report Data */}
            {templateLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                  <p className="text-xs text-brand-gray-400">Generating report...</p>
                </div>
              </div>
            ) : templateData && templateData.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-brand-gray-600">
                    {templateData.length} records generated
                  </p>
                  <ExportButton
                    data={templateData}
                    filename={`${selectedTemplate.id}-report`}
                    title={selectedTemplate.name}
                    sheetName={selectedTemplate.category}
                    label="Export Report"
                    size="sm"
                  />
                </div>

                <div className="overflow-x-auto border border-brand-gray-200 rounded-lg max-h-80">
                  <table className="min-w-full divide-y divide-brand-gray-200">
                    <thead className="bg-brand-gray-50">
                      <tr>
                        {Object.keys(templateData[0]).map((key) => (
                          <th
                            key={key}
                            className="px-3 py-2 text-left text-xs font-semibold text-brand-gray-600 uppercase tracking-wider"
                          >
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-brand-gray-200">
                      {templateData.slice(0, 20).map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-brand-gray-50'}>
                          {Object.values(row).map((value, colIndex) => (
                            <td key={colIndex} className="px-3 py-2 text-sm text-brand-gray-700 whitespace-nowrap">
                              {value !== null && value !== undefined ? String(value) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {templateData.length > 20 && (
                  <p className="text-xs text-brand-gray-400 text-center">
                    Showing 20 of {templateData.length} records. Export to view all.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-brand-gray-500">
                No data available for this report template.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Report Builder Modal */}
      <Modal
        isOpen={builderModalOpen}
        onClose={handleCloseBuilder}
        title="Self-Service Report Builder"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="report-name" className="block text-sm font-medium text-brand-gray-700 mb-1">
              Report Name
            </label>
            <input
              id="report-name"
              type="text"
              value={builderReportName}
              onChange={(e) => setBuilderReportName(e.target.value)}
              placeholder="Enter report name (optional)"
              className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="builder-portfolio" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Portfolio Filter
              </label>
              <select
                id="builder-portfolio"
                value={builderPortfolio}
                onChange={(e) => setBuilderPortfolio(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="">All Portfolios</option>
                {distinctPortfolios.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="builder-date-range" className="block text-sm font-medium text-brand-gray-700 mb-1">
                Date Range
              </label>
              <select
                id="builder-date-range"
                value={builderDateRange}
                onChange={(e) => setBuilderDateRange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="all">All Time</option>
                <option value="last30">Last 30 Days</option>
                <option value="last90">Last 90 Days</option>
                <option value="last180">Last 6 Months</option>
                <option value="last365">Last 12 Months</option>
              </select>
            </div>
          </div>

          {/* Metric Selection */}
          <div>
            <h3 className="text-sm font-semibold text-brand-gray-700 mb-2">
              Select Metrics <span className="text-red-500">*</span>
            </h3>
            <p className="text-xs text-brand-gray-500 mb-3">
              Choose the metrics to include in your custom report. At least one metric is required.
            </p>

            {['Quality', 'Release', 'Portfolio', 'Testing', 'Governance', 'Adoption', 'Infrastructure'].map((category) => {
              const categoryMetrics = AVAILABLE_METRICS.filter((m) => m.category === category);
              if (categoryMetrics.length === 0) {
                return null;
              }
              return (
                <div key={category} className="mb-3">
                  <p className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-1.5">
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categoryMetrics.map((metric) => {
                      const isSelected = selectedMetrics.includes(metric.value);
                      return (
                        <button
                          key={metric.value}
                          onClick={() => handleToggleMetric(metric.value)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                            isSelected
                              ? 'bg-brand-500 text-white'
                              : 'bg-brand-gray-100 text-brand-gray-600 hover:bg-brand-gray-200'
                          }`}
                        >
                          {metric.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {selectedMetrics.length > 0 && (
              <p className="text-xs text-brand-500 mt-2">
                {selectedMetrics.length} metric{selectedMetrics.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-gray-200">
            <button
              onClick={handleCloseBuilder}
              className="px-4 py-2 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateCustomReport}
              disabled={selectedMetrics.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Generate Report</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Generated Report Modal */}
      <Modal
        isOpen={generatedReportModalOpen}
        onClose={handleCloseGeneratedReport}
        title={generatedReport ? generatedReport.name : 'Generated Report'}
        size="xl"
      >
        {generatedReport && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
                Custom Report
              </span>
              <span className="text-xs text-brand-gray-500">
                {generatedReport.portfolio}
              </span>
              <span className="text-xs text-brand-gray-500">
                {generatedReport.metrics.length} metrics
              </span>
              <span className="text-xs text-brand-gray-500">
                {generatedReport.data.length} records
              </span>
            </div>

            {generatedReport.data.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-end">
                  <ExportButton
                    data={generatedReport.data}
                    filename={`custom-report-${Date.now()}`}
                    title={generatedReport.name}
                    sheetName="Custom Report"
                    label="Export Report"
                    size="sm"
                  />
                </div>

                <div className="overflow-x-auto border border-brand-gray-200 rounded-lg max-h-80">
                  <table className="min-w-full divide-y divide-brand-gray-200">
                    <thead className="bg-brand-gray-50">
                      <tr>
                        {Object.keys(generatedReport.data[0]).map((key) => (
                          <th
                            key={key}
                            className="px-3 py-2 text-left text-xs font-semibold text-brand-gray-600 uppercase tracking-wider"
                          >
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-brand-gray-200">
                      {generatedReport.data.map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-brand-gray-50'}>
                          {Object.values(row).map((value, colIndex) => (
                            <td key={colIndex} className="px-3 py-2 text-sm text-brand-gray-700 whitespace-nowrap">
                              {value !== null && value !== undefined ? String(value) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-brand-gray-500">
                No data available for the selected metrics and filters.
              </div>
            )}

            <div className="text-xs text-brand-gray-400 pt-2 border-t border-brand-gray-200">
              Generated: {formatDisplayDate(generatedReport.generatedAt)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
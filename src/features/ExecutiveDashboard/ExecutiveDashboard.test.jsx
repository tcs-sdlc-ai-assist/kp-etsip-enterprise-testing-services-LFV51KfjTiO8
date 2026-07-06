import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock AuthContext
const mockHasPermission = vi.fn(() => true);
const mockCurrentUser = {
  id: 'user-001',
  name: 'Amelia Shikongo',
  email: 'amelia.shikongo@kp-etsip.gov',
  role: 'admin',
  portfolio: 'ICT & Systems Administration',
};

vi.mock('../../shared/contexts/AuthContext.jsx', () => ({
  useAuth: vi.fn(() => ({
    currentUser: mockCurrentUser,
    role: 'admin',
    isAuthenticated: true,
    hasPermission: mockHasPermission,
    loading: false,
  })),
}));

// Mock dashboardService
const mockExecutiveKPIs = {
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
};

const mockMonthlyTrends = [
  { month: 'Jul 2023', qualityScore: 68, testCoverage: 60, automationRate: 42, defectDensity: 3.8, releaseCount: 3, releaseSuccessRate: 67, testCasesExecuted: 320, defectsFound: 28, defectsResolved: 22 },
  { month: 'Aug 2023', qualityScore: 69, testCoverage: 61, automationRate: 43, defectDensity: 3.6, releaseCount: 4, releaseSuccessRate: 75, testCasesExecuted: 345, defectsFound: 25, defectsResolved: 24 },
  { month: 'Sep 2023', qualityScore: 70, testCoverage: 62, automationRate: 45, defectDensity: 3.4, releaseCount: 3, releaseSuccessRate: 67, testCasesExecuted: 360, defectsFound: 30, defectsResolved: 27 },
  { month: 'Oct 2023', qualityScore: 71, testCoverage: 63, automationRate: 47, defectDensity: 3.2, releaseCount: 5, releaseSuccessRate: 80, testCasesExecuted: 380, defectsFound: 22, defectsResolved: 25 },
  { month: 'Nov 2023', qualityScore: 72, testCoverage: 64, automationRate: 48, defectDensity: 3.0, releaseCount: 4, releaseSuccessRate: 75, testCasesExecuted: 400, defectsFound: 20, defectsResolved: 23 },
  { month: 'Dec 2023', qualityScore: 73, testCoverage: 65, automationRate: 50, defectDensity: 2.9, releaseCount: 2, releaseSuccessRate: 100, testCasesExecuted: 350, defectsFound: 15, defectsResolved: 20 },
  { month: 'Jan 2024', qualityScore: 74, testCoverage: 66, automationRate: 51, defectDensity: 2.8, releaseCount: 4, releaseSuccessRate: 75, testCasesExecuted: 420, defectsFound: 24, defectsResolved: 26 },
  { month: 'Feb 2024', qualityScore: 75, testCoverage: 67, automationRate: 53, defectDensity: 2.6, releaseCount: 3, releaseSuccessRate: 67, testCasesExecuted: 440, defectsFound: 21, defectsResolved: 24 },
  { month: 'Mar 2024', qualityScore: 76, testCoverage: 68, automationRate: 54, defectDensity: 2.5, releaseCount: 5, releaseSuccessRate: 80, testCasesExecuted: 460, defectsFound: 19, defectsResolved: 22 },
  { month: 'Apr 2024', qualityScore: 77, testCoverage: 70, automationRate: 56, defectDensity: 2.3, releaseCount: 4, releaseSuccessRate: 75, testCasesExecuted: 480, defectsFound: 18, defectsResolved: 21 },
  { month: 'May 2024', qualityScore: 78, testCoverage: 71, automationRate: 57, defectDensity: 2.1, releaseCount: 6, releaseSuccessRate: 83, testCasesExecuted: 510, defectsFound: 16, defectsResolved: 20 },
  { month: 'Jun 2024', qualityScore: 79, testCoverage: 72, automationRate: 58, defectDensity: 2.0, releaseCount: 5, releaseSuccessRate: 85, testCasesExecuted: 530, defectsFound: 14, defectsResolved: 18 },
];

const mockPortfolioBreakdowns = [
  { portfolioId: 'portfolio-001', name: 'Education Management', applicationCount: 5, qualityScore: 80, testCoverage: 73, automationRate: 55, defectDensity: 2.1, riskLevel: 'medium', openDefects: 4, releaseSuccessRate: 80 },
  { portfolioId: 'portfolio-002', name: 'Finance & Administration', applicationCount: 4, qualityScore: 85, testCoverage: 78, automationRate: 62, defectDensity: 1.5, riskLevel: 'low', openDefects: 1, releaseSuccessRate: 100 },
  { portfolioId: 'portfolio-011', name: 'Governance & Compliance', applicationCount: 3, qualityScore: 89, testCoverage: 85, automationRate: 75, defectDensity: 1.0, riskLevel: 'low', openDefects: 0, releaseSuccessRate: 100 },
];

const mockQualityGatePassRates = [
  { gateName: 'Unit Test Coverage', totalEvaluations: 48, passed: 42, failed: 4, waived: 2, passRate: 87.5, trend: 'up' },
  { gateName: 'Integration Test Pass Rate', totalEvaluations: 48, passed: 40, failed: 6, waived: 2, passRate: 83.3, trend: 'up' },
];

const mockApplicationStatusDistribution = [
  { status: 'Active', count: 43, color: '#0f9d58' },
  { status: 'In Development', count: 4, color: '#0069cc' },
];

const mockRiskDistribution = [
  { riskLevel: 'Low', count: 26, color: '#0f9d58' },
  { riskLevel: 'Medium', count: 18, color: '#f59e0b' },
];

const mockDemandStatusDistribution = [
  { status: 'New', count: 9, color: '#939ba3' },
  { status: 'Closed', count: 7, color: '#0f9d58' },
];

const mockTopDefectApplications = [
  { applicationId: 'app-030', name: 'Performance Appraisal System', openDefects: 5, defectDensity: 4.2, riskLevel: 'high' },
];

const mockMetricsData = {
  executiveKPIs: mockExecutiveKPIs,
  monthlyTrends: mockMonthlyTrends,
  portfolioBreakdowns: mockPortfolioBreakdowns,
  qualityGatePassRates: mockQualityGatePassRates,
  applicationStatusDistribution: mockApplicationStatusDistribution,
  riskDistribution: mockRiskDistribution,
  demandStatusDistribution: mockDemandStatusDistribution,
  topDefectApplications: mockTopDefectApplications,
  lastUpdated: '2024-06-13T10:00:00Z',
};

const mockSummaryData = {
  totalPortfolios: 16,
  totalReleases: 20,
  releasesInProgress: 4,
  qualityGatePassRate: 85,
  governanceComplianceRate: 82,
  environmentUptime: 99.2,
};

vi.mock('../../shared/services/dashboardService.js', () => ({
  getMetrics: vi.fn(() => Promise.resolve(JSON.parse(JSON.stringify(mockMetricsData)))),
  getMonthlyTrends: vi.fn(() => Promise.resolve(JSON.parse(JSON.stringify(mockMonthlyTrends)))),
  getAllPortfolios: vi.fn(() => Promise.resolve(JSON.parse(JSON.stringify(mockPortfolioBreakdowns)))),
  getDashboardSummary: vi.fn(() => Promise.resolve(JSON.parse(JSON.stringify(mockSummaryData)))),
  getDistinctPortfolioNames: vi.fn(() => ['Education Management', 'Finance & Administration', 'Governance & Compliance']),
}));

// Mock recharts to avoid rendering issues in test environment
vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }) => <div data-testid="responsive-container">{children}</div>;
  const MockBarChart = ({ children }) => <div data-testid="bar-chart">{children}</div>;
  const MockLineChart = ({ children }) => <div data-testid="line-chart">{children}</div>;
  const MockPieChart = ({ children }) => <div data-testid="pie-chart">{children}</div>;
  const MockAreaChart = ({ children }) => <div data-testid="area-chart">{children}</div>;
  const MockBar = () => <div />;
  const MockLine = () => <div />;
  const MockPie = ({ children }) => <div>{children}</div>;
  const MockArea = () => <div />;
  const MockXAxis = () => <div />;
  const MockYAxis = () => <div />;
  const MockCartesianGrid = () => <div />;
  const MockTooltip = () => <div />;
  const MockLegend = () => <div />;
  const MockCell = () => <div />;

  return {
    ResponsiveContainer: MockResponsiveContainer,
    BarChart: MockBarChart,
    Bar: MockBar,
    LineChart: MockLineChart,
    Line: MockLine,
    PieChart: MockPieChart,
    Pie: MockPie,
    Cell: MockCell,
    AreaChart: MockAreaChart,
    Area: MockArea,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    CartesianGrid: MockCartesianGrid,
    Tooltip: MockTooltip,
    Legend: MockLegend,
  };
});

import ExecutiveDashboard from './ExecutiveDashboard.jsx';
import { getMetrics, getAllPortfolios, getDashboardSummary, getDistinctPortfolioNames } from '../../shared/services/dashboardService.js';

/**
 * Helper to render ExecutiveDashboard within a MemoryRouter.
 */
function renderDashboard() {
  return render(
    <MemoryRouter>
      <ExecutiveDashboard />
    </MemoryRouter>
  );
}

describe('ExecutiveDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Rendering & Data Loading
  // -------------------------------------------------------------------------
  describe('Rendering & Data Loading', () => {
    it('renders the loading spinner initially', () => {
      renderDashboard();

      expect(screen.getByText(/loading executive dashboard/i)).toBeTruthy();
    });

    it('renders the page title after data loads', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Executive Dashboard')).toBeTruthy();
      });
    });

    it('renders the page subtitle after data loads', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/enterprise-wide quality metrics/i)).toBeTruthy();
      });
    });

    it('calls getMetrics on mount', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(getMetrics).toHaveBeenCalled();
      });
    });

    it('calls getAllPortfolios on mount', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(getAllPortfolios).toHaveBeenCalled();
      });
    });

    it('calls getDashboardSummary on mount', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(getDashboardSummary).toHaveBeenCalled();
      });
    });

    it('calls getDistinctPortfolioNames on mount', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(getDistinctPortfolioNames).toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Metric Cards
  // -------------------------------------------------------------------------
  describe('Metric Cards', () => {
    it('renders the Avg Quality Score metric card', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Avg Quality Score')).toBeTruthy();
      });
    });

    it('renders the Total Applications metric card', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Total Applications')).toBeTruthy();
      });
    });

    it('renders the Automation Rate metric card', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Automation Rate')).toBeTruthy();
      });
    });

    it('renders the Defect Density metric card', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Defect Density')).toBeTruthy();
      });
    });

    it('renders the Release Success Rate metric card', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Release Success Rate')).toBeTruthy();
      });
    });

    it('renders the Test Coverage metric card', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Test Coverage')).toBeTruthy();
      });
    });

    it('renders the Open Defects metric card', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Open Defects')).toBeTruthy();
      });
    });

    it('renders the Total Releases metric card', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Total Releases')).toBeTruthy();
      });
    });

    it('renders the Pending Approvals metric card', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Pending Approvals')).toBeTruthy();
      });
    });

    it('displays the correct quality score value', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('79')).toBeTruthy();
      });
    });

    it('displays the correct total applications value', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('55')).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Chart Components
  // -------------------------------------------------------------------------
  describe('Chart Components', () => {
    it('renders the Quality, Coverage & Automation Trends chart title', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Quality, Coverage & Automation Trends')).toBeTruthy();
      });
    });

    it('renders the Defect Density Trend chart title', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Defect Density Trend')).toBeTruthy();
      });
    });

    it('renders the Release Success Rate Trend chart title', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Release Success Rate Trend')).toBeTruthy();
      });
    });

    it('renders the Quality Gate Pass Rates chart title', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Quality Gate Pass Rates')).toBeTruthy();
      });
    });

    it('renders the Application Status chart title', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Application Status')).toBeTruthy();
      });
    });

    it('renders the Risk Distribution chart title', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Risk Distribution')).toBeTruthy();
      });
    });

    it('renders the Demand Status chart title', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Demand Status')).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Portfolio Breakdown Table
  // -------------------------------------------------------------------------
  describe('Portfolio Breakdown Table', () => {
    it('renders the Portfolio Quality Breakdown heading', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Portfolio Quality Breakdown')).toBeTruthy();
      });
    });

    it('renders portfolio names in the table', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Education Management')).toBeTruthy();
        expect(screen.getByText('Finance & Administration')).toBeTruthy();
        expect(screen.getByText('Governance & Compliance')).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Top Defect Applications
  // -------------------------------------------------------------------------
  describe('Top Defect Applications', () => {
    it('renders the Top Defect Applications heading', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Top Defect Applications')).toBeTruthy();
      });
    });

    it('renders the top defect application name', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Performance Appraisal System')).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Filter Bar
  // -------------------------------------------------------------------------
  describe('Filter Bar', () => {
    it('renders the Portfolio filter dropdown', async () => {
      renderDashboard();

      await waitFor(() => {
        const portfolioFilter = screen.getByLabelText('Filter by Portfolio');
        expect(portfolioFilter).toBeTruthy();
        expect(portfolioFilter.tagName).toBe('SELECT');
      });
    });

    it('renders the Risk Level filter dropdown', async () => {
      renderDashboard();

      await waitFor(() => {
        const riskFilter = screen.getByLabelText('Filter by Risk Level');
        expect(riskFilter).toBeTruthy();
        expect(riskFilter.tagName).toBe('SELECT');
      });
    });

    it('renders the Time Period filter dropdown', async () => {
      renderDashboard();

      await waitFor(() => {
        const timeFilter = screen.getByLabelText('Filter by Time Period');
        expect(timeFilter).toBeTruthy();
        expect(timeFilter.tagName).toBe('SELECT');
      });
    });

    it('calls getMetrics again when portfolio filter changes', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Executive Dashboard')).toBeTruthy();
      });

      const initialCallCount = getMetrics.mock.calls.length;

      const portfolioFilter = screen.getByLabelText('Filter by Portfolio');

      await act(async () => {
        await user.selectOptions(portfolioFilter, 'Education Management');
      });

      await waitFor(() => {
        expect(getMetrics.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('calls getMetrics again when risk level filter changes', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Executive Dashboard')).toBeTruthy();
      });

      const initialCallCount = getMetrics.mock.calls.length;

      const riskFilter = screen.getByLabelText('Filter by Risk Level');

      await act(async () => {
        await user.selectOptions(riskFilter, 'low');
      });

      await waitFor(() => {
        expect(getMetrics.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('shows clear all button when a filter is active and clears on click', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Executive Dashboard')).toBeTruthy();
      });

      const portfolioFilter = screen.getByLabelText('Filter by Portfolio');

      await act(async () => {
        await user.selectOptions(portfolioFilter, 'Education Management');
      });

      await waitFor(() => {
        const clearButton = screen.getByText(/clear/i);
        expect(clearButton).toBeTruthy();
      });

      const clearButton = screen.getByText(/clear/i);

      await act(async () => {
        await user.click(clearButton);
      });

      await waitFor(() => {
        expect(portfolioFilter.value).toBe('');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Export Button
  // -------------------------------------------------------------------------
  describe('Export Button', () => {
    it('renders the Export button when portfolio data is available', async () => {
      renderDashboard();

      await waitFor(() => {
        const exportButtons = screen.getAllByText('Export');
        expect(exportButtons.length).toBeGreaterThan(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Summary Footer
  // -------------------------------------------------------------------------
  describe('Summary Footer', () => {
    it('renders the summary footer with portfolio count', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/16 Portfolios/)).toBeTruthy();
      });
    });

    it('renders the summary footer with releases info', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/20 Releases/)).toBeTruthy();
      });
    });

    it('renders the summary footer with quality gate pass rate', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Quality Gate Pass Rate: 85%/)).toBeTruthy();
      });
    });

    it('renders the summary footer with governance compliance rate', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Governance Compliance: 82%/)).toBeTruthy();
      });
    });

    it('renders the summary footer with environment uptime', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Env Uptime: 99.2%/)).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Error Handling
  // -------------------------------------------------------------------------
  describe('Error Handling', () => {
    it('displays an error message when data loading fails', async () => {
      getMetrics.mockRejectedValueOnce(new Error('Network error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeTruthy();
      });
    });

    it('displays a retry button when data loading fails', async () => {
      getMetrics.mockRejectedValueOnce(new Error('Network error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeTruthy();
      });
    });

    it('retries data loading when retry button is clicked', async () => {
      getMetrics.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeTruthy();
      });

      getMetrics.mockResolvedValueOnce(JSON.parse(JSON.stringify(mockMetricsData)));

      await act(async () => {
        await user.click(screen.getByText('Retry'));
      });

      await waitFor(() => {
        expect(getMetrics.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Empty State
  // -------------------------------------------------------------------------
  describe('Empty State', () => {
    it('displays empty state when executiveKPIs is null', async () => {
      getMetrics.mockResolvedValueOnce({
        ...mockMetricsData,
        executiveKPIs: null,
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/no dashboard data available/i)).toBeTruthy();
      });
    });

    it('displays a retry action in empty state', async () => {
      getMetrics.mockResolvedValueOnce({
        ...mockMetricsData,
        executiveKPIs: null,
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Data Table Interaction
  // -------------------------------------------------------------------------
  describe('Data Table Interaction', () => {
    it('renders the portfolio table with search input', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Portfolio Quality Breakdown')).toBeTruthy();
      });

      const searchInputs = screen.getAllByPlaceholderText('Search...');
      expect(searchInputs.length).toBeGreaterThan(0);
    });

    it('renders column headers in the portfolio table', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Portfolio')).toBeTruthy();
        expect(screen.getByText('Quality Score')).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility
  // -------------------------------------------------------------------------
  describe('Accessibility', () => {
    it('renders chart regions with aria-label attributes', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Executive Dashboard')).toBeTruthy();
      });

      const chartRegions = document.querySelectorAll('[role="img"]');
      expect(chartRegions.length).toBeGreaterThan(0);

      for (const region of chartRegions) {
        expect(region.getAttribute('aria-label')).toBeTruthy();
      }
    });

    it('renders the data table with role="table"', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Portfolio Quality Breakdown')).toBeTruthy();
      });

      const tables = document.querySelectorAll('[role="table"]');
      expect(tables.length).toBeGreaterThan(0);
    });

    it('renders error alerts with role="alert"', async () => {
      getMetrics.mockRejectedValueOnce(new Error('Test error'));

      renderDashboard();

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });
  });
});
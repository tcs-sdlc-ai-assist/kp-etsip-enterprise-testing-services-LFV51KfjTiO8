/**
 * Router Configuration
 * Defines all application routes with lazy-loaded feature components.
 * Routes are wrapped with ProtectedRoute for authentication and permission checks.
 * @module router
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './shared/components/AppLayout.jsx';
import ProtectedRoute from './shared/components/ProtectedRoute.jsx';
import LoadingSpinner from './shared/components/LoadingSpinner.jsx';

// Auth pages (not lazy-loaded for fast initial render)
import LoginPage from './features/Auth/LoginPage.jsx';
import AccessDenied from './features/Auth/AccessDenied.jsx';
import NotFound from './features/Auth/NotFound.jsx';

// Lazy-loaded feature components
const ExecutiveDashboard = lazy(() => import('./features/ExecutiveDashboard/ExecutiveDashboard.jsx'));
const PortfolioManagement = lazy(() => import('./features/PortfolioManagement/PortfolioManagement.jsx'));
const DemandManagement = lazy(() => import('./features/DemandManagement/DemandManagement.jsx'));
const ApplicationRepository = lazy(() => import('./features/ApplicationRepository/ApplicationRepository.jsx'));
const ApplicationDetail = lazy(() => import('./features/ApplicationDetail/ApplicationDetail.jsx'));
const ReleaseReadiness = lazy(() => import('./features/ReleaseReadiness/ReleaseReadiness.jsx'));
const ReleaseDetail = lazy(() => import('./features/ReleaseDetail/ReleaseDetail.jsx'));
const TestRepositoryManagement = lazy(() => import('./features/TestRepository/TestRepositoryManagement.jsx'));
const TestSuiteDetail = lazy(() => import('./features/TestSuiteDetail/TestSuiteDetail.jsx'));
const TestExecutionDashboard = lazy(() => import('./features/TestExecution/TestExecutionDashboard.jsx'));
const TestExecutionDetail = lazy(() => import('./features/TestExecution/TestExecutionDetail.jsx'));
const Scheduler = lazy(() => import('./features/Scheduler/Scheduler.jsx'));
const AutomationIntelligence = lazy(() => import('./features/AutomationIntelligence/AutomationIntelligence.jsx'));
const EnvironmentManagement = lazy(() => import('./features/EnvironmentManagement/EnvironmentManagement.jsx'));
const TestDataManagement = lazy(() => import('./features/TestDataManagement/TestDataManagement.jsx'));
const QualityGates = lazy(() => import('./features/QualityGates/QualityGates.jsx'));
const GovernanceDashboard = lazy(() => import('./features/Governance/GovernanceDashboard.jsx'));
const GovernanceProcedureDetail = lazy(() => import('./features/Governance/GovernanceProcedureDetail.jsx'));
const PostDeploymentMonitoring = lazy(() => import('./features/PostDeploymentMonitoring/PostDeploymentMonitoring.jsx'));
const AdoptionImpact = lazy(() => import('./features/AdoptionImpact/AdoptionImpact.jsx'));
const ReportingAnalytics = lazy(() => import('./features/ReportingAnalytics/ReportingAnalytics.jsx'));
const AIInsights = lazy(() => import('./features/AIInsights/AIInsights.jsx'));
const IntegrationManagement = lazy(() => import('./features/IntegrationManagement/IntegrationManagement.jsx'));
const Administration = lazy(() => import('./features/Administration/Administration.jsx'));
const UserRepository = lazy(() => import('./features/UserRepository/UserRepository.jsx'));
const MyProfile = lazy(() => import('./features/MyProfile/MyProfile.jsx'));

/**
 * Suspense wrapper for lazy-loaded route components.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The lazy-loaded component
 * @returns {React.ReactElement} Suspense-wrapped component
 */
function SuspenseWrapper({ children }) {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" label="Loading page..." showLabel />}>
      {children}
    </Suspense>
  );
}

/**
 * Application router configuration.
 * Defines all routes with authentication guards and lazy-loaded components.
 * @type {import('react-router-dom').Router}
 */
const router = createBrowserRouter([
  // Public route: Login
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Protected routes wrapped in AppLayout
  {
    element: <AppLayout />,
    children: [
      // Dashboard (landing page)
      {
        path: '/',
        element: (
          <ProtectedRoute requiredFeature="dashboard">
            <SuspenseWrapper>
              <ExecutiveDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Portfolio Management
      {
        path: '/portfolios',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <PortfolioManagement />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Demand Management
      {
        path: '/demand',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <DemandManagement />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Application Repository
      {
        path: '/applications',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <ApplicationRepository />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Application Detail
      {
        path: '/applications/:id',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <ApplicationDetail />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Release Readiness
      {
        path: '/releases',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <ReleaseReadiness />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Release Detail
      {
        path: '/releases/:id',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <ReleaseDetail />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Test Repository Management
      {
        path: '/test-repository',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <TestRepositoryManagement />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Test Suite Detail
      {
        path: '/test-suites/:suiteId',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <TestSuiteDetail />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Test Execution Dashboard
      {
        path: '/executions',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <TestExecutionDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Test Execution Detail
      {
        path: '/executions/:id',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <TestExecutionDetail />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Scheduler
      {
        path: '/scheduler',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <Scheduler />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Automation Intelligence
      {
        path: '/automation',
        element: (
          <ProtectedRoute requiredFeature="analytics">
            <SuspenseWrapper>
              <AutomationIntelligence />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Environment Management
      {
        path: '/environments',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <EnvironmentManagement />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Test Data Management
      {
        path: '/test-data',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <TestDataManagement />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Quality Gates
      {
        path: '/quality-gates',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <QualityGates />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Governance Dashboard
      {
        path: '/governance',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <GovernanceDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Governance Procedure Detail
      {
        path: '/governance/:id',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <GovernanceProcedureDetail />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Post-Deployment Monitoring
      {
        path: '/post-deployment',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <PostDeploymentMonitoring />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Adoption & Impact
      {
        path: '/adoption',
        element: (
          <ProtectedRoute requiredFeature="analytics">
            <SuspenseWrapper>
              <AdoptionImpact />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Reporting & Analytics
      {
        path: '/reporting',
        element: (
          <ProtectedRoute requiredFeature="reports">
            <SuspenseWrapper>
              <ReportingAnalytics />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // AI Insights
      {
        path: '/ai-insights',
        element: (
          <ProtectedRoute requiredFeature="analytics">
            <SuspenseWrapper>
              <AIInsights />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Integration Management
      {
        path: '/integrations',
        element: (
          <ProtectedRoute requiredFeature="settings">
            <SuspenseWrapper>
              <IntegrationManagement />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Administration
      {
        path: '/admin',
        element: (
          <ProtectedRoute requiredFeature="settings">
            <SuspenseWrapper>
              <Administration />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // User Repository
      {
        path: '/users',
        element: (
          <ProtectedRoute requiredFeature="user_management">
            <SuspenseWrapper>
              <UserRepository />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // My Profile
      {
        path: '/profile',
        element: (
          <ProtectedRoute requiredFeature="dashboard">
            <SuspenseWrapper>
              <MyProfile />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Existing sidebar navigation routes mapped to feature screens
      {
        path: '/programmes',
        element: (
          <ProtectedRoute requiredFeature="programmes">
            <SuspenseWrapper>
              <PortfolioManagement />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/projects',
        element: (
          <ProtectedRoute requiredFeature="projects">
            <SuspenseWrapper>
              <ApplicationRepository />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/indicators',
        element: (
          <ProtectedRoute requiredFeature="indicators">
            <SuspenseWrapper>
              <ExecutiveDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/budget',
        element: (
          <ProtectedRoute requiredFeature="budget">
            <SuspenseWrapper>
              <ReportingAnalytics />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/data-entry',
        element: (
          <ProtectedRoute requiredFeature="data_entry">
            <SuspenseWrapper>
              <TestRepositoryManagement />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/reports',
        element: (
          <ProtectedRoute requiredFeature="reports">
            <SuspenseWrapper>
              <ReportingAnalytics />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/analytics',
        element: (
          <ProtectedRoute requiredFeature="analytics">
            <SuspenseWrapper>
              <AutomationIntelligence />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/approvals',
        element: (
          <ProtectedRoute requiredFeature="approvals">
            <SuspenseWrapper>
              <DemandManagement />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/regional-data',
        element: (
          <ProtectedRoute requiredFeature="regional_data">
            <SuspenseWrapper>
              <PostDeploymentMonitoring />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/school-data',
        element: (
          <ProtectedRoute requiredFeature="school_data">
            <SuspenseWrapper>
              <GovernanceDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/procurement',
        element: (
          <ProtectedRoute requiredFeature="procurement">
            <SuspenseWrapper>
              <ApplicationRepository />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/hr',
        element: (
          <ProtectedRoute requiredFeature="hr">
            <SuspenseWrapper>
              <UserRepository />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/ict-infrastructure',
        element: (
          <ProtectedRoute requiredFeature="ict_infrastructure">
            <SuspenseWrapper>
              <EnvironmentManagement />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/curriculum',
        element: (
          <ProtectedRoute requiredFeature="curriculum">
            <SuspenseWrapper>
              <TestRepositoryManagement />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/notifications',
        element: (
          <ProtectedRoute requiredFeature="notifications">
            <SuspenseWrapper>
              <AdoptionImpact />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/user-management',
        element: (
          <ProtectedRoute requiredFeature="user_management">
            <SuspenseWrapper>
              <UserRepository />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/audit-log',
        element: (
          <ProtectedRoute requiredFeature="audit_log">
            <SuspenseWrapper>
              <GovernanceDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: '/settings',
        element: (
          <ProtectedRoute requiredFeature="settings">
            <SuspenseWrapper>
              <Administration />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Access Denied
      {
        path: '/access-denied',
        element: <AccessDenied />,
      },
    ],
  },

  // 404 Not Found
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
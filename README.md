# KP-ETSIP

**Education and Training Sector Improvement Programme**

KP-ETSIP is a comprehensive quality management and programme monitoring platform for the Namibian education sector. It provides enterprise-level dashboards, test management, governance compliance tracking, and AI-powered insights across 25+ functional screens with role-based access control for 22 distinct persona roles.

All data is simulated using mock datasets persisted in `localStorage`. No backend server or database is required — the application runs entirely in the browser as a static single-page application.

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3.1 | UI component library |
| **Vite** | 5.4.11 | Build tool and dev server |
| **Tailwind CSS** | 3.4.16 | Utility-first CSS framework |
| **React Router** | 6.28.0 | Client-side routing |
| **Recharts** | 2.13.3 | Data visualization (charts) |
| **SheetJS (xlsx)** | 0.18.5 | Excel export |
| **jsPDF** | 2.5.2 | PDF export |
| **jspdf-autotable** | 3.8.4 | PDF table formatting |
| **file-saver** | 2.0.5 | Browser file downloads |
| **prop-types** | 15.8.1 | Component prop validation |
| **Vitest** | 2.1.8 | Unit and integration testing |
| **Testing Library** | 16.1.0 | React component testing |

---

## Folder Structure

```
kp-etsip/
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── CHANGELOG.md                  # Version history
├── DEPLOYMENT.md                 # Deployment guide
├── README.md                     # This file
├── index.html                    # Entry HTML file
├── package.json                  # Dependencies and scripts
├── postcss.config.js             # PostCSS configuration (Tailwind)
├── tailwind.config.js            # Tailwind CSS configuration
├── vercel.json                   # Vercel SPA rewrite configuration
├── vite.config.js                # Vite build configuration
├── vitest.config.js              # Vitest test configuration
├── dist/                         # Build output (generated, gitignored)
├── src/
│   ├── main.jsx                  # Application entry point
│   ├── App.jsx                   # Root component with providers
│   ├── router.jsx                # React Router configuration (40+ routes)
│   ├── index.css                 # Tailwind CSS imports
│   ├── setupTests.js             # Test setup (@testing-library/jest-dom)
│   ├── features/                 # Feature screen components (25+)
│   │   ├── AIInsights/           # FR-023: AI Insights
│   │   ├── Administration/       # FR-025: Platform Administration
│   │   ├── AdoptionImpact/       # FR-021: Adoption & Impact Dashboard
│   │   ├── ApplicationDetail/    # FR-006: Application Detail
│   │   ├── ApplicationRepository/# FR-005: Application Repository
│   │   ├── Auth/                 # FR-001: Login, Access Denied, 404
│   │   ├── AutomationIntelligence/# FR-014: Automation Intelligence
│   │   ├── DemandManagement/     # FR-004: Demand Management
│   │   ├── EnvironmentManagement/# FR-015: Environment Management
│   │   ├── ExecutiveDashboard/   # FR-002: Executive Dashboard
│   │   ├── Governance/           # FR-018/019: Governance Dashboard & Detail
│   │   ├── IntegrationManagement/# FR-024: Integration Management
│   │   ├── MyProfile/            # FR-027/028: Profile & Notification Prefs
│   │   ├── PortfolioManagement/  # FR-003: Portfolio Management
│   │   ├── PostDeploymentMonitoring/# FR-020: Post-Deployment Monitoring
│   │   ├── QualityGates/         # FR-017: Quality Gates
│   │   ├── ReleaseDetail/        # FR-008: Release Detail
│   │   ├── ReleaseReadiness/     # FR-007: Release Readiness Dashboard
│   │   ├── ReportingAnalytics/   # FR-022: Reporting & Analytics
│   │   ├── Scheduler/            # FR-013: Test Execution Scheduler
│   │   ├── TestDataManagement/   # FR-016: Test Data Management
│   │   ├── TestExecution/        # FR-011/012: Execution Dashboard & Detail
│   │   ├── TestRepository/       # FR-009: Test Repository Management
│   │   ├── TestSuiteDetail/      # FR-010: Test Suite Detail
│   │   └── UserRepository/       # FR-026: User Repository
│   └── shared/
│       ├── components/           # Reusable UI components (15+)
│       │   ├── AppLayout.jsx     # Main application shell
│       │   ├── AuditLogPanel.jsx # Reusable audit log panel
│       │   ├── ChartWrapper.jsx  # Recharts wrapper (bar, line, pie, area)
│       │   ├── DataTable.jsx     # Full-featured data table
│       │   ├── EmptyState.jsx    # Empty state placeholder
│       │   ├── ExportButton.jsx  # Export dropdown (CSV, Excel, PDF, PPT)
│       │   ├── FilterBar.jsx     # Horizontal filter bar
│       │   ├── Header.jsx        # Top navigation bar
│       │   ├── LoadingSpinner.jsx# Accessible loading spinner
│       │   ├── MetricCard.jsx    # KPI card with sparkline
│       │   ├── Modal.jsx         # Accessible modal dialog
│       │   ├── NotificationPanel.jsx # Notification dropdown
│       │   ├── ProtectedRoute.jsx# Route guard (auth + permissions)
│       │   ├── Sidebar.jsx       # Persistent left sidebar
│       │   └── StatusBadge.jsx   # Colored status pill badge
│       ├── constants.js          # Application constants and RBAC
│       ├── contexts/             # React context providers
│       │   ├── AuthContext.jsx   # Authentication state
│       │   ├── DataContext.jsx   # Data initialization
│       │   └── NotificationContext.jsx # Notification state
│       ├── data/                 # Mock data seed files (19 files)
│       │   ├── index.js
│       │   ├── mockAdoption.js
│       │   ├── mockApplications.js
│       │   ├── mockAuditLogs.js
│       │   ├── mockAutomation.js
│       │   ├── mockDashboardMetrics.js
│       │   ├── mockDemand.js
│       │   ├── mockEnvironments.js
│       │   ├── mockExecutions.js
│       │   ├── mockGovernance.js
│       │   ├── mockIntegrations.js
│       │   ├── mockNotifications.js
│       │   ├── mockPortfolios.js
│       │   ├── mockPostDeployment.js
│       │   ├── mockQualityGates.js
│       │   ├── mockReleases.js
│       │   ├── mockSchedules.js
│       │   ├── mockTestAssets.js
│       │   ├── mockTestData.js
│       │   └── mockUsers.js
│       ├── services/             # Service layer modules
│       │   ├── auditLogService.js
│       │   ├── authManager.js
│       │   ├── dashboardService.js
│       │   ├── executionService.js
│       │   ├── exportService.js
│       │   ├── notificationManager.js
│       │   ├── platformAdminService.js
│       │   ├── repositoryService.js
│       │   ├── roles.js
│       │   ├── schedulerService.js
│       │   ├── storage.js
│       │   └── userManager.js
│       └── utils/                # Shared utility functions
│           └── helpers.js
```

---

## Getting Started

### Prerequisites

- **Node.js** 18.x or later
- **npm** 9.x or later

### Installation

```bash
git clone <repository-url>
cd kp-etsip
npm install
```

### Environment Variables

Copy the example environment file and adjust values as needed:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `VITE_APP_TITLE` | Application title in browser tab and header | `KP-ETSIP` |
| `VITE_DEFAULT_ROLE` | Default user role for development | `viewer` |
| `VITE_MOCK_DELAY_MS` | Simulated network delay in ms (`0` to disable) | `300` |

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

Output is generated in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Run Tests

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

---

## Screens & Features

The platform includes 25+ functional screens, each lazy-loaded via `React.lazy` and `Suspense`:

| # | Screen | Route | Description |
|---|---|---|---|
| FR-001 | Mock Login Page | `/login` | Email dropdown with 34 users, mock password (`mockpass`), role preview |
| FR-002 | Executive Dashboard | `/` | Enterprise KPIs, 12-month trends, portfolio breakdown, quality gates |
| FR-003 | Portfolio Management | `/portfolios` | Portfolio list with quality metrics, drill-down, trend charts |
| FR-004 | Demand Management | `/demand` | Demand items with status workflow (New → Closed), comments |
| FR-005 | Application Repository | `/applications` | 55 applications, search, filter, add/edit/archive modals |
| FR-006 | Application Detail | `/applications/:id` | Full quality profile, test coverage, defect history, releases |
| FR-007 | Release Readiness | `/releases` | Release-level quality status, quality gate pass rates |
| FR-008 | Release Detail | `/releases/:id` | Version, quality gate criteria, defect breakdown, timeline |
| FR-009 | Test Repository | `/test-repository` | 85 test cases, create/edit/approve/clone/retire, version history |
| FR-010 | Test Suite Detail | `/test-suites/:suiteId` | Suite details, execution history, pass/fail trends |
| FR-011 | Test Execution Dashboard | `/executions` | Execution visibility, pass rate, type breakdown, trends |
| FR-012 | Test Execution Detail | `/executions/:id` | Logs, evidence, AI analysis with root cause and recommendations |
| FR-013 | Scheduler | `/scheduler` | 28 schedules, create/edit/delete/pause/resume/trigger, calendar |
| FR-014 | Automation Intelligence | `/automation` | Automation health, ROI, framework distribution, flaky tests |
| FR-015 | Environment Management | `/environments` | 20 environments, health checks, booking calendar, uptime |
| FR-016 | Test Data Management | `/test-data` | 35 data sets, add/edit/refresh/retire, size tracking |
| FR-017 | Quality Gates | `/quality-gates` | 20 gate evaluations, criteria details, pass rate charts |
| FR-018 | Governance Dashboard | `/governance` | Compliance rates, audit findings, high-risk procedures |
| FR-019 | Governance Procedure Detail | `/governance/:id` | Audit history, compliance trend, corrective actions |
| FR-020 | Post-Deployment Monitoring | `/post-deployment` | Deployment outcomes, incidents, quality-production correlation |
| FR-021 | Adoption & Impact | `/adoption` | Platform usage, value realization, user engagement segments |
| FR-022 | Reporting & Analytics | `/reporting` | 8 report templates, self-service builder, Power BI placeholder |
| FR-023 | AI Insights | `/ai-insights` | Predictive scores, defect predictions, risk assessments (simulated) |
| FR-024 | Integration Management | `/integrations` | 14 integrations, health monitoring, sync history (simulated) |
| FR-025 | Administration | `/admin` | General settings, feature toggles, retention policies, system health |
| FR-026 | User Repository | `/users` | 34 users, add/edit/deactivate, access review, audit log |
| FR-027 | My Profile | `/profile` | Profile details, preferences, notification channels, widgets |
| FR-028 | Notification Preferences | Embedded in Profile | Per-category channel toggles (Email, Teams, In-App) |
| — | Access Denied | `/access-denied` | Shown when user lacks permissions for a route |
| — | 404 Not Found | `*` | Shown for unmatched routes |

---

## Role-Based Access Control (RBAC)

The platform implements 22 distinct persona roles, each with a defined set of feature permissions:

| # | Role | Key | Approval Authority |
|---|---|---|---|
| 1 | Administrator | `admin` | Yes |
| 2 | Viewer | `viewer` | No |
| 3 | Editor | `editor` | No |
| 4 | Minister | `minister` | Yes |
| 5 | Deputy Minister | `deputy_minister` | Yes |
| 6 | Permanent Secretary | `permanent_secretary` | Yes |
| 7 | Director General | `director_general` | Yes |
| 8 | Director | `director` | Yes |
| 9 | Deputy Director | `deputy_director` | No |
| 10 | Chief Education Officer | `chief_education_officer` | Yes |
| 11 | Regional Director | `regional_director` | No |
| 12 | School Principal | `school_principal` | No |
| 13 | Inspector | `inspector` | No |
| 14 | Curriculum Specialist | `curriculum_specialist` | No |
| 15 | Finance Officer | `finance_officer` | Yes |
| 16 | Procurement Officer | `procurement_officer` | No |
| 17 | HR Officer | `hr_officer` | No |
| 18 | ICT Officer | `ict_officer` | No |
| 19 | M&E Officer | `m_and_e_officer` | No |
| 20 | Development Partner | `development_partner` | No |
| 21 | Programme Coordinator | `programme_coordinator` | Yes |
| 22 | Data Analyst | `data_analyst` | No |

The permissions matrix is defined in `src/shared/constants.js` and enforced at:

- **Route level** via the `ProtectedRoute` component
- **Sidebar navigation** dynamically filtered by role
- **Feature actions** (export, approve, data entry) checked via `AuthContext.hasPermission()`

Each role has a default landing page (e.g., Regional Director → `/regional-data`, Finance Officer → `/budget`).

---

## Mock Data Architecture

All data is provided by 19 mock data seed files in `src/shared/data/`:

| File | Records | Description |
|---|---|---|
| `mockUsers.js` | 34 | Users across all 22 roles with Namibian names |
| `mockApplications.js` | 55 | Applications across 16 portfolios |
| `mockTestAssets.js` | 85 | Test cases across 53 test suites |
| `mockExecutions.js` | 105 | Test executions with logs, evidence, AI analysis |
| `mockDemand.js` | 45 | Demand items with full workflow and comments |
| `mockReleases.js` | 20 | Releases with timelines and quality gate statuses |
| `mockQualityGates.js` | 20 | Quality gate evaluations with criteria |
| `mockEnvironments.js` | 20 | Environments with configurations and bookings |
| `mockSchedules.js` | 28 | Test execution schedules |
| `mockGovernance.js` | 25 | Governance procedures with audit histories |
| `mockDashboardMetrics.js` | — | Executive KPIs, 12-month trends, portfolio breakdowns |
| `mockPortfolios.js` | 16 | Portfolios with trend data and application mappings |
| `mockAutomation.js` | — | Automation health for 19 applications with ROI |
| `mockAdoption.js` | — | Platform usage, value realization, engagement data |
| `mockPostDeployment.js` | 25 | Deployment outcomes with monitoring metrics |
| `mockIntegrations.js` | 14 | External integrations with health and sync history |
| `mockAuditLogs.js` | 65 | Audit log entries across various action types |
| `mockNotifications.js` | 55 | Notifications across 4 categories and 3 channels |
| `mockTestData.js` | 35 | Test data sets (synthetic, masked, subset types) |

All names, emails, and IP addresses in the mock data are **fictitious**.

---

## localStorage Persistence

All mock data is persisted to `localStorage` via the storage abstraction layer (`src/shared/services/storage.js`):

- **Automatic seeding** on first load with sentinel key detection to prevent re-seeding
- **Quota exceeded protection** with automatic cleanup of non-essential keys
- **Corrupted data auto-reset** to defaults when JSON parsing fails
- **Data reset capability** via `DataContext.resetData()` to restore all repositories to original mock data
- **PII masking** utility for safe debug output and audit log exports

Each service module (e.g., `repositoryService.js`, `executionService.js`) loads data from `localStorage` on first access and seeds from mock data if the key is empty.

---

## Export Features

The platform supports exporting data in multiple formats via `src/shared/services/exportService.js`:

| Format | Library | Extension | Description |
|---|---|---|---|
| **CSV** | file-saver | `.csv` | UTF-8 encoded with proper escaping |
| **Excel** | SheetJS (xlsx) | `.xlsx` | Auto-sized columns, formatted worksheets |
| **PDF** | jsPDF + autotable | `.pdf` | Branded header, pagination footer, landscape/portrait |
| **PowerPoint** | — | `.txt` | Simulated text-based summary file |

All exports include:

- Timestamped filenames
- Record counts
- Audit trail logging
- Role-based export permission enforcement via `FEATURES.EXPORT` check

A simulated **Power BI** link is available in the export dropdown and on the Reporting & Analytics page.

---

## Simulated AI Features

All AI features are clearly labeled as **"Simulated AI"** with disclaimer banners:

- **Predictive quality scores** for 10 applications with confidence levels
- **8 defect predictions** with severity, root cause, and suggested actions
- **8 portfolio risk assessments** with risk factors and mitigations
- **12 AI-generated test case suggestions** with rationale and effort estimates
- **6 test optimization recommendations** with impact and effort
- **AI analysis on failed test executions** with root cause, recommendation, and confidence score

No real AI/ML models are executed. All results are static mock data.

---

## Simulated Integrations

14 external integration configurations are displayed with simulated health metrics:

Azure DevOps, qTest Manager, Jira Align, Jenkins CI/CD, SonarQube, GitHub Enterprise, Microsoft Teams, Grafana, Confluence, OWASP ZAP, Selenium Grid, Nexus Repository, Postman, ServiceNow

All integrations are simulated UI hints with clear "Simulated" labels and `localStorage` persistence.

---

## Accessibility

The platform follows accessibility best practices:

- **ARIA roles** on all interactive components (`table`, `dialog`, `alert`, `status`, `button`, `navigation`, `search`)
- **Keyboard navigation** for DataTable rows, Modal focus trap, Sidebar navigation, and dropdown menus
- **Screen-reader-only text** on LoadingSpinner and StatusBadge components
- **Focus-visible outlines** with brand color (`outline-brand-500`)
- **Reduced motion support** via `prefers-reduced-motion` media query
- **Semantic HTML** with proper heading hierarchy
- **Color contrast compliance** on StatusBadge with background/text/ring color combinations

---

## Testing

The project uses **Vitest** with **jsdom** environment and **@testing-library/react**:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

Test coverage includes:

- **Unit tests** for core services: `dashboardService`, `executionService`, `repositoryService`, `userManager`
- **Unit tests** for shared utilities: `helpers`
- **Integration tests** for contexts: `AuthContext`
- **Component tests**: `LoginPage`, `ExecutiveDashboard`

---

## Deployment

The application is configured for deployment to **Vercel** as a static SPA.

### Quick Deploy

1. Push to a GitHub repository
2. Import the repository in [Vercel](https://vercel.com)
3. Vercel auto-detects Vite and configures build settings
4. Set environment variables in Vercel dashboard
5. Deploy

### SPA Routing

The `vercel.json` file configures client-side routing rewrites:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Manual Deploy via CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Useful Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |

---

## Login Credentials

All 34 mock users share the same password:

```
Password: mockpass
```

Select any user from the login dropdown to sign in. Each user has a different role with different feature access. The role preview panel on the login page shows the selected user's role, portfolio, and feature access count.

---

## Browser Support

The application is built with modern JavaScript and CSS features:

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

---

## License

This project is private and proprietary.
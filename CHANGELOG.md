# Changelog

All notable changes to the KP-ETSIP (Education and Training Sector Improvement Programme) platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-06-13

### Added

#### Screens & Features (25+ Functional Requirements)

- **FR-001 – Mock Login Page**: Email dropdown with 34 pre-provisioned users across all 22 persona roles, mock password field (`mockpass`), role preview panel, and redirect to role-specific landing page on success.
- **FR-002 – Executive Dashboard**: Enterprise-level quality KPIs (quality score, test coverage, automation rate, defect density, release success rate), 12-month trend charts, portfolio breakdown table, quality gate pass rates, status/risk/demand distribution charts, top defect applications panel, and filter bar (portfolio, risk level, time period).
- **FR-003 – Portfolio Management**: Portfolio list with quality metrics, drill-down to individual portfolio detail view with trend charts, application breakdown table, filter by status/owner/risk level, and export functionality.
- **FR-004 – Demand Management**: Demand items DataTable with full status workflow (New → InReview → Approved → Assigned → InProgress → Closed), add/prioritize/approve/assign/track/close actions via modals, comment system, filter by status/priority/portfolio, and status/priority distribution charts.
- **FR-005 – Application Repository**: Enterprise application inventory DataTable with 55 applications, search, filter (portfolio/status/risk), add/edit/archive actions via modals, drill-down links to Application Detail, status/risk distribution charts, and export button.
- **FR-006 – Application Detail**: Full quality profile for a selected application including quality score, test coverage, automation rate, defect history chart, release history table, environment status table, linked test assets table, recent executions table, and automation health summary.
- **FR-007 – Release Readiness Dashboard**: Release-level quality status with MetricCards, release list DataTable with status badges, quality gate status/distribution charts, filter by application/status/quality gate, and drill-down to Release Detail.
- **FR-008 – Release Detail**: All details for a selected release including version, status, quality gate criteria table, test coverage metrics, defect breakdown chart, environment readiness table, post-deployment summary, timeline view, and owner information.
- **FR-009 – Test Repository Management**: Enterprise test assets DataTable (85 test cases) with search, filter (type/application/status/suite/priority), create/edit/approve/clone/retire actions via modals, version history panel, status/type/priority distribution charts, and import/export buttons.
- **FR-010 – Test Suite Detail**: Suite details (name, description, test cases list, owner, status), execution history table with pass/fail rates, trend charts, linked test assets table, and automation rate progress bar.
- **FR-011 – Test Execution Dashboard**: Execution visibility with MetricCards (total executions, pass rate, fail rate, in-progress count), execution breakdown by type (manual/automated) pie chart, execution trend line chart, recent executions DataTable with drill-down, and filter by application/type/status/environment.
- **FR-012 – Test Execution Detail**: Execution details (test name, status, executor, duration, environment), execution logs panel with timestamped log entries and level filtering, evidence section with simulated file attachments, and AI analysis section with simulated insights/recommendations.
- **FR-013 – Scheduler**: Test execution schedules DataTable with create/edit/delete/pause/resume/trigger actions via modals, next run/last run/frequency/status display, upcoming runs calendar view, status/frequency distribution charts, and filter by application/frequency/status/environment.
- **FR-014 – Automation Intelligence**: Enterprise automation health with MetricCards (automation rate, pass rate, flaky rate, avg execution time, ROI), automation rate by application bar chart, framework distribution pie chart, coverage by priority breakdown, ROI trend charts, top flaky tests table, AI recommendations panel, and application health table.
- **FR-015 – Environment Management**: Environment inventory DataTable (20 environments) with status badges (Available/InUse/Maintenance/Down), health check indicators, booking calendar view, add/edit environment modals, uptime bar chart, status/type distribution charts, and filter by type/status/application.
- **FR-016 – Test Data Management**: Test data assets DataTable (35 data sets) with search, filter (type/status/application/environment), add/edit/refresh/retire actions via modals, data set details with size/last refreshed/tags, status/type/application distribution charts, and export functionality.
- **FR-017 – Quality Gates**: Quality gate definitions DataTable (20 gates) with criteria details (metric, threshold, actual, pass/fail), configure/edit gate modals, overall status indicators, pass rate by gate type bar chart, application distribution chart, and filter by release/application/status.
- **FR-018 – Governance Dashboard**: Adherence metrics with MetricCards (overall compliance rate, compliant/non-compliant/partial counts), compliance by category bar chart, compliance trend line chart, procedures DataTable with drill-down, high risk procedures panel, and filter by category/status.
- **FR-019 – Governance Procedure Detail**: Procedure details (name, category, description, compliance rate, owner, applicable portfolios), audit history table with dates/findings/actions, compliance score trend chart, audit result distribution chart, corrective actions summary, and status timeline.
- **FR-020 – Post-Deployment Monitoring**: Production outcomes linked to releases with MetricCards (deployments, incident rate, rollback rate, response time, uptime), outcomes DataTable with drill-down, incident trend chart, quality-production correlation chart, response time trend chart, recent incidents panel, and filter by status/environment/application.
- **FR-021 – Adoption & Impact Dashboard**: Platform usage metrics with MetricCards (adoption rate, active users, daily logins, session duration, feature utilization, satisfaction), value realization metrics (hours saved, cost savings, defects prevented, automation ROI), login frequency trend chart, feature adoption bar chart, portfolio adoption table, user engagement segmentation, and role adoption table.
- **FR-022 – Reporting & Analytics**: 8 standard report templates (Quality Summary, Test Coverage, Defect Analysis, Release Readiness, Automation ROI, Governance Compliance, Adoption & Impact, Executive Summary), self-service report builder with metric/filter selection, export to CSV/Excel/PDF/PowerPoint, simulated Power BI section with placeholder and connection status, trend analysis charts, and recent reports table.
- **FR-023 – AI Insights**: Simulated AI-powered insights including predictive quality scores for 10 applications, test optimization recommendations (6 recommendations), defect prediction panel (8 predictions), portfolio risk assessment (8 assessments), and generative test case suggestions (12 suggestions). All results are static mock data with clear "Simulated AI" labels.
- **FR-024 – Integration Management**: Integration inventory DataTable (14 integrations: Azure DevOps, qTest, Jira Align, Jenkins, SonarQube, GitHub, Teams, Grafana, Confluence, OWASP ZAP, Selenium Grid, Nexus, Postman, ServiceNow) with status badges, configure/edit modals, health monitoring indicators, sync history, toggle enable/disable, trigger sync, and filter by type/status.
- **FR-025 – Administration**: Platform configuration sections including general settings (app title, page size, session timeout, date format, language, theme), feature toggles (audit logging, notifications, maintenance mode), retention policy configuration with simulated execution, system health monitoring with component health table, and platform branding preview.
- **FR-026 – User Repository**: User list DataTable (34 users) with search, filter (role/status/portfolio), add/edit/deactivate/suspend/reactivate user modals, access review panel with compliance checking and sync capability, role/status distribution charts, and audit log panel for user changes.
- **FR-027 – My Profile**: Current user profile display (name, email, role, portfolio, feature access), editable display preferences (theme, dashboard layout, date format, language, compact mode), notification channel preferences (email, Teams, in-app), and dashboard widget configuration with reordering.
- **FR-028 – Notification Preferences**: Per-category notification channel configuration (Execution, Release, Governance, System) with toggle switches for each channel/category combination, global channel toggles, preference summary, and simulated delivery notes.
- **Access Denied Page**: Displayed when a user attempts to access a route they lack permissions for, showing current role and link back to landing page.
- **404 Not Found Page**: Displayed for unmatched routes with navigation back to dashboard or login.

#### Role-Based Access Control (RBAC)

- 22 distinct persona roles implemented: Administrator, Viewer, Editor, Minister, Deputy Minister, Permanent Secretary, Director General, Director, Deputy Director, Chief Education Officer, Regional Director, School Principal, Inspector, Curriculum Specialist, Finance Officer, Procurement Officer, HR Officer, ICT Officer, M&E Officer, Development Partner, Programme Coordinator, Data Analyst.
- Permissions matrix mapping each role to allowed features/screens defined in `src/shared/constants.js`.
- Route-level protection via `ProtectedRoute` component checking authentication and feature-level permissions.
- Sidebar navigation dynamically filtered based on current user's role permissions.
- Role-specific default landing pages (e.g., Regional Director → `/regional-data`, Finance Officer → `/budget`).
- Approval authority defined for 9 roles (Admin, Minister, Deputy Minister, Permanent Secretary, Director General, Director, Chief Education Officer, Finance Officer, Programme Coordinator).

#### Mock Data & Persistence

- 19 mock data seed files in `src/shared/data/` providing realistic Namibian education sector data:
  - `mockUsers.js` – 34 users across all 22 roles with fictitious Namibian names and emails.
  - `mockApplications.js` – 55 applications across 16 portfolios with quality metrics.
  - `mockTestAssets.js` – 85 test cases across 53 test suites with execution history.
  - `mockExecutions.js` – 105 test executions with logs, evidence, and AI analysis.
  - `mockDemand.js` – 45 demand items with full workflow status and comments.
  - `mockReleases.js` – 20 releases with timelines and quality gate statuses.
  - `mockQualityGates.js` – 20 quality gate evaluations with criteria details.
  - `mockEnvironments.js` – 20 environments with configurations and bookings.
  - `mockSchedules.js` – 28 test execution schedules across various frequencies.
  - `mockGovernance.js` – 25 governance procedures with audit histories.
  - `mockDashboardMetrics.js` – Executive KPIs, 12-month trends, portfolio breakdowns.
  - `mockPortfolios.js` – 16 portfolios with trend data and application mappings.
  - `mockAutomation.js` – Automation health for 19 applications with ROI metrics.
  - `mockAdoption.js` – Platform usage, value realization, and engagement data.
  - `mockPostDeployment.js` – 25 deployment outcomes with monitoring metrics.
  - `mockIntegrations.js` – 14 external integrations with health metrics and sync history.
  - `mockAuditLogs.js` – 65 audit log entries across various action types.
  - `mockNotifications.js` – 55 notifications across 4 categories and 3 delivery channels.
  - `mockTestData.js` – 35 test data sets (synthetic, masked, subset types).
- All data persisted to `localStorage` via the storage abstraction layer (`src/shared/services/storage.js`).
- Automatic seeding on first load with sentinel key detection to prevent re-seeding.
- Quota exceeded protection with automatic cleanup of non-essential keys.
- Corrupted data auto-reset to defaults.
- Data reset capability via `DataContext.resetData()` to restore all repositories to original mock data.

#### Services Layer

- `authManager.js` – Mock authentication with session management, access checks, and role-based route protection.
- `dashboardService.js` – Aggregated dashboard metrics from all data sources with filtering support.
- `repositoryService.js` – CRUD operations for applications, test assets, and demand items.
- `executionService.js` – Execution lifecycle management with status updates, logs, evidence, and AI analysis.
- `schedulerService.js` – Schedule CRUD with pause/resume/trigger/delete operations.
- `auditLogService.js` – Audit trail management with filtering, PII masking, and export.
- `notificationManager.js` – Notification state, preferences, and simulated delivery channels.
- `platformAdminService.js` – Platform configuration, retention policies, system health, and integration management.
- `exportService.js` – Export to CSV (file-saver), Excel (SheetJS/xlsx), PDF (jsPDF + jspdf-autotable), and simulated PowerPoint with role-based export permission checks.
- `userManager.js` – User repository management with access review, PII masking, and sync capabilities.
- `roles.js` – Role definitions with permissions, landing pages, approval authority, and descriptions.
- `storage.js` – localStorage abstraction with JSON parse/stringify, error handling, quota protection, and PII masking.
- Simulated network delay configurable via `VITE_MOCK_DELAY_MS` environment variable (default 300ms).

#### Shared Components

- `AppLayout.jsx` – Main application shell with responsive sidebar, header, and content area.
- `Header.jsx` – Top navigation bar with app title, search, notification bell with unread count, and profile dropdown.
- `Sidebar.jsx` – Persistent left sidebar with role-filtered navigation sections, collapsible on desktop, overlay on mobile.
- `MetricCard.jsx` – Reusable KPI card with label, value, trend indicator (up/down/neutral), optional sparkline, prefix/suffix support.
- `ChartWrapper.jsx` – Recharts wrapper supporting bar, line, pie, and area charts with consistent styling, responsive container, accessible labels, custom tooltips, and loading/empty states.
- `DataTable.jsx` – Full-featured data table with sorting, client-side pagination (1000+ rows), search/filter, column visibility toggle, row selection, keyboard navigation, and ARIA table roles.
- `FilterBar.jsx` – Horizontal filter bar with dropdown filters, search input, debounced search, and clear all button.
- `ExportButton.jsx` – Dropdown menu with CSV, Excel, PDF, PowerPoint export options, role-based permission checks, simulated Power BI link, and feedback messages.
- `Modal.jsx` – Accessible modal dialog with overlay, focus trap, Escape key close, confirm/cancel patterns, and multiple size variants (sm/md/lg/xl).
- `StatusBadge.jsx` – Colored pill badge supporting 40+ status values with accessible color contrast and ARIA status role.
- `LoadingSpinner.jsx` – Accessible animated spinner with screen-reader-only text and multiple size variants.
- `EmptyState.jsx` – Placeholder component with icon, title, description, and optional action button.
- `ProtectedRoute.jsx` – Route guard checking authentication and feature-level permissions with redirect and access denied display.
- `NotificationPanel.jsx` – Notification dropdown with read/unread styling, mark as read, category filtering, and delivery channel badges.
- `AuditLogPanel.jsx` – Reusable audit log panel with filterable, paginated table, entity scoping, and export.

#### Context Providers

- `AuthContext.jsx` – Authentication state, login/logout actions, permission checks (`hasPermission`, `hasRolePermission`, `hasApproval`), navigation section access, landing page resolution, and `RequireAuth`/`RequireRole` guard components.
- `DataContext.jsx` – Data initialization orchestration, lazy-loading of all data repositories, reset capability, and loading/error state tracking.
- `NotificationContext.jsx` – Notification state, unread count, mark-as-read actions, preference management, add/delete notifications, and category/type filtering.

#### Routing

- React Router v6 with `createBrowserRouter` and lazy-loaded feature components via `React.lazy` + `Suspense`.
- 40+ routes covering all feature screens with authentication guards and feature-level permission checks.
- Vercel SPA rewrite configuration (`vercel.json`) for client-side routing support.

#### Export Capabilities

- CSV export via `file-saver` with proper escaping and UTF-8 encoding.
- Excel (.xlsx) export via SheetJS with auto-sized columns and formatted worksheets.
- PDF export via jsPDF with autoTable plugin, branded header, pagination footer, and landscape/portrait auto-detection.
- Simulated PowerPoint export generating a text-based summary file.
- All exports include timestamped filenames, record counts, and audit trail logging.
- Role-based export permission enforcement via `FEATURES.EXPORT` check.

#### Simulated Integrations

- 14 external integration configurations (Azure DevOps, qTest Manager, Jira Align, Jenkins CI/CD, SonarQube, GitHub Enterprise, Microsoft Teams, Grafana, Confluence, OWASP ZAP, Selenium Grid, Nexus Repository, Postman, ServiceNow) with health metrics, sync history, and configuration details.
- All integrations are simulated UI hints with clear "Simulated" labels and localStorage persistence.
- Integration health monitoring with uptime, success rate, response time, and error tracking.
- Simulated sync operations with history tracking.

#### Simulated AI Features

- Predictive quality scores for 10 applications with confidence levels and trend indicators.
- 8 defect predictions with severity, root cause category, and suggested actions.
- 8 portfolio risk assessments with risk factors and recommended mitigations.
- 12 AI-generated test case suggestions with rationale and estimated effort.
- 6 test optimization recommendations with impact and effort estimates.
- AI analysis on failed test executions with root cause, recommendation, confidence score, and related defects.
- All AI features clearly labeled as "Simulated AI" with disclaimer banners.

#### Simulated Notifications

- 55 pre-seeded notifications across 4 categories (Execution, Release, Governance, System) and 3 delivery channels (InApp, Email, Teams).
- Unread count badge on header notification bell.
- Mark as read / mark all as read functionality.
- Category-based filtering.
- Per-user notification preferences with global and per-category channel toggles.
- Simulated delivery channel badges (Email, Teams, In-App).

#### Accessibility

- ARIA roles on all interactive components (table, dialog, alert, status, button, navigation, search).
- Keyboard navigation support for DataTable rows, Modal focus trap, Sidebar navigation, and dropdown menus.
- Screen-reader-only text on LoadingSpinner and StatusBadge components.
- Focus-visible outlines with brand color (`outline-brand-500`).
- Reduced motion support via `prefers-reduced-motion` media query.
- Semantic HTML structure with proper heading hierarchy.
- Color contrast compliance on StatusBadge with background/text/ring color combinations.

#### Testing

- Unit tests for core services: `dashboardService.test.js`, `executionService.test.js`, `repositoryService.test.js`, `userManager.test.js`.
- Unit tests for shared utilities: `helpers.test.js`.
- Integration tests for contexts: `AuthContext.test.jsx`.
- Component tests: `LoginPage.test.jsx`, `ExecutiveDashboard.test.jsx`.
- Test infrastructure: Vitest + jsdom + @testing-library/react + @testing-library/user-event.
- Mock patterns for localStorage, authManager, auditLogService, and Recharts components.

#### Build & Deployment

- Vite 5 build configuration with React plugin and path aliases.
- Tailwind CSS 3 with custom brand color palette (brand, brand-blue, brand-green, brand-gray), extended screens, and Inter font family.
- PostCSS with autoprefixer.
- Vercel deployment configuration with SPA rewrites.
- Environment variables support via `.env` file (VITE_APP_TITLE, VITE_DEFAULT_ROLE, VITE_MOCK_DELAY_MS).

#### Dependencies

- React 18.3.1 with React DOM and React Router DOM 6.28.0.
- Recharts 2.13.3 for data visualization.
- SheetJS (xlsx) 0.18.5 for Excel export.
- jsPDF 2.5.2 with jspdf-autotable 3.8.4 for PDF export.
- file-saver 2.0.5 for browser file downloads.
- prop-types 15.8.1 for component prop validation.

[1.0.0]: https://github.com/kp-etsip/kp-etsip/releases/tag/v1.0.0
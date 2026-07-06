# Deployment Guide

## KP-ETSIP — Education and Training Sector Improvement Programme

This document describes how to deploy the KP-ETSIP platform to Vercel as a static single-page application (SPA).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Build Configuration](#build-configuration)
4. [Vercel Deployment](#vercel-deployment)
5. [SPA Rewrite Configuration](#spa-rewrite-configuration)
6. [CI/CD with GitHub Integration](#cicd-with-github-integration)
7. [Preview Deployments](#preview-deployments)
8. [Manual Deployment via Vercel CLI](#manual-deployment-via-vercel-cli)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js** 18.x or later
- **npm** 9.x or later (ships with Node.js 18+)
- A **Vercel** account ([vercel.com](https://vercel.com))
- A **GitHub** repository containing the KP-ETSIP source code
- (Optional) Vercel CLI installed globally: `npm i -g vercel`

---

## Environment Variables

The application uses Vite environment variables prefixed with `VITE_`. These are embedded at build time and are **not** secret — they are included in the client-side JavaScript bundle.

| Variable | Description | Default | Required |
|---|---|---|---|
| `VITE_APP_TITLE` | Application title displayed in the browser tab and header | `KP-ETSIP` | No |
| `VITE_DEFAULT_ROLE` | Default user role for development (e.g., `admin`, `viewer`, `editor`) | `viewer` | No |
| `VITE_MOCK_DELAY_MS` | Simulated network delay in milliseconds for mock API calls (`0` to disable) | `300` | No |

### Setting Environment Variables Locally

1. Copy the example environment file:

```
cp .env.example .env
```

2. Edit `.env` and set the desired values:

```
VITE_APP_TITLE=KP-ETSIP
VITE_DEFAULT_ROLE=viewer
VITE_MOCK_DELAY_MS=300
```

The `.env` file is listed in `.gitignore` and will not be committed to the repository.

### Setting Environment Variables on Vercel

1. Navigate to your project on the Vercel dashboard.
2. Go to **Settings** → **Environment Variables**.
3. Add each variable with the appropriate value for the target environment (Production, Preview, or Development).

| Variable | Production Value | Preview Value |
|---|---|---|
| `VITE_APP_TITLE` | `KP-ETSIP` | `KP-ETSIP (Preview)` |
| `VITE_DEFAULT_ROLE` | `viewer` | `admin` |
| `VITE_MOCK_DELAY_MS` | `0` | `300` |

> **Note:** Setting `VITE_MOCK_DELAY_MS` to `0` in production removes simulated network delays for a faster user experience.

---

## Build Configuration

### Build Command

```
npm run build
```

This runs `vite build`, which:

- Compiles all React JSX components
- Processes Tailwind CSS via PostCSS
- Tree-shakes unused code
- Generates optimized, minified bundles
- Outputs static assets to the `dist/` directory

### Output Directory

```
dist/
```

The `dist/` directory contains the complete static site ready for deployment:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [lazy-chunk]-[hash].js
└── vite.svg
```

### Install Command

```
npm install
```

### Development Server

```
npm run dev
```

### Preview Production Build Locally

```
npm run preview
```

---

## Vercel Deployment

### Framework Preset

Vercel automatically detects Vite projects. If prompted, select **Vite** as the framework preset.

### Build & Output Settings

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Node.js Version** | 18.x |

These settings are typically auto-detected by Vercel. If you need to override them, configure them in the Vercel dashboard under **Settings** → **General** → **Build & Development Settings**.

---

## SPA Rewrite Configuration

KP-ETSIP uses client-side routing via React Router v6 with `createBrowserRouter`. All routes must be served by `index.html` so that React Router can handle navigation.

The `vercel.json` file in the project root configures this rewrite:

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

This ensures that:

- Direct navigation to any route (e.g., `/dashboard`, `/applications/app-001`) serves `index.html`.
- Browser refreshes on any route work correctly.
- 404 handling is managed by the React Router `NotFound` component, not by Vercel.

> **Important:** Do not remove or modify `vercel.json` unless you understand the impact on client-side routing. Without this rewrite, navigating directly to any route other than `/` will return a Vercel 404 page.

---

## CI/CD with GitHub Integration

### Connecting GitHub to Vercel

1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New** → **Project**.
3. Select **Import Git Repository** and choose the KP-ETSIP repository.
4. Vercel will auto-detect the Vite framework and configure build settings.
5. Add environment variables as described above.
6. Click **Deploy**.

### Automatic Deployments

Once connected, Vercel automatically deploys on every push:

| Branch | Deployment Type | URL |
|---|---|---|
| `main` (or configured production branch) | **Production** | `https://your-project.vercel.app` |
| Any other branch | **Preview** | `https://your-project-[branch]-[hash].vercel.app` |
| Pull request | **Preview** | Linked to the PR with status checks |

### Deployment Pipeline

```
Push to GitHub
    │
    ▼
Vercel detects push
    │
    ▼
npm install
    │
    ▼
npm run build (vite build)
    │
    ▼
Output: dist/
    │
    ▼
Deploy to Vercel CDN
    │
    ▼
URL available
```

### Branch Protection (Recommended)

For production deployments, configure branch protection rules on GitHub:

1. Go to **Settings** → **Branches** → **Branch protection rules**.
2. Add a rule for `main`:
   - Require pull request reviews before merging.
   - Require status checks to pass (Vercel deployment check).
   - Require branches to be up to date before merging.

---

## Preview Deployments

Vercel creates a unique preview deployment for every push to a non-production branch and every pull request.

### Preview Deployment Features

- **Unique URL**: Each preview deployment gets a unique URL (e.g., `https://kp-etsip-feature-xyz-abc123.vercel.app`).
- **GitHub PR Comments**: Vercel automatically posts a comment on the pull request with the preview URL.
- **GitHub Status Checks**: The deployment status appears as a check on the pull request.
- **Isolated Environment**: Preview deployments use the Preview environment variables configured in Vercel.
- **No Impact on Production**: Preview deployments do not affect the production deployment.

### Testing Preview Deployments

1. Push a branch or open a pull request.
2. Wait for the Vercel deployment to complete (typically 30–60 seconds).
3. Click the preview URL in the GitHub PR comment or Vercel dashboard.
4. Test the changes in the preview environment.
5. All 34 mock users are available for login with the password `mockpass`.

### Preview Environment Variables

To differentiate preview deployments from production, set preview-specific environment variables in Vercel:

- Set `VITE_APP_TITLE` to `KP-ETSIP (Preview)` for the Preview environment.
- Set `VITE_DEFAULT_ROLE` to `admin` for the Preview environment to enable full feature access during testing.

---

## Manual Deployment via Vercel CLI

If you prefer to deploy manually without GitHub integration:

### Install Vercel CLI

```
npm i -g vercel
```

### Login

```
vercel login
```

### Deploy to Preview

```
vercel
```

### Deploy to Production

```
vercel --prod
```

### Deploy with Environment Variables

```
vercel --prod --env VITE_APP_TITLE="KP-ETSIP" --env VITE_MOCK_DELAY_MS="0"
```

### Link to Existing Project

```
vercel link
```

---

## Troubleshooting

### Routes Return 404 on Direct Navigation

**Cause:** The `vercel.json` SPA rewrite is missing or misconfigured.

**Fix:** Ensure `vercel.json` exists in the project root with the following content:

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

### Build Fails with "Module Not Found"

**Cause:** A dependency is missing from `package.json`.

**Fix:** Run `npm install` locally and verify the build succeeds with `npm run build` before pushing.

### Environment Variables Not Available at Runtime

**Cause:** Vite environment variables must be prefixed with `VITE_` and are embedded at build time.

**Fix:**
1. Ensure the variable name starts with `VITE_`.
2. Access it via `import.meta.env.VITE_VARIABLE_NAME` (not `process.env`).
3. After changing environment variables on Vercel, trigger a new deployment (Vercel does not rebuild automatically when only environment variables change).

### Blank Page After Deployment

**Cause:** The build output directory is incorrect or the base path is misconfigured.

**Fix:**
1. Verify the output directory is set to `dist` in Vercel settings.
2. Ensure `vite.config.js` does not set a `base` path that conflicts with the Vercel deployment URL.
3. Check the browser console for JavaScript errors.

### Large Bundle Size Warning

**Cause:** All feature components are bundled together.

**Fix:** The application already uses `React.lazy()` and `Suspense` for code splitting. Each feature screen is lazy-loaded, keeping the initial bundle small. If bundle size increases significantly, check for new dependencies that may not be tree-shakeable.

### localStorage Quota Exceeded

**Cause:** The application stores all mock data in localStorage, which has a ~5 MB quota.

**Fix:** The storage abstraction layer (`src/shared/services/storage.js`) includes automatic quota exceeded protection that clears non-essential keys and retries. If the issue persists, use the **Data Reset** feature in the Administration screen or clear localStorage manually via browser developer tools.

### Tests Fail in CI

**Cause:** Tests may depend on browser APIs not available in the CI environment.

**Fix:**
1. Tests use `vitest` with `jsdom` environment, which simulates browser APIs.
2. Run `npm test` locally to verify tests pass before pushing.
3. Ensure `setupTests.js` imports `@testing-library/jest-dom`.

---

## Project Structure Reference

```
kp-etsip/
├── .env.example              # Environment variables template
├── .gitignore                 # Git ignore rules
├── CHANGELOG.md               # Version history
├── DEPLOYMENT.md              # This file
├── index.html                 # Entry HTML file
├── package.json               # Dependencies and scripts
├── postcss.config.js          # PostCSS configuration (Tailwind)
├── tailwind.config.js         # Tailwind CSS configuration
├── vercel.json                # Vercel SPA rewrite configuration
├── vite.config.js             # Vite build configuration
├── vitest.config.js           # Vitest test configuration
├── dist/                      # Build output (generated, gitignored)
├── src/
│   ├── main.jsx               # Application entry point
│   ├── App.jsx                # Root component with providers
│   ├── router.jsx             # React Router configuration
│   ├── index.css              # Tailwind CSS imports
│   ├── features/              # Feature screen components (25+)
│   └── shared/
│       ├── components/        # Reusable UI components
│       ├── constants.js       # Application constants and RBAC
│       ├── contexts/          # React context providers
│       ├── data/              # Mock data seed files (19 files)
│       ├── services/          # Service layer modules
│       └── utils/             # Shared utility functions
```

---

## Useful Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `vercel` | Deploy to preview environment |
| `vercel --prod` | Deploy to production environment |
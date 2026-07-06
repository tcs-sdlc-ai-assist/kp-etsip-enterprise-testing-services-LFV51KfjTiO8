/**
 * ProtectedRoute Component
 * Route guard that checks authentication and feature-level permissions.
 * Redirects to login if not authenticated, shows 'Access Denied' if unauthorized.
 * Wraps child routes via React Router's Outlet.
 * @module ProtectedRoute
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext.jsx';

/**
 * ProtectedRoute component for guarding routes based on authentication and permissions.
 *
 * @param {Object} props - Component props
 * @param {string} [props.requiredFeature] - Feature key from FEATURES constant required to access the route
 * @param {string} [props.redirectPath='/'] - Path to redirect to when not authenticated
 * @param {React.ReactNode} [props.children] - Optional children to render instead of Outlet
 * @returns {React.ReactElement} The protected content, a redirect, or an access denied message
 */
export default function ProtectedRoute({ requiredFeature, redirectPath, children }) {
  const { isAuthenticated, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-brand-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectPath || '/login'} state={{ from: location }} replace />;
  }

  if (requiredFeature && !hasPermission(requiredFeature)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-white">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-brand-gray-900">
            Access Denied
          </h2>
          <p className="text-sm text-brand-gray-500">
            You do not have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"
              />
            </svg>
            <span>Go to Dashboard</span>
          </a>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}

ProtectedRoute.propTypes = {
  requiredFeature: PropTypes.string,
  redirectPath: PropTypes.string,
  children: PropTypes.node,
};

ProtectedRoute.defaultProps = {
  requiredFeature: undefined,
  redirectPath: '/login',
  children: undefined,
};
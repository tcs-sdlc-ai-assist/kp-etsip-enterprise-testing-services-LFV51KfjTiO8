/**
 * AccessDenied Component
 * Access Denied page displayed when a user attempts to access a route they don't
 * have permission for. Shows message, current role, and link back to their landing page.
 * @module AccessDenied
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import { ROLE_LABELS } from '../../shared/constants.js';

/**
 * Returns a human-readable label for a role key.
 *
 * @param {string} role - The role key
 * @returns {string} Human-readable role label
 */
function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || 'Unknown';
}

/**
 * AccessDenied page component.
 * Displayed when a user attempts to access a route they don't have permission for.
 * Shows an access denied message, the user's current role, and a link back to
 * their role-specific landing page.
 *
 * @returns {React.ReactElement} The access denied page
 */
export default function AccessDenied() {
  const { currentUser, role, isAuthenticated, getLandingPage } = useAuth();
  const navigate = useNavigate();

  /**
   * Handles navigation to the user's landing page.
   */
  const handleGoToLandingPage = useCallback(() => {
    const landingPage = getLandingPage() || '/';
    navigate(landingPage, { replace: true });
  }, [navigate, getLandingPage]);

  /**
   * Handles navigation to the login page.
   */
  const handleGoToLogin = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  const userName = currentUser ? currentUser.name : '';
  const userRole = role || '';
  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-white px-4 py-12">
      <div className="flex flex-col items-center gap-6 max-w-lg text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-red-500"
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

        {/* Title */}
        <h1 className="text-2xl font-bold text-brand-gray-900">
          Access Denied
        </h1>

        {/* Description */}
        <p className="text-sm text-brand-gray-500 leading-relaxed max-w-md">
          You do not have permission to access this page. Your current role does not include the required permissions for this feature.
        </p>

        {/* Current Role Info */}
        {isAuthenticated && userRole && (
          <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4 w-full max-w-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-600 text-sm font-semibold">
                  {userInitial}
                </span>
              </div>
              <div className="min-w-0 text-left">
                {userName && (
                  <p className="text-sm font-medium text-brand-gray-900 truncate">
                    {userName}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-brand-gray-500">Current Role:</span>
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
                    {getRoleLabel(userRole)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <p className="text-xs text-brand-gray-400 leading-relaxed max-w-md">
          If you believe this is an error, please contact your system administrator to request the appropriate permissions for your account.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={handleGoToLandingPage}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
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
            </button>
          ) : (
            <button
              onClick={handleGoToLogin}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
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
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              <span>Sign In</span>
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-lg hover:bg-brand-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Go Back</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 text-[10px] text-brand-gray-400">
          KP-ETSIP · Education and Training Sector Improvement Programme
        </div>
      </div>
    </div>
  );
}
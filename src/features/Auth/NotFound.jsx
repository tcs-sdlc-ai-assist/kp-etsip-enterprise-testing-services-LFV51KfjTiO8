/**
 * NotFound Component
 * 404 Not Found page displayed for unmatched routes.
 * Shows a message and link back to the dashboard.
 * @module NotFound
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';

/**
 * NotFound page component.
 * Displayed when a user navigates to a route that does not exist.
 * Shows a 404 message and provides navigation back to the dashboard
 * or login page depending on authentication state.
 *
 * @returns {React.ReactElement} The 404 not found page
 */
export default function NotFound() {
  const { isAuthenticated, getLandingPage } = useAuth();
  const navigate = useNavigate();

  /**
   * Handles navigation to the user's landing page or login.
   */
  const handleGoHome = useCallback(() => {
    if (isAuthenticated) {
      const landingPage = getLandingPage() || '/';
      navigate(landingPage, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate, isAuthenticated, getLandingPage]);

  /**
   * Handles navigation back to the previous page.
   */
  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-white px-4 py-12">
      <div className="flex flex-col items-center gap-6 max-w-lg text-center">
        {/* 404 Icon */}
        <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-brand-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* 404 Code */}
        <h1 className="text-6xl font-bold text-brand-gray-900">
          404
        </h1>

        {/* Title */}
        <h2 className="text-xl font-semibold text-brand-gray-900">
          Page Not Found
        </h2>

        {/* Description */}
        <p className="text-sm text-brand-gray-500 leading-relaxed max-w-md">
          The page you are looking for does not exist or has been moved. Please check the URL or navigate back to the dashboard.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGoHome}
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
            <span>{isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}</span>
          </button>

          <button
            onClick={handleGoBack}
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
        </div>

        {/* Footer */}
        <div className="mt-4 text-[10px] text-brand-gray-400">
          KP-ETSIP · Education and Training Sector Improvement Programme
        </div>
      </div>
    </div>
  );
}
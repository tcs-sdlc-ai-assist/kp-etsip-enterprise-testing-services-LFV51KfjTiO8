/**
 * LoginPage Component
 * Mock login page with email dropdown (pre-provisioned users) and mock password field.
 * On submit, calls AuthContext.login(). Shows role preview.
 * Redirects to role-specific landing page on success.
 * @module LoginPage
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import { getUsers } from '../../shared/services/userManager.js';
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
 * Returns a status badge color class for a user status.
 *
 * @param {string} status - The user status
 * @returns {{bg: string, text: string}} Tailwind CSS classes
 */
function getStatusClasses(status) {
  switch (status) {
    case 'active':
      return { bg: 'bg-brand-green-50', text: 'text-brand-green-700' };
    case 'inactive':
      return { bg: 'bg-brand-gray-100', text: 'text-brand-gray-600' };
    case 'suspended':
      return { bg: 'bg-red-50', text: 'text-red-700' };
    default:
      return { bg: 'bg-brand-gray-100', text: 'text-brand-gray-600' };
  }
}

/**
 * LoginPage component for mock authentication.
 * Displays a form with email dropdown (pre-provisioned users) and mock password field.
 * On submit, calls AuthContext.login(). Shows role preview.
 * Redirects to role-specific landing page on success.
 *
 * @returns {React.ReactElement} The login page component
 */
export default function LoginPage() {
  const { login, isAuthenticated, getLandingPage, loading: authLoading, error: authError, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedEmail, setSelectedEmail] = useState('');
  const [password, setPassword] = useState('mockpass');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  /**
   * Loads the pre-provisioned users for the email dropdown.
   */
  const users = useMemo(() => {
    try {
      const allUsers = getUsers();
      if (Array.isArray(allUsers)) {
        return allUsers.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  /**
   * The currently selected user object based on the email dropdown.
   */
  const selectedUser = useMemo(() => {
    if (!selectedEmail) {
      return null;
    }
    return users.find((u) => u.email === selectedEmail) || null;
  }, [selectedEmail, users]);

  /**
   * Redirect if already authenticated.
   */
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state && location.state.from ? location.state.from.pathname : null;
      const landingPage = from || getLandingPage() || '/';
      navigate(landingPage, { replace: true });
    }
  }, [isAuthenticated, navigate, getLandingPage, location.state]);

  /**
   * Clears errors when the selected email changes.
   */
  useEffect(() => {
    setLocalError(null);
    if (authError) {
      clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmail]);

  /**
   * Handles email dropdown change.
   *
   * @param {React.ChangeEvent<HTMLSelectElement>} e - The change event
   */
  const handleEmailChange = useCallback((e) => {
    setSelectedEmail(e.target.value);
  }, []);

  /**
   * Handles password input change.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event
   */
  const handlePasswordChange = useCallback((e) => {
    setPassword(e.target.value);
  }, []);

  /**
   * Handles form submission.
   *
   * @param {React.FormEvent} e - The form event
   */
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!selectedEmail) {
      setLocalError('Please select a user to log in.');
      return;
    }

    if (!password) {
      setLocalError('Please enter the password.');
      return;
    }

    setSubmitting(true);

    try {
      const result = await login(selectedEmail, password);

      if (result && result.success) {
        const from = location.state && location.state.from ? location.state.from.pathname : null;
        const landingPage = from || getLandingPage() || '/';
        navigate(landingPage, { replace: true });
      } else {
        const errorMessage = result && result.error ? result.error : 'Login failed. Please try again.';
        setLocalError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'An unexpected error occurred.';
      setLocalError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [selectedEmail, password, login, navigate, getLandingPage, location.state]);

  const displayError = localError || authError;

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-brand-500 flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">KP</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-gray-900">
            KP-ETSIP
          </h1>
          <p className="text-sm text-brand-gray-500 mt-1">
            Education and Training Sector Improvement Programme
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg border border-brand-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-brand-gray-900">
              Sign In
            </h2>
            <p className="text-sm text-brand-gray-500 mt-1">
              Select a user from the dropdown to sign in with mock credentials.
            </p>
          </div>

          {/* Error message */}
          {displayError && (
            <div
              className="flex items-start gap-2 px-4 py-3 mb-4 bg-red-50 border border-red-200 rounded-lg"
              role="alert"
            >
              <svg
                className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"
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
              <p className="text-sm text-red-700">{displayError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email dropdown */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-brand-gray-700 mb-1"
              >
                User
              </label>
              <select
                id="login-email"
                value={selectedEmail}
                onChange={handleEmailChange}
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                aria-label="Select user"
                disabled={submitting || authLoading}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="">Select a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.email}>
                    {user.name} — {getRoleLabel(user.role)}
                  </option>
                ))}
              </select>
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-brand-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter password"
                className="w-full px-3 py-2 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                aria-label="Password"
                disabled={submitting || authLoading}
              />
              <p className="text-xs text-brand-gray-400 mt-1">
                Use <span className="font-mono bg-brand-gray-100 px-1 py-0.5 rounded text-brand-gray-600">mockpass</span> for all users.
              </p>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting || authLoading || !selectedEmail}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              {submitting || authLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
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
                </>
              )}
            </button>
          </form>

          {/* Role preview */}
          {selectedUser && (
            <div className="mt-6 pt-5 border-t border-brand-gray-200">
              <h3 className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">
                Selected User Preview
              </h3>
              <div className="bg-brand-gray-50 rounded-lg p-4 space-y-3">
                {/* User info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-600 text-sm font-semibold">
                      {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-gray-900 truncate">
                      {selectedUser.name}
                    </p>
                    <p className="text-xs text-brand-gray-500 truncate">
                      {selectedUser.email}
                    </p>
                  </div>
                </div>

                {/* Role and status */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300">
                    {getRoleLabel(selectedUser.role)}
                  </span>
                  {selectedUser.status && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClasses(selectedUser.status).bg} ${getStatusClasses(selectedUser.status).text}`}
                    >
                      {selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)}
                    </span>
                  )}
                </div>

                {/* Portfolio */}
                {selectedUser.portfolio && (
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-brand-gray-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <p className="text-xs text-brand-gray-600 leading-relaxed">
                      {selectedUser.portfolio}
                    </p>
                  </div>
                )}

                {/* Access count */}
                {selectedUser.applicationAccess && Array.isArray(selectedUser.applicationAccess) && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-brand-gray-400 flex-shrink-0"
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
                    <p className="text-xs text-brand-gray-600">
                      {selectedUser.applicationAccess.length} feature{selectedUser.applicationAccess.length !== 1 ? 's' : ''} accessible
                    </p>
                  </div>
                )}

                {/* Warning for inactive/suspended */}
                {selectedUser.status && selectedUser.status !== 'active' && (
                  <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <svg
                      className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5"
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
                    <p className="text-xs text-yellow-700">
                      This account is <strong>{selectedUser.status}</strong>. Login will be denied.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="mt-6 text-center">
          <p className="text-xs text-brand-gray-400">
            This is a simulated login for demonstration purposes.
          </p>
          <p className="text-xs text-brand-gray-400 mt-1">
            All user data is fictitious. No real authentication is performed.
          </p>
        </div>
      </div>
    </div>
  );
}
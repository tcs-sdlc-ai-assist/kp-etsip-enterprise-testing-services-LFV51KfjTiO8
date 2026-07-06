/**
 * Authentication Context Provider
 * Provides authentication state, login/logout actions, and permission checks
 * to the entire application via React Context.
 * Wraps the app and reads/writes session from localStorage via authManager.
 * Includes role-based route protection.
 * @module AuthContext
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  login as authLogin,
  logout as authLogout,
  getSession,
  getCurrentUser,
  getCurrentRole,
  checkAccess,
  checkRoleAccess,
  isAuthenticated as checkIsAuthenticated,
  hasApprovalAuthority,
  getDefaultLandingPage,
  getAllowedNavSections,
  updateSessionRole,
} from '../services/authManager.js';
import { logAction } from '../services/auditLogService.js';
import { getRoleByName } from '../services/roles.js';
import { PERMISSIONS } from '../constants.js';

/**
 * @typedef {Object} AuthContextValue
 * @property {import('../data/mockUsers.js').MockUser|null} currentUser - The currently authenticated user object
 * @property {import('../services/authManager.js').Session|null} session - The current session object
 * @property {string|null} role - The current user's role key
 * @property {boolean} isAuthenticated - Whether a valid session exists
 * @property {boolean} loading - Whether authentication state is being loaded
 * @property {string|null} error - The last authentication error message
 * @property {Function} login - Authenticates a user with email and password
 * @property {Function} logout - Logs out the current user
 * @property {Function} hasPermission - Checks if the current user has a specific feature permission
 * @property {Function} hasRolePermission - Checks if a specific role has a specific feature permission
 * @property {Function} hasApproval - Checks if the current user has approval authority
 * @property {Function} getNavSections - Returns allowed navigation section keys for the current user
 * @property {Function} getLandingPage - Returns the default landing page for the current user's role
 * @property {Function} clearError - Clears the current error message
 * @property {Function} refreshSession - Refreshes the session state from localStorage
 */

const AuthContext = createContext(null);

/**
 * Custom hook to access the AuthContext.
 * Throws an error if used outside of AuthProvider.
 *
 * @returns {AuthContextValue} The authentication context value
 * @throws {Error} If used outside of AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}

/**
 * Authentication Context Provider component.
 * Wraps the application and provides authentication state and actions.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} The provider component
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Refreshes the authentication state from localStorage.
   * Called on mount and after login/logout.
   */
  const refreshSession = useCallback(() => {
    try {
      const currentSession = getSession();
      if (currentSession) {
        const user = getCurrentUser();
        const currentRole = getCurrentRole();
        setSession(currentSession);
        setCurrentUser(user);
        setRole(currentRole);
        setIsAuthenticated(true);
      } else {
        setSession(null);
        setCurrentUser(null);
        setRole(null);
        setIsAuthenticated(false);
      }
    } catch {
      setSession(null);
      setCurrentUser(null);
      setRole(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Initialize authentication state on mount
  useEffect(() => {
    setLoading(true);
    refreshSession();
    setLoading(false);
  }, [refreshSession]);

  /**
   * Authenticates a user with email and password.
   *
   * @param {string} email - The user's email address
   * @param {string} password - The user's password
   * @returns {Promise<{success: boolean, error?: string}>} Login result
   */
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const result = await authLogin(email, password);

      if (result.success) {
        refreshSession();

        try {
          logAction(
            'login',
            `User logged in successfully: ${email}`,
            'User',
            result.session ? result.session.userId : '',
            { status: 'success' }
          );
        } catch {
          // Ignore audit log errors during login
        }

        setLoading(false);
        return { success: true };
      }

      const errorMessage = result.error || 'Login failed. Please try again.';
      setError(errorMessage);

      try {
        logAction(
          'login',
          `Login attempt failed for ${email}: ${errorMessage}`,
          'User',
          '',
          {
            status: 'failure',
            actor: email,
            actorEmail: email,
            actorRole: 'unknown',
          }
        );
      } catch {
        // Ignore audit log errors
      }

      setLoading(false);
      return { success: false, error: errorMessage };
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'An unexpected error occurred during login.';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [refreshSession]);

  /**
   * Logs out the current user and clears session state.
   *
   * @returns {Promise<void>}
   */
  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const currentSession = getSession();

      if (currentSession) {
        try {
          logAction(
            'logout',
            `User logged out: ${currentSession.email}`,
            'User',
            currentSession.userId,
            { status: 'success' }
          );
        } catch {
          // Ignore audit log errors during logout
        }
      }

      await authLogout();
    } catch {
      // Ensure logout completes even if errors occur
    }

    setSession(null);
    setCurrentUser(null);
    setRole(null);
    setIsAuthenticated(false);
    setLoading(false);
  }, []);

  /**
   * Checks if the current user has a specific feature permission.
   *
   * @param {string} feature - The feature key from FEATURES constant
   * @returns {boolean} True if the current user has the permission
   */
  const hasPermission = useCallback((feature) => {
    if (!feature) {
      return false;
    }

    if (!isAuthenticated || !role) {
      return false;
    }

    return checkAccess(feature);
  }, [isAuthenticated, role]);

  /**
   * Checks if a specific role has a specific feature permission.
   *
   * @param {string} roleName - The role key
   * @param {string} feature - The feature key from FEATURES constant
   * @returns {boolean} True if the role has the permission
   */
  const hasRolePermission = useCallback((roleName, feature) => {
    if (!roleName || !feature) {
      return false;
    }

    return checkRoleAccess(roleName, feature);
  }, []);

  /**
   * Checks if the current user has approval authority.
   *
   * @returns {boolean} True if the current user has approval authority
   */
  const hasApproval = useCallback(() => {
    if (!isAuthenticated) {
      return false;
    }

    return hasApprovalAuthority();
  }, [isAuthenticated]);

  /**
   * Returns the allowed navigation section keys for the current user's role.
   *
   * @returns {string[]} Array of navigation section keys
   */
  const getNavSections = useCallback(() => {
    if (!isAuthenticated) {
      return [];
    }

    return getAllowedNavSections();
  }, [isAuthenticated]);

  /**
   * Returns the default landing page for the current user's role.
   *
   * @returns {string} The default landing page path
   */
  const getLandingPage = useCallback(() => {
    if (!isAuthenticated) {
      return '/';
    }

    return getDefaultLandingPage();
  }, [isAuthenticated]);

  /**
   * Clears the current error message.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const contextValue = useMemo(() => ({
    currentUser,
    session,
    role,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    hasPermission,
    hasRolePermission,
    hasApproval,
    getNavSections,
    getLandingPage,
    clearError,
    refreshSession,
  }), [
    currentUser,
    session,
    role,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    hasPermission,
    hasRolePermission,
    hasApproval,
    getNavSections,
    getLandingPage,
    clearError,
    refreshSession,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Higher-order component that protects a route based on authentication.
 * Renders the wrapped component only if the user is authenticated.
 * Otherwise renders a fallback (defaults to null).
 *
 * @param {React.ComponentType} WrappedComponent - The component to protect
 * @param {Object} [options] - Protection options
 * @param {React.ReactNode} [options.fallback] - Fallback to render when not authenticated
 * @param {string} [options.requiredFeature] - Feature key required to access the route
 * @returns {React.ComponentType} The protected component
 */
export function withAuth(WrappedComponent, options = {}) {
  function ProtectedComponent(props) {
    const { isAuthenticated, loading, hasPermission } = useAuth();

    if (loading) {
      return options.fallback || null;
    }

    if (!isAuthenticated) {
      return options.fallback || null;
    }

    if (options.requiredFeature && !hasPermission(options.requiredFeature)) {
      return options.fallback || null;
    }

    return <WrappedComponent {...props} />;
  }

  ProtectedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return ProtectedComponent;
}

/**
 * Component that conditionally renders children based on authentication state.
 * Useful for protecting sections of a page.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render when authorized
 * @param {string} [props.feature] - Feature key required for access
 * @param {React.ReactNode} [props.fallback] - Content to render when not authorized
 * @returns {React.ReactElement|null} The authorized content or fallback
 */
export function RequireAuth({ children, feature, fallback }) {
  const { isAuthenticated, loading, hasPermission } = useAuth();

  if (loading) {
    return fallback || null;
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  if (feature && !hasPermission(feature)) {
    return fallback || null;
  }

  return children;
}

RequireAuth.propTypes = {
  children: PropTypes.node.isRequired,
  feature: PropTypes.string,
  fallback: PropTypes.node,
};

RequireAuth.defaultProps = {
  feature: undefined,
  fallback: null,
};

/**
 * Component that conditionally renders children based on the user's role.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render when role matches
 * @param {string|string[]} props.roles - Role key or array of role keys that are allowed
 * @param {React.ReactNode} [props.fallback] - Content to render when role does not match
 * @returns {React.ReactElement|null} The content or fallback
 */
export function RequireRole({ children, roles, fallback }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return fallback || null;
  }

  if (!isAuthenticated || !role) {
    return fallback || null;
  }

  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!allowedRoles.includes(role)) {
    return fallback || null;
  }

  return children;
}

RequireRole.propTypes = {
  children: PropTypes.node.isRequired,
  roles: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]).isRequired,
  fallback: PropTypes.node,
};

RequireRole.defaultProps = {
  fallback: null,
};

export { AuthContext };
export default AuthProvider;
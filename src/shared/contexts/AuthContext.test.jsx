import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext.jsx';

// Mock the services
vi.mock('../services/authManager.js', () => {
  let mockSession = null;
  let mockUser = null;
  let mockRole = null;

  return {
    login: vi.fn(async (email, password) => {
      if (password !== 'mockpass') {
        return { success: false, session: null, error: 'Invalid credentials.' };
      }
      if (email === 'amelia.shikongo@kp-etsip.gov') {
        mockSession = {
          userId: 'user-001',
          name: 'Amelia Shikongo',
          email: 'amelia.shikongo@kp-etsip.gov',
          role: 'admin',
          portfolio: 'ICT & Systems Administration',
          applicationAccess: ['dashboard', 'programmes', 'projects', 'indicators', 'budget', 'reports', 'analytics', 'user_management', 'settings', 'audit_log', 'data_entry', 'approvals', 'notifications', 'export', 'regional_data', 'school_data', 'procurement', 'hr', 'ict_infrastructure', 'curriculum'],
          token: 'mock-token-abc123',
          loginAt: new Date().toISOString(),
        };
        mockUser = {
          id: 'user-001',
          name: 'Amelia Shikongo',
          email: 'amelia.shikongo@kp-etsip.gov',
          role: 'admin',
          portfolio: 'ICT & Systems Administration',
          status: 'active',
        };
        mockRole = 'admin';
        return { success: true, session: mockSession };
      }
      if (email === 'johannes.hamutenya@kp-etsip.gov') {
        mockSession = {
          userId: 'user-002',
          name: 'Johannes Hamutenya',
          email: 'johannes.hamutenya@kp-etsip.gov',
          role: 'viewer',
          portfolio: 'Public Relations',
          applicationAccess: ['dashboard', 'programmes', 'projects', 'indicators', 'reports', 'analytics', 'notifications'],
          token: 'mock-token-def456',
          loginAt: new Date().toISOString(),
        };
        mockUser = {
          id: 'user-002',
          name: 'Johannes Hamutenya',
          email: 'johannes.hamutenya@kp-etsip.gov',
          role: 'viewer',
          portfolio: 'Public Relations',
          status: 'active',
        };
        mockRole = 'viewer';
        return { success: true, session: mockSession };
      }
      if (email === 'inactive@kp-etsip.gov') {
        return { success: false, session: null, error: 'Account is inactive. Please contact an administrator.' };
      }
      return { success: false, session: null, error: 'Invalid credentials.' };
    }),
    logout: vi.fn(async () => {
      mockSession = null;
      mockUser = null;
      mockRole = null;
    }),
    getSession: vi.fn(() => mockSession),
    getCurrentUser: vi.fn(() => mockUser),
    getCurrentRole: vi.fn(() => mockRole),
    checkAccess: vi.fn((feature) => {
      if (!mockSession) {
        return false;
      }
      const permissions = {
        admin: ['dashboard', 'programmes', 'projects', 'indicators', 'budget', 'reports', 'analytics', 'user_management', 'settings', 'audit_log', 'data_entry', 'approvals', 'notifications', 'export', 'regional_data', 'school_data', 'procurement', 'hr', 'ict_infrastructure', 'curriculum'],
        viewer: ['dashboard', 'programmes', 'projects', 'indicators', 'reports', 'analytics', 'notifications'],
      };
      const rolePerms = permissions[mockRole] || [];
      return rolePerms.includes(feature);
    }),
    checkRoleAccess: vi.fn((roleName, feature) => {
      const permissions = {
        admin: ['dashboard', 'programmes', 'projects', 'indicators', 'budget', 'reports', 'analytics', 'user_management', 'settings', 'audit_log', 'data_entry', 'approvals', 'notifications', 'export', 'regional_data', 'school_data', 'procurement', 'hr', 'ict_infrastructure', 'curriculum'],
        viewer: ['dashboard', 'programmes', 'projects', 'indicators', 'reports', 'analytics', 'notifications'],
      };
      const rolePerms = permissions[roleName] || [];
      return rolePerms.includes(feature);
    }),
    isAuthenticated: vi.fn(() => mockSession !== null),
    hasApprovalAuthority: vi.fn(() => {
      if (!mockSession) {
        return false;
      }
      return mockRole === 'admin';
    }),
    getDefaultLandingPage: vi.fn(() => '/'),
    getAllowedNavSections: vi.fn(() => {
      if (!mockSession) {
        return [];
      }
      if (mockRole === 'admin') {
        return ['dashboard', 'programmes', 'projects', 'indicators', 'budget', 'data-entry', 'reports', 'analytics', 'approvals', 'regional-data', 'school-data', 'procurement', 'hr', 'ict-infrastructure', 'curriculum', 'notifications', 'user-management', 'audit-log', 'settings'];
      }
      return ['dashboard', 'programmes', 'projects', 'indicators', 'reports', 'analytics', 'notifications'];
    }),
    updateSessionRole: vi.fn(() => true),
    _resetMockState: () => {
      mockSession = null;
      mockUser = null;
      mockRole = null;
    },
  };
});

vi.mock('../services/auditLogService.js', () => ({
  logAction: vi.fn(),
}));

vi.mock('../services/roles.js', () => ({
  getRoleByName: vi.fn((name) => {
    const roles = {
      admin: { name: 'admin', label: 'Administrator', approvalAuthority: true, defaultLandingPage: '/', allowedNavSections: ['dashboard'] },
      viewer: { name: 'viewer', label: 'Viewer', approvalAuthority: false, defaultLandingPage: '/', allowedNavSections: ['dashboard'] },
    };
    return roles[name] || null;
  }),
}));

/**
 * Test helper component that exposes AuthContext values for testing.
 */
function TestConsumer({ onRender }) {
  const auth = useAuth();
  onRender(auth);
  return null;
}

/**
 * Test helper component that renders auth state to the DOM.
 */
function AuthDisplay() {
  const { currentUser, role, isAuthenticated, loading, error } = useAuth();
  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="role">{role || 'none'}</span>
      <span data-testid="user-name">{currentUser ? currentUser.name : 'none'}</span>
      <span data-testid="error">{error || 'none'}</span>
    </div>
  );
}

/**
 * Test helper component with login/logout buttons.
 */
function AuthActions() {
  const { login, logout, isAuthenticated, currentUser, role, error, hasPermission, loading } = useAuth();

  const handleLogin = async (email) => {
    await login(email, 'mockpass');
  };

  const handleBadLogin = async () => {
    await login('amelia.shikongo@kp-etsip.gov', 'wrongpass');
  };

  const handleInactiveLogin = async () => {
    await login('inactive@kp-etsip.gov', 'mockpass');
  };

  const handleUnknownLogin = async () => {
    await login('unknown@kp-etsip.gov', 'mockpass');
  };

  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="role">{role || 'none'}</span>
      <span data-testid="user-name">{currentUser ? currentUser.name : 'none'}</span>
      <span data-testid="error">{error || 'none'}</span>
      <span data-testid="has-dashboard">{String(hasPermission('dashboard'))}</span>
      <span data-testid="has-user-management">{String(hasPermission('user_management'))}</span>
      <span data-testid="has-settings">{String(hasPermission('settings'))}</span>
      <button data-testid="login-admin" onClick={() => handleLogin('amelia.shikongo@kp-etsip.gov')}>Login Admin</button>
      <button data-testid="login-viewer" onClick={() => handleLogin('johannes.hamutenya@kp-etsip.gov')}>Login Viewer</button>
      <button data-testid="login-bad" onClick={handleBadLogin}>Login Bad</button>
      <button data-testid="login-inactive" onClick={handleInactiveLogin}>Login Inactive</button>
      <button data-testid="login-unknown" onClick={handleUnknownLogin}>Login Unknown</button>
      <button data-testid="logout" onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { _resetMockState } = require('../services/authManager.js');
    if (_resetMockState) {
      _resetMockState();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useAuth hook', () => {
    it('throws an error when used outside of AuthProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer onRender={() => {}} />);
      }).toThrow('useAuth must be used within an AuthProvider.');

      consoleError.mockRestore();
    });
  });

  describe('Initial state', () => {
    it('starts with unauthenticated state', async () => {
      render(
        <AuthProvider>
          <AuthDisplay />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('role').textContent).toBe('none');
      expect(screen.getByTestId('user-name').textContent).toBe('none');
      expect(screen.getByTestId('error').textContent).toBe('none');
    });
  });

  describe('Login with valid credentials', () => {
    it('logs in as admin with correct email and password', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('login-admin'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('role').textContent).toBe('admin');
      expect(screen.getByTestId('user-name').textContent).toBe('Amelia Shikongo');
      expect(screen.getByTestId('error').textContent).toBe('none');
    });

    it('logs in as viewer with correct email and password', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('login-viewer'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('role').textContent).toBe('viewer');
      expect(screen.getByTestId('user-name').textContent).toBe('Johannes Hamutenya');
    });
  });

  describe('Login with invalid credentials', () => {
    it('rejects login with wrong password', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('login-bad'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('error').textContent).toBe('Invalid credentials.');
    });

    it('rejects login for inactive account', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('login-inactive'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('error').textContent).toBe('Account is inactive. Please contact an administrator.');
    });

    it('rejects login for unknown user', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('login-unknown'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('error').textContent).toBe('Invalid credentials.');
    });
  });

  describe('Logout', () => {
    it('clears session on logout', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      // Login first
      await act(async () => {
        await user.click(screen.getByTestId('login-admin'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      // Then logout
      await act(async () => {
        await user.click(screen.getByTestId('logout'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('role').textContent).toBe('none');
      expect(screen.getByTestId('user-name').textContent).toBe('none');
    });
  });

  describe('hasPermission', () => {
    it('returns correct permissions for admin role', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('login-admin'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      expect(screen.getByTestId('has-dashboard').textContent).toBe('true');
      expect(screen.getByTestId('has-user-management').textContent).toBe('true');
      expect(screen.getByTestId('has-settings').textContent).toBe('true');
    });

    it('returns correct permissions for viewer role', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('login-viewer'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      expect(screen.getByTestId('has-dashboard').textContent).toBe('true');
      expect(screen.getByTestId('has-user-management').textContent).toBe('false');
      expect(screen.getByTestId('has-settings').textContent).toBe('false');
    });

    it('returns false for all permissions when not authenticated', async () => {
      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('has-dashboard').textContent).toBe('false');
      expect(screen.getByTestId('has-user-management').textContent).toBe('false');
      expect(screen.getByTestId('has-settings').textContent).toBe('false');
    });

    it('returns false for permissions after logout', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      // Login
      await act(async () => {
        await user.click(screen.getByTestId('login-admin'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('has-dashboard').textContent).toBe('true');
      });

      // Logout
      await act(async () => {
        await user.click(screen.getByTestId('logout'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('has-dashboard').textContent).toBe('false');
      expect(screen.getByTestId('has-user-management').textContent).toBe('false');
    });
  });

  describe('Session persistence', () => {
    it('calls authManager login and persists session on successful login', async () => {
      const { login } = require('../services/authManager.js');
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('login-admin'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      expect(login).toHaveBeenCalledWith('amelia.shikongo@kp-etsip.gov', 'mockpass');
    });

    it('calls authManager logout on logout action', async () => {
      const { logout: authLogout } = require('../services/authManager.js');
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('login-admin'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      await act(async () => {
        await user.click(screen.getByTestId('logout'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
      });

      expect(authLogout).toHaveBeenCalled();
    });

    it('logs audit action on successful login', async () => {
      const { logAction } = require('../services/auditLogService.js');
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('login-admin'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      expect(logAction).toHaveBeenCalledWith(
        'login',
        expect.stringContaining('amelia.shikongo@kp-etsip.gov'),
        'User',
        expect.any(String),
        expect.objectContaining({ status: 'success' })
      );
    });

    it('logs audit action on failed login', async () => {
      const { logAction } = require('../services/auditLogService.js');
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <AuthActions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('login-bad'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('error').textContent).toBe('Invalid credentials.');
      });

      expect(logAction).toHaveBeenCalledWith(
        'login',
        expect.stringContaining('amelia.shikongo@kp-etsip.gov'),
        'User',
        expect.any(String),
        expect.objectContaining({ status: 'failure' })
      );
    });
  });

  describe('clearError', () => {
    it('clears the error state', async () => {
      function ClearErrorTest() {
        const { login, error, clearError } = useAuth();

        return (
          <div>
            <span data-testid="error">{error || 'none'}</span>
            <button data-testid="login-bad" onClick={() => login('amelia.shikongo@kp-etsip.gov', 'wrongpass')}>Login Bad</button>
            <button data-testid="clear-error" onClick={clearError}>Clear Error</button>
          </div>
        );
      }

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <ClearErrorTest />
        </AuthProvider>
      );

      await act(async () => {
        await user.click(screen.getByTestId('login-bad'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('error').textContent).toBe('Invalid credentials.');
      });

      await act(async () => {
        await user.click(screen.getByTestId('clear-error'));
      });

      expect(screen.getByTestId('error').textContent).toBe('none');
    });
  });

  describe('getLandingPage', () => {
    it('returns the default landing page for authenticated user', async () => {
      let capturedAuth = null;

      function LandingPageTest() {
        const auth = useAuth();
        capturedAuth = auth;
        return (
          <div>
            <button data-testid="login-admin" onClick={() => auth.login('amelia.shikongo@kp-etsip.gov', 'mockpass')}>Login</button>
            <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
          </div>
        );
      }

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <LandingPageTest />
        </AuthProvider>
      );

      await act(async () => {
        await user.click(screen.getByTestId('login-admin'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      expect(capturedAuth.getLandingPage()).toBe('/');
    });

    it('returns / when not authenticated', async () => {
      let capturedAuth = null;

      function LandingPageTest() {
        const auth = useAuth();
        capturedAuth = auth;
        return <div data-testid="authenticated">{String(auth.isAuthenticated)}</div>;
      }

      render(
        <AuthProvider>
          <LandingPageTest />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
      });

      expect(capturedAuth.getLandingPage()).toBe('/');
    });
  });

  describe('getNavSections', () => {
    it('returns allowed nav sections for authenticated admin', async () => {
      let capturedAuth = null;

      function NavTest() {
        const auth = useAuth();
        capturedAuth = auth;
        return (
          <div>
            <button data-testid="login-admin" onClick={() => auth.login('amelia.shikongo@kp-etsip.gov', 'mockpass')}>Login</button>
            <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
          </div>
        );
      }

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <NavTest />
        </AuthProvider>
      );

      await act(async () => {
        await user.click(screen.getByTestId('login-admin'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      const navSections = capturedAuth.getNavSections();
      expect(Array.isArray(navSections)).toBe(true);
      expect(navSections.length).toBeGreaterThan(0);
      expect(navSections).toContain('dashboard');
    });

    it('returns empty array when not authenticated', async () => {
      let capturedAuth = null;

      function NavTest() {
        const auth = useAuth();
        capturedAuth = auth;
        return <div data-testid="authenticated">{String(auth.isAuthenticated)}</div>;
      }

      render(
        <AuthProvider>
          <NavTest />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
      });

      const navSections = capturedAuth.getNavSections();
      expect(Array.isArray(navSections)).toBe(true);
      expect(navSections.length).toBe(0);
    });
  });

  describe('hasRolePermission', () => {
    it('checks permissions for a specific role without requiring login', async () => {
      let capturedAuth = null;

      function RolePermTest() {
        const auth = useAuth();
        capturedAuth = auth;
        return <div data-testid="ready">ready</div>;
      }

      render(
        <AuthProvider>
          <RolePermTest />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('ready')).toBeTruthy();
      });

      expect(capturedAuth.hasRolePermission('admin', 'user_management')).toBe(true);
      expect(capturedAuth.hasRolePermission('viewer', 'user_management')).toBe(false);
      expect(capturedAuth.hasRolePermission('viewer', 'dashboard')).toBe(true);
    });

    it('returns false for invalid role or feature', async () => {
      let capturedAuth = null;

      function RolePermTest() {
        const auth = useAuth();
        capturedAuth = auth;
        return <div data-testid="ready">ready</div>;
      }

      render(
        <AuthProvider>
          <RolePermTest />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('ready')).toBeTruthy();
      });

      expect(capturedAuth.hasRolePermission('', 'dashboard')).toBe(false);
      expect(capturedAuth.hasRolePermission('admin', '')).toBe(false);
      expect(capturedAuth.hasRolePermission(null, 'dashboard')).toBe(false);
    });
  });
});
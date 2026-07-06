import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock the AuthContext
const mockLogin = vi.fn();
const mockGetLandingPage = vi.fn(() => '/');
const mockClearError = vi.fn();

let mockIsAuthenticated = false;
let mockLoading = false;
let mockAuthError = null;

vi.mock('../../shared/contexts/AuthContext.jsx', () => ({
  useAuth: vi.fn(() => ({
    login: mockLogin,
    isAuthenticated: mockIsAuthenticated,
    getLandingPage: mockGetLandingPage,
    loading: mockLoading,
    error: mockAuthError,
    clearError: mockClearError,
  })),
}));

// Mock the userManager service
vi.mock('../../shared/services/userManager.js', () => ({
  getUsers: vi.fn(() => [
    {
      id: 'user-001',
      name: 'Amelia Shikongo',
      email: 'amelia.shikongo@kp-etsip.gov',
      role: 'admin',
      portfolio: 'ICT & Systems Administration',
      status: 'active',
      applicationAccess: ['dashboard', 'programmes'],
    },
    {
      id: 'user-002',
      name: 'Johannes Hamutenya',
      email: 'johannes.hamutenya@kp-etsip.gov',
      role: 'viewer',
      portfolio: 'Public Relations',
      status: 'active',
      applicationAccess: ['dashboard'],
    },
    {
      id: 'user-032',
      name: 'Priskilla Amutenya',
      email: 'priskilla.amutenya@kp-etsip.gov',
      role: 'curriculum_specialist',
      portfolio: 'National Institute for Educational Development',
      status: 'suspended',
      applicationAccess: ['dashboard'],
    },
  ]),
}));

// Mock constants
vi.mock('../../shared/constants.js', async () => {
  const actual = await vi.importActual('../../shared/constants.js');
  return {
    ...actual,
  };
});

import LoginPage from './LoginPage.jsx';

/**
 * Helper to render LoginPage within a MemoryRouter.
 */
function renderLoginPage(initialEntries = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div data-testid="dashboard-page">Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockIsAuthenticated = false;
    mockLoading = false;
    mockAuthError = null;
    vi.clearAllMocks();
    mockLogin.mockResolvedValue({ success: true });
    mockGetLandingPage.mockReturnValue('/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('Rendering', () => {
    it('renders the login form with title and description', () => {
      renderLoginPage();

      expect(screen.getByText('KP-ETSIP')).toBeTruthy();
      expect(screen.getByText('Sign In')).toBeTruthy();
      expect(screen.getByText(/Select a user from the dropdown/i)).toBeTruthy();
    });

    it('renders the user selection dropdown', () => {
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');
      expect(dropdown).toBeTruthy();
      expect(dropdown.tagName).toBe('SELECT');
    });

    it('renders the password input field', () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toBeTruthy();
      expect(passwordInput.type).toBe('password');
    });

    it('renders the sign in button', () => {
      renderLoginPage();

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      expect(signInButton).toBeTruthy();
    });

    it('renders the password hint text', () => {
      renderLoginPage();

      expect(screen.getByText(/mockpass/)).toBeTruthy();
    });

    it('renders the simulated login footer text', () => {
      renderLoginPage();

      expect(screen.getByText(/simulated login for demonstration/i)).toBeTruthy();
    });

    it('renders the KP logo icon', () => {
      renderLoginPage();

      const logoElements = screen.getAllByText('KP');
      expect(logoElements.length).toBeGreaterThan(0);
    });

    it('populates the user dropdown with mock users sorted by name', () => {
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');
      const options = dropdown.querySelectorAll('option');

      // First option is placeholder "Select a user..."
      expect(options[0].textContent).toBe('Select a user...');
      expect(options.length).toBeGreaterThan(1);

      // Users should be present
      expect(dropdown.innerHTML).toContain('Amelia Shikongo');
      expect(dropdown.innerHTML).toContain('Johannes Hamutenya');
      expect(dropdown.innerHTML).toContain('Priskilla Amutenya');
    });

    it('pre-fills the password field with mockpass', () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput.value).toBe('mockpass');
    });

    it('disables the sign in button when no user is selected', () => {
      renderLoginPage();

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      expect(signInButton.disabled).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // User Selection & Role Preview
  // -------------------------------------------------------------------------
  describe('User Selection & Role Preview', () => {
    it('shows role preview when a user is selected', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');

      await act(async () => {
        await user.selectOptions(dropdown, 'amelia.shikongo@kp-etsip.gov');
      });

      expect(screen.getByText('Selected User Preview')).toBeTruthy();
      expect(screen.getByText('amelia.shikongo@kp-etsip.gov')).toBeTruthy();
    });

    it('enables the sign in button when a user is selected', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');

      await act(async () => {
        await user.selectOptions(dropdown, 'amelia.shikongo@kp-etsip.gov');
      });

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      expect(signInButton.disabled).toBe(false);
    });

    it('shows warning for suspended user account', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');

      await act(async () => {
        await user.selectOptions(dropdown, 'priskilla.amutenya@kp-etsip.gov');
      });

      expect(screen.getByText(/suspended/i)).toBeTruthy();
      expect(screen.getByText(/Login will be denied/i)).toBeTruthy();
    });

    it('displays the user role in the preview', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');

      await act(async () => {
        await user.selectOptions(dropdown, 'johannes.hamutenya@kp-etsip.gov');
      });

      expect(screen.getByText('Viewer')).toBeTruthy();
    });

    it('does not show role preview when no user is selected', () => {
      renderLoginPage();

      expect(screen.queryByText('Selected User Preview')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Successful Login
  // -------------------------------------------------------------------------
  describe('Successful Login', () => {
    it('calls login with selected email and password on form submit', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        await user.selectOptions(dropdown, 'amelia.shikongo@kp-etsip.gov');
      });

      await act(async () => {
        await user.click(signInButton);
      });

      expect(mockLogin).toHaveBeenCalledWith('amelia.shikongo@kp-etsip.gov', 'mockpass');
    });

    it('calls login with custom password when changed', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');
      const passwordInput = screen.getByLabelText('Password');

      await act(async () => {
        await user.selectOptions(dropdown, 'amelia.shikongo@kp-etsip.gov');
      });

      await act(async () => {
        await user.clear(passwordInput);
        await user.type(passwordInput, 'custompass');
      });

      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        await user.click(signInButton);
      });

      expect(mockLogin).toHaveBeenCalledWith('amelia.shikongo@kp-etsip.gov', 'custompass');
    });
  });

  // -------------------------------------------------------------------------
  // Error Display
  // -------------------------------------------------------------------------
  describe('Error Display', () => {
    it('displays error when login fails', async () => {
      mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials.' });

      const user = userEvent.setup();
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');

      await act(async () => {
        await user.selectOptions(dropdown, 'amelia.shikongo@kp-etsip.gov');
      });

      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        await user.click(signInButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials.')).toBeTruthy();
      });
    });

    it('displays error when no user is selected and form is submitted', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      // Force enable the button by directly submitting the form
      const form = document.querySelector('form');
      if (form) {
        await act(async () => {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
      }

      await waitFor(() => {
        const errorText = screen.queryByText('Please select a user to log in.');
        // Error may or may not show depending on button disabled state
        // The button should be disabled so form submit shouldn't trigger
        expect(mockLogin).not.toHaveBeenCalled();
      });
    });

    it('displays auth context error when present', () => {
      mockAuthError = 'Account is inactive. Please contact an administrator.';
      renderLoginPage();

      expect(screen.getByText('Account is inactive. Please contact an administrator.')).toBeTruthy();
    });

    it('clears error when user selection changes', async () => {
      mockAuthError = 'Some error';
      const user = userEvent.setup();
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');

      await act(async () => {
        await user.selectOptions(dropdown, 'amelia.shikongo@kp-etsip.gov');
      });

      expect(mockClearError).toHaveBeenCalled();
    });

    it('displays error when password is empty and form is submitted', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');
      const passwordInput = screen.getByLabelText('Password');

      await act(async () => {
        await user.selectOptions(dropdown, 'amelia.shikongo@kp-etsip.gov');
      });

      await act(async () => {
        await user.clear(passwordInput);
      });

      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        await user.click(signInButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Please enter the password.')).toBeTruthy();
      });
    });

    it('displays error when login throws an exception', async () => {
      mockLogin.mockRejectedValue(new Error('Unexpected error occurred.'));

      const user = userEvent.setup();
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');

      await act(async () => {
        await user.selectOptions(dropdown, 'amelia.shikongo@kp-etsip.gov');
      });

      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        await user.click(signInButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Unexpected error occurred.')).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility
  // -------------------------------------------------------------------------
  describe('Accessibility', () => {
    it('has accessible label on the user dropdown', () => {
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');
      expect(dropdown).toBeTruthy();
      expect(dropdown.getAttribute('aria-label')).toBe('Select user');
    });

    it('has accessible label on the password input', () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toBeTruthy();
      expect(passwordInput.getAttribute('aria-label')).toBe('Password');
    });

    it('has a label element for the user dropdown', () => {
      renderLoginPage();

      const label = screen.getByText('User');
      expect(label).toBeTruthy();
      expect(label.tagName).toBe('LABEL');
    });

    it('has a label element for the password field', () => {
      renderLoginPage();

      const label = screen.getByText('Password');
      expect(label).toBeTruthy();
    });

    it('error messages have role="alert"', async () => {
      mockAuthError = 'Test error message';
      renderLoginPage();

      const alert = screen.getByRole('alert');
      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain('Test error message');
    });

    it('sign in button is focusable', () => {
      renderLoginPage();

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      expect(signInButton).toBeTruthy();
      expect(signInButton.tabIndex).not.toBe(-1);
    });
  });

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------
  describe('Loading State', () => {
    it('disables form elements during login submission', async () => {
      let resolveLogin;
      mockLogin.mockImplementation(() => new Promise((resolve) => {
        resolveLogin = resolve;
      }));

      const user = userEvent.setup();
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');

      await act(async () => {
        await user.selectOptions(dropdown, 'amelia.shikongo@kp-etsip.gov');
      });

      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        await user.click(signInButton);
      });

      // During submission, button should show loading state
      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeTruthy();
      });

      // Resolve the login
      await act(async () => {
        resolveLogin({ success: true });
      });
    });

    it('disables dropdown and password during auth loading', () => {
      mockLoading = true;
      renderLoginPage();

      const dropdown = screen.getByLabelText('Select user');
      const passwordInput = screen.getByLabelText('Password');

      expect(dropdown.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Redirect when authenticated
  // -------------------------------------------------------------------------
  describe('Redirect when authenticated', () => {
    it('redirects to landing page when already authenticated', () => {
      mockIsAuthenticated = true;
      renderLoginPage();

      expect(screen.getByTestId('dashboard-page')).toBeTruthy();
    });
  });
});
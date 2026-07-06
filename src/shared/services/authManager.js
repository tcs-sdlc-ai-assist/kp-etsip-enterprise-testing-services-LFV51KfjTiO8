/**
 * Authentication Manager Service (AuthManager)
 * Handles mock authentication, session state, and access checks.
 * Stores session in localStorage via the storage abstraction layer.
 * @module authManager
 */

import { STORAGE_KEYS, PERMISSIONS } from '../constants.js';
import { getItem, setItem, removeItem } from './storage.js';
import { getUserByEmail, getUsers } from './userManager.js';
import { getRoleByName } from './roles.js';

/**
 * Simulated network delay in milliseconds from environment config.
 * @type {number}
 */
const MOCK_DELAY_MS = parseInt(import.meta.env.VITE_MOCK_DELAY_MS || '300', 10);

/**
 * Mock password accepted for all users in simulation.
 * @type {string}
 */
const MOCK_PASSWORD = 'mockpass';

/**
 * @typedef {Object} Session
 * @property {string} userId - The authenticated user's id
 * @property {string} name - The authenticated user's name
 * @property {string} email - The authenticated user's email
 * @property {string} role - The authenticated user's role key
 * @property {string} portfolio - The authenticated user's portfolio
 * @property {string[]} applicationAccess - The authenticated user's feature access keys
 * @property {string} token - Simulated session token
 * @property {string} loginAt - ISO 8601 timestamp of login
 */

/**
 * @typedef {Object} LoginResult
 * @property {boolean} success - Whether login was successful
 * @property {Session|null} session - The session object if successful, null otherwise
 * @property {string} [error] - Error message if login failed
 */

/**
 * Generates a simulated session token.
 * @returns {string} A mock token string
 */
function generateMockToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'mock-token-';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Returns a promise that resolves after the configured mock delay.
 * @returns {Promise<void>}
 */
function simulateDelay() {
  if (MOCK_DELAY_MS <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

/**
 * Builds a session object from a user record.
 * @param {import('../data/mockUsers.js').MockUser} user - The user record
 * @returns {Session} The session object
 */
function buildSession(user) {
  const token = generateMockToken();
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    portfolio: user.portfolio,
    applicationAccess: user.applicationAccess || [],
    token,
    loginAt: new Date().toISOString(),
  };
}

/**
 * Persists session data to localStorage.
 * @param {Session} session - The session to persist
 */
function persistSession(session) {
  setItem(STORAGE_KEYS.AUTH_TOKEN, session.token);
  setItem(STORAGE_KEYS.USER, {
    id: session.userId,
    username: session.email.split('@')[0],
    name: session.name,
    email: session.email,
    role: session.role,
  });
  setItem(STORAGE_KEYS.ROLE, session.role);
}

/**
 * Clears session data from localStorage.
 */
function clearSession() {
  removeItem(STORAGE_KEYS.AUTH_TOKEN);
  removeItem(STORAGE_KEYS.USER);
  removeItem(STORAGE_KEYS.ROLE);
}

/**
 * Authenticates a user with email and password (mock).
 * Validates credentials against the user repository.
 * The password is always 'mockpass' for simulation purposes.
 *
 * @param {string} email - The user's email address
 * @param {string} password - The user's password (must be 'mockpass')
 * @returns {Promise<LoginResult>} The login result with session or error
 */
export async function login(email, password) {
  await simulateDelay();

  if (!email || typeof email !== 'string') {
    return { success: false, session: null, error: 'Email is required.' };
  }

  if (!password || typeof password !== 'string') {
    return { success: false, session: null, error: 'Password is required.' };
  }

  if (password !== MOCK_PASSWORD) {
    return { success: false, session: null, error: 'Invalid credentials.' };
  }

  const user = getUserByEmail(email.trim().toLowerCase()) || getUserByEmail(email.trim());

  if (!user) {
    return { success: false, session: null, error: 'Invalid credentials.' };
  }

  if (user.status === 'inactive') {
    return { success: false, session: null, error: 'Account is inactive. Please contact an administrator.' };
  }

  if (user.status === 'suspended') {
    return { success: false, session: null, error: 'Account is suspended. Please contact an administrator.' };
  }

  const session = buildSession(user);
  persistSession(session);

  return { success: true, session, error: undefined };
}

/**
 * Logs out the current user by clearing session data from localStorage.
 * @returns {Promise<void>}
 */
export async function logout() {
  await simulateDelay();
  clearSession();
}

/**
 * Returns the current session from localStorage.
 * Returns null if no valid session exists.
 *
 * @returns {Session|null} The current session or null
 */
export function getSession() {
  const token = getItem(STORAGE_KEYS.AUTH_TOKEN, '');
  const user = getItem(STORAGE_KEYS.USER, null);
  const role = getItem(STORAGE_KEYS.ROLE, '');

  if (!token || !user || !role) {
    return null;
  }

  if (!user.id || !user.name || !user.email) {
    return null;
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role,
    portfolio: user.portfolio || '',
    applicationAccess: user.applicationAccess || (PERMISSIONS[role] || []),
    token,
    loginAt: user.loginAt || '',
  };
}

/**
 * Returns the current authenticated user object from the user repository.
 * Returns null if no session exists or user is not found.
 *
 * @returns {import('../data/mockUsers.js').MockUser|null} The current user or null
 */
export function getCurrentUser() {
  const session = getSession();
  if (!session) {
    return null;
  }

  const users = getUsers();
  return users.find((u) => u.id === session.userId) || null;
}

/**
 * Returns the current user's role key.
 * Returns null if no session exists.
 *
 * @returns {string|null} The role key or null
 */
export function getCurrentRole() {
  const session = getSession();
  return session ? session.role : null;
}

/**
 * Checks if the current session has access to a specific feature.
 *
 * @param {string} feature - The feature key from FEATURES constant
 * @returns {boolean} True if the current user has access to the feature
 */
export function checkAccess(feature) {
  if (!feature) {
    return false;
  }

  const session = getSession();
  if (!session) {
    return false;
  }

  const rolePermissions = PERMISSIONS[session.role];
  if (!rolePermissions) {
    return false;
  }

  return rolePermissions.includes(feature);
}

/**
 * Checks if a specific role has access to a specific feature.
 *
 * @param {string} roleName - The role key
 * @param {string} feature - The feature key from FEATURES constant
 * @returns {boolean} True if the role has access to the feature
 */
export function checkRoleAccess(roleName, feature) {
  if (!roleName || !feature) {
    return false;
  }

  const rolePermissions = PERMISSIONS[roleName];
  if (!rolePermissions) {
    return false;
  }

  return rolePermissions.includes(feature);
}

/**
 * Checks if the current session user has approval authority.
 *
 * @returns {boolean} True if the current user has approval authority
 */
export function hasApprovalAuthority() {
  const session = getSession();
  if (!session) {
    return false;
  }

  const role = getRoleByName(session.role);
  return role ? role.approvalAuthority : false;
}

/**
 * Checks if a valid session exists.
 *
 * @returns {boolean} True if a valid session exists
 */
export function isAuthenticated() {
  return getSession() !== null;
}

/**
 * Returns the default landing page for the current user's role.
 *
 * @returns {string} The default landing page path, or '/' if no session
 */
export function getDefaultLandingPage() {
  const session = getSession();
  if (!session) {
    return '/';
  }

  const role = getRoleByName(session.role);
  return role ? role.defaultLandingPage : '/';
}

/**
 * Returns the allowed navigation section keys for the current user's role.
 *
 * @returns {string[]} Array of navigation section keys, or empty array if no session
 */
export function getAllowedNavSections() {
  const session = getSession();
  if (!session) {
    return [];
  }

  const role = getRoleByName(session.role);
  return role ? role.allowedNavSections : [];
}

/**
 * Simulates a password reset for a user by email.
 * In this mock implementation, it simply validates the email exists.
 *
 * @param {string} email - The user's email address
 * @returns {Promise<{success: boolean, message: string}>} Result of the password reset request
 */
export async function requestPasswordReset(email) {
  await simulateDelay();

  if (!email || typeof email !== 'string') {
    return { success: false, message: 'Email is required.' };
  }

  const user = getUserByEmail(email.trim().toLowerCase()) || getUserByEmail(email.trim());

  if (!user) {
    // For security, return success even if user not found
    return { success: true, message: 'If the email exists, a password reset link has been sent.' };
  }

  return { success: true, message: 'If the email exists, a password reset link has been sent.' };
}

/**
 * Updates the stored session role (used when role is changed via admin).
 *
 * @param {string} newRole - The new role key
 * @returns {boolean} True if the role was updated successfully
 */
export function updateSessionRole(newRole) {
  if (!newRole) {
    return false;
  }

  const roleDefinition = getRoleByName(newRole);
  if (!roleDefinition) {
    return false;
  }

  const user = getItem(STORAGE_KEYS.USER, null);
  if (!user) {
    return false;
  }

  user.role = newRole;
  setItem(STORAGE_KEYS.USER, user);
  setItem(STORAGE_KEYS.ROLE, newRole);

  return true;
}
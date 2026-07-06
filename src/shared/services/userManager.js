/**
 * User Management Service (UserManager)
 * Manages user repository, access review, and PII-safe display.
 * All operations read/write localStorage.
 * @module userManager
 */

import { ROLES, PERMISSIONS, STORAGE_KEYS } from '../constants.js';
import { getItem, setItem } from './storage.js';
import { maskPII } from './storage.js';
import mockUsers from '../data/mockUsers.js';

/**
 * localStorage key for the user repository
 * @type {string}
 */
const USERS_STORAGE_KEY = 'kp_etsip_users';

/**
 * Loads users from localStorage, seeding from mock data if not present.
 * @returns {import('../data/mockUsers.js').MockUser[]} Array of user objects
 */
function loadUsers() {
  let users = getItem(USERS_STORAGE_KEY, null);
  if (!users || !Array.isArray(users) || users.length === 0) {
    users = JSON.parse(JSON.stringify(mockUsers));
    setItem(USERS_STORAGE_KEY, users);
  }
  return users;
}

/**
 * Persists the users array to localStorage.
 * @param {import('../data/mockUsers.js').MockUser[]} users - Array of user objects
 * @returns {boolean} True if persisted successfully
 */
function saveUsers(users) {
  return setItem(USERS_STORAGE_KEY, users);
}

/**
 * Returns all users from the repository.
 * @returns {import('../data/mockUsers.js').MockUser[]} Array of all user objects
 */
export function getUsers() {
  return loadUsers();
}

/**
 * Returns a single user by their unique identifier.
 * @param {string} id - The user id (e.g., 'user-001')
 * @returns {import('../data/mockUsers.js').MockUser|null} The user object or null if not found
 */
export function getUserById(id) {
  const users = loadUsers();
  return users.find((user) => user.id === id) || null;
}

/**
 * Returns a single user by their email address.
 * @param {string} email - The user email
 * @returns {import('../data/mockUsers.js').MockUser|null} The user object or null if not found
 */
export function getUserByEmail(email) {
  const users = loadUsers();
  return users.find((user) => user.email === email) || null;
}

/**
 * Returns all users matching a given role.
 * @param {string} role - The role key from ROLES constant
 * @returns {import('../data/mockUsers.js').MockUser[]} Array of matching user objects
 */
export function getUsersByRole(role) {
  const users = loadUsers();
  return users.filter((user) => user.role === role);
}

/**
 * Returns all active users.
 * @returns {import('../data/mockUsers.js').MockUser[]} Array of active user objects
 */
export function getActiveUsers() {
  const users = loadUsers();
  return users.filter((user) => user.status === 'active');
}

/**
 * Generates the next unique user id based on existing users.
 * @param {import('../data/mockUsers.js').MockUser[]} users - Current users array
 * @returns {string} Next user id (e.g., 'user-035')
 */
function generateNextUserId(users) {
  let maxNum = 0;
  for (const user of users) {
    const match = user.id.match(/^user-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `user-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Validates that a role key is a valid role from the ROLES constant.
 * @param {string} role - The role key to validate
 * @returns {boolean} True if the role is valid
 */
function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

/**
 * Adds a new user to the repository.
 * @param {Object} user - The user object to add
 * @param {string} user.name - Full name (fake PII)
 * @param {string} user.email - Email address (fake PII)
 * @param {string} user.role - Role key from ROLES constant
 * @param {string} [user.portfolio] - Department or portfolio assignment
 * @param {string[]} [user.applicationAccess] - List of feature access keys
 * @param {string} [user.status] - Account status (defaults to 'active')
 * @param {Object} [user.notificationPrefs] - Notification preferences
 * @returns {import('../data/mockUsers.js').MockUser} The newly created user object
 * @throws {Error} If required fields are missing or role is invalid
 */
export function addUser(user) {
  if (!user || !user.name || !user.email || !user.role) {
    throw new Error('User must have name, email, and role fields.');
  }

  if (!isValidRole(user.role)) {
    throw new Error(`Invalid role: ${user.role}. Must be one of the defined roles.`);
  }

  const users = loadUsers();

  const existingByEmail = users.find((u) => u.email === user.email);
  if (existingByEmail) {
    throw new Error(`A user with email ${user.email} already exists.`);
  }

  const permissions = PERMISSIONS[user.role] || [];

  const newUser = {
    id: generateNextUserId(users),
    name: user.name,
    email: user.email,
    role: user.role,
    portfolio: user.portfolio || '',
    applicationAccess: user.applicationAccess || [...permissions],
    status: user.status || 'active',
    lastLogin: '',
    notificationPrefs: user.notificationPrefs || { email: true, teams: false, inApp: true },
  };

  users.push(newUser);
  saveUsers(users);

  return newUser;
}

/**
 * Updates an existing user's fields.
 * @param {string} id - The user id to update
 * @param {Object} updates - Partial user object with fields to update
 * @returns {import('../data/mockUsers.js').MockUser} The updated user object
 * @throws {Error} If user is not found or role is invalid
 */
export function updateUser(id, updates) {
  if (!id) {
    throw new Error('User id is required.');
  }

  if (!updates || typeof updates !== 'object') {
    throw new Error('Updates must be a non-null object.');
  }

  const users = loadUsers();
  const index = users.findIndex((user) => user.id === id);

  if (index === -1) {
    throw new Error(`User with id ${id} not found.`);
  }

  if (updates.role !== undefined && !isValidRole(updates.role)) {
    throw new Error(`Invalid role: ${updates.role}. Must be one of the defined roles.`);
  }

  if (updates.email !== undefined) {
    const existingByEmail = users.find((u) => u.email === updates.email && u.id !== id);
    if (existingByEmail) {
      throw new Error(`A user with email ${updates.email} already exists.`);
    }
  }

  // Do not allow overwriting the id
  const { id: _ignoredId, ...safeUpdates } = updates;

  // If role is being changed, update applicationAccess to match new role permissions
  if (safeUpdates.role && safeUpdates.role !== users[index].role && !safeUpdates.applicationAccess) {
    safeUpdates.applicationAccess = [...(PERMISSIONS[safeUpdates.role] || [])];
  }

  users[index] = { ...users[index], ...safeUpdates };
  saveUsers(users);

  return users[index];
}

/**
 * Deactivates a user by setting their status to 'inactive'.
 * @param {string} id - The user id to deactivate
 * @returns {import('../data/mockUsers.js').MockUser} The deactivated user object
 * @throws {Error} If user is not found
 */
export function deactivateUser(id) {
  return updateUser(id, {
    status: 'inactive',
    notificationPrefs: { email: false, teams: false, inApp: false },
  });
}

/**
 * Suspends a user by setting their status to 'suspended'.
 * @param {string} id - The user id to suspend
 * @returns {import('../data/mockUsers.js').MockUser} The suspended user object
 * @throws {Error} If user is not found
 */
export function suspendUser(id) {
  return updateUser(id, {
    status: 'suspended',
    notificationPrefs: { email: false, teams: false, inApp: false },
  });
}

/**
 * Reactivates a user by setting their status to 'active'.
 * @param {string} id - The user id to reactivate
 * @returns {import('../data/mockUsers.js').MockUser} The reactivated user object
 * @throws {Error} If user is not found
 */
export function reactivateUser(id) {
  return updateUser(id, { status: 'active' });
}

/**
 * Masks PII fields in a user object for safe display or logging.
 * Uses the storage module's maskPII utility for consistent masking.
 * @param {import('../data/mockUsers.js').MockUser} user - The user object to mask
 * @returns {Object} A copy of the user with PII fields masked
 */
export function maskUserPII(user) {
  if (!user) {
    return null;
  }
  return maskPII(user);
}

/**
 * Reviews a user's access by comparing their applicationAccess
 * against the permissions defined for their current role.
 * Returns an object describing the access review result.
 * @param {string} userId - The user id to review
 * @returns {Object} Access review result
 * @property {string} userId - The user id
 * @property {string} role - The user's current role
 * @property {string[]} grantedPermissions - Permissions the role grants
 * @property {string[]} currentAccess - The user's current applicationAccess
 * @property {string[]} excessAccess - Access keys the user has beyond their role permissions
 * @property {string[]} missingAccess - Permission keys the role grants but the user lacks
 * @property {boolean} compliant - Whether the user's access matches their role permissions
 * @property {string} reviewedAt - ISO 8601 timestamp of the review
 * @throws {Error} If user is not found
 */
export function reviewAccess(userId) {
  const user = getUserById(userId);
  if (!user) {
    throw new Error(`User with id ${userId} not found.`);
  }

  const grantedPermissions = PERMISSIONS[user.role] || [];
  const currentAccess = user.applicationAccess || [];

  const grantedSet = new Set(grantedPermissions);
  const currentSet = new Set(currentAccess);

  const excessAccess = currentAccess.filter((key) => !grantedSet.has(key));
  const missingAccess = grantedPermissions.filter((key) => !currentSet.has(key));

  return {
    userId: user.id,
    role: user.role,
    grantedPermissions: [...grantedPermissions],
    currentAccess: [...currentAccess],
    excessAccess,
    missingAccess,
    compliant: excessAccess.length === 0 && missingAccess.length === 0,
    reviewedAt: new Date().toISOString(),
  };
}

/**
 * Synchronizes a user's applicationAccess to match their role's permissions.
 * Useful after an access review finds non-compliance.
 * @param {string} userId - The user id to synchronize
 * @returns {import('../data/mockUsers.js').MockUser} The updated user object
 * @throws {Error} If user is not found
 */
export function syncUserAccess(userId) {
  const user = getUserById(userId);
  if (!user) {
    throw new Error(`User with id ${userId} not found.`);
  }

  const permissions = PERMISSIONS[user.role] || [];
  return updateUser(userId, { applicationAccess: [...permissions] });
}

/**
 * Returns a count summary of users by status.
 * @returns {Object} Summary object with counts
 * @property {number} total - Total number of users
 * @property {number} active - Number of active users
 * @property {number} inactive - Number of inactive users
 * @property {number} suspended - Number of suspended users
 */
export function getUserStatusSummary() {
  const users = loadUsers();
  return {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
    suspended: users.filter((u) => u.status === 'suspended').length,
  };
}

/**
 * Returns a count summary of users grouped by role.
 * @returns {Object.<string, number>} Object mapping role keys to user counts
 */
export function getUserCountByRole() {
  const users = loadUsers();
  const counts = {};
  for (const user of users) {
    counts[user.role] = (counts[user.role] || 0) + 1;
  }
  return counts;
}

/**
 * Exports all user data with PII masked for safe reporting.
 * @returns {Object[]} Array of masked user objects
 */
export function exportMaskedUsers() {
  const users = loadUsers();
  return users.map((user) => maskPII(user));
}

/**
 * Resets the user repository to the original mock data.
 * Useful for testing or resetting the application state.
 * @returns {boolean} True if reset was successful
 */
export function resetUserRepository() {
  const freshUsers = JSON.parse(JSON.stringify(mockUsers));
  return saveUsers(freshUsers);
}
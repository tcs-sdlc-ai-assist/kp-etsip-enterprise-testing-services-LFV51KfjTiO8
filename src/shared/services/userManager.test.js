import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for UserManager
 * Tests getUsers, getUserById, getUserByEmail, addUser, updateUser,
 * deactivateUser, suspendUser, reactivateUser, maskUserPII, reviewAccess,
 * syncUserAccess, getUserStatusSummary, getUserCountByRole, resetUserRepository.
 * @module userManager.test
 */

// Mock storage module before importing userManager
vi.mock('./storage.js', () => {
  const store = {};
  return {
    getItem: vi.fn((key, defaultValue) => {
      if (store[key] !== undefined) {
        return JSON.parse(JSON.stringify(store[key]));
      }
      return defaultValue;
    }),
    setItem: vi.fn((key, value) => {
      store[key] = JSON.parse(JSON.stringify(value));
      return true;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
      return true;
    }),
    maskPII: vi.fn((obj) => {
      if (obj === null || obj === undefined) {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map((item) => {
          if (typeof item === 'object' && item !== null) {
            const masked = { ...item };
            if (masked.email && typeof masked.email === 'string') {
              masked.email = masked.email.charAt(0) + '***' + masked.email.charAt(masked.email.length - 1);
            }
            if (masked.name && typeof masked.name === 'string') {
              masked.name = masked.name.charAt(0) + '***' + masked.name.charAt(masked.name.length - 1);
            }
            return masked;
          }
          return item;
        });
      }
      if (typeof obj === 'object') {
        const masked = { ...obj };
        if (masked.email && typeof masked.email === 'string') {
          masked.email = masked.email.charAt(0) + '***' + masked.email.charAt(masked.email.length - 1);
        }
        if (masked.name && typeof masked.name === 'string') {
          masked.name = masked.name.charAt(0) + '***' + masked.name.charAt(masked.name.length - 1);
        }
        return masked;
      }
      return obj;
    }),
    initializeStorage: vi.fn(() => true),
    resetAll: vi.fn(() => true),
    clearAll: vi.fn(() => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
      return true;
    }),
    _store: store,
  };
});

import {
  getUsers,
  getUserById,
  getUserByEmail,
  getUsersByRole,
  getActiveUsers,
  addUser,
  updateUser,
  deactivateUser,
  suspendUser,
  reactivateUser,
  maskUserPII,
  reviewAccess,
  syncUserAccess,
  getUserStatusSummary,
  getUserCountByRole,
  exportMaskedUsers,
  resetUserRepository,
} from './userManager.js';

import { _store } from './storage.js';

describe('UserManager', () => {
  beforeEach(() => {
    // Clear the mock store before each test
    for (const key of Object.keys(_store)) {
      delete _store[key];
    }
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // getUsers
  // -------------------------------------------------------------------------
  describe('getUsers', () => {
    it('returns all users as an array', () => {
      const users = getUsers();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });

    it('returns users with expected fields', () => {
      const users = getUsers();
      const user = users[0];
      expect(user.id).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.status).toBeDefined();
      expect(user.applicationAccess).toBeDefined();
      expect(Array.isArray(user.applicationAccess)).toBe(true);
    });

    it('returns users with notification preferences', () => {
      const users = getUsers();
      const user = users[0];
      expect(user.notificationPrefs).toBeDefined();
      expect(typeof user.notificationPrefs.email).toBe('boolean');
      expect(typeof user.notificationPrefs.teams).toBe('boolean');
      expect(typeof user.notificationPrefs.inApp).toBe('boolean');
    });

    it('returns consistent data on multiple calls', () => {
      const users1 = getUsers();
      const users2 = getUsers();
      expect(users1.length).toBe(users2.length);
      expect(users1[0].id).toBe(users2[0].id);
    });
  });

  // -------------------------------------------------------------------------
  // getUserById
  // -------------------------------------------------------------------------
  describe('getUserById', () => {
    it('returns the correct user by id', () => {
      const user = getUserById('user-001');
      expect(user).toBeDefined();
      expect(user).not.toBeNull();
      expect(user.id).toBe('user-001');
      expect(user.name).toBe('Amelia Shikongo');
      expect(user.email).toBe('amelia.shikongo@kp-etsip.gov');
      expect(user.role).toBe('admin');
    });

    it('returns a different user by id', () => {
      const user = getUserById('user-002');
      expect(user).toBeDefined();
      expect(user).not.toBeNull();
      expect(user.id).toBe('user-002');
      expect(user.name).toBe('Johannes Hamutenya');
      expect(user.role).toBe('viewer');
    });

    it('returns null for non-existent user id', () => {
      const user = getUserById('user-999');
      expect(user).toBeNull();
    });

    it('returns null for empty id', () => {
      const user = getUserById('');
      expect(user).toBeNull();
    });

    it('returns null for undefined id', () => {
      const user = getUserById(undefined);
      expect(user).toBeNull();
    });

    it('returns null for null id', () => {
      const user = getUserById(null);
      expect(user).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getUserByEmail
  // -------------------------------------------------------------------------
  describe('getUserByEmail', () => {
    it('returns the correct user by email', () => {
      const user = getUserByEmail('amelia.shikongo@kp-etsip.gov');
      expect(user).toBeDefined();
      expect(user).not.toBeNull();
      expect(user.id).toBe('user-001');
      expect(user.name).toBe('Amelia Shikongo');
    });

    it('returns null for non-existent email', () => {
      const user = getUserByEmail('nonexistent@kp-etsip.gov');
      expect(user).toBeNull();
    });

    it('returns null for empty email', () => {
      const user = getUserByEmail('');
      expect(user).toBeNull();
    });

    it('returns null for undefined email', () => {
      const user = getUserByEmail(undefined);
      expect(user).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getUsersByRole
  // -------------------------------------------------------------------------
  describe('getUsersByRole', () => {
    it('returns users matching a given role', () => {
      const admins = getUsersByRole('admin');
      expect(Array.isArray(admins)).toBe(true);
      expect(admins.length).toBeGreaterThan(0);

      for (const user of admins) {
        expect(user.role).toBe('admin');
      }
    });

    it('returns empty array for non-existent role', () => {
      const users = getUsersByRole('nonexistent_role');
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBe(0);
    });

    it('returns multiple users for roles with multiple users', () => {
      const regionalDirectors = getUsersByRole('regional_director');
      expect(regionalDirectors.length).toBeGreaterThan(1);
    });
  });

  // -------------------------------------------------------------------------
  // getActiveUsers
  // -------------------------------------------------------------------------
  describe('getActiveUsers', () => {
    it('returns only active users', () => {
      const activeUsers = getActiveUsers();
      expect(Array.isArray(activeUsers)).toBe(true);
      expect(activeUsers.length).toBeGreaterThan(0);

      for (const user of activeUsers) {
        expect(user.status).toBe('active');
      }
    });

    it('does not include inactive or suspended users', () => {
      const activeUsers = getActiveUsers();
      const allUsers = getUsers();

      const inactiveUsers = allUsers.filter((u) => u.status !== 'active');
      expect(inactiveUsers.length).toBeGreaterThan(0);

      for (const inactiveUser of inactiveUsers) {
        const found = activeUsers.find((u) => u.id === inactiveUser.id);
        expect(found).toBeUndefined();
      }
    });
  });

  // -------------------------------------------------------------------------
  // addUser
  // -------------------------------------------------------------------------
  describe('addUser', () => {
    it('creates a new user and persists it', () => {
      const newUser = addUser({
        name: 'Test User',
        email: 'testuser@kp-etsip.gov',
        role: 'viewer',
        portfolio: 'Test Portfolio',
      });

      expect(newUser).toBeDefined();
      expect(newUser.id).toBeDefined();
      expect(newUser.name).toBe('Test User');
      expect(newUser.email).toBe('testuser@kp-etsip.gov');
      expect(newUser.role).toBe('viewer');
      expect(newUser.portfolio).toBe('Test Portfolio');
      expect(newUser.status).toBe('active');
      expect(newUser.applicationAccess).toBeDefined();
      expect(Array.isArray(newUser.applicationAccess)).toBe(true);
      expect(newUser.applicationAccess.length).toBeGreaterThan(0);
      expect(newUser.notificationPrefs).toBeDefined();
      expect(newUser.notificationPrefs.email).toBe(true);
      expect(newUser.notificationPrefs.teams).toBe(false);
      expect(newUser.notificationPrefs.inApp).toBe(true);

      // Verify persistence
      const fetched = getUserById(newUser.id);
      expect(fetched).toBeDefined();
      expect(fetched.name).toBe('Test User');
      expect(fetched.email).toBe('testuser@kp-etsip.gov');
    });

    it('assigns applicationAccess based on role permissions', () => {
      const newUser = addUser({
        name: 'Admin User',
        email: 'adminuser@kp-etsip.gov',
        role: 'admin',
      });

      expect(newUser.applicationAccess).toBeDefined();
      expect(newUser.applicationAccess.length).toBeGreaterThan(0);
      expect(newUser.applicationAccess).toContain('dashboard');
      expect(newUser.applicationAccess).toContain('user_management');
      expect(newUser.applicationAccess).toContain('settings');
    });

    it('assigns default values for optional fields', () => {
      const newUser = addUser({
        name: 'Minimal User',
        email: 'minimal@kp-etsip.gov',
        role: 'viewer',
      });

      expect(newUser.portfolio).toBe('');
      expect(newUser.status).toBe('active');
      expect(newUser.lastLogin).toBe('');
    });

    it('uses custom applicationAccess when provided', () => {
      const customAccess = ['dashboard', 'reports'];
      const newUser = addUser({
        name: 'Custom Access User',
        email: 'customaccess@kp-etsip.gov',
        role: 'viewer',
        applicationAccess: customAccess,
      });

      expect(newUser.applicationAccess).toEqual(customAccess);
    });

    it('uses custom notification preferences when provided', () => {
      const customPrefs = { email: false, teams: true, inApp: false };
      const newUser = addUser({
        name: 'Custom Prefs User',
        email: 'customprefs@kp-etsip.gov',
        role: 'viewer',
        notificationPrefs: customPrefs,
      });

      expect(newUser.notificationPrefs).toEqual(customPrefs);
    });

    it('generates a unique id for each new user', () => {
      const user1 = addUser({
        name: 'User One',
        email: 'userone@kp-etsip.gov',
        role: 'viewer',
      });

      const user2 = addUser({
        name: 'User Two',
        email: 'usertwo@kp-etsip.gov',
        role: 'viewer',
      });

      expect(user1.id).not.toBe(user2.id);
    });

    it('throws error when name is missing', () => {
      expect(() => {
        addUser({ email: 'test@kp-etsip.gov', role: 'viewer' });
      }).toThrow('must have name, email, and role');
    });

    it('throws error when email is missing', () => {
      expect(() => {
        addUser({ name: 'Test', role: 'viewer' });
      }).toThrow('must have name, email, and role');
    });

    it('throws error when role is missing', () => {
      expect(() => {
        addUser({ name: 'Test', email: 'test@kp-etsip.gov' });
      }).toThrow('must have name, email, and role');
    });

    it('throws error when input is null', () => {
      expect(() => {
        addUser(null);
      }).toThrow();
    });

    it('throws error when input is undefined', () => {
      expect(() => {
        addUser(undefined);
      }).toThrow();
    });

    it('throws error for invalid role', () => {
      expect(() => {
        addUser({
          name: 'Test',
          email: 'test@kp-etsip.gov',
          role: 'invalid_role_xyz',
        });
      }).toThrow('Invalid role');
    });

    it('throws error for duplicate email', () => {
      expect(() => {
        addUser({
          name: 'Duplicate Email',
          email: 'amelia.shikongo@kp-etsip.gov',
          role: 'viewer',
        });
      }).toThrow('already exists');
    });
  });

  // -------------------------------------------------------------------------
  // updateUser
  // -------------------------------------------------------------------------
  describe('updateUser', () => {
    it('updates user fields correctly', () => {
      const updated = updateUser('user-002', {
        name: 'Updated Johannes',
        portfolio: 'Updated Portfolio',
      });

      expect(updated).toBeDefined();
      expect(updated.id).toBe('user-002');
      expect(updated.name).toBe('Updated Johannes');
      expect(updated.portfolio).toBe('Updated Portfolio');
      // Other fields should remain unchanged
      expect(updated.email).toBe('johannes.hamutenya@kp-etsip.gov');
      expect(updated.role).toBe('viewer');
    });

    it('updates user role and syncs applicationAccess', () => {
      const original = getUserById('user-002');
      expect(original.role).toBe('viewer');

      const updated = updateUser('user-002', {
        role: 'editor',
      });

      expect(updated.role).toBe('editor');
      expect(updated.applicationAccess).toBeDefined();
      expect(updated.applicationAccess).toContain('data_entry');
    });

    it('does not overwrite the id field', () => {
      const updated = updateUser('user-002', {
        id: 'user-999',
        name: 'Attempted ID Override',
      });

      expect(updated.id).toBe('user-002');
      expect(updated.name).toBe('Attempted ID Override');
    });

    it('persists the updated user to localStorage', () => {
      updateUser('user-002', { name: 'Persisted Name' });

      const fetched = getUserById('user-002');
      expect(fetched.name).toBe('Persisted Name');
    });

    it('updates status field', () => {
      const updated = updateUser('user-002', { status: 'inactive' });
      expect(updated.status).toBe('inactive');
    });

    it('updates notification preferences', () => {
      const updated = updateUser('user-002', {
        notificationPrefs: { email: false, teams: true, inApp: false },
      });

      expect(updated.notificationPrefs.email).toBe(false);
      expect(updated.notificationPrefs.teams).toBe(true);
      expect(updated.notificationPrefs.inApp).toBe(false);
    });

    it('throws error for non-existent user', () => {
      expect(() => {
        updateUser('user-999', { name: 'Test' });
      }).toThrow('not found');
    });

    it('throws error when id is missing', () => {
      expect(() => {
        updateUser('', { name: 'Test' });
      }).toThrow('User id is required');
    });

    it('throws error when id is null', () => {
      expect(() => {
        updateUser(null, { name: 'Test' });
      }).toThrow('User id is required');
    });

    it('throws error when updates is not an object', () => {
      expect(() => {
        updateUser('user-002', null);
      }).toThrow('Updates must be a non-null object');
    });

    it('throws error for invalid role in updates', () => {
      expect(() => {
        updateUser('user-002', { role: 'invalid_role_xyz' });
      }).toThrow('Invalid role');
    });

    it('throws error for duplicate email in updates', () => {
      expect(() => {
        updateUser('user-002', { email: 'amelia.shikongo@kp-etsip.gov' });
      }).toThrow('already exists');
    });

    it('allows updating email to the same email (no duplicate error)', () => {
      const updated = updateUser('user-002', {
        email: 'johannes.hamutenya@kp-etsip.gov',
      });
      expect(updated.email).toBe('johannes.hamutenya@kp-etsip.gov');
    });

    it('preserves applicationAccess when role is not changed', () => {
      const original = getUserById('user-002');
      const originalAccess = [...original.applicationAccess];

      const updated = updateUser('user-002', { name: 'Name Only Update' });
      expect(updated.applicationAccess).toEqual(originalAccess);
    });
  });

  // -------------------------------------------------------------------------
  // deactivateUser
  // -------------------------------------------------------------------------
  describe('deactivateUser', () => {
    it('sets user status to inactive', () => {
      const deactivated = deactivateUser('user-002');
      expect(deactivated).toBeDefined();
      expect(deactivated.id).toBe('user-002');
      expect(deactivated.status).toBe('inactive');
    });

    it('disables all notification preferences', () => {
      const deactivated = deactivateUser('user-002');
      expect(deactivated.notificationPrefs.email).toBe(false);
      expect(deactivated.notificationPrefs.teams).toBe(false);
      expect(deactivated.notificationPrefs.inApp).toBe(false);
    });

    it('persists the deactivated state', () => {
      deactivateUser('user-002');
      const fetched = getUserById('user-002');
      expect(fetched.status).toBe('inactive');
    });

    it('throws error for non-existent user', () => {
      expect(() => {
        deactivateUser('user-999');
      }).toThrow('not found');
    });
  });

  // -------------------------------------------------------------------------
  // suspendUser
  // -------------------------------------------------------------------------
  describe('suspendUser', () => {
    it('sets user status to suspended', () => {
      const suspended = suspendUser('user-002');
      expect(suspended).toBeDefined();
      expect(suspended.id).toBe('user-002');
      expect(suspended.status).toBe('suspended');
    });

    it('disables all notification preferences', () => {
      const suspended = suspendUser('user-002');
      expect(suspended.notificationPrefs.email).toBe(false);
      expect(suspended.notificationPrefs.teams).toBe(false);
      expect(suspended.notificationPrefs.inApp).toBe(false);
    });

    it('persists the suspended state', () => {
      suspendUser('user-002');
      const fetched = getUserById('user-002');
      expect(fetched.status).toBe('suspended');
    });

    it('throws error for non-existent user', () => {
      expect(() => {
        suspendUser('user-999');
      }).toThrow('not found');
    });
  });

  // -------------------------------------------------------------------------
  // reactivateUser
  // -------------------------------------------------------------------------
  describe('reactivateUser', () => {
    it('sets user status back to active', () => {
      // First deactivate
      deactivateUser('user-002');
      const deactivated = getUserById('user-002');
      expect(deactivated.status).toBe('inactive');

      // Then reactivate
      const reactivated = reactivateUser('user-002');
      expect(reactivated).toBeDefined();
      expect(reactivated.id).toBe('user-002');
      expect(reactivated.status).toBe('active');
    });

    it('reactivates a suspended user', () => {
      suspendUser('user-002');
      const suspended = getUserById('user-002');
      expect(suspended.status).toBe('suspended');

      const reactivated = reactivateUser('user-002');
      expect(reactivated.status).toBe('active');
    });

    it('persists the reactivated state', () => {
      deactivateUser('user-002');
      reactivateUser('user-002');
      const fetched = getUserById('user-002');
      expect(fetched.status).toBe('active');
    });

    it('throws error for non-existent user', () => {
      expect(() => {
        reactivateUser('user-999');
      }).toThrow('not found');
    });
  });

  // -------------------------------------------------------------------------
  // maskUserPII
  // -------------------------------------------------------------------------
  describe('maskUserPII', () => {
    it('masks sensitive fields in a user object', () => {
      const user = getUserById('user-001');
      const masked = maskUserPII(user);

      expect(masked).toBeDefined();
      expect(masked).not.toBeNull();
      // The masked name should not equal the original full name
      expect(masked.name).not.toBe(user.name);
      // The masked email should not equal the original full email
      expect(masked.email).not.toBe(user.email);
      // The masked values should contain asterisks
      expect(masked.name).toContain('***');
      expect(masked.email).toContain('***');
    });

    it('preserves non-PII fields', () => {
      const user = getUserById('user-001');
      const masked = maskUserPII(user);

      expect(masked.id).toBe(user.id);
      expect(masked.role).toBe(user.role);
      expect(masked.status).toBe(user.status);
    });

    it('returns null for null input', () => {
      const result = maskUserPII(null);
      expect(result).toBeNull();
    });

    it('returns undefined for undefined input', () => {
      const result = maskUserPII(undefined);
      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // reviewAccess
  // -------------------------------------------------------------------------
  describe('reviewAccess', () => {
    it('returns a compliant review for a user with correct access', () => {
      // First sync the user's access to ensure compliance
      syncUserAccess('user-001');

      const review = reviewAccess('user-001');
      expect(review).toBeDefined();
      expect(review.userId).toBe('user-001');
      expect(review.role).toBe('admin');
      expect(review.grantedPermissions).toBeDefined();
      expect(Array.isArray(review.grantedPermissions)).toBe(true);
      expect(review.grantedPermissions.length).toBeGreaterThan(0);
      expect(review.currentAccess).toBeDefined();
      expect(Array.isArray(review.currentAccess)).toBe(true);
      expect(review.excessAccess).toBeDefined();
      expect(Array.isArray(review.excessAccess)).toBe(true);
      expect(review.missingAccess).toBeDefined();
      expect(Array.isArray(review.missingAccess)).toBe(true);
      expect(typeof review.compliant).toBe('boolean');
      expect(review.reviewedAt).toBeDefined();
    });

    it('detects excess access when user has extra permissions', () => {
      // Add extra access to a user
      updateUser('user-002', {
        applicationAccess: ['dashboard', 'programmes', 'projects', 'indicators', 'reports', 'analytics', 'notifications', 'user_management'],
      });

      const review = reviewAccess('user-002');
      expect(review.excessAccess.length).toBeGreaterThan(0);
      expect(review.excessAccess).toContain('user_management');
      expect(review.compliant).toBe(false);
    });

    it('detects missing access when user lacks permissions', () => {
      // Remove some access from a user
      updateUser('user-002', {
        applicationAccess: ['dashboard'],
      });

      const review = reviewAccess('user-002');
      expect(review.missingAccess.length).toBeGreaterThan(0);
      expect(review.compliant).toBe(false);
    });

    it('returns compliant true when access matches role permissions exactly', () => {
      syncUserAccess('user-002');
      const review = reviewAccess('user-002');
      expect(review.compliant).toBe(true);
      expect(review.excessAccess.length).toBe(0);
      expect(review.missingAccess.length).toBe(0);
    });

    it('throws error for non-existent user', () => {
      expect(() => {
        reviewAccess('user-999');
      }).toThrow('not found');
    });

    it('includes a reviewedAt timestamp', () => {
      const review = reviewAccess('user-001');
      expect(review.reviewedAt).toBeDefined();
      const date = new Date(review.reviewedAt);
      expect(isNaN(date.getTime())).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // syncUserAccess
  // -------------------------------------------------------------------------
  describe('syncUserAccess', () => {
    it('synchronizes user access to match role permissions', () => {
      // First give the user incorrect access
      updateUser('user-002', {
        applicationAccess: ['dashboard', 'user_management'],
      });

      // Verify it's non-compliant
      const reviewBefore = reviewAccess('user-002');
      expect(reviewBefore.compliant).toBe(false);

      // Sync access
      const synced = syncUserAccess('user-002');
      expect(synced).toBeDefined();
      expect(synced.id).toBe('user-002');

      // Verify it's now compliant
      const reviewAfter = reviewAccess('user-002');
      expect(reviewAfter.compliant).toBe(true);
      expect(reviewAfter.excessAccess.length).toBe(0);
      expect(reviewAfter.missingAccess.length).toBe(0);
    });

    it('persists the synced access', () => {
      updateUser('user-002', { applicationAccess: ['dashboard'] });
      syncUserAccess('user-002');

      const fetched = getUserById('user-002');
      const review = reviewAccess('user-002');
      expect(review.compliant).toBe(true);
    });

    it('throws error for non-existent user', () => {
      expect(() => {
        syncUserAccess('user-999');
      }).toThrow('not found');
    });
  });

  // -------------------------------------------------------------------------
  // getUserStatusSummary
  // -------------------------------------------------------------------------
  describe('getUserStatusSummary', () => {
    it('returns a summary with total, active, inactive, and suspended counts', () => {
      const summary = getUserStatusSummary();
      expect(summary).toBeDefined();
      expect(typeof summary.total).toBe('number');
      expect(typeof summary.active).toBe('number');
      expect(typeof summary.inactive).toBe('number');
      expect(typeof summary.suspended).toBe('number');
    });

    it('returns counts that sum to total', () => {
      const summary = getUserStatusSummary();
      const sum = summary.active + summary.inactive + summary.suspended;
      expect(sum).toBe(summary.total);
    });

    it('returns positive total count', () => {
      const summary = getUserStatusSummary();
      expect(summary.total).toBeGreaterThan(0);
    });

    it('returns positive active count', () => {
      const summary = getUserStatusSummary();
      expect(summary.active).toBeGreaterThan(0);
    });

    it('includes inactive users in the count', () => {
      const summary = getUserStatusSummary();
      // Mock data has at least one inactive user
      expect(summary.inactive).toBeGreaterThan(0);
    });

    it('includes suspended users in the count', () => {
      const summary = getUserStatusSummary();
      // Mock data has at least one suspended user
      expect(summary.suspended).toBeGreaterThan(0);
    });

    it('reflects changes after deactivating a user', () => {
      const summaryBefore = getUserStatusSummary();
      const activeBefore = summaryBefore.active;
      const inactiveBefore = summaryBefore.inactive;

      // Find an active user to deactivate
      const activeUsers = getActiveUsers();
      expect(activeUsers.length).toBeGreaterThan(0);
      deactivateUser(activeUsers[0].id);

      const summaryAfter = getUserStatusSummary();
      expect(summaryAfter.active).toBe(activeBefore - 1);
      expect(summaryAfter.inactive).toBe(inactiveBefore + 1);
      expect(summaryAfter.total).toBe(summaryBefore.total);
    });
  });

  // -------------------------------------------------------------------------
  // getUserCountByRole
  // -------------------------------------------------------------------------
  describe('getUserCountByRole', () => {
    it('returns an object mapping role keys to user counts', () => {
      const counts = getUserCountByRole();
      expect(typeof counts).toBe('object');
      expect(Object.keys(counts).length).toBeGreaterThan(0);
    });

    it('returns positive counts for known roles', () => {
      const counts = getUserCountByRole();
      expect(counts['admin']).toBeGreaterThan(0);
      expect(counts['viewer']).toBeGreaterThan(0);
    });

    it('counts sum to total number of users', () => {
      const counts = getUserCountByRole();
      const totalFromCounts = Object.values(counts).reduce((sum, count) => sum + count, 0);
      const allUsers = getUsers();
      expect(totalFromCounts).toBe(allUsers.length);
    });

    it('reflects changes after adding a user', () => {
      const countsBefore = getUserCountByRole();
      const viewerCountBefore = countsBefore['viewer'] || 0;

      addUser({
        name: 'New Viewer',
        email: 'newviewer@kp-etsip.gov',
        role: 'viewer',
      });

      const countsAfter = getUserCountByRole();
      expect(countsAfter['viewer']).toBe(viewerCountBefore + 1);
    });
  });

  // -------------------------------------------------------------------------
  // exportMaskedUsers
  // -------------------------------------------------------------------------
  describe('exportMaskedUsers', () => {
    it('returns an array of masked user objects', () => {
      const maskedUsers = exportMaskedUsers();
      expect(Array.isArray(maskedUsers)).toBe(true);
      expect(maskedUsers.length).toBeGreaterThan(0);
    });

    it('masks PII fields in exported users', () => {
      const maskedUsers = exportMaskedUsers();
      const firstUser = maskedUsers[0];

      expect(firstUser.name).toContain('***');
      expect(firstUser.email).toContain('***');
    });

    it('preserves non-PII fields in exported users', () => {
      const maskedUsers = exportMaskedUsers();
      const firstUser = maskedUsers[0];

      expect(firstUser.id).toBeDefined();
      expect(firstUser.role).toBeDefined();
      expect(firstUser.status).toBeDefined();
    });

    it('returns the same number of users as getUsers', () => {
      const maskedUsers = exportMaskedUsers();
      const allUsers = getUsers();
      expect(maskedUsers.length).toBe(allUsers.length);
    });
  });

  // -------------------------------------------------------------------------
  // resetUserRepository
  // -------------------------------------------------------------------------
  describe('resetUserRepository', () => {
    it('resets users to original mock data', () => {
      // Modify a user
      updateUser('user-001', { name: 'Modified Name' });
      const modified = getUserById('user-001');
      expect(modified.name).toBe('Modified Name');

      // Reset
      const result = resetUserRepository();
      expect(result).toBe(true);

      // Verify reset
      const reset = getUserById('user-001');
      expect(reset.name).toBe('Amelia Shikongo');
    });

    it('removes added users after reset', () => {
      const newUser = addUser({
        name: 'Temporary User',
        email: 'temporary@kp-etsip.gov',
        role: 'viewer',
      });

      const beforeReset = getUserById(newUser.id);
      expect(beforeReset).toBeDefined();

      resetUserRepository();

      const afterReset = getUserById(newUser.id);
      expect(afterReset).toBeNull();
    });

    it('restores deactivated users to original status', () => {
      deactivateUser('user-002');
      const deactivated = getUserById('user-002');
      expect(deactivated.status).toBe('inactive');

      resetUserRepository();

      const restored = getUserById('user-002');
      expect(restored.status).toBe('active');
    });

    it('restores the original user count', () => {
      const originalCount = getUsers().length;

      addUser({
        name: 'Extra User',
        email: 'extra@kp-etsip.gov',
        role: 'viewer',
      });

      expect(getUsers().length).toBe(originalCount + 1);

      resetUserRepository();

      expect(getUsers().length).toBe(originalCount);
    });
  });

  // -------------------------------------------------------------------------
  // Full User Lifecycle
  // -------------------------------------------------------------------------
  describe('Full User Lifecycle', () => {
    it('creates, updates, deactivates, reactivates, and reviews a user', () => {
      // Create
      const newUser = addUser({
        name: 'Lifecycle User',
        email: 'lifecycle@kp-etsip.gov',
        role: 'editor',
        portfolio: 'Test Portfolio',
      });
      expect(newUser.status).toBe('active');
      expect(newUser.role).toBe('editor');

      // Update
      const updated = updateUser(newUser.id, {
        portfolio: 'Updated Portfolio',
      });
      expect(updated.portfolio).toBe('Updated Portfolio');

      // Review access
      syncUserAccess(newUser.id);
      const review = reviewAccess(newUser.id);
      expect(review.compliant).toBe(true);

      // Deactivate
      const deactivated = deactivateUser(newUser.id);
      expect(deactivated.status).toBe('inactive');
      expect(deactivated.notificationPrefs.email).toBe(false);

      // Reactivate
      const reactivated = reactivateUser(newUser.id);
      expect(reactivated.status).toBe('active');

      // Suspend
      const suspended = suspendUser(newUser.id);
      expect(suspended.status).toBe('suspended');

      // Reactivate again
      const reactivatedAgain = reactivateUser(newUser.id);
      expect(reactivatedAgain.status).toBe('active');

      // Change role
      const roleChanged = updateUser(newUser.id, { role: 'data_analyst' });
      expect(roleChanged.role).toBe('data_analyst');
      expect(roleChanged.applicationAccess).toContain('analytics');

      // Verify final state
      const finalUser = getUserById(newUser.id);
      expect(finalUser.role).toBe('data_analyst');
      expect(finalUser.status).toBe('active');
      expect(finalUser.portfolio).toBe('Updated Portfolio');
    });
  });
});
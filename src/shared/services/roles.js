/**
 * Role Management Service (RoleManager)
 * Manages persona/role definitions and permissions for all 22 KP-ETSIP personas.
 * @module roles
 */

import { ROLES, ROLE_LABELS, PERMISSIONS, NAV_SECTIONS, FEATURES } from '../constants.js';

/**
 * @typedef {Object} RoleDefinition
 * @property {string} id - Unique role identifier
 * @property {string} name - Role key/code
 * @property {string} label - Human-readable role label
 * @property {string[]} permissions - Array of feature permission keys
 * @property {string} defaultLandingPage - Default route after login
 * @property {string[]} allowedNavSections - Navigation section keys the role can access
 * @property {boolean} approvalAuthority - Whether the role can approve items
 * @property {string} description - Brief description of the role
 */

/**
 * Mapping of roles to their default landing pages
 * @type {Object.<string, string>}
 */
const DEFAULT_LANDING_PAGES = {
  [ROLES.ADMIN]: '/',
  [ROLES.VIEWER]: '/',
  [ROLES.EDITOR]: '/',
  [ROLES.MINISTER]: '/',
  [ROLES.DEPUTY_MINISTER]: '/',
  [ROLES.PERMANENT_SECRETARY]: '/',
  [ROLES.DIRECTOR_GENERAL]: '/',
  [ROLES.DIRECTOR]: '/',
  [ROLES.DEPUTY_DIRECTOR]: '/',
  [ROLES.CHIEF_EDUCATION_OFFICER]: '/',
  [ROLES.REGIONAL_DIRECTOR]: '/regional-data',
  [ROLES.SCHOOL_PRINCIPAL]: '/school-data',
  [ROLES.INSPECTOR]: '/',
  [ROLES.CURRICULUM_SPECIALIST]: '/curriculum',
  [ROLES.FINANCE_OFFICER]: '/budget',
  [ROLES.PROCUREMENT_OFFICER]: '/procurement',
  [ROLES.HR_OFFICER]: '/hr',
  [ROLES.ICT_OFFICER]: '/ict-infrastructure',
  [ROLES.M_AND_E_OFFICER]: '/indicators',
  [ROLES.DEVELOPMENT_PARTNER]: '/',
  [ROLES.PROGRAMME_COORDINATOR]: '/programmes',
  [ROLES.DATA_ANALYST]: '/analytics',
};

/**
 * Roles that have approval authority
 * @type {Set<string>}
 */
const APPROVAL_ROLES = new Set([
  ROLES.ADMIN,
  ROLES.MINISTER,
  ROLES.DEPUTY_MINISTER,
  ROLES.PERMANENT_SECRETARY,
  ROLES.DIRECTOR_GENERAL,
  ROLES.DIRECTOR,
  ROLES.CHIEF_EDUCATION_OFFICER,
  ROLES.FINANCE_OFFICER,
  ROLES.PROGRAMME_COORDINATOR,
]);

/**
 * Role descriptions for each persona
 * @type {Object.<string, string>}
 */
const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: 'Full system administrator with access to all features and settings.',
  [ROLES.VIEWER]: 'Read-only access to dashboards, programmes, projects, indicators, reports, and analytics.',
  [ROLES.EDITOR]: 'Can view and edit programmes, projects, indicators, budget, and perform data entry.',
  [ROLES.MINISTER]: 'Senior leadership with oversight of all programmes, budget, approvals, and analytics.',
  [ROLES.DEPUTY_MINISTER]: 'Supports the Minister with access to programmes, budget, approvals, and analytics.',
  [ROLES.PERMANENT_SECRETARY]: 'Top administrative officer with broad access including audit logs and approvals.',
  [ROLES.DIRECTOR_GENERAL]: 'Senior executive overseeing programmes, projects, budget, and approvals.',
  [ROLES.DIRECTOR]: 'Manages programmes, projects, indicators, budget, data entry, and approvals.',
  [ROLES.DEPUTY_DIRECTOR]: 'Supports the Director with access to programmes, projects, data entry, and reports.',
  [ROLES.CHIEF_EDUCATION_OFFICER]: 'Oversees education programmes, curriculum, indicators, and approvals.',
  [ROLES.REGIONAL_DIRECTOR]: 'Manages regional data, school data, programmes, and projects for a specific region.',
  [ROLES.SCHOOL_PRINCIPAL]: 'Manages school-level data, indicators, and reports.',
  [ROLES.INSPECTOR]: 'Inspects and reports on schools and regions with access to data entry and analytics.',
  [ROLES.CURRICULUM_SPECIALIST]: 'Focuses on curriculum development, programmes, indicators, and data entry.',
  [ROLES.FINANCE_OFFICER]: 'Manages budget, financial reports, audit logs, and financial approvals.',
  [ROLES.PROCUREMENT_OFFICER]: 'Handles procurement processes, budget tracking, and project procurement data.',
  [ROLES.HR_OFFICER]: 'Manages human resources data, reports, and HR-related data entry.',
  [ROLES.ICT_OFFICER]: 'Manages ICT infrastructure projects, reports, and related data entry.',
  [ROLES.M_AND_E_OFFICER]: 'Monitoring and evaluation of programmes, projects, indicators, and analytics.',
  [ROLES.DEVELOPMENT_PARTNER]: 'External partner with read access to programmes, projects, budget, and analytics.',
  [ROLES.PROGRAMME_COORDINATOR]: 'Coordinates programmes, projects, budget, data entry, and approvals.',
  [ROLES.DATA_ANALYST]: 'Analyzes data across programmes, projects, indicators, budget, and analytics.',
};

/**
 * Derives allowed navigation section keys from a role's permissions
 * @param {string[]} permissions - Array of feature permission keys
 * @returns {string[]} Array of navigation section keys
 */
function deriveAllowedNavSections(permissions) {
  return NAV_SECTIONS
    .filter((section) => permissions.includes(section.feature))
    .map((section) => section.key);
}

/**
 * Builds a complete role definition object for a given role key
 * @param {string} roleKey - The role key from ROLES constant
 * @param {number} index - Index for generating a unique numeric id
 * @returns {RoleDefinition}
 */
function buildRoleDefinition(roleKey, index) {
  const permissions = PERMISSIONS[roleKey] || [];
  return {
    id: `role-${String(index + 1).padStart(3, '0')}`,
    name: roleKey,
    label: ROLE_LABELS[roleKey] || roleKey,
    permissions,
    defaultLandingPage: DEFAULT_LANDING_PAGES[roleKey] || '/',
    allowedNavSections: deriveAllowedNavSections(permissions),
    approvalAuthority: APPROVAL_ROLES.has(roleKey),
    description: ROLE_DESCRIPTIONS[roleKey] || '',
  };
}

/**
 * Cached role definitions array
 * @type {RoleDefinition[]|null}
 */
let cachedRoles = null;

/**
 * Returns all 22 persona/role definitions with full metadata.
 * Results are cached after first call.
 * @returns {RoleDefinition[]} Array of all role definitions
 */
export function getRoles() {
  if (cachedRoles !== null) {
    return cachedRoles;
  }

  const roleKeys = Object.values(ROLES);
  cachedRoles = roleKeys.map((roleKey, index) => buildRoleDefinition(roleKey, index));
  return cachedRoles;
}

/**
 * Returns a single role definition by its name/key.
 * @param {string} name - The role key (e.g., 'admin', 'viewer')
 * @returns {RoleDefinition|null} The role definition or null if not found
 */
export function getRoleByName(name) {
  const roles = getRoles();
  return roles.find((role) => role.name === name) || null;
}

/**
 * Returns a single role definition by its id.
 * @param {string} id - The role id (e.g., 'role-001')
 * @returns {RoleDefinition|null} The role definition or null if not found
 */
export function getRoleById(id) {
  const roles = getRoles();
  return roles.find((role) => role.id === id) || null;
}

/**
 * Checks if a given role has a specific permission/feature.
 * @param {string} roleName - The role key
 * @param {string} feature - The feature key from FEATURES
 * @returns {boolean} True if the role has the permission
 */
export function roleHasPermission(roleName, feature) {
  const role = getRoleByName(roleName);
  if (!role) {
    return false;
  }
  return role.permissions.includes(feature);
}

/**
 * Checks if a given role has approval authority.
 * @param {string} roleName - The role key
 * @returns {boolean} True if the role has approval authority
 */
export function roleHasApprovalAuthority(roleName) {
  return APPROVAL_ROLES.has(roleName);
}

/**
 * Returns all roles that have a specific permission/feature.
 * @param {string} feature - The feature key from FEATURES
 * @returns {RoleDefinition[]} Array of role definitions that have the permission
 */
export function getRolesWithPermission(feature) {
  const roles = getRoles();
  return roles.filter((role) => role.permissions.includes(feature));
}

/**
 * Returns all roles that have approval authority.
 * @returns {RoleDefinition[]} Array of role definitions with approval authority
 */
export function getApprovalRoles() {
  const roles = getRoles();
  return roles.filter((role) => role.approvalAuthority);
}

/**
 * Exports all role definitions as a plain array suitable for serialization.
 * Used for data export and reporting.
 * @returns {RoleDefinition[]} Deep copy of all role definitions
 */
export function exportRoleDefinitions() {
  const roles = getRoles();
  return JSON.parse(JSON.stringify(roles));
}

/**
 * Clears the cached roles (useful for testing).
 */
export function clearRoleCache() {
  cachedRoles = null;
}
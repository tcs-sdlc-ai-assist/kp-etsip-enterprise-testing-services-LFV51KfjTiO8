/**
 * Application-wide constants for KP-ETSIP
 * @module constants
 */

/**
 * Reference date used for calculations and defaults
 * @type {string}
 */
export const REFERENCE_DATE = '2024-06-13';

/**
 * Default date format used across the application
 * @type {string}
 */
export const DATE_FORMAT = 'YYYY-MM-DD';

/**
 * Default number of items per page for paginated views
 * @type {number}
 */
export const ITEMS_PER_PAGE = 10;

/**
 * All 22 persona roles in the system
 * @type {Object.<string, string>}
 */
export const ROLES = {
  ADMIN: 'admin',
  VIEWER: 'viewer',
  EDITOR: 'editor',
  MINISTER: 'minister',
  DEPUTY_MINISTER: 'deputy_minister',
  PERMANENT_SECRETARY: 'permanent_secretary',
  DIRECTOR_GENERAL: 'director_general',
  DIRECTOR: 'director',
  DEPUTY_DIRECTOR: 'deputy_director',
  CHIEF_EDUCATION_OFFICER: 'chief_education_officer',
  REGIONAL_DIRECTOR: 'regional_director',
  SCHOOL_PRINCIPAL: 'school_principal',
  INSPECTOR: 'inspector',
  CURRICULUM_SPECIALIST: 'curriculum_specialist',
  FINANCE_OFFICER: 'finance_officer',
  PROCUREMENT_OFFICER: 'procurement_officer',
  HR_OFFICER: 'hr_officer',
  ICT_OFFICER: 'ict_officer',
  M_AND_E_OFFICER: 'm_and_e_officer',
  DEVELOPMENT_PARTNER: 'development_partner',
  PROGRAMME_COORDINATOR: 'programme_coordinator',
  DATA_ANALYST: 'data_analyst',
};

/**
 * Human-readable labels for each role
 * @type {Object.<string, string>}
 */
export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.VIEWER]: 'Viewer',
  [ROLES.EDITOR]: 'Editor',
  [ROLES.MINISTER]: 'Minister',
  [ROLES.DEPUTY_MINISTER]: 'Deputy Minister',
  [ROLES.PERMANENT_SECRETARY]: 'Permanent Secretary',
  [ROLES.DIRECTOR_GENERAL]: 'Director General',
  [ROLES.DIRECTOR]: 'Director',
  [ROLES.DEPUTY_DIRECTOR]: 'Deputy Director',
  [ROLES.CHIEF_EDUCATION_OFFICER]: 'Chief Education Officer',
  [ROLES.REGIONAL_DIRECTOR]: 'Regional Director',
  [ROLES.SCHOOL_PRINCIPAL]: 'School Principal',
  [ROLES.INSPECTOR]: 'Inspector',
  [ROLES.CURRICULUM_SPECIALIST]: 'Curriculum Specialist',
  [ROLES.FINANCE_OFFICER]: 'Finance Officer',
  [ROLES.PROCUREMENT_OFFICER]: 'Procurement Officer',
  [ROLES.HR_OFFICER]: 'HR Officer',
  [ROLES.ICT_OFFICER]: 'ICT Officer',
  [ROLES.M_AND_E_OFFICER]: 'M&E Officer',
  [ROLES.DEVELOPMENT_PARTNER]: 'Development Partner',
  [ROLES.PROGRAMME_COORDINATOR]: 'Programme Coordinator',
  [ROLES.DATA_ANALYST]: 'Data Analyst',
};

/**
 * Feature/screen permission keys
 * @type {Object.<string, string>}
 */
export const FEATURES = {
  DASHBOARD: 'dashboard',
  PROGRAMMES: 'programmes',
  PROJECTS: 'projects',
  INDICATORS: 'indicators',
  BUDGET: 'budget',
  REPORTS: 'reports',
  ANALYTICS: 'analytics',
  USER_MANAGEMENT: 'user_management',
  SETTINGS: 'settings',
  AUDIT_LOG: 'audit_log',
  DATA_ENTRY: 'data_entry',
  APPROVALS: 'approvals',
  NOTIFICATIONS: 'notifications',
  EXPORT: 'export',
  REGIONAL_DATA: 'regional_data',
  SCHOOL_DATA: 'school_data',
  PROCUREMENT: 'procurement',
  HR: 'hr',
  ICT_INFRASTRUCTURE: 'ict_infrastructure',
  CURRICULUM: 'curriculum',
};

/**
 * Permissions matrix mapping roles to allowed features/screens
 * @type {Object.<string, string[]>}
 */
export const PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(FEATURES),
  [ROLES.VIEWER]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.NOTIFICATIONS,
  ],
  [ROLES.EDITOR]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.BUDGET,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.DATA_ENTRY,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
  ],
  [ROLES.MINISTER]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.BUDGET,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.APPROVALS,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
  ],
  [ROLES.DEPUTY_MINISTER]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.BUDGET,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.APPROVALS,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
  ],
  [ROLES.PERMANENT_SECRETARY]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.BUDGET,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.APPROVALS,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
    FEATURES.AUDIT_LOG,
  ],
  [ROLES.DIRECTOR_GENERAL]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.BUDGET,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.APPROVALS,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
  ],
  [ROLES.DIRECTOR]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.BUDGET,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.DATA_ENTRY,
    FEATURES.APPROVALS,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
  ],
  [ROLES.DEPUTY_DIRECTOR]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.DATA_ENTRY,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
  ],
  [ROLES.CHIEF_EDUCATION_OFFICER]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.DATA_ENTRY,
    FEATURES.APPROVALS,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
    FEATURES.CURRICULUM,
  ],
  [ROLES.REGIONAL_DIRECTOR]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.DATA_ENTRY,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
    FEATURES.REGIONAL_DATA,
    FEATURES.SCHOOL_DATA,
  ],
  [ROLES.SCHOOL_PRINCIPAL]: [
    FEATURES.DASHBOARD,
    FEATURES.INDICATORS,
    FEATURES.REPORTS,
    FEATURES.DATA_ENTRY,
    FEATURES.NOTIFICATIONS,
    FEATURES.SCHOOL_DATA,
  ],
  [ROLES.INSPECTOR]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.DATA_ENTRY,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
    FEATURES.SCHOOL_DATA,
    FEATURES.REGIONAL_DATA,
  ],
  [ROLES.CURRICULUM_SPECIALIST]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.INDICATORS,
    FEATURES.REPORTS,
    FEATURES.DATA_ENTRY,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
    FEATURES.CURRICULUM,
  ],
  [ROLES.FINANCE_OFFICER]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.BUDGET,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.DATA_ENTRY,
    FEATURES.APPROVALS,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
    FEATURES.AUDIT_LOG,
  ],
  [ROLES.PROCUREMENT_OFFICER]: [
    FEATURES.DASHBOARD,
    FEATURES.PROJECTS,
    FEATURES.BUDGET,
    FEATURES.REPORTS,
    FEATURES.DATA_ENTRY,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
    FEATURES.PROCUREMENT,
  ],
  [ROLES.HR_OFFICER]: [
    FEATURES.DASHBOARD,
    FEATURES.REPORTS,
    FEATURES.DATA_ENTRY,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
    FEATURES.HR,
  ],
  [ROLES.ICT_OFFICER]: [
    FEATURES.DASHBOARD,
    FEATURES.PROJECTS,
    FEATURES.REPORTS,
    FEATURES.DATA_ENTRY,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
    FEATURES.ICT_INFRASTRUCTURE,
  ],
  [ROLES.M_AND_E_OFFICER]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.DATA_ENTRY,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
  ],
  [ROLES.DEVELOPMENT_PARTNER]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.BUDGET,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
  ],
  [ROLES.PROGRAMME_COORDINATOR]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.BUDGET,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.DATA_ENTRY,
    FEATURES.APPROVALS,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
  ],
  [ROLES.DATA_ANALYST]: [
    FEATURES.DASHBOARD,
    FEATURES.PROGRAMMES,
    FEATURES.PROJECTS,
    FEATURES.INDICATORS,
    FEATURES.BUDGET,
    FEATURES.REPORTS,
    FEATURES.ANALYTICS,
    FEATURES.DATA_ENTRY,
    FEATURES.NOTIFICATIONS,
    FEATURES.EXPORT,
  ],
};

/**
 * localStorage key constants
 * @type {Object.<string, string>}
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'kp_etsip_auth_token',
  USER: 'kp_etsip_user',
  ROLE: 'kp_etsip_role',
  THEME: 'kp_etsip_theme',
  SIDEBAR_COLLAPSED: 'kp_etsip_sidebar_collapsed',
  LANGUAGE: 'kp_etsip_language',
  FILTERS: 'kp_etsip_filters',
  LAST_VISITED: 'kp_etsip_last_visited',
  NOTIFICATIONS_READ: 'kp_etsip_notifications_read',
  TABLE_PAGE_SIZE: 'kp_etsip_table_page_size',
};

/**
 * Sidebar navigation structure
 * @type {Array<{key: string, label: string, icon: string, path: string, feature: string, children?: Array}>}
 */
export const NAV_SECTIONS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'home',
    path: '/',
    feature: FEATURES.DASHBOARD,
  },
  {
    key: 'programmes',
    label: 'Programmes',
    icon: 'folder',
    path: '/programmes',
    feature: FEATURES.PROGRAMMES,
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: 'briefcase',
    path: '/projects',
    feature: FEATURES.PROJECTS,
  },
  {
    key: 'indicators',
    label: 'Indicators',
    icon: 'bar-chart',
    path: '/indicators',
    feature: FEATURES.INDICATORS,
  },
  {
    key: 'budget',
    label: 'Budget & Finance',
    icon: 'dollar-sign',
    path: '/budget',
    feature: FEATURES.BUDGET,
  },
  {
    key: 'data-entry',
    label: 'Data Entry',
    icon: 'edit',
    path: '/data-entry',
    feature: FEATURES.DATA_ENTRY,
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: 'file-text',
    path: '/reports',
    feature: FEATURES.REPORTS,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: 'trending-up',
    path: '/analytics',
    feature: FEATURES.ANALYTICS,
  },
  {
    key: 'approvals',
    label: 'Approvals',
    icon: 'check-circle',
    path: '/approvals',
    feature: FEATURES.APPROVALS,
  },
  {
    key: 'regional-data',
    label: 'Regional Data',
    icon: 'map',
    path: '/regional-data',
    feature: FEATURES.REGIONAL_DATA,
  },
  {
    key: 'school-data',
    label: 'School Data',
    icon: 'book',
    path: '/school-data',
    feature: FEATURES.SCHOOL_DATA,
  },
  {
    key: 'procurement',
    label: 'Procurement',
    icon: 'shopping-cart',
    path: '/procurement',
    feature: FEATURES.PROCUREMENT,
  },
  {
    key: 'hr',
    label: 'Human Resources',
    icon: 'users',
    path: '/hr',
    feature: FEATURES.HR,
  },
  {
    key: 'ict-infrastructure',
    label: 'ICT Infrastructure',
    icon: 'monitor',
    path: '/ict-infrastructure',
    feature: FEATURES.ICT_INFRASTRUCTURE,
  },
  {
    key: 'curriculum',
    label: 'Curriculum',
    icon: 'book-open',
    path: '/curriculum',
    feature: FEATURES.CURRICULUM,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: 'bell',
    path: '/notifications',
    feature: FEATURES.NOTIFICATIONS,
  },
  {
    key: 'user-management',
    label: 'User Management',
    icon: 'shield',
    path: '/user-management',
    feature: FEATURES.USER_MANAGEMENT,
  },
  {
    key: 'audit-log',
    label: 'Audit Log',
    icon: 'clipboard',
    path: '/audit-log',
    feature: FEATURES.AUDIT_LOG,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'settings',
    path: '/settings',
    feature: FEATURES.SETTINGS,
  },
];

/**
 * Status options for projects, programmes, and tasks
 * @type {Array<{value: string, label: string, color: string}>}
 */
export const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', color: 'bg-brand-gray-300' },
  { value: 'planning', label: 'Planning', color: 'bg-brand-blue-300' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-brand-500' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-yellow-400' },
  { value: 'completed', label: 'Completed', color: 'bg-brand-green-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
  { value: 'delayed', label: 'Delayed', color: 'bg-orange-500' },
];

/**
 * Priority options for tasks and issues
 * @type {Array<{value: string, label: string, color: string}>}
 */
export const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: 'bg-red-600' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-400' },
  { value: 'low', label: 'Low', color: 'bg-brand-green-400' },
];
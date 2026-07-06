/**
 * Sidebar Navigation Component
 * Persistent left sidebar that renders navigation sections based on the current
 * user's role permissions. Highlights the active route. Collapsible on mobile.
 * @module Sidebar
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext.jsx';
import { NAV_SECTIONS, STORAGE_KEYS } from '../constants.js';
import { getItem, setItem } from '../services/storage.js';

/**
 * Icon component that renders simple SVG icons based on icon name.
 * Maps icon names from NAV_SECTIONS to inline SVG paths.
 *
 * @param {Object} props - Component props
 * @param {string} props.name - Icon name from NAV_SECTIONS
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement} SVG icon element
 */
function SidebarIcon({ name, className = '' }) {
  const baseClass = `w-5 h-5 flex-shrink-0 ${className}`;

  const icons = {
    home: (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    ),
    folder: (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    briefcase: (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0h2a2 2 0 012 2v3M8 6H6a2 2 0 00-2 2v3" />
      </svg>
    ),
    'bar-chart': (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    'dollar-sign': (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    edit: (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    'file-text': (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    'trending-up': (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    'check-circle': (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    map: (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    book: (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    'shopping-cart': (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
    users: (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    monitor: (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    'book-open': (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    bell: (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    shield: (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    clipboard: (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    settings: (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };

  return icons[name] || (
    <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

SidebarIcon.propTypes = {
  name: PropTypes.string.isRequired,
  className: PropTypes.string,
};

SidebarIcon.defaultProps = {
  className: '',
};

/**
 * Navigation group definitions for organizing sidebar items into logical sections.
 * Each group contains a label and an array of NAV_SECTIONS keys that belong to it.
 * @type {Array<{label: string, keys: string[]}>}
 */
const NAV_GROUPS = [
  {
    label: 'Overview',
    keys: ['dashboard'],
  },
  {
    label: 'Programme Management',
    keys: ['programmes', 'projects', 'indicators', 'budget'],
  },
  {
    label: 'Data & Reporting',
    keys: ['data-entry', 'reports', 'analytics'],
  },
  {
    label: 'Operations',
    keys: ['approvals', 'regional-data', 'school-data', 'procurement', 'hr', 'ict-infrastructure', 'curriculum'],
  },
  {
    label: 'Administration',
    keys: ['notifications', 'user-management', 'audit-log', 'settings'],
  },
];

/**
 * Sidebar navigation component.
 * Renders navigation sections based on the current user's role permissions.
 * Highlights the active route. Collapsible on mobile via a toggle button.
 *
 * @param {Object} props - Component props
 * @param {boolean} [props.mobileOpen] - Whether the sidebar is open on mobile (controlled externally)
 * @param {Function} [props.onMobileClose] - Callback to close the sidebar on mobile
 * @returns {React.ReactElement} The sidebar component
 */
export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { hasPermission, isAuthenticated, currentUser } = useAuth();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    return getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
  });

  /**
   * Toggles the collapsed state and persists to localStorage.
   */
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, next);
      return next;
    });
  }, []);

  /**
   * Handles clicking a nav link on mobile — closes the sidebar overlay.
   */
  const handleNavClick = useCallback(() => {
    if (onMobileClose) {
      onMobileClose();
    }
  }, [onMobileClose]);

  /**
   * Builds the filtered navigation sections based on the user's permissions.
   * Only includes sections the user has access to.
   */
  const allowedSections = useMemo(() => {
    if (!isAuthenticated) {
      return [];
    }

    return NAV_SECTIONS.filter((section) => hasPermission(section.feature));
  }, [isAuthenticated, hasPermission]);

  /**
   * Creates a lookup set of allowed section keys for fast membership checks.
   */
  const allowedKeySet = useMemo(() => {
    return new Set(allowedSections.map((s) => s.key));
  }, [allowedSections]);

  /**
   * Builds the grouped navigation structure, filtering out empty groups.
   */
  const groupedNav = useMemo(() => {
    return NAV_GROUPS
      .map((group) => {
        const items = group.keys
          .filter((key) => allowedKeySet.has(key))
          .map((key) => allowedSections.find((s) => s.key === key))
          .filter(Boolean);

        return { label: group.label, items };
      })
      .filter((group) => group.items.length > 0);
  }, [allowedKeySet, allowedSections]);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!isAuthenticated) {
    return null;
  }

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  /**
   * Renders a single navigation item.
   * @param {Object} section - The navigation section object
   * @returns {React.ReactElement}
   */
  const renderNavItem = (section) => {
    const isActive = location.pathname === section.path ||
      (section.path !== '/' && location.pathname.startsWith(section.path));

    return (
      <NavLink
        key={section.key}
        to={section.path}
        onClick={handleNavClick}
        className={`
          flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150
          ${isActive
            ? 'bg-brand-500 text-white shadow-sm'
            : 'text-brand-gray-700 hover:bg-brand-50 hover:text-brand-600'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
        title={collapsed ? section.label : undefined}
        aria-current={isActive ? 'page' : undefined}
      >
        <SidebarIcon
          name={section.icon}
          className={isActive ? 'text-white' : 'text-brand-gray-500'}
        />
        {!collapsed && (
          <span className="truncate">{section.label}</span>
        )}
      </NavLink>
    );
  };

  /**
   * The sidebar content (shared between desktop and mobile).
   */
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center h-16 px-4 border-b border-brand-gray-200 flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-md bg-brand-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">KP</span>
            </div>
            <span className="text-sm font-semibold text-brand-gray-900 truncate">
              KP-ETSIP
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-md bg-brand-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">KP</span>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          className={`p-1 rounded-md text-brand-gray-500 hover:text-brand-gray-700 hover:bg-brand-gray-100 transition-colors hidden lg:flex items-center justify-center ${collapsed ? 'ml-0' : ''}`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4" aria-label="Sidebar navigation">
        {groupedNav.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <h3 className="px-3 mb-1 text-xs font-semibold text-brand-gray-500 uppercase tracking-wider">
                {group.label}
              </h3>
            )}
            {collapsed && (
              <div className="border-t border-brand-gray-200 mx-2 mb-2" />
            )}
            <div className="space-y-0.5">
              {group.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* User info footer */}
      {currentUser && (
        <div className={`flex-shrink-0 border-t border-brand-gray-200 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          {collapsed ? (
            <div
              className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center"
              title={currentUser.name}
            >
              <span className="text-brand-600 text-xs font-semibold">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-600 text-xs font-semibold">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-gray-900 truncate">
                  {currentUser.name}
                </p>
                <p className="text-xs text-brand-gray-500 truncate">
                  {currentUser.portfolio || currentUser.role}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-brand-gray-200 shadow-lg
          transform transition-transform duration-200 ease-in-out lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Mobile navigation"
      >
        {/* Mobile close button */}
        <div className="absolute top-3 right-3">
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-md text-brand-gray-500 hover:text-brand-gray-700 hover:bg-brand-gray-100 transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`
          hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30
          ${sidebarWidth} bg-white border-r border-brand-gray-200
          transition-all duration-200 ease-in-out
        `}
        aria-label="Desktop navigation"
      >
        {sidebarContent}
      </aside>
    </>
  );
}

Sidebar.propTypes = {
  mobileOpen: PropTypes.bool,
  onMobileClose: PropTypes.func,
};

Sidebar.defaultProps = {
  mobileOpen: false,
  onMobileClose: undefined,
};
/**
 * AppLayout Component
 * Main application layout component that renders Sidebar, Header, and main content area.
 * Handles responsive layout with collapsible sidebar on mobile.
 * Only rendered for authenticated users.
 * @module AppLayout
 */

import { useState, useCallback, useMemo } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import { getItem } from '../services/storage.js';
import { STORAGE_KEYS } from '../constants.js';

/**
 * AppLayout component for the main application shell.
 * Renders the Sidebar, Header, and main content area (Outlet for nested routes).
 * Handles responsive layout with collapsible sidebar on mobile.
 * Only rendered for authenticated users — shows a loading spinner while
 * authentication state is being resolved.
 *
 * @returns {React.ReactElement} The application layout component
 */
export default function AppLayout() {
  const { isAuthenticated, loading } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /**
   * Reads the sidebar collapsed state from localStorage for desktop layout.
   */
  const sidebarCollapsed = useMemo(() => {
    return getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
  }, []);

  /**
   * Toggles the mobile sidebar menu open/closed.
   */
  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  /**
   * Closes the mobile sidebar menu.
   */
  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner size="lg" label="Loading..." showLabel />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const sidebarWidth = sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64';

  return (
    <div className="min-h-screen bg-brand-gray-50">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={handleMobileMenuClose}
      />

      {/* Main content area */}
      <div className={`flex flex-col min-h-screen transition-all duration-200 ease-in-out ${sidebarWidth}`}>
        {/* Header */}
        <Header onMobileMenuToggle={handleMobileMenuToggle} />

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
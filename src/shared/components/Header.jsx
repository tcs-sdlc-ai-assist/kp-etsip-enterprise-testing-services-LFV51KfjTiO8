/**
 * Header Component
 * Top header bar displaying app title, search bar, notification bell with unread count,
 * current user name/role, and profile dropdown menu.
 * Consumes AuthContext and NotificationContext.
 * @module Header
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';

/**
 * Header component for the application.
 * Renders the top navigation bar with app title, search, notifications, and user profile.
 *
 * @param {Object} props - Component props
 * @param {Function} [props.onMobileMenuToggle] - Callback to toggle mobile sidebar
 * @returns {React.ReactElement} The header component
 */
export default function Header({ onMobileMenuToggle }) {
  const { currentUser, isAuthenticated, role, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const profileRef = useRef(null);

  /**
   * Closes the profile dropdown when clicking outside.
   */
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Toggles the profile dropdown menu.
   */
  const toggleProfile = useCallback(() => {
    setProfileOpen((prev) => !prev);
  }, []);

  /**
   * Handles navigation to the notifications page.
   */
  const handleNotificationClick = useCallback(() => {
    navigate('/notifications');
  }, [navigate]);

  /**
   * Handles search input changes.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event
   */
  const handleSearchChange = useCallback((e) => {
    setSearchValue(e.target.value);
  }, []);

  /**
   * Handles search form submission.
   * @param {React.FormEvent} e - The form event
   */
  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    // Search is a UI placeholder; no navigation in this mock
  }, []);

  /**
   * Handles logout action from the profile dropdown.
   */
  const handleLogout = useCallback(async () => {
    setProfileOpen(false);
    try {
      await logout();
      navigate('/');
    } catch {
      // Ensure navigation even if logout errors
      navigate('/');
    }
  }, [logout, navigate]);

  /**
   * Handles navigation to the settings page from the profile dropdown.
   */
  const handleSettingsClick = useCallback(() => {
    setProfileOpen(false);
    navigate('/settings');
  }, [navigate]);

  /**
   * Handles navigation to the profile/user-management page from the profile dropdown.
   */
  const handleProfileClick = useCallback(() => {
    setProfileOpen(false);
    navigate('/user-management');
  }, [navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const userName = currentUser ? currentUser.name : 'User';
  const userRole = currentUser ? (currentUser.portfolio || role || '') : (role || '');
  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 bg-white border-b border-brand-gray-200 shadow-sm lg:px-6">
      {/* Left section: mobile menu toggle + app title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu toggle button */}
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-md text-brand-gray-500 hover:text-brand-gray-700 hover:bg-brand-gray-100 transition-colors lg:hidden"
          aria-label="Open sidebar menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* App title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-md bg-brand-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">KP</span>
          </div>
          <h1 className="text-lg font-semibold text-brand-gray-900 truncate hidden sm:block">
            KP ETSIP
          </h1>
        </div>
      </div>

      {/* Center section: search bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <form onSubmit={handleSearchSubmit} className="w-full relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search programmes, projects, indicators..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-brand-gray-200 rounded-lg bg-brand-gray-50 text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            aria-label="Search"
          />
        </form>
      </div>

      {/* Right section: notifications + user profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notification bell */}
        <button
          onClick={handleNotificationClick}
          className="relative p-2 rounded-md text-brand-gray-500 hover:text-brand-gray-700 hover:bg-brand-gray-100 transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={toggleProfile}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-brand-gray-100 transition-colors"
            aria-label="User menu"
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-600 text-xs font-semibold">
                {userInitial}
              </span>
            </div>
            <div className="hidden sm:flex flex-col items-start min-w-0">
              <span className="text-sm font-medium text-brand-gray-900 truncate max-w-[140px]">
                {userName}
              </span>
              <span className="text-xs text-brand-gray-500 truncate max-w-[140px]">
                {userRole}
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-brand-gray-400 hidden sm:block transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-brand-gray-200 py-1 z-50">
              {/* User info in dropdown */}
              <div className="px-4 py-3 border-b border-brand-gray-200">
                <p className="text-sm font-medium text-brand-gray-900 truncate">
                  {userName}
                </p>
                <p className="text-xs text-brand-gray-500 truncate">
                  {currentUser ? currentUser.email : ''}
                </p>
                <p className="text-xs text-brand-gray-400 truncate mt-0.5">
                  {userRole}
                </p>
              </div>

              {/* Menu items */}
              <button
                onClick={handleProfileClick}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-brand-gray-700 hover:bg-brand-gray-50 transition-colors text-left"
              >
                <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
              </button>

              <button
                onClick={handleSettingsClick}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-brand-gray-700 hover:bg-brand-gray-50 transition-colors text-left"
              >
                <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>

              <div className="border-t border-brand-gray-200 my-1" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

Header.propTypes = {
  onMobileMenuToggle: PropTypes.func,
};

Header.defaultProps = {
  onMobileMenuToggle: undefined,
};
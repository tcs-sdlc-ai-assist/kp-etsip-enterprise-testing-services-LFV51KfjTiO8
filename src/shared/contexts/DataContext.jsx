/**
 * Data Initialization Context Provider
 * Provides shared data state management including initialization, reset, and status tracking.
 * Orchestrates storage.js initializeStorage() and seeds all mock data repositories on first load.
 * @module DataContext
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { initializeStorage, resetAll as resetStorage, clearAll } from '../services/storage.js';
import { resetUserRepository } from '../services/userManager.js';
import { resetAuditLogs } from '../services/auditLogService.js';
import { resetAll as resetNotifications } from '../services/notificationManager.js';
import { resetAll as resetRepository } from '../services/repositoryService.js';
import { resetAll as resetExecution } from '../services/executionService.js';
import { resetAll as resetDashboard } from '../services/dashboardService.js';
import { resetAll as resetPlatformAdmin } from '../services/platformAdminService.js';
import { resetSchedules } from '../services/schedulerService.js';

/**
 * @typedef {Object} DataContextValue
 * @property {boolean} isInitialized - Whether data has been initialized in localStorage
 * @property {boolean} loading - Whether a data operation is in progress
 * @property {string|null} error - The last error message
 * @property {Function} initializeData - Seeds localStorage with all mock data on first load
 * @property {Function} resetData - Resets all data stores to their original mock data
 * @property {Function} clearError - Clears the current error message
 */

const DataContext = createContext(null);

/**
 * Custom hook to access the DataContext.
 * Throws an error if used outside of DataProvider.
 *
 * @returns {DataContextValue} The data context value
 * @throws {Error} If used outside of DataProvider
 */
export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider.');
  }
  return context;
}

/**
 * Data Context Provider component.
 * Wraps the application and provides data initialization state and actions.
 * On mount, automatically seeds localStorage with default mock data if not already initialized.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} The provider component
 */
export function DataProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Seeds localStorage with all mock data on first load.
   * Calls initializeStorage() from the storage abstraction layer which
   * checks for the initialized sentinel key and only seeds if not present.
   * After storage initialization, triggers lazy-load of all data repositories
   * by invoking their respective load functions (which seed from mock data if empty).
   *
   * @returns {Promise<boolean>} True if initialization was performed or already initialized
   */
  const initializeData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Initialize base storage defaults (user, role, theme, etc.)
      initializeStorage();

      // Trigger lazy-loading of all data repositories.
      // Each service's load function checks localStorage and seeds from mock data if empty.
      // We import the getter functions to trigger the seeding side-effect.
      // These are synchronous operations that read/write localStorage.
      try {
        // Repository service data (applications, test assets, demand items)
        const { getApplications, getTestAssets, getDemandItems } = await import('../services/repositoryService.js');
        await getApplications({ limit: 1 });
        await getTestAssets({ limit: 1 });
        await getDemandItems({ limit: 1 });
      } catch {
        // Ignore individual seeding errors - data will be seeded on first access
      }

      try {
        // Dashboard service data (metrics, portfolios, releases, quality gates, etc.)
        const { getMetrics } = await import('../services/dashboardService.js');
        await getMetrics();
      } catch {
        // Ignore individual seeding errors
      }

      try {
        // Execution service data (executions, environments, schedules)
        const { getExecutions, getEnvironments, getSchedules } = await import('../services/executionService.js');
        await getExecutions({ limit: 1 });
        await getEnvironments();
        await getSchedules();
      } catch {
        // Ignore individual seeding errors
      }

      try {
        // Audit log service data
        const { getAuditLogs } = await import('../services/auditLogService.js');
        await getAuditLogs({ limit: 1 });
      } catch {
        // Ignore individual seeding errors
      }

      try {
        // Notification service data
        const { getAllNotifications } = await import('../services/notificationManager.js');
        getAllNotifications();
      } catch {
        // Ignore individual seeding errors
      }

      try {
        // Platform admin service data (config, retention policies, integrations)
        const { getPlatformConfigSync, getRetentionPoliciesSync, getAllIntegrations } = await import('../services/platformAdminService.js');
        getPlatformConfigSync();
        getRetentionPoliciesSync();
        getAllIntegrations();
      } catch {
        // Ignore individual seeding errors
      }

      try {
        // Scheduler service data
        const { getSchedules: getSchedulerSchedules } = await import('../services/schedulerService.js');
        await getSchedulerSchedules({ limit: 1 });
      } catch {
        // Ignore individual seeding errors
      }

      setIsInitialized(true);
      setLoading(false);
      return true;
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to initialize data.';
      setError(errorMessage);
      setLoading(false);
      return false;
    }
  }, []);

  /**
   * Resets all data stores to their original mock data.
   * Clears all KP-ETSIP localStorage entries and re-seeds from mock data.
   *
   * @returns {Promise<boolean>} True if reset was successful
   */
  const resetData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Reset storage defaults
      resetStorage();

      // Reset all individual data repositories
      resetUserRepository();
      resetAuditLogs();
      resetNotifications();
      resetRepository();
      resetExecution();
      resetDashboard();
      resetPlatformAdmin();
      resetSchedules();

      setIsInitialized(true);
      setLoading(false);
      return true;
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to reset data.';
      setError(errorMessage);
      setLoading(false);
      return false;
    }
  }, []);

  /**
   * Clears the current error message.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize data on mount
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  const contextValue = useMemo(() => ({
    isInitialized,
    loading,
    error,
    initializeData,
    resetData,
    clearError,
  }), [
    isInitialized,
    loading,
    error,
    initializeData,
    resetData,
    clearError,
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

DataProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { DataContext };
export default DataProvider;
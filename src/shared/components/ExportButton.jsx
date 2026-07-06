/**
 * ExportButton Component
 * Reusable export button with dropdown menu for CSV, Excel, PDF, PowerPoint options.
 * Checks role-based export permissions via AuthContext. Calls exportService methods.
 * Shows simulated Power BI link.
 * @module ExportButton
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  exportToPowerPoint,
  hasExportPermission,
  getSupportedFormats,
} from '../services/exportService.js';

/**
 * Returns the icon SVG for a given export format.
 *
 * @param {string} format - The export format key
 * @returns {React.ReactElement} SVG icon element
 */
function FormatIcon({ format }) {
  const baseClass = 'w-4 h-4 flex-shrink-0';

  switch (format) {
    case 'csv':
      return (
        <svg className={`${baseClass} text-brand-green-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'excel':
      return (
        <svg className={`${baseClass} text-brand-green-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case 'pdf':
      return (
        <svg className={`${baseClass} text-red-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case 'ppt':
      return (
        <svg className={`${baseClass} text-orange-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      );
    case 'powerbi':
      return (
        <svg className={`${baseClass} text-yellow-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    default:
      return (
        <svg className={`${baseClass} text-brand-gray-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      );
  }
}

FormatIcon.propTypes = {
  format: PropTypes.string.isRequired,
};

/**
 * ExportButton component for rendering a dropdown menu with export format options.
 * Checks role-based export permissions before enabling export actions.
 * Calls the appropriate exportService method based on the selected format.
 *
 * @param {Object} props - Component props
 * @param {Object[]} props.data - Array of data objects to export
 * @param {string} [props.filename='export'] - Base filename for the exported file (without extension)
 * @param {string} [props.title='Export Report'] - Title used in PDF and PowerPoint exports
 * @param {string} [props.sheetName='Data'] - Sheet name used in Excel exports
 * @param {string} [props.label='Export'] - Button label text
 * @param {string} [props.className] - Additional CSS classes for the button container
 * @param {boolean} [props.disabled] - Whether the button is disabled
 * @param {boolean} [props.showPowerBI] - Whether to show the simulated Power BI link (defaults to true)
 * @param {Function} [props.onExportComplete] - Callback invoked after a successful export with the result object
 * @param {Function} [props.onExportError] - Callback invoked when an export fails with the error message
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Button size variant
 * @returns {React.ReactElement} The export button component
 */
export default function ExportButton({
  data,
  filename,
  title,
  sheetName,
  label,
  className,
  disabled,
  showPowerBI,
  onExportComplete,
  onExportError,
  size,
}) {
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const menuRef = useRef(null);

  const effectiveFilename = filename || 'export';
  const effectiveTitle = title || 'Export Report';
  const effectiveSheetName = sheetName || 'Data';
  const effectiveLabel = label || 'Export';
  const effectiveShowPowerBI = showPowerBI !== false;
  const effectiveSize = size || 'md';

  const canExport = useMemo(() => {
    if (!isAuthenticated) {
      return false;
    }
    return hasExportPermission();
  }, [isAuthenticated]);

  const hasData = useMemo(() => {
    return Array.isArray(data) && data.length > 0;
  }, [data]);

  const formats = useMemo(() => {
    return getSupportedFormats();
  }, []);

  /**
   * Closes the dropdown menu when clicking outside.
   */
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Clears feedback message after a timeout.
   */
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  /**
   * Toggles the dropdown menu.
   */
  const toggleMenu = useCallback(() => {
    if (!canExport || !hasData || disabled) {
      return;
    }
    setMenuOpen((prev) => !prev);
  }, [canExport, hasData, disabled]);

  /**
   * Handles exporting data in the specified format.
   *
   * @param {string} format - The export format key: 'csv' | 'excel' | 'pdf' | 'ppt'
   */
  const handleExport = useCallback(
    async (format) => {
      if (!canExport || !hasData || exporting) {
        return;
      }

      setMenuOpen(false);
      setExporting(true);
      setExportFormat(format);
      setFeedback(null);

      try {
        let result;

        switch (format) {
          case 'csv':
            result = await exportToCSV(data, effectiveFilename);
            break;
          case 'excel':
            result = await exportToExcel(data, effectiveFilename, effectiveSheetName);
            break;
          case 'pdf':
            result = await exportToPDF(data, effectiveFilename, effectiveTitle);
            break;
          case 'ppt':
            result = await exportToPowerPoint(data, effectiveFilename, effectiveTitle);
            break;
          default:
            throw new Error(`Unsupported export format: ${format}`);
        }

        if (result && result.success) {
          setFeedback({ type: 'success', message: result.message || 'Export completed successfully.' });
          if (typeof onExportComplete === 'function') {
            onExportComplete(result);
          }
        } else {
          const errorMessage = result ? result.message : 'Export failed.';
          setFeedback({ type: 'error', message: errorMessage });
          if (typeof onExportError === 'function') {
            onExportError(errorMessage);
          }
        }
      } catch (err) {
        const errorMessage = err && err.message ? err.message : 'An unexpected error occurred during export.';
        setFeedback({ type: 'error', message: errorMessage });
        if (typeof onExportError === 'function') {
          onExportError(errorMessage);
        }
      } finally {
        setExporting(false);
        setExportFormat(null);
      }
    },
    [canExport, hasData, exporting, data, effectiveFilename, effectiveSheetName, effectiveTitle, onExportComplete, onExportError]
  );

  /**
   * Handles the simulated Power BI link click.
   */
  const handlePowerBIClick = useCallback(() => {
    setMenuOpen(false);
    setFeedback({
      type: 'success',
      message: 'Power BI integration is simulated. In production, this would open the Power BI dashboard.',
    });
  }, []);

  /**
   * Handles keyboard interaction on the export button.
   *
   * @param {React.KeyboardEvent} e - The keyboard event
   */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleMenu();
      }
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    },
    [toggleMenu]
  );

  /**
   * Returns size-specific Tailwind CSS classes for the button.
   *
   * @param {'sm' | 'md' | 'lg'} sz - The size variant
   * @returns {string} Tailwind CSS classes
   */
  const getSizeClasses = (sz) => {
    switch (sz) {
      case 'sm':
        return 'px-2.5 py-1 text-xs';
      case 'lg':
        return 'px-5 py-2.5 text-base';
      case 'md':
      default:
        return 'px-3 py-1.5 text-sm';
    }
  };

  const isDisabled = !canExport || !hasData || disabled || exporting;

  return (
    <div
      className={`relative inline-block${className ? ` ${className}` : ''}`}
      ref={menuRef}
    >
      {/* Export button */}
      <button
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        className={`inline-flex items-center gap-1.5 font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${getSizeClasses(effectiveSize)}`}
        aria-label={`${effectiveLabel} data`}
        aria-expanded={menuOpen}
        aria-haspopup="true"
      >
        {exporting ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        <span>{exporting ? 'Exporting...' : effectiveLabel}</span>
        {!exporting && (
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-brand-gray-200 py-1 z-40">
          {/* Header */}
          <div className="px-3 py-2 border-b border-brand-gray-200">
            <p className="text-xs font-semibold text-brand-gray-600 uppercase tracking-wider">
              Export Format
            </p>
            {hasData && (
              <p className="text-[10px] text-brand-gray-400 mt-0.5">
                {data.length} record{data.length !== 1 ? 's' : ''} to export
              </p>
            )}
          </div>

          {/* Format options */}
          {formats.map((format) => (
            <button
              key={format.value}
              onClick={() => handleExport(format.value)}
              disabled={exporting}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-brand-gray-700 hover:bg-brand-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Export as ${format.label}`}
            >
              <FormatIcon format={format.value} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-gray-900">
                  {format.label}
                </p>
                <p className="text-[10px] text-brand-gray-400 truncate">
                  {format.description}
                </p>
              </div>
              <span className="text-[10px] text-brand-gray-400 flex-shrink-0">
                {format.extension}
              </span>
            </button>
          ))}

          {/* Power BI link */}
          {effectiveShowPowerBI && (
            <>
              <div className="border-t border-brand-gray-200 my-1" />
              <button
                onClick={handlePowerBIClick}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-brand-gray-700 hover:bg-brand-gray-50 transition-colors text-left"
                aria-label="Open Power BI dashboard (simulated)"
              >
                <FormatIcon format="powerbi" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-gray-900">
                    Power BI
                  </p>
                  <p className="text-[10px] text-brand-gray-400 truncate">
                    Open in Power BI dashboard (simulated)
                  </p>
                </div>
                <svg className="w-3.5 h-3.5 text-brand-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </>
          )}

          {/* Permission warning */}
          {!canExport && (
            <div className="px-3 py-2 border-t border-brand-gray-200">
              <p className="text-[10px] text-red-500">
                You do not have permission to export data.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Feedback message */}
      {feedback && (
        <div
          className={`absolute right-0 mt-1 w-64 rounded-lg shadow-lg border px-3 py-2 z-40 ${
            feedback.type === 'success'
              ? 'bg-brand-green-50 border-brand-green-300 text-brand-green-700'
              : 'bg-red-50 border-red-300 text-red-700'
          }`}
          role="alert"
        >
          <div className="flex items-start gap-2">
            {feedback.type === 'success' ? (
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <p className="text-xs leading-relaxed">{feedback.message}</p>
            <button
              onClick={() => setFeedback(null)}
              className="flex-shrink-0 ml-auto"
              aria-label="Dismiss message"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ExportButton.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  filename: PropTypes.string,
  title: PropTypes.string,
  sheetName: PropTypes.string,
  label: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  showPowerBI: PropTypes.bool,
  onExportComplete: PropTypes.func,
  onExportError: PropTypes.func,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

ExportButton.defaultProps = {
  filename: 'export',
  title: 'Export Report',
  sheetName: 'Data',
  label: 'Export',
  className: undefined,
  disabled: false,
  showPowerBI: true,
  onExportComplete: undefined,
  onExportError: undefined,
  size: 'md',
};
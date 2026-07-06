/**
 * FilterBar Component
 * Reusable filter bar that renders a horizontal bar of filter dropdowns and search input.
 * Accepts filters config array (each with label, options, key) and onChange callback.
 * Includes clear all filters button.
 * @module FilterBar
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debounce } from '../utils/helpers.js';

/**
 * FilterBar component for rendering a horizontal bar of filter controls.
 *
 * @param {Object} props - Component props
 * @param {Array<{key: string, label: string, options: Array<{value: string, label: string}>, placeholder?: string}>} props.filters - Array of filter configurations
 * @param {Object} [props.values] - Current filter values keyed by filter key
 * @param {Function} props.onChange - Callback when any filter value changes, receives (key, value) or full values object
 * @param {Function} [props.onClearAll] - Callback when clear all button is clicked
 * @param {boolean} [props.showSearch] - Whether to show the search input (defaults to true)
 * @param {string} [props.searchValue] - Current search input value
 * @param {Function} [props.onSearchChange] - Callback when search input changes, receives the search string
 * @param {string} [props.searchPlaceholder] - Placeholder text for the search input
 * @param {string} [props.className] - Additional CSS classes to apply to the filter bar container
 * @returns {React.ReactElement} The filter bar component
 */
export default function FilterBar({
  filters,
  values,
  onChange,
  onClearAll,
  showSearch,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  className,
}) {
  const effectiveShowSearch = showSearch !== false;
  const effectiveValues = values || {};
  const effectiveSearchPlaceholder = searchPlaceholder || 'Search...';

  const [localSearchValue, setLocalSearchValue] = useState(searchValue || '');
  const searchInputRef = useRef(null);

  // Sync local search value with external prop
  useEffect(() => {
    if (searchValue !== undefined && searchValue !== null) {
      setLocalSearchValue(searchValue);
    }
  }, [searchValue]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () =>
      debounce((term) => {
        if (typeof onSearchChange === 'function') {
          onSearchChange(term);
        }
      }, 300),
    [onSearchChange]
  );

  /**
   * Handles search input changes.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event
   */
  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setLocalSearchValue(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  /**
   * Clears the search input.
   */
  const handleClearSearch = useCallback(() => {
    setLocalSearchValue('');
    if (typeof onSearchChange === 'function') {
      onSearchChange('');
    }
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [onSearchChange]);

  /**
   * Handles a filter dropdown change.
   * @param {string} key - The filter key
   * @param {React.ChangeEvent<HTMLSelectElement>} e - The change event
   */
  const handleFilterChange = useCallback(
    (key, e) => {
      const value = e.target.value;
      if (typeof onChange === 'function') {
        onChange(key, value);
      }
    },
    [onChange]
  );

  /**
   * Handles clearing all filters and search.
   */
  const handleClearAll = useCallback(() => {
    setLocalSearchValue('');
    if (typeof onSearchChange === 'function') {
      onSearchChange('');
    }
    if (typeof onClearAll === 'function') {
      onClearAll();
    }
  }, [onClearAll, onSearchChange]);

  /**
   * Determines whether any filter or search is active.
   * @returns {boolean}
   */
  const hasActiveFilters = useMemo(() => {
    if (localSearchValue && localSearchValue.trim() !== '') {
      return true;
    }

    if (!filters || !Array.isArray(filters)) {
      return false;
    }

    for (const filter of filters) {
      const val = effectiveValues[filter.key];
      if (val !== undefined && val !== null && val !== '') {
        return true;
      }
    }

    return false;
  }, [localSearchValue, filters, effectiveValues]);

  /**
   * Counts the number of active filters (excluding search).
   * @returns {number}
   */
  const activeFilterCount = useMemo(() => {
    if (!filters || !Array.isArray(filters)) {
      return 0;
    }

    let count = 0;
    for (const filter of filters) {
      const val = effectiveValues[filter.key];
      if (val !== undefined && val !== null && val !== '') {
        count++;
      }
    }
    return count;
  }, [filters, effectiveValues]);

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap${className ? ` ${className}` : ''}`}
      role="search"
      aria-label="Filter controls"
    >
      {/* Search input */}
      {effectiveShowSearch && (
        <div className="relative flex-shrink-0">
          <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
            <svg
              className="w-4 h-4 text-brand-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={localSearchValue}
            onChange={handleSearchChange}
            placeholder={effectiveSearchPlaceholder}
            className="w-full sm:w-48 pl-8 pr-8 py-1.5 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            aria-label="Search"
          />
          {localSearchValue && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-2 text-brand-gray-400 hover:text-brand-gray-600"
              aria-label="Clear search"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Filter dropdowns */}
      {Array.isArray(filters) &&
        filters.map((filter) => {
          const currentValue = effectiveValues[filter.key] || '';
          const filterPlaceholder = filter.placeholder || `All ${filter.label}`;

          return (
            <div key={filter.key} className="flex-shrink-0">
              <select
                value={currentValue}
                onChange={(e) => handleFilterChange(filter.key, e)}
                className="w-full sm:w-auto px-3 py-1.5 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none pr-8"
                aria-label={`Filter by ${filter.label}`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23939ba3' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="">{filterPlaceholder}</option>
                {Array.isArray(filter.options) &&
                  filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </div>
          );
        })}

      {/* Clear all button */}
      {hasActiveFilters && (
        <button
          onClick={handleClearAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-gray-600 bg-brand-gray-100 rounded-md hover:bg-brand-gray-200 transition-colors flex-shrink-0"
          aria-label="Clear all filters"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span>
            Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ' all'}
          </span>
        </button>
      )}
    </div>
  );
}

FilterBar.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
        })
      ).isRequired,
      placeholder: PropTypes.string,
    })
  ).isRequired,
  values: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  onClearAll: PropTypes.func,
  showSearch: PropTypes.bool,
  searchValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  className: PropTypes.string,
};

FilterBar.defaultProps = {
  values: {},
  onClearAll: undefined,
  showSearch: true,
  searchValue: undefined,
  onSearchChange: undefined,
  searchPlaceholder: 'Search...',
  className: undefined,
};
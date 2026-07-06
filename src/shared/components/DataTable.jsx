/**
 * DataTable Component
 * Reusable data table with sorting, pagination, search/filter, column visibility toggle,
 * row selection, and export button. Accessible with ARIA table roles and keyboard navigation.
 * Handles 1000+ rows with client-side pagination.
 * @module DataTable
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debounce, paginateArray, sortByField, filterBySearch } from '../utils/helpers.js';
import { ITEMS_PER_PAGE } from '../constants.js';
import { getItem, setItem } from '../services/storage.js';
import { STORAGE_KEYS } from '../constants.js';

/**
 * DataTable component for rendering tabular data with sorting, pagination,
 * search, column visibility, row selection, and export.
 *
 * @param {Object} props - Component props
 * @param {Array<{key: string, label: string, sortable?: boolean, visible?: boolean, render?: Function, className?: string}>} props.columns - Column configuration array
 * @param {Object[]} props.data - Array of data objects to display
 * @param {Function} [props.onExport] - Callback when export button is clicked, receives selected rows or all filtered data
 * @param {number} [props.pageSize] - Number of rows per page (defaults to ITEMS_PER_PAGE)
 * @param {string} [props.title] - Optional table title
 * @param {boolean} [props.selectable] - Whether rows are selectable (defaults to false)
 * @param {string[]} [props.searchFields] - Fields to search within (defaults to all column keys)
 * @param {string} [props.emptyMessage] - Message to display when no data is available
 * @param {string} [props.storageKey] - Optional localStorage key for persisting column visibility
 * @param {Function} [props.onRowClick] - Callback when a row is clicked, receives the row data
 * @param {string} [props.rowKeyField] - Field to use as unique row key (defaults to 'id')
 * @returns {React.ReactElement} The data table component
 */
export default function DataTable({
  columns,
  data,
  onExport,
  pageSize,
  title,
  selectable,
  searchFields,
  emptyMessage,
  storageKey,
  onRowClick,
  rowKeyField,
}) {
  const effectivePageSize = pageSize || getItem(STORAGE_KEYS.TABLE_PAGE_SIZE, ITEMS_PER_PAGE) || ITEMS_PER_PAGE;
  const keyField = rowKeyField || 'id';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [columnVisibility, setColumnVisibility] = useState(() => {
    if (storageKey) {
      const stored = getItem(`kp_etsip_dt_cols_${storageKey}`, null);
      if (stored && typeof stored === 'object') {
        return stored;
      }
    }
    const initial = {};
    if (Array.isArray(columns)) {
      for (const col of columns) {
        initial[col.key] = col.visible !== false;
      }
    }
    return initial;
  });
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  const columnMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Debounced search
  const debouncedSetSearch = useMemo(
    () =>
      debounce((term) => {
        setDebouncedSearchTerm(term);
        setCurrentPage(1);
      }, 300),
    []
  );

  /**
   * Handles search input changes.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event
   */
  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchTerm(value);
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  /**
   * Clears the search input.
   */
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCurrentPage(1);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Visible columns
  const visibleColumns = useMemo(() => {
    if (!Array.isArray(columns)) {
      return [];
    }
    return columns.filter((col) => columnVisibility[col.key] !== false);
  }, [columns, columnVisibility]);

  // Search fields
  const effectiveSearchFields = useMemo(() => {
    if (Array.isArray(searchFields) && searchFields.length > 0) {
      return searchFields;
    }
    if (Array.isArray(columns)) {
      return columns.map((col) => col.key);
    }
    return [];
  }, [searchFields, columns]);

  // Filtered data
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) {
      return [];
    }
    if (!debouncedSearchTerm || debouncedSearchTerm.trim() === '') {
      return data;
    }
    return filterBySearch(data, debouncedSearchTerm, effectiveSearchFields);
  }, [data, debouncedSearchTerm, effectiveSearchFields]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortField) {
      return filteredData;
    }
    return sortByField(filteredData, sortField, sortDirection);
  }, [filteredData, sortField, sortDirection]);

  // Paginated data
  const paginationResult = useMemo(() => {
    return paginateArray(sortedData, currentPage, effectivePageSize);
  }, [sortedData, currentPage, effectivePageSize]);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  // Close column menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setColumnMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Persist column visibility
  useEffect(() => {
    if (storageKey) {
      setItem(`kp_etsip_dt_cols_${storageKey}`, columnVisibility);
    }
  }, [columnVisibility, storageKey]);

  /**
   * Handles column header click for sorting.
   * @param {string} field - The column key to sort by
   */
  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
      setCurrentPage(1);
    },
    [sortField]
  );

  /**
   * Handles column header keyboard interaction.
   * @param {React.KeyboardEvent} e - The keyboard event
   * @param {string} field - The column key
   */
  const handleSortKeyDown = useCallback(
    (e, field) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSort(field);
      }
    },
    [handleSort]
  );

  /**
   * Toggles column visibility.
   * @param {string} key - The column key to toggle
   */
  const handleToggleColumn = useCallback((key) => {
    setColumnVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Ensure at least one column remains visible
      const visibleCount = Object.values(next).filter(Boolean).length;
      if (visibleCount === 0) {
        return prev;
      }
      return next;
    });
  }, []);

  /**
   * Toggles selection of a single row.
   * @param {string} rowKey - The unique key of the row
   */
  const handleToggleRow = useCallback((rowKey) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  }, []);

  /**
   * Toggles selection of all rows on the current page.
   */
  const handleToggleAll = useCallback(() => {
    const pageRowKeys = paginationResult.data.map((row) => {
      const key = row[keyField];
      return key !== undefined && key !== null ? String(key) : '';
    });

    setSelectedRows((prev) => {
      const allSelected = pageRowKeys.every((key) => prev.has(key));
      const next = new Set(prev);
      if (allSelected) {
        for (const key of pageRowKeys) {
          next.delete(key);
        }
      } else {
        for (const key of pageRowKeys) {
          if (key) {
            next.add(key);
          }
        }
      }
      return next;
    });
  }, [paginationResult.data, keyField]);

  /**
   * Handles export button click.
   */
  const handleExport = useCallback(() => {
    if (!onExport) {
      return;
    }

    if (selectedRows.size > 0) {
      const selectedData = sortedData.filter((row) => {
        const key = row[keyField];
        return key !== undefined && key !== null && selectedRows.has(String(key));
      });
      onExport(selectedData);
    } else {
      onExport(sortedData);
    }
  }, [onExport, selectedRows, sortedData, keyField]);

  /**
   * Handles page change.
   * @param {number} page - The page number to navigate to
   */
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  /**
   * Handles row click.
   * @param {Object} row - The row data
   */
  const handleRowClick = useCallback(
    (row) => {
      if (onRowClick) {
        onRowClick(row);
      }
    },
    [onRowClick]
  );

  /**
   * Handles row keyboard interaction.
   * @param {React.KeyboardEvent} e - The keyboard event
   * @param {Object} row - The row data
   */
  const handleRowKeyDown = useCallback(
    (e, row) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (onRowClick) {
          onRowClick(row);
        }
      }
    },
    [onRowClick]
  );

  /**
   * Renders the sort indicator for a column header.
   * @param {string} field - The column key
   * @returns {React.ReactElement|null}
   */
  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return (
        <svg className="w-3 h-3 ml-1 text-brand-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    if (sortDirection === 'asc') {
      return (
        <svg className="w-3 h-3 ml-1 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      );
    }

    return (
      <svg className="w-3 h-3 ml-1 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Check if all rows on current page are selected
  const allPageSelected = useMemo(() => {
    if (paginationResult.data.length === 0) {
      return false;
    }
    return paginationResult.data.every((row) => {
      const key = row[keyField];
      return key !== undefined && key !== null && selectedRows.has(String(key));
    });
  }, [paginationResult.data, selectedRows, keyField]);

  // Some rows on current page are selected
  const somePageSelected = useMemo(() => {
    if (paginationResult.data.length === 0) {
      return false;
    }
    const count = paginationResult.data.filter((row) => {
      const key = row[keyField];
      return key !== undefined && key !== null && selectedRows.has(String(key));
    }).length;
    return count > 0 && count < paginationResult.data.length;
  }, [paginationResult.data, selectedRows, keyField]);

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const total = paginationResult.totalPages;
    const current = paginationResult.page;
    const pages = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (current > 3) {
        pages.push('...');
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push('...');
      }

      pages.push(total);
    }

    return pages;
  }, [paginationResult.totalPages, paginationResult.page]);

  /**
   * Renders a cell value, using the column's render function if provided.
   * @param {Object} col - The column configuration
   * @param {Object} row - The row data
   * @param {number} rowIndex - The row index
   * @returns {React.ReactNode}
   */
  const renderCellValue = (col, row, rowIndex) => {
    if (typeof col.render === 'function') {
      try {
        return col.render(row[col.key], row, rowIndex);
      } catch {
        return String(row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '');
      }
    }

    const value = row[col.key];

    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  };

  const hasData = Array.isArray(data) && data.length > 0;
  const hasFilteredData = filteredData.length > 0;

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {title && (
            <h2 className="text-lg font-semibold text-brand-gray-900 truncate">
              {title}
            </h2>
          )}
          {hasData && (
            <span className="text-sm text-brand-gray-500 flex-shrink-0">
              {filteredData.length === data.length
                ? `${data.length} records`
                : `${filteredData.length} of ${data.length} records`}
              {selectedRows.size > 0 && ` · ${selectedRows.size} selected`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
              <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search..."
              className="w-48 pl-8 pr-8 py-1.5 text-sm border border-brand-gray-200 rounded-md bg-white text-brand-gray-900 placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              aria-label="Search table"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 flex items-center pr-2 text-brand-gray-400 hover:text-brand-gray-600"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Column visibility toggle */}
          <div className="relative" ref={columnMenuRef}>
            <button
              onClick={() => setColumnMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
              aria-label="Toggle column visibility"
              aria-expanded={columnMenuOpen}
              aria-haspopup="true"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden sm:inline">Columns</span>
            </button>

            {columnMenuOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-brand-gray-200 py-1 z-40 max-h-64 overflow-y-auto">
                {Array.isArray(columns) && columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-brand-gray-700 hover:bg-brand-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={columnVisibility[col.key] !== false}
                      onChange={() => handleToggleColumn(col.key)}
                      className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                    />
                    <span className="truncate">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Export button */}
          {onExport && (
            <button
              onClick={handleExport}
              disabled={!hasFilteredData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label={selectedRows.size > 0 ? `Export ${selectedRows.size} selected rows` : 'Export all filtered data'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">
                {selectedRows.size > 0 ? `Export (${selectedRows.size})` : 'Export'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-brand-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-brand-gray-200" role="table" aria-label={title || 'Data table'}>
          <thead className="bg-brand-gray-50">
            <tr role="row">
              {/* Selection checkbox header */}
              {selectable && (
                <th
                  scope="col"
                  className="w-10 px-3 py-3 text-left"
                  role="columnheader"
                >
                  <input
                    type="checkbox"
                    checked={allPageSelected && paginationResult.data.length > 0}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = somePageSelected;
                      }
                    }}
                    onChange={handleToggleAll}
                    className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                    aria-label="Select all rows on this page"
                  />
                </th>
              )}

              {/* Column headers */}
              {visibleColumns.map((col) => {
                const isSortable = col.sortable !== false;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-3 py-3 text-left text-xs font-semibold text-brand-gray-600 uppercase tracking-wider ${
                      isSortable ? 'cursor-pointer select-none group' : ''
                    } ${col.className || ''}`}
                    role="columnheader"
                    aria-sort={
                      sortField === col.key
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    tabIndex={isSortable ? 0 : undefined}
                    onClick={isSortable ? () => handleSort(col.key) : undefined}
                    onKeyDown={isSortable ? (e) => handleSortKeyDown(e, col.key) : undefined}
                  >
                    <div className="flex items-center">
                      <span>{col.label}</span>
                      {isSortable && renderSortIndicator(col.key)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-brand-gray-200">
            {paginationResult.data.length === 0 ? (
              <tr role="row">
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  className="px-3 py-12 text-center text-sm text-brand-gray-500"
                  role="cell"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-10 h-10 text-brand-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p>
                      {debouncedSearchTerm
                        ? `No results found for "${debouncedSearchTerm}"`
                        : emptyMessage || 'No data available'}
                    </p>
                    {debouncedSearchTerm && (
                      <button
                        onClick={handleClearSearch}
                        className="text-sm text-brand-500 hover:text-brand-600 font-medium"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginationResult.data.map((row, rowIndex) => {
                const rowKey = row[keyField] !== undefined && row[keyField] !== null
                  ? String(row[keyField])
                  : `row-${rowIndex}`;
                const isSelected = selectedRows.has(rowKey);
                const isClickable = typeof onRowClick === 'function';

                return (
                  <tr
                    key={rowKey}
                    role="row"
                    className={`${
                      isSelected
                        ? 'bg-brand-50'
                        : rowIndex % 2 === 0
                        ? 'bg-white'
                        : 'bg-brand-gray-50'
                    } ${isClickable ? 'cursor-pointer hover:bg-brand-100' : 'hover:bg-brand-gray-100'} transition-colors`}
                    tabIndex={isClickable ? 0 : undefined}
                    onClick={isClickable ? () => handleRowClick(row) : undefined}
                    onKeyDown={isClickable ? (e) => handleRowKeyDown(e, row) : undefined}
                    aria-selected={selectable ? isSelected : undefined}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <td className="w-10 px-3 py-2" role="cell">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleRow(rowKey);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-brand-500 border-brand-gray-300 rounded focus:ring-brand-500"
                          aria-label={`Select row ${rowKey}`}
                        />
                      </td>
                    )}

                    {/* Data cells */}
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2 text-sm text-brand-gray-700 ${col.className || ''}`}
                        role="cell"
                      >
                        {renderCellValue(col, row, rowIndex)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginationResult.totalPages > 1 && (
        <div className="flex flex-col gap-3 mt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-brand-gray-500">
            Showing {((paginationResult.page - 1) * paginationResult.pageSize) + 1} to{' '}
            {Math.min(paginationResult.page * paginationResult.pageSize, paginationResult.totalItems)} of{' '}
            {paginationResult.totalItems} results
          </div>

          <nav className="flex items-center gap-1" aria-label="Table pagination">
            {/* Previous button */}
            <button
              onClick={() => handlePageChange(paginationResult.page - 1)}
              disabled={!paginationResult.hasPreviousPage}
              className="inline-flex items-center px-2 py-1.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Page numbers */}
            {pageNumbers.map((pageNum, idx) => {
              if (pageNum === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 py-1.5 text-sm text-brand-gray-400"
                  >
                    …
                  </span>
                );
              }

              const isCurrentPage = pageNum === paginationResult.page;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`inline-flex items-center justify-center min-w-[32px] px-2 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isCurrentPage
                      ? 'bg-brand-500 text-white'
                      : 'text-brand-gray-700 bg-white border border-brand-gray-200 hover:bg-brand-gray-50'
                  }`}
                  aria-label={`Page ${pageNum}`}
                  aria-current={isCurrentPage ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next button */}
            <button
              onClick={() => handlePageChange(paginationResult.page + 1)}
              disabled={!paginationResult.hasNextPage}
              className="inline-flex items-center px-2 py-1.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      sortable: PropTypes.bool,
      visible: PropTypes.bool,
      render: PropTypes.func,
      className: PropTypes.string,
    })
  ).isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  onExport: PropTypes.func,
  pageSize: PropTypes.number,
  title: PropTypes.string,
  selectable: PropTypes.bool,
  searchFields: PropTypes.arrayOf(PropTypes.string),
  emptyMessage: PropTypes.string,
  storageKey: PropTypes.string,
  onRowClick: PropTypes.func,
  rowKeyField: PropTypes.string,
};

DataTable.defaultProps = {
  onExport: undefined,
  pageSize: undefined,
  title: undefined,
  selectable: false,
  searchFields: undefined,
  emptyMessage: 'No data available',
  storageKey: undefined,
  onRowClick: undefined,
  rowKeyField: 'id',
};
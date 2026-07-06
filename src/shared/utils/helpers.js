/**
 * Shared Utility Helpers
 * Common utility functions used across the KP-ETSIP application.
 * @module helpers
 */

import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../constants.js';

/**
 * Formats a date string or Date object into a human-readable format.
 * Returns the formatted date string in YYYY-MM-DD format by default,
 * or a locale-formatted string if options are provided.
 *
 * @param {string|Date|null|undefined} date - The date to format
 * @param {Object} [options] - Intl.DateTimeFormat options
 * @param {string} [options.locale='en-ZA'] - Locale string
 * @param {string} [options.year] - Year format: 'numeric' | '2-digit'
 * @param {string} [options.month] - Month format: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow'
 * @param {string} [options.day] - Day format: 'numeric' | '2-digit'
 * @param {string} [options.hour] - Hour format: 'numeric' | '2-digit'
 * @param {string} [options.minute] - Minute format: 'numeric' | '2-digit'
 * @param {string} [options.second] - Second format: 'numeric' | '2-digit'
 * @returns {string} Formatted date string, or empty string if input is invalid
 */
export function formatDate(date, options) {
  if (!date) {
    return '';
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return '';
    }

    if (options) {
      const { locale = 'en-ZA', ...formatOptions } = options;
      return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
    }

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Formats a number with locale-aware thousand separators and optional decimal places.
 *
 * @param {number|string|null|undefined} num - The number to format
 * @param {Object} [options] - Formatting options
 * @param {string} [options.locale='en-US'] - Locale string
 * @param {number} [options.minimumFractionDigits] - Minimum fraction digits
 * @param {number} [options.maximumFractionDigits] - Maximum fraction digits
 * @param {string} [options.style] - Number style: 'decimal' | 'currency' | 'percent'
 * @param {string} [options.currency] - Currency code (e.g., 'NAD') when style is 'currency'
 * @returns {string} Formatted number string, or '0' if input is invalid
 */
export function formatNumber(num, options) {
  if (num === null || num === undefined || num === '') {
    return '0';
  }

  const parsed = typeof num === 'string' ? parseFloat(num) : num;

  if (isNaN(parsed)) {
    return '0';
  }

  try {
    if (options) {
      const { locale = 'en-US', ...formatOptions } = options;
      return new Intl.NumberFormat(locale, formatOptions).format(parsed);
    }

    return new Intl.NumberFormat('en-US').format(parsed);
  } catch {
    return String(parsed);
  }
}

/**
 * Truncates text to a maximum length and appends an ellipsis if truncated.
 *
 * @param {string|null|undefined} text - The text to truncate
 * @param {number} [maxLen=100] - Maximum length before truncation
 * @param {string} [suffix='...'] - Suffix to append when truncated
 * @returns {string} Truncated text or original text if shorter than maxLen
 */
export function truncateText(text, maxLen = 100, suffix = '...') {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLen) {
    return text;
  }

  return text.substring(0, maxLen - suffix.length) + suffix;
}

/**
 * Generates a unique identifier string.
 * Uses a combination of timestamp and random characters.
 *
 * @param {string} [prefix='id'] - Prefix for the generated id
 * @returns {string} A unique identifier string
 */
export function generateId(prefix = 'id') {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${randomPart}`;
}

/**
 * Creates a debounced version of a function that delays invocation
 * until after the specified delay has elapsed since the last call.
 *
 * @param {Function} fn - The function to debounce
 * @param {number} [delay=300] - Delay in milliseconds
 * @returns {Function} The debounced function with a cancel() method
 */
export function debounce(fn, delay = 300) {
  let timeoutId = null;

  const debounced = function (...args) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };

  debounced.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Conditionally joins class names together, filtering out falsy values.
 * Supports strings, objects (where keys are class names and values are booleans),
 * and arrays.
 *
 * @param {...(string|Object|Array|null|undefined|boolean)} args - Class name arguments
 * @returns {string} Joined class names string
 */
export function classNames(...args) {
  const classes = [];

  for (const arg of args) {
    if (!arg) {
      continue;
    }

    if (typeof arg === 'string') {
      classes.push(arg);
      continue;
    }

    if (Array.isArray(arg)) {
      const inner = classNames(...arg);
      if (inner) {
        classes.push(inner);
      }
      continue;
    }

    if (typeof arg === 'object') {
      for (const key of Object.keys(arg)) {
        if (arg[key]) {
          classes.push(key);
        }
      }
    }
  }

  return classes.join(' ');
}

/**
 * Returns the Tailwind CSS color class for a given status value.
 * Matches against STATUS_OPTIONS from constants.
 *
 * @param {string|null|undefined} status - The status value (e.g., 'in_progress', 'completed')
 * @returns {string} Tailwind CSS color class string
 */
export function getStatusColor(status) {
  if (!status || typeof status !== 'string') {
    return 'bg-brand-gray-300';
  }

  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');

  const option = STATUS_OPTIONS.find(
    (opt) => opt.value === normalizedStatus || opt.label.toLowerCase().replace(/\s+/g, '_') === normalizedStatus
  );

  if (option) {
    return option.color;
  }

  // Additional status mappings for common variations
  const statusMap = {
    active: 'bg-brand-green-500',
    inactive: 'bg-brand-gray-400',
    archived: 'bg-brand-gray-500',
    deprecated: 'bg-yellow-400',
    in_development: 'bg-brand-500',
    healthy: 'bg-brand-green-500',
    degraded: 'bg-yellow-400',
    incident: 'bg-orange-500',
    rolled_back: 'bg-red-500',
    down: 'bg-red-500',
    available: 'bg-brand-green-500',
    inuse: 'bg-brand-500',
    in_use: 'bg-brand-500',
    maintenance: 'bg-yellow-400',
    connected: 'bg-brand-green-500',
    disconnected: 'bg-brand-gray-400',
    error: 'bg-red-500',
    passed: 'bg-brand-green-500',
    failed: 'bg-red-500',
    blocked: 'bg-orange-500',
    inprogress: 'bg-brand-500',
    queued: 'bg-brand-blue-300',
    pending: 'bg-yellow-400',
    new: 'bg-brand-gray-300',
    inreview: 'bg-brand-blue-300',
    approved: 'bg-brand-500',
    assigned: 'bg-brand-blue-400',
    closed: 'bg-brand-green-500',
    compliant: 'bg-brand-green-500',
    noncompliant: 'bg-red-500',
    partial: 'bg-yellow-400',
    released: 'bg-brand-green-500',
    readyforrelease: 'bg-brand-blue-300',
    ready_for_release: 'bg-brand-blue-300',
    waived: 'bg-yellow-400',
    success: 'bg-brand-green-500',
    failure: 'bg-red-500',
    warning: 'bg-yellow-400',
  };

  const mapped = statusMap[normalizedStatus];
  return mapped || 'bg-brand-gray-300';
}

/**
 * Returns the Tailwind CSS color class for a given priority value.
 * Matches against PRIORITY_OPTIONS from constants.
 *
 * @param {string|null|undefined} priority - The priority value (e.g., 'critical', 'high', 'medium', 'low')
 * @returns {string} Tailwind CSS color class string
 */
export function getPriorityColor(priority) {
  if (!priority || typeof priority !== 'string') {
    return 'bg-brand-gray-300';
  }

  const normalizedPriority = priority.toLowerCase().trim();

  const option = PRIORITY_OPTIONS.find(
    (opt) => opt.value === normalizedPriority || opt.label.toLowerCase() === normalizedPriority
  );

  if (option) {
    return option.color;
  }

  return 'bg-brand-gray-300';
}

/**
 * Calculates a percentage value from a part and total.
 * Returns 0 if total is 0 or inputs are invalid.
 *
 * @param {number} part - The numerator
 * @param {number} total - The denominator
 * @param {number} [decimals=1] - Number of decimal places to round to
 * @returns {number} The calculated percentage (0-100), rounded to the specified decimal places
 */
export function calculatePercentage(part, total, decimals = 1) {
  if (typeof part !== 'number' || typeof total !== 'number' || isNaN(part) || isNaN(total)) {
    return 0;
  }

  if (total === 0) {
    return 0;
  }

  const percentage = (part / total) * 100;
  const factor = Math.pow(10, decimals);
  return Math.round(percentage * factor) / factor;
}

/**
 * Sorts an array of objects by a specified field.
 * Returns a new sorted array without mutating the original.
 *
 * @param {Object[]} array - The array to sort
 * @param {string} field - The field name to sort by
 * @param {string} [direction='asc'] - Sort direction: 'asc' | 'desc'
 * @returns {Object[]} A new sorted array
 */
export function sortByField(array, field, direction = 'asc') {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }

  if (!field || typeof field !== 'string') {
    return [...array];
  }

  const multiplier = direction === 'desc' ? -1 : 1;

  return [...array].sort((a, b) => {
    let valA = a[field];
    let valB = b[field];

    // Handle null/undefined values
    if (valA === null || valA === undefined) {
      return 1 * multiplier;
    }
    if (valB === null || valB === undefined) {
      return -1 * multiplier;
    }

    // Date strings
    if (typeof valA === 'string' && typeof valB === 'string') {
      const dateA = new Date(valA);
      const dateB = new Date(valB);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime()) && valA.includes('-')) {
        return multiplier * (dateA.getTime() - dateB.getTime());
      }

      return multiplier * valA.localeCompare(valB, undefined, { sensitivity: 'base' });
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return multiplier * (valA - valB);
    }

    if (typeof valA === 'boolean' && typeof valB === 'boolean') {
      return multiplier * (Number(valA) - Number(valB));
    }

    return multiplier * String(valA).localeCompare(String(valB), undefined, { sensitivity: 'base' });
  });
}

/**
 * Filters an array of objects by a search term across specified fields.
 * Performs case-insensitive partial matching.
 *
 * @param {Object[]} array - The array to filter
 * @param {string} searchTerm - The search term to match
 * @param {string[]} fields - Array of field names to search within
 * @returns {Object[]} A new filtered array
 */
export function filterBySearch(array, searchTerm, fields) {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }

  if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim() === '') {
    return [...array];
  }

  if (!Array.isArray(fields) || fields.length === 0) {
    return [...array];
  }

  const termLower = searchTerm.toLowerCase().trim();

  return array.filter((item) => {
    for (const field of fields) {
      const value = item[field];

      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === 'string' && value.toLowerCase().includes(termLower)) {
        return true;
      }

      if (typeof value === 'number' && String(value).includes(termLower)) {
        return true;
      }

      if (Array.isArray(value)) {
        const hasMatch = value.some((v) => {
          if (typeof v === 'string') {
            return v.toLowerCase().includes(termLower);
          }
          return false;
        });
        if (hasMatch) {
          return true;
        }
      }
    }

    return false;
  });
}

/**
 * Paginates an array by returning a slice for the specified page and page size.
 * Returns the paginated slice along with pagination metadata.
 *
 * @param {Array} array - The array to paginate
 * @param {number} [page=1] - The current page number (1-based)
 * @param {number} [pageSize=10] - The number of items per page
 * @returns {{data: Array, page: number, pageSize: number, totalItems: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean}} Pagination result
 */
export function paginateArray(array, page = 1, pageSize = 10) {
  if (!Array.isArray(array)) {
    return {
      data: [],
      page: 1,
      pageSize,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  const totalItems = array.length;
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.ceil(totalItems / safePageSize);
  const clampedPage = Math.min(safePage, Math.max(totalPages, 1));

  const startIndex = (clampedPage - 1) * safePageSize;
  const endIndex = startIndex + safePageSize;
  const data = array.slice(startIndex, endIndex);

  return {
    data,
    page: clampedPage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    hasNextPage: clampedPage < totalPages,
    hasPreviousPage: clampedPage > 1,
  };
}
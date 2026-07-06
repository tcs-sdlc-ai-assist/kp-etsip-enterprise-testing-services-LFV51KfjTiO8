/**
 * StatusBadge Component
 * Reusable status badge that renders a colored pill/badge for status values.
 * Supports various status strings (Passed, Failed, Active, Retired, etc.)
 * with accessible color contrast. Accepts status string and optional size prop.
 * @module StatusBadge
 */

import PropTypes from 'prop-types';
import { getStatusColor } from '../utils/helpers.js';

/**
 * Maps a status string to foreground (text) and background color classes
 * with accessible contrast ratios.
 *
 * @param {string} status - The status value
 * @returns {{bg: string, text: string, ring: string}} Tailwind CSS classes for background, text, and ring
 */
function getStatusClasses(status) {
  if (!status || typeof status !== 'string') {
    return {
      bg: 'bg-brand-gray-100',
      text: 'text-brand-gray-700',
      ring: 'ring-brand-gray-300',
    };
  }

  const normalized = status.toLowerCase().replace(/\s+/g, '_');

  const statusMap = {
    // Execution statuses
    passed: { bg: 'bg-brand-green-50', text: 'text-brand-green-700', ring: 'ring-brand-green-300' },
    failed: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300' },
    blocked: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-300' },
    inprogress: { bg: 'bg-brand-50', text: 'text-brand-700', ring: 'ring-brand-300' },
    in_progress: { bg: 'bg-brand-50', text: 'text-brand-700', ring: 'ring-brand-300' },
    queued: { bg: 'bg-brand-blue-50', text: 'text-brand-blue-700', ring: 'ring-brand-blue-300' },

    // Application / general statuses
    active: { bg: 'bg-brand-green-50', text: 'text-brand-green-700', ring: 'ring-brand-green-300' },
    inactive: { bg: 'bg-brand-gray-100', text: 'text-brand-gray-600', ring: 'ring-brand-gray-300' },
    archived: { bg: 'bg-brand-gray-100', text: 'text-brand-gray-600', ring: 'ring-brand-gray-300' },
    deprecated: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-300' },
    in_development: { bg: 'bg-brand-50', text: 'text-brand-700', ring: 'ring-brand-300' },

    // Test asset statuses
    draft: { bg: 'bg-brand-gray-100', text: 'text-brand-gray-600', ring: 'ring-brand-gray-300' },
    retired: { bg: 'bg-brand-gray-100', text: 'text-brand-gray-600', ring: 'ring-brand-gray-300' },

    // Release statuses
    planning: { bg: 'bg-brand-gray-100', text: 'text-brand-gray-700', ring: 'ring-brand-gray-300' },
    readyforrelease: { bg: 'bg-brand-blue-50', text: 'text-brand-blue-700', ring: 'ring-brand-blue-300' },
    ready_for_release: { bg: 'bg-brand-blue-50', text: 'text-brand-blue-700', ring: 'ring-brand-blue-300' },
    released: { bg: 'bg-brand-green-50', text: 'text-brand-green-700', ring: 'ring-brand-green-300' },
    rolled_back: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300' },

    // Quality gate statuses
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-300' },
    waived: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-300' },

    // Governance statuses
    compliant: { bg: 'bg-brand-green-50', text: 'text-brand-green-700', ring: 'ring-brand-green-300' },
    noncompliant: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300' },
    partial: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-300' },

    // Environment statuses
    available: { bg: 'bg-brand-green-50', text: 'text-brand-green-700', ring: 'ring-brand-green-300' },
    inuse: { bg: 'bg-brand-50', text: 'text-brand-700', ring: 'ring-brand-300' },
    in_use: { bg: 'bg-brand-50', text: 'text-brand-700', ring: 'ring-brand-300' },
    maintenance: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-300' },
    down: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300' },

    // Integration statuses
    connected: { bg: 'bg-brand-green-50', text: 'text-brand-green-700', ring: 'ring-brand-green-300' },
    disconnected: { bg: 'bg-brand-gray-100', text: 'text-brand-gray-600', ring: 'ring-brand-gray-300' },
    error: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300' },

    // Post-deployment statuses
    healthy: { bg: 'bg-brand-green-50', text: 'text-brand-green-700', ring: 'ring-brand-green-300' },
    degraded: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-300' },
    incident: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-300' },
    rolled_back_deploy: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300' },

    // Demand statuses
    new: { bg: 'bg-brand-gray-100', text: 'text-brand-gray-700', ring: 'ring-brand-gray-300' },
    inreview: { bg: 'bg-brand-blue-50', text: 'text-brand-blue-700', ring: 'ring-brand-blue-300' },
    in_review: { bg: 'bg-brand-blue-50', text: 'text-brand-blue-700', ring: 'ring-brand-blue-300' },
    approved: { bg: 'bg-brand-50', text: 'text-brand-700', ring: 'ring-brand-300' },
    assigned: { bg: 'bg-brand-blue-50', text: 'text-brand-blue-700', ring: 'ring-brand-blue-300' },
    closed: { bg: 'bg-brand-green-50', text: 'text-brand-green-700', ring: 'ring-brand-green-300' },

    // Project statuses
    not_started: { bg: 'bg-brand-gray-100', text: 'text-brand-gray-700', ring: 'ring-brand-gray-300' },
    on_hold: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-300' },
    completed: { bg: 'bg-brand-green-50', text: 'text-brand-green-700', ring: 'ring-brand-green-300' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300' },
    delayed: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-300' },

    // Audit log statuses
    success: { bg: 'bg-brand-green-50', text: 'text-brand-green-700', ring: 'ring-brand-green-300' },
    failure: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300' },
    warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-300' },

    // Priority levels
    critical: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300' },
    high: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-300' },
    medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-300' },
    low: { bg: 'bg-brand-green-50', text: 'text-brand-green-700', ring: 'ring-brand-green-300' },

    // Automation health
    healthy_auto: { bg: 'bg-brand-green-50', text: 'text-brand-green-700', ring: 'ring-brand-green-300' },

    // Schedule statuses
    paused: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-300' },

    // User statuses
    suspended: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300' },
  };

  return statusMap[normalized] || {
    bg: 'bg-brand-gray-100',
    text: 'text-brand-gray-700',
    ring: 'ring-brand-gray-300',
  };
}

/**
 * Formats a status string for display by converting underscores/camelCase
 * to a human-readable label.
 *
 * @param {string} status - The raw status string
 * @returns {string} Formatted display label
 */
function formatStatusLabel(status) {
  if (!status || typeof status !== 'string') {
    return 'Unknown';
  }

  // Handle camelCase (e.g., 'InProgress' -> 'In Progress')
  let formatted = status.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Handle snake_case (e.g., 'in_progress' -> 'in progress')
  formatted = formatted.replace(/_/g, ' ');

  // Capitalize first letter of each word
  formatted = formatted
    .split(' ')
    .map((word) => {
      if (word.length === 0) {
        return '';
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return formatted;
}

/**
 * Returns size-specific Tailwind CSS classes for the badge.
 *
 * @param {'sm' | 'md' | 'lg'} size - The badge size
 * @returns {string} Tailwind CSS classes for the specified size
 */
function getSizeClasses(size) {
  switch (size) {
    case 'sm':
      return 'px-1.5 py-0.5 text-[10px] leading-tight';
    case 'lg':
      return 'px-3 py-1.5 text-sm';
    case 'md':
    default:
      return 'px-2 py-0.5 text-xs';
  }
}

/**
 * StatusBadge component for rendering colored pill/badge for status values.
 * Provides accessible color contrast with background, text, and ring colors.
 *
 * @param {Object} props - Component props
 * @param {string} props.status - The status value to display (e.g., 'Passed', 'Failed', 'Active')
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Badge size variant
 * @param {string} [props.className] - Additional CSS classes to apply
 * @returns {React.ReactElement} The status badge component
 */
export default function StatusBadge({ status, size, className }) {
  const effectiveSize = size || 'md';
  const { bg, text, ring } = getStatusClasses(status);
  const sizeClasses = getSizeClasses(effectiveSize);
  const label = formatStatusLabel(status);

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ring-1 ring-inset whitespace-nowrap ${bg} ${text} ${ring} ${sizeClasses}${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

StatusBadge.defaultProps = {
  size: 'md',
  className: undefined,
};
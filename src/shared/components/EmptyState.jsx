/**
 * EmptyState Component
 * Reusable empty state component that displays an icon, message, and optional action button
 * when no data is available. Used across dashboards, tables, and list views.
 * Accepts icon, title, description, actionLabel, onAction props.
 * @module EmptyState
 */

import PropTypes from 'prop-types';

/**
 * Default icon SVG rendered when no custom icon is provided.
 *
 * @returns {React.ReactElement} Default empty state SVG icon
 */
function DefaultIcon() {
  return (
    <svg
      className="w-12 h-12 text-brand-gray-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

/**
 * EmptyState component for displaying a placeholder when no data is available.
 * Renders an icon, title, optional description, and optional action button
 * in a centered, vertically stacked layout.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} [props.icon] - Custom icon element to display (defaults to a mailbox icon)
 * @param {string} [props.title='No data available'] - Title text displayed below the icon
 * @param {string} [props.description] - Optional description text displayed below the title
 * @param {string} [props.actionLabel] - Label for the optional action button
 * @param {Function} [props.onAction] - Callback when the action button is clicked
 * @param {string} [props.className] - Additional CSS classes for the container
 * @returns {React.ReactElement} The empty state component
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) {
  const effectiveTitle = title || 'No data available';
  const hasAction = actionLabel && typeof onAction === 'function';

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center${className ? ` ${className}` : ''}`}
    >
      {/* Icon */}
      <div className="mb-4">
        {icon || <DefaultIcon />}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-brand-gray-700 mb-1">
        {effectiveTitle}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-brand-gray-500 max-w-md leading-relaxed">
          {description}
        </p>
      )}

      {/* Action button */}
      {hasAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.string,
  description: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  className: PropTypes.string,
};

EmptyState.defaultProps = {
  icon: undefined,
  title: 'No data available',
  description: undefined,
  actionLabel: undefined,
  onAction: undefined,
  className: undefined,
};
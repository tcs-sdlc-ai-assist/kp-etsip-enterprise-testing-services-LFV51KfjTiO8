/**
 * LoadingSpinner Component
 * Reusable loading spinner with accessible sr-only text.
 * Accepts size and label props for customization.
 * @module LoadingSpinner
 */

import PropTypes from 'prop-types';

/**
 * Returns size-specific Tailwind CSS classes for the spinner.
 *
 * @param {'sm' | 'md' | 'lg' | 'xl'} size - The spinner size variant
 * @returns {{container: string, spinner: string, border: string}} Tailwind CSS classes
 */
function getSizeClasses(size) {
  switch (size) {
    case 'sm':
      return {
        container: 'py-4',
        spinner: 'w-5 h-5',
        border: 'border-2',
      };
    case 'lg':
      return {
        container: 'py-16',
        spinner: 'w-10 h-10',
        border: 'border-4',
      };
    case 'xl':
      return {
        container: 'py-24',
        spinner: 'w-14 h-14',
        border: 'border-4',
      };
    case 'md':
    default:
      return {
        container: 'py-12',
        spinner: 'w-8 h-8',
        border: 'border-4',
      };
  }
}

/**
 * LoadingSpinner component for displaying an accessible animated spinner
 * with screen-reader-only text.
 *
 * @param {Object} props - Component props
 * @param {'sm' | 'md' | 'lg' | 'xl'} [props.size='md'] - Spinner size variant
 * @param {string} [props.label='Loading...'] - Accessible label for screen readers and optional visible text
 * @param {boolean} [props.showLabel=false] - Whether to display the label text visually below the spinner
 * @param {string} [props.className] - Additional CSS classes for the container
 * @returns {React.ReactElement} The loading spinner component
 */
export default function LoadingSpinner({ size, label, showLabel, className }) {
  const effectiveSize = size || 'md';
  const effectiveLabel = label || 'Loading...';
  const effectiveShowLabel = showLabel === true;
  const sizeClasses = getSizeClasses(effectiveSize);

  return (
    <div
      className={`flex items-center justify-center ${sizeClasses.container}${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-2">
        <div
          className={`${sizeClasses.spinner} ${sizeClasses.border} border-brand-200 border-t-brand-500 rounded-full animate-spin`}
          aria-hidden="true"
        />
        {effectiveShowLabel ? (
          <p className="text-sm text-brand-gray-400">{effectiveLabel}</p>
        ) : (
          <span className="sr-only">{effectiveLabel}</span>
        )}
      </div>
    </div>
  );
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  label: PropTypes.string,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
};

LoadingSpinner.defaultProps = {
  size: 'md',
  label: 'Loading...',
  showLabel: false,
  className: undefined,
};
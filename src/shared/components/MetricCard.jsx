/**
 * MetricCard Component
 * Reusable metric card displaying a KPI with label, value, trend indicator (up/down/neutral),
 * and optional sparkline. Used across all dashboards.
 * Accepts label, value, trend, trendValue, icon, sparklineData, className, onClick props.
 * @module MetricCard
 */

import PropTypes from 'prop-types';

/**
 * Renders a small inline sparkline SVG from an array of numeric data points.
 *
 * @param {Object} props - Component props
 * @param {number[]} props.data - Array of numeric values for the sparkline
 * @param {string} props.color - Stroke color for the sparkline path
 * @returns {React.ReactElement|null} The sparkline SVG or null if data is insufficient
 */
function Sparkline({ data, color }) {
  if (!Array.isArray(data) || data.length < 2) {
    return null;
  }

  const width = 80;
  const height = 28;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = points.reduce((acc, point, index) => {
    if (index === 0) {
      return `M ${point}`;
    }
    return `${acc} L ${point}`;
  }, '');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="flex-shrink-0"
      aria-hidden="true"
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

Sparkline.propTypes = {
  data: PropTypes.arrayOf(PropTypes.number).isRequired,
  color: PropTypes.string.isRequired,
};

/**
 * Returns trend-specific styling and icon based on the trend direction.
 *
 * @param {'up' | 'down' | 'neutral'} trend - The trend direction
 * @returns {{textClass: string, bgClass: string, sparklineColor: string, icon: React.ReactElement}} Trend styling and icon
 */
function getTrendStyles(trend) {
  switch (trend) {
    case 'up':
      return {
        textClass: 'text-brand-green-600',
        bgClass: 'bg-brand-green-50',
        sparklineColor: '#0f9d58',
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        ),
      };
    case 'down':
      return {
        textClass: 'text-red-600',
        bgClass: 'bg-red-50',
        sparklineColor: '#ef4444',
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        ),
      };
    case 'neutral':
    default:
      return {
        textClass: 'text-brand-gray-500',
        bgClass: 'bg-brand-gray-100',
        sparklineColor: '#78828c',
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        ),
      };
  }
}

/**
 * MetricCard component for displaying a KPI metric with label, value, trend indicator,
 * and optional sparkline visualization.
 *
 * @param {Object} props - Component props
 * @param {string} props.label - The metric label/title
 * @param {string|number} props.value - The metric value to display
 * @param {'up' | 'down' | 'neutral'} [props.trend='neutral'] - Trend direction
 * @param {string} [props.trendValue] - Trend value text (e.g., '+3.8%', '-2.1%')
 * @param {React.ReactNode} [props.icon] - Optional icon element to display
 * @param {number[]} [props.sparklineData] - Optional array of numeric values for a sparkline chart
 * @param {string} [props.className] - Additional CSS classes to apply to the card
 * @param {Function} [props.onClick] - Optional click handler for the card
 * @param {string} [props.suffix] - Optional suffix for the value (e.g., '%', 'hrs')
 * @param {string} [props.prefix] - Optional prefix for the value (e.g., 'NAD', '$')
 * @returns {React.ReactElement} The metric card component
 */
export default function MetricCard({
  label,
  value,
  trend,
  trendValue,
  icon,
  sparklineData,
  className,
  onClick,
  suffix,
  prefix,
}) {
  const effectiveTrend = trend || 'neutral';
  const trendStyles = getTrendStyles(effectiveTrend);
  const isClickable = typeof onClick === 'function';

  const displayValue = value !== null && value !== undefined ? String(value) : '—';

  return (
    <div
      className={`bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm transition-all duration-150 ${
        isClickable ? 'cursor-pointer hover:shadow-md hover:border-brand-300' : ''
      }${className ? ` ${className}` : ''}`}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : undefined}
      aria-label={isClickable ? `${label}: ${displayValue}` : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left section: icon + label + value */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {icon && (
              <div className="flex-shrink-0 w-8 h-8 rounded-md bg-brand-50 flex items-center justify-center text-brand-500">
                {icon}
              </div>
            )}
            <p className="text-sm font-medium text-brand-gray-500 truncate">
              {label}
            </p>
          </div>

          <div className="flex items-baseline gap-1 mt-1">
            {prefix && (
              <span className="text-sm font-medium text-brand-gray-500">
                {prefix}
              </span>
            )}
            <p className="text-2xl font-bold text-brand-gray-900 tracking-tight">
              {displayValue}
            </p>
            {suffix && (
              <span className="text-sm font-medium text-brand-gray-500">
                {suffix}
              </span>
            )}
          </div>
        </div>

        {/* Right section: sparkline */}
        {sparklineData && Array.isArray(sparklineData) && sparklineData.length >= 2 && (
          <div className="flex-shrink-0 mt-2">
            <Sparkline data={sparklineData} color={trendStyles.sparklineColor} />
          </div>
        )}
      </div>

      {/* Trend indicator */}
      {trendValue && (
        <div className="flex items-center gap-1.5 mt-3">
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${trendStyles.bgClass} ${trendStyles.textClass}`}
          >
            {trendStyles.icon}
            <span>{trendValue}</span>
          </span>
          <span className="text-xs text-brand-gray-400">
            {effectiveTrend === 'up'
              ? 'increase'
              : effectiveTrend === 'down'
              ? 'decrease'
              : 'no change'}
          </span>
        </div>
      )}
    </div>
  );
}

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  trend: PropTypes.oneOf(['up', 'down', 'neutral']),
  trendValue: PropTypes.string,
  icon: PropTypes.node,
  sparklineData: PropTypes.arrayOf(PropTypes.number),
  className: PropTypes.string,
  onClick: PropTypes.func,
  suffix: PropTypes.string,
  prefix: PropTypes.string,
};

MetricCard.defaultProps = {
  trend: 'neutral',
  trendValue: undefined,
  icon: undefined,
  sparklineData: undefined,
  className: undefined,
  onClick: undefined,
  suffix: undefined,
  prefix: undefined,
};
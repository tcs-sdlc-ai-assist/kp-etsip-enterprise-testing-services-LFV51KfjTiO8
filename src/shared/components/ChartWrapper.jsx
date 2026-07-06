/**
 * ChartWrapper Component
 * Reusable chart wrapper that wraps Recharts components (BarChart, LineChart, PieChart, AreaChart)
 * with consistent styling, responsive container, accessible labels, and loading state.
 * Accepts chartType, data, config props.
 * @module ChartWrapper
 */

import { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

/**
 * Default color palette for chart series.
 * @type {string[]}
 */
const DEFAULT_COLORS = [
  '#0069cc',
  '#0f9d58',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
  '#a855f7',
];

/**
 * Custom tooltip component with consistent styling.
 *
 * @param {Object} props - Recharts tooltip props
 * @param {boolean} props.active - Whether the tooltip is active
 * @param {Array} props.payload - Tooltip payload data
 * @param {string} props.label - Tooltip label
 * @param {string} [props.valueFormatter] - Optional value formatter function
 * @returns {React.ReactElement|null} The custom tooltip or null
 */
function CustomTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-brand-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      {label && (
        <p className="text-brand-gray-600 font-medium mb-1 text-xs">{label}</p>
      )}
      {payload.map((entry, index) => {
        const displayValue = typeof valueFormatter === 'function'
          ? valueFormatter(entry.value, entry.name)
          : entry.value;

        return (
          <div key={index} className="flex items-center gap-2 py-0.5">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color || entry.fill || DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
            />
            <span className="text-brand-gray-500 text-xs">{entry.name || entry.dataKey}:</span>
            <span className="text-brand-gray-900 font-medium text-xs">{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  valueFormatter: PropTypes.func,
};

CustomTooltip.defaultProps = {
  active: false,
  payload: [],
  label: '',
  valueFormatter: undefined,
};

/**
 * Renders a loading skeleton placeholder for the chart area.
 *
 * @param {Object} props - Component props
 * @param {number} props.height - Height of the loading skeleton
 * @returns {React.ReactElement} The loading skeleton
 */
function ChartLoadingSkeleton({ height }) {
  return (
    <div
      className="flex items-center justify-center bg-brand-gray-50 rounded-lg animate-pulse"
      style={{ height: height || 300 }}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-sm text-brand-gray-400">Loading chart...</p>
      </div>
    </div>
  );
}

ChartLoadingSkeleton.propTypes = {
  height: PropTypes.number,
};

ChartLoadingSkeleton.defaultProps = {
  height: 300,
};

/**
 * Renders an empty state placeholder when no data is available.
 *
 * @param {Object} props - Component props
 * @param {number} props.height - Height of the empty state
 * @param {string} [props.message] - Custom empty state message
 * @returns {React.ReactElement} The empty state
 */
function ChartEmptyState({ height, message }) {
  return (
    <div
      className="flex items-center justify-center bg-brand-gray-50 rounded-lg border border-brand-gray-200"
      style={{ height: height || 300 }}
    >
      <div className="flex flex-col items-center gap-2 text-center px-4">
        <svg className="w-10 h-10 text-brand-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <p className="text-sm text-brand-gray-500">
          {message || 'No data available to display'}
        </p>
      </div>
    </div>
  );
}

ChartEmptyState.propTypes = {
  height: PropTypes.number,
  message: PropTypes.string,
};

ChartEmptyState.defaultProps = {
  height: 300,
  message: undefined,
};

/**
 * Renders a BarChart with the provided data and configuration.
 *
 * @param {Object} props - Component props
 * @param {Object[]} props.data - Chart data array
 * @param {Object} props.config - Chart configuration
 * @returns {React.ReactElement} The bar chart
 */
function RenderBarChart({ data, config }) {
  const xKey = config.xAxisKey || 'name';
  const series = config.series || [{ dataKey: 'value', name: 'Value' }];
  const colors = config.colors || DEFAULT_COLORS;
  const stacked = config.stacked === true;
  const layout = config.layout || 'horizontal';

  return (
    <BarChart
      data={data}
      layout={layout}
      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e4e6e8" />
      {layout === 'vertical' ? (
        <>
          <XAxis type="number" tick={{ fontSize: 11, fill: '#78828c' }} />
          <YAxis dataKey={xKey} type="category" tick={{ fontSize: 11, fill: '#78828c' }} width={100} />
        </>
      ) : (
        <>
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#78828c' }} />
          <YAxis tick={{ fontSize: 11, fill: '#78828c' }} />
        </>
      )}
      <Tooltip content={<CustomTooltip valueFormatter={config.valueFormatter} />} />
      {config.showLegend !== false && (
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
      )}
      {series.map((s, index) => (
        <Bar
          key={s.dataKey}
          dataKey={s.dataKey}
          name={s.name || s.dataKey}
          fill={s.color || colors[index % colors.length]}
          stackId={stacked ? 'stack' : undefined}
          radius={stacked ? undefined : [2, 2, 0, 0]}
          maxBarSize={config.maxBarSize || 50}
        />
      ))}
    </BarChart>
  );
}

RenderBarChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  config: PropTypes.object.isRequired,
};

/**
 * Renders a LineChart with the provided data and configuration.
 *
 * @param {Object} props - Component props
 * @param {Object[]} props.data - Chart data array
 * @param {Object} props.config - Chart configuration
 * @returns {React.ReactElement} The line chart
 */
function RenderLineChart({ data, config }) {
  const xKey = config.xAxisKey || 'name';
  const series = config.series || [{ dataKey: 'value', name: 'Value' }];
  const colors = config.colors || DEFAULT_COLORS;

  return (
    <LineChart
      data={data}
      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e4e6e8" />
      <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#78828c' }} />
      <YAxis tick={{ fontSize: 11, fill: '#78828c' }} />
      <Tooltip content={<CustomTooltip valueFormatter={config.valueFormatter} />} />
      {config.showLegend !== false && (
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
      )}
      {series.map((s, index) => (
        <Line
          key={s.dataKey}
          type={s.type || 'monotone'}
          dataKey={s.dataKey}
          name={s.name || s.dataKey}
          stroke={s.color || colors[index % colors.length]}
          strokeWidth={s.strokeWidth || 2}
          dot={s.dot !== undefined ? s.dot : { r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls={true}
        />
      ))}
    </LineChart>
  );
}

RenderLineChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  config: PropTypes.object.isRequired,
};

/**
 * Renders a PieChart with the provided data and configuration.
 *
 * @param {Object} props - Component props
 * @param {Object[]} props.data - Chart data array
 * @param {Object} props.config - Chart configuration
 * @returns {React.ReactElement} The pie chart
 */
function RenderPieChart({ data, config }) {
  const dataKey = config.dataKey || 'value';
  const nameKey = config.nameKey || 'name';
  const colors = config.colors || DEFAULT_COLORS;
  const innerRadius = config.innerRadius || 0;
  const outerRadius = config.outerRadius || '80%';
  const showLabel = config.showLabel !== false;

  /**
   * Custom label renderer for pie slices.
   * @param {Object} props - Label props from Recharts
   * @returns {React.ReactElement|null} The label element
   */
  const renderLabel = ({ name, percent }) => {
    if (!showLabel || percent < 0.05) {
      return null;
    }
    return `${name} (${(percent * 100).toFixed(0)}%)`;
  };

  return (
    <PieChart>
      <Pie
        data={data}
        dataKey={dataKey}
        nameKey={nameKey}
        cx="50%"
        cy="50%"
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        paddingAngle={data.length > 1 ? 2 : 0}
        label={showLabel ? renderLabel : false}
        labelLine={showLabel}
      >
        {data.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={entry.color || colors[index % colors.length]}
          />
        ))}
      </Pie>
      <Tooltip content={<CustomTooltip valueFormatter={config.valueFormatter} />} />
      {config.showLegend !== false && (
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
      )}
    </PieChart>
  );
}

RenderPieChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  config: PropTypes.object.isRequired,
};

/**
 * Renders an AreaChart with the provided data and configuration.
 *
 * @param {Object} props - Component props
 * @param {Object[]} props.data - Chart data array
 * @param {Object} props.config - Chart configuration
 * @returns {React.ReactElement} The area chart
 */
function RenderAreaChart({ data, config }) {
  const xKey = config.xAxisKey || 'name';
  const series = config.series || [{ dataKey: 'value', name: 'Value' }];
  const colors = config.colors || DEFAULT_COLORS;
  const stacked = config.stacked === true;

  return (
    <AreaChart
      data={data}
      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e4e6e8" />
      <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#78828c' }} />
      <YAxis tick={{ fontSize: 11, fill: '#78828c' }} />
      <Tooltip content={<CustomTooltip valueFormatter={config.valueFormatter} />} />
      {config.showLegend !== false && (
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
      )}
      {series.map((s, index) => {
        const color = s.color || colors[index % colors.length];
        return (
          <Area
            key={s.dataKey}
            type={s.type || 'monotone'}
            dataKey={s.dataKey}
            name={s.name || s.dataKey}
            stroke={color}
            fill={color}
            fillOpacity={s.fillOpacity !== undefined ? s.fillOpacity : 0.15}
            strokeWidth={s.strokeWidth || 2}
            stackId={stacked ? 'stack' : undefined}
            connectNulls={true}
          />
        );
      })}
    </AreaChart>
  );
}

RenderAreaChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  config: PropTypes.object.isRequired,
};

/**
 * ChartWrapper component for rendering Recharts charts with consistent styling,
 * responsive container, accessible labels, and loading/empty states.
 *
 * @param {Object} props - Component props
 * @param {'bar' | 'line' | 'pie' | 'area'} props.chartType - The type of chart to render
 * @param {Object[]} props.data - Array of data objects for the chart
 * @param {Object} [props.config] - Chart configuration object
 * @param {string} [props.config.xAxisKey] - Key for the X axis data (defaults to 'name')
 * @param {string} [props.config.dataKey] - Key for the data values (used by PieChart, defaults to 'value')
 * @param {string} [props.config.nameKey] - Key for the name field (used by PieChart, defaults to 'name')
 * @param {Array<{dataKey: string, name?: string, color?: string, type?: string, strokeWidth?: number, dot?: boolean|Object, fillOpacity?: number}>} [props.config.series] - Array of series configurations for multi-series charts
 * @param {string[]} [props.config.colors] - Array of color hex strings for the chart series
 * @param {boolean} [props.config.stacked] - Whether to stack bars/areas (defaults to false)
 * @param {boolean} [props.config.showLegend] - Whether to show the legend (defaults to true)
 * @param {boolean} [props.config.showLabel] - Whether to show labels on pie slices (defaults to true)
 * @param {string} [props.config.layout] - Layout for bar chart: 'horizontal' | 'vertical' (defaults to 'horizontal')
 * @param {number} [props.config.innerRadius] - Inner radius for donut charts (defaults to 0)
 * @param {number|string} [props.config.outerRadius] - Outer radius for pie charts (defaults to '80%')
 * @param {number} [props.config.maxBarSize] - Maximum bar width in pixels (defaults to 50)
 * @param {Function} [props.config.valueFormatter] - Function to format tooltip values: (value, name) => string
 * @param {string} [props.title] - Optional chart title
 * @param {string} [props.subtitle] - Optional chart subtitle
 * @param {number} [props.height] - Chart height in pixels (defaults to 300)
 * @param {boolean} [props.loading] - Whether the chart is in a loading state
 * @param {string} [props.emptyMessage] - Custom message when no data is available
 * @param {string} [props.className] - Additional CSS classes for the wrapper
 * @param {string} [props.ariaLabel] - Accessible label for the chart region
 * @returns {React.ReactElement} The chart wrapper component
 */
export default function ChartWrapper({
  chartType,
  data,
  config,
  title,
  subtitle,
  height,
  loading,
  emptyMessage,
  className,
  ariaLabel,
}) {
  const effectiveHeight = height || 300;
  const effectiveConfig = config || {};

  const hasData = useMemo(() => {
    return Array.isArray(data) && data.length > 0;
  }, [data]);

  const accessibleLabel = ariaLabel || title || `${chartType || 'data'} chart`;

  /**
   * Renders the appropriate chart component based on chartType.
   * @returns {React.ReactElement|null} The chart component
   */
  const renderChart = () => {
    if (!chartType || typeof chartType !== 'string') {
      return null;
    }

    const normalizedType = chartType.toLowerCase().trim();

    switch (normalizedType) {
      case 'bar':
        return <RenderBarChart data={data} config={effectiveConfig} />;
      case 'line':
        return <RenderLineChart data={data} config={effectiveConfig} />;
      case 'pie':
        return <RenderPieChart data={data} config={effectiveConfig} />;
      case 'area':
        return <RenderAreaChart data={data} config={effectiveConfig} />;
      default:
        return (
          <div
            className="flex items-center justify-center text-sm text-brand-gray-500"
            style={{ height: effectiveHeight }}
          >
            Unsupported chart type: {chartType}
          </div>
        );
    }
  };

  return (
    <div
      className={`w-full${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={accessibleLabel}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <h3 className="text-sm font-semibold text-brand-gray-900">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs text-brand-gray-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Chart content */}
      {loading ? (
        <ChartLoadingSkeleton height={effectiveHeight} />
      ) : !hasData ? (
        <ChartEmptyState height={effectiveHeight} message={emptyMessage} />
      ) : (
        <ResponsiveContainer width="100%" height={effectiveHeight}>
          {renderChart()}
        </ResponsiveContainer>
      )}
    </div>
  );
}

ChartWrapper.propTypes = {
  chartType: PropTypes.oneOf(['bar', 'line', 'pie', 'area']).isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  config: PropTypes.shape({
    xAxisKey: PropTypes.string,
    dataKey: PropTypes.string,
    nameKey: PropTypes.string,
    series: PropTypes.arrayOf(
      PropTypes.shape({
        dataKey: PropTypes.string.isRequired,
        name: PropTypes.string,
        color: PropTypes.string,
        type: PropTypes.string,
        strokeWidth: PropTypes.number,
        dot: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
        fillOpacity: PropTypes.number,
      })
    ),
    colors: PropTypes.arrayOf(PropTypes.string),
    stacked: PropTypes.bool,
    showLegend: PropTypes.bool,
    showLabel: PropTypes.bool,
    layout: PropTypes.oneOf(['horizontal', 'vertical']),
    innerRadius: PropTypes.number,
    outerRadius: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    maxBarSize: PropTypes.number,
    valueFormatter: PropTypes.func,
  }),
  title: PropTypes.string,
  subtitle: PropTypes.string,
  height: PropTypes.number,
  loading: PropTypes.bool,
  emptyMessage: PropTypes.string,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

ChartWrapper.defaultProps = {
  config: {},
  title: undefined,
  subtitle: undefined,
  height: 300,
  loading: false,
  emptyMessage: 'No data available to display',
  className: undefined,
  ariaLabel: undefined,
};
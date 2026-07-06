/**
 * TestExecutionDetail Component
 * Test Execution Detail screen (FR-012): displays execution details (test name, status,
 * executor, duration, environment), execution logs panel (timestamped log entries),
 * evidence section (simulated file attachments with mock file picker), and AI analysis
 * section (simulated insights/recommendations). Uses executionService.getExecutionById().
 * @module TestExecutionDetail
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext.jsx';
import {
  getExecutionById,
  addExecutionEvidence,
  appendExecutionLog,
  setAIAnalysis,
  updateExecutionStatus,
} from '../../shared/services/executionService.js';
import MetricCard from '../../shared/components/MetricCard.jsx';
import ExportButton from '../../shared/components/ExportButton.jsx';
import LoadingSpinner from '../../shared/components/LoadingSpinner.jsx';
import StatusBadge from '../../shared/components/StatusBadge.jsx';
import EmptyState from '../../shared/components/EmptyState.jsx';

/**
 * Formats a date string for display.
 *
 * @param {string} dateStr - ISO 8601 date string
 * @returns {string} Formatted date string
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) {
    return '';
  }
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Formats a date string for display with time.
 *
 * @param {string} dateStr - ISO 8601 date string
 * @returns {string} Formatted date/time string
 */
function formatDisplayDateTime(dateStr) {
  if (!dateStr) {
    return '';
  }
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Formats a status string for display.
 *
 * @param {string} status - The raw status string
 * @returns {string} Formatted display label
 */
function formatStatusLabel(status) {
  if (!status || typeof status !== 'string') {
    return 'Unknown';
  }
  return status
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * TestExecutionDetail page component.
 * Displays execution details including test name, status, executor, duration,
 * environment, execution logs panel, evidence section, and AI analysis section.
 *
 * @returns {React.ReactElement} The test execution detail page
 */
export default function TestExecutionDetail() {
  const { currentUser, role } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Evidence upload simulation state
  const [evidenceUploading, setEvidenceUploading] = useState(false);

  // Log filter state
  const [logFilter, setLogFilter] = useState('all');

  /**
   * Fetches the execution data by id.
   */
  const fetchExecution = useCallback(async () => {
    if (!id) {
      setError('No execution ID provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const exec = await getExecutionById(id);
      if (!exec) {
        setError('Execution not found.');
        setLoading(false);
        return;
      }
      setExecution(exec);
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Failed to load execution details.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchExecution();
  }, [fetchExecution]);

  /**
   * Handles navigating back.
   */
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  /**
   * Handles simulated evidence upload.
   */
  const handleUploadEvidence = useCallback(async () => {
    if (!execution) {
      return;
    }

    setEvidenceUploading(true);

    try {
      const evidenceTypes = ['screenshot', 'log_file', 'video', 'report'];
      const randomType = evidenceTypes[Math.floor(Math.random() * evidenceTypes.length)];
      const extensions = {
        screenshot: '.png',
        log_file: '.log',
        video: '.mp4',
        report: '.pdf',
      };
      const ext = extensions[randomType] || '.txt';
      const fileName = `evidence_${Date.now()}${ext}`;

      const updated = addExecutionEvidence(execution.id, {
        type: randomType,
        name: fileName,
      });

      if (updated) {
        setExecution({ ...updated });
      }
    } catch {
      // Ignore evidence upload errors in simulation
    } finally {
      setEvidenceUploading(false);
    }
  }, [execution]);

  /**
   * Handles adding a simulated log entry.
   */
  const handleAddLog = useCallback(() => {
    if (!execution) {
      return;
    }

    const messages = [
      'Checkpoint reached: validating assertions',
      'Data verification step completed',
      'Waiting for element to become visible',
      'API response received successfully',
      'Test step executed without errors',
    ];
    const levels = ['info', 'info', 'info', 'debug', 'warn'];
    const randomIndex = Math.floor(Math.random() * messages.length);

    const updated = appendExecutionLog(execution.id, levels[randomIndex], messages[randomIndex]);

    if (updated) {
      setExecution({ ...updated });
    }
  }, [execution]);

  /**
   * Handles generating simulated AI analysis.
   */
  const handleGenerateAIAnalysis = useCallback(async () => {
    if (!execution) {
      return;
    }

    const isFailed = execution.status === 'Failed';

    const analysis = {
      summary: isFailed
        ? `Execution ${execution.id} failed during test step execution. The failure appears to be related to an assertion mismatch in the expected output.`
        : `Execution ${execution.id} completed successfully. All test steps passed within expected thresholds.`,
      rootCause: isFailed
        ? 'The expected value did not match the actual value returned by the application. This may be caused by a recent code change affecting the output format.'
        : 'No root cause analysis needed — execution passed all quality checks.',
      recommendation: isFailed
        ? 'Review the recent code changes in the affected module. Consider updating the test assertion to match the new output format, or revert the code change if the output change was unintentional.'
        : 'No action required. Consider adding this test to the daily regression suite for continuous validation.',
      confidence: isFailed ? 82 : 95,
      relatedDefects: isFailed ? [`DEF-${Math.floor(Math.random() * 2000) + 1000}`] : [],
    };

    const updated = setAIAnalysis(execution.id, analysis);

    if (updated) {
      setExecution({ ...updated });
    }
  }, [execution]);

  /**
   * Filtered logs based on the selected log level filter.
   */
  const filteredLogs = useMemo(() => {
    if (!execution || !execution.logs || execution.logs.length === 0) {
      return [];
    }

    if (logFilter === 'all') {
      return execution.logs;
    }

    return execution.logs.filter((log) => log.level === logFilter);
  }, [execution, logFilter]);

  /**
   * Log level counts for filter badges.
   */
  const logLevelCounts = useMemo(() => {
    if (!execution || !execution.logs || execution.logs.length === 0) {
      return { info: 0, warn: 0, error: 0, debug: 0 };
    }

    const counts = { info: 0, warn: 0, error: 0, debug: 0 };
    for (const log of execution.logs) {
      if (counts[log.level] !== undefined) {
        counts[log.level]++;
      }
    }
    return counts;
  }, [execution]);

  /**
   * Export data for the execution detail.
   */
  const exportData = useMemo(() => {
    if (!execution) {
      return [];
    }

    return [{
      id: execution.id,
      testAssetId: execution.testAssetId,
      suiteName: execution.suiteName,
      application: execution.application,
      type: execution.type,
      status: execution.status,
      executor: execution.executor,
      executorEmail: execution.executorEmail,
      startTime: execution.startTime,
      endTime: execution.endTime,
      duration: execution.duration,
      environment: execution.environment,
      hasAIAnalysis: execution.aiAnalysis ? 'Yes' : 'No',
      evidenceCount: execution.evidence ? execution.evidence.length : 0,
      logCount: execution.logs ? execution.logs.length : 0,
    }];
  }, [execution]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" label="Loading execution details..." showLabel />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <svg
            className="w-4 h-4 text-red-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchExecution}
            className="ml-auto text-sm font-medium text-red-600 hover:text-red-700"
          >
            Retry
          </button>
        </div>
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="p-6">
        <EmptyState
          title="Execution not found"
          description="The requested execution could not be found. It may have been removed or the ID is incorrect."
          actionLabel="Go Back"
          onAction={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={handleBack}
            className="mt-1 p-1.5 rounded-md text-brand-gray-500 hover:text-brand-gray-700 hover:bg-brand-gray-100 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-brand-gray-900">
                Execution: {execution.id}
              </h1>
              <StatusBadge status={execution.status} size="md" />
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${execution.type === 'Automated' ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300' : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300'}`}>
                {execution.type}
              </span>
            </div>
            <p className="text-sm text-brand-gray-500 mt-1">
              {execution.application} · {execution.suiteName} · {execution.environment}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {exportData.length > 0 && (
            <ExportButton
              data={exportData}
              filename={`execution-detail-${execution.id}`}
              title={`Execution Detail: ${execution.id}`}
              sheetName="Execution Detail"
              label="Export"
              size="md"
            />
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Status"
          value={formatStatusLabel(execution.status)}
          trend={execution.status === 'Passed' ? 'up' : execution.status === 'Failed' ? 'down' : 'neutral'}
          trendValue={execution.status === 'Passed' ? 'Success' : execution.status === 'Failed' ? 'Failed' : ''}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Duration"
          value={execution.duration !== null && execution.duration !== undefined ? execution.duration : '—'}
          trend="neutral"
          suffix={execution.duration !== null && execution.duration !== undefined ? 's' : ''}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Log Entries"
          value={execution.logs ? execution.logs.length : 0}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <MetricCard
          label="Evidence"
          value={execution.evidence ? execution.evidence.length : 0}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          }
        />
        <MetricCard
          label="Environment"
          value={execution.environment}
          trend="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <MetricCard
          label="AI Analysis"
          value={execution.aiAnalysis ? 'Available' : 'None'}
          trend={execution.aiAnalysis ? 'up' : 'neutral'}
          trendValue={execution.aiAnalysis ? `${execution.aiAnalysis.confidence}% confidence` : ''}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        />
      </div>

      {/* Execution Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-brand-gray-900">Execution Details</h2>

          <div className="space-y-3">
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Execution ID</p>
              <p className="text-xs font-mono text-brand-gray-700">{execution.id}</p>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Test Asset ID</p>
              <p className="text-xs font-mono text-brand-gray-600">{execution.testAssetId}</p>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Application</p>
              <p className="text-sm font-medium text-brand-gray-900">{execution.application}</p>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Suite</p>
              <p className="text-sm font-medium text-brand-gray-900">{execution.suiteName}</p>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Executor</p>
              <p className="text-sm font-medium text-brand-gray-900">{execution.executor}</p>
              {execution.executorEmail && (
                <p className="text-xs text-brand-gray-500 truncate">{execution.executorEmail}</p>
              )}
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Type</p>
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${execution.type === 'Automated' ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300' : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-300'}`}>
                {execution.type}
              </span>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Environment</p>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 ring-1 ring-inset ring-brand-gray-300">
                {execution.environment}
              </span>
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Status</p>
              <StatusBadge status={execution.status} size="md" />
            </div>
            <div className="bg-brand-gray-50 rounded-lg p-3">
              <p className="text-xs text-brand-gray-500 mb-1">Duration</p>
              <p className="text-sm font-medium text-brand-gray-900">
                {execution.duration !== null && execution.duration !== undefined
                  ? `${execution.duration}s`
                  : '—'}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2 text-sm text-brand-gray-600 pt-2 border-t border-brand-gray-200">
            {execution.startTime && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Started: {formatDisplayDateTime(execution.startTime)}</span>
              </div>
            )}
            {execution.endTime && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Ended: {formatDisplayDateTime(execution.endTime)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Logs, Evidence, AI Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Execution Logs Panel */}
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-brand-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-brand-gray-900">
                  Execution Logs
                </h3>
                <span className="text-xs text-brand-gray-500">
                  ({execution.logs ? execution.logs.length : 0} entries)
                </span>
              </div>
              <button
                onClick={handleAddLog}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Log</span>
              </button>
            </div>

            {/* Log Level Filters */}
            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto">
              <button
                onClick={() => setLogFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  logFilter === 'all'
                    ? 'bg-brand-500 text-white'
                    : 'bg-brand-gray-100 text-brand-gray-600 hover:bg-brand-gray-200'
                }`}
              >
                All ({execution.logs ? execution.logs.length : 0})
              </button>
              <button
                onClick={() => setLogFilter('info')}
                className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  logFilter === 'info'
                    ? 'bg-brand-500 text-white'
                    : 'bg-brand-gray-100 text-brand-gray-600 hover:bg-brand-gray-200'
                }`}
              >
                Info ({logLevelCounts.info})
              </button>
              <button
                onClick={() => setLogFilter('warn')}
                className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  logFilter === 'warn'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-brand-gray-100 text-brand-gray-600 hover:bg-brand-gray-200'
                }`}
              >
                Warn ({logLevelCounts.warn})
              </button>
              <button
                onClick={() => setLogFilter('error')}
                className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  logFilter === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-brand-gray-100 text-brand-gray-600 hover:bg-brand-gray-200'
                }`}
              >
                Error ({logLevelCounts.error})
              </button>
              <button
                onClick={() => setLogFilter('debug')}
                className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  logFilter === 'debug'
                    ? 'bg-brand-gray-500 text-white'
                    : 'bg-brand-gray-100 text-brand-gray-600 hover:bg-brand-gray-200'
                }`}
              >
                Debug ({logLevelCounts.debug})
              </button>
            </div>

            {/* Log Entries */}
            {filteredLogs.length > 0 ? (
              <div className="space-y-1 max-h-80 overflow-y-auto bg-brand-gray-900 rounded-lg p-3">
                {filteredLogs.map((log, index) => {
                  let textColor = 'text-brand-gray-300';
                  if (log.level === 'error') {
                    textColor = 'text-red-400';
                  } else if (log.level === 'warn') {
                    textColor = 'text-yellow-400';
                  } else if (log.level === 'debug') {
                    textColor = 'text-brand-gray-500';
                  }

                  return (
                    <div key={index} className="flex gap-2 text-xs font-mono">
                      <span className="text-brand-gray-500 whitespace-nowrap flex-shrink-0">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                      </span>
                      <span className={`uppercase w-12 flex-shrink-0 ${textColor}`}>
                        [{log.level}]
                      </span>
                      <span className={textColor}>
                        {log.message}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 bg-brand-gray-50 rounded-lg">
                <p className="text-sm text-brand-gray-500">
                  {logFilter === 'all' ? 'No log entries available.' : `No ${logFilter} log entries found.`}
                </p>
              </div>
            )}
          </div>

          {/* Evidence Section */}
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-brand-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-brand-gray-900">
                  Evidence
                </h3>
                <span className="text-xs text-brand-gray-500">
                  ({execution.evidence ? execution.evidence.length : 0} attachments)
                </span>
              </div>
              <button
                onClick={handleUploadEvidence}
                disabled={evidenceUploading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-brand-gray-700 bg-white border border-brand-gray-200 rounded-md hover:bg-brand-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {evidenceUploading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-brand-gray-400 border-t-transparent rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Upload Evidence</span>
                  </>
                )}
              </button>
            </div>

            {execution.evidence && execution.evidence.length > 0 ? (
              <div className="space-y-2">
                {execution.evidence.map((ev) => {
                  let iconColor = 'text-brand-gray-400';
                  if (ev.type === 'screenshot') {
                    iconColor = 'text-brand-500';
                  } else if (ev.type === 'log_file') {
                    iconColor = 'text-yellow-500';
                  } else if (ev.type === 'video') {
                    iconColor = 'text-purple-500';
                  } else if (ev.type === 'report') {
                    iconColor = 'text-red-500';
                  }

                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between bg-brand-gray-50 rounded-lg p-3 border border-brand-gray-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <svg className={`w-5 h-5 flex-shrink-0 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="min-w-0">
                          <p className="text-sm text-brand-gray-700 truncate">{ev.name}</p>
                          <p className="text-xs text-brand-gray-500">
                            {ev.type.replace(/_/g, ' ')} · {formatDisplayDateTime(ev.capturedAt)}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-brand-gray-100 text-brand-gray-600 ring-1 ring-inset ring-brand-gray-300 flex-shrink-0 ml-2">
                        {ev.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 bg-brand-gray-50 rounded-lg">
                <svg className="w-10 h-10 text-brand-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <p className="text-sm text-brand-gray-500">No evidence attachments yet.</p>
                <button
                  onClick={handleUploadEvidence}
                  disabled={evidenceUploading}
                  className="mt-2 text-xs text-brand-500 hover:text-brand-600 font-medium"
                >
                  Upload simulated evidence
                </button>
              </div>
            )}
          </div>

          {/* AI Analysis Section */}
          <div className="bg-white rounded-lg border border-brand-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-brand-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-brand-gray-900">
                  AI Analysis
                </h3>
                {execution.aiAnalysis && execution.aiAnalysis.confidence > 0 && (
                  <span className="text-xs text-brand-gray-500">
                    ({execution.aiAnalysis.confidence}% confidence)
                  </span>
                )}
              </div>
              {!execution.aiAnalysis && (
                <button
                  onClick={handleGenerateAIAnalysis}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>Generate Analysis</span>
                </button>
              )}
            </div>

            {execution.aiAnalysis ? (
              <div className="bg-brand-gray-50 rounded-lg p-4 border border-brand-gray-200 space-y-4">
                {/* Confidence Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-brand-gray-500">Confidence</span>
                    <span className="text-xs font-semibold text-brand-gray-700">{execution.aiAnalysis.confidence}%</span>
                  </div>
                  <div className="h-2 bg-brand-gray-200 rounded-full">
                    <div
                      className={`h-2 rounded-full ${execution.aiAnalysis.confidence >= 80 ? 'bg-brand-green-500' : execution.aiAnalysis.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(execution.aiAnalysis.confidence, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Summary */}
                {execution.aiAnalysis.summary && (
                  <div>
                    <p className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-1">Summary</p>
                    <p className="text-sm text-brand-gray-700 leading-relaxed">{execution.aiAnalysis.summary}</p>
                  </div>
                )}

                {/* Root Cause */}
                {execution.aiAnalysis.rootCause && (
                  <div>
                    <p className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-1">Root Cause</p>
                    <p className="text-sm text-brand-gray-700 leading-relaxed">{execution.aiAnalysis.rootCause}</p>
                  </div>
                )}

                {/* Recommendation */}
                {execution.aiAnalysis.recommendation && (
                  <div>
                    <p className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-1">Recommendation</p>
                    <p className="text-sm text-brand-gray-700 leading-relaxed">{execution.aiAnalysis.recommendation}</p>
                  </div>
                )}

                {/* Related Defects */}
                {execution.aiAnalysis.relatedDefects && execution.aiAnalysis.relatedDefects.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-1">Related Defects</p>
                    <div className="flex flex-wrap gap-1">
                      {execution.aiAnalysis.relatedDefects.map((defect, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-300"
                        >
                          {defect}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regenerate Button */}
                <div className="pt-2 border-t border-brand-gray-200">
                  <button
                    onClick={handleGenerateAIAnalysis}
                    className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                  >
                    Regenerate Analysis
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 bg-brand-gray-50 rounded-lg">
                <svg className="w-10 h-10 text-brand-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-sm text-brand-gray-500">No AI analysis available for this execution.</p>
                <p className="text-xs text-brand-gray-400 mt-1">Click "Generate Analysis" to create a simulated AI analysis.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-brand-gray-50 rounded-lg border border-brand-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-brand-gray-500">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${execution.status === 'Passed' ? 'bg-brand-green-500' : execution.status === 'Failed' ? 'bg-red-500' : execution.status === 'Blocked' ? 'bg-orange-500' : execution.status === 'InProgress' ? 'bg-brand-500' : 'bg-brand-gray-400'}`} />
            <span>Status: {formatStatusLabel(execution.status)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${execution.type === 'Automated' ? 'bg-brand-500' : 'bg-yellow-500'}`} />
            <span>{execution.type}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{execution.environment}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-gray-400" />
            <span>{execution.logs ? execution.logs.length : 0} Log Entries</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>{execution.evidence ? execution.evidence.length : 0} Evidence</span>
          </div>
          <div className="ml-auto text-[10px] text-brand-gray-400">
            Started: {formatDisplayDateTime(execution.startTime) || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
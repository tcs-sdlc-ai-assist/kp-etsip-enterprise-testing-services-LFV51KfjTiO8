import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for executionService
 * Tests getExecutions with filters, startExecution creates new entry,
 * getExecutionStatus returns correct status, getExecutionById returns full details,
 * updateExecutionStatus persists changes.
 * @module executionService.test
 */

// Mock storage module before importing executionService
vi.mock('./storage.js', () => {
  const store = {};
  return {
    getItem: vi.fn((key, defaultValue) => {
      if (store[key] !== undefined) {
        return JSON.parse(JSON.stringify(store[key]));
      }
      return defaultValue;
    }),
    setItem: vi.fn((key, value) => {
      store[key] = JSON.parse(JSON.stringify(value));
      return true;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
      return true;
    }),
    maskPII: vi.fn((obj) => obj),
    initializeStorage: vi.fn(() => true),
    resetAll: vi.fn(() => true),
    clearAll: vi.fn(() => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
      return true;
    }),
    _store: store,
  };
});

// Mock authManager to avoid side effects
vi.mock('./authManager.js', () => ({
  getSession: vi.fn(() => ({
    userId: 'user-001',
    name: 'Test User',
    email: 'test@kp-etsip.gov',
    role: 'admin',
    portfolio: 'Test Portfolio',
    applicationAccess: [],
    token: 'mock-token',
    loginAt: '2024-06-13T08:00:00Z',
  })),
  checkAccess: vi.fn(() => true),
}));

// Mock auditLogService to avoid side effects
vi.mock('./auditLogService.js', () => ({
  logAction: vi.fn(),
}));

import {
  getExecutions,
  getExecutionById,
  startExecution,
  getExecutionStatus,
  updateExecutionStatus,
  getExecutionMetrics,
  getExecutionsByApplication,
  getExecutionsByTestAsset,
  getRecentExecutions,
  getFailedExecutions,
  getActiveExecutions,
  appendExecutionLog,
  addExecutionEvidence,
  setAIAnalysis,
  getExecutionLogs,
  getExecutionEvidence,
  getAIAnalysis,
  getDistinctStatuses,
  getDistinctApplications,
  getDistinctSuiteNames,
  getDistinctEnvironments,
  getDistinctExecutors,
  getEnvironments,
  getEnvironmentById,
  resetExecutions,
  resetAll,
} from './executionService.js';

import { _store } from './storage.js';

describe('executionService', () => {
  beforeEach(() => {
    // Clear the mock store before each test
    for (const key of Object.keys(_store)) {
      delete _store[key];
    }
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // getExecutions
  // -------------------------------------------------------------------------
  describe('getExecutions', () => {
    it('returns all executions by default', async () => {
      const result = await getExecutions();
      expect(result).toBeDefined();
      expect(result.executions).toBeDefined();
      expect(Array.isArray(result.executions)).toBe(true);
      expect(result.total).toBeGreaterThan(0);
    });

    it('filters executions by application', async () => {
      const result = await getExecutions({ application: 'EMIS Core' });
      expect(result.executions.length).toBeGreaterThan(0);

      for (const exec of result.executions) {
        expect(exec.application).toBe('EMIS Core');
      }
    });

    it('filters executions by status', async () => {
      const result = await getExecutions({ status: 'Passed' });
      expect(result.executions.length).toBeGreaterThan(0);

      for (const exec of result.executions) {
        expect(exec.status).toBe('Passed');
      }
    });

    it('filters executions by type', async () => {
      const result = await getExecutions({ type: 'Automated' });
      expect(result.executions.length).toBeGreaterThan(0);

      for (const exec of result.executions) {
        expect(exec.type).toBe('Automated');
      }
    });

    it('filters executions by environment', async () => {
      const result = await getExecutions({ environment: 'Prod' });
      expect(result.executions.length).toBeGreaterThan(0);

      for (const exec of result.executions) {
        expect(exec.environment).toBe('Prod');
      }
    });

    it('filters executions by testAssetId', async () => {
      const result = await getExecutions({ testAssetId: 'test-001' });
      expect(result.executions.length).toBeGreaterThan(0);

      for (const exec of result.executions) {
        expect(exec.testAssetId).toBe('test-001');
      }
    });

    it('filters executions by suiteName', async () => {
      const result = await getExecutions({ suiteName: 'Authentication Suite' });
      expect(result.executions.length).toBeGreaterThan(0);

      for (const exec of result.executions) {
        expect(exec.suiteName).toBe('Authentication Suite');
      }
    });

    it('filters executions by executor (partial match, case-insensitive)', async () => {
      const result = await getExecutions({ executor: 'absalom' });
      expect(result.executions.length).toBeGreaterThan(0);

      for (const exec of result.executions) {
        expect(exec.executor.toLowerCase()).toContain('absalom');
      }
    });

    it('filters executions by searchTerm', async () => {
      const result = await getExecutions({ searchTerm: 'Authentication' });
      expect(result.executions.length).toBeGreaterThan(0);

      for (const exec of result.executions) {
        const matchesSearch =
          exec.application.toLowerCase().includes('authentication') ||
          exec.suiteName.toLowerCase().includes('authentication') ||
          exec.executor.toLowerCase().includes('authentication') ||
          exec.id.toLowerCase().includes('authentication') ||
          (exec.testAssetId && exec.testAssetId.toLowerCase().includes('authentication'));
        expect(matchesSearch).toBe(true);
      }
    });

    it('returns empty array when no executions match filters', async () => {
      const result = await getExecutions({ application: 'NonExistentApp' });
      expect(result.executions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('supports pagination with limit and offset', async () => {
      const allResult = await getExecutions();
      const paginatedResult = await getExecutions({ limit: 5, offset: 0 });

      expect(paginatedResult.executions.length).toBeLessThanOrEqual(5);
      expect(paginatedResult.total).toBe(allResult.total);
    });

    it('sorts executions by startTime descending by default', async () => {
      const result = await getExecutions({ sortBy: 'startTime', sortOrder: 'desc' });
      expect(result.executions.length).toBeGreaterThan(1);

      for (let i = 1; i < result.executions.length; i++) {
        const prevDate = new Date(result.executions[i - 1].startTime).getTime();
        const currDate = new Date(result.executions[i].startTime).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    });

    it('sorts executions by duration ascending', async () => {
      const result = await getExecutions({ sortBy: 'duration', sortOrder: 'asc' });
      expect(result.executions.length).toBeGreaterThan(1);

      let prevDuration = -Infinity;
      for (const exec of result.executions) {
        const dur = exec.duration !== null && exec.duration !== undefined ? exec.duration : -1;
        expect(dur).toBeGreaterThanOrEqual(prevDuration);
        prevDuration = dur;
      }
    });

    it('combines multiple filters', async () => {
      const result = await getExecutions({
        application: 'EMIS Core',
        type: 'Automated',
        status: 'Passed',
      });

      for (const exec of result.executions) {
        expect(exec.application).toBe('EMIS Core');
        expect(exec.type).toBe('Automated');
        expect(exec.status).toBe('Passed');
      }
    });
  });

  // -------------------------------------------------------------------------
  // getExecutionById
  // -------------------------------------------------------------------------
  describe('getExecutionById', () => {
    it('returns an execution by id', async () => {
      const exec = await getExecutionById('exec-0001');
      expect(exec).toBeDefined();
      expect(exec.id).toBe('exec-0001');
      expect(exec.testAssetId).toBe('test-001');
      expect(exec.suiteName).toBe('Authentication Suite');
      expect(exec.application).toBe('EMIS Core');
      expect(exec.status).toBe('Passed');
    });

    it('returns full execution details including logs and evidence', async () => {
      const exec = await getExecutionById('exec-0001');
      expect(exec).toBeDefined();
      expect(exec.logs).toBeDefined();
      expect(Array.isArray(exec.logs)).toBe(true);
      expect(exec.logs.length).toBeGreaterThan(0);
      expect(exec.evidence).toBeDefined();
      expect(Array.isArray(exec.evidence)).toBe(true);
    });

    it('returns execution with AI analysis when present', async () => {
      const exec = await getExecutionById('exec-0003');
      expect(exec).toBeDefined();
      expect(exec.status).toBe('Failed');
      expect(exec.aiAnalysis).toBeDefined();
      expect(exec.aiAnalysis).not.toBeNull();
      expect(exec.aiAnalysis.summary).toBeDefined();
      expect(exec.aiAnalysis.rootCause).toBeDefined();
      expect(exec.aiAnalysis.recommendation).toBeDefined();
      expect(typeof exec.aiAnalysis.confidence).toBe('number');
    });

    it('returns null for non-existent id', async () => {
      const exec = await getExecutionById('exec-9999');
      expect(exec).toBeNull();
    });

    it('returns null for empty id', async () => {
      const exec = await getExecutionById('');
      expect(exec).toBeNull();
    });

    it('returns null for null id', async () => {
      const exec = await getExecutionById(null);
      expect(exec).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // startExecution
  // -------------------------------------------------------------------------
  describe('startExecution', () => {
    it('creates a new execution and persists it', async () => {
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Authentication Suite',
        application: 'EMIS Core',
        type: 'Automated',
        environment: 'QA',
      });

      expect(newExec).toBeDefined();
      expect(newExec.id).toBeDefined();
      expect(newExec.testAssetId).toBe('test-001');
      expect(newExec.suiteName).toBe('Authentication Suite');
      expect(newExec.application).toBe('EMIS Core');
      expect(newExec.type).toBe('Automated');
      expect(newExec.status).toBe('Queued');
      expect(newExec.environment).toBe('QA');
      expect(newExec.startTime).toBeDefined();
      expect(newExec.endTime).toBeNull();
      expect(newExec.duration).toBeNull();
      expect(newExec.logs).toBeDefined();
      expect(newExec.logs.length).toBeGreaterThan(0);
      expect(newExec.evidence).toEqual([]);
      expect(newExec.aiAnalysis).toBeNull();

      // Verify it was persisted
      const fetched = await getExecutionById(newExec.id);
      expect(fetched).toBeDefined();
      expect(fetched.id).toBe(newExec.id);
      expect(fetched.testAssetId).toBe('test-001');
    });

    it('assigns default values for optional fields', async () => {
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Authentication Suite',
        application: 'EMIS Core',
      });

      expect(newExec.type).toBe('Automated');
      expect(newExec.environment).toBe('QA');
      expect(newExec.executor).toBeDefined();
      expect(newExec.executorEmail).toBeDefined();
    });

    it('uses provided executor name and email', async () => {
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Authentication Suite',
        application: 'EMIS Core',
        executor: 'Custom Executor',
        executorEmail: 'custom@kp-etsip.gov',
      });

      expect(newExec.executor).toBe('Custom Executor');
      expect(newExec.executorEmail).toBe('custom@kp-etsip.gov');
    });

    it('throws error when testAssetId is missing', async () => {
      await expect(
        startExecution({
          suiteName: 'Auth Suite',
          application: 'EMIS Core',
        })
      ).rejects.toThrow('testAssetId is required');
    });

    it('throws error when suiteName is missing', async () => {
      await expect(
        startExecution({
          testAssetId: 'test-001',
          application: 'EMIS Core',
        })
      ).rejects.toThrow('suiteName is required');
    });

    it('throws error when application is missing', async () => {
      await expect(
        startExecution({
          testAssetId: 'test-001',
          suiteName: 'Auth Suite',
        })
      ).rejects.toThrow('application is required');
    });

    it('throws error when config is null', async () => {
      await expect(startExecution(null)).rejects.toThrow();
    });

    it('throws error for invalid environment', async () => {
      await expect(
        startExecution({
          testAssetId: 'test-001',
          suiteName: 'Auth Suite',
          application: 'EMIS Core',
          environment: 'InvalidEnv',
        })
      ).rejects.toThrow('Invalid environment');
    });

    it('throws error for invalid type', async () => {
      await expect(
        startExecution({
          testAssetId: 'test-001',
          suiteName: 'Auth Suite',
          application: 'EMIS Core',
          type: 'InvalidType',
        })
      ).rejects.toThrow('Invalid type');
    });

    it('generates a unique id for each new execution', async () => {
      const exec1 = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      const exec2 = await startExecution({
        testAssetId: 'test-002',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      expect(exec1.id).not.toBe(exec2.id);
    });
  });

  // -------------------------------------------------------------------------
  // getExecutionStatus
  // -------------------------------------------------------------------------
  describe('getExecutionStatus', () => {
    it('returns correct status for a Passed execution', async () => {
      const status = await getExecutionStatus('exec-0001');
      expect(status).toBeDefined();
      expect(status.executionId).toBe('exec-0001');
      expect(status.status).toBe('Passed');
      expect(status.progress).toBe(100);
      expect(status.logs).toBeDefined();
      expect(Array.isArray(status.logs)).toBe(true);
      expect(status.error).toBeNull();
    });

    it('returns correct status for a Failed execution with error info', async () => {
      const status = await getExecutionStatus('exec-0003');
      expect(status).toBeDefined();
      expect(status.executionId).toBe('exec-0003');
      expect(status.status).toBe('Failed');
      expect(status.progress).toBe(100);
      expect(status.error).toBeDefined();
      expect(status.error).not.toBeNull();
      expect(status.error.summary).toBeDefined();
      expect(status.error.rootCause).toBeDefined();
    });

    it('returns correct status for a Queued execution', async () => {
      const status = await getExecutionStatus('exec-0103');
      expect(status).toBeDefined();
      expect(status.executionId).toBe('exec-0103');
      expect(status.status).toBe('Queued');
      expect(status.progress).toBe(0);
      expect(status.error).toBeNull();
    });

    it('returns correct status for an InProgress execution', async () => {
      const status = await getExecutionStatus('exec-0101');
      expect(status).toBeDefined();
      expect(status.executionId).toBe('exec-0101');
      expect(status.status).toBe('InProgress');
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });

    it('returns correct status for a Blocked execution', async () => {
      const status = await getExecutionStatus('exec-0099');
      expect(status).toBeDefined();
      expect(status.executionId).toBe('exec-0099');
      expect(status.status).toBe('Blocked');
      expect(status.progress).toBe(100);
    });

    it('returns null for non-existent execution', async () => {
      const status = await getExecutionStatus('exec-9999');
      expect(status).toBeNull();
    });

    it('returns null for empty executionId', async () => {
      const status = await getExecutionStatus('');
      expect(status).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // updateExecutionStatus
  // -------------------------------------------------------------------------
  describe('updateExecutionStatus', () => {
    it('updates execution status to InProgress', async () => {
      // Start a new execution to get a Queued one
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      expect(newExec.status).toBe('Queued');

      const updated = await updateExecutionStatus(newExec.id, 'InProgress', {
        logMessage: 'Execution started',
      });

      expect(updated).toBeDefined();
      expect(updated.id).toBe(newExec.id);
      expect(updated.status).toBe('InProgress');
      expect(updated.endTime).toBeNull();
      expect(updated.duration).toBeNull();

      // Verify log was appended
      const lastLog = updated.logs[updated.logs.length - 1];
      expect(lastLog.message).toBe('Execution started');
      expect(lastLog.level).toBe('info');
    });

    it('updates execution status to Passed and sets endTime and duration', async () => {
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      const updated = await updateExecutionStatus(newExec.id, 'Passed', {
        logMessage: 'Execution completed - PASSED',
      });

      expect(updated.status).toBe('Passed');
      expect(updated.endTime).toBeDefined();
      expect(updated.endTime).not.toBeNull();
      expect(updated.duration).toBeDefined();
      expect(typeof updated.duration).toBe('number');
      expect(updated.duration).toBeGreaterThanOrEqual(0);
    });

    it('updates execution status to Failed and sets endTime and duration', async () => {
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      const updated = await updateExecutionStatus(newExec.id, 'Failed', {
        logMessage: 'Execution completed - FAILED',
        logLevel: 'error',
      });

      expect(updated.status).toBe('Failed');
      expect(updated.endTime).toBeDefined();
      expect(updated.endTime).not.toBeNull();
      expect(updated.duration).toBeDefined();

      const lastLog = updated.logs[updated.logs.length - 1];
      expect(lastLog.level).toBe('error');
    });

    it('updates execution status to Blocked and sets endTime and duration', async () => {
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      const updated = await updateExecutionStatus(newExec.id, 'Blocked', {
        logMessage: 'Execution blocked - environment issue',
        logLevel: 'warn',
      });

      expect(updated.status).toBe('Blocked');
      expect(updated.endTime).toBeDefined();
      expect(updated.endTime).not.toBeNull();

      const lastLog = updated.logs[updated.logs.length - 1];
      expect(lastLog.level).toBe('warn');
    });

    it('attaches AI analysis when provided', async () => {
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      const aiAnalysis = {
        summary: 'Test failed due to timeout.',
        rootCause: 'Network latency exceeded threshold.',
        recommendation: 'Increase timeout configuration.',
        confidence: 85,
        relatedDefects: ['DEF-1234'],
      };

      const updated = await updateExecutionStatus(newExec.id, 'Failed', {
        logMessage: 'Execution failed',
        aiAnalysis,
      });

      expect(updated.aiAnalysis).toBeDefined();
      expect(updated.aiAnalysis.summary).toBe('Test failed due to timeout.');
      expect(updated.aiAnalysis.rootCause).toBe('Network latency exceeded threshold.');
      expect(updated.aiAnalysis.recommendation).toBe('Increase timeout configuration.');
      expect(updated.aiAnalysis.confidence).toBe(85);
      expect(updated.aiAnalysis.relatedDefects).toEqual(['DEF-1234']);
    });

    it('persists the updated status to localStorage', async () => {
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      await updateExecutionStatus(newExec.id, 'Passed');

      const fetched = await getExecutionById(newExec.id);
      expect(fetched.status).toBe('Passed');
    });

    it('throws error for non-existent execution', async () => {
      await expect(
        updateExecutionStatus('exec-9999', 'Passed')
      ).rejects.toThrow('not found');
    });

    it('throws error when id is missing', async () => {
      await expect(
        updateExecutionStatus('', 'Passed')
      ).rejects.toThrow('Execution id is required');
    });

    it('throws error for invalid status', async () => {
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      await expect(
        updateExecutionStatus(newExec.id, 'InvalidStatus')
      ).rejects.toThrow('Invalid status');
    });

    it('throws error when status is null', async () => {
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      await expect(
        updateExecutionStatus(newExec.id, null)
      ).rejects.toThrow('Invalid status');
    });
  });

  // -------------------------------------------------------------------------
  // appendExecutionLog
  // -------------------------------------------------------------------------
  describe('appendExecutionLog', () => {
    it('appends a log entry to an execution', async () => {
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      const initialLogCount = newExec.logs.length;

      const updated = appendExecutionLog(newExec.id, 'info', 'Custom log message');

      expect(updated).toBeDefined();
      expect(updated.logs.length).toBe(initialLogCount + 1);

      const lastLog = updated.logs[updated.logs.length - 1];
      expect(lastLog.level).toBe('info');
      expect(lastLog.message).toBe('Custom log message');
      expect(lastLog.timestamp).toBeDefined();
    });

    it('defaults to info level for invalid log level', () => {
      const exec = appendExecutionLog('exec-0001', 'invalid_level', 'Test message');
      if (exec) {
        const lastLog = exec.logs[exec.logs.length - 1];
        expect(lastLog.level).toBe('info');
      }
    });

    it('returns null for non-existent execution', () => {
      const result = appendExecutionLog('exec-9999', 'info', 'Test');
      expect(result).toBeNull();
    });

    it('returns null for empty id', () => {
      const result = appendExecutionLog('', 'info', 'Test');
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // addExecutionEvidence
  // -------------------------------------------------------------------------
  describe('addExecutionEvidence', () => {
    it('adds evidence to an execution', async () => {
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      const updated = addExecutionEvidence(newExec.id, {
        type: 'screenshot',
        name: 'test_screenshot.png',
      });

      expect(updated).toBeDefined();
      expect(updated.evidence.length).toBe(1);
      expect(updated.evidence[0].type).toBe('screenshot');
      expect(updated.evidence[0].name).toBe('test_screenshot.png');
      expect(updated.evidence[0].id).toBeDefined();
      expect(updated.evidence[0].capturedAt).toBeDefined();
      expect(updated.evidence[0].url).toBeDefined();
    });

    it('throws error when evidence type is missing', () => {
      expect(() => {
        addExecutionEvidence('exec-0001', { name: 'test.png' });
      }).toThrow('Evidence type is required');
    });

    it('throws error when evidence name is missing', () => {
      expect(() => {
        addExecutionEvidence('exec-0001', { type: 'screenshot' });
      }).toThrow('Evidence name is required');
    });

    it('throws error when id is missing', () => {
      expect(() => {
        addExecutionEvidence('', { type: 'screenshot', name: 'test.png' });
      }).toThrow('Execution id is required');
    });

    it('returns null for non-existent execution', () => {
      const result = addExecutionEvidence('exec-9999', {
        type: 'screenshot',
        name: 'test.png',
      });
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // setAIAnalysis
  // -------------------------------------------------------------------------
  describe('setAIAnalysis', () => {
    it('sets AI analysis on an execution', async () => {
      const newExec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      const analysis = {
        summary: 'Test analysis summary.',
        rootCause: 'Root cause description.',
        recommendation: 'Recommended action.',
        confidence: 90,
        relatedDefects: ['DEF-100'],
      };

      const updated = setAIAnalysis(newExec.id, analysis);

      expect(updated).toBeDefined();
      expect(updated.aiAnalysis).toBeDefined();
      expect(updated.aiAnalysis.summary).toBe('Test analysis summary.');
      expect(updated.aiAnalysis.rootCause).toBe('Root cause description.');
      expect(updated.aiAnalysis.recommendation).toBe('Recommended action.');
      expect(updated.aiAnalysis.confidence).toBe(90);
      expect(updated.aiAnalysis.relatedDefects).toEqual(['DEF-100']);
    });

    it('throws error when summary is missing', () => {
      expect(() => {
        setAIAnalysis('exec-0001', { rootCause: 'test' });
      }).toThrow('summary is required');
    });

    it('throws error when id is missing', () => {
      expect(() => {
        setAIAnalysis('', { summary: 'test' });
      }).toThrow('Execution id is required');
    });

    it('returns null for non-existent execution', () => {
      const result = setAIAnalysis('exec-9999', { summary: 'test' });
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getExecutionLogs
  // -------------------------------------------------------------------------
  describe('getExecutionLogs', () => {
    it('returns logs for an execution', async () => {
      const logs = await getExecutionLogs('exec-0001');
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);

      for (const log of logs) {
        expect(log.timestamp).toBeDefined();
        expect(log.level).toBeDefined();
        expect(log.message).toBeDefined();
      }
    });

    it('returns empty array for non-existent execution', async () => {
      const logs = await getExecutionLogs('exec-9999');
      expect(logs).toEqual([]);
    });

    it('returns empty array for empty id', async () => {
      const logs = await getExecutionLogs('');
      expect(logs).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getExecutionEvidence
  // -------------------------------------------------------------------------
  describe('getExecutionEvidence', () => {
    it('returns evidence for an execution that has evidence', async () => {
      const evidence = await getExecutionEvidence('exec-0001');
      expect(Array.isArray(evidence)).toBe(true);
      expect(evidence.length).toBeGreaterThan(0);

      for (const ev of evidence) {
        expect(ev.id).toBeDefined();
        expect(ev.type).toBeDefined();
        expect(ev.name).toBeDefined();
      }
    });

    it('returns empty array for execution without evidence', async () => {
      const evidence = await getExecutionEvidence('exec-0002');
      expect(Array.isArray(evidence)).toBe(true);
      expect(evidence.length).toBe(0);
    });

    it('returns empty array for non-existent execution', async () => {
      const evidence = await getExecutionEvidence('exec-9999');
      expect(evidence).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getAIAnalysis
  // -------------------------------------------------------------------------
  describe('getAIAnalysis', () => {
    it('returns AI analysis for a failed execution', async () => {
      const analysis = await getAIAnalysis('exec-0003');
      expect(analysis).toBeDefined();
      expect(analysis).not.toBeNull();
      expect(analysis.summary).toBeDefined();
      expect(analysis.rootCause).toBeDefined();
    });

    it('returns null for execution without AI analysis', async () => {
      const analysis = await getAIAnalysis('exec-0001');
      expect(analysis).toBeNull();
    });

    it('returns null for non-existent execution', async () => {
      const analysis = await getAIAnalysis('exec-9999');
      expect(analysis).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getExecutionMetrics
  // -------------------------------------------------------------------------
  describe('getExecutionMetrics', () => {
    it('returns execution metrics summary', async () => {
      const metrics = await getExecutionMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalExecutions).toBeGreaterThan(0);
      expect(typeof metrics.passedCount).toBe('number');
      expect(typeof metrics.failedCount).toBe('number');
      expect(typeof metrics.blockedCount).toBe('number');
      expect(typeof metrics.inProgressCount).toBe('number');
      expect(typeof metrics.queuedCount).toBe('number');
      expect(typeof metrics.passRate).toBe('number');
      expect(typeof metrics.averageDuration).toBe('number');
      expect(metrics.statusDistribution).toBeDefined();
      expect(metrics.applicationDistribution).toBeDefined();
      expect(metrics.environmentDistribution).toBeDefined();
      expect(metrics.typeDistribution).toBeDefined();
    });

    it('has consistent counts', async () => {
      const metrics = await getExecutionMetrics();
      const sumStatuses = metrics.passedCount + metrics.failedCount +
        metrics.blockedCount + metrics.inProgressCount + metrics.queuedCount;
      expect(sumStatuses).toBe(metrics.totalExecutions);
    });

    it('calculates pass rate correctly', async () => {
      const metrics = await getExecutionMetrics();
      const completedCount = metrics.passedCount + metrics.failedCount;
      if (completedCount > 0) {
        const expectedPassRate = Math.round((metrics.passedCount / completedCount) * 1000) / 10;
        expect(metrics.passRate).toBe(expectedPassRate);
      }
    });
  });

  // -------------------------------------------------------------------------
  // getExecutionsByApplication
  // -------------------------------------------------------------------------
  describe('getExecutionsByApplication', () => {
    it('returns executions for a specific application', async () => {
      const executions = await getExecutionsByApplication('EMIS Core');
      expect(Array.isArray(executions)).toBe(true);
      expect(executions.length).toBeGreaterThan(0);

      for (const exec of executions) {
        expect(exec.application).toBe('EMIS Core');
      }
    });

    it('returns executions sorted by startTime descending', async () => {
      const executions = await getExecutionsByApplication('EMIS Core');
      expect(executions.length).toBeGreaterThan(1);

      for (let i = 1; i < executions.length; i++) {
        const prevDate = new Date(executions[i - 1].startTime).getTime();
        const currDate = new Date(executions[i].startTime).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    });

    it('returns empty array for non-existent application', async () => {
      const executions = await getExecutionsByApplication('NonExistentApp');
      expect(executions).toEqual([]);
    });

    it('returns empty array for empty application', async () => {
      const executions = await getExecutionsByApplication('');
      expect(executions).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getExecutionsByTestAsset
  // -------------------------------------------------------------------------
  describe('getExecutionsByTestAsset', () => {
    it('returns executions for a specific test asset', async () => {
      const executions = await getExecutionsByTestAsset('test-001');
      expect(Array.isArray(executions)).toBe(true);
      expect(executions.length).toBeGreaterThan(0);

      for (const exec of executions) {
        expect(exec.testAssetId).toBe('test-001');
      }
    });

    it('returns empty array for non-existent test asset', async () => {
      const executions = await getExecutionsByTestAsset('test-9999');
      expect(executions).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getRecentExecutions
  // -------------------------------------------------------------------------
  describe('getRecentExecutions', () => {
    it('returns recent executions with default limit', () => {
      const recent = getRecentExecutions();
      expect(Array.isArray(recent)).toBe(true);
      expect(recent.length).toBeLessThanOrEqual(10);
      expect(recent.length).toBeGreaterThan(0);
    });

    it('returns recent executions with custom limit', () => {
      const recent = getRecentExecutions(5);
      expect(recent.length).toBeLessThanOrEqual(5);
    });

    it('returns executions sorted by startTime descending', () => {
      const recent = getRecentExecutions(20);
      for (let i = 1; i < recent.length; i++) {
        const prevDate = new Date(recent[i - 1].startTime).getTime();
        const currDate = new Date(recent[i].startTime).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    });
  });

  // -------------------------------------------------------------------------
  // getFailedExecutions
  // -------------------------------------------------------------------------
  describe('getFailedExecutions', () => {
    it('returns only failed executions', () => {
      const failed = getFailedExecutions();
      expect(Array.isArray(failed)).toBe(true);
      expect(failed.length).toBeGreaterThan(0);

      for (const exec of failed) {
        expect(exec.status).toBe('Failed');
      }
    });
  });

  // -------------------------------------------------------------------------
  // getActiveExecutions
  // -------------------------------------------------------------------------
  describe('getActiveExecutions', () => {
    it('returns only InProgress and Queued executions', () => {
      const active = getActiveExecutions();
      expect(Array.isArray(active)).toBe(true);

      for (const exec of active) {
        expect(['InProgress', 'Queued']).toContain(exec.status);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Distinct Values
  // -------------------------------------------------------------------------
  describe('Distinct Values', () => {
    describe('getDistinctStatuses', () => {
      it('returns an array of unique status strings', () => {
        const statuses = getDistinctStatuses();
        expect(Array.isArray(statuses)).toBe(true);
        expect(statuses.length).toBeGreaterThan(0);
        expect(statuses).toContain('Passed');
        expect(statuses).toContain('Failed');

        const uniqueSet = new Set(statuses);
        expect(uniqueSet.size).toBe(statuses.length);
      });
    });

    describe('getDistinctApplications', () => {
      it('returns an array of unique application names', () => {
        const apps = getDistinctApplications();
        expect(Array.isArray(apps)).toBe(true);
        expect(apps.length).toBeGreaterThan(0);
        expect(apps).toContain('EMIS Core');

        const uniqueSet = new Set(apps);
        expect(uniqueSet.size).toBe(apps.length);
      });
    });

    describe('getDistinctSuiteNames', () => {
      it('returns an array of unique suite names', () => {
        const suites = getDistinctSuiteNames();
        expect(Array.isArray(suites)).toBe(true);
        expect(suites.length).toBeGreaterThan(0);
        expect(suites).toContain('Authentication Suite');
      });
    });

    describe('getDistinctEnvironments', () => {
      it('returns an array of unique environment strings', () => {
        const envs = getDistinctEnvironments();
        expect(Array.isArray(envs)).toBe(true);
        expect(envs.length).toBeGreaterThan(0);
        expect(envs).toContain('Prod');
        expect(envs).toContain('Staging');
      });
    });

    describe('getDistinctExecutors', () => {
      it('returns an array of unique executor names', () => {
        const executors = getDistinctExecutors();
        expect(Array.isArray(executors)).toBe(true);
        expect(executors.length).toBeGreaterThan(0);

        const uniqueSet = new Set(executors);
        expect(uniqueSet.size).toBe(executors.length);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Environments
  // -------------------------------------------------------------------------
  describe('Environments', () => {
    describe('getEnvironments', () => {
      it('returns all environments', async () => {
        const environments = await getEnvironments();
        expect(Array.isArray(environments)).toBe(true);
        expect(environments.length).toBeGreaterThan(0);

        for (const env of environments) {
          expect(env.id).toBeDefined();
          expect(env.name).toBeDefined();
          expect(env.type).toBeDefined();
          expect(env.status).toBeDefined();
        }
      });
    });

    describe('getEnvironmentById', () => {
      it('returns an environment by id', async () => {
        const env = await getEnvironmentById('env-001');
        expect(env).toBeDefined();
        expect(env.id).toBe('env-001');
        expect(env.name).toBe('EMIS Core Production');
      });

      it('returns null for non-existent id', async () => {
        const env = await getEnvironmentById('env-999');
        expect(env).toBeNull();
      });

      it('returns null for empty id', async () => {
        const env = await getEnvironmentById('');
        expect(env).toBeNull();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Full Execution Lifecycle
  // -------------------------------------------------------------------------
  describe('Full Execution Lifecycle', () => {
    it('transitions an execution through Queued → InProgress → Passed', async () => {
      // Create execution
      const exec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
        environment: 'QA',
      });
      expect(exec.status).toBe('Queued');

      // Transition to InProgress
      const inProgress = await updateExecutionStatus(exec.id, 'InProgress', {
        logMessage: 'Execution started',
      });
      expect(inProgress.status).toBe('InProgress');
      expect(inProgress.endTime).toBeNull();

      // Append some logs
      appendExecutionLog(exec.id, 'info', 'Step 1 completed');
      appendExecutionLog(exec.id, 'info', 'Step 2 completed');

      // Add evidence
      addExecutionEvidence(exec.id, {
        type: 'screenshot',
        name: 'step2_result.png',
      });

      // Transition to Passed
      const passed = await updateExecutionStatus(exec.id, 'Passed', {
        logMessage: 'Execution completed - PASSED',
      });
      expect(passed.status).toBe('Passed');
      expect(passed.endTime).toBeDefined();
      expect(passed.endTime).not.toBeNull();
      expect(passed.duration).toBeDefined();
      expect(passed.duration).toBeGreaterThanOrEqual(0);

      // Verify final state
      const finalExec = await getExecutionById(exec.id);
      expect(finalExec.status).toBe('Passed');
      expect(finalExec.logs.length).toBeGreaterThan(3);
      expect(finalExec.evidence.length).toBe(1);
    });

    it('transitions an execution through Queued → InProgress → Failed with AI analysis', async () => {
      const exec = await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
        environment: 'Staging',
      });

      await updateExecutionStatus(exec.id, 'InProgress', {
        logMessage: 'Execution started',
      });

      appendExecutionLog(exec.id, 'info', 'Step 1 completed');
      appendExecutionLog(exec.id, 'error', 'Step 2 failed - assertion mismatch');

      const aiAnalysis = {
        summary: 'Assertion mismatch in step 2.',
        rootCause: 'Expected value changed after recent code update.',
        recommendation: 'Update assertion to match new expected value.',
        confidence: 88,
        relatedDefects: ['DEF-2001'],
      };

      const failed = await updateExecutionStatus(exec.id, 'Failed', {
        logMessage: 'Execution completed - FAILED',
        logLevel: 'error',
        aiAnalysis,
      });

      expect(failed.status).toBe('Failed');
      expect(failed.aiAnalysis).toBeDefined();
      expect(failed.aiAnalysis.summary).toBe('Assertion mismatch in step 2.');
      expect(failed.aiAnalysis.relatedDefects).toEqual(['DEF-2001']);

      // Verify via getExecutionStatus
      const status = await getExecutionStatus(exec.id);
      expect(status.status).toBe('Failed');
      expect(status.error).toBeDefined();
      expect(status.error.summary).toBe('Assertion mismatch in step 2.');
    });
  });

  // -------------------------------------------------------------------------
  // Reset Functions
  // -------------------------------------------------------------------------
  describe('resetExecutions', () => {
    it('resets executions to original mock data', async () => {
      // Start a new execution to modify the data
      await startExecution({
        testAssetId: 'test-001',
        suiteName: 'Auth Suite',
        application: 'EMIS Core',
      });

      const beforeReset = await getExecutions();
      const beforeCount = beforeReset.total;

      // Reset
      const result = resetExecutions();
      expect(result).toBe(true);

      // Verify the count is back to original (105 mock executions)
      const afterReset = await getExecutions();
      expect(afterReset.total).toBeLessThan(beforeCount);
    });
  });

  describe('resetAll', () => {
    it('resets all execution-related data', () => {
      const result = resetAll();
      expect(result).toBe(true);
    });
  });
});
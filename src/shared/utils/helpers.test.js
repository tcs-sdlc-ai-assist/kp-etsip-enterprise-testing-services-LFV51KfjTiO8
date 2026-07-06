import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  formatDate,
  formatNumber,
  truncateText,
  generateId,
  debounce,
  classNames,
  getStatusColor,
  getPriorityColor,
  calculatePercentage,
  sortByField,
  filterBySearch,
  paginateArray,
} from './helpers.js';

describe('helpers', () => {
  // -------------------------------------------------------------------------
  // formatDate
  // -------------------------------------------------------------------------
  describe('formatDate', () => {
    it('formats a valid ISO date string to YYYY-MM-DD by default', () => {
      const result = formatDate('2024-06-13T10:00:00Z');
      expect(result).toBe('2024-06-13');
    });

    it('formats a Date object to YYYY-MM-DD by default', () => {
      const date = new Date(2024, 5, 13); // June 13, 2024
      const result = formatDate(date);
      expect(result).toBe('2024-06-13');
    });

    it('returns empty string for null input', () => {
      expect(formatDate(null)).toBe('');
    });

    it('returns empty string for undefined input', () => {
      expect(formatDate(undefined)).toBe('');
    });

    it('returns empty string for empty string input', () => {
      expect(formatDate('')).toBe('');
    });

    it('returns empty string for invalid date string', () => {
      expect(formatDate('not-a-date')).toBe('');
    });

    it('formats with locale options when provided', () => {
      const result = formatDate('2024-06-13T10:00:00Z', {
        locale: 'en-ZA',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('formats with time options when provided', () => {
      const result = formatDate('2024-06-13T10:30:00Z', {
        locale: 'en-ZA',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('uses en-ZA as default locale when locale is not specified in options', () => {
      const result = formatDate('2024-06-13T10:00:00Z', {
        year: 'numeric',
        month: 'short',
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('handles dates at the start of the year', () => {
      const result = formatDate('2024-01-01T00:00:00Z');
      expect(result).toBe('2024-01-01');
    });

    it('handles dates at the end of the year', () => {
      const result = formatDate('2024-12-31T23:59:59Z');
      expect(result).toBe('2024-12-31');
    });
  });

  // -------------------------------------------------------------------------
  // formatNumber
  // -------------------------------------------------------------------------
  describe('formatNumber', () => {
    it('formats a number with thousand separators', () => {
      const result = formatNumber(1234567);
      expect(result).toBe('1,234,567');
    });

    it('formats a decimal number', () => {
      const result = formatNumber(1234.56);
      expect(result).toContain('1,234');
    });

    it('returns "0" for null input', () => {
      expect(formatNumber(null)).toBe('0');
    });

    it('returns "0" for undefined input', () => {
      expect(formatNumber(undefined)).toBe('0');
    });

    it('returns "0" for empty string input', () => {
      expect(formatNumber('')).toBe('0');
    });

    it('returns "0" for non-numeric string', () => {
      expect(formatNumber('abc')).toBe('0');
    });

    it('formats a numeric string correctly', () => {
      const result = formatNumber('9876');
      expect(result).toBe('9,876');
    });

    it('formats zero correctly', () => {
      const result = formatNumber(0);
      expect(result).toBe('0');
    });

    it('formats negative numbers correctly', () => {
      const result = formatNumber(-1234);
      expect(result).toContain('1,234');
    });

    it('formats with custom locale options', () => {
      const result = formatNumber(1234.5, {
        locale: 'en-US',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      expect(result).toBe('1,234.50');
    });

    it('formats with percent style', () => {
      const result = formatNumber(0.85, {
        style: 'percent',
      });
      expect(result).toContain('85');
    });

    it('formats with currency style', () => {
      const result = formatNumber(1000, {
        style: 'currency',
        currency: 'USD',
      });
      expect(result).toContain('1,000');
    });
  });

  // -------------------------------------------------------------------------
  // truncateText
  // -------------------------------------------------------------------------
  describe('truncateText', () => {
    it('returns the original text if shorter than maxLen', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('truncates text and appends ellipsis when longer than maxLen', () => {
      const result = truncateText('This is a long text that should be truncated', 20);
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toContain('...');
    });

    it('returns empty string for null input', () => {
      expect(truncateText(null)).toBe('');
    });

    it('returns empty string for undefined input', () => {
      expect(truncateText(undefined)).toBe('');
    });

    it('returns empty string for empty string input', () => {
      expect(truncateText('')).toBe('');
    });

    it('returns empty string for non-string input', () => {
      expect(truncateText(123)).toBe('');
    });

    it('uses default maxLen of 100', () => {
      const longText = 'a'.repeat(150);
      const result = truncateText(longText);
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).toContain('...');
    });

    it('uses custom suffix', () => {
      const result = truncateText('This is a long text', 15, '…');
      expect(result).toContain('…');
      expect(result.length).toBeLessThanOrEqual(15);
    });

    it('returns exact text when length equals maxLen', () => {
      const text = 'Exact length';
      expect(truncateText(text, text.length)).toBe(text);
    });

    it('handles maxLen of 1 with default suffix', () => {
      const result = truncateText('Hello World', 4);
      expect(result.length).toBeLessThanOrEqual(4);
    });
  });

  // -------------------------------------------------------------------------
  // generateId
  // -------------------------------------------------------------------------
  describe('generateId', () => {
    it('generates a string id', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('uses the default prefix "id"', () => {
      const id = generateId();
      expect(id.startsWith('id-')).toBe(true);
    });

    it('uses a custom prefix', () => {
      const id = generateId('test');
      expect(id.startsWith('test-')).toBe(true);
    });

    it('generates unique ids on successive calls', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('generates unique ids with the same prefix', () => {
      const id1 = generateId('item');
      const id2 = generateId('item');
      expect(id1).not.toBe(id2);
    });

    it('generates ids with consistent format', () => {
      const id = generateId('prefix');
      const parts = id.split('-');
      expect(parts.length).toBeGreaterThanOrEqual(3);
      expect(parts[0]).toBe('prefix');
    });
  });

  // -------------------------------------------------------------------------
  // debounce
  // -------------------------------------------------------------------------
  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('delays function execution by the specified delay', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 300);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('uses default delay of 300ms', () => {
      const fn = vi.fn();
      const debounced = debounce(fn);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('resets the timer on subsequent calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 200);

      debounced();
      vi.advanceTimersByTime(100);
      debounced();
      vi.advanceTimersByTime(100);
      debounced();
      vi.advanceTimersByTime(100);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('passes arguments to the debounced function', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('only calls the function once for rapid successive calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();
      debounced();
      debounced();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('uses the last arguments when called multiple times', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('first');
      debounced('second');
      debounced('third');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('third');
    });

    it('has a cancel method that prevents execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.cancel();

      vi.advanceTimersByTime(200);
      expect(fn).not.toHaveBeenCalled();
    });

    it('allows calling again after cancel', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.cancel();

      debounced();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // classNames
  // -------------------------------------------------------------------------
  describe('classNames', () => {
    it('joins string arguments', () => {
      expect(classNames('foo', 'bar')).toBe('foo bar');
    });

    it('filters out falsy values', () => {
      expect(classNames('foo', null, undefined, false, '', 'bar')).toBe('foo bar');
    });

    it('handles object arguments with boolean values', () => {
      expect(classNames({ active: true, disabled: false, visible: true })).toBe('active visible');
    });

    it('handles mixed string and object arguments', () => {
      expect(classNames('base', { active: true, hidden: false })).toBe('base active');
    });

    it('handles array arguments', () => {
      expect(classNames(['foo', 'bar'])).toBe('foo bar');
    });

    it('handles nested arrays', () => {
      expect(classNames(['foo', ['bar', 'baz']])).toBe('foo bar baz');
    });

    it('returns empty string for no arguments', () => {
      expect(classNames()).toBe('');
    });

    it('returns empty string for all falsy arguments', () => {
      expect(classNames(null, undefined, false, '')).toBe('');
    });

    it('handles complex mixed arguments', () => {
      const result = classNames('base', { active: true }, ['extra'], null, { hidden: false });
      expect(result).toBe('base active extra');
    });
  });

  // -------------------------------------------------------------------------
  // getStatusColor
  // -------------------------------------------------------------------------
  describe('getStatusColor', () => {
    it('returns a color class for "active" status', () => {
      const color = getStatusColor('active');
      expect(color).toBeDefined();
      expect(typeof color).toBe('string');
      expect(color).toContain('bg-');
    });

    it('returns a color class for "completed" status', () => {
      const color = getStatusColor('completed');
      expect(color).toBeDefined();
      expect(color).toContain('bg-');
    });

    it('returns a color class for "in_progress" status', () => {
      const color = getStatusColor('in_progress');
      expect(color).toBeDefined();
      expect(color).toContain('bg-');
    });

    it('returns default color for null input', () => {
      expect(getStatusColor(null)).toBe('bg-brand-gray-300');
    });

    it('returns default color for undefined input', () => {
      expect(getStatusColor(undefined)).toBe('bg-brand-gray-300');
    });

    it('returns default color for empty string', () => {
      expect(getStatusColor('')).toBe('bg-brand-gray-300');
    });

    it('returns default color for unknown status', () => {
      expect(getStatusColor('unknown_status_xyz')).toBe('bg-brand-gray-300');
    });

    it('handles case-insensitive status values', () => {
      const color = getStatusColor('Active');
      expect(color).toBeDefined();
      expect(color).toContain('bg-');
    });

    it('handles status with spaces converted to underscores', () => {
      const color = getStatusColor('in progress');
      expect(color).toBeDefined();
      expect(color).toContain('bg-');
    });

    it('returns a color for "passed" status', () => {
      const color = getStatusColor('passed');
      expect(color).toContain('green');
    });

    it('returns a color for "failed" status', () => {
      const color = getStatusColor('failed');
      expect(color).toContain('red');
    });
  });

  // -------------------------------------------------------------------------
  // getPriorityColor
  // -------------------------------------------------------------------------
  describe('getPriorityColor', () => {
    it('returns a color class for "critical" priority', () => {
      const color = getPriorityColor('critical');
      expect(color).toBeDefined();
      expect(color).toContain('bg-');
    });

    it('returns a color class for "high" priority', () => {
      const color = getPriorityColor('high');
      expect(color).toBeDefined();
      expect(color).toContain('bg-');
    });

    it('returns a color class for "medium" priority', () => {
      const color = getPriorityColor('medium');
      expect(color).toBeDefined();
      expect(color).toContain('bg-');
    });

    it('returns a color class for "low" priority', () => {
      const color = getPriorityColor('low');
      expect(color).toBeDefined();
      expect(color).toContain('bg-');
    });

    it('returns default color for null input', () => {
      expect(getPriorityColor(null)).toBe('bg-brand-gray-300');
    });

    it('returns default color for undefined input', () => {
      expect(getPriorityColor(undefined)).toBe('bg-brand-gray-300');
    });

    it('returns default color for empty string', () => {
      expect(getPriorityColor('')).toBe('bg-brand-gray-300');
    });

    it('returns default color for unknown priority', () => {
      expect(getPriorityColor('unknown_priority')).toBe('bg-brand-gray-300');
    });

    it('handles case-insensitive priority values', () => {
      const color = getPriorityColor('Critical');
      expect(color).toBeDefined();
      expect(color).toContain('bg-');
      expect(color).not.toBe('bg-brand-gray-300');
    });
  });

  // -------------------------------------------------------------------------
  // calculatePercentage
  // -------------------------------------------------------------------------
  describe('calculatePercentage', () => {
    it('calculates a simple percentage', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
    });

    it('calculates percentage with decimal precision', () => {
      expect(calculatePercentage(1, 3)).toBeCloseTo(33.3, 1);
    });

    it('returns 0 when total is 0', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
    });

    it('returns 0 for NaN part', () => {
      expect(calculatePercentage(NaN, 100)).toBe(0);
    });

    it('returns 0 for NaN total', () => {
      expect(calculatePercentage(50, NaN)).toBe(0);
    });

    it('returns 0 for non-number part', () => {
      expect(calculatePercentage('abc', 100)).toBe(0);
    });

    it('returns 0 for non-number total', () => {
      expect(calculatePercentage(50, 'abc')).toBe(0);
    });

    it('returns 100 when part equals total', () => {
      expect(calculatePercentage(100, 100)).toBe(100);
    });

    it('returns percentage greater than 100 when part exceeds total', () => {
      expect(calculatePercentage(150, 100)).toBe(150);
    });

    it('handles custom decimal places', () => {
      const result = calculatePercentage(1, 3, 2);
      expect(result).toBeCloseTo(33.33, 2);
    });

    it('handles zero decimal places', () => {
      const result = calculatePercentage(1, 3, 0);
      expect(result).toBe(33);
    });

    it('handles negative part', () => {
      const result = calculatePercentage(-50, 100);
      expect(result).toBe(-50);
    });
  });

  // -------------------------------------------------------------------------
  // sortByField
  // -------------------------------------------------------------------------
  describe('sortByField', () => {
    const testData = [
      { name: 'Charlie', age: 30, date: '2024-03-15' },
      { name: 'Alice', age: 25, date: '2024-01-10' },
      { name: 'Bob', age: 35, date: '2024-02-20' },
      { name: 'Diana', age: 28, date: '2024-04-05' },
    ];

    it('sorts by string field ascending', () => {
      const sorted = sortByField(testData, 'name', 'asc');
      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('Charlie');
      expect(sorted[3].name).toBe('Diana');
    });

    it('sorts by string field descending', () => {
      const sorted = sortByField(testData, 'name', 'desc');
      expect(sorted[0].name).toBe('Diana');
      expect(sorted[1].name).toBe('Charlie');
      expect(sorted[2].name).toBe('Bob');
      expect(sorted[3].name).toBe('Alice');
    });

    it('sorts by number field ascending', () => {
      const sorted = sortByField(testData, 'age', 'asc');
      expect(sorted[0].age).toBe(25);
      expect(sorted[1].age).toBe(28);
      expect(sorted[2].age).toBe(30);
      expect(sorted[3].age).toBe(35);
    });

    it('sorts by number field descending', () => {
      const sorted = sortByField(testData, 'age', 'desc');
      expect(sorted[0].age).toBe(35);
      expect(sorted[1].age).toBe(30);
      expect(sorted[2].age).toBe(28);
      expect(sorted[3].age).toBe(25);
    });

    it('sorts by date string field ascending', () => {
      const sorted = sortByField(testData, 'date', 'asc');
      expect(sorted[0].date).toBe('2024-01-10');
      expect(sorted[3].date).toBe('2024-04-05');
    });

    it('sorts by date string field descending', () => {
      const sorted = sortByField(testData, 'date', 'desc');
      expect(sorted[0].date).toBe('2024-04-05');
      expect(sorted[3].date).toBe('2024-01-10');
    });

    it('defaults to ascending sort when direction is not specified', () => {
      const sorted = sortByField(testData, 'name');
      expect(sorted[0].name).toBe('Alice');
      expect(sorted[3].name).toBe('Diana');
    });

    it('does not mutate the original array', () => {
      const original = [...testData];
      sortByField(testData, 'name', 'asc');
      expect(testData[0].name).toBe(original[0].name);
      expect(testData[1].name).toBe(original[1].name);
    });

    it('returns empty array for empty input', () => {
      expect(sortByField([], 'name')).toEqual([]);
    });

    it('returns empty array for non-array input', () => {
      expect(sortByField(null, 'name')).toEqual([]);
    });

    it('returns a copy of the array when field is empty', () => {
      const result = sortByField(testData, '');
      expect(result.length).toBe(testData.length);
    });

    it('returns a copy of the array when field is null', () => {
      const result = sortByField(testData, null);
      expect(result.length).toBe(testData.length);
    });

    it('handles null values in the sorted field', () => {
      const dataWithNulls = [
        { name: 'Bob', value: 10 },
        { name: 'Alice', value: null },
        { name: 'Charlie', value: 5 },
      ];
      const sorted = sortByField(dataWithNulls, 'value', 'asc');
      expect(sorted.length).toBe(3);
      // null values should be pushed to the end in ascending order
      expect(sorted[2].value).toBeNull();
    });

    it('handles undefined values in the sorted field', () => {
      const dataWithUndefined = [
        { name: 'Bob', value: 10 },
        { name: 'Alice' },
        { name: 'Charlie', value: 5 },
      ];
      const sorted = sortByField(dataWithUndefined, 'value', 'asc');
      expect(sorted.length).toBe(3);
    });

    it('handles single-element array', () => {
      const single = [{ name: 'Alice', age: 25 }];
      const sorted = sortByField(single, 'name');
      expect(sorted.length).toBe(1);
      expect(sorted[0].name).toBe('Alice');
    });

    it('handles boolean field sorting', () => {
      const boolData = [
        { name: 'A', active: false },
        { name: 'B', active: true },
        { name: 'C', active: false },
      ];
      const sorted = sortByField(boolData, 'active', 'desc');
      expect(sorted[0].active).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // filterBySearch
  // -------------------------------------------------------------------------
  describe('filterBySearch', () => {
    const testData = [
      { name: 'EMIS Core', portfolio: 'Education Management', status: 'active', tags: ['core', 'education'] },
      { name: 'Budget Tracker', portfolio: 'Finance & Administration', status: 'active', tags: ['finance', 'budget'] },
      { name: 'Teacher Registry', portfolio: 'Human Resources', status: 'inactive', tags: ['hr', 'teacher'] },
      { name: 'API Gateway', portfolio: 'ICT Infrastructure', status: 'active', tags: ['api', 'gateway'] },
      { name: 'Audit Trail System', portfolio: 'Governance & Compliance', status: 'active', tags: ['audit', 'compliance'] },
    ];

    it('filters by matching name field', () => {
      const result = filterBySearch(testData, 'EMIS', ['name']);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('EMIS Core');
    });

    it('performs case-insensitive search', () => {
      const result = filterBySearch(testData, 'emis', ['name']);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('EMIS Core');
    });

    it('performs partial matching', () => {
      const result = filterBySearch(testData, 'Track', ['name']);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Budget Tracker');
    });

    it('searches across multiple fields', () => {
      const result = filterBySearch(testData, 'Education', ['name', 'portfolio']);
      expect(result.length).toBe(1);
      expect(result[0].portfolio).toBe('Education Management');
    });

    it('returns all items when search term is empty', () => {
      const result = filterBySearch(testData, '', ['name']);
      expect(result.length).toBe(testData.length);
    });

    it('returns all items when search term is whitespace only', () => {
      const result = filterBySearch(testData, '   ', ['name']);
      expect(result.length).toBe(testData.length);
    });

    it('returns empty array when no items match', () => {
      const result = filterBySearch(testData, 'NonExistentTerm', ['name', 'portfolio']);
      expect(result.length).toBe(0);
    });

    it('returns empty array for empty input array', () => {
      const result = filterBySearch([], 'test', ['name']);
      expect(result).toEqual([]);
    });

    it('returns empty array for non-array input', () => {
      const result = filterBySearch(null, 'test', ['name']);
      expect(result).toEqual([]);
    });

    it('returns all items when fields array is empty', () => {
      const result = filterBySearch(testData, 'EMIS', []);
      expect(result.length).toBe(testData.length);
    });

    it('handles null values in searched fields', () => {
      const dataWithNulls = [
        { name: 'Test', description: null },
        { name: 'Other', description: 'Some description' },
      ];
      const result = filterBySearch(dataWithNulls, 'description', ['name', 'description']);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Other');
    });

    it('handles undefined values in searched fields', () => {
      const dataWithUndefined = [
        { name: 'Test' },
        { name: 'Other', description: 'Has description' },
      ];
      const result = filterBySearch(dataWithUndefined, 'description', ['name', 'description']);
      expect(result.length).toBe(1);
    });

    it('searches within array fields (tags)', () => {
      const result = filterBySearch(testData, 'audit', ['tags']);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Audit Trail System');
    });

    it('searches within number fields', () => {
      const numData = [
        { name: 'Item A', score: 85 },
        { name: 'Item B', score: 92 },
        { name: 'Item C', score: 78 },
      ];
      const result = filterBySearch(numData, '92', ['score']);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Item B');
    });

    it('does not mutate the original array', () => {
      const original = [...testData];
      filterBySearch(testData, 'EMIS', ['name']);
      expect(testData.length).toBe(original.length);
    });

    it('matches across multiple items', () => {
      const result = filterBySearch(testData, 'active', ['status']);
      expect(result.length).toBe(4);
    });

    it('returns a new array (not the same reference)', () => {
      const result = filterBySearch(testData, '', ['name']);
      expect(result).not.toBe(testData);
    });
  });

  // -------------------------------------------------------------------------
  // paginateArray
  // -------------------------------------------------------------------------
  describe('paginateArray', () => {
    const testData = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

    it('returns the first page with default page size', () => {
      const result = paginateArray(testData);
      expect(result.data.length).toBe(10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalItems).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('returns the correct page for page 2', () => {
      const result = paginateArray(testData, 2, 10);
      expect(result.data.length).toBe(10);
      expect(result.page).toBe(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);
      expect(result.data[0].id).toBe(11);
    });

    it('returns the last page with remaining items', () => {
      const result = paginateArray(testData, 3, 10);
      expect(result.data.length).toBe(5);
      expect(result.page).toBe(3);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
      expect(result.data[0].id).toBe(21);
    });

    it('returns correct metadata for custom page size', () => {
      const result = paginateArray(testData, 1, 5);
      expect(result.data.length).toBe(5);
      expect(result.pageSize).toBe(5);
      expect(result.totalPages).toBe(5);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('clamps page to maximum when page exceeds total pages', () => {
      const result = paginateArray(testData, 100, 10);
      expect(result.page).toBe(3);
      expect(result.data.length).toBe(5);
    });

    it('clamps page to 1 when page is 0', () => {
      const result = paginateArray(testData, 0, 10);
      expect(result.page).toBe(1);
    });

    it('clamps page to 1 when page is negative', () => {
      const result = paginateArray(testData, -5, 10);
      expect(result.page).toBe(1);
    });

    it('handles empty array', () => {
      const result = paginateArray([]);
      expect(result.data).toEqual([]);
      expect(result.page).toBe(1);
      expect(result.totalItems).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('handles non-array input', () => {
      const result = paginateArray(null);
      expect(result.data).toEqual([]);
      expect(result.totalItems).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('handles undefined input', () => {
      const result = paginateArray(undefined);
      expect(result.data).toEqual([]);
      expect(result.totalItems).toBe(0);
    });

    it('handles page size of 1', () => {
      const result = paginateArray(testData, 1, 1);
      expect(result.data.length).toBe(1);
      expect(result.totalPages).toBe(25);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('handles page size larger than total items', () => {
      const result = paginateArray(testData, 1, 100);
      expect(result.data.length).toBe(25);
      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('handles page size equal to total items', () => {
      const result = paginateArray(testData, 1, 25);
      expect(result.data.length).toBe(25);
      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('handles single-item array', () => {
      const result = paginateArray([{ id: 1 }], 1, 10);
      expect(result.data.length).toBe(1);
      expect(result.totalItems).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('returns correct data slice for middle page', () => {
      const result = paginateArray(testData, 2, 5);
      expect(result.data.length).toBe(5);
      expect(result.data[0].id).toBe(6);
      expect(result.data[4].id).toBe(10);
    });

    it('does not mutate the original array', () => {
      const original = [...testData];
      paginateArray(testData, 1, 5);
      expect(testData.length).toBe(original.length);
      expect(testData[0].id).toBe(original[0].id);
    });

    it('handles fractional page values by flooring', () => {
      const result = paginateArray(testData, 2.7, 10);
      expect(result.page).toBe(2);
    });

    it('handles fractional pageSize values by flooring', () => {
      const result = paginateArray(testData, 1, 7.9);
      expect(result.pageSize).toBe(7);
      expect(result.data.length).toBe(7);
    });

    it('ensures totalPages calculation is correct for non-divisible counts', () => {
      const data = Array.from({ length: 13 }, (_, i) => ({ id: i + 1 }));
      const result = paginateArray(data, 1, 5);
      expect(result.totalPages).toBe(3);
    });

    it('returns consistent results for the same inputs', () => {
      const result1 = paginateArray(testData, 2, 10);
      const result2 = paginateArray(testData, 2, 10);
      expect(result1.data.length).toBe(result2.data.length);
      expect(result1.page).toBe(result2.page);
      expect(result1.totalItems).toBe(result2.totalItems);
      expect(result1.totalPages).toBe(result2.totalPages);
    });
  });
});
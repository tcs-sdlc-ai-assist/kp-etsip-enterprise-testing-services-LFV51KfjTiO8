/**
 * Export Utility Service (ExportService)
 * Provides export functionality for CSV, Excel (SheetJS), PDF (jsPDF), and simulated PowerPoint.
 * Implements LLD ExportService interface with role-based export control checks.
 * @module exportService
 */

import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { checkAccess } from './authManager.js';
import { logAction } from './auditLogService.js';
import { FEATURES } from '../constants.js';

/**
 * Checks whether the current user has export permissions.
 * @returns {boolean} True if the current user can export
 */
function canExport() {
  return checkAccess(FEATURES.EXPORT);
}

/**
 * Validates that the data is a non-empty array of objects.
 * @param {Array} data - The data to validate
 * @throws {Error} If data is not a valid non-empty array
 */
function validateData(data) {
  if (!data || !Array.isArray(data)) {
    throw new Error('Export data must be a non-null array.');
  }
  if (data.length === 0) {
    throw new Error('Export data must contain at least one record.');
  }
}

/**
 * Validates that the filename is a non-empty string.
 * @param {string} filename - The filename to validate
 * @throws {Error} If filename is not a valid non-empty string
 */
function validateFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename is required and must be a non-empty string.');
  }
}

/**
 * Flattens nested objects into a single-level object with dot-notation keys.
 * Arrays are JSON-stringified.
 * @param {Object} obj - The object to flatten
 * @param {string} [prefix=''] - Key prefix for recursion
 * @returns {Object} Flattened object
 */
function flattenObject(obj, prefix = '') {
  const result = {};

  if (obj === null || obj === undefined) {
    return result;
  }

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value);
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      const nested = flattenObject(value, fullKey);
      Object.assign(result, nested);
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Flattens an array of objects for tabular export.
 * @param {Object[]} data - Array of objects to flatten
 * @returns {Object[]} Array of flattened objects
 */
function flattenDataForExport(data) {
  return data.map((item) => flattenObject(item));
}

/**
 * Extracts column headers from an array of flattened objects.
 * @param {Object[]} flatData - Array of flattened objects
 * @returns {string[]} Array of unique column header strings
 */
function extractHeaders(flatData) {
  const headerSet = new Set();
  for (const row of flatData) {
    for (const key of Object.keys(row)) {
      headerSet.add(key);
    }
  }
  return Array.from(headerSet);
}

/**
 * Generates a timestamp string for filenames.
 * @returns {string} Timestamp in YYYYMMDD_HHmmss format
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Exports data to a CSV file and triggers a browser download.
 * Performs role-based export access check before proceeding.
 *
 * @param {Object[]} data - Array of objects to export
 * @param {string} filename - Base filename (without extension)
 * @returns {Promise<{success: boolean, message: string, filename: string}>} Export result
 * @throws {Error} If user lacks export permissions or data is invalid
 */
export async function exportToCSV(data, filename) {
  if (!canExport()) {
    throw new Error('Access denied. You do not have permission to export data.');
  }

  validateData(data);
  validateFilename(filename);

  try {
    const flatData = flattenDataForExport(data);
    const headers = extractHeaders(flatData);

    const csvRows = [];

    // Header row
    csvRows.push(headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));

    // Data rows
    for (const row of flatData) {
      const values = headers.map((header) => {
        const val = row[header];
        if (val === null || val === undefined) {
          return '""';
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fullFilename = `${filename}_${getTimestamp()}.csv`;

    saveAs(blob, fullFilename);

    logAction(
      'data_export',
      `Exported ${data.length} records to CSV file: ${fullFilename}`,
      'Report',
      fullFilename,
      { status: 'success' }
    );

    return {
      success: true,
      message: `Successfully exported ${data.length} records to ${fullFilename}`,
      filename: fullFilename,
    };
  } catch (error) {
    if (error.message === 'Access denied. You do not have permission to export data.') {
      throw error;
    }

    logAction(
      'data_export',
      `Failed to export CSV: ${error.message}`,
      'Report',
      filename,
      { status: 'failure' }
    );

    return {
      success: false,
      message: `Export failed: ${error.message}`,
      filename: '',
    };
  }
}

/**
 * Exports data to an Excel (.xlsx) file using SheetJS and triggers a browser download.
 * Performs role-based export access check before proceeding.
 *
 * @param {Object[]} data - Array of objects to export
 * @param {string} filename - Base filename (without extension)
 * @param {string} [sheetName='Data'] - Name of the worksheet
 * @returns {Promise<{success: boolean, message: string, filename: string}>} Export result
 * @throws {Error} If user lacks export permissions or data is invalid
 */
export async function exportToExcel(data, filename, sheetName = 'Data') {
  if (!canExport()) {
    throw new Error('Access denied. You do not have permission to export data.');
  }

  validateData(data);
  validateFilename(filename);

  try {
    const flatData = flattenDataForExport(data);

    const worksheet = utils.json_to_sheet(flatData);

    // Auto-size columns
    const headers = extractHeaders(flatData);
    const colWidths = headers.map((header) => {
      let maxLen = header.length;
      for (const row of flatData) {
        const val = row[header];
        if (val !== null && val !== undefined) {
          const len = String(val).length;
          if (len > maxLen) {
            maxLen = len;
          }
        }
      }
      return { wch: Math.min(maxLen + 2, 50) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

    const fullFilename = `${filename}_${getTimestamp()}.xlsx`;

    writeFile(workbook, fullFilename);

    logAction(
      'data_export',
      `Exported ${data.length} records to Excel file: ${fullFilename}`,
      'Report',
      fullFilename,
      { status: 'success' }
    );

    return {
      success: true,
      message: `Successfully exported ${data.length} records to ${fullFilename}`,
      filename: fullFilename,
    };
  } catch (error) {
    if (error.message === 'Access denied. You do not have permission to export data.') {
      throw error;
    }

    logAction(
      'data_export',
      `Failed to export Excel: ${error.message}`,
      'Report',
      filename,
      { status: 'failure' }
    );

    return {
      success: false,
      message: `Export failed: ${error.message}`,
      filename: '',
    };
  }
}

/**
 * Exports data to a PDF file using jsPDF with autoTable and triggers a browser download.
 * Performs role-based export access check before proceeding.
 *
 * @param {Object[]} data - Array of objects to export
 * @param {string} filename - Base filename (without extension)
 * @param {string} [title='Export Report'] - Title displayed at the top of the PDF
 * @returns {Promise<{success: boolean, message: string, filename: string}>} Export result
 * @throws {Error} If user lacks export permissions or data is invalid
 */
export async function exportToPDF(data, filename, title = 'Export Report') {
  if (!canExport()) {
    throw new Error('Access denied. You do not have permission to export data.');
  }

  validateData(data);
  validateFilename(filename);

  try {
    const flatData = flattenDataForExport(data);
    const headers = extractHeaders(flatData);

    // Limit columns for PDF readability (max 8 columns)
    const displayHeaders = headers.slice(0, 8);

    const doc = new jsPDF({
      orientation: displayHeaders.length > 5 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Title
    doc.setFontSize(16);
    doc.setTextColor(0, 105, 204);
    doc.text(title, 14, 20);

    // Subtitle with timestamp and record count
    doc.setFontSize(10);
    doc.setTextColor(120, 130, 140);
    doc.text(
      `Generated: ${new Date().toLocaleString()} | Records: ${data.length}`,
      14,
      28
    );

    // Table
    const tableHeaders = displayHeaders.map((h) => {
      // Format header: replace dots with spaces, capitalize
      return h
        .split('.')
        .pop()
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
    });

    const tableBody = flatData.map((row) =>
      displayHeaders.map((header) => {
        const val = row[header];
        if (val === null || val === undefined) {
          return '';
        }
        const str = String(val);
        // Truncate long values for PDF
        return str.length > 60 ? str.substring(0, 57) + '...' : str;
      })
    );

    doc.autoTable({
      head: [tableHeaders],
      body: tableBody,
      startY: 34,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [0, 105, 204],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [245, 246, 247],
      },
      margin: { top: 34, left: 14, right: 14 },
      didDrawPage: function (pageData) {
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `KP-ETSIP | Page ${pageData.pageNumber} of ${pageCount}`,
          14,
          doc.internal.pageSize.height - 10
        );
      },
    });

    const fullFilename = `${filename}_${getTimestamp()}.pdf`;

    doc.save(fullFilename);

    logAction(
      'data_export',
      `Exported ${data.length} records to PDF file: ${fullFilename}`,
      'Report',
      fullFilename,
      { status: 'success' }
    );

    return {
      success: true,
      message: `Successfully exported ${data.length} records to ${fullFilename}`,
      filename: fullFilename,
    };
  } catch (error) {
    if (error.message === 'Access denied. You do not have permission to export data.') {
      throw error;
    }

    logAction(
      'data_export',
      `Failed to export PDF: ${error.message}`,
      'Report',
      filename,
      { status: 'failure' }
    );

    return {
      success: false,
      message: `Export failed: ${error.message}`,
      filename: '',
    };
  }
}

/**
 * Simulates exporting data to a PowerPoint (.pptx) file.
 * Since no real PPTX library is available, this generates a text-based summary
 * file as a simulated download.
 * Performs role-based export access check before proceeding.
 *
 * @param {Object[]} data - Array of objects to export
 * @param {string} filename - Base filename (without extension)
 * @param {string} [title='Export Presentation'] - Title for the simulated presentation
 * @returns {Promise<{success: boolean, message: string, filename: string}>} Export result
 * @throws {Error} If user lacks export permissions or data is invalid
 */
export async function exportToPowerPoint(data, filename, title = 'Export Presentation') {
  if (!canExport()) {
    throw new Error('Access denied. You do not have permission to export data.');
  }

  validateData(data);
  validateFilename(filename);

  try {
    const flatData = flattenDataForExport(data);
    const headers = extractHeaders(flatData);

    const lines = [];
    lines.push('='.repeat(60));
    lines.push(`  ${title}`);
    lines.push(`  KP-ETSIP Export Presentation (Simulated)`);
    lines.push(`  Generated: ${new Date().toLocaleString()}`);
    lines.push(`  Total Records: ${data.length}`);
    lines.push('='.repeat(60));
    lines.push('');

    // Slide 1: Summary
    lines.push('--- Slide 1: Summary ---');
    lines.push(`Title: ${title}`);
    lines.push(`Records: ${data.length}`);
    lines.push(`Columns: ${headers.length}`);
    lines.push(`Fields: ${headers.join(', ')}`);
    lines.push('');

    // Slide 2+: Data preview (first 10 records)
    const previewCount = Math.min(data.length, 10);
    lines.push(`--- Slide 2: Data Preview (${previewCount} of ${data.length} records) ---`);
    lines.push('');

    for (let i = 0; i < previewCount; i++) {
      const row = flatData[i];
      lines.push(`Record ${i + 1}:`);
      for (const header of headers.slice(0, 6)) {
        const val = row[header];
        const displayVal = val !== null && val !== undefined ? String(val) : '';
        const truncated = displayVal.length > 80 ? displayVal.substring(0, 77) + '...' : displayVal;
        lines.push(`  ${header}: ${truncated}`);
      }
      lines.push('');
    }

    if (data.length > previewCount) {
      lines.push(`... and ${data.length - previewCount} more records.`);
      lines.push('');
    }

    lines.push('='.repeat(60));
    lines.push('  Note: This is a simulated PowerPoint export.');
    lines.push('  In a production environment, this would generate a .pptx file.');
    lines.push('='.repeat(60));

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const fullFilename = `${filename}_${getTimestamp()}_presentation.txt`;

    saveAs(blob, fullFilename);

    logAction(
      'data_export',
      `Exported ${data.length} records to simulated PowerPoint file: ${fullFilename}`,
      'Report',
      fullFilename,
      { status: 'success' }
    );

    return {
      success: true,
      message: `Successfully exported ${data.length} records to ${fullFilename} (simulated PowerPoint)`,
      filename: fullFilename,
    };
  } catch (error) {
    if (error.message === 'Access denied. You do not have permission to export data.') {
      throw error;
    }

    logAction(
      'data_export',
      `Failed to export PowerPoint: ${error.message}`,
      'Report',
      filename,
      { status: 'failure' }
    );

    return {
      success: false,
      message: `Export failed: ${error.message}`,
      filename: '',
    };
  }
}

/**
 * Exports data in the specified format.
 * Convenience wrapper that delegates to the appropriate format-specific function.
 *
 * @param {Object[]} data - Array of objects to export
 * @param {string} filename - Base filename (without extension)
 * @param {'csv' | 'excel' | 'pdf' | 'ppt'} format - Export format
 * @param {Object} [options] - Optional parameters
 * @param {string} [options.title] - Title for PDF/PPT exports
 * @param {string} [options.sheetName] - Sheet name for Excel exports
 * @returns {Promise<{success: boolean, message: string, filename: string}>} Export result
 * @throws {Error} If format is unsupported or user lacks permissions
 */
export async function exportData(data, filename, format, options = {}) {
  if (!format || typeof format !== 'string') {
    throw new Error('Export format is required and must be a string.');
  }

  const normalizedFormat = format.toLowerCase().trim();

  switch (normalizedFormat) {
    case 'csv':
      return exportToCSV(data, filename);
    case 'excel':
    case 'xlsx':
      return exportToExcel(data, filename, options.sheetName);
    case 'pdf':
      return exportToPDF(data, filename, options.title);
    case 'ppt':
    case 'pptx':
    case 'powerpoint':
      return exportToPowerPoint(data, filename, options.title);
    default:
      throw new Error(`Unsupported export format: ${format}. Supported formats: csv, excel, pdf, ppt.`);
  }
}

/**
 * Checks whether the current user has export permissions.
 * Useful for UI components to conditionally show/hide export buttons.
 *
 * @returns {boolean} True if the current user can export data
 */
export function hasExportPermission() {
  return canExport();
}

/**
 * Returns the list of supported export formats.
 *
 * @returns {Array<{value: string, label: string, extension: string, description: string}>} Supported formats
 */
export function getSupportedFormats() {
  return [
    {
      value: 'csv',
      label: 'CSV',
      extension: '.csv',
      description: 'Comma-separated values file for spreadsheet applications.',
    },
    {
      value: 'excel',
      label: 'Excel',
      extension: '.xlsx',
      description: 'Microsoft Excel workbook with formatted columns.',
    },
    {
      value: 'pdf',
      label: 'PDF',
      extension: '.pdf',
      description: 'Portable Document Format with formatted table layout.',
    },
    {
      value: 'ppt',
      label: 'PowerPoint',
      extension: '.txt',
      description: 'Simulated PowerPoint presentation export (text format).',
    },
  ];
}
/**
 * Export utility functions for CSV and other formats
 */

export interface ExportColumn {
  key: string
  header: string
  formatter?: (value: any) => string
}

/**
 * Convert an array of objects to CSV format
 */
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[]
): string {
  if (data.length === 0) {
    return columns.map(col => col.header).join(',')
  }

  // Create header row
  const headers = columns.map(col => col.header).join(',')

  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key]

      // Apply formatter if provided
      if (col.formatter) {
        value = col.formatter(value)
      }

      // Handle different types
      if (value === null || value === undefined) {
        return ''
      }

      // Convert to string and escape
      const stringValue = String(value)

      // If the value contains commas, quotes, or newlines, wrap in quotes and escape quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }

      return stringValue
    }).join(',')
  })

  return [headers, ...rows].join('\n')
}

/**
 * Download a CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  const csv = convertToCSV(data, columns)
  downloadCSV(csv, filename)
}

/**
 * Common formatters for export
 */
export const exportFormatters = {
  currency: (value: number) => {
    if (typeof value !== 'number') return value
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  },

  date: (value: Date | string) => {
    if (!value) return ''
    const date = new Date(value)
    return date.toLocaleDateString('en-IN')
  },

  datetime: (value: Date | string) => {
    if (!value) return ''
    const date = new Date(value)
    return date.toLocaleString('en-IN')
  },

  boolean: (value: boolean) => {
    return value ? 'Yes' : 'No'
  },

  status: (value: string) => {
    return value.replace(/_/g, ' ')
  },

  array: (value: any[]) => {
    if (!Array.isArray(value)) return value
    return value.join(', ')
  }
}

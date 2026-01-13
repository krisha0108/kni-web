import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { getSession } from '@/server/auth/session'
import { convertToCSV, ExportColumn } from '@/lib/export'

export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const inventory = await db.warehouseInventory.findMany({
      include: {
        partItem: {
          select: {
            name: true,
            category: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const columns: ExportColumn[] = [
      { key: 'id', header: 'Inventory ID' },
      { key: 'partName', header: 'Part Name' },
      { key: 'category', header: 'Category' },
      { key: 'currentStock', header: 'Current Stock' },
      { key: 'lowStockThreshold', header: 'Low Stock Threshold' },
      { key: 'lastRestockedAt', header: 'Last Restocked', formatter: (v) => v ? new Date(v).toLocaleString('en-IN') : 'Never' },
      { key: 'createdAt', header: 'Created At', formatter: (v) => new Date(v).toLocaleString('en-IN') },
    ]

    const exportData = inventory.map(item => ({
      id: item.id,
      partName: item.partItem?.name || 'N/A',
      category: item.partItem?.category?.name || 'N/A',
      currentStock: item.currentStock,
      lowStockThreshold: item.lowStockThreshold,
      lastRestockedAt: item.lastRestockedAt,
      createdAt: item.createdAt
    }))

    const csv = convertToCSV(exportData, columns)
    const filename = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Export inventory error:', error)
    return NextResponse.json({ error: 'Failed to export inventory' }, { status: 500 })
  }
}

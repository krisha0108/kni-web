import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { getSession } from '@/server/auth/session'
import { convertToCSV, ExportColumn } from '@/lib/export'

export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session

    const ownerProfile = await db.ownerProfile.findUnique({
      where: { userId: user.id },
      select: { id: true }
    })

    if (!ownerProfile) {
      return NextResponse.json({ error: 'Owner profile not found' }, { status: 404 })
    }

    const equipment = await db.equipment.findMany({
      where: {
        restaurant: {
          ownerId: ownerProfile.id
        },
        deletedAt: null
      },
      include: {
        restaurant: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const columns: ExportColumn[] = [
      { key: 'id', header: 'Equipment ID' },
      { key: 'name', header: 'Equipment Name' },
      { key: 'category', header: 'Category' },
      { key: 'restaurantName', header: 'Restaurant' },
      { key: 'status', header: 'Status', formatter: (v) => v.replace(/_/g, ' ') },
      { key: 'purchaseDate', header: 'Purchase Date', formatter: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '' },
      { key: 'warrantyEndDate', header: 'Warranty End Date', formatter: (v) => v ? new Date(v).toLocaleDateString('en-IN') : 'N/A' },
      { key: 'serialNumber', header: 'Serial Number' },
      { key: 'createdAt', header: 'Added On', formatter: (v) => new Date(v).toLocaleString('en-IN') },
    ]

    const exportData = equipment.map(eq => ({
      id: eq.id,
      name: eq.name,
      category: eq.category,
      restaurantName: eq.restaurant?.name || 'N/A',
      status: eq.status,
      purchaseDate: eq.purchaseDate,
      warrantyEndDate: eq.warrantyEndDate,
      serialNumber: eq.serialNumber || 'N/A',
      createdAt: eq.createdAt
    }))

    const csv = convertToCSV(exportData, columns)
    const filename = `equipment-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Export equipment error:', error)
    return NextResponse.json({ error: 'Failed to export equipment' }, { status: 500 })
  }
}

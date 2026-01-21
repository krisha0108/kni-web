import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { getMobileSession } from '@/server/auth/mobile-session'
import { convertToCSV, ExportColumn } from '@/lib/export'

export async function GET(request: NextRequest) {
  try {
    const session = await getMobileSession(request)
    if (!session || session.role !== 'ENGINEER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session

    const assignments = await db.engineerAssignment.findMany({
      where: { engineerId: user.id },
      include: {
        booking: {
          include: {
            restaurant: { select: { name: true } },
            owner: { select: { name: true } }
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    })

    const columns: ExportColumn[] = [
      { key: 'id', header: 'Assignment ID' },
      { key: 'bookingId', header: 'Booking ID' },
      { key: 'restaurantName', header: 'Restaurant' },
      { key: 'ownerName', header: 'Owner' },
      { key: 'status', header: 'Status' },
      { key: 'assignedAt', header: 'Assigned At', formatter: (v) => new Date(v).toLocaleString('en-IN') },
      { key: 'completedAt', header: 'Completed At', formatter: (v) => v ? new Date(v).toLocaleString('en-IN') : 'N/A' },
    ]

    const exportData = assignments.map(a => ({
      id: a.id,
      bookingId: a.bookingId,
      restaurantName: a.booking?.restaurant?.name || 'N/A',
      ownerName: a.booking?.owner?.name || 'N/A',
      status: a.status,
      assignedAt: a.assignedAt,
      completedAt: a.completedAt
    }))

    const csv = convertToCSV(exportData, columns)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="jobs-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

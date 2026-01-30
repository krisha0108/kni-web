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

    const bookings = await db.serviceBooking.findMany({
      where: {
        ownerId: ownerProfile.id
      },
      include: {
        restaurant: {
          select: {
            name: true
          }
        },
        engineerAssignments: {
          include: {
            engineer: {
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
      { key: 'id', header: 'Booking ID' },
      { key: 'restaurantName', header: 'Restaurant' },
      { key: 'status', header: 'Status', formatter: (v) => v.replace(/_/g, ' ') },
      { key: 'totalAmount', header: 'Total Amount (₹)', formatter: (v) => `₹${v.toLocaleString('en-IN')}` },
      { key: 'preferredSlotStart', header: 'Preferred Slot Start', formatter: (v) => v ? new Date(v).toLocaleString('en-IN') : '' },
      { key: 'preferredSlotEnd', header: 'Preferred Slot End', formatter: (v) => v ? new Date(v).toLocaleString('en-IN') : '' },
      { key: 'assignedEngineer', header: 'Assigned Engineer' },
      { key: 'createdAt', header: 'Created At', formatter: (v) => new Date(v).toLocaleString('en-IN') },
    ]

    const exportData = bookings.map(booking => ({
      id: booking.id,
      restaurantName: booking.restaurant?.name || 'N/A',
      status: booking.status,
      totalAmount: booking.totalAmount || 0,
      preferredSlotStart: booking.slotStartDateTime,
      preferredSlotEnd: booking.slotEndDateTime,
      assignedEngineer: booking.engineerAssignments[0]?.engineer?.name || 'Not Assigned',
      createdAt: booking.createdAt
    }))

    const csv = convertToCSV(exportData, columns)
    const filename = `my-bookings-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Export bookings error:', error)
    return NextResponse.json({ error: 'Failed to export bookings' }, { status: 500 })
  }
}

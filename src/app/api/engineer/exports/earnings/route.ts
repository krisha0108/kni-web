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

    const payouts = await db.payout.findMany({
      where: { engineerId: user.id },
      include: {
        assignment: {
          include: {
            booking: {
              include: {
                restaurant: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const columns: ExportColumn[] = [
      { key: 'id', header: 'Payout ID' },
      { key: 'restaurantName', header: 'Restaurant' },
      { key: 'amount', header: 'Amount (₹)', formatter: (v) => `₹${(v / 100).toFixed(2)}` },
      { key: 'status', header: 'Status' },
      { key: 'paidAt', header: 'Paid At', formatter: (v) => v ? new Date(v).toLocaleString('en-IN') : 'Pending' },
      { key: 'createdAt', header: 'Created At', formatter: (v) => new Date(v).toLocaleString('en-IN') },
    ]

    const exportData = payouts.map(p => ({
      id: p.id,
      restaurantName: p.assignment?.booking?.restaurant?.name || 'N/A',
      amount: p.amount,
      status: p.status,
      paidAt: p.paidAt,
      createdAt: p.createdAt
    }))

    const csv = convertToCSV(exportData, columns)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="earnings-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

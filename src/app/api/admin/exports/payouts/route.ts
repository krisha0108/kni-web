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

    const payouts = await db.payout.findMany({
      include: {
        engineer: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const columns: ExportColumn[] = [
      { key: 'id', header: 'Payout ID' },
      { key: 'engineerName', header: 'Engineer Name' },
      { key: 'engineerEmail', header: 'Engineer Email' },
      { key: 'amount', header: 'Amount (₹)', formatter: (v) => `₹${v.toLocaleString('en-IN')}` },
      { key: 'status', header: 'Status' },
      { key: 'paidAt', header: 'Paid At', formatter: (v) => v ? new Date(v).toLocaleString('en-IN') : 'Not Paid' },
      { key: 'notes', header: 'Notes' },
      { key: 'createdAt', header: 'Created At', formatter: (v) => new Date(v).toLocaleString('en-IN') },
    ]

    const exportData = payouts.map(payout => ({
      id: payout.id,
      engineerName: payout.engineer?.name || 'N/A',
      engineerEmail: payout.engineer?.email || 'N/A',
      amount: payout.amount,
      status: payout.status,
      paidAt: payout.paidAt,
      notes: payout.paymentNote || '',
      createdAt: payout.createdAt
    }))

    const csv = convertToCSV(exportData, columns)
    const filename = `payouts-export-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Export payouts error:', error)
    return NextResponse.json({ error: 'Failed to export payouts' }, { status: 500 })
  }
}

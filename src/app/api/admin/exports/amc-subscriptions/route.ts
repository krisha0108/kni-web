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

    const subscriptions = await db.aMCSubscription.findMany({
      include: {
        equipment: {
          select: {
            name: true,
            restaurant: {
              select: {
                name: true
              }
            }
          }
        },
        plan: {
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
      { key: 'id', header: 'Subscription ID' },
      { key: 'restaurantName', header: 'Restaurant' },
      { key: 'equipmentName', header: 'Equipment' },
      { key: 'planName', header: 'Plan Name' },
      { key: 'status', header: 'Status' },
      { key: 'totalAmount', header: 'Total Amount (₹)', formatter: (v) => `₹${(v / 100).toFixed(2)}` },
      { key: 'serviceLimit', header: 'Service Limit' },
      { key: 'servicesUsed', header: 'Services Used' },
      { key: 'startDate', header: 'Start Date', formatter: (v) => new Date(v).toLocaleDateString('en-IN') },
      { key: 'endDate', header: 'End Date', formatter: (v) => new Date(v).toLocaleDateString('en-IN') },
      { key: 'autoRenew', header: 'Auto Renew', formatter: (v) => v ? 'Yes' : 'No' },
      { key: 'createdAt', header: 'Created At', formatter: (v) => new Date(v).toLocaleString('en-IN') },
    ]

    const exportData = subscriptions.map(sub => ({
      id: sub.id,
      restaurantName: sub.equipment?.restaurant?.name || 'N/A',
      equipmentName: sub.equipment?.name || 'N/A',
      planName: sub.plan?.name || sub.planName || 'Custom Plan',
      status: sub.status,
      totalAmount: sub.totalAmount,
      serviceLimit: sub.serviceLimit,
      servicesUsed: sub.servicesUsed,
      startDate: sub.startDate,
      endDate: sub.endDate,
      autoRenew: sub.autoRenew,
      createdAt: sub.createdAt
    }))

    const csv = convertToCSV(exportData, columns)
    const filename = `amc-subscriptions-export-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Export AMC subscriptions error:', error)
    return NextResponse.json({ error: 'Failed to export AMC subscriptions' }, { status: 500 })
  }
}

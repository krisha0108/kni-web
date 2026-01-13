import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { getSession } from '@/server/auth/session'
import { convertToCSV, ExportColumn } from '@/lib/export'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session

    const orders = await db.marketplaceOrder.findMany({
      where: { vendorId: user.id },
      include: {
        owner: { select: { name: true } },
        restaurant: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const columns: ExportColumn[] = [
      { key: 'id', header: 'Order ID' },
      { key: 'ownerName', header: 'Owner Name' },
      { key: 'restaurantName', header: 'Restaurant' },
      { key: 'status', header: 'Status' },
      { key: 'totalAmount', header: 'Total Amount (₹)', formatter: (v) => `₹${(v / 100).toFixed(2)}` },
      { key: 'itemCount', header: 'Items' },
      { key: 'createdAt', header: 'Created At', formatter: (v) => new Date(v).toLocaleString('en-IN') },
    ]

    const exportData = orders.map(o => ({
      id: o.id,
      ownerName: o.owner?.name || 'N/A',
      restaurantName: o.restaurant?.name || 'N/A',
      status: o.status,
      totalAmount: o.totalAmount,
      itemCount: o.items.length,
      createdAt: o.createdAt
    }))

    const csv = convertToCSV(exportData, columns)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

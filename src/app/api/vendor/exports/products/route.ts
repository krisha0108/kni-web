import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { requireApprovedVendor } from '@/server/auth/rbac'
import { convertToCSV, ExportColumn } from '@/lib/export'

export async function GET() {
  try {
    const session = await requireApprovedVendor()

    const products = await db.vendorProduct.findMany({
      where: { vendorId: session.id, deletedAt: null },
      include: {
        product: {
          include: {
            marketplaceCategory: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' }
    })

    const columns: ExportColumn[] = [
      { key: 'id', header: 'Product ID' },
      { key: 'name', header: 'Name' },
      { key: 'category', header: 'Category' },
      { key: 'price', header: 'Price (₹)', formatter: (v) => `₹${v.toLocaleString('en-IN')}` },
      { key: 'stock', header: 'Stock' },
      { key: 'isActive', header: 'Active', formatter: (v) => v ? 'Yes' : 'No' },
      { key: 'createdAt', header: 'Created At', formatter: (v) => new Date(v).toLocaleString('en-IN') },
    ]

    const exportData = products.map(p => ({
      id: p.id,
      name: p.product?.name || p.name || 'N/A',
      category: p.product?.marketplaceCategory?.name || 'N/A',
      price: p.price,
      stock: p.stockQuantity || 0,
      isActive: p.isActive,
      createdAt: p.createdAt
    }))

    const csv = convertToCSV(exportData, columns)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="products-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

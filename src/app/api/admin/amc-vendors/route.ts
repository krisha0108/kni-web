import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const createAMCVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
});

/**
 * GET /api/admin/amc-vendors?q=search
 * Search/list AMC vendors (external companies KNI occasionally subcontracts AMC work to)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    const vendors = await db.aMCVendor.findMany({
      where: q ? { name: { contains: q } } : undefined,
      orderBy: { name: "asc" },
      take: 20,
    });

    return NextResponse.json({ ok: true, data: vendors });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

/**
 * POST /api/admin/amc-vendors
 * Create a new AMC vendor
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = createAMCVendorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ ok: false, error: validation.error.issues[0].message }, { status: 400 });
    }

    const { name, phone, email, address } = validation.data;

    const vendor = await db.aMCVendor.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
      },
    });

    return NextResponse.json({ ok: true, data: vendor }, { status: 201 });
  } catch (error) {
    console.error("Create AMC vendor error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

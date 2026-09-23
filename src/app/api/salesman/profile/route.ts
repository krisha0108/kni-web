import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (session.role !== Role.SALESMAN) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        salesmanProfile: { select: { region: true } },
        _count: { select: { assignedInquiries: true, salesmanVisits: true } },
      },
    });

    if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    return NextResponse.json({ ok: true, data: user });
  } catch (error) {
    console.error("Error fetching salesman profile:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (session.role !== Role.SALESMAN) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { name, phone, region } = body;

    const updateData: { name?: string; phone?: string } = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    const updatedUser = await db.user.update({
      where: { id: session.id },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    if (region !== undefined) {
      await db.salesmanProfile.upsert({
        where: { userId: session.id },
        update: { region },
        create: { userId: session.id, region },
      });
    }

    return NextResponse.json({ ok: true, data: updatedUser, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating salesman profile:", error);
    return NextResponse.json({ ok: false, error: "Failed to update profile" }, { status: 500 });
  }
}

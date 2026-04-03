import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const engineer = await db.user.findUnique({
      where: { id, role: "ENGINEER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        engineerProfile: {
          select: {
            city: true,
            skills: true,
            payoutMethod: true,
            commissionRate: true,
            monthlySalary: true,
          },
        },
      },
    });

    if (!engineer) {
      return NextResponse.json({ ok: false, error: "Engineer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: engineer });
  } catch (error) {
    console.error("Get engineer error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

const patchEngineerSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  skills: z.string().optional(),
  payoutMethod: z.enum(["COMMISSION", "SALARY"]).optional(),
  commissionRate: z.number().int().min(1).max(100).optional(),
  monthlySalary: z.number().int().optional(),
});

// DELETE - Permanently delete engineer and all their data
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const engineer = await db.user.findFirst({
      where: { id, role: "ENGINEER", deletedAt: null },
      select: { id: true, name: true },
    });

    if (!engineer) {
      return NextResponse.json({ ok: false, error: "Engineer not found" }, { status: 404 });
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({
      ok: true,
      message: `Engineer "${engineer.name}" and all associated data permanently deleted.`,
    });
  } catch (error) {
    console.error("Delete engineer error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to delete engineer" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const validation = patchEngineerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { isActive, name, phone, city, skills, payoutMethod, commissionRate, monthlySalary } =
      validation.data;

    // Check if user exists and is an engineer
    const engineer = await db.user.findUnique({
      where: { id, role: "ENGINEER" },
    });

    if (!engineer) {
      return NextResponse.json(
        { ok: false, error: "Engineer not found" },
        { status: 404 }
      );
    }

    // Build user update data
    const userUpdateData: Record<string, unknown> = {};
    if (isActive !== undefined) userUpdateData.isActive = isActive;
    if (name !== undefined) userUpdateData.name = name;
    if (phone !== undefined) userUpdateData.phone = phone;

    // Build profile upsert data
    const hasProfileFields =
      city !== undefined ||
      skills !== undefined ||
      payoutMethod !== undefined ||
      commissionRate !== undefined ||
      monthlySalary !== undefined;

    const profileData: Record<string, unknown> = {};
    if (city !== undefined) profileData.city = city;
    if (skills !== undefined) profileData.skills = skills;
    if (payoutMethod !== undefined) profileData.payoutMethod = payoutMethod;
    if (commissionRate !== undefined) profileData.commissionRate = commissionRate;
    if (monthlySalary !== undefined) profileData.monthlySalary = monthlySalary;

    // Update user record if needed
    if (Object.keys(userUpdateData).length > 0) {
      await db.user.update({ where: { id }, data: userUpdateData });
    }

    // Upsert engineer profile if needed
    if (hasProfileFields) {
      await db.engineerProfile.upsert({
        where: { userId: id },
        update: profileData,
        create: { userId: id, ...profileData },
      });
    }

    // Return updated engineer with profile
    const updatedEngineer = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        engineerProfile: {
          select: {
            city: true,
            skills: true,
            payoutMethod: true,
            commissionRate: true,
            monthlySalary: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: updatedEngineer });
  } catch (error) {
    console.error("Error updating engineer:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update engineer" },
      { status: 500 }
    );
  }
}

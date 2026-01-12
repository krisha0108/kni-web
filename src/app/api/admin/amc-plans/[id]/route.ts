import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { amcPlanUpdateSchema } from "@/server/validators/amc";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const plan = await db.aMCPlan.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        subscriptions: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { ok: false, error: "AMC plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...plan,
        activeSubscriptionsCount: plan.subscriptions.length,
      },
    });
  } catch (error) {
    console.error("Get AMC plan error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = amcPlanUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if plan exists
    const existingPlan = await db.aMCPlan.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { ok: false, error: "AMC plan not found" },
        { status: 404 }
      );
    }

    // Check if name is being changed and if new name already exists
    if (validation.data.name && validation.data.name !== existingPlan.name) {
      const nameExists = await db.aMCPlan.findFirst({
        where: {
          name: validation.data.name,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (nameExists) {
        return NextResponse.json(
          { ok: false, error: "A plan with this name already exists" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (validation.data.name !== undefined) updateData.name = validation.data.name;
    if (validation.data.description !== undefined) updateData.description = validation.data.description;
    if (validation.data.duration !== undefined) updateData.duration = validation.data.duration;
    if (validation.data.price !== undefined) updateData.price = validation.data.price;
    if (validation.data.serviceLimit !== undefined) updateData.serviceLimit = validation.data.serviceLimit;
    if (validation.data.featuresJson !== undefined) updateData.featuresJson = validation.data.featuresJson;
    if (validation.data.isActive !== undefined) updateData.isActive = validation.data.isActive;

    const plan = await db.aMCPlan.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ok: true, data: plan });
  } catch (error) {
    console.error("Update AMC plan error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Check if plan exists
    const existingPlan = await db.aMCPlan.findFirst({
      where: { id, deletedAt: null },
      include: {
        subscriptions: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { ok: false, error: "AMC plan not found" },
        { status: 404 }
      );
    }

    // Prevent deletion if there are active subscriptions
    if (existingPlan.subscriptions.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete plan with active subscriptions" },
        { status: 400 }
      );
    }

    // Soft delete
    await db.aMCPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ ok: true, data: { message: "Plan deleted successfully" } });
  } catch (error) {
    console.error("Delete AMC plan error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

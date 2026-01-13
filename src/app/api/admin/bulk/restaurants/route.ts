import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { RestaurantStatus } from "@prisma/client";
import { z } from "zod";

const bulkRestaurantActionSchema = z.object({
  restaurantIds: z.array(z.string()).min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = bulkRestaurantActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid input",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { restaurantIds, action, reason } = validation.data;

    const updateData: any = {
      status: action === "APPROVE" ? RestaurantStatus.APPROVED : RestaurantStatus.REJECTED,
    };

    if (action === "REJECT" && reason) {
      updateData.rejectionReason = reason;
    }

    // Update restaurants
    await db.restaurant.updateMany({
      where: {
        id: { in: restaurantIds },
      },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      message: `Successfully ${action === "APPROVE" ? "approved" : "rejected"} ${restaurantIds.length} restaurant(s)`,
      data: {
        affected: restaurantIds.length,
      },
    });
  } catch (error: any) {
    console.error("Bulk restaurant action error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

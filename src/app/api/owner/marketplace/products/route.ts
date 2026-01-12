import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerWithApprovedRestaurant } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireOwnerWithApprovedRestaurant();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");

    const now = new Date();

    const products = await db.vendorProduct.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(search ? { name: { contains: search } } : {}),
        ...(categoryId ? { categoryId } : {}),
        vendor: {
          vendorProfile: {
            approvalStatus: "APPROVED",
            OR: [
              { subscriptionStatus: "TRIAL", trialEndsAt: { gt: now } },
              { subscriptionStatus: "ACTIVE", activeUntil: { gt: now } },
            ],
          },
        },
      },
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: products });
  } catch (error) {
    console.error("Get marketplace products error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

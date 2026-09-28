import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";

/**
 * GET /api/restaurant-owner/my-amcs
 * Fetch owner's AMC subscriptions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const amcs = await db.aMCSubscription.findMany({
      where: {
        ownerId: session.id,
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            serviceLimit: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate status for each AMC
    const now = new Date();
    const formatted = amcs.map((amc) => {
      const endDate = amc.endDate;
      const daysUntilExpiry = endDate
        ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      let amcStatus = "active";
      if (!endDate || endDate < now) {
        amcStatus = "expired";
      } else if (daysUntilExpiry <= 30) {
        amcStatus = "expiring_soon";
      }

      return {
        id: amc.id,
        equipment_name: amc.equipment?.name || amc.equipment?.category?.name || "Equipment",
        vendor_name: "KNI Services", // TODO: Add vendor relation
        contract_number: amc.contractNumber ?? `AMC-${amc.id.slice(0, 8).toUpperCase()}`,
        start_date: amc.startDate.toISOString(),
        end_date: amc.endDate?.toISOString(),
        amount: amc.plan?.price || amc.totalAmount || 0,
        service_visits_included: amc.plan?.serviceLimit || amc.serviceLimit || 0,
        service_visits_used: amc.servicesUsed || 0,
        amc_status: amcStatus,
        terms: `${amc.plan?.name || amc.planName || "AMC Plan"} - ${amc.plan?.duration || amc.duration}`,
        created_at: amc.createdAt.toISOString(),
      };
    });

    // Calculate summary
    const summary = {
      total: formatted.length,
      active: formatted.filter((a) => a.amc_status === "active").length,
      expiring_soon: formatted.filter((a) => a.amc_status === "expiring_soon").length,
      expired: formatted.filter((a) => a.amc_status === "expired").length,
    };

    return NextResponse.json({
      ok: true,
      amcs: formatted,
      summary,
    });
  } catch (error: any) {
    console.error("Get AMCs error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/restaurant-owner/my-amcs
 * Create new AMC (simplified version)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      equipment_name,
      vendor_name,
      contract_number,
      start_date,
      end_date,
      amount,
      service_visits_included,
      terms,
    } = body;

    // TODO: Create proper AMC management via this legacy endpoint
    return NextResponse.json(
      { ok: false, error: "AMC creation via this endpoint is not yet available. Use the equipment AMC flow instead." },
      { status: 501 }
    );
  } catch (error: any) {
    console.error("Create AMC error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

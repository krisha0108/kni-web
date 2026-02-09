import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendor, requireApprovedVendor } from "@/server/auth/rbac";
import { z } from "zod";
import { CoverageType } from "@prisma/client";

const coverageSchema = z.object({
  coverageType: z.enum(["CITY_WIDE", "PINCODE_WISE"]),
  cities: z.array(z.string()).optional(),
  pincodes: z.array(z.string().length(6, "Pincode must be 6 digits")).optional(),
});

export async function GET() {
  try {
    const session = await requireVendor();

    const coverage = await db.vendorCoverage.findUnique({
      where: { vendorId: session.id },
    });

    return NextResponse.json({ ok: true, data: coverage });
  } catch (error) {
    console.error("Get vendor coverage error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApprovedVendor();
    const body = await request.json();
    const validation = coverageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { coverageType, cities, pincodes } = validation.data;

    // Validate based on coverage type
    if (coverageType === "CITY_WIDE" && (!cities || cities.length === 0)) {
      return NextResponse.json(
        { ok: false, error: "Cities required for CITY_WIDE coverage" },
        { status: 400 }
      );
    }

    if (coverageType === "PINCODE_WISE" && (!pincodes || pincodes.length === 0)) {
      return NextResponse.json(
        { ok: false, error: "Pincodes required for PINCODE_WISE coverage" },
        { status: 400 }
      );
    }

    // Upsert coverage
    const coverage = await db.vendorCoverage.upsert({
      where: { vendorId: session.id },
      create: {
        vendorId: session.id,
        coverageType: coverageType as CoverageType,
        cities: cities || [],
        pincodes: pincodes || [],
      },
      update: {
        coverageType: coverageType as CoverageType,
        cities: cities || [],
        pincodes: pincodes || [],
      },
    });

    return NextResponse.json({ ok: true, data: coverage });
  } catch (error) {
    console.error("Create/update vendor coverage error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: msg.includes("Forbidden") ? 403 : 500 }
    );
  }
}

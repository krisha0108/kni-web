import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // "states", "cities", "areas"
    const stateId = searchParams.get("stateId");
    const cityId = searchParams.get("cityId");

    if (type === "states" || !type) {
      const states = await db.serviceState.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      return NextResponse.json({ ok: true, data: states });
    }

    if (type === "cities") {
      if (!stateId) {
        return NextResponse.json(
          { ok: false, error: "stateId is required" },
          { status: 400 }
        );
      }
      const cities = await db.serviceCity.findMany({
        where: { stateId, isActive: true },
        select: { id: true, name: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      return NextResponse.json({ ok: true, data: cities });
    }

    if (type === "areas") {
      if (!cityId) {
        return NextResponse.json(
          { ok: false, error: "cityId is required" },
          { status: 400 }
        );
      }
      const areas = await db.serviceArea.findMany({
        where: { cityId, isActive: true },
        select: { id: true, name: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      return NextResponse.json({ ok: true, data: areas });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid type parameter. Use 'states', 'cities', or 'areas'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Get public locations error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

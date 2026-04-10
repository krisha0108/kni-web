import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getNotifications } from "@/server/notifications/service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20);
    // Backward compat: if limit/offset passed directly, use them
    const hasLegacyParams = searchParams.has("limit") || searchParams.has("offset");
    const limit = hasLegacyParams
      ? Math.max(1, parseInt(searchParams.get("limit") || String(pageSize), 10) || pageSize)
      : pageSize;
    const offset = hasLegacyParams
      ? Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0)
      : (page - 1) * pageSize;
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const result = await getNotifications(session.id, {
      limit,
      offset,
      unreadOnly,
    });

    return NextResponse.json({
      ok: true,
      data: {
        items: result.items,
        total: result.total,
        page: hasLegacyParams ? Math.floor(offset / limit) + 1 : page,
        pageSize: limit,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

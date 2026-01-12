import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { markNotificationsAsRead } from "@/server/notifications/service";
import { z } from "zod";

const markReadSchema = z.object({
  ids: z.array(z.string()).optional(),
  markAll: z.boolean().optional(),
});

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
    const validation = markReadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { ids, markAll } = validation.data;
    const count = await markNotificationsAsRead(
      session.id,
      markAll ? undefined : ids
    );

    return NextResponse.json({
      ok: true,
      data: { markedCount: count },
    });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

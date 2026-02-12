import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { saveUploadedFile } from "@/server/upload/localUpload";

/**
 * GET /api/support/tickets
 * Fetch support tickets for current user
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

    // For now, return empty array since we don't have a Ticket model
    // TODO: Create Ticket model in Prisma schema
    return NextResponse.json({
      ok: true,
      data: [],
      total: 0,
      message: "Support tickets feature will be available soon",
    });
  } catch (error: any) {
    console.error("Get support tickets error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/support/tickets
 * Create a new support ticket
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

    // Parse multipart form data
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const equipmentName = formData.get("equipment_name") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const photo = formData.get("photo") as File | null;

    // Validate required fields
    if (!title || !equipmentName || !description) {
      return NextResponse.json(
        { ok: false, error: "Title, equipment name, and description are required" },
        { status: 400 }
      );
    }

    let photoUrl: string | null = null;

    // Handle photo upload if provided (validates type + size via saveUploadedFile)
    if (photo && photo.size > 0) {
      try {
        const result = await saveUploadedFile(photo, "tickets");
        photoUrl = result.url;
      } catch (uploadError) {
        if (uploadError instanceof Error) {
          return NextResponse.json(
            { ok: false, error: uploadError.message },
            { status: 400 }
          );
        }
        console.error("Photo upload error:", uploadError);
      }
    }

    // For now, create a service booking as a workaround
    // TODO: Create proper Ticket model
    const restaurant = await db.restaurant.findFirst({
      where: { ownerId: session.id },
      select: { id: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "No restaurant found. Please create a restaurant first." },
        { status: 400 }
      );
    }

    const ticket = await db.serviceBooking.create({
      data: {
        ownerId: session.id,
        restaurantId: restaurant.id,
        status: "DRAFT",
        totalAmount: 0,
        problemDescription: `TICKET: ${title}\nEquipment: ${equipmentName}\nCategory: ${category || "General"}\nDescription: ${description}`,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: ticket.id,
        title,
        equipment_name: equipmentName,
        description,
        category: category || "General",
        status: "pending",
        photo_url: photoUrl,
        created_at: ticket.createdAt.toISOString(),
      },
      message: "Support ticket created successfully",
    });
  } catch (error: any) {
    console.error("Create support ticket error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

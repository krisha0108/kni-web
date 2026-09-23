import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";
import bcrypt from "bcrypt";
import { sendSalesmanWelcomeEmail } from "@/lib/email";

// Validation schema for salesman creation
const createSalesmanSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  region: z.string().optional(),
});

export async function GET() {
  try {
    await requireAdmin();

    const salesmen = await db.user.findMany({
      where: { role: "SALESMAN" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        salesmanProfile: {
          select: { region: true },
        },
        _count: {
          select: { assignedInquiries: true, salesmanVisits: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ok: true, data: salesmen });
  } catch (error) {
    console.error("Get salesmen error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validation = createSalesmanSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, password, region } = validation.data;

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create salesman user with profile. mustChangePassword is set true here
    // (and here only) since Admin - not the salesman - chose this password.
    const salesman = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: "SALESMAN",
        isActive: true,
        mustChangePassword: true,
        salesmanProfile: {
          create: {
            region: region || null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    // Send welcome email with credentials (non-blocking)
    sendSalesmanWelcomeEmail(email, name, password).catch((error) => {
      console.error("Failed to send welcome email:", error);
    });

    return NextResponse.json({ ok: true, data: salesman });
  } catch (error) {
    console.error("Create salesman error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create salesman" },
      { status: 500 }
    );
  }
}

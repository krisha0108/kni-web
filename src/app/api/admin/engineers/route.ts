import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";
import bcrypt from "bcrypt";
import { sendEngineerWelcomeEmail } from "@/lib/email";

// Validation schema for engineer creation
const createEngineerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    city: z.string().optional(),
    skills: z.string().optional(),
    payoutMethod: z.enum(["COMMISSION", "SALARY"]).optional().default("COMMISSION"),
    commissionRate: z.number().int().min(1).max(100).optional().default(20),
    monthlySalary: z.number().int().optional(),
  })
  .refine(
    (data) => {
      if (data.payoutMethod === "SALARY" && !data.monthlySalary) {
        return false;
      }
      return true;
    },
    { message: "monthlySalary is required when payoutMethod is SALARY", path: ["monthlySalary"] }
  );

export async function GET() {
  try {
    await requireAdmin();

    const engineers = await db.user.findMany({
      where: {
        role: "ENGINEER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        engineerProfile: {
          select: {
            payoutMethod: true,
            commissionRate: true,
            monthlySalary: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ok: true, data: engineers });
  } catch (error) {
    console.error("Get engineers error:", error);
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
    const validation = createEngineerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, password, city, skills, payoutMethod, commissionRate, monthlySalary } = validation.data;

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create engineer user with profile
    const engineer = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: "ENGINEER",
        isActive: true,
        engineerProfile: {
          create: {
            city: city || null,
            skills: skills || null,
            payoutMethod,
            commissionRate,
            monthlySalary: monthlySalary ?? null,
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
    sendEngineerWelcomeEmail(email, name, password).catch((error) => {
      console.error("Failed to send welcome email:", error);
    });

    return NextResponse.json({ ok: true, data: engineer });
  } catch (error) {
    console.error("Create engineer error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create engineer" },
      { status: 500 }
    );
  }
}

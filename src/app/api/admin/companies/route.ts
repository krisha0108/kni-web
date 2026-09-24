import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

// GET — all companies, newest first, with counts of linked inquiries/visits/contacts.
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const q = request.nextUrl.searchParams.get("q")?.trim();

    const companies = await db.company.findMany({
      where: q
        ? { name: { contains: q } }
        : undefined,
      include: {
        createdBySalesman: { select: { id: true, name: true } },
        contacts: { orderBy: { isPrimary: "desc" }, take: 1 },
        _count: { select: { contacts: true, inquiries: true, visits: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: companies });
  } catch (error) {
    console.error("Get companies error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  gstNumber: z.string().optional(),
  website: z.string().optional(),
  contact: z
    .object({
      name: z.string().min(1),
      designation: z.string().optional(),
      phone: z.string().optional(),
      altPhone: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
});

// POST — admin manually creates a company (salesman-side creation has its own
// route with duplicate-detection; this one is a straightforward create).
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = createCompanySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { contact, ...companyData } = parsed.data;

    const company = await db.company.create({
      data: {
        ...companyData,
        contacts: contact
          ? { create: { ...contact, isPrimary: true } }
          : undefined,
      },
      include: { contacts: true },
    });

    return NextResponse.json({ ok: true, data: company });
  } catch (error) {
    console.error("Create company error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

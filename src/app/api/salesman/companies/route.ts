import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSalesman } from "@/server/auth/rbac";
import { z } from "zod";

// Strips common legal-entity suffixes so "ABC Kitchen Pvt Ltd" and
// "ABC Kitchen Private Limited" are recognized as the same company name.
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(pvt\.?|private)\s*ltd\.?|\blimited\b|\bllp\b|\binc\.?|\bltd\.?/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// GET — search existing companies by name (fuzzy, suffix-insensitive) and by
// exact contact phone/email (a stronger duplicate signal than name alone).
// Used both by the "is this a duplicate?" check and the general company picker.
export async function GET(request: NextRequest) {
  try {
    await requireSalesman();
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const phone = request.nextUrl.searchParams.get("phone")?.trim();
    const email = request.nextUrl.searchParams.get("email")?.trim();

    if (!q && !phone && !email) {
      const recent = await db.company.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { contacts: { orderBy: { isPrimary: "desc" }, take: 1 } },
      });
      return NextResponse.json({ ok: true, data: recent });
    }

    const orConditions: Record<string, unknown>[] = [];
    if (q) {
      orConditions.push({ name: { contains: q } });
      orConditions.push({ name: { contains: normalizeCompanyName(q) } });
    }
    if (phone) orConditions.push({ contacts: { some: { OR: [{ phone }, { altPhone: phone }] } } });
    if (email) orConditions.push({ contacts: { some: { email } } });

    const companies = await db.company.findMany({
      where: { OR: orConditions },
      include: { contacts: { orderBy: { isPrimary: "desc" }, take: 1 } },
      take: 10,
    });

    return NextResponse.json({ ok: true, data: companies });
  } catch (error) {
    console.error("Search companies error:", error);
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
  contactName: z.string().min(1, "Contact person name is required"),
  designation: z.string().optional(),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
  email: z.string().optional(),
});

// POST — salesman creates a new company (after confirming, via the picker,
// that it's genuinely not a duplicate of an existing one).
export async function POST(request: NextRequest) {
  try {
    const session = await requireSalesman();
    const body = await request.json();
    const parsed = createCompanySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { contactName, designation, phone, altPhone, email, ...companyData } = parsed.data;

    const company = await db.company.create({
      data: {
        ...companyData,
        createdBySalesmanId: session.id,
        contacts: {
          create: { name: contactName, designation, phone, altPhone, email, isPrimary: true },
        },
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

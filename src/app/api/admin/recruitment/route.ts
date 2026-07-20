import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { Prisma } from "@prisma/client";

/**
 * GET /api/admin/recruitment
 * List candidates for the recruitment CRM, with filters + real server-side pagination
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const position = searchParams.get("position");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const search = searchParams.get("search");
    const skill = searchParams.get("skill");
    const equipment = searchParams.get("equipment");
    const minExperience = searchParams.get("minExperience");
    const maxExperience = searchParams.get("maxExperience");
    const minSalary = searchParams.get("minSalary");
    const maxSalary = searchParams.get("maxSalary");
    const hasDocuments = searchParams.get("hasDocuments");
    const hasVideo = searchParams.get("hasVideo");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    const where: Prisma.CandidateWhereInput = {};

    if (status && status !== "ALL") where.status = status as never;
    if (position && position !== "ALL") where.position = position as never;
    if (city) where.city = { contains: city };
    if (state) where.state = { contains: state };
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { mobile: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (skill) where.skills = { path: `$.${skill}`, equals: true };
    if (equipment) where.equipmentExperience = { path: `$.${equipment}`, equals: true };
    if (minExperience || maxExperience) {
      where.totalExperienceYears = {
        ...(minExperience ? { gte: parseFloat(minExperience) } : {}),
        ...(maxExperience ? { lte: parseFloat(maxExperience) } : {}),
      };
    }
    if (minSalary || maxSalary) {
      where.expectedSalary = {
        ...(minSalary ? { gte: parseInt(minSalary) } : {}),
        ...(maxSalary ? { lte: parseInt(maxSalary) } : {}),
      };
    }
    if (hasDocuments === "true") where.resumeUrl = { not: null };
    if (hasDocuments === "false") where.resumeUrl = null;
    if (hasVideo === "true") where.videoIntroUrl = { not: null };
    if (hasVideo === "false") where.videoIntroUrl = null;

    const [items, total, statusCounts] = await Promise.all([
      db.candidate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.candidate.count({ where }),
      db.candidate.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all])),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

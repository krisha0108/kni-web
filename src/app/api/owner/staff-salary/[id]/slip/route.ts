import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { generateSalarySlip } from "@/server/pdf/document-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const params = await context.params;
    const { id: salaryId } = params;

    // Verify the salary record exists and belongs to the user
    const salary = await db.staffSalary.findUnique({
      where: { id: salaryId },
      include: {
        staff: {
          select: { ownerId: true },
        },
      },
    });

    if (!salary) {
      return NextResponse.json(
        { ok: false, error: "Salary record not found" },
        { status: 404 }
      );
    }

    if (salary.staff.ownerId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Generate PDF salary slip
    const pdfBuffer = await generateSalarySlip(salaryId);

    // Return PDF with appropriate headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="salary-slip-${salaryId.slice(-8)}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Generate salary slip error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate salary slip" },
      { status: 500 }
    );
  }
}

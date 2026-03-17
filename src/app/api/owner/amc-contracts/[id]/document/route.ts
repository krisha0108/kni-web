import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { generateAMCContract } from "@/server/pdf/document-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const params = await context.params;
    const { id: contractId } = params;

    // Verify the contract exists and belongs to the user
    const contract = await db.aMCContract.findUnique({
      where: { id: contractId },
      select: { ownerId: true, contractNumber: true },
    });

    if (!contract) {
      return NextResponse.json(
        { ok: false, error: "AMC Contract not found" },
        { status: 404 }
      );
    }

    if (contract.ownerId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Generate PDF contract document
    const pdfBuffer = await generateAMCContract(contractId);

    // Return PDF with appropriate headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="amc-contract-${contract.contractNumber}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Generate AMC contract document error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate contract document" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/rbac";
import { generateWelcomeKit } from "@/server/pdf/welcome-kit-service";

/**
 * GET /api/admin/recruitment/[id]/welcome-kit
 * Admin on-demand download of a registered candidate's Digital Welcome Kit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const pdfBuffer = await generateWelcomeKit(id);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="kni-welcome-kit-${id.slice(-8)}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Generate welcome kit error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to generate welcome kit" },
      { status: 500 }
    );
  }
}

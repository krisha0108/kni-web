import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendContactInquiryEmail } from "@/lib/email";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(7, "Phone must be at least 7 digits"),
  subject: z.string().max(200).optional(),
  message: z.string().max(5000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = contactSchema.parse(body);

    await sendContactInquiryEmail(data);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    console.error("Contact inquiry error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to send your message. Please try again." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
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

    await db.contactInquiry.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject || null,
        message: data.message || null,
      },
    });

    try {
      await sendContactInquiryEmail(data);
    } catch (emailError) {
      // The inquiry is already saved — don't fail the request just because
      // the notification email didn't go out.
      console.error("Contact inquiry email failed (inquiry still saved):", emailError);
    }

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

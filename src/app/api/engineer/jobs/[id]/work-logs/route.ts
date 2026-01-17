import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineer } from "@/server/auth/rbac";
import { saveUploadedFile } from "@/server/upload/localUpload";

/**
 * POST /api/engineer/jobs/:id/work-logs
 * Add progress notes/work log entries during job execution
 *
 * Note: Current schema supports one work log per assignment (created on completion).
 * This endpoint allows engineers to add interim progress notes that will be
 * included in the final completion note.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineer();
    const { id } = await params;

    const contentType = request.headers.get("content-type") || "";

    let note: string;
    let imageUrls: string[] = [];

    // Handle both JSON and multipart/form-data
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      note = formData.get("note") as string;

      // Handle image uploads
      const images = formData.getAll("images");
      for (const image of images) {
        if (image instanceof File) {
          const result = await saveUploadedFile(image, "work-logs");
          imageUrls.push(result.url);
        }
      }
    } else {
      const body = await request.json();
      note = body.note;
      imageUrls = body.imageUrls || [];
    }

    if (!note || note.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "Note is required" },
        { status: 400 }
      );
    }

    // Find the assignment
    const assignment = await db.engineerAssignment.findFirst({
      where: {
        id,
        engineerId: session.id,
      },
      include: {
        booking: true,
        workLog: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { ok: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Check if job is accepted or in progress
    if (assignment.status !== "ACCEPTED") {
      return NextResponse.json(
        { ok: false, error: "Job must be accepted before adding work logs" },
        { status: 400 }
      );
    }

    // Get existing work log or prepare new one
    const timestamp = new Date().toISOString();
    const newEntry = {
      timestamp,
      note: note.trim(),
      engineerId: session.id,
      engineerName: session.name,
      ...(imageUrls.length > 0 && { images: imageUrls }),
    };

    if (assignment.workLog) {
      // Work log already exists, append to it
      let existingNotes: any[] = [];

      // Check if completion note has embedded progress notes
      try {
        const noteData = JSON.parse(assignment.workLog.completionNote);
        if (Array.isArray(noteData.progressNotes)) {
          existingNotes = noteData.progressNotes;
        }
      } catch {
        // completionNote is a plain string, create new structure
        existingNotes = [];
      }

      existingNotes.push(newEntry);

      // Update work log with new progress note
      await db.engineerWorkLog.update({
        where: { id: assignment.workLog.id },
        data: {
          completionNote: JSON.stringify({
            progressNotes: existingNotes,
            finalNote: assignment.workLog.completionNote,
          }),
        },
      });
    } else {
      // Create new work log with progress note
      await db.engineerWorkLog.create({
        data: {
          assignmentId: id,
          completionNote: JSON.stringify({
            progressNotes: [newEntry],
            finalNote: "",
          }),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Work log entry added successfully",
      data: newEntry,
    });
  } catch (error) {
    console.error("Add work log error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/engineer/jobs/:id/work-logs
 * Get all work log entries for a job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineer();
    const { id } = await params;

    const assignment = await db.engineerAssignment.findFirst({
      where: {
        id,
        engineerId: session.id,
      },
      include: {
        workLog: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { ok: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    let workLogEntries: any[] = [];

    if (assignment.workLog) {
      try {
        const noteData = JSON.parse(assignment.workLog.completionNote);
        if (noteData.progressNotes && Array.isArray(noteData.progressNotes)) {
          workLogEntries = noteData.progressNotes;
        }
      } catch {
        // completionNote is a plain string, no progress notes
        workLogEntries = [];
      }
    }

    return NextResponse.json({
      ok: true,
      data: workLogEntries,
    });
  } catch (error) {
    console.error("Get work logs error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

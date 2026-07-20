import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { formatPhoneNumber } from "@/server/sms/service";
import { z } from "zod";

const POSITIONS = [
  "TECHNICIAN_MECHANICAL",
  "TECHNICIAN_ELECTRICAL",
  "TECHNICIAN_REFRIGERATION",
  "TECHNICIAN_INDUCTION",
  "TECHNICIAN_COMMERCIAL_KITCHEN",
] as const;

const flagMapSchema = z.record(z.string(), z.boolean()).optional();
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const currentYear = new Date().getFullYear();

const candidateSchema = z
  .object({
    // Personal
    fullName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .regex(/^[A-Za-z\s.'-]+$/, "Name should contain only letters"),
    mobile: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => INDIAN_MOBILE_REGEX.test(v), "Enter a valid 10-digit mobile number"),
    whatsappNumber: z
      .string()
      .optional()
      .transform((v) => (v ? v.replace(/\D/g, "") : v))
      .refine(
        (v) => !v || INDIAN_MOBILE_REGEX.test(v),
        "Enter a valid 10-digit WhatsApp number"
      ),
    email: z.string().email("A valid email address is required"),
    dob: z.string().optional(), // ISO date string
    age: z.number().int().positive().optional(),
    gender: z.string().optional(),
    currentAddress: z.string().optional(),
    permanentAddress: z.string().optional(),
    city: z.string().trim().min(2, "City is required"),
    state: z.string().trim().min(2, "State is required"),
    pinCode: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{6}$/.test(v), "PIN code must be 6 digits"),

    // Education
    highestQualification: z.string().optional(),
    technicalQualification: z.string().optional(),
    instituteName: z.string().optional(),
    yearOfPassing: z
      .number()
      .int()
      .min(1970, "Enter a valid year")
      .max(currentYear, "Enter a valid year")
      .optional(),

    // Experience
    totalExperienceYears: z.number().min(0).max(50).optional(),
    currentEmployer: z.string().optional(),
    previousEmployers: z.string().optional(),
    currentSalary: z.number().int().nonnegative().optional(),
    expectedSalary: z.number().int().nonnegative().optional(),
    noticePeriod: z.string().optional(),
    readyImmediate: z.boolean().optional(),

    // Position & skills
    position: z.enum(POSITIONS),
    skills: flagMapSchema,
    equipmentExperience: flagMapSchema,
    workCapability: flagMapSchema,

    // Driving
    twoWheelerAvailable: z.boolean().optional(),
    fourWheelerDriving: z.boolean().optional(),
    drivingLicenseNumber: z.string().optional(),

    // Family
    fatherName: z.string().optional(),
    motherName: z.string().optional(),
    maritalStatus: z.string().optional(),
    spouseName: z.string().optional(),
    familyMembersCount: z.number().int().min(1).max(30).optional(),
    emergencyContact: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => INDIAN_MOBILE_REGEX.test(v), "Enter a valid 10-digit emergency contact number"),

    // Bank (optional at initial stage)
    bankAccountName: z.string().optional(),
    bankName: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankIfsc: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.highestQualification?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Highest qualification is required",
        path: ["highestQualification"],
      });
    }
    if (!data.fatherName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Father's name is required",
        path: ["fatherName"],
      });
    }
    if (!data.skills || !Object.values(data.skills).some(Boolean)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one technical skill",
        path: ["skills"],
      });
    }
    if (data.fourWheelerDriving && !data.drivingLicenseNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Driving license number is required",
        path: ["drivingLicenseNumber"],
      });
    }
    const anyBank =
      data.bankAccountName?.trim() ||
      data.bankName?.trim() ||
      data.bankAccountNumber?.trim() ||
      data.bankIfsc?.trim();
    if (anyBank) {
      if (!data.bankAccountName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Account holder name is required if adding bank details",
          path: ["bankAccountName"],
        });
      }
      if (!data.bankName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bank name is required if adding bank details",
          path: ["bankName"],
        });
      }
      if (!data.bankAccountNumber || !/^\d{9,18}$/.test(data.bankAccountNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid bank account number (9-18 digits)",
          path: ["bankAccountNumber"],
        });
      }
      if (!data.bankIfsc || !IFSC_REGEX.test(data.bankIfsc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid IFSC code",
          path: ["bankIfsc"],
        });
      }
    }
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = candidateSchema.parse(body);
    const mobile = formatPhoneNumber(validated.mobile);

    // Candidate must have completed the email verification step (CANDIDATE_VERIFICATION
    // purpose) before a profile can be created.
    const verifiedEmailCode = await db.emailCode.findFirst({
      where: {
        email: validated.email,
        purpose: "CANDIDATE_VERIFICATION",
        isVerified: true,
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // within last 30 min
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verifiedEmailCode) {
      return NextResponse.json(
        { ok: false, error: "Please verify your email with the code before submitting" },
        { status: 400 }
      );
    }

    // Rate limit: max 3 applications per email per 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await db.candidate.count({
      where: { email: validated.email, createdAt: { gte: twentyFourHoursAgo } },
    });

    if (recentCount >= 3) {
      return NextResponse.json(
        { ok: false, error: "Too many applications submitted. Please try again later." },
        { status: 429 }
      );
    }

    const candidate = await db.candidate.create({
      data: {
        fullName: validated.fullName,
        mobile,
        whatsappNumber: validated.whatsappNumber || null,
        email: validated.email,
        emailVerified: true,
        dob: validated.dob ? new Date(validated.dob) : null,
        age: validated.age ?? null,
        gender: validated.gender || null,
        currentAddress: validated.currentAddress || null,
        permanentAddress: validated.permanentAddress || null,
        city: validated.city,
        state: validated.state,
        pinCode: validated.pinCode || null,

        highestQualification: validated.highestQualification || null,
        technicalQualification: validated.technicalQualification || null,
        instituteName: validated.instituteName || null,
        yearOfPassing: validated.yearOfPassing ?? null,

        totalExperienceYears: validated.totalExperienceYears ?? null,
        currentEmployer: validated.currentEmployer || null,
        previousEmployers: validated.previousEmployers || null,
        currentSalary: validated.currentSalary ?? null,
        expectedSalary: validated.expectedSalary ?? null,
        noticePeriod: validated.noticePeriod || null,
        readyImmediate: validated.readyImmediate ?? false,

        position: validated.position,
        skills: validated.skills ?? undefined,
        equipmentExperience: validated.equipmentExperience ?? undefined,
        workCapability: validated.workCapability ?? undefined,

        twoWheelerAvailable: validated.twoWheelerAvailable ?? false,
        fourWheelerDriving: validated.fourWheelerDriving ?? false,
        drivingLicenseNumber: validated.drivingLicenseNumber || null,

        fatherName: validated.fatherName || null,
        motherName: validated.motherName || null,
        maritalStatus: validated.maritalStatus || null,
        spouseName: validated.spouseName || null,
        familyMembersCount: validated.familyMembersCount ?? null,
        emergencyContact: validated.emergencyContact || null,

        bankAccountName: validated.bankAccountName || null,
        bankName: validated.bankName || null,
        bankAccountNumber: validated.bankAccountNumber || null,
        bankIfsc: validated.bankIfsc || null,

        activities: {
          create: {
            type: "CANDIDATE_CREATED",
            description: "Application submitted via public registration form",
            toStatus: "NEW",
            performedBy: "System",
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: { id: candidate.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Candidate registration error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { ENGAGEMENT_TYPE_OPTIONS } from "@/app/apply/config";

export const ENGAGEMENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ENGAGEMENT_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

export interface Candidate {
  id: string;
  fullName: string;
  mobile: string;
  whatsappNumber: string | null;
  email: string | null;
  dob: string | null;
  age: number | null;
  gender: string | null;
  currentAddress: string | null;
  permanentAddress: string | null;
  city: string;
  state: string;
  pinCode: string | null;
  highestQualification: string | null;
  technicalQualification: string | null;
  instituteName: string | null;
  yearOfPassing: number | null;
  position: string;
  totalExperienceYears: number | null;
  currentEmployer: string | null;
  previousEmployers: string | null;
  currentSalary: number | null;
  expectedSalary: number | null;
  noticePeriod: string | null;
  readyImmediate: boolean;
  engagementType: string | null;
  finalCommissionRate: number | null;
  finalMonthlySalary: number | null;
  twoWheelerAvailable: boolean;
  fourWheelerDriving: boolean;
  drivingLicenseNumber: string | null;
  fatherName: string | null;
  motherName: string | null;
  maritalStatus: string | null;
  spouseName: string | null;
  familyMembersCount: number | null;
  emergencyContact: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  status: string;
  rating: number | null;
  rejectionReason: string | null;
  interviewScheduledAt: string | null;
  interviewNotes: string | null;
  convertedUserId: string | null;
  photoUrl: string | null;
  aadhaarUrl: string | null;
  panUrl: string | null;
  resumeUrl: string | null;
  drivingLicenseUrl: string | null;
  salarySlipUrl: string | null;
  policeVerificationUrl: string | null;
  vaccinationCertUrl: string | null;
  experienceCertUrls: string[] | null;
  educationCertUrls: string[] | null;
  videoIntroUrl: string | null;
  skills: Record<string, boolean> | null;
  equipmentExperience: Record<string, boolean> | null;
  workCapability: Record<string, boolean> | null;
  createdAt: string;
  notes?: { id: string; note: string; createdAt: string; author: { name: string } }[];
  activities?: { id: string; description: string; createdAt: string }[];
}

export const POSITION_LABELS: Record<string, string> = {
  TECHNICIAN_MECHANICAL: "Mechanical",
  TECHNICIAN_ELECTRICAL: "Electrical",
  TECHNICIAN_REFRIGERATION: "Refrigeration",
  TECHNICIAN_INDUCTION: "Induction",
  TECHNICIAN_COMMERCIAL_KITCHEN: "Commercial Kitchen",
};

export const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  ON_HOLD: "On Hold",
  REJECTED: "Rejected",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  TECHNICAL_EVALUATION: "Technical Evaluation",
  APPROVED: "Approved",
  REGISTRATION_PAYMENT_PENDING: "Payment Pending",
  REGISTERED_PARTNER: "Registered Partner",
  TRAINING_PENDING: "Training Pending",
  ACTIVE_TECHNICIAN: "Active Technician",
};

export const STATUS_COLORS: Record<
  string,
  "default" | "secondary" | "success" | "destructive" | "warning"
> = {
  NEW: "secondary",
  UNDER_REVIEW: "default",
  SHORTLISTED: "warning",
  ON_HOLD: "secondary",
  REJECTED: "destructive",
  INTERVIEW_SCHEDULED: "default",
  TECHNICAL_EVALUATION: "default",
  APPROVED: "success",
  REGISTRATION_PAYMENT_PENDING: "warning",
  REGISTERED_PARTNER: "success",
  TRAINING_PENDING: "warning",
  ACTIVE_TECHNICIAN: "success",
};

export const ACTIONS: Record<
  string,
  { value: string; label: string; variant?: "default" | "destructive" }[]
> = {
  NEW: [
    { value: "UNDER_REVIEW", label: "Start Review" },
    { value: "SHORTLISTED", label: "Shortlist" },
    { value: "REJECTED", label: "Reject", variant: "destructive" },
  ],
  UNDER_REVIEW: [
    { value: "SHORTLISTED", label: "Shortlist" },
    { value: "ON_HOLD", label: "Hold" },
    { value: "REJECTED", label: "Reject", variant: "destructive" },
  ],
  SHORTLISTED: [
    { value: "INTERVIEW_SCHEDULED", label: "Schedule Interview" },
    { value: "ON_HOLD", label: "Hold" },
    { value: "REJECTED", label: "Reject", variant: "destructive" },
  ],
  ON_HOLD: [
    { value: "UNDER_REVIEW", label: "Resume Review" },
    { value: "SHORTLISTED", label: "Shortlist" },
    { value: "REJECTED", label: "Reject", variant: "destructive" },
  ],
  INTERVIEW_SCHEDULED: [
    { value: "TECHNICAL_EVALUATION", label: "Move to Technical Evaluation" },
    { value: "ON_HOLD", label: "Hold" },
    { value: "REJECTED", label: "Reject", variant: "destructive" },
  ],
  TECHNICAL_EVALUATION: [
    { value: "APPROVED", label: "Approve" },
    { value: "ON_HOLD", label: "Hold" },
    { value: "REJECTED", label: "Reject", variant: "destructive" },
  ],
  APPROVED: [{ value: "REGISTRATION_PAYMENT_PENDING", label: "Send Payment Link" }],
  REGISTRATION_PAYMENT_PENDING: [{ value: "REGISTERED_PARTNER", label: "Mark Payment Received" }],
  REGISTERED_PARTNER: [{ value: "TRAINING_PENDING", label: "Move to Training" }],
  TRAINING_PENDING: [{ value: "ACTIVE_TECHNICIAN", label: "Mark Active Technician" }],
  REJECTED: [{ value: "UNDER_REVIEW", label: "Reopen" }],
};

export const DOC_LINKS: { key: keyof Candidate; label: string }[] = [
  { key: "photoUrl", label: "Photo" },
  { key: "aadhaarUrl", label: "Aadhaar" },
  { key: "panUrl", label: "PAN" },
  { key: "resumeUrl", label: "Resume" },
  { key: "drivingLicenseUrl", label: "Driving License" },
  { key: "salarySlipUrl", label: "Salary Slip" },
  { key: "policeVerificationUrl", label: "Police Verification" },
  { key: "vaccinationCertUrl", label: "Vaccination Certificate" },
];

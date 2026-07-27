"use client";

import { useState, useRef, useEffect } from "react";
import { Afacad } from "next/font/google";
import SiteHeader from "../_components/SiteHeader";
import Footer from "../_components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Video } from "lucide-react";
import {
  POSITIONS,
  SKILLS_BY_POSITION,
  EQUIPMENT_LIST,
  WORK_CAPABILITY_LIST,
  STEP_TITLES,
  GENDER_OPTIONS,
  QUALIFICATION_OPTIONS,
  TECHNICAL_QUALIFICATION_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  NOTICE_PERIOD_OPTIONS,
  INDIAN_STATES,
  ENGAGEMENT_TYPE_OPTIONS,
  type PositionValue,
  type EngagementTypeValue,
} from "./config";

const afacad = Afacad({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

type FlagMap = Record<string, boolean>;

interface FormState {
  position: PositionValue | "";
  engagementType: EngagementTypeValue | "";
  mobile: string;
  fullName: string;
  whatsappNumber: string;
  email: string;
  dob: string;
  gender: string;
  currentAddress: string;
  permanentAddress: string;
  city: string;
  state: string;
  pinCode: string;
  highestQualification: string;
  technicalQualification: string;
  instituteName: string;
  yearOfPassing: string;
  totalExperienceYears: string;
  currentEmployer: string;
  previousEmployers: string;
  currentSalary: string;
  expectedSalary: string;
  noticePeriod: string;
  readyImmediate: boolean;
  skills: FlagMap;
  equipmentExperience: FlagMap;
  workCapability: FlagMap;
  twoWheelerAvailable: boolean;
  fourWheelerDriving: boolean;
  drivingLicenseNumber: string;
  fatherName: string;
  motherName: string;
  maritalStatus: string;
  spouseName: string;
  familyMembersCount: string;
  emergencyContact: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
}

const INITIAL_STATE: FormState = {
  position: "",
  engagementType: "",
  mobile: "",
  fullName: "",
  whatsappNumber: "",
  email: "",
  dob: "",
  gender: "",
  currentAddress: "",
  permanentAddress: "",
  city: "",
  state: "",
  pinCode: "",
  highestQualification: "",
  technicalQualification: "",
  instituteName: "",
  yearOfPassing: "",
  totalExperienceYears: "",
  currentEmployer: "",
  previousEmployers: "",
  currentSalary: "",
  expectedSalary: "",
  noticePeriod: "",
  readyImmediate: false,
  skills: {},
  equipmentExperience: {},
  workCapability: {},
  twoWheelerAvailable: false,
  fourWheelerDriving: false,
  drivingLicenseNumber: "",
  fatherName: "",
  motherName: "",
  maritalStatus: "",
  spouseName: "",
  familyMembersCount: "",
  emergencyContact: "",
  bankAccountName: "",
  bankName: "",
  bankAccountNumber: "",
  bankIfsc: "",
};

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function onlyDigits(value: string, maxLen: number) {
  return value.replace(/\D/g, "").slice(0, maxLen);
}

function calcAge(dobStr: string): number | null {
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function validatePersonalDetails(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.fullName.trim() || f.fullName.trim().length < 2) {
    e.fullName = "Enter your full name";
  } else if (!/^[A-Za-z\s.'-]+$/.test(f.fullName.trim())) {
    e.fullName = "Name should contain only letters";
  }
  if (!INDIAN_MOBILE_REGEX.test(f.mobile)) {
    e.mobile = "Enter a valid 10-digit mobile number";
  }
  if (f.whatsappNumber && !INDIAN_MOBILE_REGEX.test(f.whatsappNumber)) {
    e.whatsappNumber = "Enter a valid 10-digit WhatsApp number";
  }
  if (f.dob) {
    const age = calcAge(f.dob);
    if (age === null) e.dob = "Enter a valid date";
    else if (age < 18) e.dob = "Must be at least 18 years old";
    else if (age > 65) e.dob = "Please check the date of birth";
  }
  if (!f.city.trim()) e.city = "City is required";
  if (!f.state.trim()) e.state = "State is required";
  if (f.pinCode && !/^\d{6}$/.test(f.pinCode)) e.pinCode = "PIN code must be 6 digits";
  return e;
}

function validateEducation(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.highestQualification.trim()) e.highestQualification = "Highest qualification is required";
  if (f.yearOfPassing) {
    const y = Number(f.yearOfPassing);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(y) || y < 1970 || y > currentYear) {
      e.yearOfPassing = `Enter a valid year (1970-${currentYear})`;
    }
  }
  return e;
}

function validateExperience(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.totalExperienceYears) {
    const y = Number(f.totalExperienceYears);
    if (Number.isNaN(y) || y < 0 || y > 50) {
      e.totalExperienceYears = "Enter a valid number of years (0-50)";
    }
  }
  if (f.currentSalary && Number(f.currentSalary) < 0) {
    e.currentSalary = "Salary cannot be negative";
  }
  if (f.expectedSalary && Number(f.expectedSalary) < 0) {
    e.expectedSalary = "Salary cannot be negative";
  }
  return e;
}

function validateSkillsStep(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!Object.values(f.skills).some(Boolean)) {
    e.skills = "Select at least one technical skill";
  }
  return e;
}

function validateDrivingFamilyBank(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.fourWheelerDriving && !f.drivingLicenseNumber.trim()) {
    e.drivingLicenseNumber = "Driving license number is required";
  }
  if (!f.fatherName.trim()) e.fatherName = "Father's name is required";
  if (!f.emergencyContact.trim()) {
    e.emergencyContact = "Emergency contact number is required";
  } else if (!INDIAN_MOBILE_REGEX.test(f.emergencyContact)) {
    e.emergencyContact = "Enter a valid 10-digit number";
  }
  if (f.familyMembersCount) {
    const n = Number(f.familyMembersCount);
    if (!Number.isInteger(n) || n < 1 || n > 30) {
      e.familyMembersCount = "Enter a valid number of family members";
    }
  }
  const anyBank =
    f.bankAccountName.trim() || f.bankName.trim() || f.bankAccountNumber.trim() || f.bankIfsc.trim();
  if (anyBank) {
    if (!f.bankAccountName.trim()) e.bankAccountName = "Required if adding bank details";
    if (!f.bankName.trim()) e.bankName = "Required if adding bank details";
    if (!/^\d{9,18}$/.test(f.bankAccountNumber)) {
      e.bankAccountNumber = "Enter a valid account number (9-18 digits)";
    }
    if (!IFSC_REGEX.test(f.bankIfsc)) {
      e.bankIfsc = "Enter a valid IFSC code (e.g. SBIN0001234)";
    }
  }
  return e;
}

const DOC_FIELDS: { key: string; label: string; required: boolean }[] = [
  { key: "photo", label: "Passport Size Photograph", required: true },
  { key: "aadhaar", label: "Aadhaar Card", required: true },
  { key: "pan", label: "PAN Card", required: false },
  { key: "drivingLicense", label: "Driving License", required: false },
  { key: "resume", label: "Resume", required: true },
  { key: "experienceCert", label: "Experience Certificate(s)", required: false },
  { key: "educationCert", label: "Education Certificate(s)", required: false },
  { key: "salarySlip", label: "Salary Slip (Optional)", required: false },
  { key: "policeVerification", label: "Police Verification (Optional)", required: false },
  { key: "vaccinationCert", label: "Vaccination Certificate (Optional)", required: false },
];

export default function ApplyPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailError, setEmailError] = useState("");
  const [customQualification, setCustomQualification] = useState(false);
  const [customTechnicalQualification, setCustomTechnicalQualification] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleFlag = (group: "skills" | "equipmentExperience" | "workCapability", key: string) =>
    setForm((prev) => ({
      ...prev,
      [group]: { ...prev[group], [key]: !prev[group][key] },
    }));

  const setAllFlags = (
    group: "skills" | "equipmentExperience" | "workCapability",
    options: string[],
    value: boolean
  ) =>
    setForm((prev) => ({
      ...prev,
      [group]: Object.fromEntries(options.map((o) => [o, value])),
    }));

  async function sendOtp() {
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setEmailError("Enter a valid email address");
      toast({ title: "Enter a valid email address", variant: "destructive" });
      return;
    }
    setEmailError("");
    setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/send-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, purpose: "CANDIDATE_VERIFICATION" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setOtpSent(true);
      toast({ title: "Verification code sent to your email" });
    } catch (e) {
      toast({
        title: "Failed to send code",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyOtp() {
    if (otpCode.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await fetch("/api/public/candidate-verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          code: otpCode,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setEmailVerified(true);
      toast({ title: "Email verified" });
      setStep(2);
    } catch (e) {
      toast({
        title: "Verification failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function submitApplication() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/candidate-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          age: form.dob ? calcAge(form.dob) ?? undefined : undefined,
          yearOfPassing: form.yearOfPassing ? Number(form.yearOfPassing) : undefined,
          totalExperienceYears: form.totalExperienceYears
            ? Number(form.totalExperienceYears)
            : undefined,
          currentSalary:
            form.engagementType === "COMMISSION"
              ? undefined
              : form.currentSalary
              ? Number(form.currentSalary)
              : undefined,
          expectedSalary:
            form.engagementType === "COMMISSION"
              ? undefined
              : form.expectedSalary
              ? Number(form.expectedSalary)
              : undefined,
          noticePeriod: form.engagementType === "COMMISSION" ? undefined : form.noticePeriod,
          familyMembersCount: form.familyMembersCount
            ? Number(form.familyMembersCount)
            : undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setCandidateId(data.data.id);
      setStep(7);
      toast({ title: "Application saved. Now upload your documents." });
    } catch (e) {
      toast({
        title: "Could not submit application",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadDoc(docType: string, file: File) {
    if (!candidateId) return;
    setUploadingDoc(docType);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("candidateId", candidateId);
      formData.append("docType", docType);
      const res = await fetch("/api/public/candidate-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setUploadedDocs((prev) => ({ ...prev, [docType]: true }));
      toast({ title: "Uploaded successfully" });
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setUploadingDoc(null);
    }
  }

  const canFinish = DOC_FIELDS.filter((d) => d.required).every((d) => uploadedDocs[d.key]);

  return (
    <div className={`${afacad.className} min-h-screen bg-muted/30`}>
      <SiteHeader />
      <div className="py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 rounded-lg bg-[#EF3A3A] px-6 py-5 text-white">
          <h1 className="text-xl font-bold">KNI Services — Technician Registration</h1>
          <p className="text-sm opacity-90">
            Apply to associate with our growing service network
          </p>
        </div>

        {!done && (
          <p className="mb-4 text-sm text-muted-foreground">
            Step {step + 1} of {STEP_TITLES.length}: {STEP_TITLES[step]}
          </p>
        )}

        {done ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <h2 className="text-lg font-semibold">Application Submitted!</h2>
              <p className="text-sm text-muted-foreground">
                Thank you for applying to KNI Services. Our recruitment team will review your
                profile and contact you if shortlisted.
              </p>
              {candidateId && (
                <p className="text-xs text-muted-foreground">
                  Reference ID: {candidateId}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{STEP_TITLES[step]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>I want to join KNI as *</Label>
                    <RadioGroup
                      value={form.engagementType}
                      onValueChange={(v) => {
                        const value = v as EngagementTypeValue;
                        update("engagementType", value);
                        if (value === "COMMISSION") {
                          setForm((prev) => ({
                            ...prev,
                            engagementType: value,
                            currentSalary: "",
                            expectedSalary: "",
                            noticePeriod: "",
                          }));
                        }
                      }}
                    >
                      {ENGAGEMENT_TYPE_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          htmlFor={`engagement-${opt.value}`}
                          className="flex cursor-pointer items-start gap-2 rounded-md border p-3"
                        >
                          <RadioGroupItem
                            value={opt.value}
                            id={`engagement-${opt.value}`}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="block text-sm font-medium">{opt.label}</span>
                            <span className="block text-xs text-muted-foreground">
                              {opt.helper}
                            </span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label>Select the position you are applying for</Label>
                    <Select
                      value={form.position}
                      onValueChange={(v) => update("position", v as PositionValue)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a position" />
                      </SelectTrigger>
                      <SelectContent>
                        {POSITIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!form.position || !form.engagementType}
                    onClick={() => setStep(1)}
                  >
                    Continue
                  </Button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <Label>Email ID</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      disabled={otpSent}
                      onChange={(e) => {
                        update("email", e.target.value);
                        if (emailError) setEmailError("");
                      }}
                    />
                    <Button variant="secondary" disabled={sendingOtp || otpSent} onClick={sendOtp}>
                      {sendingOtp && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                      {otpSent ? "Sent" : "Send Code"}
                    </Button>
                  </div>
                  <ErrorText error={emailError} />
                  {otpSent && !emailVerified && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="6-digit code"
                        value={otpCode}
                        maxLength={6}
                        inputMode="numeric"
                        onChange={(e) => setOtpCode(onlyDigits(e.target.value, 6))}
                      />
                      <Button disabled={verifyingOtp} onClick={verifyOtp}>
                        {verifyingOtp && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                        Verify
                      </Button>
                    </div>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => setStep(0)}>
                    Back
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <Field label="Full Name *" error={errors.fullName}>
                    <Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
                  </Field>
                  <Field label="Mobile Number *" error={errors.mobile}>
                    <Input
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.mobile}
                      onChange={(e) => update("mobile", onlyDigits(e.target.value, 10))}
                    />
                  </Field>
                  <Field label="WhatsApp Number" error={errors.whatsappNumber}>
                    <Input
                      placeholder="10-digit WhatsApp number"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.whatsappNumber}
                      onChange={(e) => update("whatsappNumber", onlyDigits(e.target.value, 10))}
                    />
                  </Field>
                  <Field label="Date of Birth" error={errors.dob}>
                    <Input
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      value={form.dob}
                      onChange={(e) => update("dob", e.target.value)}
                    />
                  </Field>
                  <Field label="Gender">
                    <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Current Address">
                    <Textarea
                      value={form.currentAddress}
                      onChange={(e) => update("currentAddress", e.target.value)}
                    />
                  </Field>
                  <Field label="Permanent Address">
                    <Textarea
                      value={form.permanentAddress}
                      onChange={(e) => update("permanentAddress", e.target.value)}
                    />
                  </Field>
                  <Field label="City *" error={errors.city}>
                    <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
                  </Field>
                  <Field label="State *" error={errors.state}>
                    <Select value={form.state} onValueChange={(v) => update("state", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="PIN Code" error={errors.pinCode}>
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      value={form.pinCode}
                      onChange={(e) => update("pinCode", onlyDigits(e.target.value, 6))}
                    />
                  </Field>
                  <StepNav
                    onBack={() => setStep(1)}
                    onNext={() => {
                      const e = validatePersonalDetails(form);
                      setErrors(e);
                      if (Object.keys(e).length === 0) setStep(3);
                    }}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <Field label="Highest Qualification *" error={errors.highestQualification}>
                    <Select
                      value={customQualification ? "Other" : form.highestQualification}
                      onValueChange={(v) => {
                        if (v === "Other") {
                          setCustomQualification(true);
                          update("highestQualification", "");
                        } else {
                          setCustomQualification(false);
                          update("highestQualification", v);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select qualification" />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALIFICATION_OPTIONS.map((q) => (
                          <SelectItem key={q} value={q}>
                            {q}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {customQualification && (
                      <Input
                        className="mt-2"
                        placeholder="Specify your qualification"
                        value={form.highestQualification}
                        onChange={(e) => update("highestQualification", e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Technical Qualification / ITI / Diploma / Degree">
                    <Select
                      value={customTechnicalQualification ? "Other" : form.technicalQualification}
                      onValueChange={(v) => {
                        if (v === "Other") {
                          setCustomTechnicalQualification(true);
                          update("technicalQualification", "");
                        } else {
                          setCustomTechnicalQualification(false);
                          update("technicalQualification", v);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select technical qualification" />
                      </SelectTrigger>
                      <SelectContent>
                        {TECHNICAL_QUALIFICATION_OPTIONS.map((q) => (
                          <SelectItem key={q} value={q}>
                            {q}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {customTechnicalQualification && (
                      <Input
                        className="mt-2"
                        placeholder="Specify your technical qualification"
                        value={form.technicalQualification}
                        onChange={(e) => update("technicalQualification", e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Institute Name">
                    <Input
                      value={form.instituteName}
                      onChange={(e) => update("instituteName", e.target.value)}
                    />
                  </Field>
                  <Field label="Year of Passing" error={errors.yearOfPassing}>
                    <Input
                      inputMode="numeric"
                      maxLength={4}
                      value={form.yearOfPassing}
                      onChange={(e) => update("yearOfPassing", onlyDigits(e.target.value, 4))}
                    />
                  </Field>
                  <StepNav
                    onBack={() => setStep(2)}
                    onNext={() => {
                      const e = validateEducation(form);
                      setErrors(e);
                      if (Object.keys(e).length === 0) setStep(4);
                    }}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <Field label="Total Experience (years)" error={errors.totalExperienceYears}>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={form.totalExperienceYears}
                      onChange={(e) => update("totalExperienceYears", e.target.value)}
                    />
                  </Field>
                  <Field label="Current Employer">
                    <Input
                      value={form.currentEmployer}
                      onChange={(e) => update("currentEmployer", e.target.value)}
                    />
                  </Field>
                  <Field label="Previous Employers">
                    <Textarea
                      value={form.previousEmployers}
                      onChange={(e) => update("previousEmployers", e.target.value)}
                    />
                  </Field>
                  {form.engagementType !== "COMMISSION" && (
                    <>
                      <Field label="Current Salary (₹/month)" error={errors.currentSalary}>
                        <Input
                          type="number"
                          min={0}
                          value={form.currentSalary}
                          onChange={(e) => update("currentSalary", e.target.value)}
                        />
                      </Field>
                      <Field label="Expected Salary (₹/month)" error={errors.expectedSalary}>
                        <Input
                          type="number"
                          min={0}
                          value={form.expectedSalary}
                          onChange={(e) => update("expectedSalary", e.target.value)}
                        />
                      </Field>
                      <Field label="Notice Period">
                        <Select
                          value={form.noticePeriod}
                          onValueChange={(v) => update("noticePeriod", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select notice period" />
                          </SelectTrigger>
                          <SelectContent>
                            {NOTICE_PERIOD_OPTIONS.map((n) => (
                              <SelectItem key={n} value={n}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </>
                  )}
                  <div
                    className="flex cursor-pointer items-center gap-2"
                    onClick={() => update("readyImmediate", !form.readyImmediate)}
                  >
                    <Checkbox checked={form.readyImmediate} />
                    <Label className="cursor-pointer">Ready to Join Immediately</Label>
                  </div>
                  <StepNav
                    onBack={() => setStep(3)}
                    onNext={() => {
                      const e = validateExperience(form);
                      setErrors(e);
                      if (Object.keys(e).length === 0) setStep(5);
                    }}
                  />
                </div>
              )}

              {step === 5 && form.position && (
                <div className="space-y-5">
                  <FlagGroup
                    title="Technical Skills *"
                    options={SKILLS_BY_POSITION[form.position]}
                    values={form.skills}
                    onToggle={(k) => toggleFlag("skills", k)}
                    onSelectAll={() =>
                      setAllFlags("skills", SKILLS_BY_POSITION[form.position as PositionValue], true)
                    }
                    onDeselectAll={() =>
                      setAllFlags("skills", SKILLS_BY_POSITION[form.position as PositionValue], false)
                    }
                    error={errors.skills}
                  />
                  <FlagGroup
                    title="Commercial Kitchen Equipment Experience"
                    options={EQUIPMENT_LIST}
                    values={form.equipmentExperience}
                    onToggle={(k) => toggleFlag("equipmentExperience", k)}
                    onSelectAll={() => setAllFlags("equipmentExperience", EQUIPMENT_LIST, true)}
                    onDeselectAll={() => setAllFlags("equipmentExperience", EQUIPMENT_LIST, false)}
                  />
                  <FlagGroup
                    title="Work Capability"
                    options={WORK_CAPABILITY_LIST}
                    values={form.workCapability}
                    onToggle={(k) => toggleFlag("workCapability", k)}
                    onSelectAll={() => setAllFlags("workCapability", WORK_CAPABILITY_LIST, true)}
                    onDeselectAll={() => setAllFlags("workCapability", WORK_CAPABILITY_LIST, false)}
                  />
                  <StepNav
                    onBack={() => setStep(4)}
                    onNext={() => {
                      const e = validateSkillsStep(form);
                      setErrors(e);
                      if (Object.keys(e).length === 0) setStep(6);
                    }}
                  />
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  <p className="text-sm font-medium">Driving Details</p>
                  <div
                    className="flex cursor-pointer items-center gap-2"
                    onClick={() => update("twoWheelerAvailable", !form.twoWheelerAvailable)}
                  >
                    <Checkbox checked={form.twoWheelerAvailable} />
                    <Label className="cursor-pointer">Two Wheeler Available</Label>
                  </div>
                  <div
                    className="flex cursor-pointer items-center gap-2"
                    onClick={() => update("fourWheelerDriving", !form.fourWheelerDriving)}
                  >
                    <Checkbox checked={form.fourWheelerDriving} />
                    <Label className="cursor-pointer">Four Wheeler Driving</Label>
                  </div>
                  <Field
                    label={form.fourWheelerDriving ? "Driving License Number *" : "Driving License Number"}
                    error={errors.drivingLicenseNumber}
                  >
                    <Input
                      value={form.drivingLicenseNumber}
                      onChange={(e) =>
                        update("drivingLicenseNumber", e.target.value.toUpperCase())
                      }
                    />
                  </Field>

                  <p className="pt-2 text-sm font-medium">Family Details</p>
                  <Field label="Father's Name *" error={errors.fatherName}>
                    <Input value={form.fatherName} onChange={(e) => update("fatherName", e.target.value)} />
                  </Field>
                  <Field label="Mother's Name">
                    <Input value={form.motherName} onChange={(e) => update("motherName", e.target.value)} />
                  </Field>
                  <Field label="Marital Status">
                    <Select
                      value={form.maritalStatus}
                      onValueChange={(v) => update("maritalStatus", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select marital status" />
                      </SelectTrigger>
                      <SelectContent>
                        {MARITAL_STATUS_OPTIONS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Spouse Name">
                    <Input value={form.spouseName} onChange={(e) => update("spouseName", e.target.value)} />
                  </Field>
                  <Field label="Number of Family Members" error={errors.familyMembersCount}>
                    <Input
                      inputMode="numeric"
                      maxLength={2}
                      value={form.familyMembersCount}
                      onChange={(e) => update("familyMembersCount", onlyDigits(e.target.value, 2))}
                    />
                  </Field>
                  <Field label="Emergency Contact Number *" error={errors.emergencyContact}>
                    <Input
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.emergencyContact}
                      onChange={(e) => update("emergencyContact", onlyDigits(e.target.value, 10))}
                    />
                  </Field>

                  <p className="pt-2 text-sm font-medium">Bank Details (Optional)</p>
                  <Field label="Account Holder Name" error={errors.bankAccountName}>
                    <Input
                      value={form.bankAccountName}
                      onChange={(e) => update("bankAccountName", e.target.value)}
                    />
                  </Field>
                  <Field label="Bank Name" error={errors.bankName}>
                    <Input value={form.bankName} onChange={(e) => update("bankName", e.target.value)} />
                  </Field>
                  <Field label="Account Number" error={errors.bankAccountNumber}>
                    <Input
                      inputMode="numeric"
                      maxLength={18}
                      value={form.bankAccountNumber}
                      onChange={(e) => update("bankAccountNumber", onlyDigits(e.target.value, 18))}
                    />
                  </Field>
                  <Field label="IFSC Code" error={errors.bankIfsc}>
                    <Input
                      maxLength={11}
                      value={form.bankIfsc}
                      onChange={(e) => update("bankIfsc", e.target.value.toUpperCase().slice(0, 11))}
                    />
                  </Field>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep(5)}>
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={submitting}
                      onClick={() => {
                        const e = validateDrivingFamilyBank(form);
                        setErrors(e);
                        if (Object.keys(e).length === 0) submitApplication();
                      }}
                    >
                      {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                      Submit Application
                    </Button>
                  </div>
                </div>
              )}

              {step === 7 && candidateId && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload the documents below and record a short (1-2 minute) video introduction.
                  </p>
                  {DOC_FIELDS.map((d) => (
                    <div key={d.key} className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">
                          {d.label}
                          {d.required && <span className="text-red-500"> *</span>}
                        </p>
                        {uploadedDocs[d.key] && (
                          <p className="text-xs text-green-600">Uploaded</p>
                        )}
                      </div>
                      <label>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadDoc(d.key, file);
                          }}
                        />
                        <Button asChild variant="outline" size="sm" disabled={uploadingDoc === d.key}>
                          <span>
                            {uploadingDoc === d.key && (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            )}
                            {uploadedDocs[d.key] ? "Replace" : "Upload"}
                          </span>
                        </Button>
                      </label>
                    </div>
                  ))}

                  <div className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          1–2 Minute Video Introduction
                        </p>
                        <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                          <li>Tell us about yourself.</li>
                          <li>Which equipment do you specialize in?</li>
                          <li>How many years of experience do you have?</li>
                          <li>Why do you want to associate with KNI Services?</li>
                        </ol>
                        {uploadedDocs.video && <p className="text-xs text-green-600">Uploaded</p>}
                      </div>
                      <label>
                        <input
                          type="file"
                          className="hidden"
                          accept="video/mp4,video/webm,video/quicktime"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadDoc("video", file);
                          }}
                        />
                        <Button asChild variant="outline" size="sm" disabled={uploadingDoc === "video"}>
                          <span>
                            {uploadingDoc === "video" && (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            )}
                            {uploadedDocs.video ? "Replace" : "Upload File"}
                          </span>
                        </Button>
                      </label>
                    </div>
                    <VideoIntroRecorder
                      onUpload={(file) => uploadDoc("video", file)}
                      uploading={uploadingDoc === "video"}
                    />
                  </div>

                  <Button className="w-full" disabled={!canFinish} onClick={() => setDone(true)}>
                    Finish
                  </Button>
                  {!canFinish && (
                    <p className="text-center text-xs text-muted-foreground">
                      Photo, Aadhaar Card and Resume are required before finishing.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      </div>
      <Footer />
    </div>
  );
}

const VIDEO_MAX_SECONDS = 120;

function VideoIntroRecorder({
  onUpload,
  uploading,
}: {
  onUpload: (file: File) => void | Promise<void>;
  uploading: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "live" | "recording" | "preview">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const mimeRef = useRef<string>("video/webm");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supportsRecording =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined";

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopStream();
      clearTimer();
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPhase("live");
    } catch {
      setCameraError(
        "Camera/microphone access denied. Please allow access, or use Upload File instead."
      );
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    const mimeCandidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    const supported = mimeCandidates.find((m) => window.MediaRecorder.isTypeSupported(m)) || "";
    mimeRef.current = supported.split(";")[0] || "video/webm";
    chunksRef.current = [];

    const recorder = supported
      ? new MediaRecorder(streamRef.current, { mimeType: supported })
      : new MediaRecorder(streamRef.current);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeRef.current });
      blobRef.current = blob;
      setRecordedUrl(URL.createObjectURL(blob));
      setPhase("preview");
      stopStream();
      clearTimer();
    };

    recorderRef.current = recorder;
    recorder.start();
    setElapsed(0);
    setPhase("recording");
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= VIDEO_MAX_SECONDS) {
          recorder.stop();
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => recorderRef.current?.stop();

  const retake = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    blobRef.current = null;
    setElapsed(0);
    setPhase("idle");
  };

  const closeCamera = () => {
    stopStream();
    clearTimer();
    setPhase("idle");
  };

  const useThisVideo = async () => {
    if (!blobRef.current) return;
    const ext = mimeRef.current.includes("mp4") ? "mp4" : "webm";
    const file = new File([blobRef.current], `video-intro.${ext}`, { type: mimeRef.current });
    await onUpload(file);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    blobRef.current = null;
    setPhase("idle");
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!supportsRecording) return null;

  return (
    <div className="mt-2">
      {phase === "idle" && (
        <Button type="button" variant="outline" size="sm" onClick={openCamera}>
          <Video className="mr-1 h-3 w-3" /> Record Video
        </Button>
      )}
      {cameraError && <p className="mt-1 text-xs text-red-500">{cameraError}</p>}

      {(phase === "live" || phase === "recording") && (
        <div className="mt-2 space-y-2 rounded-md border bg-black/5 p-2">
          <video ref={videoRef} muted playsInline className="w-full rounded" />
          <div className="flex items-center justify-between">
            {phase === "recording" ? (
              <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
                REC {formatTime(elapsed)} / {formatTime(VIDEO_MAX_SECONDS)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Camera ready</span>
            )}
            <div className="flex gap-2">
              {phase === "live" && (
                <Button type="button" size="sm" onClick={startRecording}>
                  Start Recording
                </Button>
              )}
              {phase === "recording" && (
                <Button type="button" size="sm" variant="destructive" onClick={stopRecording}>
                  Stop
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" onClick={closeCamera}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {phase === "preview" && recordedUrl && (
        <div className="mt-2 space-y-2 rounded-md border p-2">
          <video src={recordedUrl} controls playsInline className="w-full rounded" />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={uploading} onClick={useThisVideo}>
              {uploading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Use This Video
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={retake}>
              Retake
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-red-500">{error}</p>;
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      <ErrorText error={error} />
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <Button variant="outline" className="flex-1" onClick={onBack}>
        Back
      </Button>
      <Button className="flex-1" disabled={nextDisabled} onClick={onNext}>
        Continue
      </Button>
    </div>
  );
}

function FlagGroup({
  title,
  options,
  values,
  onToggle,
  onSelectAll,
  onDeselectAll,
  error,
}: {
  title: string;
  options: string[];
  values: FlagMap;
  onToggle: (key: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  error?: string;
}) {
  const allSelected = options.length > 0 && options.every((opt) => Boolean(values[opt]));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        {allSelected
          ? onDeselectAll && (
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground hover:underline"
                onClick={onDeselectAll}
              >
                Deselect All
              </button>
            )
          : onSelectAll && (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={onSelectAll}
              >
                Select All
              </button>
            )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((opt) => (
          <div
            key={opt}
            className="flex cursor-pointer items-center gap-2"
            onClick={() => onToggle(opt)}
          >
            <Checkbox checked={Boolean(values[opt])} />
            <Label className="cursor-pointer text-xs font-normal">{opt}</Label>
          </div>
        ))}
      </div>
      <ErrorText error={error} />
    </div>
  );
}

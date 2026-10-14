import type { Metadata } from "next";
import { Afacad } from "next/font/google";
import SiteHeader from "../../_components/SiteHeader";
import Footer from "../../_components/Footer";

const afacad = Afacad({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
import {
  UserPlus,
  LayoutDashboard,
  Store,
  CheckCircle2,
  Wrench,
  Shield,
  FileText,
  CalendarClock,
  ShoppingCart,
  BookOpen,
  Users,
  Headphones,
  Clock,
  IndianRupee,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  ImageIcon,
  Mail,
  LogIn,
  BarChart3,
  Send,
  Upload,
  Search,
  Package,
  UserPlus2,
  BadgeCheck,
  MessageSquare,
  XCircle,
  Eye,
  AlertCircle,
  Wallet,
  TrendingUp,
  Building2,
  DollarSign,
  Calendar,
  Receipt,
  Coffee,
  Camera,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HeroSection } from "./_components/hero-section";
import { PhaseSection } from "./_components/phase-section";
import { MockupCard } from "./_components/mockup-card";
import { ScreenshotCarousel } from "./_components/screenshot-carousel";
import { SupportSection } from "./_components/support-section";

export const metadata: Metadata = {
  title: "Owner Guide - KNI Super App",
  description:
    "Complete 12-phase guide for restaurant owners to set up, manage, and scale their business with KNI Super App.",
};

/* ------------------------------------------------------------------ */
/*  Accent colors for each phase                                       */
/* ------------------------------------------------------------------ */
const COLORS = {
  blue: "#3b82f6",
  emerald: "#10b981",
  purple: "#8b5cf6",
  orange: "#f97316",
  pink: "#ec4899",
  cyan: "#06b6d4",
  amber: "#f59e0b",
  indigo: "#6366f1",
  rose: "#f43f5e",
  teal: "#14b8a6",
  violet: "#7c3aed",
  sky: "#0ea5e9",
};

/* ------------------------------------------------------------------ */
/*  Reusable tiny helpers (styled divs, NOT interactive)               */
/* ------------------------------------------------------------------ */
function FakeInput({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
        {value}
      </div>
    </div>
  );
}

function FakeSelect({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <span>{value}</span>
        <span className="text-muted-foreground text-xs">&#9662;</span>
      </div>
    </div>
  );
}

function FakeButton({
  children,
  color = "bg-primary",
  className = "",
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white ${color} ${className}`}
    >
      {children}
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className="flex justify-center text-muted-foreground">{icon}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */
export default function OwnerGuidePage() {
  return (
    <main className={`${afacad.className} min-h-screen bg-background`}>
      <SiteHeader />
      <HeroSection />

      {/* ── Phase 01: Registration ─────────────────────────────── */}
      <PhaseSection
        phaseNumber={1}
        title="Registration"
        description="Create your owner account in under 2 minutes. Enter your name, email, and password. Phone number is optional. After submitting, verify your email with a 6-digit OTP to activate your account."
        whatYouWillDo={[
          "Step 1: Fill in Name, Email, Phone (optional), Password & Confirm Password",
          "Step 2: Verify your email with a 6-digit OTP",
          "Step 3: Account activated — start using the app",
        ]}
        accentColor={COLORS.blue}
        ctaLabel="Go to Registration"
        ctaHref="/register-owner"
      >
        <ScreenshotCarousel
          screens={[
            {
              title: "Signup Form",
              children: (
                <MockupCard title="Create Account" headerColor={COLORS.blue}>
                  <div className="space-y-3">
                    <FakeInput label="Full Name" value="Rajesh Kumar" />
                    <FakeInput label="Email Address" value="rajesh@restaurant.com" />
                    <FakeInput label="Phone (optional)" value="+91 98765 43210" />
                    <FakeInput label="Password" value="••••••••••" />
                    <FakeInput label="Confirm Password" value="••••••••••" />
                    <FakeButton color="bg-blue-600">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </FakeButton>
                    <div className="text-center text-xs text-muted-foreground">
                      Already have an account? <span className="text-blue-600 font-medium">Sign in</span>
                    </div>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "OTP Verification",
              children: (
                <MockupCard title="Verify Email" headerColor={COLORS.blue}>
                  <div className="space-y-4 text-center">
                    <div className="flex justify-center">
                      <Mail className="h-10 w-10 text-blue-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      We sent a 6-digit code to<br />
                      <span className="font-medium text-foreground">rajesh@restaurant.com</span>
                    </p>
                    <div className="flex justify-center gap-2">
                      {["4", "8", "2", "7", "", ""].map((d, i) => (
                        <div
                          key={i}
                          className={`flex h-12 w-10 items-center justify-center rounded-md border-2 text-lg font-bold ${
                            d ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-muted"
                          }`}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                    <FakeButton color="bg-blue-600">Verify Email</FakeButton>
                    <div className="text-xs text-muted-foreground">
                      Resend code in <span className="font-medium">45s</span>
                    </div>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Success",
              children: (
                <MockupCard title="Welcome!" headerColor={COLORS.blue}>
                  <div className="space-y-4 text-center py-4">
                    <div className="flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">Account Created!</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Your owner account is ready. You&apos;ll be redirected to your dashboard automatically.
                      </p>
                    </div>
                    <FakeButton color="bg-blue-600">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Go to Dashboard
                    </FakeButton>
                  </div>
                </MockupCard>
              ),
            },
          ]}
        />
      </PhaseSection>

      {/* ── Phase 02: Login & Dashboard ────────────────────────── */}
      <PhaseSection
        phaseNumber={2}
        title="Login & Dashboard"
        description="Log in with your email and password to access your personalized owner dashboard. Get a bird's-eye view of your restaurants, bookings, equipment, AMC plans, and staff — all in one place."
        whatYouWillDo={[
          "Step 1: Enter your email and password to log in",
          "Step 2: Explore your personalized owner dashboard",
          "Step 3: Check live stats — bookings, equipment, staff",
        ]}
        accentColor={COLORS.emerald}
        ctaLabel="Go to Login"
        ctaHref="/login"
      >
        <ScreenshotCarousel
          screens={[
            {
              title: "Login Form",
              children: (
                <MockupCard title="Owner Login" headerColor={COLORS.emerald}>
                  <div className="space-y-3">
                    <FakeInput label="Email Address" value="rajesh@restaurant.com" />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-muted-foreground">Password</div>
                        <span className="text-xs text-emerald-600 font-medium">Forgot Password?</span>
                      </div>
                      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">••••••••••</div>
                    </div>
                    <FakeButton color="bg-emerald-600" className="w-full">
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </FakeButton>
                    <div className="text-center text-xs text-muted-foreground space-y-1">
                      <div>Restaurant Owner? <span className="text-emerald-600 font-medium">Register here</span></div>
                      <div>Vendor? <span className="text-emerald-600 font-medium">Register here</span></div>
                    </div>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Dashboard Overview",
              children: (
                <MockupCard title="Owner Dashboard" headerColor={COLORS.emerald}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <LayoutDashboard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">Spice Garden Restaurant</div>
                        <div className="text-xs text-muted-foreground">Owner Dashboard</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <StatBox label="Bookings" value="24" icon={<CalendarClock className="h-4 w-4" />} />
                      <StatBox label="Equipment" value="18" icon={<Wrench className="h-4 w-4" />} />
                      <StatBox label="AMC Status" value="Active" icon={<Shield className="h-4 w-4" />} />
                      <StatBox label="Staff" value="12" icon={<Users className="h-4 w-4" />} />
                    </div>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Stats Detail",
              children: (
                <MockupCard title="Quick Stats" headerColor={COLORS.emerald}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-emerald-500" />
                        <div>
                          <div className="text-sm font-medium">This Month</div>
                          <div className="text-xs text-muted-foreground">Revenue overview</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold flex items-center">
                          <IndianRupee className="h-4 w-4" />2,45,000
                        </div>
                        <div className="text-xs text-green-600">+12% vs last month</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border p-2 text-center">
                        <div className="text-xs text-muted-foreground">Services</div>
                        <div className="text-lg font-bold">8</div>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <div className="text-xs text-muted-foreground">Orders</div>
                        <div className="text-lg font-bold">15</div>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <div className="text-xs text-muted-foreground">Tickets</div>
                        <div className="text-lg font-bold">3</div>
                      </div>
                    </div>
                  </div>
                </MockupCard>
              ),
            },
          ]}
        />
      </PhaseSection>

      {/* ── Phase 03: Add Restaurant ───────────────────────────── */}
      <PhaseSection
        phaseNumber={3}
        title="Add Restaurant"
        description="Register your restaurant with complete details — name, address, state, city, and pincode. Upload your FSSAI license number and certificate (required). You can also add a restaurant photo. Multiple restaurants can be added under one account."
        whatYouWillDo={[
          "Step 1: Fill in restaurant name, address, state, city & pincode",
          "Step 2: Enter 14-digit FSSAI license number & upload certificate",
          "Step 3: Submit for admin approval",
        ]}
        accentColor={COLORS.purple}
        ctaLabel="Add Your Restaurant"
        ctaHref="/owner/restaurant/create"
      >
        <ScreenshotCarousel
          screens={[
            {
              title: "Basic Info",
              children: (
                <MockupCard title="Add Restaurant" headerColor={COLORS.purple}>
                  <div className="space-y-3">
                    <FakeInput label="Restaurant Name *" value="Spice Garden" />
                    <FakeInput label="Address *" value="42, MG Road, Koramangala" />
                    <FakeSelect label="State *" value="Karnataka" />
                    <FakeSelect label="City *" value="Bangalore" />
                    <FakeInput label="Pincode *" value="560034" />
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Restaurant Photo (optional)</div>
                      <div className="flex h-16 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 bg-muted/20">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <ImageIcon className="h-4 w-4" />
                          <span>Upload restaurant photo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "FSSAI Details",
              children: (
                <MockupCard title="FSSAI Details" headerColor={COLORS.purple}>
                  <div className="space-y-4">
                    <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-3 text-sm">
                      <div className="flex items-center gap-2 font-medium text-purple-700 dark:text-purple-300">
                        <FileText className="h-4 w-4" />
                        FSSAI License (Required)
                      </div>
                    </div>
                    <FakeInput label="FSSAI License Number *" value="10721028000123" />
                    <div className="text-xs text-muted-foreground">Enter your 14-digit FSSAI license number</div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">FSSAI Certificate *</div>
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-purple-100 dark:bg-purple-950/30">
                            <FileText className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">fssai-certificate.jpg</div>
                            <div className="text-xs text-muted-foreground">1.8 MB - Uploaded</div>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </div>
                      </div>
                    </div>
                    <FakeButton color="bg-purple-600" className="w-full">
                      <Send className="mr-2 h-4 w-4" />
                      Submit for Approval
                    </FakeButton>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Submitted",
              children: (
                <MockupCard title="Restaurant Submitted" headerColor={COLORS.purple}>
                  <div className="space-y-4 text-center py-4">
                    <div className="flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950/30">
                        <Store className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">Submitted for Approval!</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        &quot;Spice Garden&quot; has been submitted. You&apos;ll be notified once it&apos;s reviewed.
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3 text-left text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-medium">Spice Garden</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">City</span>
                        <span className="font-medium">Bangalore, Karnataka</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="warning">Pending</Badge>
                      </div>
                    </div>
                  </div>
                </MockupCard>
              ),
            },
          ]}
        />
      </PhaseSection>

      {/* ── Phase 04: Restaurant Approval ──────────────────────── */}
      <PhaseSection
        phaseNumber={4}
        title="Restaurant Approval"
        description="After submission, our admin team reviews your restaurant details and documents. Check your approval status on the dashboard — it will show Pending, Approved, or Rejected. If rejected, you'll see the reason."
        whatYouWillDo={[
          "Step 1: Check your restaurant approval status",
          "Step 2: If approved — start adding equipment",
          "Step 3: If rejected — see the reason and re-submit",
        ]}
        accentColor={COLORS.orange}
        ctaLabel="Check Approval Status"
        ctaHref="/owner/restaurant/status"
      >
        <ScreenshotCarousel
          screens={[
            {
              title: "Pending",
              children: (
                <MockupCard title="Restaurant Status" headerColor={COLORS.orange}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Store className="h-5 w-5 text-orange-500" />
                      <div className="flex-1">
                        <div className="font-semibold">Spice Garden</div>
                        <div className="text-xs text-muted-foreground">42, MG Road, Bangalore</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant="warning" className="gap-1">
                        <Clock className="h-3 w-3" />
                        PENDING
                      </Badge>
                    </div>
                    <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 p-3 text-sm flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                      <span className="text-orange-700 dark:text-orange-300">Your restaurant is being reviewed by our team. You&apos;ll be notified once it&apos;s approved.</span>
                    </div>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Approved",
              children: (
                <MockupCard title="Restaurant Status" headerColor={COLORS.orange}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Store className="h-5 w-5 text-orange-500" />
                      <div className="flex-1">
                        <div className="font-semibold">Spice Garden</div>
                        <div className="text-xs text-muted-foreground">42, MG Road, Bangalore</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        APPROVED
                      </Badge>
                    </div>
                    <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 text-sm flex items-start gap-2">
                      <BadgeCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-green-700 dark:text-green-300">Your restaurant has been approved. You can now book services.</span>
                    </div>
                    <FakeButton color="bg-orange-600">
                      <Wrench className="mr-2 h-4 w-4" />
                      Go to My Equipment
                    </FakeButton>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Rejected",
              children: (
                <MockupCard title="Restaurant Status" headerColor={COLORS.orange}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Store className="h-5 w-5 text-orange-500" />
                      <div className="flex-1">
                        <div className="font-semibold">Spice Garden</div>
                        <div className="text-xs text-muted-foreground">42, MG Road, Bangalore</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        REJECTED
                      </Badge>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-3 text-sm space-y-1">
                      <div className="font-medium text-red-700 dark:text-red-300 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Rejection Reason
                      </div>
                      <p className="text-red-600 dark:text-red-400 text-xs">FSSAI certificate is expired. Please upload a valid certificate and re-submit.</p>
                    </div>
                  </div>
                </MockupCard>
              ),
            },
          ]}
        />
      </PhaseSection>

      {/* ── Phase 05: Add Equipment ────────────────────────────── */}
      <PhaseSection
        phaseNumber={5}
        title="Add Equipment"
        description="List all your kitchen equipment via a quick modal dialog. Select the category and subcategory (equipment name is auto-derived), add brand, model, serial number, and upload product bill, warranty card, and equipment photos."
        whatYouWillDo={[
          "Step 1: Select category & subcategory, add brand, model & serial number",
          "Step 2: Upload product bill, warranty card & equipment photos",
          "Step 3: View and manage all equipment in your list",
        ]}
        accentColor={COLORS.pink}
        ctaLabel="Add Equipment"
        ctaHref="/owner/equipment"
      >
        <ScreenshotCarousel
          screens={[
            {
              title: "Equipment Form",
              children: (
                <MockupCard title="Add Equipment" headerColor={COLORS.pink}>
                  <div className="space-y-3">
                    <FakeSelect label="Category *" value="Cooking Equipment" />
                    <FakeSelect label="Subcategory" value="Commercial Oven" />
                    <div className="grid grid-cols-2 gap-3">
                      <FakeInput label="Brand" value="Voltas" />
                      <FakeInput label="Model" value="VOC-200X" />
                    </div>
                    <FakeInput label="Serial Number" value="ABC123456" />
                    <FakeInput label="Install Location" value="Main Kitchen" />
                    <div className="grid grid-cols-2 gap-3">
                      <FakeInput label="Purchase Date *" value="15 Jan 2024" />
                      <FakeInput label="Warranty End" value="15 Jan 2026" />
                    </div>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Uploads",
              children: (
                <MockupCard title="Upload Documents" headerColor={COLORS.pink}>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Product Bill Image</div>
                      <div className="rounded-lg border p-2.5 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-pink-100 dark:bg-pink-950/30">
                          <Receipt className="h-4 w-4 text-pink-600" />
                        </div>
                        <div className="flex-1 text-xs">
                          <div className="font-medium">bill-oven.jpg</div>
                          <div className="text-muted-foreground">1.2 MB</div>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Warranty Card Image</div>
                      <div className="rounded-lg border p-2.5 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-pink-100 dark:bg-pink-950/30">
                          <Shield className="h-4 w-4 text-pink-600" />
                        </div>
                        <div className="flex-1 text-xs">
                          <div className="font-medium">warranty-card.jpg</div>
                          <div className="text-muted-foreground">0.8 MB</div>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Equipment Photos (max 5)</div>
                      <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-pink-300 bg-pink-50/50 dark:bg-pink-950/10">
                        <div className="flex flex-col items-center text-muted-foreground">
                          <Upload className="h-6 w-6 text-pink-400" />
                          <span className="mt-1 text-xs">Drop images or click to browse</span>
                        </div>
                      </div>
                    </div>
                    <FakeButton color="bg-pink-600" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Equipment
                    </FakeButton>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Equipment List",
              children: (
                <MockupCard title="My Equipment" headerColor={COLORS.pink}>
                  <div className="space-y-3">
                    <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Search equipment...</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { name: "Commercial Oven", cat: "Cooking", brand: "Voltas", warranty: "Active" },
                        { name: "Walk-in Cooler", cat: "Refrigeration", brand: "Blue Star", warranty: "Expiring" },
                        { name: "Chimney Exhaust", cat: "Ventilation", brand: "Elica", warranty: "Expired" },
                      ].map((eq) => (
                        <div key={eq.name} className="flex items-center gap-3 rounded-lg border p-2.5">
                          <Wrench className="h-4 w-4 text-pink-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium">{eq.name}</div>
                            <div className="text-[10px] text-muted-foreground">{eq.cat} &middot; {eq.brand}</div>
                          </div>
                          <Badge
                            variant={eq.warranty === "Active" ? "success" : eq.warranty === "Expiring" ? "warning" : "destructive"}
                            className="text-[10px]"
                          >
                            {eq.warranty}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </MockupCard>
              ),
            },
          ]}
        />
      </PhaseSection>

      {/* ── Phase 06: Request AMC ──────────────────────────────── */}
      <PhaseSection
        phaseNumber={6}
        title="Request AMC"
        description="Request an Annual Maintenance Contract for your restaurant equipment. Select your restaurant, choose equipment categories, pick a plan type (Standard or Premium), set your visit frequency, and submit. Pricing comes in the proposal from our team."
        whatYouWillDo={[
          "Step 1: Select restaurant & equipment categories",
          "Step 2: Choose plan type (Standard / Premium)",
          "Step 3: Set kitchen type, visit frequency & preferred start date",
        ]}
        accentColor={COLORS.cyan}
        ctaLabel="Request AMC"
        ctaHref="/owner/amc-request"
      >
        <ScreenshotCarousel
          screens={[
            {
              title: "Select Plan",
              children: (
                <MockupCard title="AMC Plans" headerColor={COLORS.cyan}>
                  <div className="space-y-3">
                    {[
                      { name: "Standard", desc: "Preventive + free breakdown visits", color: "blue" },
                      { name: "Premium", desc: "Preventive + breakdown + priority + parts discount", color: "purple" },
                    ].map((plan) => (
                      <div
                        key={plan.name}
                        className={`rounded-lg border p-3 ${
                          plan.name === "Standard"
                            ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 ring-2 ring-cyan-500"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant={plan.name === "Standard" ? "default" : "secondary"} className="text-[10px]">
                            {plan.name}
                          </Badge>
                          {plan.name === "Standard" && (
                            <span className="text-[10px] font-bold text-cyan-600">SELECTED</span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{plan.desc}</div>
                      </div>
                    ))}
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "AMC Request Form",
              children: (
                <MockupCard title="Request AMC" headerColor={COLORS.cyan}>
                  <div className="space-y-3">
                    <FakeSelect label="Restaurant *" value="Spice Garden (Bangalore)" />
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Equipment Categories *</div>
                      <div className="flex flex-wrap gap-1.5">
                        {["Cooking", "Refrigeration", "Ventilation"].map((cat) => (
                          <span key={cat} className="inline-flex items-center gap-1 rounded-full bg-cyan-100 dark:bg-cyan-950/30 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">
                            <CheckCircle2 className="h-3 w-3" />{cat}
                          </span>
                        ))}
                      </div>
                    </div>
                    <FakeSelect label="Kitchen / Outlet Type *" value="Fine Dine" />
                    <FakeSelect label="Visit Frequency *" value="Monthly" />
                    <FakeInput label="Preferred Start Date *" value="01 Apr 2026" />
                    <FakeButton color="bg-cyan-600" className="w-full">
                      <Shield className="mr-2 h-4 w-4" />
                      Submit AMC Request
                    </FakeButton>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Request Submitted",
              children: (
                <MockupCard title="AMC Requests" headerColor={COLORS.cyan}>
                  <div className="space-y-3">
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">Spice Garden</div>
                          <div className="text-xs text-muted-foreground">Standard &middot; Monthly &middot; 3 categories</div>
                        </div>
                        <Badge variant="warning">Requested</Badge>
                      </div>
                    </div>
                    <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950/20 p-3 text-xs text-cyan-700 dark:text-cyan-300">
                      Our team will schedule a site survey and send you a detailed proposal with pricing.
                    </div>
                  </div>
                </MockupCard>
              ),
            },
          ]}
        />
      </PhaseSection>

      {/* ── Phase 07: AMC Proposal & Payment ───────────────────── */}
      <PhaseSection
        phaseNumber={7}
        title="AMC Proposal & Payment"
        description="After your AMC request, our team schedules a site survey, inspects your equipment, and sends a detailed proposal with pricing. Review the proposal — accept or reject it. Once accepted, pay via QR/UPI and upload the payment screenshot to activate your contract."
        whatYouWillDo={[
          "Step 1: Site survey is scheduled — engineer inspects your kitchen",
          "Step 2: Review proposal — accept or reject with a reason",
          "Step 3: Pay via QR/UPI & upload payment screenshot",
        ]}
        accentColor={COLORS.amber}
        ctaLabel="View AMC Requests"
        ctaHref="/owner/amc-requests"
      >
        <ScreenshotCarousel
          screens={[
            {
              title: "Proposal Review",
              children: (
                <MockupCard title="AMC Proposal" headerColor={COLORS.amber}>
                  <div className="space-y-3">
                    {/* Status bar */}
                    <div className="flex items-center gap-1 text-[10px]">
                      {["Requested", "Survey", "Proposal", "Payment", "Active"].map((s, i) => (
                        <div key={s} className="flex items-center gap-1">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold ${i <= 2 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>
                            {i + 1}
                          </div>
                          {i < 4 && <div className={`w-4 h-0.5 ${i < 2 ? "bg-amber-500" : "bg-muted"}`} />}
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Standard AMC Plan</span>
                        <Badge variant="warning">Proposal Sent</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded bg-amber-50 dark:bg-amber-950/20 p-2 text-center">
                          <div className="text-[10px] text-muted-foreground">Monthly</div>
                          <div className="text-sm font-bold"><IndianRupee className="inline h-3 w-3" />999</div>
                        </div>
                        <div className="rounded bg-amber-50 dark:bg-amber-950/20 p-2 text-center">
                          <div className="text-[10px] text-muted-foreground">Quarterly</div>
                          <div className="text-sm font-bold"><IndianRupee className="inline h-3 w-3" />2,799</div>
                        </div>
                        <div className="rounded bg-amber-50 dark:bg-amber-950/20 p-2 text-center">
                          <div className="text-[10px] text-muted-foreground">Annual</div>
                          <div className="text-sm font-bold"><IndianRupee className="inline h-3 w-3" />9,999</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between"><span>Preventive Visits</span><span className="font-medium text-foreground">8/year</span></div>
                        <div className="flex justify-between"><span>Free Breakdowns</span><span className="font-medium text-foreground">4/year</span></div>
                        <div className="flex justify-between"><span>Response SLA</span><span className="font-medium text-foreground">4 hours</span></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <FakeButton color="bg-green-600" className="flex-1">
                        <CheckCircle2 className="mr-1 h-3 w-3" />Accept
                      </FakeButton>
                      <FakeButton color="bg-red-600" className="flex-1">
                        <XCircle className="mr-1 h-3 w-3" />Reject
                      </FakeButton>
                    </div>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "QR/UPI Payment",
              children: (
                <MockupCard title="Upload Payment" headerColor={COLORS.amber}>
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                        <CheckCircle2 className="h-4 w-4" />
                        Proposal Accepted
                      </div>
                    </div>
                    {/* QR code placeholder */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-32 w-32 rounded-lg border-2 bg-muted/40 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <div className="text-2xl">📱</div>
                          <div className="text-[10px] mt-1">Scan QR Code</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground text-center">
                        <div>UPI ID: <span className="font-medium text-foreground">kni@upi</span></div>
                        <div className="mt-1 text-sm font-bold text-foreground"><IndianRupee className="inline h-3 w-3" />9,999</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Upload Payment Screenshot *</div>
                      <div className="flex h-16 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 bg-muted/20">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Upload className="h-4 w-4" />
                          <span>Upload screenshot</span>
                        </div>
                      </div>
                    </div>
                    <FakeButton color="bg-amber-600" className="w-full">Submit Payment Screenshot</FakeButton>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Contract Active",
              children: (
                <MockupCard title="AMC Contract" headerColor={COLORS.amber}>
                  <div className="space-y-4 text-center py-2">
                    <div className="flex justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
                        <Shield className="h-7 w-7 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">Contract Active!</div>
                      <div className="text-xs text-muted-foreground mt-1">AMC-2026-0042</div>
                    </div>
                    <div className="rounded-lg border p-3 text-left text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium">Standard</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span className="font-medium">Apr 2026 – Mar 2027</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Visits</span><span className="font-medium">3 / 8 completed</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Next Visit</span><span className="font-medium">15 Jul 2026</span></div>
                    </div>
                  </div>
                </MockupCard>
              ),
            },
          ]}
        />
      </PhaseSection>

      {/* ── Phase 08: Service Booking ──────────────────────────── */}
      <PhaseSection
        phaseNumber={8}
        title="Service Booking"
        description="Book on-demand service visits for your equipment. The flow starts from your equipment list — request a service, items go to your cart, then pick a date and time slot, and upload payment via QR/UPI to confirm."
        whatYouWillDo={[
          "Step 1: Request service from your equipment list → adds to cart",
          "Step 2: Review cart, pick preferred date & time slot",
          "Step 3: Upload payment screenshot via QR/UPI to confirm",
        ]}
        accentColor={COLORS.indigo}
        ctaLabel="My Bookings"
        ctaHref="/owner/bookings"
      >
        <ScreenshotCarousel
          screens={[
            {
              title: "Cart",
              children: (
                <MockupCard title="Your Cart" headerColor={COLORS.indigo}>
                  <div className="space-y-3">
                    <div className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <Wrench className="h-3.5 w-3.5 text-blue-500" />
                        <span>Cooking Equipment</span>
                        <span className="ml-auto text-muted-foreground">2 items</span>
                      </div>
                      <div className="space-y-1.5 pl-5">
                        <div className="flex items-center justify-between text-xs">
                          <span>Oven Repair Service</span>
                          <span className="font-medium text-blue-600"><IndianRupee className="inline h-3 w-3" />1,500</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3 text-green-500" />
                            <span>Heating Element (Part)</span>
                          </div>
                          <span className="font-medium text-green-600"><IndianRupee className="inline h-3 w-3" />800</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 text-sm">
                      <span className="font-medium text-indigo-700 dark:text-indigo-300">Grand Total</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300"><IndianRupee className="inline h-3 w-3" />2,300</span>
                    </div>
                    <FakeButton color="bg-indigo-600" className="w-full">Proceed to Booking</FakeButton>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Date & Time",
              children: (
                <MockupCard title="Book Service" headerColor={COLORS.indigo}>
                  <div className="space-y-4">
                    <FakeInput label="Preferred Date *" value="15 Mar 2026" />
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Preferred Time Slot *</div>
                      <div className="grid grid-cols-2 gap-2">
                        {["9:00–11:00 AM", "11:00–1:00 PM", "2:00–4:00 PM", "4:00–6:00 PM"].map((slot) => (
                          <div
                            key={slot}
                            className={`rounded-md border px-2 py-1.5 text-center text-xs ${
                              slot === "11:00–1:00 PM"
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 font-medium text-indigo-700 dark:text-indigo-300"
                                : ""
                            }`}
                          >
                            {slot}
                          </div>
                        ))}
                      </div>
                    </div>
                    <FakeButton color="bg-indigo-600" className="w-full">
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Create Booking
                    </FakeButton>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Payment Upload",
              children: (
                <MockupCard title="Upload Payment Proof" headerColor={COLORS.indigo}>
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-28 w-28 rounded-lg border-2 bg-muted/40 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <div className="text-2xl">📱</div>
                          <div className="text-[10px] mt-1">Scan QR</div>
                        </div>
                      </div>
                      <div className="text-xs text-center">
                        <div className="text-muted-foreground">Amount: <span className="font-bold text-foreground"><IndianRupee className="inline h-3 w-3" />2,300</span></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Payment Screenshot *</div>
                      <div className="flex h-16 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 bg-muted/20">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Upload className="h-4 w-4" />
                          <span>Upload screenshot</span>
                        </div>
                      </div>
                    </div>
                    <FakeButton color="bg-indigo-600" className="w-full">Submit Payment Proof & Place Order</FakeButton>
                  </div>
                </MockupCard>
              ),
            },
          ]}
        />
      </PhaseSection>

      {/* ── Phase 09: Marketplace ──────────────────────────────── */}
      <PhaseSection
        phaseNumber={9}
        title="Marketplace"
        description="Browse and purchase kitchen supplies, spare parts, and equipment from verified vendors. Add items to cart directly on the product card, then checkout via a dialog with your delivery address and notes. Orders are grouped by vendor."
        whatYouWillDo={[
          "Step 1: Browse products — search, filter by category",
          "Step 2: Add to cart with +/- quantity controls on product cards",
          "Step 3: Checkout with delivery address & place order",
        ]}
        accentColor={COLORS.rose}
        ctaLabel="Visit Marketplace"
        ctaHref="/owner/marketplace"
      >
        <ScreenshotCarousel
          screens={[
            {
              title: "Product Grid",
              children: (
                <MockupCard title="Marketplace" headerColor={COLORS.rose}>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-md border bg-muted/40 px-3 py-1.5 text-xs flex items-center gap-2">
                        <Search className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Search products...</span>
                      </div>
                      <div className="rounded-md border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">All Categories ▾</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name: "Gas Burner Valve", vendor: "Bharat Parts", price: "850", inCart: false },
                        { name: "SS Chimney Filter", vendor: "CleanAir", price: "1,200", inCart: true },
                      ].map((p) => (
                        <div key={p.name} className="rounded-lg border p-2">
                          <div className="flex h-12 items-center justify-center rounded bg-muted/50 text-muted-foreground">
                            <ShoppingCart className="h-4 w-4" />
                          </div>
                          <div className="mt-1.5 text-xs font-medium leading-tight">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Store className="h-2.5 w-2.5" />{p.vendor}</div>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-sm font-bold"><IndianRupee className="inline h-3 w-3" />{p.price}</span>
                            {p.inCart ? (
                              <div className="flex items-center gap-1 text-xs">
                                <span className="rounded border px-1.5 py-0.5">-</span>
                                <span className="font-medium">2</span>
                                <span className="rounded border px-1.5 py-0.5">+</span>
                              </div>
                            ) : (
                              <div className="rounded bg-rose-600 px-2 py-0.5 text-[10px] text-white font-medium">Add</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Checkout Dialog",
              children: (
                <MockupCard title="Place Order" headerColor={COLORS.rose}>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {[
                        { name: "SS Chimney Filter", qty: 2, total: "2,400" },
                        { name: "Thermostat Sensor", qty: 1, total: "650" },
                      ].map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <span>{item.name} <span className="text-muted-foreground">x{item.qty}</span></span>
                          <span className="font-medium"><IndianRupee className="inline h-3 w-3" />{item.total}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex items-center justify-between text-sm font-bold">
                        <span>Total</span>
                        <span><IndianRupee className="inline h-3 w-3" />3,050</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Delivery Address *</div>
                      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm min-h-[50px]">42, MG Road, Koramangala, Bangalore - 560034</div>
                    </div>
                    <FakeInput label="Delivery Notes" value="Gate no. 3, ask for Rajesh" />
                    <FakeButton color="bg-rose-600" className="w-full">Place Order</FakeButton>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Order Confirmed",
              children: (
                <MockupCard title="Order Placed" headerColor={COLORS.rose}>
                  <div className="space-y-4 text-center py-4">
                    <div className="flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">Order Confirmed!</div>
                      <p className="mt-1 text-sm text-muted-foreground">Your order has been placed successfully.</p>
                    </div>
                    <div className="rounded-lg border p-3 text-left text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span className="font-medium">3</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold"><IndianRupee className="inline h-3 w-3" />3,050</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Vendor</span><span className="font-medium">Bharat Parts Co.</span></div>
                    </div>
                  </div>
                </MockupCard>
              ),
            },
          ]}
        />
      </PhaseSection>

      {/* ── Phase 10: Khatabook ────────────────────────────────── */}
      <PhaseSection
        phaseNumber={10}
        title="Khatabook"
        description="Your complete digital finance manager — view total balance, vendor dues, pending salary, and net balance at a glance. Track transactions with 4 entry types (Cash In, Cash Out, Bank In, Bank Out), manage vendor ledgers, and access quick links to cashbook, staff salary, and spending reports."
        whatYouWillDo={[
          "Step 1: View 4 summary cards — Balance, Vendor Dues, Salary, Net",
          "Step 2: Add entries — Cash In, Cash Out, Bank In, Bank Out",
          "Step 3: Manage vendor ledger with purchases & payments",
        ]}
        accentColor={COLORS.teal}
        ctaLabel="Open Khatabook"
        ctaHref="/owner/khatabook"
      >
        <ScreenshotCarousel
          screens={[
            {
              title: "Dashboard",
              children: (
                <MockupCard title="Khatabook" headerColor={COLORS.teal}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border p-2.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground"><Wallet className="h-3.5 w-3.5" /><span className="text-[10px]">Total Balance</span></div>
                        <div className="mt-1 text-sm font-bold"><IndianRupee className="inline h-3 w-3" />2,27,700</div>
                        <div className="text-[10px] text-muted-foreground">Cash: 45.2K &middot; Bank: 1.82L</div>
                      </div>
                      <div className="rounded-lg border p-2.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground"><Store className="h-3.5 w-3.5" /><span className="text-[10px]">Vendor Dues</span></div>
                        <div className="mt-1 text-sm font-bold text-red-600"><IndianRupee className="inline h-3 w-3" />6,900</div>
                        <div className="text-[10px] text-muted-foreground">3 vendors</div>
                      </div>
                      <div className="rounded-lg border p-2.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-3.5 w-3.5" /><span className="text-[10px]">Pending Salary</span></div>
                        <div className="mt-1 text-sm font-bold text-orange-600"><IndianRupee className="inline h-3 w-3" />1,05,000</div>
                        <div className="text-[10px] text-muted-foreground">Paid: 85K</div>
                      </div>
                      <div className="rounded-lg border p-2.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /><span className="text-[10px]">Net Balance</span></div>
                        <div className="mt-1 text-sm font-bold text-green-600"><IndianRupee className="inline h-3 w-3" />1,15,800</div>
                        <div className="text-[10px] text-muted-foreground">Income - Expenses</div>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">Quick Actions</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: Wallet, label: "Cashbook" },
                        { icon: Store, label: "Vendor Ledger" },
                        { icon: Users, label: "Staff" },
                        { icon: Calendar, label: "Attendance" },
                        { icon: DollarSign, label: "Salary" },
                        { icon: Receipt, label: "Reports" },
                      ].map((a) => (
                        <div key={a.label} className="flex flex-col items-center gap-1 rounded-lg border p-2">
                          <a.icon className="h-4 w-4 text-teal-500" />
                          <span className="text-[10px]">{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Cashbook Entry",
              children: (
                <MockupCard title="Add Entry" headerColor={COLORS.teal}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: "Cash In", color: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300 border-green-500", active: true },
                        { label: "Cash Out", color: "", active: false },
                        { label: "Bank In", color: "", active: false },
                        { label: "Bank Out", color: "", active: false },
                      ].map((t) => (
                        <div key={t.label} className={`rounded-md border p-1.5 text-center text-[10px] font-medium ${t.active ? t.color : "text-muted-foreground"}`}>
                          {t.label}
                        </div>
                      ))}
                    </div>
                    <FakeInput label="Amount (INR) *" value="12,500" />
                    <FakeSelect label="Payment Mode" value="Cash" />
                    <FakeSelect label="Category" value="Daily Sales" />
                    <FakeInput label="Description *" value="Morning counter sales" />
                    <FakeInput label="Entry Date *" value="21 Feb 2026" />
                    <FakeButton color="bg-teal-600" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Entry
                    </FakeButton>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Vendor Ledger",
              children: (
                <MockupCard title="Vendor Ledger" headerColor={COLORS.teal}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border p-2 text-center">
                        <div className="text-[10px] text-muted-foreground">Total Due</div>
                        <div className="text-sm font-bold text-red-600"><IndianRupee className="inline h-3 w-3" />6,900</div>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <div className="text-[10px] text-muted-foreground">Total Advance</div>
                        <div className="text-sm font-bold text-green-600"><IndianRupee className="inline h-3 w-3" />0</div>
                      </div>
                    </div>
                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-muted/40 px-3 py-1.5 text-xs font-medium">Vendors</div>
                      <div className="divide-y text-xs">
                        {[
                          { name: "Bharat Parts Co.", balance: "4,500", type: "due" },
                          { name: "CleanAir Supplies", balance: "0", type: "settled" },
                          { name: "CoolTech India", balance: "2,400", type: "due" },
                        ].map((v) => (
                          <div key={v.name} className="flex items-center justify-between px-3 py-2">
                            <div>
                              <div className="font-medium">{v.name}</div>
                            </div>
                            <span className={`font-medium ${v.type === "due" ? "text-red-600" : "text-green-600"}`}>
                              {v.type === "settled" ? "Settled" : <><IndianRupee className="inline h-3 w-3" />{v.balance}</>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </MockupCard>
              ),
            },
          ]}
        />
      </PhaseSection>

      {/* ── Phase 11: Staff Management ─────────────────────────── */}
      <PhaseSection
        phaseNumber={11}
        title="Staff Management"
        description="Add and manage your restaurant staff. Enter name, phone, designation (free text), and select staff type — Full Time, Part Time, Contract, or Intern. Salary is set based on type. Track daily attendance with 6 statuses including check-in/check-out times."
        whatYouWillDo={[
          "Step 1: Add staff — name, phone, designation & staff type",
          "Step 2: Set salary based on type (monthly/daily/stipend)",
          "Step 3: Mark daily attendance — Present, Absent, Half Day, Leave, Weekly Off",
        ]}
        accentColor={COLORS.violet}
        ctaLabel="Manage Staff"
        ctaHref="/owner/staff"
      >
        <ScreenshotCarousel
          screens={[
            {
              title: "Add Staff",
              children: (
                <MockupCard title="Add Staff Member" headerColor={COLORS.violet}>
                  <div className="space-y-3">
                    <FakeInput label="Name *" value="Amit Sharma" />
                    <FakeInput label="Phone *" value="+91 87654 32109" />
                    <FakeInput label="Designation *" value="Head Chef" />
                    <FakeSelect label="Staff Type *" value="Full Time" />
                    <FakeInput label="Monthly Salary (INR) *" value="35,000" />
                    <FakeInput label="Joining Date *" value="01 Feb 2025" />
                    <FakeButton color="bg-violet-600" className="w-full">
                      <UserPlus2 className="mr-2 h-4 w-4" />
                      Add Staff Member
                    </FakeButton>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Staff List",
              children: (
                <MockupCard title="Staff Management" headerColor={COLORS.violet}>
                  <div className="space-y-3">
                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-muted/40 px-3 py-1.5 text-xs font-medium grid grid-cols-5 gap-1">
                        <span>Name</span>
                        <span>Designation</span>
                        <span>Type</span>
                        <span>Status</span>
                        <span className="text-right">Salary</span>
                      </div>
                      <div className="divide-y text-xs">
                        {[
                          { name: "Amit S.", desg: "Head Chef", type: "Full Time", status: "Active", salary: "35K/mo" },
                          { name: "Priya M.", desg: "Sous Chef", type: "Full Time", status: "Active", salary: "25K/mo" },
                          { name: "Ravi K.", desg: "Helper", type: "Part Time", status: "On Leave", salary: "800/day" },
                          { name: "Neha J.", desg: "Manager", type: "Full Time", status: "Active", salary: "30K/mo" },
                        ].map((s) => (
                          <div key={s.name} className="grid grid-cols-5 gap-1 px-3 py-2 items-center">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-muted-foreground">{s.desg}</span>
                            <Badge variant="secondary" className="text-[8px] px-1 py-0 w-fit">{s.type}</Badge>
                            <Badge
                              variant={s.status === "Active" ? "success" : "warning"}
                              className="text-[8px] px-1 py-0 w-fit"
                            >
                              {s.status}
                            </Badge>
                            <span className="text-right font-medium">{s.salary}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Attendance",
              children: (
                <MockupCard title="Staff Attendance" headerColor={COLORS.violet}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">21 Feb 2026</span>
                      <span className="text-xs text-muted-foreground">2 of 4 marked</span>
                    </div>
                    <div className="flex gap-2">
                      <FakeButton color="bg-green-600" className="flex-1 text-xs">
                        <CheckCircle2 className="mr-1 h-3 w-3" />Mark All Present
                      </FakeButton>
                      <FakeButton color="bg-violet-600/70" className="flex-1 text-xs">
                        <Coffee className="mr-1 h-3 w-3" />Mark All Weekly Off
                      </FakeButton>
                    </div>
                    <div className="space-y-2">
                      {[
                        { name: "Amit S.", status: "Present", time: "9:00 - 18:00" },
                        { name: "Priya M.", status: "Half Day", time: "9:00 - 13:00" },
                        { name: "Ravi K.", status: "", time: "" },
                        { name: "Neha J.", status: "", time: "" },
                      ].map((s) => (
                        <div key={s.name} className="flex items-center gap-2 rounded-lg border p-2">
                          <div className="flex-1">
                            <div className="text-xs font-medium">{s.name}</div>
                          </div>
                          {s.status ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">{s.time}</span>
                              <Badge
                                variant={s.status === "Present" ? "success" : "warning"}
                                className="text-[10px]"
                              >
                                {s.status}
                              </Badge>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="rounded border px-2 py-0.5 text-[10px] text-muted-foreground">Select status ▾</div>
                              <div className="rounded bg-violet-600 px-2 py-0.5 text-[10px] text-white">Mark</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </MockupCard>
              ),
            },
          ]}
        />
      </PhaseSection>

      {/* ── Phase 12: Support ──────────────────────────────────── */}
      <PhaseSection
        phaseNumber={12}
        title="Support"
        description="Raise support tickets for any issues — equipment problems, billing queries, service complaints. Track ticket status through Pending → Seen → On Work → Completed/Rejected. Chat with the support team directly inside the ticket thread."
        whatYouWillDo={[
          "Step 1: Create a ticket — title, category, equipment name, description & image",
          "Step 2: Track status — Pending, Seen, On Work, Completed, Rejected",
          "Step 3: Chat with support team in the ticket thread",
        ]}
        accentColor={COLORS.sky}
        ctaLabel="Raise a Ticket"
        ctaHref="/owner/support"
      >
        <ScreenshotCarousel
          screens={[
            {
              title: "New Ticket",
              children: (
                <MockupCard title="Create Ticket" headerColor={COLORS.sky}>
                  <div className="space-y-3">
                    <FakeInput label="Title *" value="Oven not heating properly" />
                    <FakeSelect label="Category" value="Equipment" />
                    <FakeInput label="Equipment Name" value="Commercial Oven - Voltas VOC-200X" />
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Description *</div>
                      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm min-h-[50px]">
                        The oven is not reaching set temperature. Started after power fluctuation yesterday.
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Attachment (optional)</div>
                      <div className="rounded-lg border p-2.5 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-sky-100 dark:bg-sky-950/30">
                          <Camera className="h-4 w-4 text-sky-600" />
                        </div>
                        <div className="flex-1 text-xs">
                          <div className="font-medium">oven-error.jpg</div>
                          <div className="text-muted-foreground">1.5 MB</div>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                    <FakeButton color="bg-sky-600" className="w-full">
                      <Send className="mr-2 h-4 w-4" />
                      Create Ticket
                    </FakeButton>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Ticket List",
              children: (
                <MockupCard title="Support Center" headerColor={COLORS.sky}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { label: "Pending", count: 1, icon: Clock },
                        { label: "Seen", count: 0, icon: Eye },
                        { label: "On Work", count: 1, icon: AlertCircle },
                        { label: "Completed", count: 3, icon: CheckCircle2 },
                        { label: "Rejected", count: 0, icon: XCircle },
                      ].map((s) => (
                        <div key={s.label} className="rounded-lg border p-1.5 text-center">
                          <s.icon className="h-3 w-3 mx-auto text-sky-500" />
                          <div className="text-sm font-bold">{s.count}</div>
                          <div className="text-[8px] text-muted-foreground">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {[
                        { id: "#a1b2c3d4", title: "Oven not heating properly", status: "Pending", badge: "warning" as const },
                        { id: "#e5f6g7h8", title: "AMC visit rescheduling", status: "On Work", badge: "default" as const },
                        { id: "#i9j0k1l2", title: "New equipment installation", status: "Completed", badge: "success" as const },
                      ].map((ticket) => (
                        <div key={ticket.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                          <Headphones className="h-4 w-4 text-sky-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{ticket.title}</div>
                            <div className="text-[10px] text-muted-foreground">{ticket.id}</div>
                          </div>
                          <Badge variant={ticket.badge} className="shrink-0 text-[10px]">
                            {ticket.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </MockupCard>
              ),
            },
            {
              title: "Ticket Thread",
              children: (
                <MockupCard title="Ticket Detail" headerColor={COLORS.sky}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">#a1b2c3d4</span>
                      <Badge variant="default" className="text-[10px]">On Work</Badge>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-2 text-xs">
                      <div className="font-medium">Oven not heating properly</div>
                      <div className="text-muted-foreground mt-0.5">Equipment &middot; Commercial Oven</div>
                    </div>
                    {/* Thread messages */}
                    <div className="space-y-2 max-h-[140px]">
                      <div className="ml-6 rounded-lg bg-primary/10 p-2 text-xs">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="font-medium">Admin</span>
                          <Badge variant="secondary" className="text-[8px] px-1 py-0">Support</Badge>
                        </div>
                        <p className="text-muted-foreground">We&apos;ve assigned a technician. He will visit tomorrow between 11 AM - 1 PM.</p>
                      </div>
                      <div className="mr-6 rounded-lg bg-muted/40 p-2 text-xs">
                        <div className="font-medium mb-0.5">Rajesh Kumar</div>
                        <p className="text-muted-foreground">Thanks! Please ask him to call before coming.</p>
                      </div>
                    </div>
                    {/* Reply input */}
                    <div className="flex items-center gap-2 rounded-lg border p-2">
                      <div className="flex-1 text-xs text-muted-foreground">Type your message...</div>
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      <Send className="h-4 w-4 text-sky-500" />
                    </div>
                  </div>
                </MockupCard>
              ),
            },
          ]}
        />
      </PhaseSection>

      <SupportSection />
      <Footer />
    </main>
  );
}
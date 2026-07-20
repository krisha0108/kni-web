import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register-owner", "/register-vendor", "/forgot-password", "/verify-email", "/", "/guide", "/launchpad", "/apply", "/pay", "/privacy-policy", "/terms", "/refund-policy", "/cancellation-policy", "/blog", "/team/accept", "/inquiry"];
const API_ROUTES = ["/api"];

const ROLE_ROUTES = {
  ADMIN: "/admin",
  OWNER: "/owner",
  VENDOR: "/vendor",
  ENGINEER: "/engineer",
};

// Vendor pages that unapproved vendors can access
const VENDOR_ALLOWED_UNAPPROVED = ["/vendor/pending"];
// Vendor pages that blocked/expired vendors can access
const VENDOR_ALLOWED_BLOCKED = ["/vendor/pending", "/vendor/subscription"];

// --- Rate Limiting (in-memory, Edge Runtime compatible) ---
const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/auth/login": { max: 10, windowMs: 60_000 },
  "/api/auth/register": { max: 5, windowMs: 60_000 },
  "/api/auth/send-otp": { max: 5, windowMs: 60_000 },
  "/api/auth/verify-otp": { max: 5, windowMs: 60_000 },
  "/api/auth/send-email-code": { max: 5, windowMs: 60_000 },
  "/api/public/candidate-verify-email": { max: 5, windowMs: 60_000 },
  "/api/support/tickets": { max: 10, windowMs: 60_000 },
  "/api/public/contact": { max: 5, windowMs: 60_000 },
  "/api/public/candidate-registration": { max: 5, windowMs: 60_000 },
};
// Catch-all for upload endpoints
const UPLOAD_RATE_LIMIT = { max: 20, windowMs: 60_000 };

// Map<"ip:path", { count, resetAt }>
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, pathname: string): boolean {
  // Find matching rate limit config
  let config = RATE_LIMITS[pathname];
  if (!config && pathname.includes("/upload")) {
    config = UPLOAD_RATE_LIMIT;
  }
  if (!config) return true; // No rate limit for this path

  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }

  entry.count++;
  if (entry.count > config.max) {
    return false;
  }
  return true;
}

// Lazy cleanup: prune expired entries when store gets large
function pruneIfNeeded() {
  if (rateLimitStore.size < 5000) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit POST requests to sensitive API endpoints
  if (request.method === "POST" && pathname.startsWith("/api")) {
    pruneIfNeeded();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip, pathname)) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
  }

  // Allow API routes to handle their own auth
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("kni_session")?.value;

  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // If user is not logged in
  if (!sessionToken) {
    if (isPublicRoute) {
      return NextResponse.next();
    }
    // Redirect to login for protected routes
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // User is logged in
  // If trying to access public auth routes, let them through
  // The page components will handle redirect based on session
  if (isPublicRoute && pathname !== "/") {
    return NextResponse.next();
  }

  // Pass pathname to layout via header for vendor approval checks
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register-owner", "/register-vendor", "/"];
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

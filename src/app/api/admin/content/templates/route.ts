import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/rbac";

/**
 * GET /api/admin/content/templates
 * Get predefined content templates
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // offer, feed, guide, sponsored

    const templates = {
      offer: [
        {
          id: "welcome-offer",
          name: "Welcome Offer",
          description: "Discount for a restaurant's first booking",
          data: {
            name: "Welcome Offer",
            type: "FIRST_BOOKING",
            discountPercent: 15,
            description: "Get 15% off your first service booking",
            imageUrl: "https://placehold.co/800x400/EF3A3A/white?text=Welcome+Offer",
            sortOrder: 0,
          },
        },
        {
          id: "diwali-sale",
          name: "Diwali Mega Sale",
          description: "Time-limited festive promotion",
          data: {
            name: "Diwali Mega Sale",
            type: "PROMOTIONAL",
            discountPercent: 20,
            description: "Flat 20% off on all service bookings this Diwali",
            imageUrl: "https://placehold.co/800x400/1D2254/white?text=Diwali+Sale",
            sortOrder: 1,
          },
        },
        {
          id: "amc-savings",
          name: "AMC Savings",
          description: "Promote annual maintenance contract savings",
          data: {
            name: "Save with AMC Plans",
            type: "PROMOTIONAL",
            discountPercent: 20,
            description: "Get up to 20% savings with our Annual Maintenance Contracts",
            imageUrl: "https://placehold.co/800x400/10b981/white?text=AMC+Savings",
            sortOrder: 2,
          },
        },
        {
          id: "seasonal-offer",
          name: "Seasonal Offer",
          description: "Template for seasonal promotions",
          data: {
            name: "Seasonal Special",
            type: "PROMOTIONAL",
            discountPercent: 10,
            description: "Limited time discount on all services",
            imageUrl: "https://placehold.co/800x400/f59e0b/white?text=Seasonal+Offer",
            sortOrder: 3,
          },
        },
      ],
      feed: [
        {
          id: "new-feature",
          name: "New Feature Announcement",
          description: "Announce new features",
          data: {
            text: "New feature available! Check out our latest update.",
            tone: "INFO",
            icon: "information-circle-outline",
            isActive: true,
          },
        },
        {
          id: "maintenance-reminder",
          name: "Maintenance Reminder",
          description: "Remind users about maintenance",
          data: {
            text: "Schedule your equipment maintenance before peak season!",
            tone: "WARN",
            icon: "alert-circle-outline",
            isActive: true,
          },
        },
        {
          id: "success-story",
          name: "Success Story",
          description: "Share positive news",
          data: {
            text: "500+ restaurants trust us for their equipment service needs!",
            tone: "OK",
            icon: "shield-checkmark-outline",
            isActive: true,
          },
        },
        {
          id: "urgent-notice",
          name: "Urgent Notice",
          description: "Important announcements",
          data: {
            text: "Important: Service update scheduled for this weekend",
            tone: "DANGER",
            icon: "alert-outline",
            isActive: true,
          },
        },
      ],
      guide: [
        {
          id: "booking-guide",
          name: "Booking Guide",
          description: "How to book a service",
          data: {
            title: "How to Book a Service Request",
            description: "Step-by-step guide to booking equipment service",
            thumbUrl: "https://placehold.co/400x300/3b82f6/white?text=Booking+Guide",
            linkUrl: "https://www.youtube.com/watch?v=example",
            minutes: 3,
            isActive: true,
            sortOrder: 1,
          },
        },
        {
          id: "amc-guide",
          name: "AMC Guide",
          description: "Understanding AMC plans",
          data: {
            title: "Understanding AMC Plans",
            description: "Learn about our Annual Maintenance Contracts and how to save",
            thumbUrl: "https://placehold.co/400x300/10b981/white?text=AMC+Guide",
            linkUrl: "https://www.youtube.com/watch?v=example",
            minutes: 5,
            isActive: true,
            sortOrder: 2,
          },
        },
        {
          id: "equipment-guide",
          name: "Equipment Management",
          description: "Managing equipment inventory",
          data: {
            title: "Managing Your Equipment Inventory",
            description: "How to add, track, and manage your restaurant equipment",
            thumbUrl: "https://placehold.co/400x300/f59e0b/white?text=Equipment+Guide",
            linkUrl: "https://www.youtube.com/watch?v=example",
            minutes: 4,
            isActive: true,
            sortOrder: 3,
          },
        },
        {
          id: "marketplace-guide",
          name: "Marketplace Guide",
          description: "Using the marketplace",
          data: {
            title: "Marketplace Ordering Guide",
            description: "How to order products from our marketplace",
            thumbUrl: "https://placehold.co/400x300/8b5cf6/white?text=Marketplace+Guide",
            linkUrl: "https://www.youtube.com/watch?v=example",
            minutes: 6,
            isActive: true,
            sortOrder: 4,
          },
        },
      ],
      sponsored: [
        {
          id: "vendor-promo",
          name: "Vendor Promotion",
          description: "Promote a vendor",
          data: {
            type: "VENDOR",
            title: "Premium Kitchen Equipment",
            description: "Special discount on commercial kitchen equipment",
            sponsoredBy: "Partner Vendor",
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            isActive: false,
          },
        },
        {
          id: "product-launch",
          name: "Product Launch",
          description: "Launch a new product",
          data: {
            type: "PRODUCT",
            title: "New Product Launch",
            description: "Introducing our latest equipment solution",
            sponsoredBy: "KNI Services",
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            isActive: false,
          },
        },
        {
          id: "service-promo",
          name: "Service Promotion",
          description: "Promote a service",
          data: {
            type: "SERVICE",
            title: "AMC Special Offer",
            description: "First month free on annual contracts",
            sponsoredBy: "KNI Services",
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            isActive: false,
          },
        },
        {
          id: "general-ad",
          name: "General Advertisement",
          description: "General promotional content",
          data: {
            type: "GENERAL",
            title: "Special Promotion",
            description: "Limited time offer - Don't miss out!",
            sponsoredBy: "Marketing Team",
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            isActive: false,
          },
        },
      ],
    };

    if (type && type in templates) {
      return NextResponse.json({
        ok: true,
        data: templates[type as keyof typeof templates],
      });
    }

    return NextResponse.json({
      ok: true,
      data: templates,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

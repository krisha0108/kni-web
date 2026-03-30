import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";
import bcrypt from "bcrypt";
import {
  createNotification,
  createNotificationForRole,
} from "@/server/notifications/service";
import { sendSMS } from "@/server/sms/service";

// --- Zod Schema ---
const directBookingSchema = z
  .object({
    // Owner: existing or new
    ownerId: z.string().optional(),
    newOwner: z
      .object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        phone: z.string().min(10, "Phone must be at least 10 digits"),
      })
      .optional(),

    // Restaurant: existing or new
    restaurantId: z.string().optional(),
    newRestaurant: z
      .object({
        name: z.string().min(2, "Restaurant name must be at least 2 characters"),
        phone: z.string().optional(),
        city: z.string().min(2, "City is required"),
        address: z.string().min(5, "Address must be at least 5 characters"),
      })
      .optional(),

    // Equipment: existing, new, or skipped (null/undefined)
    equipmentId: z.string().optional(),
    newEquipment: z
      .object({
        name: z.string().min(2, "Equipment name is required"),
        categoryId: z.string().min(1, "Category is required"),
        subCategoryId: z.string().optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
      })
      .optional(),

    // Items (at least 1)
    items: z
      .array(
        z.object({
          type: z.enum(["SERVICE", "PART"]),
          serviceItemId: z.string().optional(),
          partItemId: z.string().optional(),
          qty: z.number().int().positive("Quantity must be positive"),
        })
      )
      .min(1, "At least one service or part item is required"),

    // Schedule
    slotStartDateTime: z.string().min(1, "Start date/time is required"),
    slotEndDateTime: z.string().min(1, "End date/time is required"),

    // Optional details
    problemDescription: z.string().optional(),
    adminNotes: z.string().optional(),
  })
  .refine((data) => data.ownerId || data.newOwner, {
    message: "Either ownerId or newOwner must be provided",
    path: ["ownerId"],
  })
  .refine((data) => !(data.ownerId && data.newOwner), {
    message: "Provide either ownerId or newOwner, not both",
    path: ["ownerId"],
  })
  .refine((data) => data.restaurantId || data.newRestaurant, {
    message: "Either restaurantId or newRestaurant must be provided",
    path: ["restaurantId"],
  })
  .refine((data) => !(data.restaurantId && data.newRestaurant), {
    message: "Provide either restaurantId or newRestaurant, not both",
    path: ["restaurantId"],
  });

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await req.json();
    const validation = directBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Validate each item has correct ID for its type
    for (const item of data.items) {
      if (item.type === "SERVICE" && !item.serviceItemId) {
        return NextResponse.json(
          { ok: false, error: "serviceItemId is required for SERVICE items" },
          { status: 400 }
        );
      }
      if (item.type === "PART" && !item.partItemId) {
        return NextResponse.json(
          { ok: false, error: "partItemId is required for PART items" },
          { status: 400 }
        );
      }
    }

    // Pre-transaction: check for duplicate email/phone if creating new owner
    if (data.newOwner) {
      const existingByEmail = await db.user.findUnique({
        where: { email: data.newOwner.email },
      });
      if (existingByEmail) {
        return NextResponse.json(
          { ok: false, error: "A user with this email already exists" },
          { status: 409 }
        );
      }

      if (data.newOwner.phone) {
        const existingByPhone = await db.user.findFirst({
          where: { phone: data.newOwner.phone, deletedAt: null },
        });
        if (existingByPhone) {
          return NextResponse.json(
            { ok: false, error: "A user with this phone number already exists" },
            { status: 409 }
          );
        }
      }
    }

    // --- Transaction ---
    let isNewOwner = false;
    let autoPassword = "";
    let ownerPhone: string | null = null;
    let ownerName = "";

    const result = await db.$transaction(async (tx) => {
      // Step 1: Resolve Owner
      let ownerId: string;

      if (data.ownerId) {
        const owner = await tx.user.findFirst({
          where: { id: data.ownerId, role: "OWNER", deletedAt: null },
        });
        if (!owner) {
          throw new Error("Owner not found");
        }
        ownerId = owner.id;
        ownerPhone = owner.phone;
        ownerName = owner.name;
      } else {
        // Create new owner with auto-generated password
        isNewOwner = true;
        const phone = data.newOwner!.phone;
        autoPassword = `KNI@${phone.slice(-4)}${Date.now().toString().slice(-4)}`;
        const passwordHash = await bcrypt.hash(autoPassword, 10);

        const owner = await tx.user.create({
          data: {
            name: data.newOwner!.name,
            email: data.newOwner!.email,
            phone: phone,
            passwordHash,
            role: "OWNER",
            isActive: true,
            emailVerified: true,
            ownerProfile: { create: {} },
          },
        });
        ownerId = owner.id;
        ownerPhone = owner.phone;
        ownerName = owner.name;
      }

      // Step 2: Resolve Restaurant
      let restaurantId: string;

      if (data.restaurantId) {
        const restaurant = await tx.restaurant.findFirst({
          where: { id: data.restaurantId, ownerId },
        });
        if (!restaurant) {
          throw new Error("Restaurant not found or does not belong to this owner");
        }
        restaurantId = restaurant.id;
      } else {
        const restaurant = await tx.restaurant.create({
          data: {
            ownerId,
            name: data.newRestaurant!.name,
            address: data.newRestaurant!.address,
            city: data.newRestaurant!.city,
            status: "APPROVED",
          },
        });
        restaurantId = restaurant.id;
      }

      // Step 3: Resolve Equipment (optional)
      let equipmentId: string | null = null;

      if (data.equipmentId) {
        const equipment = await tx.equipment.findFirst({
          where: { id: data.equipmentId, restaurantId },
        });
        if (!equipment) {
          throw new Error("Equipment not found in this restaurant");
        }
        equipmentId = equipment.id;
      } else if (data.newEquipment) {
        // Verify category exists
        const category = await tx.category.findUnique({
          where: { id: data.newEquipment.categoryId },
        });
        if (!category) {
          throw new Error("Category not found");
        }

        const equipment = await tx.equipment.create({
          data: {
            ownerId,
            restaurantId,
            name: data.newEquipment.name,
            categoryId: data.newEquipment.categoryId,
            subCategoryId: data.newEquipment.subCategoryId || null,
            brand: data.newEquipment.brand || null,
            model: data.newEquipment.model || null,
            purchaseDate: new Date(),
            status: "AVAILABLE",
          },
        });
        equipmentId = equipment.id;
      }

      // Step 4: Fetch price snapshots and build items
      let itemTotal = 0;
      const bookingItems: {
        itemType: "SERVICE" | "PART";
        serviceItemId: string | null;
        partItemId: string | null;
        qty: number;
        priceSnapshot: number;
      }[] = [];

      for (const item of data.items) {
        let priceSnapshot: number;

        if (item.type === "SERVICE") {
          const serviceItem = await tx.serviceItem.findUnique({
            where: { id: item.serviceItemId! },
          });
          if (!serviceItem || !serviceItem.isActive) {
            throw new Error(`Service item not found or inactive: ${item.serviceItemId}`);
          }
          priceSnapshot = serviceItem.price;
        } else {
          const partItem = await tx.partItem.findUnique({
            where: { id: item.partItemId! },
          });
          if (!partItem || !partItem.isActive) {
            throw new Error(`Part item not found or inactive: ${item.partItemId}`);
          }
          priceSnapshot = partItem.price;
        }

        itemTotal += priceSnapshot * item.qty;
        bookingItems.push({
          itemType: item.type as "SERVICE" | "PART",
          serviceItemId: item.type === "SERVICE" ? item.serviceItemId! : null,
          partItemId: item.type === "PART" ? item.partItemId! : null,
          qty: item.qty,
          priceSnapshot,
        });
      }

      const gstAmount = Math.round(itemTotal * 0.18);
      const totalAmount = itemTotal + gstAmount;

      // Step 5: Create ServiceBooking
      const booking = await tx.serviceBooking.create({
        data: {
          ownerId,
          restaurantId,
          equipmentId,
          slotStartDateTime: new Date(data.slotStartDateTime),
          slotEndDateTime: new Date(data.slotEndDateTime),
          status: "PAYMENT_VERIFIED",
          totalAmount,
          gstAmount,
          tipAmount: 0,
          problemDescription: data.problemDescription || null,
          isDirectBooking: true,
          createdByAdminId: session.id,
          adminNotes: data.adminNotes || null,
          items: {
            create: bookingItems.map((item) => ({
              itemType: item.itemType,
              serviceItemId: item.serviceItemId,
              partItemId: item.partItemId,
              qty: item.qty,
              priceSnapshot: item.priceSnapshot,
            })),
          },
        },
      });

      // Step 6: Create PaymentProof (required for booking detail page to work)
      await tx.paymentProof.create({
        data: {
          bookingId: booking.id,
          ownerId,
          screenshotUrl: "direct-booking",
          status: "VERIFIED",
          adminNote: "Direct booking by admin - no payment proof required",
          verifiedAt: new Date(),
        },
      });

      return {
        bookingId: booking.id,
        ownerId,
        restaurantId,
        equipmentId,
        totalAmount,
        gstAmount,
        itemTotal,
      };
    });

    // --- Post-transaction notifications (non-blocking) ---

    // Notify admins for engineer assignment
    createNotificationForRole(
      "ADMIN",
      "Direct Booking Created - Assign Engineer",
      `Direct booking created for ${ownerName}. Amount: ₹${result.totalAmount}. Please assign an engineer.`,
      "BOOKING",
      `/admin/bookings/${result.bookingId}`
    ).catch(console.error);

    // Notify owner
    createNotification({
      userId: result.ownerId,
      title: "Service Booking Created",
      message: `A service booking has been created for you. Amount: ₹${result.totalAmount}. Our engineer will contact you soon.`,
      type: "BOOKING",
      linkUrl: `/owner/bookings`,
      data: { type: "booking", bookingId: result.bookingId },
    }).catch(console.error);

    // SMS to owner
    if (ownerPhone) {
      if (isNewOwner) {
        // Send credentials + booking confirmation
        sendSMS({
          phone: ownerPhone,
          message: `KNI: Your account has been created. Login: ${data.newOwner!.email} / ${autoPassword}. A service booking (₹${result.totalAmount}) has been created. Our engineer will contact you soon.`,
          purpose: "DIRECT_BOOKING_NEW_OWNER",
        }).catch(console.error);
      } else {
        // Send booking confirmation only
        sendSMS({
          phone: ownerPhone,
          message: `KNI: A service booking (₹${result.totalAmount}) has been created for you. Our engineer will contact you soon.`,
          purpose: "DIRECT_BOOKING_CONFIRMATION",
        }).catch(console.error);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          bookingId: result.bookingId,
          ownerId: result.ownerId,
          restaurantId: result.restaurantId,
          totalAmount: result.totalAmount,
          gstAmount: result.gstAmount,
          isNewOwner,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Direct booking error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      {
        status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500,
      }
    );
  }
}

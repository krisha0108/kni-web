import { PrismaClient, Role, RestaurantStatus, VendorApprovalStatus, VendorSubscriptionStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Clear existing data in development (in reverse dependency order)
  try {
    // Phase 5: Firebase Push Notifications
    await prisma.pushNotificationLog.deleteMany();
    await prisma.deviceToken.deleteMany();
    await prisma.notificationPreference.deleteMany();

    // Phase 4: Expense Tracking
    await prisma.expense.deleteMany();

    // Phase 3: Warehouse Management
    await prisma.stockMovement.deleteMany();
    await prisma.warehouseInventory.deleteMany();

    // Phase 2: AMC Module
    await prisma.aMCServiceUse.deleteMany();
    await prisma.aMCSubscription.deleteMany();
    await prisma.aMCPlan.deleteMany();

    // Phase 1: Equipment Management
    await prisma.equipment.deleteMany();

    // Existing tables
    await prisma.auditLog.deleteMany();
    await prisma.payout.deleteMany();
    await prisma.marketplaceOrderItem.deleteMany();
    await prisma.marketplaceOrder.deleteMany();
    await prisma.vendorProduct.deleteMany();
    await prisma.engineerWorkLog.deleteMany();
    await prisma.engineerAssignment.deleteMany();
    await prisma.paymentProof.deleteMany();
    await prisma.serviceBookingItem.deleteMany();
    await prisma.serviceBooking.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.categoryRequest.deleteMany();
    await prisma.restaurantCategory.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.partItem.deleteMany();
    await prisma.serviceItem.deleteMany();
    await prisma.subCategory.deleteMany();
    await prisma.category.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.paymentSettings.deleteMany();
    await prisma.engineerProfile.deleteMany();
    await prisma.vendorProfile.deleteMany();
    await prisma.ownerProfile.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.warn("Error during cleanup (this is expected on first migration):", error);
  }

  console.log("Cleared existing data");

  // Hash passwords
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const ownerPassword = await bcrypt.hash("Owner@123", 10);
  const engineerPassword = await bcrypt.hash("Eng@123", 10);
  const vendorPassword = await bcrypt.hash("Vendor@123", 10);

  // Create Admin user
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@kni.com",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log("Created admin:", admin.email);

  // Create Owner user with profile
  const owner = await prisma.user.create({
    data: {
      name: "Owner User",
      email: "owner@kni.com",
      phone: "+91-9876543210",
      passwordHash: ownerPassword,
      role: Role.OWNER,
      isActive: true,
      ownerProfile: {
        create: {},
      },
    },
  });
  console.log("Created owner:", owner.email);

  // Create Engineer user with profile
  const engineer = await prisma.user.create({
    data: {
      name: "Engineer User",
      email: "eng@kni.com",
      phone: "+91-9876543211",
      passwordHash: engineerPassword,
      role: Role.ENGINEER,
      isActive: true,
      engineerProfile: {
        create: {
          city: "Mumbai",
          skills: "Kitchen Equipment, Refrigeration, HVAC",
        },
      },
    },
  });
  console.log("Created engineer:", engineer.email);

  // Create Vendor user with profile (pending approval)
  const vendor = await prisma.user.create({
    data: {
      name: "Vendor User",
      email: "vendor@kni.com",
      phone: "+91-9876543212",
      passwordHash: vendorPassword,
      role: Role.VENDOR,
      isActive: true,
      vendorProfile: {
        create: {
          approvalStatus: VendorApprovalStatus.PENDING,
        },
      },
    },
  });
  console.log("Created vendor:", vendor.email);

  // Create another approved vendor for marketplace demo
  const approvedVendor = await prisma.user.create({
    data: {
      name: "Approved Vendor",
      email: "approved-vendor@kni.com",
      passwordHash: vendorPassword,
      role: Role.VENDOR,
      isActive: true,
      vendorProfile: {
        create: {
          approvalStatus: VendorApprovalStatus.APPROVED,
          subscriptionStatus: VendorSubscriptionStatus.ACTIVE,
          activeUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      },
    },
  });
  console.log("Created approved vendor:", approvedVendor.email);

  // Create Categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Kitchen Equipment",
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        name: "Refrigeration",
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        name: "HVAC",
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        name: "Plumbing",
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        name: "Electrical",
        isActive: true,
      },
    }),
  ]);
  console.log("Created categories:", categories.length);

  // Create SubCategories
  const subCategories = await Promise.all([
    // Kitchen Equipment subcategories
    prisma.subCategory.create({
      data: {
        name: "Ovens",
        categoryId: categories[0].id,
        isActive: true,
      },
    }),
    prisma.subCategory.create({
      data: {
        name: "Grills",
        categoryId: categories[0].id,
        isActive: true,
      },
    }),
    prisma.subCategory.create({
      data: {
        name: "Fryers",
        categoryId: categories[0].id,
        isActive: true,
      },
    }),
    // Refrigeration subcategories
    prisma.subCategory.create({
      data: {
        name: "Walk-in Coolers",
        categoryId: categories[1].id,
        isActive: true,
      },
    }),
    prisma.subCategory.create({
      data: {
        name: "Freezers",
        categoryId: categories[1].id,
        isActive: true,
      },
    }),
    // HVAC subcategories
    prisma.subCategory.create({
      data: {
        name: "Air Conditioning",
        categoryId: categories[2].id,
        isActive: true,
      },
    }),
    prisma.subCategory.create({
      data: {
        name: "Ventilation",
        categoryId: categories[2].id,
        isActive: true,
      },
    }),
  ]);
  console.log("Created subcategories:", subCategories.length);

  // Create Service Items
  const serviceItems = await Promise.all([
    // Kitchen Equipment Services
    prisma.serviceItem.create({
      data: {
        name: "Oven Repair",
        description: "Complete oven diagnosis and repair service",
        price: 250000, // ₹2,500
        categoryId: categories[0].id,
        subCategoryId: subCategories[0].id,
        isActive: true,
      },
    }),
    prisma.serviceItem.create({
      data: {
        name: "Oven Maintenance",
        description: "Preventive maintenance for commercial ovens",
        price: 150000, // ₹1,500
        categoryId: categories[0].id,
        subCategoryId: subCategories[0].id,
        isActive: true,
      },
    }),
    prisma.serviceItem.create({
      data: {
        name: "Grill Repair",
        description: "Commercial grill repair service",
        price: 200000, // ₹2,000
        categoryId: categories[0].id,
        subCategoryId: subCategories[1].id,
        isActive: true,
      },
    }),
    prisma.serviceItem.create({
      data: {
        name: "Deep Fryer Service",
        description: "Deep fryer cleaning and repair",
        price: 180000, // ₹1,800
        categoryId: categories[0].id,
        subCategoryId: subCategories[2].id,
        isActive: true,
      },
    }),
    // Refrigeration Services
    prisma.serviceItem.create({
      data: {
        name: "Cooler Repair",
        description: "Walk-in cooler repair and gas refill",
        price: 350000, // ₹3,500
        categoryId: categories[1].id,
        subCategoryId: subCategories[3].id,
        isActive: true,
      },
    }),
    prisma.serviceItem.create({
      data: {
        name: "Freezer Maintenance",
        description: "Commercial freezer maintenance service",
        price: 280000, // ₹2,800
        categoryId: categories[1].id,
        subCategoryId: subCategories[4].id,
        isActive: true,
      },
    }),
    // HVAC Services
    prisma.serviceItem.create({
      data: {
        name: "AC Service",
        description: "Air conditioning service and cleaning",
        price: 120000, // ₹1,200
        categoryId: categories[2].id,
        subCategoryId: subCategories[5].id,
        isActive: true,
      },
    }),
    prisma.serviceItem.create({
      data: {
        name: "Ventilation Repair",
        description: "Kitchen ventilation system repair",
        price: 220000, // ₹2,200
        categoryId: categories[2].id,
        subCategoryId: subCategories[6].id,
        isActive: true,
      },
    }),
  ]);
  console.log("Created service items:", serviceItems.length);

  // Create Part Items
  const partItems = await Promise.all([
    prisma.partItem.create({
      data: {
        name: "Oven Thermostat",
        description: "Replacement thermostat for commercial ovens",
        price: 85000, // ₹850
        categoryId: categories[0].id,
        subCategoryId: subCategories[0].id,
        isActive: true,
      },
    }),
    prisma.partItem.create({
      data: {
        name: "Heating Element",
        description: "Universal heating element for ovens",
        price: 120000, // ₹1,200
        categoryId: categories[0].id,
        subCategoryId: subCategories[0].id,
        isActive: true,
      },
    }),
    prisma.partItem.create({
      data: {
        name: "Grill Grate",
        description: "Stainless steel grill grate",
        price: 75000, // ₹750
        categoryId: categories[0].id,
        subCategoryId: subCategories[1].id,
        isActive: true,
      },
    }),
    prisma.partItem.create({
      data: {
        name: "Refrigerant Gas (R410A)",
        description: "1kg refrigerant gas cylinder",
        price: 150000, // ₹1,500
        categoryId: categories[1].id,
        isActive: true,
      },
    }),
    prisma.partItem.create({
      data: {
        name: "Compressor",
        description: "Commercial refrigerator compressor",
        price: 850000, // ₹8,500
        categoryId: categories[1].id,
        isActive: true,
      },
    }),
    prisma.partItem.create({
      data: {
        name: "AC Filter",
        description: "Commercial AC filter",
        price: 45000, // ₹450
        categoryId: categories[2].id,
        subCategoryId: subCategories[5].id,
        isActive: true,
      },
    }),
  ]);
  console.log("Created part items:", partItems.length);

  // Create a sample restaurant (pending)
  const pendingRestaurant = await prisma.restaurant.create({
    data: {
      name: "Sample Restaurant",
      address: "123 Main Street",
      city: "Mumbai",
      status: RestaurantStatus.PENDING,
      ownerId: owner.id,
    },
  });
  console.log("Created pending restaurant:", pendingRestaurant.name);

  // Create approved owner and restaurant for demo
  const approvedOwner = await prisma.user.create({
    data: {
      name: "Approved Owner",
      email: "approved-owner@kni.com",
      passwordHash: ownerPassword,
      role: Role.OWNER,
      isActive: true,
      ownerProfile: {
        create: {},
      },
    },
  });

  const approvedRestaurant = await prisma.restaurant.create({
    data: {
      name: "Approved Restaurant",
      address: "456 Food Court",
      city: "Mumbai",
      status: RestaurantStatus.APPROVED,
      ownerId: approvedOwner.id,
      categories: {
        create: [
          { categoryId: categories[0].id },
          { categoryId: categories[1].id },
        ],
      },
    },
  });
  console.log("Created approved restaurant:", approvedRestaurant.name);

  // Create vendor products for approved vendor
  const vendorProducts = await Promise.all([
    prisma.vendorProduct.create({
      data: {
        name: "Cooking Oil (5L)",
        description: "Premium refined cooking oil",
        price: 65000, // ₹650
        unit: "bottle",
        stockQuantity: 50,
        vendorId: approvedVendor.id,
        categoryId: categories[0].id,
        isActive: true,
      },
    }),
    prisma.vendorProduct.create({
      data: {
        name: "Rice (25kg)",
        description: "Basmati rice, premium quality",
        price: 180000, // ₹1,800
        unit: "bag",
        stockQuantity: 30,
        vendorId: approvedVendor.id,
        isActive: true,
      },
    }),
    prisma.vendorProduct.create({
      data: {
        name: "Flour (10kg)",
        description: "All-purpose flour",
        price: 45000, // ₹450
        unit: "bag",
        stockQuantity: 40,
        vendorId: approvedVendor.id,
        isActive: true,
      },
    }),
    prisma.vendorProduct.create({
      data: {
        name: "Cleaning Supplies Kit",
        description: "Commercial kitchen cleaning supplies",
        price: 250000, // ₹2,500
        unit: "kit",
        stockQuantity: 20,
        vendorId: approvedVendor.id,
        isActive: true,
      },
    }),
  ]);
  console.log("Created vendor products:", vendorProducts.length);

  // Create sample notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: owner.id,
        title: "Welcome to KNI Super App!",
        message: "Start by adding your restaurant details.",
        linkUrl: "/owner/restaurant/create",
        isRead: false,
      },
      {
        userId: admin.id,
        title: "New Restaurant Request",
        message: "A new restaurant approval request has been submitted.",
        linkUrl: "/admin/restaurants/requests",
        isRead: false,
      },
      {
        userId: vendor.id,
        title: "Registration Complete",
        message: "Your vendor registration is pending approval.",
        linkUrl: "/vendor/pending",
        isRead: false,
      },
      {
        userId: engineer.id,
        title: "Welcome Engineer!",
        message: "You are now registered as an engineer on KNI Super App.",
        isRead: false,
      },
    ],
  });
  console.log("Created sample notifications");

  // Create default payment settings
  const paymentSettings = await prisma.paymentSettings.create({
    data: {
      qrCodeImageUrl: "https://via.placeholder.com/400x400?text=UPI+QR+Code",
      upiId: "kni@paytm",
      accountHolderName: "KNI Super App",
      instructions: "1. Scan the QR code with any UPI app\n2. Pay the exact amount shown\n3. Take a screenshot of the successful payment\n4. Upload the screenshot below for admin verification",
      isActive: true,
    },
  });
  console.log("Created payment settings");

  console.log("Seed completed successfully!");
  console.log("\n--- Login Credentials ---");
  console.log("Admin: admin@kni.com / Admin@123");
  console.log("Owner: owner@kni.com / Owner@123 (restaurant pending)");
  console.log("Owner: approved-owner@kni.com / Owner@123 (restaurant approved)");
  console.log("Engineer: eng@kni.com / Eng@123");
  console.log("Vendor: vendor@kni.com / Vendor@123 (pending approval)");
  console.log("Vendor: approved-vendor@kni.com / Vendor@123 (approved, active subscription)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

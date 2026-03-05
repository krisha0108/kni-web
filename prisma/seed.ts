import { PrismaClient, Role, RestaurantStatus, VendorApprovalStatus, VendorSubscriptionStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Skip cleanup - we'll use upsert to handle existing data
  console.log("Using upsert mode - skipping cleanup to preserve existing data");

  // Hash passwords
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const ownerPassword = await bcrypt.hash("Owner@123", 10);
  const engineerPassword = await bcrypt.hash("Eng@123", 10);
  const vendorPassword = await bcrypt.hash("Vendor@123", 10);

  // Create/Update Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@kni.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@kni.com",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log("Admin ready:", admin.email);

  // Create/Update Owner user with profile
  const owner = await prisma.user.upsert({
    where: { email: "owner@kni.com" },
    update: {},
    create: {
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
  console.log("Owner ready:", owner.email);

  // Create/Update Engineer user with profile
  const engineer = await prisma.user.upsert({
    where: { email: "eng@kni.com" },
    update: {},
    create: {
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
  console.log("Engineer ready:", engineer.email);

  // Create/Update Vendor user with profile (pending approval)
  const vendor = await prisma.user.upsert({
    where: { email: "vendor@kni.com" },
    update: {},
    create: {
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
  console.log("Vendor ready:", vendor.email);

  // Create/Update approved vendor for marketplace demo
  const approvedVendor = await prisma.user.upsert({
    where: { email: "approved-vendor@kni.com" },
    update: {},
    create: {
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
  console.log("Approved vendor ready:", approvedVendor.email);

  // Create/Update Categories (Service categories)
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: "Kitchen Equipment" },
      update: {},
      create: { name: "Kitchen Equipment", isActive: true },
    }),
    prisma.category.upsert({
      where: { name: "Refrigeration" },
      update: {},
      create: { name: "Refrigeration", isActive: true },
    }),
    prisma.category.upsert({
      where: { name: "HVAC" },
      update: {},
      create: { name: "HVAC", isActive: true },
    }),
    prisma.category.upsert({
      where: { name: "Plumbing" },
      update: {},
      create: { name: "Plumbing", isActive: true },
    }),
    prisma.category.upsert({
      where: { name: "Electrical" },
      update: {},
      create: { name: "Electrical", isActive: true },
    }),
  ]);
  console.log("Service categories ready:", categories.length);

  // Create/Update SubCategories
  const subCategories = await Promise.all([
    // Kitchen Equipment subcategories
    prisma.subCategory.upsert({
      where: { categoryId_name: { categoryId: categories[0].id, name: "Ovens" } },
      update: {},
      create: { name: "Ovens", categoryId: categories[0].id, isActive: true },
    }),
    prisma.subCategory.upsert({
      where: { categoryId_name: { categoryId: categories[0].id, name: "Grills" } },
      update: {},
      create: { name: "Grills", categoryId: categories[0].id, isActive: true },
    }),
    prisma.subCategory.upsert({
      where: { categoryId_name: { categoryId: categories[0].id, name: "Fryers" } },
      update: {},
      create: { name: "Fryers", categoryId: categories[0].id, isActive: true },
    }),
    // Refrigeration subcategories
    prisma.subCategory.upsert({
      where: { categoryId_name: { categoryId: categories[1].id, name: "Walk-in Coolers" } },
      update: {},
      create: { name: "Walk-in Coolers", categoryId: categories[1].id, isActive: true },
    }),
    prisma.subCategory.upsert({
      where: { categoryId_name: { categoryId: categories[1].id, name: "Freezers" } },
      update: {},
      create: { name: "Freezers", categoryId: categories[1].id, isActive: true },
    }),
    // HVAC subcategories
    prisma.subCategory.upsert({
      where: { categoryId_name: { categoryId: categories[2].id, name: "Air Conditioning" } },
      update: {},
      create: { name: "Air Conditioning", categoryId: categories[2].id, isActive: true },
    }),
    prisma.subCategory.upsert({
      where: { categoryId_name: { categoryId: categories[2].id, name: "Ventilation" } },
      update: {},
      create: { name: "Ventilation", categoryId: categories[2].id, isActive: true },
    }),
  ]);
  console.log("Service subcategories ready:", subCategories.length);

  // Create Service Items (skip if exists)
  const serviceItemsData = [
    { name: "Oven Repair", description: "Complete oven diagnosis and repair service", price: 250000, categoryId: categories[0].id, subCategoryId: subCategories[0].id },
    { name: "Oven Maintenance", description: "Preventive maintenance for commercial ovens", price: 150000, categoryId: categories[0].id, subCategoryId: subCategories[0].id },
    { name: "Grill Repair", description: "Commercial grill repair service", price: 200000, categoryId: categories[0].id, subCategoryId: subCategories[1].id },
    { name: "Deep Fryer Service", description: "Deep fryer cleaning and repair", price: 180000, categoryId: categories[0].id, subCategoryId: subCategories[2].id },
    { name: "Cooler Repair", description: "Walk-in cooler repair and gas refill", price: 350000, categoryId: categories[1].id, subCategoryId: subCategories[3].id },
    { name: "Freezer Maintenance", description: "Commercial freezer maintenance service", price: 280000, categoryId: categories[1].id, subCategoryId: subCategories[4].id },
    { name: "AC Service", description: "Air conditioning service and cleaning", price: 120000, categoryId: categories[2].id, subCategoryId: subCategories[5].id },
    { name: "Ventilation Repair", description: "Kitchen ventilation system repair", price: 220000, categoryId: categories[2].id, subCategoryId: subCategories[6].id },
  ];
  const serviceItems: any[] = [];
  for (const item of serviceItemsData) {
    const existing = await prisma.serviceItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      const created = await prisma.serviceItem.create({ data: { ...item, isActive: true } });
      serviceItems.push(created);
    } else {
      serviceItems.push(existing);
    }
  }
  console.log("Service items ready:", serviceItems.length);

  // Create Part Items (skip if exists)
  const partItemsData = [
    { name: "Oven Thermostat", description: "Replacement thermostat for commercial ovens", price: 85000, categoryId: categories[0].id, subCategoryId: subCategories[0].id },
    { name: "Heating Element", description: "Universal heating element for ovens", price: 120000, categoryId: categories[0].id, subCategoryId: subCategories[0].id },
    { name: "Grill Grate", description: "Stainless steel grill grate", price: 75000, categoryId: categories[0].id, subCategoryId: subCategories[1].id },
    { name: "Refrigerant Gas (R410A)", description: "1kg refrigerant gas cylinder", price: 150000, categoryId: categories[1].id },
    { name: "Compressor", description: "Commercial refrigerator compressor", price: 850000, categoryId: categories[1].id },
    { name: "AC Filter", description: "Commercial AC filter", price: 45000, categoryId: categories[2].id, subCategoryId: subCategories[5].id },
  ];
  const partItems: any[] = [];
  for (const item of partItemsData) {
    const existing = await prisma.partItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      const created = await prisma.partItem.create({ data: { ...item, isActive: true } });
      partItems.push(created);
    } else {
      partItems.push(existing);
    }
  }
  console.log("Part items ready:", partItems.length);

  // Create a sample restaurant (pending) - skip if exists
  let pendingRestaurant = await prisma.restaurant.findFirst({ where: { name: "Sample Restaurant", ownerId: owner.id } });
  if (!pendingRestaurant) {
    pendingRestaurant = await prisma.restaurant.create({
      data: {
        name: "Sample Restaurant",
        address: "123 Main Street",
        city: "Mumbai",
        status: RestaurantStatus.PENDING,
        ownerId: owner.id,
      },
    });
  }
  console.log("Pending restaurant ready:", pendingRestaurant.name);

  // Create/Update approved owner
  const approvedOwner = await prisma.user.upsert({
    where: { email: "approved-owner@kni.com" },
    update: {},
    create: {
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

  // Create approved restaurant - skip if exists
  let approvedRestaurant = await prisma.restaurant.findFirst({ where: { name: "Approved Restaurant", ownerId: approvedOwner.id } });
  if (!approvedRestaurant) {
    approvedRestaurant = await prisma.restaurant.create({
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
  }
  console.log("Approved restaurant ready:", approvedRestaurant.name);

  // ==========================================
  // MARKETPLACE DATA (Admin Side First)
  // ==========================================
  console.log("\n--- Setting up Marketplace (Admin Side) ---");

  // Step 1: Create Marketplace Categories (Admin creates these)
  const marketplaceCategoriesData = [
    { name: "Kitchen Essentials", slug: "kitchen-essentials", sortOrder: 1 },
    { name: "Cooking Ingredients", slug: "cooking-ingredients", sortOrder: 2 },
    { name: "Cleaning Supplies", slug: "cleaning-supplies", sortOrder: 3 },
    { name: "Packaging Materials", slug: "packaging-materials", sortOrder: 4 },
  ];
  const marketplaceCategories: any[] = [];
  for (const cat of marketplaceCategoriesData) {
    let existing = await prisma.marketplaceCategory.findFirst({ where: { slug: cat.slug } });
    if (!existing) {
      existing = await prisma.marketplaceCategory.create({ data: { ...cat, isActive: true } });
      console.log("  + Created category:", cat.name);
    }
    marketplaceCategories.push(existing);
  }
  console.log("Marketplace categories ready:", marketplaceCategories.length);

  // Step 2: Create Marketplace Subcategories (Admin creates these)
  const marketplaceSubCategoriesData = [
    { name: "Utensils", slug: "utensils", categoryId: marketplaceCategories[0].id, sortOrder: 1 },
    { name: "Cookware", slug: "cookware", categoryId: marketplaceCategories[0].id, sortOrder: 2 },
    { name: "Oils & Ghee", slug: "oils-ghee", categoryId: marketplaceCategories[1].id, sortOrder: 1 },
    { name: "Grains & Flour", slug: "grains-flour", categoryId: marketplaceCategories[1].id, sortOrder: 2 },
    { name: "Spices", slug: "spices", categoryId: marketplaceCategories[1].id, sortOrder: 3 },
  ];
  const marketplaceSubCategories: any[] = [];
  for (const subcat of marketplaceSubCategoriesData) {
    let existing = await prisma.marketplaceSubCategory.findFirst({ where: { slug: subcat.slug } });
    if (!existing) {
      existing = await prisma.marketplaceSubCategory.create({ data: { ...subcat, isActive: true } });
      console.log("  + Created subcategory:", subcat.name);
    }
    marketplaceSubCategories.push(existing);
  }
  console.log("Marketplace subcategories ready:", marketplaceSubCategories.length);

  // Step 3: Create Marketplace Products (Admin creates master catalog)
  const marketplaceProductsData = [
    { name: "Cooking Oil (5L)", unit: "bottle", description: "Premium refined cooking oil for commercial kitchens", marketplaceCategoryId: marketplaceCategories[1].id, marketplaceSubCategoryId: marketplaceSubCategories[2].id },
    { name: "Basmati Rice (25kg)", unit: "bag", description: "Premium quality basmati rice", marketplaceCategoryId: marketplaceCategories[1].id, marketplaceSubCategoryId: marketplaceSubCategories[3].id },
    { name: "All-Purpose Flour (10kg)", unit: "bag", description: "Fine quality all-purpose flour", marketplaceCategoryId: marketplaceCategories[1].id, marketplaceSubCategoryId: marketplaceSubCategories[3].id },
    { name: "Garam Masala (1kg)", unit: "packet", description: "Authentic blend of Indian spices", marketplaceCategoryId: marketplaceCategories[1].id, marketplaceSubCategoryId: marketplaceSubCategories[4].id },
    { name: "Stainless Steel Kadai (Large)", unit: "piece", description: "Heavy duty stainless steel kadai for commercial use", marketplaceCategoryId: marketplaceCategories[0].id, marketplaceSubCategoryId: marketplaceSubCategories[1].id },
    { name: "Kitchen Cleaning Kit", unit: "kit", description: "Complete cleaning supplies for commercial kitchens", marketplaceCategoryId: marketplaceCategories[2].id },
    { name: "Food Packaging Containers (100pcs)", unit: "pack", description: "Disposable food-grade containers with lids", marketplaceCategoryId: marketplaceCategories[3].id },
  ];
  const marketplaceProducts: any[] = [];
  for (const prod of marketplaceProductsData) {
    let existing = await prisma.marketplaceProduct.findFirst({ where: { name: prod.name } });
    if (!existing) {
      existing = await prisma.marketplaceProduct.create({ data: { ...prod, isActive: true, createdBy: admin.id } });
      console.log("  + Created product:", prod.name);
    }
    marketplaceProducts.push(existing);
  }
  console.log("Marketplace products ready:", marketplaceProducts.length);

  // ==========================================
  // VENDOR SIDE - Vendor adds products with pricing
  // ==========================================
  console.log("\n--- Setting up Marketplace (Vendor Side) ---");

  // Step 4: Vendor adds their products with pricing
  const vendorProductsData = [
    { productId: marketplaceProducts[0].id, price: 65000, minOrderQty: 2, stockQuantity: 50, deliveryTime: "2-3 days", description: "Premium refined sunflower oil - best for frying" },
    { productId: marketplaceProducts[1].id, price: 180000, minOrderQty: 1, stockQuantity: 30, deliveryTime: "3-4 days", description: "Aged basmati rice, extra long grain" },
    { productId: marketplaceProducts[2].id, price: 45000, minOrderQty: 2, stockQuantity: 40, deliveryTime: "2-3 days", description: "Fine quality maida flour" },
    { productId: marketplaceProducts[3].id, price: 35000, minOrderQty: 3, stockQuantity: 100, deliveryTime: "1-2 days", description: "Freshly ground aromatic spice blend" },
    { productId: marketplaceProducts[4].id, price: 125000, minOrderQty: 1, stockQuantity: 15, deliveryTime: "4-5 days", description: "14 inch heavy duty kadai with handles" },
    { productId: marketplaceProducts[5].id, price: 250000, minOrderQty: 1, stockQuantity: 20, deliveryTime: "2-3 days", description: "Includes sanitizer, scrubbers, detergent and gloves" },
    { productId: marketplaceProducts[6].id, price: 45000, minOrderQty: 5, stockQuantity: 200, deliveryTime: "1-2 days", description: "Leak-proof containers, microwave safe" },
  ];
  const vendorProducts: any[] = [];
  for (const vp of vendorProductsData) {
    let existing = await prisma.vendorProduct.findFirst({ where: { productId: vp.productId, vendorId: approvedVendor.id } });
    if (!existing) {
      existing = await prisma.vendorProduct.create({ data: { ...vp, vendorId: approvedVendor.id, isActive: true, isAvailable: true } });
      console.log("  + Vendor added product with price:", vp.price / 100);
    }
    vendorProducts.push(existing);
  }
  console.log("Vendor products ready:", vendorProducts.length);

  // Create sample notifications (skip if user already has notifications)
  const notificationsData = [
    { userId: owner.id, title: "Welcome to KNI Super App!", message: "Start by adding your restaurant details.", linkUrl: "/owner/restaurant/create" },
    { userId: admin.id, title: "New Restaurant Request", message: "A new restaurant approval request has been submitted.", linkUrl: "/admin/restaurants/requests" },
    { userId: vendor.id, title: "Registration Complete", message: "Your vendor registration is pending approval.", linkUrl: "/vendor/pending" },
    { userId: engineer.id, title: "Welcome Engineer!", message: "You are now registered as an engineer on KNI Super App." },
  ];
  for (const notif of notificationsData) {
    const exists = await prisma.notification.findFirst({ where: { userId: notif.userId, title: notif.title } });
    if (!exists) {
      await prisma.notification.create({ data: { ...notif, isRead: false } });
    }
  }
  console.log("Notifications ready");

  // Create default payment settings (skip if exists)
  const existingPaymentSettings = await prisma.paymentSettings.findFirst({ where: { isActive: true } });
  if (!existingPaymentSettings) {
    await prisma.paymentSettings.create({
      data: {
        qrCodeImageUrl: "https://via.placeholder.com/400x400?text=UPI+QR+Code",
        upiId: "kni@paytm",
        accountHolderName: "KNI Super App",
        instructions: "1. Scan the QR code with any UPI app\n2. Pay the exact amount shown\n3. Take a screenshot of the successful payment\n4. Upload the screenshot below for admin verification",
        isActive: true,
      },
    });
  }
  console.log("Payment settings ready");

  // ==========================================
  // SERVICE LOCATIONS (States, Cities, Areas)
  // ==========================================
  console.log("\n--- Setting up Service Locations ---");

  // Create States
  const statesData = [
    { name: "Maharashtra", sortOrder: 1 },
    { name: "Delhi", sortOrder: 2 },
    { name: "Karnataka", sortOrder: 3 },
    { name: "Gujarat", sortOrder: 4 },
    { name: "Tamil Nadu", sortOrder: 5 },
  ];
  const states: any[] = [];
  for (const state of statesData) {
    let existing = await prisma.serviceState.findFirst({ where: { name: state.name } });
    if (!existing) {
      existing = await prisma.serviceState.create({ data: { ...state, isActive: true } });
      console.log("  + Created state:", state.name);
    }
    states.push(existing);
  }
  console.log("Service states ready:", states.length);

  // Create Cities
  const citiesData = [
    // Maharashtra cities
    { name: "Mumbai", stateId: states[0].id, sortOrder: 1 },
    { name: "Pune", stateId: states[0].id, sortOrder: 2 },
    { name: "Nagpur", stateId: states[0].id, sortOrder: 3 },
    // Delhi cities
    { name: "New Delhi", stateId: states[1].id, sortOrder: 1 },
    { name: "Noida", stateId: states[1].id, sortOrder: 2 },
    { name: "Gurgaon", stateId: states[1].id, sortOrder: 3 },
    // Karnataka cities
    { name: "Bangalore", stateId: states[2].id, sortOrder: 1 },
    { name: "Mysore", stateId: states[2].id, sortOrder: 2 },
    // Gujarat cities
    { name: "Ahmedabad", stateId: states[3].id, sortOrder: 1 },
    { name: "Surat", stateId: states[3].id, sortOrder: 2 },
    // Tamil Nadu cities
    { name: "Chennai", stateId: states[4].id, sortOrder: 1 },
    { name: "Coimbatore", stateId: states[4].id, sortOrder: 2 },
  ];
  const cities: any[] = [];
  for (const city of citiesData) {
    let existing = await prisma.serviceCity.findFirst({ where: { name: city.name, stateId: city.stateId } });
    if (!existing) {
      existing = await prisma.serviceCity.create({ data: { ...city, isActive: true } });
      console.log("  + Created city:", city.name);
    }
    cities.push(existing);
  }
  console.log("Service cities ready:", cities.length);

  // Create Areas
  const areasData = [
    // Mumbai areas
    { name: "Andheri", cityId: cities[0].id, sortOrder: 1 },
    { name: "Bandra", cityId: cities[0].id, sortOrder: 2 },
    { name: "Borivali", cityId: cities[0].id, sortOrder: 3 },
    { name: "Malad", cityId: cities[0].id, sortOrder: 4 },
    { name: "Goregaon", cityId: cities[0].id, sortOrder: 5 },
    { name: "Powai", cityId: cities[0].id, sortOrder: 6 },
    { name: "Kurla", cityId: cities[0].id, sortOrder: 7 },
    { name: "Thane", cityId: cities[0].id, sortOrder: 8 },
    // Pune areas
    { name: "Kothrud", cityId: cities[1].id, sortOrder: 1 },
    { name: "Hinjewadi", cityId: cities[1].id, sortOrder: 2 },
    { name: "Wakad", cityId: cities[1].id, sortOrder: 3 },
    { name: "Pimpri Chinchwad", cityId: cities[1].id, sortOrder: 4 },
    // Nagpur areas
    { name: "Dharampeth", cityId: cities[2].id, sortOrder: 1 },
    { name: "Sitabuldi", cityId: cities[2].id, sortOrder: 2 },
    // New Delhi areas
    { name: "Connaught Place", cityId: cities[3].id, sortOrder: 1 },
    { name: "Karol Bagh", cityId: cities[3].id, sortOrder: 2 },
    { name: "Saket", cityId: cities[3].id, sortOrder: 3 },
    { name: "Dwarka", cityId: cities[3].id, sortOrder: 4 },
    // Noida areas
    { name: "Sector 18", cityId: cities[4].id, sortOrder: 1 },
    { name: "Sector 62", cityId: cities[4].id, sortOrder: 2 },
    // Gurgaon areas
    { name: "Cyber City", cityId: cities[5].id, sortOrder: 1 },
    { name: "MG Road", cityId: cities[5].id, sortOrder: 2 },
    // Bangalore areas
    { name: "Koramangala", cityId: cities[6].id, sortOrder: 1 },
    { name: "Whitefield", cityId: cities[6].id, sortOrder: 2 },
    { name: "Indiranagar", cityId: cities[6].id, sortOrder: 3 },
    { name: "HSR Layout", cityId: cities[6].id, sortOrder: 4 },
    // Mysore areas
    { name: "Jayalakshmipuram", cityId: cities[7].id, sortOrder: 1 },
    { name: "V.V. Mohalla", cityId: cities[7].id, sortOrder: 2 },
    // Ahmedabad areas
    { name: "Satellite", cityId: cities[8].id, sortOrder: 1 },
    { name: "Vastrapur", cityId: cities[8].id, sortOrder: 2 },
    { name: "Maninagar", cityId: cities[8].id, sortOrder: 3 },
    // Surat areas
    { name: "Adajan", cityId: cities[9].id, sortOrder: 1 },
    { name: "Vesu", cityId: cities[9].id, sortOrder: 2 },
    // Chennai areas
    { name: "T Nagar", cityId: cities[10].id, sortOrder: 1 },
    { name: "Adyar", cityId: cities[10].id, sortOrder: 2 },
    { name: "Anna Nagar", cityId: cities[10].id, sortOrder: 3 },
    // Coimbatore areas
    { name: "RS Puram", cityId: cities[11].id, sortOrder: 1 },
    { name: "Peelamedu", cityId: cities[11].id, sortOrder: 2 },
  ];
  const areas: any[] = [];
  for (const area of areasData) {
    let existing = await prisma.serviceArea.findFirst({ where: { name: area.name, cityId: area.cityId } });
    if (!existing) {
      existing = await prisma.serviceArea.create({ data: { ...area, isActive: true } });
    }
    areas.push(existing);
  }
  console.log("Service areas ready:", areas.length);

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

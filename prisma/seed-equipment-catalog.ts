import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedEquipmentCatalog() {
  console.log("🔧 Seeding Equipment Catalog...");

  // 1. Create Equipment Categories
  const categories = [
    {
      name: "Cooking Equipment",
      description: "Ranges, ovens, grills, fryers, and other cooking appliances",
      icon: "🔥",
      sortOrder: 1,
    },
    {
      name: "Refrigeration",
      description: "Refrigerators, freezers, coolers, and cold storage",
      icon: "❄️",
      sortOrder: 2,
    },
    {
      name: "Food Preparation",
      description: "Mixers, slicers, food processors, and prep tables",
      icon: "🔪",
      sortOrder: 3,
    },
    {
      name: "Dishwashing",
      description: "Dishwashers, sinks, and cleaning equipment",
      icon: "🧼",
      sortOrder: 4,
    },
    {
      name: "Storage & Shelving",
      description: "Racks, shelves, and dry storage units",
      icon: "📦",
      sortOrder: 5,
    },
    {
      name: "HVAC",
      description: "Heating, ventilation, and air conditioning systems",
      icon: "🌡️",
      sortOrder: 6,
    },
  ];

  const createdCategories: any = {};
  for (const cat of categories) {
    const created = await prisma.equipmentCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    createdCategories[cat.name] = created;
    console.log(`✓ Category: ${cat.name}`);
  }

  // 2. Create Equipment Types with Service & Part Templates

  // COOKING EQUIPMENT
  const commercialOven = await prisma.equipmentType.upsert({
    where: {
      categoryId_name: {
        categoryId: createdCategories["Cooking Equipment"].id,
        name: "Commercial Oven",
      },
    },
    update: {},
    create: {
      categoryId: createdCategories["Cooking Equipment"].id,
      name: "Commercial Oven",
      description: "Gas or electric commercial oven for baking and roasting",
      brand: "Rational, Unox, Lincoln, Blodgett",
      avgLifespanMonths: 180, // 15 years
      avgWarrantyMonths: 12,
    },
  });

  await prisma.equipmentServiceTemplate.createMany({
    data: [
      {
        equipmentTypeId: commercialOven.id,
        name: "Oven Deep Cleaning",
        description: "Complete interior and exterior cleaning, grease removal",
        estimatedPrice: 150000, // ₹1,500
        duration: 120,
        frequency: "Monthly",
        isCommon: true,
        sortOrder: 1,
      },
      {
        equipmentTypeId: commercialOven.id,
        name: "Temperature Calibration",
        description: "Verify and calibrate oven temperature accuracy",
        estimatedPrice: 100000, // ₹1,000
        duration: 60,
        frequency: "Quarterly",
        isCommon: true,
        sortOrder: 2,
      },
      {
        equipmentTypeId: commercialOven.id,
        name: "Burner Service",
        description: "Clean and adjust gas burners, check ignition system",
        estimatedPrice: 120000, // ₹1,200
        duration: 90,
        frequency: "Quarterly",
        isCommon: false,
        sortOrder: 3,
      },
      {
        equipmentTypeId: commercialOven.id,
        name: "Seal Replacement",
        description: "Replace door seals and gaskets",
        estimatedPrice: 80000, // ₹800
        duration: 45,
        frequency: "Annual",
        isCommon: false,
        sortOrder: 4,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.equipmentPartTemplate.createMany({
    data: [
      {
        equipmentTypeId: commercialOven.id,
        name: "Door Seal/Gasket",
        partNumber: "SEAL-OV-001",
        description: "High-temp door seal for commercial oven",
        estimatedPrice: 45000, // ₹450
        isCommon: true,
        sortOrder: 1,
      },
      {
        equipmentTypeId: commercialOven.id,
        name: "Oven Thermostat",
        partNumber: "THERM-OV-001",
        description: "Temperature control thermostat",
        estimatedPrice: 120000, // ₹1,200
        isCommon: true,
        sortOrder: 2,
      },
      {
        equipmentTypeId: commercialOven.id,
        name: "Heating Element",
        partNumber: "HEAT-OV-001",
        description: "Electric heating element (for electric ovens)",
        estimatedPrice: 200000, // ₹2,000
        isCommon: false,
        sortOrder: 3,
      },
      {
        equipmentTypeId: commercialOven.id,
        name: "Oven Light Bulb",
        partNumber: "BULB-OV-001",
        description: "Heat-resistant oven light bulb",
        estimatedPrice: 5000, // ₹50
        isCommon: true,
        sortOrder: 4,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✓ Equipment Type: Commercial Oven (with templates)");

  // REFRIGERATION
  const walkInCooler = await prisma.equipmentType.upsert({
    where: {
      categoryId_name: {
        categoryId: createdCategories["Refrigeration"].id,
        name: "Walk-in Cooler",
      },
    },
    update: {},
    create: {
      categoryId: createdCategories["Refrigeration"].id,
      name: "Walk-in Cooler",
      description: "Large commercial walk-in refrigeration unit",
      brand: "Kolpak, Amerikooler, Norlake, Polar King",
      avgLifespanMonths: 240, // 20 years
      avgWarrantyMonths: 24,
    },
  });

  await prisma.equipmentServiceTemplate.createMany({
    data: [
      {
        equipmentTypeId: walkInCooler.id,
        name: "Compressor Service",
        description: "Clean compressor coils, check refrigerant levels",
        estimatedPrice: 250000, // ₹2,500
        duration: 120,
        frequency: "Quarterly",
        isCommon: true,
        sortOrder: 1,
      },
      {
        equipmentTypeId: walkInCooler.id,
        name: "Door Seal Inspection",
        description: "Check and replace door seals if needed",
        estimatedPrice: 80000, // ₹800
        duration: 30,
        frequency: "Monthly",
        isCommon: true,
        sortOrder: 2,
      },
      {
        equipmentTypeId: walkInCooler.id,
        name: "Defrost System Check",
        description: "Test defrost system and timers",
        estimatedPrice: 120000, // ₹1,200
        duration: 60,
        frequency: "Quarterly",
        isCommon: false,
        sortOrder: 3,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.equipmentPartTemplate.createMany({
    data: [
      {
        equipmentTypeId: walkInCooler.id,
        name: "Evaporator Fan Motor",
        partNumber: "FAN-WC-001",
        description: "Replacement fan motor for evaporator",
        estimatedPrice: 350000, // ₹3,500
        isCommon: true,
        sortOrder: 1,
      },
      {
        equipmentTypeId: walkInCooler.id,
        name: "Door Gasket",
        partNumber: "SEAL-WC-001",
        description: "Insulated door seal/gasket",
        estimatedPrice: 120000, // ₹1,200
        isCommon: true,
        sortOrder: 2,
      },
      {
        equipmentTypeId: walkInCooler.id,
        name: "Refrigerant (R-404A)",
        partNumber: "REF-404A-001",
        description: "Refrigerant gas refill (per kg)",
        estimatedPrice: 180000, // ₹1,800
        isCommon: false,
        sortOrder: 3,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✓ Equipment Type: Walk-in Cooler (with templates)");

  // FOOD PREPARATION
  const commercialMixer = await prisma.equipmentType.upsert({
    where: {
      categoryId_name: {
        categoryId: createdCategories["Food Preparation"].id,
        name: "Commercial Mixer",
      },
    },
    update: {},
    create: {
      categoryId: createdCategories["Food Preparation"].id,
      name: "Commercial Mixer",
      description: "Heavy-duty stand mixer for dough and batters",
      brand: "Hobart, KitchenAid, Globe, Univex",
      avgLifespanMonths: 144, // 12 years
      avgWarrantyMonths: 12,
    },
  });

  await prisma.equipmentServiceTemplate.createMany({
    data: [
      {
        equipmentTypeId: commercialMixer.id,
        name: "Gearbox Lubrication",
        description: "Lubricate gearbox and check oil level",
        estimatedPrice: 100000, // ₹1,000
        duration: 45,
        frequency: "Quarterly",
        isCommon: true,
        sortOrder: 1,
      },
      {
        equipmentTypeId: commercialMixer.id,
        name: "Motor Inspection",
        description: "Inspect motor, belts, and electrical connections",
        estimatedPrice: 120000, // ₹1,200
        duration: 60,
        frequency: "Annual",
        isCommon: false,
        sortOrder: 2,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.equipmentPartTemplate.createMany({
    data: [
      {
        equipmentTypeId: commercialMixer.id,
        name: "Dough Hook",
        partNumber: "HOOK-MX-001",
        description: "Commercial dough hook attachment",
        estimatedPrice: 80000, // ₹800
        isCommon: true,
        sortOrder: 1,
      },
      {
        equipmentTypeId: commercialMixer.id,
        name: "Whip Attachment",
        partNumber: "WHIP-MX-001",
        description: "Wire whip attachment",
        estimatedPrice: 60000, // ₹600
        isCommon: true,
        sortOrder: 2,
      },
      {
        equipmentTypeId: commercialMixer.id,
        name: "Drive Belt",
        partNumber: "BELT-MX-001",
        description: "Motor drive belt",
        estimatedPrice: 35000, // ₹350
        isCommon: false,
        sortOrder: 3,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✓ Equipment Type: Commercial Mixer (with templates)");

  // DISHWASHING
  const commercialDishwasher = await prisma.equipmentType.upsert({
    where: {
      categoryId_name: {
        categoryId: createdCategories["Dishwashing"].id,
        name: "Commercial Dishwasher",
      },
    },
    update: {},
    create: {
      categoryId: createdCategories["Dishwashing"].id,
      name: "Commercial Dishwasher",
      description: "High-temp commercial dishwasher",
      brand: "Hobart, Ecolab, CMA, Noble Warewashing",
      avgLifespanMonths: 120, // 10 years
      avgWarrantyMonths: 12,
    },
  });

  await prisma.equipmentServiceTemplate.createMany({
    data: [
      {
        equipmentTypeId: commercialDishwasher.id,
        name: "De-liming Service",
        description: "Remove mineral deposits from heating elements and spray arms",
        estimatedPrice: 150000, // ₹1,500
        duration: 90,
        frequency: "Monthly",
        isCommon: true,
        sortOrder: 1,
      },
      {
        equipmentTypeId: commercialDishwasher.id,
        name: "Pump Inspection",
        description: "Check and clean wash and rinse pumps",
        estimatedPrice: 120000, // ₹1,200
        duration: 60,
        frequency: "Quarterly",
        isCommon: true,
        sortOrder: 2,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.equipmentPartTemplate.createMany({
    data: [
      {
        equipmentTypeId: commercialDishwasher.id,
        name: "Spray Arm",
        partNumber: "SPRAY-DW-001",
        description: "Upper or lower spray arm assembly",
        estimatedPrice: 180000, // ₹1,800
        isCommon: true,
        sortOrder: 1,
      },
      {
        equipmentTypeId: commercialDishwasher.id,
        name: "Heating Element",
        partNumber: "HEAT-DW-001",
        description: "Water heating element",
        estimatedPrice: 250000, // ₹2,500
        isCommon: false,
        sortOrder: 2,
      },
      {
        equipmentTypeId: commercialDishwasher.id,
        name: "Rinse Aid Dispenser",
        partNumber: "DISP-DW-001",
        description: "Automatic rinse aid dispenser",
        estimatedPrice: 90000, // ₹900
        isCommon: false,
        sortOrder: 3,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✓ Equipment Type: Commercial Dishwasher (with templates)");

  console.log("✅ Equipment Catalog seeded successfully!");
  console.log("📊 Summary:");
  console.log(`   - ${categories.length} Equipment Categories`);
  console.log(`   - 4 Equipment Types with Service & Part Templates`);
}

seedEquipmentCatalog()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

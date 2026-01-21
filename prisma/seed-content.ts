import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding content management data...");

  // Create banners
  const banners = await Promise.all([
    prisma.banner.create({
      data: {
        title: "Welcome to KNI Super App!",
        description: "Your one-stop solution for restaurant equipment service and maintenance",
        imageUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&h=400&fit=crop",
        sortOrder: 1,
        status: "PUBLISHED",
      },
    }),
    prisma.banner.create({
      data: {
        title: "Save with AMC Plans",
        description: "Get up to 20% savings with our Annual Maintenance Contracts",
        imageUrl: "https://images.unsplash.com/photo-1554224311-beee4f503ea0?w=1200&h=400&fit=crop",
        linkUrl: "/amc-plans",
        sortOrder: 2,
        status: "PUBLISHED",
      },
    }),
    prisma.banner.create({
      data: {
        title: "24/7 Service Support",
        description: "Professional help available anytime, anywhere",
        imageUrl: "https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=1200&h=400&fit=crop",
        sortOrder: 3,
        status: "PUBLISHED",
      },
    }),
  ]);

  console.log(`✅ Created ${banners.length} banners`);

  // Create feeds
  const feeds = await Promise.all([
    prisma.feed.create({
      data: {
        text: "New feature available! Check out our latest equipment tracking update.",
        tone: "INFO",
        icon: "information-circle-outline",
        isActive: true,
      },
    }),
    prisma.feed.create({
      data: {
        text: "500+ restaurants trust us for their equipment service needs!",
        tone: "OK",
        icon: "shield-checkmark-outline",
        isActive: true,
      },
    }),
    prisma.feed.create({
      data: {
        text: "Schedule your equipment maintenance before peak season!",
        tone: "WARN",
        icon: "alert-circle-outline",
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${feeds.length} feeds`);

  // Create guides
  const guides = await Promise.all([
    prisma.guide.create({
      data: {
        title: "How to Book a Service Request",
        description: "Step-by-step guide to booking equipment service",
        thumbUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop",
        linkUrl: "https://youtube.com/watch?v=example1",
        minutes: 3,
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.guide.create({
      data: {
        title: "Understanding AMC Plans",
        description: "Learn about our Annual Maintenance Contracts and how to save",
        thumbUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop",
        linkUrl: "https://youtube.com/watch?v=example2",
        minutes: 5,
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.guide.create({
      data: {
        title: "Managing Your Equipment Inventory",
        description: "How to add, track, and manage your restaurant equipment",
        thumbUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
        linkUrl: "https://youtube.com/watch?v=example3",
        minutes: 4,
        isActive: true,
        sortOrder: 3,
      },
    }),
  ]);

  console.log(`✅ Created ${guides.length} guides`);

  // Create sponsored content
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30); // 30 days from now

  const sponsored = await Promise.all([
    prisma.sponsoredContent.create({
      data: {
        type: "SERVICE",
        title: "AMC Special Offer",
        description: "First month free on annual contracts",
        imageUrl: "https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=800&h=600&fit=crop",
        linkUrl: "/amc-plans",
        sponsoredBy: "KNI Services",
        startDate,
        endDate,
        isActive: true,
        impressions: 0,
        clicks: 0,
      },
    }),
    prisma.sponsoredContent.create({
      data: {
        type: "VENDOR",
        title: "Premium Kitchen Equipment",
        description: "Special discount on commercial kitchen equipment",
        imageUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=600&fit=crop",
        linkUrl: "/marketplace",
        sponsoredBy: "Partner Vendor",
        startDate,
        endDate,
        isActive: true,
        impressions: 0,
        clicks: 0,
      },
    }),
  ]);

  console.log(`✅ Created ${sponsored.length} sponsored content items`);

  console.log("\n🎉 Content seeding completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   - ${banners.length} Banners (PUBLISHED)`);
  console.log(`   - ${feeds.length} Feeds (Active)`);
  console.log(`   - ${guides.length} Guides (Active)`);
  console.log(`   - ${sponsored.length} Sponsored Content (Active)`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { db } from "./src/server/db";

async function fixCoverage() {
  const vendor = await db.user.findFirst({
    where: { email: 'shruti@cre8r.in' },
    include: { vendorProfile: true, vendorCoverage: true }
  });

  if (!vendor) {
    console.log('Vendor not found');
    return;
  }

  console.log('Vendor:', vendor.name);
  console.log('Profile City:', vendor.vendorProfile?.city);
  console.log('Existing Coverage:', vendor.vendorCoverage);

  if (!vendor.vendorCoverage && vendor.vendorProfile?.city) {
    // Create coverage with the profile city
    const coverage = await db.vendorCoverage.create({
      data: {
        vendorId: vendor.id,
        coverageType: "CITY_WIDE",
        cities: [vendor.vendorProfile.city],
        pincodes: [],
      },
    });
    console.log('\n✅ Coverage created:', coverage);
  } else if (vendor.vendorCoverage) {
    console.log('\n⚠️ Coverage already exists');
  } else {
    console.log('\n❌ No city in profile to create coverage from');
  }

  await db.$disconnect();
}

fixCoverage().catch(console.error);

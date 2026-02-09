import { db } from "./src/server/db";

async function verifyFilter() {
  const now = new Date();

  // Check Shruti's vendor profile
  const vendor = await db.user.findFirst({
    where: { email: 'shruti@cre8r.in' },
    include: {
      vendorProfile: true,
      vendorCoverage: true,
    }
  });

  console.log('=== 4-POINT FILTER CHECK FOR SHRUTI ===\n');

  // Check 1: Approval Status
  const approved = vendor?.vendorProfile?.approvalStatus === 'APPROVED';
  console.log('1. Approval Status:', vendor?.vendorProfile?.approvalStatus);
  console.log('   Pass:', approved ? '✅' : '❌');

  // Check 2: Subscription Status
  const subscriptionStatus = vendor?.vendorProfile?.subscriptionStatus;
  const trialEndsAt = vendor?.vendorProfile?.trialEndsAt;
  const activeUntil = vendor?.vendorProfile?.activeUntil;

  let subscriptionValid = false;
  if (subscriptionStatus === 'TRIAL' && trialEndsAt && new Date(trialEndsAt) > now) {
    subscriptionValid = true;
  } else if (subscriptionStatus === 'ACTIVE' && activeUntil && new Date(activeUntil) > now) {
    subscriptionValid = true;
  }

  console.log('\n2. Subscription Status:', subscriptionStatus);
  console.log('   Trial Ends At:', trialEndsAt);
  console.log('   Now:', now);
  console.log('   Pass:', subscriptionValid ? '✅' : '❌');

  // Check 3: Coverage matches restaurant city
  const restaurantCity = 'Mumbai';
  const cities = vendor?.vendorCoverage?.cities as string[] || [];
  const coverageMatch = cities.some(c => c.toLowerCase() === restaurantCity.toLowerCase());

  console.log('\n3. Coverage Check:');
  console.log('   Vendor cities:', cities);
  console.log('   Restaurant city:', restaurantCity);
  console.log('   Pass:', coverageMatch ? '✅' : '❌');

  // Check 4: Product active
  const products = await db.vendorProduct.findMany({
    where: { vendorId: vendor?.id },
    include: { product: true }
  });

  console.log('\n4. Product Active Check:');
  products.forEach(p => {
    const vpActive = p.isActive;
    const mpActive = p.product?.isActive;
    console.log(`   - ${p.name || 'unnamed'}: VendorProduct=${vpActive}, MarketplaceProduct=${mpActive}`);
    console.log('     Pass:', (vpActive && mpActive) ? '✅' : '❌');
  });

  // Final
  console.log('\n=== FINAL RESULT ===');
  console.log('All checks pass:', (approved && subscriptionValid && coverageMatch) ? '✅ Product should show!' : '❌ Product will not show');

  await db.$disconnect();
}

verifyFilter().catch(console.error);

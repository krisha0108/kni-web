import { db } from "./src/server/db";

async function addMumbai() {
  const result = await db.vendorCoverage.update({
    where: {
      vendorId: 'cmlahhi4z000atyzkohbuqj49' // Shruti's vendor ID
    },
    data: {
      cities: ['ahmedabad', 'Mumbai'],
    },
  });

  console.log('✅ Coverage updated:', result);
  await db.$disconnect();
}

addMumbai().catch(console.error);

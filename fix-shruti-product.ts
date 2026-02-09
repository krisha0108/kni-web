import { db } from "./src/server/db";

async function fixProduct() {
  // Find the "sd" MarketplaceProduct
  const sdProduct = await db.marketplaceProduct.findFirst({
    where: { name: 'sd' },
    include: {
      marketplaceCategory: true,
      marketplaceSubCategory: true,
    }
  });

  console.log('=== SD MARKETPLACE PRODUCT ===');
  console.log('ID:', sdProduct?.id);
  console.log('Name:', sdProduct?.name);
  console.log('Category:', sdProduct?.marketplaceCategory?.name);
  console.log('CategoryId:', sdProduct?.marketplaceCategoryId);

  // Find Shruti's broken VendorProduct
  const vendorProduct = await db.vendorProduct.findFirst({
    where: { vendorId: 'cmlahhi4z000atyzkohbuqj49' }
  });

  console.log('\n=== SHRUTI VENDOR PRODUCT (BEFORE) ===');
  console.log('ID:', vendorProduct?.id);
  console.log('productId:', vendorProduct?.productId);
  console.log('name:', vendorProduct?.name);

  if (sdProduct && vendorProduct) {
    // Update the VendorProduct to link to the MarketplaceProduct
    const updated = await db.vendorProduct.update({
      where: { id: vendorProduct.id },
      data: {
        productId: sdProduct.id,
        // Also update the old category fields if they exist in schema
        name: sdProduct.name,
        categoryId: sdProduct.categoryId, // If this field exists
      }
    });

    console.log('\n=== SHRUTI VENDOR PRODUCT (AFTER) ===');
    console.log('ID:', updated.id);
    console.log('productId:', updated.productId);
    console.log('name:', updated.name);
    console.log('✅ Product linked successfully!');
  }

  await db.$disconnect();
}

fixProduct().catch(console.error);

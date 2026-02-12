import { db } from "@/server/db";

// ========================================
// VENDOR RATING SYSTEM
// ========================================

export interface CreateVendorRatingInput {
  orderId: string;
  vendorId: string;
  ownerId: string;
  restaurantId: string;
  overallRating: number;
  productQuality?: number;
  deliveryTime?: number;
  customerService?: number;
  valueForMoney?: number;
  packaging?: number;
  review?: string;
  images?: string[];
}

/**
 * Create or update vendor rating
 */
export async function createVendorRating(input: CreateVendorRatingInput) {
  // Validate ratings (1-5)
  const ratings = [
    input.overallRating,
    input.productQuality,
    input.deliveryTime,
    input.customerService,
    input.valueForMoney,
    input.packaging,
  ].filter((r) => r !== undefined);

  for (const rating of ratings) {
    if (rating! < 1 || rating! > 5) {
      throw new Error("Ratings must be between 1 and 5");
    }
  }

  // Check if order exists and is delivered
  const order = await db.marketplaceOrder.findUnique({
    where: { id: input.orderId },
    select: { status: true },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status !== "DELIVERED") {
    throw new Error("Can only rate delivered orders");
  }

  // Check if rating already exists
  const existing = await db.vendorRating.findUnique({
    where: { orderId: input.orderId },
  });

  let rating;
  if (existing) {
    // Update existing rating
    rating = await db.vendorRating.update({
      where: { orderId: input.orderId },
      data: {
        overallRating: input.overallRating,
        productQuality: input.productQuality,
        deliveryTime: input.deliveryTime,
        customerService: input.customerService,
        valueForMoney: input.valueForMoney,
        packaging: input.packaging,
        review: input.review,
        images: input.images || [],
      },
    });
  } else {
    // Create new rating (auto-publish)
    rating = await db.vendorRating.create({
      data: {
        orderId: input.orderId,
        vendorId: input.vendorId,
        ownerId: input.ownerId,
        restaurantId: input.restaurantId,
        overallRating: input.overallRating,
        productQuality: input.productQuality,
        deliveryTime: input.deliveryTime,
        customerService: input.customerService,
        valueForMoney: input.valueForMoney,
        packaging: input.packaging,
        review: input.review,
        images: input.images || [],
        isPublished: true,
      },
    });
  }

  // Update vendor stats
  await updateVendorStats(input.vendorId);

  return rating;
}

/**
 * Calculate and update vendor statistics
 */
export async function updateVendorStats(vendorId: string) {
  // Get all ratings for this vendor
  const ratings = await db.vendorRating.findMany({
    where: { vendorId, isPublished: true },
  });

  if (ratings.length === 0) {
    // No ratings yet, create empty stats
    await db.vendorStats.upsert({
      where: { vendorId },
      create: {
        vendorId,
        averageRating: 0,
        totalRatings: 0,
        fiveStarCount: 0,
        fourStarCount: 0,
        threeStarCount: 0,
        twoStarCount: 0,
        oneStarCount: 0,
      },
      update: {
        averageRating: 0,
        totalRatings: 0,
        fiveStarCount: 0,
        fourStarCount: 0,
        threeStarCount: 0,
        twoStarCount: 0,
        oneStarCount: 0,
      },
    });
    return;
  }

  // Calculate stats
  const totalRatings = ratings.length;
  const sumRating = ratings.reduce((sum, r) => sum + r.overallRating, 0);
  const averageRating = sumRating / totalRatings;

  const fiveStarCount = ratings.filter((r) => r.overallRating === 5).length;
  const fourStarCount = ratings.filter((r) => r.overallRating === 4).length;
  const threeStarCount = ratings.filter((r) => r.overallRating === 3).length;
  const twoStarCount = ratings.filter((r) => r.overallRating === 2).length;
  const oneStarCount = ratings.filter((r) => r.overallRating === 1).length;

  // Calculate category averages
  const calcAverage = (field: keyof typeof ratings[0]) => {
    const values = ratings
      .map((r) => r[field])
      .filter((v) => v !== null) as number[];
    return values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : null;
  };

  const averageProductQuality = calcAverage("productQuality");
  const averageDeliveryTime = calcAverage("deliveryTime");
  const averageCustomerService = calcAverage("customerService");
  const averageValueForMoney = calcAverage("valueForMoney");
  const averagePackaging = calcAverage("packaging");

  // Upsert stats
  await db.vendorStats.upsert({
    where: { vendorId },
    create: {
      vendorId,
      averageRating,
      totalRatings,
      fiveStarCount,
      fourStarCount,
      threeStarCount,
      twoStarCount,
      oneStarCount,
      averageProductQuality,
      averageDeliveryTime,
      averageCustomerService,
      averageValueForMoney,
      averagePackaging,
    },
    update: {
      averageRating,
      totalRatings,
      fiveStarCount,
      fourStarCount,
      threeStarCount,
      twoStarCount,
      oneStarCount,
      averageProductQuality,
      averageDeliveryTime,
      averageCustomerService,
      averageValueForMoney,
      averagePackaging,
    },
  });
}

// ========================================
// ENGINEER RATING SYSTEM
// ========================================

export interface CreateEngineerRatingInput {
  assignmentId: string;
  engineerId: string;
  ownerId: string;
  restaurantId: string;
  bookingId: string;
  overallRating: number;
  professionalism?: number;
  technicalSkill?: number;
  communication?: number;
  punctuality?: number;
  problemSolving?: number;
  review?: string;
  images?: string[];
}

/**
 * Create or update engineer rating
 */
export async function createEngineerRating(input: CreateEngineerRatingInput) {
  // Validate ratings (1-5)
  const ratings = [
    input.overallRating,
    input.professionalism,
    input.technicalSkill,
    input.communication,
    input.punctuality,
    input.problemSolving,
  ].filter((r) => r !== undefined);

  for (const rating of ratings) {
    if (rating! < 1 || rating! > 5) {
      throw new Error("Ratings must be between 1 and 5");
    }
  }

  // Check if assignment exists and is completed
  const assignment = await db.engineerAssignment.findUnique({
    where: { id: input.assignmentId },
    select: { status: true },
  });

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  if (assignment.status !== "COMPLETED") {
    throw new Error("Can only rate completed assignments");
  }

  // Check if rating already exists
  const existing = await db.engineerRating.findUnique({
    where: { assignmentId: input.assignmentId },
  });

  let rating;
  if (existing) {
    // Update existing rating
    rating = await db.engineerRating.update({
      where: { assignmentId: input.assignmentId },
      data: {
        overallRating: input.overallRating,
        professionalism: input.professionalism,
        technicalSkill: input.technicalSkill,
        communication: input.communication,
        punctuality: input.punctuality,
        problemSolving: input.problemSolving,
        review: input.review,
        images: input.images || [],
      },
    });
  } else {
    // Create new rating
    rating = await db.engineerRating.create({
      data: {
        assignmentId: input.assignmentId,
        engineerId: input.engineerId,
        ownerId: input.ownerId,
        restaurantId: input.restaurantId,
        bookingId: input.bookingId,
        overallRating: input.overallRating,
        professionalism: input.professionalism,
        technicalSkill: input.technicalSkill,
        communication: input.communication,
        punctuality: input.punctuality,
        problemSolving: input.problemSolving,
        review: input.review,
        images: input.images || [],
      },
    });
  }

  // Update engineer stats
  await updateEngineerStats(input.engineerId);

  return rating;
}

/**
 * Calculate and update engineer statistics
 */
export async function updateEngineerStats(engineerId: string) {
  // Get all ratings for this engineer
  const ratings = await db.engineerRating.findMany({
    where: { engineerId, isPublished: true },
  });

  if (ratings.length === 0) {
    // No ratings yet, create empty stats
    await db.engineerStats.upsert({
      where: { engineerId },
      create: {
        engineerId,
        averageRating: 0,
        totalRatings: 0,
        fiveStarCount: 0,
        fourStarCount: 0,
        threeStarCount: 0,
        twoStarCount: 0,
        oneStarCount: 0,
      },
      update: {
        averageRating: 0,
        totalRatings: 0,
        fiveStarCount: 0,
        fourStarCount: 0,
        threeStarCount: 0,
        twoStarCount: 0,
        oneStarCount: 0,
      },
    });
    return;
  }

  // Calculate stats
  const totalRatings = ratings.length;
  const sumRating = ratings.reduce((sum, r) => sum + r.overallRating, 0);
  const averageRating = sumRating / totalRatings;

  const fiveStarCount = ratings.filter((r) => r.overallRating === 5).length;
  const fourStarCount = ratings.filter((r) => r.overallRating === 4).length;
  const threeStarCount = ratings.filter((r) => r.overallRating === 3).length;
  const twoStarCount = ratings.filter((r) => r.overallRating === 2).length;
  const oneStarCount = ratings.filter((r) => r.overallRating === 1).length;

  // Calculate category averages
  const calcAverage = (field: keyof typeof ratings[0]) => {
    const values = ratings
      .map((r) => r[field])
      .filter((v) => v !== null) as number[];
    return values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : null;
  };

  const averageProfessionalism = calcAverage("professionalism");
  const averageTechnicalSkill = calcAverage("technicalSkill");
  const averageCommunication = calcAverage("communication");
  const averagePunctuality = calcAverage("punctuality");
  const averageProblemSolving = calcAverage("problemSolving");

  // Upsert stats
  await db.engineerStats.upsert({
    where: { engineerId },
    create: {
      engineerId,
      averageRating,
      totalRatings,
      fiveStarCount,
      fourStarCount,
      threeStarCount,
      twoStarCount,
      oneStarCount,
      averageProfessionalism,
      averageTechnicalSkill,
      averageCommunication,
      averagePunctuality,
      averageProblemSolving,
    },
    update: {
      averageRating,
      totalRatings,
      fiveStarCount,
      fourStarCount,
      threeStarCount,
      twoStarCount,
      oneStarCount,
      averageProfessionalism,
      averageTechnicalSkill,
      averageCommunication,
      averagePunctuality,
      averageProblemSolving,
    },
  });
}

// ========================================
// QUERY FUNCTIONS
// ========================================

/**
 * Get vendor stats with ratings
 */
export async function getVendorStats(vendorId: string) {
  const stats = await db.vendorStats.findUnique({
    where: { vendorId },
  });

  const recentRatings = await db.vendorRating.findMany({
    where: { vendorId, isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      owner: { select: { name: true } },
      restaurant: { select: { name: true } },
    },
  });

  return {
    stats,
    recentRatings,
  };
}

/**
 * Get engineer stats with ratings
 */
export async function getEngineerStats(engineerId: string) {
  const stats = await db.engineerStats.findUnique({
    where: { engineerId },
  });

  const recentRatings = await db.engineerRating.findMany({
    where: { engineerId, isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      owner: { select: { name: true } },
      restaurant: { select: { name: true } },
    },
  });

  return {
    stats,
    recentRatings,
  };
}

/**
 * Get top rated vendors
 */
export async function getTopRatedVendors(limit: number = 10) {
  const topVendors = await db.vendorStats.findMany({
    where: {
      totalRatings: { gte: 5 }, // At least 5 ratings
    },
    orderBy: [
      { averageRating: "desc" },
      { totalRatings: "desc" },
    ],
    take: limit,
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return topVendors;
}

/**
 * Get top rated engineers
 */
export async function getTopRatedEngineers(limit: number = 10) {
  const topEngineers = await db.engineerStats.findMany({
    where: {
      totalRatings: { gte: 5 }, // At least 5 ratings
    },
    orderBy: [
      { averageRating: "desc" },
      { totalRatings: "desc" },
    ],
    take: limit,
    include: {
      engineer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return topEngineers;
}

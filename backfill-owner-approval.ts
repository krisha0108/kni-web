import { db } from "./src/server/db";

// One-time backfill for the owner-approval-gate feature.
// New OwnerProfile rows default to approvalStatus: PENDING, which would lock
// out every owner who registered before this change. This script:
//   1. Approves every OwnerProfile that already existed (has a restaurant,
//      has logged in before, etc. — they were never meant to be gated).
//   2. Creates a missing OwnerProfile (as APPROVED) for any OWNER user who
//      doesn't have one yet — this covers Google-signup owners created
//      before the google-login route started creating a profile.
// Safe to run multiple times.
async function backfillOwnerApproval() {
  const now = new Date();

  const approvedExisting = await db.ownerProfile.updateMany({
    where: { approvalStatus: "PENDING" },
    data: { approvalStatus: "APPROVED", approvedAt: now },
  });
  console.log(`Approved ${approvedExisting.count} existing OwnerProfile row(s).`);

  const ownersWithoutProfile = await db.user.findMany({
    where: { role: "OWNER", deletedAt: null, ownerProfile: null },
    select: { id: true, email: true },
  });

  for (const owner of ownersWithoutProfile) {
    await db.ownerProfile.create({
      data: { userId: owner.id, approvalStatus: "APPROVED", approvedAt: now },
    });
  }
  console.log(`Created ${ownersWithoutProfile.length} missing OwnerProfile row(s) (approved).`);

  await db.$disconnect();
}

backfillOwnerApproval().catch((err) => {
  console.error(err);
  process.exit(1);
});

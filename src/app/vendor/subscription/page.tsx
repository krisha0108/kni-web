import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { SubscriptionFlow } from "./subscription-flow";

export default async function VendorSubscriptionPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const vendorProfile = await db.vendorProfile.findUnique({
    where: { userId: session.id },
  });

  if (vendorProfile?.approvalStatus !== "APPROVED") {
    redirect("/vendor/pending");
  }

  // Fetch latest subscription request
  const latestRequest = await db.vendorSubscriptionRequest.findFirst({
    where: { vendorId: session.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <SubscriptionFlow
      subscriptionStatus={vendorProfile.subscriptionStatus}
      trialEndsAt={vendorProfile.trialEndsAt?.toISOString() ?? null}
      activeUntil={vendorProfile.activeUntil?.toISOString() ?? null}
      latestRequest={latestRequest ? {
        id: latestRequest.id,
        durationMonths: latestRequest.durationMonths,
        status: latestRequest.status,
        price: latestRequest.price,
        screenshotUrl: latestRequest.screenshotUrl,
        rejectionReason: latestRequest.rejectionReason,
        adminNote: latestRequest.adminNote,
        activeUntil: latestRequest.activeUntil?.toISOString() ?? null,
        createdAt: latestRequest.createdAt.toISOString(),
      } : null}
    />
  );
}

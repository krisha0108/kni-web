import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, Clock, ShoppingCart, CheckCircle } from "lucide-react";

export default async function VendorDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const vendorProfile = await db.vendorProfile.findUnique({
    where: { userId: session.id },
  });

  // If not approved, redirect to pending page
  if (vendorProfile?.approvalStatus !== "APPROVED") {
    redirect("/vendor/pending");
  }

  // If subscription expired or blocked, redirect to subscription page
  if (vendorProfile?.subscriptionStatus === "EXPIRED" || 
      vendorProfile?.subscriptionStatus === "BLOCKED") {
    redirect("/vendor/subscription");
  }

  const [products, orders] = await Promise.all([
    db.vendorProduct.count({
      where: { vendorId: session.id, isActive: true, deletedAt: null },
    }),
    db.marketplaceOrder.count({
      where: { vendorId: session.id },
    }),
  ]);

  const subscriptionStatus = vendorProfile?.subscriptionStatus;
  const trialEndsAt = vendorProfile?.trialEndsAt;
  const activeUntil = vendorProfile?.activeUntil;

  const getSubscriptionInfo = () => {
    if (subscriptionStatus === "TRIAL" && trialEndsAt) {
      const daysLeft = Math.ceil(
        (trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return { label: "Trial", daysLeft, variant: "warning" as const };
    }
    if (subscriptionStatus === "ACTIVE" && activeUntil) {
      const daysLeft = Math.ceil(
        (activeUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return { label: "Active", daysLeft, variant: "success" as const };
    }
    return { label: subscriptionStatus || "Unknown", daysLeft: 0, variant: "default" as const };
  };

  const subInfo = getSubscriptionInfo();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={subInfo.variant}>{subInfo.label}</Badge>
            {subInfo.daysLeft > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {subInfo.daysLeft} days remaining
              </p>
            )}
            <Button size="sm" variant="outline" asChild className="mt-2">
              <Link href="/vendor/subscription">Manage</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products}</div>
            <Button size="sm" variant="outline" asChild className="mt-2">
              <Link href="/vendor/products">Manage Products</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders}</div>
            <p className="text-xs text-muted-foreground">
              From restaurant owners
            </p>
            <Button size="sm" variant="outline" asChild className="mt-2">
              <Link href="/vendor/orders">View Orders</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="success">Approved</Badge>
            <p className="text-xs text-muted-foreground mt-2">
              You can add products
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

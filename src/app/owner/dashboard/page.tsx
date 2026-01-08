import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ShoppingCart, Calendar, Package } from "lucide-react";

export default async function OwnerDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [restaurant, bookings, cart] = await Promise.all([
    db.restaurant.findFirst({
      where: { ownerId: session.id },
      orderBy: { createdAt: "desc" },
    }),
    db.serviceBooking.findMany({
      where: { ownerId: session.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.cart.findFirst({
      where: { 
        ownerId: session.id, 
        status: "DRAFT" 
      },
      include: { items: true },
    }),
  ]);

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
    PENDING: "warning",
    APPROVED: "success",
    REJECTED: "destructive",
    DRAFT: "secondary",
    SLOT_SELECTED: "warning",
    PAYMENT_UPLOADED: "warning",
    PAYMENT_VERIFIED: "success",
    PAYMENT_REJECTED: "destructive",
    ENGINEER_ASSIGNED: "default",
    ACCEPTED_BY_ENGINEER: "success",
    COMPLETED: "success",
    CANCELLED: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Owner Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Restaurant Status</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {restaurant ? (
              <>
                <div className="text-lg font-bold">{restaurant.name}</div>
                <Badge variant={statusColors[restaurant.status] || "default"}>
                  {restaurant.status}
                </Badge>
              </>
            ) : (
              <>
                <div className="text-lg font-bold">No Restaurant</div>
                <Button size="sm" asChild className="mt-2">
                  <Link href="/owner/restaurant/create">Create Restaurant</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cart Items</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cart?.items.length || 0}
            </div>
            {cart && cart.items.length > 0 && (
              <Button size="sm" variant="outline" asChild className="mt-2">
                <Link href="/owner/cart">View Cart</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
            <Button size="sm" variant="outline" asChild className="mt-2">
              <Link href="/owner/bookings">View All</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Browse Services</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Find services for your restaurant
            </p>
            <Button size="sm" asChild className="mt-2">
              <Link href="/owner/feed">Browse Feed</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {bookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Your latest service bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">Booking #{booking.id.slice(-8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.slotStartDateTime
                        ? new Date(booking.slotStartDateTime).toLocaleDateString()
                        : "No slot selected"}
                    </p>
                  </div>
                  <Badge variant={statusColors[booking.status] || "default"}>
                    {booking.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

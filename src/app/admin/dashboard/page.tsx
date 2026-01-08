import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";
import { Building2, Store, Users, ClipboardList, Package, FolderOpen } from "lucide-react";

export default async function AdminDashboardPage() {
  const [
    pendingRestaurants,
    pendingVendors,
    pendingBookings,
    totalCategories,
    totalEngineers,
    totalServices,
  ] = await Promise.all([
    db.restaurant.count({ where: { status: "PENDING" } }),
    db.vendorProfile.count({ where: { approvalStatus: "PENDING" } }),
    db.serviceBooking.count({ where: { status: "PAYMENT_UPLOADED" } }),
    db.category.count({ where: { isActive: true, deletedAt: null } }),
    db.user.count({ where: { role: "ENGINEER", isActive: true } }),
    db.serviceItem.count({ where: { isActive: true, deletedAt: null } }),
  ]);

  const stats = [
    {
      title: "Pending Restaurants",
      value: pendingRestaurants,
      icon: Building2,
      description: "Awaiting approval",
    },
    {
      title: "Pending Vendors",
      value: pendingVendors,
      icon: Store,
      description: "Awaiting approval",
    },
    {
      title: "Pending Payments",
      value: pendingBookings,
      icon: ClipboardList,
      description: "Need verification",
    },
    {
      title: "Active Categories",
      value: totalCategories,
      icon: FolderOpen,
      description: "In catalog",
    },
    {
      title: "Active Engineers",
      value: totalEngineers,
      icon: Users,
      description: "Available for jobs",
    },
    {
      title: "Active Services",
      value: totalServices,
      icon: Package,
      description: "In catalog",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of KNI Super App management
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

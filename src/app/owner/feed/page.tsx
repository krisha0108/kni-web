import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertCircle, FolderOpen, Wrench, Tag } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function OwnerFeedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const restaurant = await db.restaurant.findFirst({
    where: { ownerId: session.id, status: "APPROVED" },
  });

  if (!restaurant) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Restaurant Not Approved</AlertTitle>
          <AlertDescription>
            You need an approved restaurant to browse services.
            <div className="mt-4">
              <Button asChild>
                <Link href="/owner/restaurant/status">Check Status</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const categories = await db.category.findMany({
    where: { isActive: true, deletedAt: null },
    include: {
      _count: {
        select: {
          serviceItems: { where: { isActive: true, deletedAt: null } },
          partItems: { where: { isActive: true, deletedAt: null } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Service Categories</h1>
        <p className="text-muted-foreground">Browse services and parts for {restaurant.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Card key={category.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                {category.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Wrench className="h-4 w-4" />
                  <span>{category._count.serviceItems} services</span>
                </div>
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  <span>{category._count.partItems} parts</span>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href={"/owner/category/" + category.id}>View Items</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No categories available yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

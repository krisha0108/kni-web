"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Wrench, Tag, Plus, ArrowLeft } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  subCategoryId?: string;
  subCategory?: { id: string; name: string };
}

interface PartItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  subCategoryId?: string;
  subCategory?: { id: string; name: string };
}

interface CategoryData {
  category: {
    id: string;
    name: string;
  };
  services: ServiceItem[];
  parts: PartItem[];
}

export default function OwnerCategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;
  const [categoryData, setCategoryData] = useState<CategoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategory();
  }, [categoryId]);

  const fetchCategory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/public/categories/${categoryId}`);
      const data = await response.json();
      if (data.ok) {
        setCategoryData(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch category",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load category",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async (itemType: "SERVICE" | "PART", itemId: string, itemName: string) => {
    setAddingItem(itemId);
    try {
      const response = await fetch("/api/owner/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType,
          [itemType === "SERVICE" ? "serviceItemId" : "partItemId"]: itemId,
          qty: 1,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: `${itemName} added to cart`,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add to cart",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive",
      });
    } finally {
      setAddingItem(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading category...</p>
      </div>
    );
  }

  if (!categoryData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-lg text-muted-foreground">Category not found</p>
        <Button asChild>
          <Link href="/owner/equipment">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Equipment
          </Link>
        </Button>
      </div>
    );
  }

  const { category, services, parts } = categoryData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/owner/equipment">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold">{category.name}</h1>
          <p className="text-muted-foreground">
            {services?.length || 0} services, {parts?.length || 0} parts available
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/owner/cart">
            <ShoppingCart className="mr-2 h-4 w-4" />
            View Cart
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="services">
            <Wrench className="h-4 w-4 mr-2" />
            Services ({services?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="parts">
            <Tag className="h-4 w-4 mr-2" />
            Parts ({parts?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-6">
          {!services || services.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No services available in this category
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Card key={service.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <span className="text-lg">{service.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {formatPrice(service.price)}
                      </Badge>
                    </CardTitle>
                    {service.subCategory && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {service.subCategory.name}
                        </Badge>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {service.description && (
                      <p className="text-sm text-muted-foreground mb-4 flex-1">
                        {service.description}
                      </p>
                    )}
                    <Button
                      onClick={() => handleAddToCart("SERVICE", service.id, service.name)}
                      disabled={addingItem === service.id}
                      className="w-full"
                    >
                      {addingItem === service.id ? (
                        <>Adding...</>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="parts" className="mt-6">
          {!parts || parts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No parts available in this category
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {parts.map((part) => (
              <Card key={part.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span className="text-lg">{part.name}</span>
                    <Badge variant="outline" className="ml-2">
                      {formatPrice(part.price)}
                    </Badge>
                  </CardTitle>
                  {part.subCategory && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {part.subCategory.name}
                      </Badge>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {part.description && (
                    <p className="text-sm text-muted-foreground mb-4 flex-1">
                      {part.description}
                    </p>
                  )}
                  <Button
                    onClick={() => handleAddToCart("PART", part.id, part.name)}
                    disabled={addingItem === part.id}
                    className="w-full"
                  >
                    {addingItem === part.id ? (
                      <>Adding...</>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add to Cart
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

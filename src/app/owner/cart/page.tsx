"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ShoppingCart, ArrowRight, Minus, Plus, Wrench, Package, Grid3X3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
}

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  category?: Category;
  subCategory?: SubCategory;
}

interface PartItem {
  id: string;
  name: string;
  price: number;
  category?: Category;
  subCategory?: SubCategory;
}

interface CartItem {
  id: string;
  qty: number;
  priceSnapshot: number;
  itemType: "SERVICE" | "PART";
  serviceItem?: ServiceItem;
  partItem?: PartItem;
}

interface Cart {
  id: string;
  items: CartItem[];
}

interface GroupedCategory {
  categoryId: string;
  categoryName: string;
  services: CartItem[];
  parts: CartItem[];
}

export default function OwnerCartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const fetchCart = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/owner/cart");
      const data = await response.json();
      if (data.ok) {
        setCart(data.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch cart",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setIsUpdating(itemId);
    try {
      const response = await fetch("/api/owner/cart/items/" + itemId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      const data = await response.json();
      if (data.ok) {
        fetchCart();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update item", variant: "destructive" });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setIsUpdating(itemId);
    try {
      const response = await fetch("/api/owner/cart/items/" + itemId, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Item removed from cart" });
        fetchCart();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to remove item", variant: "destructive" });
    } finally {
      setIsUpdating(null);
    }
  };

  // Group items by category
  const groupedByCategory = useMemo(() => {
    if (!cart?.items) return [];

    const groups: Record<string, GroupedCategory> = {};

    cart.items.forEach((item) => {
      const itemData = item.serviceItem || item.partItem;
      const category = itemData?.category;
      const categoryId = category?.id || "uncategorized";
      const categoryName = category?.name || "Uncategorized";

      if (!groups[categoryId]) {
        groups[categoryId] = {
          categoryId,
          categoryName,
          services: [],
          parts: [],
        };
      }

      if (item.itemType === "SERVICE" || item.serviceItem) {
        groups[categoryId].services.push(item);
      } else {
        groups[categoryId].parts.push(item);
      }
    });

    return Object.values(groups);
  }, [cart?.items]);

  const calculateTotal = () => {
    if (!cart?.items) return 0;
    return cart.items.reduce((total, item) => {
      const price = item.serviceItem?.price || item.partItem?.price || item.priceSnapshot || 0;
      return total + price * item.qty;
    }, 0);
  };

  const calculateCategoryTotal = (category: GroupedCategory) => {
    const allItems = [...category.services, ...category.parts];
    return allItems.reduce((total, item) => {
      const price = item.serviceItem?.price || item.partItem?.price || item.priceSnapshot || 0;
      return total + price * item.qty;
    }, 0);
  };

  const handleProceedToBooking = () => {
    router.push("/owner/request-now");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading cart...</p>
      </div>
    );
  }

  const items = cart?.items || [];
  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

  const renderItemRow = (item: CartItem, isService: boolean) => {
    const itemData = item.serviceItem || item.partItem;
    const price = itemData?.price || item.priceSnapshot || 0;
    const subCategory = item.serviceItem?.subCategory || item.partItem?.subCategory;

    return (
      <div
        key={item.id}
        className={`flex items-center justify-between p-3 rounded-lg border ${
          isService ? "bg-blue-50/50 border-blue-100" : "bg-green-50/50 border-green-100"
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              isService ? "bg-blue-100" : "bg-green-100"
            }`}
          >
            {isService ? (
              <Wrench className={`h-4 w-4 text-blue-600`} />
            ) : (
              <Package className={`h-4 w-4 text-green-600`} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{itemData?.name}</p>
            {subCategory && (
              <p className="text-xs text-muted-foreground">{subCategory.name}</p>
            )}
            <p className={`text-sm font-semibold ${isService ? "text-blue-600" : "text-green-600"}`}>
              {formatPrice(price)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleUpdateQuantity(item.id, item.qty - 1)}
              disabled={isUpdating === item.id || item.qty <= 1}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleUpdateQuantity(item.id, item.qty + 1)}
              disabled={isUpdating === item.id}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => handleRemoveItem(item.id)}
            disabled={isUpdating === item.id}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderCategoryCard = (category: GroupedCategory) => {
    const categoryTotal = calculateCategoryTotal(category);
    const itemCount = category.services.length + category.parts.length;

    return (
      <Card key={category.categoryId} className="overflow-hidden">
        {/* Category Header */}
        <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-foreground" />
            <h3 className="font-bold text-lg">{category.categoryName}</h3>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{itemCount} items</p>
            <p className="font-bold text-primary">{formatPrice(categoryTotal)}</p>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Services Section */}
          {category.services.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Wrench className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-600 uppercase">
                  Services ({category.services.length})
                </span>
              </div>
              <div className="space-y-2">
                {category.services.map((item) => renderItemRow(item, true))}
              </div>
            </div>
          )}

          {/* Parts Section */}
          {category.parts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Package className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-600 uppercase">
                  Parts ({category.parts.length})
                </span>
              </div>
              <div className="space-y-2">
                {category.parts.map((item) => renderItemRow(item, false))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Your Cart</h1>
        <p className="text-muted-foreground">
          Review items before booking a service ({totalItems} items in {groupedByCategory.length} categories)
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Your cart is empty</p>
            <Button className="mt-4" onClick={() => router.push("/owner/equipment")}>
              Go to My Equipment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {groupedByCategory.map(renderCategoryCard)}
          </div>

          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category breakdown */}
                <div className="space-y-2">
                  {groupedByCategory.map((category) => (
                    <div key={category.categoryId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{category.categoryName}</span>
                      <span>{formatPrice(calculateCategoryTotal(category))}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Total Items</span>
                    <span>{totalItems}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Categories</span>
                    <span>{groupedByCategory.length}</span>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(calculateTotal())}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleProceedToBooking}>
                  Proceed to Booking
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
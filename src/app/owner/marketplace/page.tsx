"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ClientOnly } from "@/components/client-only";
import { fetchCart, addCartItem, updateCartItemQuantity } from "@/lib/marketplace-cart";
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Store,
  Building2,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useRestaurant } from "@/contexts/restaurant-context";
import { ProductDetailDialog } from "./components/product-detail-dialog";
import type { Product, Category, CartItem } from "./types";

export default function OwnerMarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();
  const router = useRouter();

  const userRole = selectedRestaurant?.role;
  const canCreate = userRole === "OWNER" || userRole === "MANAGER";

  // ========== CART MANAGEMENT (Server-Side) ==========

  // Load cart from server
  const reloadCart = useCallback(async () => {
    if (!selectedRestaurant) return;
    try {
      const data = await fetchCart(selectedRestaurant.restaurantId);
      setCart(data.items as CartItem[]);
    } catch (error: any) {
      console.error("Load cart error:", error);
      setCart([]);
    }
  }, [selectedRestaurant]);

  // Restore cart on mount and restaurant change
  useEffect(() => {
    reloadCart();
  }, [reloadCart]);

  const fetchProducts = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append("restaurantId", selectedRestaurant.restaurantId);
      if (search) params.append("search", search);
      if (categoryId && categoryId !== "all") params.append("categoryId", categoryId);

      const response = await fetch("/api/owner/marketplace/products?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setProducts(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch products",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/public/marketplace-categories");
      const data = await response.json();
      if (data.ok) {
        setCategories(data.data);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (selectedRestaurant) {
      fetchProducts();
    }
  }, [selectedRestaurant, search, categoryId]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Re-read cart + payments when page becomes visible (handles navigation back from cart/payment)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        reloadCart();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [reloadCart]);

  const addToCart = async (product: Product) => {
    if (!selectedRestaurant) return;
    try {
      const existing = cart.find((item) => item.product.id === product.id);
      const newQuantity = existing ? Math.min(existing.quantity + 1, product.stockQuantity) : 1;
      
      const data = await addCartItem(selectedRestaurant.restaurantId, product.id, newQuantity);
      setCart(data.items as CartItem[]);
      toast({ title: "Added to cart", description: product.name });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add to cart", variant: "destructive" });
    }
  };

  const updateCartQuantity = async (productId: string, delta: number) => {
    if (!selectedRestaurant) return;
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;
    
    const newQty = item.quantity + delta;
    
    try {
      if (newQty <= 0) {
        // Remove item by setting quantity to 0
        await addCartItem(selectedRestaurant.restaurantId, productId, 0);
      } else {
        const clamped = Math.min(newQty, item.product.stockQuantity);
        await updateCartItemQuantity(item.id, clamped);
      }
      await reloadCart();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update cart", variant: "destructive" });
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const getCartItemQuantity = (productId: string) => {
    const item = cart.find((i) => i.product.id === productId);
    return item?.quantity || 0;
  };

  if (!selectedRestaurant) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">Please select a restaurant</p>
          <p className="text-sm text-muted-foreground mt-2">Use the restaurant switcher in the header to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">Browse and order products from vendors delivering to {selectedRestaurant.restaurant.name}</p>
        </div>
        {canCreate && cart.length > 0 && (
          <Button onClick={() => router.push("/owner/marketplace/cart")}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Cart ({cart.length}) - {formatPrice(getCartTotal())}
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <ClientOnly>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ClientOnly>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No products found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const cartQty = getCartItemQuantity(product.id);
            return (
              <Card
                key={product.id}
                className={`flex flex-col cursor-pointer hover:shadow-md transition-shadow ${product.isAdminStore ? "border-blue-200 ring-1 ring-blue-100" : ""}`}
                onClick={() => {
                  setSelectedProduct(product);
                  setIsProductDetailOpen(true);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="relative">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}
                    {product.isAdminStore && (
                      <div className="absolute top-1 left-1">
                        <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 shadow-sm">
                          KNI Official
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{product.category?.name || "Uncategorized"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                    <Store className="inline h-3 w-3" />
                    {product.vendor?.name || "Unknown Vendor"}
                    {product.isAdminStore && (
                      <Badge variant="default" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-blue-600">
                        Official
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Stock: {product.stockQuantity}
                  </p>
                </CardContent>
                <CardFooter
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-lg font-bold">{formatPrice(product.price)}</span>
                  {canCreate && (cartQty > 0 ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCartQuantity(product.id, -1);
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{cartQty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCartQuantity(product.id, 1);
                        }}
                        disabled={cartQty >= product.stockQuantity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      disabled={product.stockQuantity === 0}
                    >
                      Add to Cart
                    </Button>
                  ))}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        product={selectedProduct}
        open={isProductDetailOpen}
        onOpenChange={setIsProductDetailOpen}
        cartQuantity={selectedProduct ? getCartItemQuantity(selectedProduct.id) : 0}
        onAddToCart={addToCart}
        onUpdateQuantity={updateCartQuantity}
        canCreate={canCreate}
      />
    </div>
  );
}
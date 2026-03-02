"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
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
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Store,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useRestaurant } from "@/contexts/restaurant-context";
import { ProductDetailDialog } from "./components/product-detail-dialog";
import type { Product, Category, CartItem, PaymentRecord } from "./types";

export default function OwnerMarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentRecord[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  // ========== CART PERSISTENCE (localStorage) ==========

  // Load cart from localStorage
  const reloadCart = useCallback(() => {
    if (!selectedRestaurant) return;
    try {
      // Check if a vendor was paid → remove their items (matching mobile pattern)
      const paidVendorId = localStorage.getItem("marketplace_paid_vendor");
      const saved = localStorage.getItem(`marketplace_cart_${selectedRestaurant.restaurantId}`);
      let parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) parsed = [];

      if (paidVendorId) {
        parsed = parsed.filter((item: CartItem) => {
          const vid = item.product.vendor?.id || "unknown";
          return vid !== paidVendorId;
        });
        localStorage.setItem(
          `marketplace_cart_${selectedRestaurant.restaurantId}`,
          JSON.stringify(parsed)
        );
        localStorage.removeItem("marketplace_paid_vendor");
      }

      setCart(parsed);
    } catch {
      setCart([]);
    }
  }, [selectedRestaurant]);

  // Restore cart on mount, restaurant change, and on navigation (pathname changes)
  useEffect(() => {
    reloadCart();
  }, [reloadCart, pathname]);

  // Re-read cart when user navigates back to this page (window focus)
  useEffect(() => {
    const handleFocus = () => reloadCart();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [reloadCart]);

  const saveCart = (items: CartItem[]) => {
    setCart(items);
    if (selectedRestaurant) {
      try {
        localStorage.setItem(
          `marketplace_cart_${selectedRestaurant.restaurantId}`,
          JSON.stringify(items)
        );
      } catch {}
    }
  };

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

  const fetchPendingPayments = useCallback(async () => {
    if (!selectedRestaurant) return;
    try {
      const response = await fetch(
        `/api/owner/marketplace/payments?restaurantId=${selectedRestaurant.restaurantId}`
      );
      const data = await response.json();
      if (data.ok) {
        setPendingPayments(data.data);
      }
    } catch {
      // Ignore
    }
  }, [selectedRestaurant]);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchProducts();
    }
  }, [selectedRestaurant, search, categoryId]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchPendingPayments();
    }
  }, [selectedRestaurant, fetchPendingPayments]);

  // Re-read cart + payments when page becomes visible (handles navigation back from cart/payment)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        reloadCart();
        fetchPendingPayments();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [reloadCart, fetchPendingPayments]);

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      saveCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stockQuantity) }
            : item
        )
      );
    } else {
      saveCart([...cart, { product, quantity: 1 }]);
    }
    toast({ title: "Added to cart", description: product.name });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      saveCart(cart.filter((i) => i.product.id !== productId));
      return;
    }
    saveCart(
      cart.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: Math.min(newQty, i.product.stockQuantity) }
          : i
      )
    );
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
        {cart.length > 0 && (
          <Button onClick={() => router.push("/owner/marketplace/cart")}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Cart ({cart.length}) - {formatPrice(getCartTotal())}
          </Button>
        )}
      </div>

      {/* Pending Payments Status */}
      {pendingPayments.filter((p) => p.status === "PENDING" || p.status === "REJECTED").length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Payment Status</span>
              <Button variant="ghost" size="sm" onClick={fetchPendingPayments}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingPayments
              .filter((p) => p.status === "PENDING" || p.status === "REJECTED")
              .map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{payment.vendor.name}</span>
                      {payment.status === "PENDING" ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending Verification
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                          <XCircle className="mr-1 h-3 w-3" />
                          Rejected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(payment.totalAmount)} &middot; {payment.items.length} items
                    </p>
                    {payment.rejectionReason && (
                      <p className="text-sm text-red-600">Reason: {payment.rejectionReason}</p>
                    )}
                  </div>
                  {payment.status === "REJECTED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push("/owner/marketplace/cart")}
                    >
                      Re-upload
                    </Button>
                  )}
                </div>
              ))}
            {pendingPayments.filter((p) => p.status === "VERIFIED").slice(0, 3).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{payment.vendor.name}</span>
                  <span className="text-sm text-green-700">Order placed!</span>
                </div>
                <span className="text-sm text-muted-foreground">{formatPrice(payment.totalAmount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
                  {cartQty > 0 ? (
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
                  )}
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
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ShoppingBag,
  Plus,
  Minus,
  Store,
  CreditCard,
  Loader2,
  Clock,
  Package,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useRestaurant } from "@/contexts/restaurant-context";
import { ProductDetailDialog } from "../components/product-detail-dialog";
import type { CartItem, Product, PaymentRecord } from "../types";

export default function OwnerCartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [pendingPayments, setPendingPayments] = useState<PaymentRecord[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();
  const router = useRouter();
  // ========== CART PERSISTENCE (localStorage) ==========
  const loadCart = useCallback(() => {
    if (!selectedRestaurant) return;
    try {
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
    setLoading(false);
  }, [selectedRestaurant]);

  // Load cart on mount and when restaurant changes
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // ========== PENDING PAYMENTS ==========
  useEffect(() => {
    if (!selectedRestaurant) return;
    const fetchPendingPayments = async () => {
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
    };
    fetchPendingPayments();
  }, [selectedRestaurant]);

  // ========== CART HELPERS ==========
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
          ? { ...i, quantity: Math.min(newQty, i.product.stockQuantity || 999) }
          : i
      )
    );
  };

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
  };

  const getCartItemQuantity = (productId: string) => {
    return cart.find((i) => i.product.id === productId)?.quantity || 0;
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleClearCart = () => {
    if (confirm("Remove all items from cart?")) {
      saveCart([]);
    }
  };

  // Group cart items by vendor (matching mobile logic)
  const getVendorGroups = () => {
    const groups: Record<
      string,
      {
        vendorId: string;
        vendorName: string;
        isAdminStore: boolean;
        items: CartItem[];
        total: number;
      }
    > = {};
    cart.forEach((item) => {
      const vendorId = item.product.vendor?.id || "unknown";
      const vendorName = item.product.vendor?.name || "Unknown Vendor";
      const isAdmin = item.product.isAdminStore === true;
      if (!groups[vendorId]) {
        groups[vendorId] = {
          vendorId,
          vendorName: isAdmin ? "KNI Official Store" : vendorName,
          isAdminStore: isAdmin,
          items: [],
          total: 0,
        };
      }
      groups[vendorId].items.push(item);
      groups[vendorId].total += item.product.price * item.quantity;
    });
    return Object.values(groups);
  };

  // Navigate to payment page (matching mobile's navigation to MarketplacePaymentScreen)
  const handlePayAndOrder = (vendorGroup: ReturnType<typeof getVendorGroups>[0]) => {
    if (!selectedRestaurant) {
      toast({ title: "Error", description: "Please select a restaurant", variant: "destructive" });
      return;
    }
    if (!deliveryAddress.trim()) {
      toast({ title: "Error", description: "Please enter delivery address", variant: "destructive" });
      return;
    }

    // Store checkout session in localStorage for the payment page to read
    const checkoutSession = {
      vendorId: vendorGroup.vendorId,
      vendorName: vendorGroup.vendorName,
      isAdminStore: vendorGroup.isAdminStore,
      items: vendorGroup.items.map((item) => ({
        product: item.product,
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      })),
      restaurantId: selectedRestaurant.restaurantId,
      deliveryAddress: deliveryAddress.trim(),
      deliveryNotes: deliveryNotes.trim(),
    };

    localStorage.setItem("marketplace_checkout_session", JSON.stringify(checkoutSession));
    router.push(`/owner/marketplace/payment?vendorId=${vendorGroup.vendorId}`);
  };

  const vendorGroups = getVendorGroups();

  // ========== LOADING STATE ==========
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/owner/marketplace")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Your Cart</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // ========== EMPTY STATE ==========
  if (cart.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/owner/marketplace")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Your Cart</h1>
        </div>

        {/* Show pending payments even when cart is empty */}
        {pendingPayments.filter((p) => p.status === "PENDING" || p.status === "REJECTED").length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pending Payments</CardTitle>
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
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                            Rejected
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(payment.totalAmount)} &middot; {payment.items.length} items
                      </p>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-5">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-muted-foreground mb-2">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mb-6">Browse marketplace to add products</p>
            <Button onClick={() => router.push("/owner/marketplace")}>
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/owner/marketplace")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Your Cart</h1>
            <p className="text-sm text-muted-foreground">
              {totalItems} item{totalItems !== 1 ? "s" : ""} from {vendorGroups.length} vendor{vendorGroups.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClearCart} className="text-destructive hover:text-destructive">
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Delivery Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Delivery Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="address">Delivery Address *</Label>
            <Textarea
              id="address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter complete delivery address"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Any special instructions"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vendor Groups */}
      {vendorGroups.map((group) => {
        return (
          <Card key={group.vendorId} className={group.isAdminStore ? "border-blue-200" : ""}>
            {/* Vendor Header */}
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  {group.vendorName}
                  {group.isAdminStore && (
                    <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0">
                      Official
                    </Badge>
                  )}
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {group.items.length} item{group.items.length !== 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-0 p-0">
              {/* Items */}
              {group.items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 px-6 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedProduct(item.product);
                    setIsProductDetailOpen(true);
                  }}
                >
                  {/* Product Image */}
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight line-clamp-2">{item.product.name}</p>
                    {item.product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.product.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-0.5">{formatPrice(item.product.price)}</p>
                  </div>

                  {/* Qty Controls */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => updateCartQuantity(item.product.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-bold w-7 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => updateCartQuantity(item.product.id, 1)}
                      disabled={item.quantity >= (item.product.stockQuantity || 999)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Line Total */}
                  <span className="text-sm font-bold flex-shrink-0 min-w-[60px] text-right">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}

              {/* Vendor Footer: Subtotal + Pay Button */}
              <div className="px-6 py-4 bg-muted/30">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
                  <span className="text-lg font-bold">{formatPrice(group.total)}</span>
                </div>

                <Button
                  className="w-full"
                  onClick={() => handlePayAndOrder(group)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay & Order
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Grand Total Footer */}
      <Card>
        <CardContent className="py-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Grand Total</span>
            <span className="text-2xl font-bold">{formatPrice(getCartTotal())}</span>
          </div>
        </CardContent>
      </Card>

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

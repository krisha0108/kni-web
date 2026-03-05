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
import { fetchCart, addCartItem, updateCartItemQuantity, removeCartItem, clearCart } from "@/lib/marketplace-cart";
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

  // ========== CART MANAGEMENT (Server-Side) ==========
  const loadCart = useCallback(async () => {
    if (!selectedRestaurant) return;
    try {
      const data = await fetchCart(selectedRestaurant.restaurantId);
      setCart(data.items as CartItem[]);
    } catch (error: any) {
      console.error("Load cart error:", error);
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
  const updateCartQuantity = async (productId: string, delta: number) => {
    if (!selectedRestaurant) return;
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;

    try {
      if (newQty <= 0) {
        await removeCartItem(item.id);
      } else {
        const clamped = Math.min(newQty, item.product.stockQuantity || 999);
        await updateCartItemQuantity(item.id, clamped);
      }
      await loadCart();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update cart", variant: "destructive" });
    }
  };

  const addToCart = async (product: Product) => {
    if (!selectedRestaurant) return;
    try {
      const existing = cart.find((item) => item.product.id === product.id);
      const newQuantity = existing ? Math.min(existing.quantity + 1, product.stockQuantity) : 1;
      await addCartItem(selectedRestaurant.restaurantId, product.id, newQuantity);
      await loadCart();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add to cart", variant: "destructive" });
    }
  };

  const getCartItemQuantity = (productId: string) => {
    return cart.find((i) => i.product.id === productId)?.quantity || 0;
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleClearCart = async () => {
    if (!selectedRestaurant || !confirm("Remove all items from cart?")) return;
    try {
      await clearCart(selectedRestaurant.restaurantId, { clearAll: true });
      await loadCart();
      toast({ title: "Success", description: "Cart cleared" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to clear cart", variant: "destructive" });
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
      <div className="space-y-4 sm:space-y-6 px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/owner/marketplace")}>
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Your Cart</h1>
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
      <div className="space-y-4 sm:space-y-6 px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/owner/marketplace")}>
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Your Cart</h1>
        </div>

        {/* Show pending payments even when cart is empty */}
        {pendingPayments.filter((p) => p.status === "PENDING" || p.status === "REJECTED").length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Pending Payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingPayments
                .filter((p) => p.status === "PENDING" || p.status === "REJECTED")
                .map((payment) => (
                  <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 sm:p-3 rounded-lg border">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-xs sm:text-sm truncate\">{payment.vendor.name}</span>
                        {payment.status === "PENDING" ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs shrink-0">
                            <Clock className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs shrink-0">
                            Rejected
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {formatPrice(payment.totalAmount)} &middot; {payment.items.length} items
                      </p>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center mb-4 sm:mb-5">
              <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
            </div>
            <p className="text-base sm:text-lg font-semibold text-muted-foreground mb-2">Your cart is empty</p>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 text-center">Browse marketplace to add products</p>
            <Button onClick={() => router.push("/owner/marketplace")} size="sm">
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => router.push("/owner/marketplace")} className="shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold leading-tight">Your Cart</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {totalItems} item{totalItems !== 1 ? "s" : ""} from {vendorGroups.length} vendor{vendorGroups.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClearCart} className="text-destructive hover:text-destructive shrink-0" title="Clear cart">
          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      {/* Delivery Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">Delivery Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="address" className="text-xs sm:text-sm">Delivery Address *</Label>
            <Textarea
              id="address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter complete delivery address"
              rows={3}
              className="text-xs sm:text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs sm:text-sm">Notes (Optional)</Label>
            <Input
              id="notes"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Any special instructions"
              className="text-xs sm:text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vendor Groups */}
      {vendorGroups.map((group) => {
        return (
          <Card key={group.vendorId} className={group.isAdminStore ? "border-blue-200" : ""}>
            {/* Vendor Header */}
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="truncate">{group.vendorName}</span>
                  {group.isAdminStore && (
                    <Badge className="bg-blue-600 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 shrink-0">
                      Official
                    </Badge>
                  )}
                </CardTitle>
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                  {group.items.length} item{group.items.length !== 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-0 p-0">
              {/* Items */}
              {group.items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-start gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors"
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
                      className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info + Controls Column */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Product Name */}
                    <p className="font-medium text-xs sm:text-sm leading-tight line-clamp-2">{item.product.name}</p>
                    
                    {/* Price */}
                    <p className="text-xs sm:text-sm text-muted-foreground">{formatPrice(item.product.price)}</p>

                    {/* Qty Controls + Line Total in one row on mobile */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg"
                          onClick={() => updateCartQuantity(item.product.id, -1)}
                        >
                          <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                        <span className="text-xs sm:text-sm font-bold w-6 sm:w-7 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg"
                          onClick={() => updateCartQuantity(item.product.id, 1)}
                          disabled={item.quantity >= (item.product.stockQuantity || 999)}
                        >
                          <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                      </div>

                      {/* Line Total */}
                      <span className="text-sm sm:text-base font-bold">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Vendor Footer: Subtotal + Pay Button */}
              <div className="px-3 sm:px-6 py-3 sm:py-4 bg-muted/30">
                <div className="flex justify-between items-center mb-2 sm:mb-3">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">Subtotal</span>
                  <span className="text-base sm:text-lg font-bold leading-tight break-all">{formatPrice(group.total)}</span>
                </div>

                <Button
                  className="w-full text-sm"
                  size="sm"
                  onClick={() => handlePayAndOrder(group)}
                >
                  <CreditCard className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Pay & Order
                  <ArrowRight className="ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Grand Total Footer */}
      <Card>
        <CardContent className="py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <span className="text-sm sm:text-base text-muted-foreground">Grand Total</span>
            <span className="text-lg sm:text-2xl font-bold leading-tight break-all">{formatPrice(getCartTotal())}</span>
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
        canCreate
      />
    </div>
  );
}
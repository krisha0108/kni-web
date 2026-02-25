"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import { ClientOnly } from "@/components/client-only";
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Store,
  Building2,
  CreditCard,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useRestaurant } from "@/contexts/restaurant-context";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  imageUrl?: string;
  vendor: { id: string; name: string };
  category: { id: string; name: string };
  isAdminStore?: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface VendorPaymentInfo {
  vendorName: string;
  paymentQrCodeUrl?: string;
  paymentUpiId?: string;
  paymentAccountName?: string;
}

interface PaymentRecord {
  id: string;
  vendorId: string;
  totalAmount: number;
  items: Array<{ productId: string; qty: number; priceSnapshot: number; name: string }>;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason?: string;
  createdAt: string;
  vendor: { id: string; name: string };
  order?: { id: string; status: string } | null;
}

export default function OwnerMarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [checkoutVendorId, setCheckoutVendorId] = useState<string | null>(null);
  const [vendorPaymentInfo, setVendorPaymentInfo] = useState<VendorPaymentInfo | null>(null);
  const [isLoadingPaymentInfo, setIsLoadingPaymentInfo] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<PaymentRecord[]>([]);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();

  // ========== CART PERSISTENCE (localStorage) ==========
  const cartLoadedRef = useRef(false);

  // Restore cart from localStorage when restaurant changes
  useEffect(() => {
    if (!selectedRestaurant) return;
    cartLoadedRef.current = false;
    try {
      const saved = localStorage.getItem(`marketplace_cart_${selectedRestaurant.restaurantId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        } else {
          setCart([]);
        }
      } else {
        setCart([]);
      }
    } catch {
      setCart([]);
    }
    cartLoadedRef.current = true;
  }, [selectedRestaurant]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!selectedRestaurant || !cartLoadedRef.current) return;
    try {
      localStorage.setItem(
        `marketplace_cart_${selectedRestaurant.restaurantId}`,
        JSON.stringify(cart)
      );
    } catch {
      // ignore
    }
  }, [cart, selectedRestaurant]);

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

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stockQuantity) }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast({ title: "Added to cart", description: product.name });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return { ...item, quantity: Math.min(newQty, item.product.stockQuantity) };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const getCartItemQuantity = (productId: string) => {
    const item = cart.find((i) => i.product.id === productId);
    return item?.quantity || 0;
  };

  // Group cart items by vendor
  const getVendorGroups = () => {
    const groups: Record<string, { vendorId: string; vendorName: string; items: CartItem[]; total: number }> = {};
    cart.forEach((item) => {
      const vid = item.product.vendor.id;
      if (!groups[vid]) {
        groups[vid] = {
          vendorId: vid,
          vendorName: item.product.vendor.name,
          items: [],
          total: 0,
        };
      }
      groups[vid].items.push(item);
      groups[vid].total += item.product.price * item.quantity;
    });
    return Object.values(groups);
  };

  // Get active payment status for a vendor (most recent non-verified)
  const getVendorPaymentStatus = (vendorId: string) => {
    return pendingPayments.find(
      (p) => p.vendorId === vendorId && (p.status === "PENDING" || p.status === "REJECTED")
    );
  };

  const openPaymentDialog = async (vendorId: string) => {
    setCheckoutVendorId(vendorId);
    setIsPaymentOpen(true);
    setScreenshotUrl("");
    setIsLoadingPaymentInfo(true);

    try {
      const response = await fetch(`/api/owner/marketplace/vendor-payment-info?vendorId=${vendorId}`);
      const data = await response.json();
      if (data.ok) {
        setVendorPaymentInfo(data.data);
      } else {
        setVendorPaymentInfo(null);
      }
    } catch {
      setVendorPaymentInfo(null);
    } finally {
      setIsLoadingPaymentInfo(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedRestaurant || !checkoutVendorId) return;

    if (!deliveryAddress.trim()) {
      toast({ title: "Error", description: "Please enter delivery address", variant: "destructive" });
      return;
    }
    if (!screenshotUrl) {
      toast({ title: "Error", description: "Please upload payment screenshot", variant: "destructive" });
      return;
    }

    const vendorItems = cart.filter((item) => item.product.vendor.id === checkoutVendorId);
    if (vendorItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/owner/marketplace/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: selectedRestaurant.restaurantId,
          vendorId: checkoutVendorId,
          items: vendorItems.map((item) => ({
            productId: item.product.id,
            qty: item.quantity,
          })),
          screenshotUrl,
          deliveryAddress: deliveryAddress || undefined,
          notes: deliveryNotes || undefined,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast({ title: "Payment Submitted", description: "Waiting for vendor verification" });
        // Remove this vendor's items from cart
        setCart((prev) => prev.filter((item) => item.product.vendor.id !== checkoutVendorId));
        setIsPaymentOpen(false);
        setCheckoutVendorId(null);
        setScreenshotUrl("");
        fetchPendingPayments();
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit payment", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit payment", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkoutVendorGroup = checkoutVendorId
    ? getVendorGroups().find((g) => g.vendorId === checkoutVendorId)
    : null;

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
          <Button onClick={() => setIsCartOpen(true)}>
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
                      onClick={() => openPaymentDialog(payment.vendorId)}
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
              <Card key={product.id} className={`flex flex-col ${product.isAdminStore ? "border-blue-200 ring-1 ring-blue-100" : ""}`}>
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
                <CardFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <span className="text-lg font-bold">{formatPrice(product.price)}</span>
                  {cartQty > 0 ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantity(product.id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{cartQty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantity(product.id, 1)}
                        disabled={cartQty >= product.stockQuantity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => addToCart(product)}
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

      {/* Cart Dialog - Grouped by Vendor */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Your Cart</DialogTitle>
            <DialogDescription>Items grouped by vendor. Pay and order one vendor at a time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Delivery Address - shared across vendors */}
            <div className="space-y-2">
              <Label htmlFor="address">Delivery Address *</Label>
              <Textarea
                id="address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter complete delivery address"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Delivery Notes</Label>
              <Input
                id="notes"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Any special instructions"
              />
            </div>

            {getVendorGroups().map((group) => {
              const existingPayment = getVendorPaymentStatus(group.vendorId);
              return (
                <Card key={group.vendorId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      {group.vendorName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {group.items.map((item) => (
                      <div key={item.product.id} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.product.name}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm w-6 text-center">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateCartQuantity(item.product.id, 1)}
                              disabled={item.quantity >= item.product.stockQuantity}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <span className="text-sm">{formatPrice(item.product.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Subtotal</span>
                      <span>{formatPrice(group.total)}</span>
                    </div>

                    {existingPayment && existingPayment.status === "PENDING" ? (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                        <Clock className="mr-1 h-3 w-3" />
                        Payment pending verification
                      </Badge>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => {
                          setIsCartOpen(false);
                          openPaymentDialog(group.vendorId);
                        }}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay & Order
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCartOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={(open) => {
        setIsPaymentOpen(open);
        if (!open) {
          setCheckoutVendorId(null);
          setVendorPaymentInfo(null);
          setScreenshotUrl("");
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Pay {checkoutVendorGroup?.vendorName || vendorPaymentInfo?.vendorName}
            </DialogTitle>
            <DialogDescription>
              Pay via UPI/QR and upload the payment screenshot
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Order Summary */}
            {checkoutVendorGroup && (
              <div>
                <h4 className="font-medium mb-2">Order Summary</h4>
                <div className="space-y-1">
                  {checkoutVendorGroup.items.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span>{item.product.name} x{item.quantity}</span>
                      <span>{formatPrice(item.product.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <span>Total</span>
                    <span>{formatPrice(checkoutVendorGroup.total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Vendor Payment Details */}
            {isLoadingPaymentInfo ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : vendorPaymentInfo ? (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
                <h4 className="font-medium">Payment Details</h4>
                {vendorPaymentInfo.paymentAccountName && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Account Name:</span>{" "}
                    {vendorPaymentInfo.paymentAccountName}
                  </p>
                )}
                {vendorPaymentInfo.paymentUpiId && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">UPI ID:</span>{" "}
                    <span className="font-mono font-medium">{vendorPaymentInfo.paymentUpiId}</span>
                  </p>
                )}
                {vendorPaymentInfo.paymentQrCodeUrl && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Scan QR Code:</p>
                    <img
                      src={vendorPaymentInfo.paymentQrCodeUrl}
                      alt="Payment QR Code"
                      className="max-w-[200px] h-auto rounded-lg border"
                    />
                  </div>
                )}
                {!vendorPaymentInfo.paymentQrCodeUrl && !vendorPaymentInfo.paymentUpiId && (
                  <p className="text-sm text-yellow-600">
                    This vendor has not set up payment details yet. Please contact them directly.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-yellow-600 p-4 rounded-lg border">
                Could not load vendor payment details. Please contact the vendor directly for payment info.
              </p>
            )}

            {/* Screenshot Upload */}
            <div className="space-y-2">
              <Label>Payment Screenshot *</Label>
              <ImageUpload
                value={screenshotUrl}
                onChange={setScreenshotUrl}
                folder="marketplace-payments"
                label="Upload Payment Screenshot"
                maxSizeMB={5}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitPayment}
              disabled={isSubmitting || !screenshotUrl}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Submit Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

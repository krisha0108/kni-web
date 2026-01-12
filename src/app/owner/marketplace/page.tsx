"use client";

import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { ClientOnly } from "@/components/client-only";
import { Search, ShoppingBag, Plus, Minus, Store } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  imageUrl?: string;
  vendor: { id: string; name: string };
  category: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function OwnerMarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (categoryId && categoryId !== "all") params.append("categoryId", categoryId);

      const response = await fetch("/api/owner/marketplace/products?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setProducts(data.data);
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
      const response = await fetch("/api/public/categories");
      const data = await response.json();
      if (data.ok) {
        setCategories(data.data);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, categoryId]);

  useEffect(() => {
    fetchCategories();
  }, []);

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

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast({ title: "Error", description: "Cart is empty", variant: "destructive" });
      return;
    }
    if (!deliveryAddress.trim()) {
      toast({ title: "Error", description: "Please enter delivery address", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/owner/marketplace/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            vendorProductId: item.product.id,
            quantity: item.quantity,
          })),
          deliveryAddress,
          deliveryNotes: deliveryNotes || undefined,
        }),
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Order placed successfully" });
        setCart([]);
        setIsOrderOpen(false);
        setDeliveryAddress("");
        setDeliveryNotes("");
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to place order", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">Browse and order products from vendors</p>
        </div>
        {cart.length > 0 && (
          <Button onClick={() => setIsOrderOpen(true)}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Cart ({cart.length}) - {formatPrice(getCartTotal())}
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
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
            <SelectTrigger className="w-[200px]">
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
              <Card key={product.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                  )}
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
                  <p className="text-sm text-muted-foreground mt-2">
                    <Store className="inline h-3 w-3 mr-1" />
                    {product.vendor?.name || "Unknown Vendor"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Stock: {product.stockQuantity}
                  </p>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
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

      {/* Order Dialog */}
      <Dialog open={isOrderOpen} onOpenChange={setIsOrderOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Place Order</DialogTitle>
            <DialogDescription>Review your cart and provide delivery details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 max-h-48 overflow-auto">
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{item.product.name}</span>
                    <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                  </div>
                  <span>{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatPrice(getCartTotal())}</span>
              </div>
            </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePlaceOrder} disabled={isSubmitting}>
              {isSubmitting ? "Placing Order..." : "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Minus, Store, Package, Clock, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { Product } from "../types";

function ScrollableRow({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      const ro = new ResizeObserver(checkScroll);
      ro.observe(el);
      return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
    }
  }, [children]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div className="relative group">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-md border flex items-center justify-center hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex gap-2 sm:gap-3 pb-2 -mx-1 px-1"
        style={{ overflowX: "auto", flexWrap: "nowrap", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-md border flex items-center justify-center hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface RelatedProduct {
  id: string;
  name: string;
  imageUrl?: string;
  unit: string;
  price: number;
  priceOnRequest?: boolean;
  deliveryTime?: string;
  stockQuantity: number;
  vendor: { id: string; name: string };
  vendorId: string;
}

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartQuantity: number;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  canCreate?: boolean;
  onRequestPrice?: (product: Product) => void;
  getCartItemQuantity?: (productId: string) => number;
}

export function ProductDetailDialog({
  product: initialProduct,
  open,
  onOpenChange,
  cartQuantity,
  onAddToCart,
  onUpdateQuantity,
  canCreate = true,
  onRequestPrice,
  getCartItemQuantity,
}: ProductDetailDialogProps) {
  const [activeProduct, setActiveProduct] = useState<Product | null>(initialProduct);
  const [moreFromVendor, setMoreFromVendor] = useState<RelatedProduct[]>([]);
  const [similarProducts, setSimilarProducts] = useState<RelatedProduct[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RelatedProduct[]>([]);

  // Sync activeProduct when parent product changes (new dialog opened)
  useEffect(() => {
    setActiveProduct(initialProduct);
  }, [initialProduct]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const fetchRelatedProducts = useCallback(async (productId: string) => {
    setRelatedLoading(true);
    try {
      const res = await fetch(`/api/owner/marketplace/products/${productId}/related`);
      const json = await res.json();
      if (json.ok) {
        setMoreFromVendor(json.data.moreFromVendor || []);
        setSimilarProducts(json.data.similarProducts || []);
      }
    } catch {
      // Non-blocking — don't show errors for related products
    } finally {
      setRelatedLoading(false);
    }
  }, []);

  const logRecentlyViewed = useCallback(async (vendorProductId: string) => {
    try {
      await fetch("/api/owner/marketplace/recently-viewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorProductId }),
      });
    } catch {
      // Non-blocking — silent fail
    }
  }, []);

  const fetchRecentlyViewed = useCallback(async (currentProductId: string) => {
    try {
      const res = await fetch("/api/owner/marketplace/recently-viewed");
      const json = await res.json();
      if (json.ok) {
        // Filter out the current product
        setRecentlyViewed((json.data || []).filter((p: RelatedProduct) => p.id !== currentProductId));
      }
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    if (open && activeProduct?.id) {
      logRecentlyViewed(activeProduct.id);
      fetchRelatedProducts(activeProduct.id);
      fetchRecentlyViewed(activeProduct.id);
    } else {
      setMoreFromVendor([]);
      setSimilarProducts([]);
      setRecentlyViewed([]);
    }
  }, [open, activeProduct?.id, logRecentlyViewed, fetchRelatedProducts, fetchRecentlyViewed]);

  // Handle clicking a related product — switch the dialog to show that product
  const handleRelatedProductClick = (rp: RelatedProduct) => {
    const asProduct = {
      id: rp.id,
      name: rp.name,
      imageUrl: rp.imageUrl || undefined,
      unit: rp.unit,
      price: rp.price,
      priceOnRequest: rp.priceOnRequest || false,
      canPurchase: rp.priceOnRequest ? false : true,
      deliveryTime: rp.deliveryTime || undefined,
      stockQuantity: rp.stockQuantity,
      vendor: rp.vendor,
      vendorId: rp.vendorId,
      isAdminStore: false,
    } as unknown as Product;
    setActiveProduct(asProduct);
  };

  const product = activeProduct;
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full p-0 flex flex-col overflow-hidden">
        {/* ===== FIXED TOP: Product Details (no scroll) ===== */}
        <div className="px-6 pt-6 pb-0 shrink-0">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Product Image + Info Grid */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Image */}
              <div className="w-full sm:w-2/5 shrink-0">
                {product.imageUrl ? (
                  <div className="relative">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-48 sm:h-56 object-cover rounded-lg"
                    />
                    {product.isAdminStore && (
                      <Badge className="absolute top-2 left-2 bg-blue-600 text-white shadow-sm text-[10px]">
                        KNI Official
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-48 sm:h-56 bg-muted rounded-lg flex items-center justify-center">
                    <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-3">
                {/* Description */}
                {product.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{product.description}</p>
                )}

                {/* Vendor & Category */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                    <Store className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    <span className="truncate max-w-[120px] sm:max-w-none">{product.vendor?.name || "Unknown Vendor"}</span>
                    {product.isAdminStore && (
                      <Badge variant="default" className="ml-1 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 bg-blue-600">
                        Official
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs">{product.category?.name || "Uncategorized"}</Badge>
                </div>

                {/* Stock Status */}
                <p className="text-xs sm:text-sm">
                  <span className="text-muted-foreground">Stock: </span>
                  <span className={product.stockQuantity > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {product.stockQuantity > 0 ? `${product.stockQuantity} available` : "Out of stock"}
                  </span>
                </p>

                {/* Delivery Time */}
                {product.deliveryTime && (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Delivery:</span>
                    <span className="font-medium">{product.deliveryTime}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price & Cart Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 pt-2 border-t">
            {product.priceOnRequest && !product.canPurchase ? (
              <>
                <div>
                  {product.priceUnlock?.status === "UNLOCKED" && !product.priceUnlock.isExpired ? (
                    <span className="text-xl sm:text-2xl font-bold">{formatPrice(product.priceUnlock.unlockedPrice)}</span>
                  ) : (
                    <Badge variant="outline">Price on Request</Badge>
                  )}
                </div>
                {canCreate && (
                  <>
                    {/* Price unlocked — show Add to Cart */}
                    {product.priceUnlock?.status === "UNLOCKED" && !product.priceUnlock.isExpired ? (
                      cartQuantity > 0 ? (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onUpdateQuantity(product.id, -1)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">{cartQuantity}</span>
                          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onUpdateQuantity(product.id, 1)} disabled={cartQuantity >= product.stockQuantity}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button onClick={() => onAddToCart(product)} disabled={product.stockQuantity === 0}>
                          Add to Cart
                        </Button>
                      )
                    ) : !product.priceUnlock ? (
                      <Button
                        variant="secondary"
                        onClick={() => onRequestPrice?.(product)}
                      >
                        Request Price
                      </Button>
                    ) : product.priceUnlock.status === "PENDING" ? (
                      <Badge variant="secondary">Price Requested</Badge>
                    ) : product.priceUnlock.status === "DECLINED" ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Declined</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRequestPrice?.(product)}
                        >
                          Re-request
                        </Button>
                      </div>
                    ) : product.priceUnlock.isExpired ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-orange-600">Expired</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRequestPrice?.(product)}
                        >
                          Re-request
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </>
            ) : (
              <>
                <span className="text-xl sm:text-2xl font-bold">
                  {product.priceUnlock?.unlockedPrice
                    ? formatPrice(product.priceUnlock.unlockedPrice)
                    : formatPrice(product.price)}
                </span>
                {canCreate && (cartQuantity > 0 ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => onUpdateQuantity(product.id, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{cartQuantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => onUpdateQuantity(product.id, 1)}
                      disabled={cartQuantity >= product.stockQuantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => onAddToCart(product)}
                    disabled={product.stockQuantity === 0}
                  >
                    Add to Cart
                  </Button>
                ))}
              </>
            )}
          </div>

          </div>
        </div>

        {/* ===== SCROLLABLE BOTTOM: Related Products Only ===== */}
        {(relatedLoading || moreFromVendor.length > 0 || similarProducts.length > 0 || recentlyViewed.length > 0) && (
          <div className="flex-1 overflow-y-auto px-6 pb-6 border-t">
            {relatedLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                {moreFromVendor.length > 0 && (
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">
                      More from {product.vendor?.name || "this Vendor"}
                    </h4>
                    <ScrollableRow>
                      {moreFromVendor.map((rp) => (
                        <RelatedProductCard key={rp.id} product={rp} onClick={() => handleRelatedProductClick(rp)} cartQty={getCartItemQuantity?.(rp.id) || 0} onUpdateQty={canCreate ? onUpdateQuantity : undefined} onAddToCart={canCreate ? () => onAddToCart({ id: rp.id, name: rp.name, price: rp.price, stockQuantity: rp.stockQuantity, vendor: rp.vendor, vendorId: rp.vendorId, imageUrl: rp.imageUrl || undefined, unit: rp.unit } as unknown as Product) : undefined} />
                      ))}
                    </ScrollableRow>
                  </div>
                )}

                {similarProducts.length > 0 && (
                  <div className="pt-3 border-t">
                    <h4 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Similar Products</h4>
                    <ScrollableRow>
                      {similarProducts.map((rp) => (
                        <RelatedProductCard key={rp.id} product={rp} onClick={() => handleRelatedProductClick(rp)} cartQty={getCartItemQuantity?.(rp.id) || 0} onUpdateQty={canCreate ? onUpdateQuantity : undefined} onAddToCart={canCreate ? () => onAddToCart({ id: rp.id, name: rp.name, price: rp.price, stockQuantity: rp.stockQuantity, vendor: rp.vendor, vendorId: rp.vendorId, imageUrl: rp.imageUrl || undefined, unit: rp.unit } as unknown as Product) : undefined} />
                      ))}
                    </ScrollableRow>
                  </div>
                )}

                {recentlyViewed.length > 0 && (
                  <div className="pt-3 border-t">
                    <h4 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Recently Viewed</h4>
                    <ScrollableRow>
                      {recentlyViewed.map((rp) => (
                        <RelatedProductCard key={rp.id} product={rp} onClick={() => handleRelatedProductClick(rp)} cartQty={getCartItemQuantity?.(rp.id) || 0} onUpdateQty={canCreate ? onUpdateQuantity : undefined} onAddToCart={canCreate && !rp.priceOnRequest ? () => onAddToCart({ id: rp.id, name: rp.name, price: rp.price, stockQuantity: rp.stockQuantity, vendor: rp.vendor, vendorId: rp.vendorId, imageUrl: rp.imageUrl || undefined, unit: rp.unit } as unknown as Product) : undefined} />
                      ))}
                    </ScrollableRow>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RelatedProductCard({ product, onClick, onAddToCart, cartQty, onUpdateQty }: {
  product: RelatedProduct;
  onClick?: () => void;
  onAddToCart?: () => void;
  cartQty?: number;
  onUpdateQty?: (productId: string, delta: number) => void;
}) {
  const qty = cartQty || 0;

  return (
    <div className="flex-shrink-0 w-28 sm:w-36 rounded-lg border bg-card p-1.5 sm:p-2 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-20 sm:h-24 object-cover rounded-md mb-1.5 sm:mb-2"
        />
      ) : (
        <div className="w-full h-20 sm:h-24 bg-muted rounded-md mb-1.5 sm:mb-2 flex items-center justify-center">
          <Package className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
        </div>
      )}
      <p className="text-[10px] sm:text-xs font-medium truncate">{product.name}</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
        {product.vendor?.name}
      </p>
      {product.priceOnRequest ? (
        <p className="text-[9px] sm:text-[10px] text-orange-600 font-medium mt-0.5 sm:mt-1">Price on Request</p>
      ) : (
        <p className="text-xs sm:text-sm font-bold mt-0.5 sm:mt-1">{formatPrice(product.price)}</p>
      )}
      {product.stockQuantity > 0 && !product.priceOnRequest && (
        <div className="mt-1" onClick={(e) => e.stopPropagation()}>
          {qty > 0 && onUpdateQty ? (
            <div className="flex items-center justify-center gap-1">
              <button
                className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-muted flex items-center justify-center hover:bg-muted/80"
                onClick={() => onUpdateQty(product.id, -1)}
              >
                <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </button>
              <span className="text-[10px] sm:text-xs font-bold w-4 text-center">{qty}</span>
              <button
                className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-muted flex items-center justify-center hover:bg-muted/80"
                onClick={() => onUpdateQty(product.id, 1)}
                disabled={qty >= product.stockQuantity}
              >
                <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </button>
            </div>
          ) : onAddToCart ? (
            <button
              className="w-full bg-primary text-white rounded-md py-1 text-[9px] sm:text-[10px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-0.5"
              onClick={() => onAddToCart()}
            >
              <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Add
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

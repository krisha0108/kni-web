"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Minus, Store, Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { Product } from "../types";

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartQuantity: number;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
}

export function ProductDetailDialog({
  product,
  open,
  onOpenChange,
  cartQuantity,
  onAddToCart,
  onUpdateQuantity,
}: ProductDetailDialogProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Image */}
          {product.imageUrl ? (
            <div className="relative">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-64 object-cover rounded-lg"
              />
              {product.isAdminStore && (
                <Badge className="absolute top-2 left-2 bg-blue-600 text-white shadow-sm">
                  KNI Official
                </Badge>
              )}
            </div>
          ) : (
            <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
          )}

          {/* Description */}
          {product.description && (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          )}

          {/* Vendor & Category */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Store className="h-3.5 w-3.5" />
              {product.vendor?.name || "Unknown Vendor"}
              {product.isAdminStore && (
                <Badge variant="default" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-blue-600">
                  Official
                </Badge>
              )}
            </div>
            <Badge variant="secondary">{product.category?.name || "Uncategorized"}</Badge>
          </div>

          {/* Stock Status */}
          <p className="text-sm">
            <span className="text-muted-foreground">Stock: </span>
            <span className={product.stockQuantity > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {product.stockQuantity > 0 ? `${product.stockQuantity} available` : "Out of stock"}
            </span>
          </p>

          {/* Price & Cart Controls */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-2xl font-bold">{formatPrice(product.price)}</span>
            {cartQuantity > 0 ? (
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
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

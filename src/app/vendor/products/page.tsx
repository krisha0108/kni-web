"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientOnly } from "@/components/client-only";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Package, Store } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";

interface AdminProduct {
  id: string;
  name: string;
  imageUrl: string | null;
  unit: string;
  description: string | null;
}

interface VendorProduct {
  id: string;
  vendorId: string;
  productId: string;
  price: number;
  description: string | null;
  stockQuantity: number;
  deliveryTime: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // From admin product
  name: string;
  imageUrl: string | null;
  unit: string;
  productDescription: string | null;
}

const DELIVERY_OPTIONS = [
  { value: "Same day", label: "Same day" },
  { value: "1-2 days", label: "1-2 days" },
  { value: "2-3 days", label: "2-3 days" },
  { value: "3-5 days", label: "3-5 days" },
  { value: "1 week", label: "1 week" },
  { value: "__custom__", label: "Custom (enter your own)" },
];

export default function VendorProductsPage() {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddPriceOpen, setIsAddPriceOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<VendorProduct | null>(null);
  const [selectedAdminProduct, setSelectedAdminProduct] = useState<AdminProduct | null>(null);
  const [availableSearch, setAvailableSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCustomDelivery, setIsCustomDelivery] = useState(false);

  // Form state for pricing
  const [formData, setFormData] = useState({
    price: "",
    description: "",
    stockQuantity: "",
    deliveryTime: "",
    isActive: true,
  });

  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      const response = await fetch("/api/vendor/products?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setProducts(data.data || []);
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

  const fetchAvailableProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (availableSearch) params.append("search", availableSearch);

      const response = await fetch("/api/vendor/products/available?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setAvailableProducts(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch available products:", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (isAddPriceOpen) {
      fetchAvailableProducts();
    }
  }, [isAddPriceOpen]);

  useEffect(() => {
    if (isAddPriceOpen) {
      const timer = setTimeout(() => {
        fetchAvailableProducts();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [availableSearch]);

  const resetForm = () => {
    setFormData({
      price: "",
      description: "",
      stockQuantity: "",
      deliveryTime: "",
      isActive: true,
    });
    setIsCustomDelivery(false);
    setSelectedAdminProduct(null);
  };

  const handleAddPricing = async () => {
    if (!selectedAdminProduct) {
      toast({ title: "Error", description: "Please select a product", variant: "destructive" });
      return;
    }
    if (!formData.price) {
      toast({ title: "Error", description: "Price is required", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/vendor/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedAdminProduct.id,
          price: parseInt(formData.price, 10),
          description: formData.description || undefined,
          stockQuantity: parseInt(formData.stockQuantity, 10) || 0,
          deliveryTime: formData.deliveryTime || undefined,
          isActive: formData.isActive,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Pricing added successfully" });
        setIsAddPriceOpen(false);
        resetForm();
        fetchProducts();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to add pricing", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedProduct) return;

    try {
      setIsSaving(true);
      const response = await fetch("/api/vendor/products/" + selectedProduct.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: parseInt(formData.price, 10),
          description: formData.description || null,
          stockQuantity: parseInt(formData.stockQuantity, 10) || 0,
          deliveryTime: formData.deliveryTime || null,
          isActive: formData.isActive,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Pricing updated successfully" });
        setIsEditOpen(false);
        setSelectedProduct(null);
        resetForm();
        fetchProducts();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update pricing", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    try {
      const response = await fetch("/api/vendor/products/" + selectedProduct.id, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Product listing removed" });
        setIsDeleteOpen(false);
        setSelectedProduct(null);
        fetchProducts();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to remove product listing", variant: "destructive" });
    }
  };

  const PRESET_VALUES = DELIVERY_OPTIONS.filter(o => o.value !== "__custom__").map(o => o.value);

  const openEditDialog = (product: VendorProduct) => {
    setSelectedProduct(product);
    const dt = product.deliveryTime || "";
    const isCustom = dt !== "" && !PRESET_VALUES.includes(dt);
    setIsCustomDelivery(isCustom);
    setFormData({
      price: product.price.toString(),
      description: product.description || "",
      stockQuantity: product.stockQuantity.toString(),
      deliveryTime: dt,
      isActive: product.isActive,
    });
    setIsEditOpen(true);
  };

  return (
    <ClientOnly>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Products</h1>
          <p className="text-muted-foreground">
            Set your prices for marketplace products
          </p>
        </div>
        <Dialog open={isAddPriceOpen} onOpenChange={(open) => {
          setIsAddPriceOpen(open);
          if (!open) {
            resetForm();
            setAvailableSearch("");
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Pricing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Product Pricing</DialogTitle>
              <DialogDescription>
                Select a product from the catalog and set your price
              </DialogDescription>
            </DialogHeader>

            {!selectedAdminProduct ? (
              <div className="space-y-4 py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search available products..."
                    value={availableSearch}
                    onChange={(e) => setAvailableSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto border rounded-lg">
                  {availableProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mb-2" />
                      <p>No products available to add</p>
                      <p className="text-sm">You've already added pricing for all products</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {availableProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-4 p-3 hover:bg-muted/50 cursor-pointer"
                          onClick={() => setSelectedAdminProduct(product)}
                        >
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-12 w-12 rounded object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.unit}
                            </div>
                          </div>
                          <Button size="sm" variant="outline">Select</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {/* Selected Product Info */}
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  {selectedAdminProduct.imageUrl ? (
                    <img
                      src={selectedAdminProduct.imageUrl}
                      alt={selectedAdminProduct.name}
                      className="h-16 w-16 rounded object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-lg">{selectedAdminProduct.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedAdminProduct.unit}
                    </div>
                    {selectedAdminProduct.description && (
                      <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {selectedAdminProduct.description}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedAdminProduct(null)}>
                    Change
                  </Button>
                </div>

                {/* Pricing Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Your Price (₹) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stockQuantity}
                      onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryTime">Delivery Time</Label>
                  <ClientOnly>
                    <Select
                      value={isCustomDelivery ? "__custom__" : (formData.deliveryTime || undefined)}
                      onValueChange={(value) => {
                        if (value === "__custom__") {
                          setIsCustomDelivery(true);
                          setFormData({ ...formData, deliveryTime: "" });
                        } else {
                          setIsCustomDelivery(false);
                          setFormData({ ...formData, deliveryTime: value });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select delivery time" />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ClientOnly>
                  {isCustomDelivery && (
                    <Input
                      placeholder="e.g., 4-6 hours, 10 days, etc."
                      value={formData.deliveryTime}
                      onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Your Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add your own description or special notes..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isActive">Active (visible in marketplace)</Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddPriceOpen(false)}>
                Cancel
              </Button>
              {selectedAdminProduct && (
                <Button onClick={handleAddPricing} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Add Pricing"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search your products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <Store className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No products listed yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add pricing for products to start selling
          </p>
          <Button onClick={() => setIsAddPriceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Pricing
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Your Price</TableHead>
                
                <TableHead>Stock</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          per {product.unit}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="font-medium">{formatPrice(product.price)}</TableCell>
                  <TableCell>{product.stockQuantity}</TableCell>
                  <TableCell>{product.deliveryTime || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? "success" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedProduct(product);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
                  
                  
            
                
          
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          setSelectedProduct(null);
          resetForm();
        }
      }}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pricing</DialogTitle>
            <DialogDescription>Update your price and stock for this product</DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4 py-4">
              {/* Product Info (read-only) */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                {selectedProduct.imageUrl ? (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <div className="font-medium">{selectedProduct.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedProduct.unit}
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Your Price (₹) *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stock">Stock Quantity</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-deliveryTime">Delivery Time</Label>
                <ClientOnly>
                  <Select
                    value={isCustomDelivery ? "__custom__" : (formData.deliveryTime || "__none__")}
                    onValueChange={(value) => {
                      if (value === "__none__") {
                        setIsCustomDelivery(false);
                        setFormData({ ...formData, deliveryTime: "" });
                      } else if (value === "__custom__") {
                        setIsCustomDelivery(true);
                        setFormData({ ...formData, deliveryTime: "" });
                      } else {
                        setIsCustomDelivery(false);
                        setFormData({ ...formData, deliveryTime: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not specified</SelectItem>
                      {DELIVERY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ClientOnly>
                {isCustomDelivery && (
                  <Input
                    placeholder="e.g., 4-6 hours, 10 days, etc."
                    value={formData.deliveryTime}
                    onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Your Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="edit-isActive">Active (visible in marketplace)</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Product Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your pricing for &quot;{selectedProduct?.name}&quot;?
              This will remove the product from your listings but not from the marketplace catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </ClientOnly>
  );
}
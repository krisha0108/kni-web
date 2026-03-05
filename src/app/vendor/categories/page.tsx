"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FolderOpen, Package, Check, X, Loader2 } from "lucide-react";

interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  productCount: number;
  subCategories: { id: string; name: string }[];
  isSelected: boolean;
}

export default function VendorCategoriesPage() {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/vendor/categories");
      const data = await response.json();
      if (data.ok) {
        setCategories(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch categories",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleCategory = async (categoryId: string, currentlySelected: boolean) => {
    try {
      setTogglingId(categoryId);
      const response = await fetch("/api/vendor/categories/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          selected: !currentlySelected,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        // Update local state
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === categoryId ? { ...cat, isSelected: !currentlySelected } : cat
          )
        );
        toast({
          title: "Success",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update category selection",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const selectedCount = categories.filter((c) => c.isSelected).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Categories</h1>
        <p className="text-muted-foreground">
          Select the categories you want to sell products from. You can only add products from selected categories.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Badge variant="outline" className="text-base px-4 py-2">
          {selectedCount} of {categories.length} categories selected
        </Badge>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <FolderOpen className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p>No categories available at the moment.</p>
            <p className="text-sm">Check back later or contact admin.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card
              key={category.id}
              className={`relative transition-all ${
                category.isSelected ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <FolderOpen className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Package className="h-3.5 w-3.5" />
                        {category.productCount} products
                      </CardDescription>
                    </div>
                  </div>
                  {category.isSelected && (
                    <Badge variant="success" className="shrink-0">
                      <Check className="h-3 w-3 mr-1" />
                      Selected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {category.subCategories.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Subcategories:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {category.subCategories.slice(0, 5).map((sub) => (
                        <Badge key={sub.id} variant="outline" className="text-xs">
                          {sub.name}
                        </Badge>
                      ))}
                      {category.subCategories.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{category.subCategories.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <Button
                  variant={category.isSelected ? "outline" : "default"}
                  className="w-full"
                  onClick={() => toggleCategory(category.id, category.isSelected)}
                  disabled={togglingId === category.id}
                >
                  {togglingId === category.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : category.isSelected ? (
                    <X className="h-4 w-4 mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {category.isSelected ? "Deselect Category" : "Select Category"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedCount === 0 && categories.length > 0 && (
        <Card className="border-dashed border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="py-6">
            <p className="text-center text-orange-700 dark:text-orange-300">
              <strong>Tip:</strong> Select at least one category to start adding products to your catalog.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
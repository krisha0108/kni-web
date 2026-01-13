"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "./star-rating";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, Package, Clock, Headphones, DollarSign, Box } from "lucide-react";

interface VendorRatingDialogProps {
  orderId: string;
  vendorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VendorRatingDialog({
  orderId,
  vendorName,
  open,
  onOpenChange,
  onSuccess,
}: VendorRatingDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [hasExistingRating, setHasExistingRating] = useState(false);

  const [formData, setFormData] = useState({
    overallRating: 0,
    productQuality: 0,
    deliveryTime: 0,
    customerService: 0,
    valueForMoney: 0,
    packaging: 0,
    review: "",
  });

  // Fetch existing rating when dialog opens
  useEffect(() => {
    if (open && orderId) {
      fetchExistingRating();
    }
  }, [open, orderId]);

  const fetchExistingRating = async () => {
    try {
      setIsFetching(true);
      const response = await fetch(`/api/owner/marketplace/orders/${orderId}/rate`);
      const data = await response.json();

      if (data.ok && data.data) {
        // Pre-fill form with existing rating
        setFormData({
          overallRating: data.data.overallRating,
          productQuality: data.data.productQuality || 0,
          deliveryTime: data.data.deliveryTime || 0,
          customerService: data.data.customerService || 0,
          valueForMoney: data.data.valueForMoney || 0,
          packaging: data.data.packaging || 0,
          review: data.data.review || "",
        });
        setHasExistingRating(true);
      }
    } catch (error) {
      console.error("Failed to fetch existing rating:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.overallRating === 0) {
      toast({
        title: "Rating required",
        description: "Please provide an overall rating",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`/api/owner/marketplace/orders/${orderId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallRating: formData.overallRating,
          productQuality: formData.productQuality || undefined,
          deliveryTime: formData.deliveryTime || undefined,
          customerService: formData.customerService || undefined,
          valueForMoney: formData.valueForMoney || undefined,
          packaging: formData.packaging || undefined,
          review: formData.review || undefined,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to submit rating");
      }

      toast({
        title: hasExistingRating ? "Rating updated" : "Rating submitted",
        description: hasExistingRating
          ? "Your rating has been updated successfully"
          : "Thank you for your feedback!",
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();

      // Reset form
      setFormData({
        overallRating: 0,
        productQuality: 0,
        deliveryTime: 0,
        customerService: 0,
        valueForMoney: 0,
        packaging: 0,
        review: "",
      });
      setHasExistingRating(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            {hasExistingRating ? "Update" : "Rate"} Vendor
          </DialogTitle>
          <DialogDescription>
            {hasExistingRating
              ? `Update your rating for ${vendorName}`
              : `Share your experience with ${vendorName}`}
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Overall Rating */}
            <div className="space-y-2">
              <StarRating
                label="Overall Rating"
                value={formData.overallRating}
                onChange={(value) =>
                  setFormData({ ...formData, overallRating: value })
                }
                size="lg"
              />
            </div>

            {/* Category Ratings */}
            <div className="grid gap-4 border-t pt-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Rate specific aspects (optional)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Quality */}
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <StarRating
                    label="Product Quality"
                    value={formData.productQuality}
                    onChange={(value) =>
                      setFormData({ ...formData, productQuality: value })
                    }
                    size="md"
                  />
                </div>

                {/* Delivery Time */}
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <StarRating
                    label="Delivery Time"
                    value={formData.deliveryTime}
                    onChange={(value) =>
                      setFormData({ ...formData, deliveryTime: value })
                    }
                    size="md"
                  />
                </div>

                {/* Customer Service */}
                <div className="flex items-center gap-3">
                  <Headphones className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <StarRating
                    label="Customer Service"
                    value={formData.customerService}
                    onChange={(value) =>
                      setFormData({ ...formData, customerService: value })
                    }
                    size="md"
                  />
                </div>

                {/* Value for Money */}
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <StarRating
                    label="Value for Money"
                    value={formData.valueForMoney}
                    onChange={(value) =>
                      setFormData({ ...formData, valueForMoney: value })
                    }
                    size="md"
                  />
                </div>

                {/* Packaging */}
                <div className="flex items-center gap-3 md:col-span-2">
                  <Box className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <StarRating
                    label="Packaging"
                    value={formData.packaging}
                    onChange={(value) =>
                      setFormData({ ...formData, packaging: value })
                    }
                    size="md"
                  />
                </div>
              </div>
            </div>

            {/* Review */}
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="review">Written Review (Optional)</Label>
              <Textarea
                id="review"
                placeholder="Share details about your experience..."
                value={formData.review}
                onChange={(e) =>
                  setFormData({ ...formData, review: e.target.value })
                }
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Your review will help other restaurant owners make better purchasing decisions
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || formData.overallRating === 0}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {hasExistingRating ? "Update Rating" : "Submit Rating"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

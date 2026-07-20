"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import type { Product } from "../types";

interface PriceRequestDialogProps {
  product: Product | null;
  restaurantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PriceRequestDialog({
  product,
  restaurantId,
  open,
  onOpenChange,
  onSuccess,
}: PriceRequestDialogProps) {
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (!product) return null;

  // The list price is already visible for regular products - let the owner
  // propose their own price directly instead of sending a blank "request"
  // for a price they can already see. "Price on Request" products still
  // need a blank request first since the price is genuinely unknown.
  const priceIsKnown = !product.priceOnRequest;

  const handleSubmit = async () => {
    if (priceIsKnown && !proposedPrice) {
      toast({ title: "Error", description: "Enter the price you'd like to offer", variant: "destructive" });
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/owner/marketplace/price-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          vendorProductId: product.id,
          quantity: quantity ? parseInt(quantity, 10) : undefined,
          message: message || undefined,
          proposedPrice: priceIsKnown ? parseInt(proposedPrice, 10) : undefined,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({
          title: priceIsKnown ? "Offer Sent" : "Request Sent",
          description: priceIsKnown
            ? "Your offer has been sent. You'll be notified when the admin responds."
            : "Your price request has been submitted. You'll be notified when the admin responds.",
        });
        setQuantity("");
        setMessage("");
        setProposedPrice("");
        onOpenChange(false);
        onSuccess();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit price request", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-md">
        <DialogHeader>
          <DialogTitle>{priceIsKnown ? "Negotiate Price" : "Request Price"}</DialogTitle>
          <DialogDescription>
            {priceIsKnown
              ? <>List price for &quot;{product.name}&quot; is {formatPrice(product.price || 0)}. Offer your price below.</>
              : <>Request a custom price quote for &quot;{product.name}&quot;</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {priceIsKnown && (
            <div className="space-y-2">
              <Label htmlFor="req-price">Your Offer Price *</Label>
              <Input
                id="req-price"
                type="number"
                min={1}
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                placeholder={`e.g. ${Math.round((product.price || 0) * 0.9)}`}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="req-quantity">Quantity (optional)</Label>
            <Input
              id="req-quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="How many do you need?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="req-message">Message (optional)</Label>
            <Textarea
              id="req-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any special requirements or notes..."
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : priceIsKnown ? "Send Offer" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (!product) return null;

  const handleSubmit = async () => {
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
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Request Sent", description: "Your price request has been submitted. You'll be notified when the admin responds." });
        setQuantity("");
        setMessage("");
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
          <DialogTitle>Request Price</DialogTitle>
          <DialogDescription>
            Request a custom price quote for &quot;{product.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

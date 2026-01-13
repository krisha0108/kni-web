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
import { Loader2, Star, UserCheck, Wrench, MessageSquare, Clock as ClockIcon, Lightbulb } from "lucide-react";

interface Assignment {
  id: string;
  engineerId: string;
  engineer: {
    id: string;
    name: string;
  };
  rating?: {
    overallRating: number;
    professionalism?: number;
    technicalSkill?: number;
    communication?: number;
    punctuality?: number;
    problemSolving?: number;
    review?: string;
  } | null;
}

interface EngineerRatingDialogProps {
  bookingId: string;
  assignment: Assignment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EngineerRatingDialog({
  bookingId,
  assignment,
  open,
  onOpenChange,
  onSuccess,
}: EngineerRatingDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const hasExistingRating = !!assignment.rating;

  const [formData, setFormData] = useState({
    overallRating: 0,
    professionalism: 0,
    technicalSkill: 0,
    communication: 0,
    punctuality: 0,
    problemSolving: 0,
    review: "",
  });

  // Load existing rating when dialog opens
  useEffect(() => {
    if (open && assignment.rating) {
      setFormData({
        overallRating: assignment.rating.overallRating,
        professionalism: assignment.rating.professionalism || 0,
        technicalSkill: assignment.rating.technicalSkill || 0,
        communication: assignment.rating.communication || 0,
        punctuality: assignment.rating.punctuality || 0,
        problemSolving: assignment.rating.problemSolving || 0,
        review: assignment.rating.review || "",
      });
    } else if (open) {
      // Reset form for new rating
      setFormData({
        overallRating: 0,
        professionalism: 0,
        technicalSkill: 0,
        communication: 0,
        punctuality: 0,
        problemSolving: 0,
        review: "",
      });
    }
  }, [open, assignment]);

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

      const response = await fetch(`/api/owner/bookings/${bookingId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: assignment.id,
          overallRating: formData.overallRating,
          professionalism: formData.professionalism || undefined,
          technicalSkill: formData.technicalSkill || undefined,
          communication: formData.communication || undefined,
          punctuality: formData.punctuality || undefined,
          problemSolving: formData.problemSolving || undefined,
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
            {hasExistingRating ? "Update" : "Rate"} Engineer
          </DialogTitle>
          <DialogDescription>
            {hasExistingRating
              ? `Update your rating for ${assignment.engineer.name}`
              : `Share your experience with ${assignment.engineer.name}`}
          </DialogDescription>
        </DialogHeader>

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
              {/* Professionalism */}
              <div className="flex items-center gap-3">
                <UserCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <StarRating
                  label="Professionalism"
                  value={formData.professionalism}
                  onChange={(value) =>
                    setFormData({ ...formData, professionalism: value })
                  }
                  size="md"
                />
              </div>

              {/* Technical Skill */}
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <StarRating
                  label="Technical Skill"
                  value={formData.technicalSkill}
                  onChange={(value) =>
                    setFormData({ ...formData, technicalSkill: value })
                  }
                  size="md"
                />
              </div>

              {/* Communication */}
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <StarRating
                  label="Communication"
                  value={formData.communication}
                  onChange={(value) =>
                    setFormData({ ...formData, communication: value })
                  }
                  size="md"
                />
              </div>

              {/* Punctuality */}
              <div className="flex items-center gap-3">
                <ClockIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <StarRating
                  label="Punctuality"
                  value={formData.punctuality}
                  onChange={(value) =>
                    setFormData({ ...formData, punctuality: value })
                  }
                  size="md"
                />
              </div>

              {/* Problem Solving */}
              <div className="flex items-center gap-3 md:col-span-2">
                <Lightbulb className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <StarRating
                  label="Problem Solving"
                  value={formData.problemSolving}
                  onChange={(value) =>
                    setFormData({ ...formData, problemSolving: value })
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
              placeholder="Share details about the engineer's work quality, behavior, and overall experience..."
              value={formData.review}
              onChange={(e) =>
                setFormData({ ...formData, review: e.target.value })
              }
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Your feedback helps improve service quality
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
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OwnerCategoryRequestPage() {
  const [formData, setFormData] = useState({
    categoryName: "",
    description: "",
    reason: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/owner/category-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Category request submitted successfully. Admin will review your request."
        });
        setFormData({ categoryName: "", description: "", reason: "" });
        router.push("/owner/dashboard");
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to submit category request",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit category request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Request New Category</h1>
          <p className="text-muted-foreground">Submit a request for a new service or part category</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Request Form</CardTitle>
          <CardDescription>
            Fill in the details below to request a new category. Admin will review and approve your request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name *</Label>
              <Input
                id="categoryName"
                placeholder="e.g., HVAC Systems"
                value={formData.categoryName}
                onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this category would include..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Provide details about what types of services or parts this category would cover
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Request</Label>
              <Textarea
                id="reason"
                placeholder="Why do you need this category?..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Explain why this category would be useful for your restaurant
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Your category request will be reviewed by administrators. You will receive a notification once your request has been approved or rejected.
        </p>
      </div>
    </div>
  );
}

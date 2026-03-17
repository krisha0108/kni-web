"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  city: string;
  skills: string;
  payoutMethod: string;
  commissionRate: string;
  monthlySalary: string;
}

export default function CreateEngineerPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    city: "",
    skills: "",
    payoutMethod: "COMMISSION",
    commissionRate: "20",
    monthlySalary: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [states, setStates] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/public/locations?type=states")
      .then((res) => res.json())
      .then((data) => { if (data.ok) setStates(data.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedStateId) {
      fetch(`/api/public/locations?type=cities&stateId=${selectedStateId}`)
        .then((res) => res.json())
        .then((data) => { if (data.ok) setCities(data.data || []); })
        .catch(() => {});
    } else {
      setCities([]);
    }
  }, [selectedStateId]);

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setPasswordError("Password must contain at least one lowercase letter");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setPasswordError("Password must contain at least one number");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    if (!validatePassword(formData.password)) {
      toast({
        title: "Error",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/engineers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          password: formData.password,
          city: formData.city || undefined,
          skills: formData.skills || undefined,
          payoutMethod: formData.payoutMethod,
          commissionRate: parseInt(formData.commissionRate) || 20,
          monthlySalary: formData.payoutMethod === "SALARY" && formData.monthlySalary ? parseInt(formData.monthlySalary) : undefined,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Engineer created successfully",
        });
        router.push("/admin/engineers");
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create engineer",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create engineer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/engineers")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <UserPlus className="h-8 w-8" />
            Create New Engineer
          </h1>
          <p className="text-muted-foreground mt-2">
            Add a new engineer to the system
          </p>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          The engineer will receive their login credentials via email (email notifications not yet implemented).
          Make sure to share the email and password with them securely.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Engineer Information</CardTitle>
            <CardDescription>
              Enter the details for the new engineer account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="engineer@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+91-9876543210"
                />
              </div>

              <div className="space-y-2">
                <Label>State</Label>
                <Select
                  value={selectedStateId}
                  onValueChange={(value) => {
                    setSelectedStateId(value);
                    setFormData({ ...formData, city: "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>City</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => setFormData({ ...formData, city: value })}
                  disabled={!selectedStateId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedStateId ? "Select City" : "Select State first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label htmlFor="skills">Skills & Expertise</Label>
              <Textarea
                id="skills"
                value={formData.skills}
                onChange={(e) =>
                  setFormData({ ...formData, skills: e.target.value })
                }
                placeholder="Kitchen Equipment, Refrigeration, HVAC, Plumbing, Electrical"
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Enter comma-separated skills and areas of expertise
              </p>
            </div>

            {/* Payout Configuration */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Payout Configuration</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payout Method</Label>
                  <Select
                    value={formData.payoutMethod}
                    onValueChange={(value) => setFormData({ ...formData, payoutMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMMISSION">Commission Based</SelectItem>
                      <SelectItem value="SALARY">Salary Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.payoutMethod === "COMMISSION" ? (
                  <div className="space-y-2">
                    <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                    <Input
                      id="commissionRate"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.commissionRate}
                      onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                      placeholder="20"
                    />
                    <p className="text-sm text-muted-foreground">Percentage of job value earned as commission</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="monthlySalary">Monthly Salary (Rs)</Label>
                    <Input
                      id="monthlySalary"
                      type="number"
                      min="0"
                      value={formData.monthlySalary}
                      onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                      placeholder="30000"
                    />
                    <p className="text-sm text-muted-foreground">Fixed monthly salary in Rupees</p>
                  </div>
                )}
              </div>
            </div>

            {/* Password Fields */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Account Security</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (e.target.value) validatePassword(e.target.value);
                    }}
                    placeholder="••••••••"
                  />
                  {passwordError && (
                    <p className="text-sm text-destructive">{passwordError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirm Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Password Requirements:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Contains at least one uppercase letter (A-Z)</li>
                  <li>• Contains at least one lowercase letter (a-z)</li>
                  <li>• Contains at least one number (0-9)</li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Engineer
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/engineers")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
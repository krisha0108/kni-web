"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  MapPin,
  Shield,
  Bell,
  Lock,
  LogOut,
  Camera,
  Save,
  Loader2,
  Store,
  Package,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { formatDate } from "@/lib/utils";

interface VendorProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  vendorProfile?: {
    approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
    approvalNote?: string;
    rejectionReason?: string;
    subscriptionStatus?: "TRIAL" | "ACTIVE" | "EXPIRED" | "BLOCKED";
    trialEndsAt?: string;
    activeUntil?: string;
  };
  vendorCoverage?: {
    coverageType: "PAN_INDIA" | "CITY" | "PINCODE";
    cities?: string[];
    pincodes?: string[];
  };
  stats?: {
    totalProducts: number;
    totalOrders: number;
    avgRating: number;
  };
}

const APPROVAL_STATUS_CONFIG = {
  PENDING: { icon: Clock, color: "bg-yellow-100 text-yellow-700", label: "Pending Approval" },
  APPROVED: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Approved" },
  REJECTED: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Rejected" },
};

const SUBSCRIPTION_STATUS_CONFIG = {
  TRIAL: { color: "bg-blue-100 text-blue-700", label: "Trial" },
  ACTIVE: { color: "bg-green-100 text-green-700", label: "Active" },
  EXPIRED: { color: "bg-red-100 text-red-700", label: "Expired" },
  BLOCKED: { color: "bg-gray-100 text-gray-700", label: "Blocked" },
};

export default function VendorProfilePage() {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    coverageType: "PAN_INDIA" as "PAN_INDIA" | "CITY" | "PINCODE",
    cities: "",
    pincodes: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/vendor/profile");
      const data = await response.json();

      if (data.ok && data.data) {
        setProfile(data.data);
        setFormData({
          name: data.data.name || "",
          email: data.data.email || "",
          phone: data.data.phone || "",
          coverageType: data.data.vendorCoverage?.coverageType || "PAN_INDIA",
          cities: data.data.vendorCoverage?.cities?.join(", ") || "",
          pincodes: data.data.vendorCoverage?.pincodes?.join(", ") || "",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/vendor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          coverageType: formData.coverageType,
          cities: formData.cities.split(",").map((c) => c.trim()).filter(Boolean),
          pincodes: formData.pincodes.split(",").map((p) => p.trim()).filter(Boolean),
        }),
      });
      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        fetchProfile();
      } else {
        throw new Error(data.error);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/vendor/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Password changed successfully",
        });
        setIsPasswordDialogOpen(false);
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        throw new Error(data.error || "Failed to change password");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const approvalStatus = profile?.vendorProfile?.approvalStatus || "PENDING";
  const subscriptionStatus = profile?.vendorProfile?.subscriptionStatus;
  const ApprovalIcon = APPROVAL_STATUS_CONFIG[approvalStatus]?.icon || Clock;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your vendor account settings and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile Overview Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                  {formData.name?.charAt(0)?.toUpperCase() || "V"}
                </div>
                <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-semibold">{profile?.name}</h2>
                  <Badge variant="secondary">Vendor</Badge>
                </div>
                <p className="text-muted-foreground mb-3">{profile?.email}</p>
                <div className="flex flex-wrap gap-3">
                  <Badge className={APPROVAL_STATUS_CONFIG[approvalStatus]?.color}>
                    <ApprovalIcon className="h-3 w-3 mr-1" />
                    {APPROVAL_STATUS_CONFIG[approvalStatus]?.label}
                  </Badge>
                  {subscriptionStatus && (
                    <Badge className={SUBSCRIPTION_STATUS_CONFIG[subscriptionStatus]?.color}>
                      <CreditCard className="h-3 w-3 mr-1" />
                      {SUBSCRIPTION_STATUS_CONFIG[subscriptionStatus]?.label}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            {profile?.stats && (
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    {profile.stats.totalProducts}
                  </div>
                  <p className="text-sm text-muted-foreground">Products</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                    <Store className="h-5 w-5 text-muted-foreground" />
                    {profile.stats.totalOrders}
                  </div>
                  <p className="text-sm text-muted-foreground">Orders</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                    <Star className="h-5 w-5 text-yellow-500" />
                    {profile.stats.avgRating?.toFixed(1) || "N/A"}
                  </div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Info */}
        {profile?.vendorProfile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription
              </CardTitle>
              <CardDescription>Your subscription status and details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">
                    {subscriptionStatus?.toLowerCase() || "N/A"}
                  </p>
                </div>
                {profile.vendorProfile.trialEndsAt && (
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Trial Ends</p>
                    <p className="font-medium">
                      {formatDate(profile.vendorProfile.trialEndsAt)}
                    </p>
                  </div>
                )}
                {profile.vendorProfile.activeUntil && (
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Active Until</p>
                    <p className="font-medium">
                      {formatDate(profile.vendorProfile.activeUntil)}
                    </p>
                  </div>
                )}
              </div>
              {profile.vendorProfile.rejectionReason && (
                <div className="mt-4 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                  <p className="text-sm font-medium text-destructive">Rejection Reason</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {profile.vendorProfile.rejectionReason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your business name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter your phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Member Since</Label>
                <Input
                  value={profile?.createdAt ? formatDate(profile.createdAt) : ""}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <Separator />

            {/* Coverage Settings */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Coverage Area
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="coverageType">Coverage Type</Label>
                  <Select
                    value={formData.coverageType}
                    onValueChange={(value: "PAN_INDIA" | "CITY" | "PINCODE") =>
                      setFormData({ ...formData, coverageType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select coverage type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAN_INDIA">Pan India</SelectItem>
                      <SelectItem value="CITY">Specific Cities</SelectItem>
                      <SelectItem value="PINCODE">Specific Pincodes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.coverageType === "CITY" && (
                <div className="space-y-2">
                  <Label htmlFor="cities">Cities (comma separated)</Label>
                  <Textarea
                    id="cities"
                    value={formData.cities}
                    onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                    placeholder="E.g., Mumbai, Delhi, Bangalore"
                    rows={2}
                  />
                </div>
              )}

              {formData.coverageType === "PINCODE" && (
                <div className="space-y-2">
                  <Label htmlFor="pincodes">Pincodes (comma separated)</Label>
                  <Textarea
                    id="pincodes"
                    value={formData.pincodes}
                    onChange={(e) => setFormData({ ...formData, pincodes: e.target.value })}
                    placeholder="E.g., 400001, 110001, 560001"
                    rows={2}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Password</p>
                  <p className="text-sm text-muted-foreground">Change your account password</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationSettings />
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">Sign Out</p>
                  <p className="text-sm text-muted-foreground">Sign out from your account</p>
                </div>
              </div>
              <Button variant="destructive" onClick={() => setIsLogoutDialogOpen(true)}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

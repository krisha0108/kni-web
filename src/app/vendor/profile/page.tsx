"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  vendorLocationRequests?: {
    area: { name: string; city: { name: string } };
  }[];
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-bold">Profile & Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage your vendor account settings and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile Overview Card */}
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6">
              <div className="relative flex-shrink-0">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-primary/10 flex items-center justify-center text-lg sm:text-xl lg:text-3xl font-bold text-primary">
                  {formData.name?.charAt(0)?.toUpperCase() || "V"}
                </div>
                <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
                  <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-base sm:text-xl font-semibold truncate">{profile?.name}</h2>
                  <Badge variant="secondary" className="text-xs sm:text-sm">Vendor</Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 break-all">{profile?.email}</p>
                <div className="flex flex-wrap gap-2 sm:gap-3">
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-lg sm:text-2xl font-bold">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    {profile.stats.totalProducts}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Products</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-lg sm:text-2xl font-bold">
                    <Store className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    {profile.stats.totalOrders}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Orders</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-lg sm:text-2xl font-bold">
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                    {profile.stats.avgRating?.toFixed(1) || "N/A"}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Rating</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Info */}
        {profile?.vendorProfile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                Subscription
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your subscription status and details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
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
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs sm:text-sm">Business Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your business name"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs sm:text-sm">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs sm:text-sm">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter your phone"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Member Since</Label>
                <Input
                  value={profile?.createdAt ? formatDate(profile.createdAt) : ""}
                  disabled
                  className="h-9 sm:h-10 bg-muted text-xs sm:text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* Service Locations Info */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-sm sm:text-base font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Service Locations
              </h3>
              {profile?.vendorLocationRequests && profile.vendorLocationRequests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.vendorLocationRequests.map((lr, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-green-50 text-green-700 text-xs sm:text-sm">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span className="truncate">{lr.area.name}, {lr.area.city.name}</span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  No approved locations yet.
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/vendor/locations")}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              >
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Manage Locations
              </Button>
            </div>

            <div className="flex justify-end pt-2 sm:pt-4">
              <Button onClick={handleSaveProfile} disabled={isSaving} className="h-9 sm:h-10 text-xs sm:text-sm">
                {isSaving ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
              Security
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-medium">Password</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Change your account password</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)} className="h-9 sm:h-10 text-xs sm:text-sm">
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              Notifications
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Configure how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationSettings />
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive text-lg sm:text-xl">Danger Zone</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Irreversible actions for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 border border-destructive/30 rounded-lg bg-destructive/5">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-medium">Sign Out</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Sign out from your account</p>
                </div>
              </div>
              <Button variant="destructive" onClick={() => setIsLogoutDialogOpen(true)} className="h-9 sm:h-10 text-xs sm:text-sm">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Change Password</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-xs sm:text-sm">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-xs sm:text-sm">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} className="h-9 sm:h-10 text-xs sm:text-sm">
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword} className="h-9 sm:h-10 text-xs sm:text-sm">
              {isChangingPassword && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Sign Out</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to sign out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)} className="h-9 sm:h-10 text-xs sm:text-sm">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout} className="h-9 sm:h-10 text-xs sm:text-sm">
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
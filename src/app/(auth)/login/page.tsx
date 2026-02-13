"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Clock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [vendorError, setVendorError] = useState<{ code: string; message: string } | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setVendorError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.ok) {
        // Check for vendor-specific errors
        if (data.code === "VENDOR_PENDING_APPROVAL" || data.code === "VENDOR_REJECTED") {
          setVendorError({ code: data.code, message: data.error });
          return;
        }

        // Handle email not verified - redirect to verification page
        if (data.code === "EMAIL_NOT_VERIFIED") {
          toast({
            title: "Email Not Verified",
            description: "A verification code has been sent to your email.",
          });
          router.push(`/verify-email?email=${encodeURIComponent(data.email || email)}`);
          return;
        }

        toast({
          title: "Login Failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.data.user.name}!`,
        variant: "success",
      });

      router.push(data.data.redirectUrl);
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">KNI Super App</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {vendorError && (
            <div
              className={`rounded-lg p-4 ${
                vendorError.code === "VENDOR_PENDING_APPROVAL"
                  ? "bg-amber-50 border border-amber-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {vendorError.code === "VENDOR_PENDING_APPROVAL" ? (
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <h3
                    className={`font-medium ${
                      vendorError.code === "VENDOR_PENDING_APPROVAL"
                        ? "text-amber-800"
                        : "text-red-800"
                    }`}
                  >
                    {vendorError.code === "VENDOR_PENDING_APPROVAL"
                      ? "Pending Approval"
                      : "Account Rejected"}
                  </h3>
                  <p
                    className={`text-sm mt-1 ${
                      vendorError.code === "VENDOR_PENDING_APPROVAL"
                        ? "text-amber-700"
                        : "text-red-700"
                    }`}
                  >
                    {vendorError.message}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
          <div className="text-sm text-center space-y-2">
            <p className="text-muted-foreground">
              Restaurant Owner?{" "}
              <Link
                href="/register-owner"
                className="text-primary hover:underline"
              >
                Register here
              </Link>
            </p>
            <p className="text-muted-foreground">
              Vendor?{" "}
              <Link
                href="/register-vendor"
                className="text-primary hover:underline"
              >
                Register here
              </Link>
            </p>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

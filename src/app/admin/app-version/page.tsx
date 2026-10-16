"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Smartphone, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AppVersionForm {
  latestVersionCode: string;
  latestVersionName: string;
  minSupportedVersionCode: string;
  forceUpdate: boolean;
  updateMessage: string;
  storeUrl: string;
}

const EMPTY: AppVersionForm = {
  latestVersionCode: "",
  latestVersionName: "",
  minSupportedVersionCode: "",
  forceUpdate: true,
  updateMessage:
    "A new version of the app is available with important fixes and improvements. Please update to continue.",
  storeUrl: "https://play.google.com/store/apps/details?id=com.kniapp",
};

// Only "owner" (kni-app) / "android" is editable for now - the fields are
// kept generic (appKey/platform) in the API and schema so the Engineer app
// and iOS can reuse this same system later without any backend change.
const APP_KEY = "owner";
const PLATFORM = "android";

export default function AppVersionPage() {
  const [formData, setFormData] = useState<AppVersionForm>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/app-version?app=${APP_KEY}&platform=${PLATFORM}`);
      const data = await response.json();

      if (data.ok && data.data) {
        setFormData({
          latestVersionCode: String(data.data.latestVersionCode ?? ""),
          latestVersionName: data.data.latestVersionName ?? "",
          minSupportedVersionCode: String(data.data.minSupportedVersionCode ?? ""),
          forceUpdate: data.data.forceUpdate ?? true,
          updateMessage: data.data.updateMessage ?? EMPTY.updateMessage,
          storeUrl: data.data.storeUrl ?? EMPTY.storeUrl,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch app version config",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.latestVersionCode || !formData.minSupportedVersionCode || !formData.latestVersionName) {
      toast({
        title: "Error",
        description: "Please fill in the version code and name fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/app-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appKey: APP_KEY,
          platform: PLATFORM,
          latestVersionCode: Number(formData.latestVersionCode),
          latestVersionName: formData.latestVersionName,
          minSupportedVersionCode: Number(formData.minSupportedVersionCode),
          forceUpdate: formData.forceUpdate,
          updateMessage: formData.updateMessage,
          storeUrl: formData.storeUrl,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "App version config updated. Takes effect on next app launch - no rebuild needed.",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update config",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update app version config",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <Smartphone className="h-8 w-8" />
          App Version (Owner App)
        </h1>
        <p className="text-muted-foreground mt-2">
          Control when Owner App (kni-app) users are forced to update, without releasing a new build
        </p>
      </div>

      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          The app checks this on every launch. Google Play also shows its own automatic update
          prompt when you publish a new version - this screen is the backup &quot;kill switch&quot;: raise
          Minimum Supported Version any time you need to force everyone off an old build immediately,
          without waiting for Play Store&apos;s rollout.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Version Configuration</CardTitle>
            <CardDescription>
              Version codes must match <code>android/app/build.gradle</code>&apos;s{" "}
              <code>versionCode</code> for each release (versionName is for display only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latestVersionCode">Latest Version Code *</Label>
                <Input
                  id="latestVersionCode"
                  type="number"
                  required
                  value={formData.latestVersionCode}
                  onChange={(e) => setFormData({ ...formData, latestVersionCode: e.target.value })}
                  placeholder="52"
                />
                <p className="text-sm text-muted-foreground">
                  The versionCode of the build you just published to Play Store
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="latestVersionName">Latest Version Name *</Label>
                <Input
                  id="latestVersionName"
                  required
                  value={formData.latestVersionName}
                  onChange={(e) => setFormData({ ...formData, latestVersionName: e.target.value })}
                  placeholder="40.3.9"
                />
                <p className="text-sm text-muted-foreground">Shown to users - cosmetic only</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minSupportedVersionCode">Minimum Supported Version Code *</Label>
              <Input
                id="minSupportedVersionCode"
                type="number"
                required
                value={formData.minSupportedVersionCode}
                onChange={(e) => setFormData({ ...formData, minSupportedVersionCode: e.target.value })}
                placeholder="50"
              />
              <p className="text-sm text-muted-foreground">
                Any installed app with a versionCode below this number gets blocked. Keep this equal
                to Latest Version Code for a normal release; only raise it to Latest for an
                emergency force-update.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="forceUpdate">Force Update (block the app)</Label>
                <p className="text-sm text-muted-foreground">
                  On: users below the minimum version cannot use the app at all. Off: they see a
                  dismissible reminder instead.
                </p>
              </div>
              <Switch
                id="forceUpdate"
                checked={formData.forceUpdate}
                onCheckedChange={(checked) => setFormData({ ...formData, forceUpdate: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="updateMessage">Update Message *</Label>
              <Textarea
                id="updateMessage"
                required
                value={formData.updateMessage}
                onChange={(e) => setFormData({ ...formData, updateMessage: e.target.value })}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Shown on the &quot;Please Update Your App&quot; screen
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeUrl">Play Store URL *</Label>
              <Input
                id="storeUrl"
                required
                value={formData.storeUrl}
                onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                placeholder="https://play.google.com/store/apps/details?id=com.kniapp"
              />
              <p className="text-sm text-muted-foreground">Opened when the user taps &quot;Update Now&quot;</p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={fetchConfig} disabled={isSaving}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Every time you publish a new Owner App build to Play Store, bump build.gradle&apos;s versionCode and update &quot;Latest Version Code/Name&quot; here to match.</li>
            <li>Leave &quot;Minimum Supported Version&quot; at the previous release&apos;s code normally - old installs keep working while Play Store rolls the update out on its own.</li>
            <li>If a release has a critical bug and everyone must stop using the old version right now, raise &quot;Minimum Supported Version&quot; to match &quot;Latest Version Code&quot; - every older install is blocked on next launch, instantly, regardless of Play Store&apos;s rollout stage.</li>
            <li>Turn &quot;Force Update&quot; off if you just want a dismissible nudge instead of a hard block.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

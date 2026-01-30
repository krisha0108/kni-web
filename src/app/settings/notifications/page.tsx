import { NotificationSettings } from "@/components/notifications/notification-settings";

export const metadata = {
  title: "Notification Settings - KNI Super App",
  description: "Manage your notification preferences",
};

export default function NotificationSettingsPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Customize how and when you receive notifications.
        </p>
      </div>

      <NotificationSettings />
    </div>
  );
}

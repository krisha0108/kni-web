"use client";

import { NotificationSettings } from "@/components/notifications/notification-settings";

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Manage your notification preferences
        </p>
      </div>

      <NotificationSettings />
    </div>
  );
}

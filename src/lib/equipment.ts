export interface WarrantyStatus {
  status: "NO_WARRANTY" | "EXPIRED" | "EXPIRING_SOON" | "VALID";
  color: "gray" | "red" | "yellow" | "green";
  daysLeft: number;
  label: string;
}

export function getWarrantyStatus(warrantyEndDate: Date | string | null): WarrantyStatus {
  if (!warrantyEndDate) {
    return {
      status: "NO_WARRANTY",
      color: "gray",
      daysLeft: 0,
      label: "No Warranty",
    };
  }

  const endDate = typeof warrantyEndDate === "string" ? new Date(warrantyEndDate) : warrantyEndDate;
  const today = new Date();
  const daysLeft = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      status: "EXPIRED",
      color: "red",
      daysLeft: 0,
      label: "Expired",
    };
  }

  if (daysLeft < 30) {
    return {
      status: "EXPIRING_SOON",
      color: "yellow",
      daysLeft,
      label: `Expires in ${daysLeft} days`,
    };
  }

  return {
    status: "VALID",
    color: "green",
    daysLeft,
    label: `Valid (${daysLeft} days left)`,
  };
}

export function getEquipmentStatusColor(status: string): "default" | "secondary" | "success" | "warning" | "destructive" {
  const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
    AVAILABLE: "success",
    IN_USE: "default",
    MAINTENANCE: "warning",
    RETIRED: "secondary",
  };
  return statusColors[status] || "default";
}

export function getEquipmentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    AVAILABLE: "Available",
    IN_USE: "In Use",
    MAINTENANCE: "Maintenance",
    RETIRED: "Retired",
  };
  return labels[status] || status;
}

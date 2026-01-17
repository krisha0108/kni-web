"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Building2,
  ClipboardList,
  Settings,
  Package,
  ShoppingCart,
  Calendar,
  Wrench,
  Store,
  FileText,
  Tag,
  Layers,
  ShoppingBag,
  Clock,
  CheckCircle,
  CreditCard,
  Wallet,
  Zap,
  Shield,
  Warehouse,
  Receipt,
  Bell,
  MapPin,
  BarChart,
  UserCheck,
  DollarSign,
  BookOpen
} from "lucide-react";

export interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  items: SidebarItem[];
  title: string;
}

export function Sidebar({ items, title }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Package className="h-6 w-6" />
          <span>{title}</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-secondary"
                )}
                asChild
              >
                <Link href={item.href}>
                  <Icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Link>
              </Button>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}

// Role-specific sidebar configurations
export const adminSidebarItems: SidebarItem[] = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Categories", href: "/admin/categories", icon: FolderOpen },
  { title: "Subcategories", href: "/admin/subcategories", icon: Layers },
  { title: "Services", href: "/admin/services", icon: Wrench },
  { title: "Parts", href: "/admin/parts", icon: Tag },
  { title: "Equipment Categories", href: "/admin/equipment-categories", icon: FolderOpen },
  { title: "Equipment Types", href: "/admin/equipment-types", icon: Zap },
  { title: "Restaurant Requests", href: "/admin/restaurants/requests", icon: Building2 },
  { title: "Category Requests", href: "/admin/category-requests", icon: FileText },
  { title: "Vendors", href: "/admin/vendors", icon: Store },
  { title: "Engineers", href: "/admin/engineers", icon: Users },
  { title: "Bookings", href: "/admin/bookings", icon: ClipboardList },
  { title: "AMC Plans", href: "/admin/amc-plans", icon: Shield },
  { title: "AMC Subscriptions", href: "/admin/amc-subscriptions", icon: FileText },
  { title: "Warehouse", href: "/admin/warehouse", icon: Warehouse },
  { title: "Payouts", href: "/admin/payouts", icon: Wallet },
  { title: "Payment Settings", href: "/admin/payment-settings", icon: CreditCard },
  { title: "Notifications", href: "/settings/notifications", icon: Bell },
];

export const ownerSidebarItems: SidebarItem[] = [
  { title: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard },
  { title: "Analytics", href: "/owner/analytics", icon: BarChart },
  { title: "My Restaurants", href: "/owner/restaurants", icon: Building2 },
  { title: "Team Management", href: "/owner/team", icon: Users },
  { title: "My Equipment", href: "/owner/equipment", icon: Zap },
  { title: "AMC Plans", href: "/owner/amc-plans", icon: Shield },
  { title: "My AMC", href: "/owner/amc-subscriptions", icon: Shield },
  { title: "My Expenses", href: "/owner/expenses", icon: Receipt },
  { title: "Khayabook", href: "/owner/khayabook", icon: Wallet },
  { title: "Staff Management", href: "/owner/staff", icon: Users },
  { title: "Staff Attendance", href: "/owner/staff/attendance", icon: UserCheck },
  { title: "Staff Salary", href: "/owner/staff/salary", icon: DollarSign },
  { title: "Vendor Ledger", href: "/owner/khayabook/vendor-ledger", icon: BookOpen },
  { title: "Category Request", href: "/owner/category-request", icon: FileText },
  { title: "Service Feed", href: "/owner/feed", icon: FolderOpen },
  { title: "My Cart", href: "/owner/cart", icon: ShoppingCart },
  { title: "Slot Booking", href: "/owner/slot-booking", icon: Calendar },
  { title: "My Bookings", href: "/owner/bookings", icon: ClipboardList },
  { title: "Marketplace", href: "/owner/marketplace", icon: ShoppingBag },
  { title: "My Orders", href: "/owner/marketplace/orders", icon: Package },
  { title: "Notifications", href: "/settings/notifications", icon: Bell },
];

export const vendorSidebarItems: SidebarItem[] = [
  { title: "Dashboard", href: "/vendor/dashboard", icon: LayoutDashboard },
  { title: "Analytics", href: "/vendor/analytics", icon: BarChart },
  { title: "My Products", href: "/vendor/products", icon: Package },
  { title: "My Orders", href: "/vendor/orders", icon: ShoppingCart },
  { title: "Coverage Settings", href: "/vendor/coverage", icon: MapPin },
  { title: "Subscription", href: "/vendor/subscription", icon: Clock },
  { title: "Notifications", href: "/settings/notifications", icon: Bell },
];

export const engineerSidebarItems: SidebarItem[] = [
  { title: "Dashboard", href: "/engineer/dashboard", icon: LayoutDashboard },
  { title: "My Jobs", href: "/engineer/jobs", icon: ClipboardList },
  { title: "Completed", href: "/engineer/completed", icon: CheckCircle },
  { title: "My Earnings", href: "/engineer/earnings", icon: Wallet },
  { title: "Notifications", href: "/settings/notifications", icon: Bell },
];

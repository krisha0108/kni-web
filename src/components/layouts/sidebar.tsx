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
  Warehouse,
  Receipt,
  Bell,
  MapPin,
  BarChart,
  UserCheck,
  DollarSign,
  BookOpen,
  Image,
  MessageSquare,
  Truck,
  PieChart,
  FileCheck,
  User,
  UserCircle,
} from "lucide-react";

export interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  items: SidebarItem[];
  title: string;
  mobile?: boolean;
}

export function Sidebar({ items, title, mobile = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn(
      "flex flex-col w-64 border-r bg-card",
      mobile ? "h-full" : "hidden lg:flex lg:fixed lg:inset-y-0"
    )}>
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
  { title: "Restaurant Requests", href: "/admin/restaurants/requests", icon: Building2 },
  { title: "Owners", href: "/admin/owners", icon: UserCircle },
  { title: "Category Requests", href: "/admin/category-requests", icon: FileText },
  // { title: "Part Requests", href: "/admin/part-requests", icon: Package }, // TODO: Parts request flow disabled
  { title: "Vendors", href: "/admin/vendors", icon: Store },
  { title: "Locations", href: "/admin/locations", icon: MapPin },
  { title: "Location Requests", href: "/admin/location-requests", icon: FileCheck },
  { title: "MP Categories", href: "/admin/marketplace/categories", icon: FolderOpen },
  { title: "MP Subcategories", href: "/admin/marketplace/subcategories", icon: Layers },
  { title: "Marketplace Products", href: "/admin/marketplace/products", icon: ShoppingBag },
  { title: "Engineers", href: "/admin/engineers", icon: Users },
  { title: "Bookings", href: "/admin/bookings", icon: ClipboardList },
  { title: "Warehouse", href: "/admin/warehouse", icon: Warehouse },
  { title: "Payouts", href: "/admin/payouts", icon: Wallet },
  { title: "Payment Settings", href: "/admin/payment-settings", icon: CreditCard },
  { title: "Content Management", href: "/admin/content", icon: Image },
  { title: "Notifications", href: "/admin/notifications", icon: Bell },
  { title: "Support Tickets", href: "/admin/support", icon: MessageSquare },
];

export const ownerSidebarItems: SidebarItem[] = [
  { title: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard },
  { title: "Analytics", href: "/owner/analytics", icon: BarChart },
  { title: "My Restaurants", href: "/owner/restaurants", icon: Building2 },
  { title: "Team Management", href: "/owner/team", icon: Users },
  { title: "My Equipment", href: "/owner/equipment", icon: Zap },
  { title: "My Expenses", href: "/owner/expenses", icon: Receipt },
  { title: "Spending Reports", href: "/owner/spending-reports", icon: PieChart },
  { title: "Khatabook", href: "/owner/khatabook", icon: Wallet },
  { title: "Staff Management", href: "/owner/staff", icon: Users },
  { title: "Staff Attendance", href: "/owner/staff/attendance", icon: UserCheck },
  { title: "Staff Salary", href: "/owner/staff/salary", icon: DollarSign },
  { title: "Vendor Ledger", href: "/owner/khatabook/vendor-ledger", icon: BookOpen },
  { title: "Category Request", href: "/owner/category-request", icon: FileText },
  { title: "My Cart", href: "/owner/cart", icon: ShoppingCart },
  // { title: "New Service Request", href: "/owner/service-request", icon: Wrench }, // TODO: Coming soon
  { title: "My Bookings", href: "/owner/bookings", icon: ClipboardList },
  { title: "Pending Approvals", href: "/owner/pending-approvals", icon: FileCheck },
  { title: "Marketplace", href: "/owner/marketplace", icon: ShoppingBag },
  { title: "My Orders", href: "/owner/marketplace/orders", icon: Package },
  { title: "Order Tracking", href: "/owner/order-tracking", icon: Truck },
  { title: "Support", href: "/owner/support", icon: MessageSquare },
  { title: "Notifications", href: "/owner/notifications", icon: Bell },
  { title: "Profile", href: "/owner/profile", icon: Settings },
];

export const vendorSidebarItems: SidebarItem[] = [
  { title: "Dashboard", href: "/vendor/dashboard", icon: LayoutDashboard },
  { title: "Analytics", href: "/vendor/analytics", icon: BarChart },
  { title: "My Categories", href: "/vendor/categories", icon: FolderOpen },
  { title: "My Products", href: "/vendor/products", icon: Package },
  { title: "My Orders", href: "/vendor/orders", icon: ShoppingCart },
  { title: "My Locations", href: "/vendor/locations", icon: MapPin },
  { title: "Subscription", href: "/vendor/subscription", icon: Clock },
  { title: "Notifications", href: "/vendor/notifications", icon: Bell },
  { title: "Profile", href: "/vendor/profile", icon: User },
];

export const engineerSidebarItems: SidebarItem[] = [
  { title: "Dashboard", href: "/engineer/dashboard", icon: LayoutDashboard },
  { title: "My Jobs", href: "/engineer/jobs", icon: ClipboardList },
  { title: "Completed", href: "/engineer/completed", icon: CheckCircle },
  // { title: "Parts Request", href: "/engineer/parts-request", icon: Package }, // TODO: Parts request flow disabled
  { title: "My Earnings", href: "/engineer/earnings", icon: Wallet },
  { title: "Notifications", href: "/engineer/notifications", icon: Bell },
  { title: "Profile", href: "/engineer/profile", icon: User },
];

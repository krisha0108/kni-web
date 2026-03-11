"use client";

import { useState, useEffect } from "react";
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
  Shield,
  AlertTriangle,
  ChevronDown,
  QrCode,
} from "lucide-react";

export interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface SidebarGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: SidebarItem[];
}

export interface SidebarSectionHeader {
  sectionTitle: string;
}

export type SidebarEntry = SidebarItem | SidebarGroup | SidebarSectionHeader;

function isGroup(entry: SidebarEntry): entry is SidebarGroup {
  return "children" in entry;
}

function isSectionHeader(entry: SidebarEntry): entry is SidebarSectionHeader {
  return "sectionTitle" in entry;
}

interface SidebarProps {
  items: SidebarEntry[];
  title: string;
  mobile?: boolean;
}

export function Sidebar({ items, title, mobile = false }: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Auto-open groups that contain the active route
  useEffect(() => {
    const activeGroups = new Set<string>();
    items.forEach((entry) => {
      if (isGroup(entry)) {
        const hasActive = entry.children.some(
          (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
        );
        if (hasActive) activeGroups.add(entry.title);
      }
    });
    if (activeGroups.size > 0) {
      setOpenGroups((prev) => new Set([...prev, ...activeGroups]));
    }
  }, [pathname, items]);

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupTitle)) next.delete(groupTitle);
      else next.add(groupTitle);
      return next;
    });
  };

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
          {items.map((entry, idx) => {
            if (isSectionHeader(entry)) {
              return (
                <div key={`section-${entry.sectionTitle}`} className={cn("px-2 pt-4 pb-1", idx > 0 && "mt-2 border-t")}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {entry.sectionTitle}
                  </span>
                </div>
              );
            }

            if (isGroup(entry)) {
              const Icon = entry.icon;
              const isOpen = openGroups.has(entry.title);
              const hasActive = entry.children.some(
                (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
              );
              return (
                <div key={entry.title}>
                  <Button
                    variant={hasActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-between",
                      hasActive && "bg-secondary"
                    )}
                    onClick={() => toggleGroup(entry.title)}
                  >
                    <span className="flex items-center">
                      <Icon className="mr-2 h-4 w-4" />
                      {entry.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  </Button>
                  {isOpen && (
                    <div className="ml-4 mt-1 space-y-1 border-l pl-2">
                      {entry.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                        return (
                          <Button
                            key={child.href}
                            variant={isActive ? "secondary" : "ghost"}
                            size="sm"
                            className={cn(
                              "w-full justify-start",
                              isActive && "bg-secondary"
                            )}
                            asChild
                          >
                            <Link href={child.href}>
                              <ChildIcon className="mr-2 h-3.5 w-3.5" />
                              {child.title}
                            </Link>
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const Icon = entry.icon;
            const isActive = pathname === entry.href || pathname.startsWith(`${entry.href}/`);
            return (
              <Button
                key={entry.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-secondary"
                )}
                asChild
              >
                <Link href={entry.href}>
                  <Icon className="mr-2 h-4 w-4" />
                  {entry.title}
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
export const adminSidebarItems: SidebarEntry[] = [
  // ── Core ──
  { sectionTitle: "Core" },
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },

  // ── Equipment & Services ──
  { sectionTitle: "Equipment & Services" },
  { title: "Categories", href: "/admin/categories", icon: FolderOpen },
  { title: "Subcategories", href: "/admin/subcategories", icon: Layers },
  { title: "Services", href: "/admin/services", icon: Wrench },
  { title: "Parts", href: "/admin/parts", icon: Tag },

  // ── Management ──
  { sectionTitle: "Management" },
  {
    title: "Owners",
    icon: UserCircle,
    children: [
      { title: "Restaurant Requests", href: "/admin/restaurants/requests", icon: Building2 },
      { title: "Owners", href: "/admin/owners", icon: UserCircle },
      { title: "Category Requests", href: "/admin/category-requests", icon: FileText },
    ],
  },
  {
    title: "Vendors",
    icon: Store,
    children: [
      { title: "Vendors", href: "/admin/vendors", icon: Store },
      { title: "Subscription Requests", href: "/admin/vendor-subscriptions", icon: CreditCard },
      { title: "Vendor Commissions", href: "/admin/vendor-commissions", icon: Receipt },
      { title: "Locations", href: "/admin/locations", icon: MapPin },
      { title: "Location Requests", href: "/admin/location-requests", icon: FileCheck },
    ],
  },
  { title: "Engineers", href: "/admin/engineers", icon: Users },
  { title: "Bookings", href: "/admin/bookings", icon: ClipboardList },

  // ── Commerce ──
  { sectionTitle: "Commerce" },
  {
    title: "Marketplace",
    icon: ShoppingBag,
    children: [
      { title: "MP Categories", href: "/admin/marketplace/categories", icon: FolderOpen },
      { title: "MP Subcategories", href: "/admin/marketplace/subcategories", icon: Layers },
      { title: "Marketplace Products", href: "/admin/marketplace/products", icon: ShoppingBag },
    ],
  },
  {
    title: "KNI Official Store",
    icon: Warehouse,
    children: [
      { title: "My Store Products", href: "/admin/my-store/products", icon: Store },
      { title: "Price Requests", href: "/admin/my-store/price-requests", icon: Tag },
      { title: "My Store Orders", href: "/admin/my-store/orders", icon: ShoppingCart },
      { title: "Store Payment Settings", href: "/admin/my-store/payment-settings", icon: QrCode },
      { title: "My Store Analytics", href: "/admin/my-store/analytics", icon: BarChart },
    ],
  },
  { title: "Warehouse", href: "/admin/warehouse", icon: Warehouse },
  { title: "Payouts", href: "/admin/payouts", icon: Wallet },
  { title: "Payment Settings", href: "/admin/payment-settings", icon: CreditCard },

  // ── AMC ──
  { sectionTitle: "AMC" },
  {
    title: "AMC",
    icon: Shield,
    children: [
      { title: "AMC Dashboard", href: "/admin/amc-dashboard", icon: Shield },
      { title: "AMC Requests", href: "/admin/amc-requests", icon: Shield },
      { title: "AMC Visits", href: "/admin/amc-visits", icon: Clock },
      { title: "AMC Breakdowns", href: "/admin/amc-breakdowns", icon: AlertTriangle },
    ],
  },

  // ── Others ──
  { sectionTitle: "Others" },
  { title: "Content Management", href: "/admin/content", icon: Image },
  { title: "Notifications", href: "/admin/notifications", icon: Bell },
  { title: "Support Tickets", href: "/admin/support", icon: MessageSquare },
];

export const ownerSidebarItems: SidebarEntry[] = [
  // ── Core ──
  { sectionTitle: "Core" },
  { title: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard },
  { title: "Analytics", href: "/owner/analytics", icon: BarChart },

  // ── Restaurant ──
  { sectionTitle: "Restaurant" },
  { title: "My Restaurants", href: "/owner/restaurants", icon: Building2 },
  { title: "Team Management", href: "/owner/team", icon: Users },
  { title: "My Equipment", href: "/owner/equipment", icon: Zap },
  { title: "Category Request", href: "/owner/category-request", icon: FileText },

  // ── Finance ──
  { sectionTitle: "Finance" },
  {
    title: "Khatabook",
    icon: Wallet,
    children: [
      { title: "Khatabook", href: "/owner/khatabook", icon: Wallet },
      { title: "My Expenses", href: "/owner/expenses", icon: Receipt },
      { title: "Spending Reports", href: "/owner/spending-reports", icon: PieChart },
      { title: "Vendor Ledger", href: "/owner/khatabook/vendor-ledger", icon: BookOpen },
    ],
  },
  {
    title: "Staff",
    icon: Users,
    children: [
      { title: "Staff Management", href: "/owner/staff", icon: Users },
      { title: "Attendance", href: "/owner/staff/attendance", icon: UserCheck },
      { title: "Salary", href: "/owner/staff/salary", icon: DollarSign },
    ],
  },

  // ── Services ──
  { sectionTitle: "Services" },
  { title: "My Bookings", href: "/owner/bookings", icon: ClipboardList },
  { title: "Pending Approvals", href: "/owner/pending-approvals", icon: FileCheck },
  {
    title: "AMC",
    icon: Shield,
    children: [
      { title: "AMC Dashboard", href: "/owner/amc-dashboard", icon: Shield },
      { title: "AMC Requests", href: "/owner/amc-requests", icon: Shield },
      { title: "AMC Contracts", href: "/owner/amc-contracts", icon: FileCheck },
    ],
  },

  // ── Shopping ──
  { sectionTitle: "Shopping" },
  {
    title: "Marketplace",
    icon: ShoppingBag,
    children: [
      { title: "Marketplace", href: "/owner/marketplace", icon: ShoppingBag },
      { title: "Cart", href: "/owner/marketplace/cart", icon: ShoppingCart },
      { title: "My Orders", href: "/owner/marketplace/orders", icon: Package },
      { title: "Order Tracking", href: "/owner/order-tracking", icon: Truck },
    ],
  },

  // ── Others ──
  { sectionTitle: "Others" },
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
  { title: "Payment Settings", href: "/vendor/payment-settings", icon: QrCode },
  { title: "My Locations", href: "/vendor/locations", icon: MapPin },
  { title: "Subscription", href: "/vendor/subscription", icon: Clock },
  { title: "Commission", href: "/vendor/commission", icon: Receipt },
  { title: "Notifications", href: "/vendor/notifications", icon: Bell },
  { title: "Profile", href: "/vendor/profile", icon: User },
];


export const engineerSidebarItems: SidebarItem[] = [
  { title: "Dashboard", href: "/engineer/dashboard", icon: LayoutDashboard },
  { title: "My Jobs", href: "/engineer/jobs", icon: ClipboardList },
  { title: "Completed", href: "/engineer/completed", icon: CheckCircle },
  { title: "AMC Tasks", href: "/engineer/amc-tasks", icon: Shield },
  // { title: "Parts Request", href: "/engineer/parts-request", icon: Package }, // TODO: Parts request flow disabled
  { title: "My Earnings", href: "/engineer/earnings", icon: Wallet },
  { title: "Notifications", href: "/engineer/notifications", icon: Bell },
  { title: "Profile", href: "/engineer/profile", icon: User },
];

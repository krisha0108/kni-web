"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRestaurant } from "@/contexts/restaurant-context";
import {
  Search,
  Wrench,
  ClipboardList,
  Wallet,
  Users,
  Package,
  Store,
  Loader2,
} from "lucide-react";

interface SearchResults {
  equipment: Array<{
    id: string;
    name: string;
    brand: string | null;
    status: string;
    link: string;
  }>;
  bookings: Array<{
    id: string;
    restaurantName: string;
    status: string;
    amount: number;
    link: string;
  }>;
  expenses: Array<{
    id: string;
    description: string;
    category: string;
    amount: number;
    link: string;
  }>;
  staff: Array<{
    id: string;
    name: string;
    designation: string;
    phone: string;
    link: string;
  }>;
  orders: Array<{
    id: string;
    vendorName: string;
    amount: number;
    status: string;
    link: string;
  }>;
  vendors: Array<{
    id: string;
    name: string;
    link: string;
  }>;
}

const CATEGORY_CONFIG = {
  equipment: {
    label: "Equipment",
    icon: Wrench,
  },
  bookings: {
    label: "Bookings",
    icon: ClipboardList,
  },
  expenses: {
    label: "Expenses",
    icon: Wallet,
  },
  staff: {
    label: "Staff",
    icon: Users,
  },
  orders: {
    label: "Orders",
    icon: Package,
  },
  vendors: {
    label: "Vendors",
    icon: Store,
  },
} as const;

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { selectedRestaurant } = useRestaurant();

  // Keyboard shortcut: Ctrl+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults(null);
      setHasSearched(false);
    }
  }, [open]);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2 || !selectedRestaurant) {
        setResults(null);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);

      try {
        const res = await fetch(
          `/api/owner/search?q=${encodeURIComponent(searchQuery)}&restaurantId=${selectedRestaurant.restaurantId}`
        );
        const data = await res.json();

        if (data.ok) {
          setResults(data.data);
        } else {
          setResults(null);
        }
      } catch {
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedRestaurant]
  );

  // Debounced search
  const handleInputChange = (value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleResultClick = (link: string) => {
    setOpen(false);
    router.push(link);
  };

  const totalResults = results
    ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderResultItem = (
    category: keyof typeof CATEGORY_CONFIG,
    item: any
  ) => {
    const config = CATEGORY_CONFIG[category];
    const Icon = config.icon;

    let title = "";
    let subtitle = "";

    switch (category) {
      case "equipment":
        title = item.name;
        subtitle = [item.brand, item.status].filter(Boolean).join(" - ");
        break;
      case "bookings":
        title = `Booking #${item.bookingNumber ?? item.id.slice(0, 8)}`;
        subtitle = `${item.restaurantName} - ${item.status} - ${formatAmount(item.amount)}`;
        break;
      case "expenses":
        title = item.description;
        subtitle = `${item.category} - ${formatAmount(item.amount)}`;
        break;
      case "staff":
        title = item.name;
        subtitle = `${item.designation} - ${item.phone}`;
        break;
      case "orders":
        title = `Order #${item.orderNumber ?? item.id.slice(0, 8)}`;
        subtitle = `${item.vendorName} - ${item.status} - ${formatAmount(item.amount)}`;
        break;
      case "vendors":
        title = item.name;
        subtitle = "Vendor";
        break;
    }

    return (
      <button
        key={`${category}-${item.id}`}
        className="flex items-center gap-3 w-full px-3 py-2.5 text-left rounded-md hover:bg-accent transition-colors"
        onClick={() => handleResultClick(item.link)}
      >
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
      </button>
    );
  };

  return (
    <>
      <Button
        data-tour="search"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Global Search</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Search equipment, bookings, staff, orders..."
              className="h-12 border-0 shadow-none focus-visible:ring-0 text-base"
            />
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
            )}
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Esc
            </kbd>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!hasSearched && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">
                  Type at least 2 characters to search
                </p>
                <p className="text-xs mt-1 opacity-60">
                  Press <kbd className="px-1 border rounded text-[10px]">Ctrl</kbd> +{" "}
                  <kbd className="px-1 border rounded text-[10px]">K</kbd> anytime to open
                </p>
              </div>
            )}

            {hasSearched && !isLoading && totalResults === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No results found</p>
                <p className="text-xs mt-1 opacity-60">
                  Try a different search term
                </p>
              </div>
            )}

            {results &&
              totalResults > 0 &&
              (
                Object.entries(results) as [
                  keyof typeof CATEGORY_CONFIG,
                  any[],
                ][]
              ).map(([category, items]) => {
                if (items.length === 0) return null;
                const config = CATEGORY_CONFIG[category];

                return (
                  <div key={category} className="mb-2">
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {config.label}
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {items.length}
                      </Badge>
                    </div>
                    {items.map((item) => renderResultItem(category, item))}
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

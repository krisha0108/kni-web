"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  UserCheck,
  UserX,
  Building2,
  Calendar,
  Wrench,
  ShoppingCart,
  ShieldCheck,
  Wallet,
  History,
  Mail,
  Phone,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

interface OwnerDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  serviceDiscountPercent: number | null;
  ownerProfile: { approvalStatus: ApprovalStatus; rejectionReason: string | null; approvedAt: string | null } | null;
  restaurants: { id: string; name: string; address: string; city: string; status: string; createdAt: string }[];
  stats: { totalRestaurants: number; approvedRestaurants: number; pendingRestaurants: number; totalBookings: number; totalOrders: number };
}

const statusColors: Record<string, "default" | "success" | "destructive" | "warning"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

const TABS = [
  { value: "overview", label: "Overview", icon: UserCheck },
  { value: "restaurant", label: "Restaurant", icon: Building2 },
  { value: "bookings", label: "Bookings", icon: Calendar },
  { value: "services", label: "Services", icon: Wrench },
  { value: "orders", label: "Orders", icon: ShoppingCart },
  { value: "amc", label: "AMC/CAMC", icon: ShieldCheck },
  { value: "payments", label: "Payments", icon: Wallet },
  { value: "activity", label: "Activity History", icon: History },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const ACTIVITY_TYPE_META: Record<string, { icon: typeof Building2; iconClass: string; bgClass: string }> = {
  restaurant: { icon: Building2, iconClass: "text-blue-600", bgClass: "bg-blue-100" },
  booking: { icon: Calendar, iconClass: "text-violet-600", bgClass: "bg-violet-100" },
  service: { icon: Wrench, iconClass: "text-amber-600", bgClass: "bg-amber-100" },
  order: { icon: ShoppingCart, iconClass: "text-emerald-600", bgClass: "bg-emerald-100" },
  amc: { icon: ShieldCheck, iconClass: "text-rose-600", bgClass: "bg-rose-100" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupActivityByDay(entries: any[]) {
  const groups: { label: string; items: typeof entries }[] = [];
  for (const entry of entries) {
    const label = new Date(entry.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(entry);
    } else {
      groups.push({ label, items: [entry] });
    }
  }
  return groups;
}

export default function AdminOwnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabValue>("overview");
  const [owner, setOwner] = useState<OwnerDetail | null>(null);
  const [isLoadingOwner, setIsLoadingOwner] = useState(true);

  const [discountInput, setDiscountInput] = useState("");
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Lazy per-tab data, fetched once on first visit to that tab.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tabData, setTabData] = useState<Record<string, any>>({});
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({});

  const fetchOwner = useCallback(async () => {
    setIsLoadingOwner(true);
    try {
      const res = await fetch(`/api/admin/owners/${id}`);
      const json = await res.json();
      if (json.ok) {
        setOwner(json.data);
        setDiscountInput(json.data.serviceDiscountPercent != null ? String(json.data.serviceDiscountPercent) : "");
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch owner", variant: "destructive" });
    } finally {
      setIsLoadingOwner(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchOwner();
  }, [fetchOwner]);

  const fetchTab = useCallback(
    async (tab: TabValue) => {
      if (tab === "overview" || tab === "restaurant" || tabData[tab] || tabLoading[tab]) return;
      setTabLoading((prev) => ({ ...prev, [tab]: true }));
      try {
        const res = await fetch(`/api/admin/owners/${id}/${tab}`);
        const json = await res.json();
        if (json.ok) {
          setTabData((prev) => ({ ...prev, [tab]: json.data }));
        } else {
          toast({ title: "Error", description: json.error, variant: "destructive" });
        }
      } catch {
        toast({ title: "Error", description: `Failed to load ${tab}`, variant: "destructive" });
      } finally {
        setTabLoading((prev) => ({ ...prev, [tab]: false }));
      }
    },
    [id, tabData, tabLoading, toast]
  );

  useEffect(() => {
    fetchTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleToggleStatus = async (newStatus: boolean) => {
    setIsTogglingStatus(true);
    try {
      const res = await fetch(`/api/admin/owners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "Success", description: newStatus ? "Owner activated" : "Owner deactivated" });
        setOwner((prev) => (prev ? { ...prev, isActive: newStatus } : prev));
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update owner status", variant: "destructive" });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleSaveDiscount = async () => {
    const trimmed = discountInput.trim();
    let value: number | null;
    if (trimmed === "") {
      value = null;
    } else {
      value = Number(trimmed);
      if (Number.isNaN(value) || value < 0 || value > 100) {
        toast({ title: "Error", description: "Discount must be a number between 0 and 100", variant: "destructive" });
        return;
      }
    }
    setIsSavingDiscount(true);
    try {
      const res = await fetch(`/api/admin/owners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceDiscountPercent: value }),
      });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "Success", description: "Discount updated" });
        setOwner((prev) => (prev ? { ...prev, serviceDiscountPercent: value } : prev));
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update discount", variant: "destructive" });
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const handleApprove = async () => {
    setIsSubmittingApproval(true);
    try {
      const res = await fetch(`/api/admin/owners/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "Owner Approved", description: "The owner can now log in and add a restaurant." });
        fetchOwner();
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to approve owner", variant: "destructive" });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleReject = async () => {
    if (rejectionReason.trim().length < 10) {
      toast({ title: "Error", description: "Rejection reason must be at least 10 characters", variant: "destructive" });
      return;
    }
    setIsSubmittingApproval(true);
    try {
      const res = await fetch(`/api/admin/owners/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason }),
      });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "Owner Rejected", description: "The owner has been notified." });
        setIsRejectOpen(false);
        setRejectionReason("");
        fetchOwner();
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to reject owner", variant: "destructive" });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  if (isLoadingOwner) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!owner) {
    return <div className="text-center py-12 text-muted-foreground">Owner not found</div>;
  }

  const approvalStatus = owner.ownerProfile?.approvalStatus ?? "APPROVED";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/owners")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{owner.name}</h1>
            <p className="text-muted-foreground flex items-center gap-3 flex-wrap text-sm">
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {owner.email}</span>
              {owner.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {owner.phone}</span>}
              <span>Joined {formatDate(owner.createdAt)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={owner.isActive ? "success" : "destructive"}>{owner.isActive ? "Active" : "Inactive"}</Badge>
          <Badge variant={statusColors[approvalStatus]}>
            {approvalStatus === "PENDING" ? "Pending Approval" : approvalStatus}
          </Badge>
          {approvalStatus === "PENDING" ? (
            <>
              <Button size="sm" variant="destructive" onClick={() => setIsRejectOpen(true)} disabled={isSubmittingApproval}>
                <UserX className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button size="sm" onClick={handleApprove} disabled={isSubmittingApproval}>
                {isSubmittingApproval ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1" />}
                Approve
              </Button>
            </>
          ) : owner.isActive ? (
            <Button size="sm" variant="destructive" onClick={() => handleToggleStatus(false)} disabled={isTogglingStatus}>
              {isTogglingStatus ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserX className="h-4 w-4 mr-1" />}
              Deactivate
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleToggleStatus(true)} disabled={isTogglingStatus}>
              {isTogglingStatus ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1" />}
              Activate
            </Button>
          )}
        </div>
      </div>

      {approvalStatus === "REJECTED" && owner.ownerProfile?.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <span className="font-semibold">Rejection reason: </span>
          {owner.ownerProfile.rejectionReason}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1 text-xs sm:text-sm">
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{owner.stats.totalRestaurants}</p><p className="text-xs text-muted-foreground">Restaurants</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{owner.stats.approvedRestaurants}</p><p className="text-xs text-muted-foreground">Approved</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{owner.stats.totalBookings}</p><p className="text-xs text-muted-foreground">Bookings</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{owner.stats.totalOrders}</p><p className="text-xs text-muted-foreground">Orders</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Service/Parts Discount</CardTitle></CardHeader>
            <CardContent className="flex items-end gap-2">
              <div className="flex-1 max-w-[160px]">
                <p className="text-sm text-muted-foreground mb-1">Custom discount %</p>
                <Input type="number" min={0} max={100} placeholder="Default" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} />
              </div>
              <Button size="sm" onClick={handleSaveDiscount} disabled={isSavingDiscount}>
                {isSavingDiscount ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="restaurant" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Restaurants ({owner.restaurants.length})</CardTitle></CardHeader>
            <CardContent>
              {owner.restaurants.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No restaurants registered</p>
              ) : (
                <div className="space-y-3">
                  {owner.restaurants.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-sm text-muted-foreground">{r.address}, {r.city}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Calendar className="h-3 w-3" /> {formatDate(r.createdAt)}</p>
                      </div>
                      <Badge variant={statusColors[r.status] || "default"}>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <TabLoading loading={tabLoading.bookings} empty={tabData.bookings?.length === 0} emptyText="No bookings yet">
            <div className="space-y-3">
              {(tabData.bookings || []).map((b: any) => (
                <Card key={b.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium">{b.bookingNumber ?? b.id} &middot; {b.restaurant.name}</p>
                      <p className="text-sm text-muted-foreground">{b.equipment?.name ?? "Equipment service"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {b.slotStartDateTime ? formatDateTime(b.slotStartDateTime) : "Slot not set"} &middot; ₹{b.totalAmount}
                      </p>
                      {b.engineerAssignments[0] && (
                        <p className="text-xs text-muted-foreground mt-1">Engineer: {b.engineerAssignments[0].engineer.name} ({b.engineerAssignments[0].status})</p>
                      )}
                    </div>
                    <Badge variant="outline">{b.status.replace(/_/g, " ")}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabLoading>
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <TabLoading loading={tabLoading.services} empty={tabData.services?.length === 0} emptyText="No service visits yet">
            <div className="space-y-3">
              {(tabData.services || []).map((s: any) => (
                <Card key={`${s.source}-${s.id}`}>
                  <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium">{s.reference} &middot; {s.restaurantName}</p>
                      <p className="text-sm text-muted-foreground">Engineer: {s.engineer?.name ?? "Unassigned"}</p>
                      {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{formatDateTime(s.date)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="text-xs capitalize">{s.source === "amc" ? "AMC visit" : "Booking"}</Badge>
                      <Badge variant="outline">{s.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabLoading>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <TabLoading loading={tabLoading.orders} empty={tabData.orders?.length === 0} emptyText="No marketplace orders yet">
            <div className="space-y-3">
              {(tabData.orders || []).map((o: any) => (
                <Card key={o.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium">{o.orderNumber ?? o.id} &middot; {o.restaurant.name}</p>
                      <p className="text-sm text-muted-foreground">Vendor: {o.vendor.name} &middot; {o.items.length} item(s)</p>
                      <p className="text-xs text-muted-foreground mt-1">₹{o.totalAmount} &middot; {formatDate(o.createdAt)}</p>
                    </div>
                    <Badge variant="outline">{o.status.replace(/_/g, " ")}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabLoading>
        </TabsContent>

        <TabsContent value="amc" className="mt-4">
          <TabLoading
            loading={tabLoading.amc}
            empty={tabData.amc && tabData.amc.requests.length === 0 && tabData.amc.legacySubscriptions.length === 0}
            emptyText="No AMC/CAMC history yet"
          >
            <div className="space-y-4">
              {(tabData.amc?.requests || []).map((r: any) => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
                      <span>{r.contractCategory} request &middot; {r.restaurant.name}</span>
                      <Badge variant="outline">{r.status.replace(/_/g, " ")}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">
                      {r.planType} plan &middot; {r.visitFrequency} visits &middot; requested {formatDate(r.createdAt)}
                    </p>
                    {r.proposal?.contract && (
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="font-medium">Contract {r.proposal.contract.contractNumber}</p>
                          <Badge variant={r.proposal.contract.status === "ACTIVE" ? "success" : "outline"}>{r.proposal.contract.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(r.proposal.contract.startDate)} &rarr; {formatDate(r.proposal.contract.endDate)} &middot; ₹{r.proposal.contract.amount}
                        </p>
                        {r.proposal.contract.scheduledVisits.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scheduled visits</p>
                            {r.proposal.contract.scheduledVisits.map((v: any) => (
                              <div key={v.id} className="flex items-center justify-between text-xs">
                                <span>#{v.visitNumber} ({v.visitType}) &middot; {v.engineer?.name ?? "Unassigned"} &middot; {formatDate(v.scheduledDate)}</span>
                                <Badge variant="outline" className="text-xs">{v.status.replace(/_/g, " ")}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                        {r.proposal.contract.breakdownRequests.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Breakdown requests</p>
                            {r.proposal.contract.breakdownRequests.map((b: any) => (
                              <div key={b.id} className="flex items-center justify-between text-xs">
                                <span>{b.equipmentName} &middot; {b.urgency} &middot; {formatDate(b.createdAt)}</span>
                                <Badge variant="outline" className="text-xs">{b.status}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {(tabData.amc?.legacySubscriptions || []).length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Legacy AMC Subscriptions</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {tabData.amc.legacySubscriptions.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
                        <span>{s.contractNumber ?? s.id} &middot; {s.restaurant.name} &middot; {s.source}</span>
                        <Badge variant="outline">{s.status}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabLoading>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <TabLoading loading={tabLoading.payments} empty={tabData.payments?.length === 0} emptyText="No payment/expense records yet">
            <div className="space-y-2">
              {(tabData.payments || []).map((p: any) => (
                <div key={`${p.source}-${p.id}`} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                  <div>
                    <p className="font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.restaurantName} &middot; {formatDate(p.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{p.amount}</p>
                    {p.status && <Badge variant="outline" className="text-xs">{p.status}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </TabLoading>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <TabLoading loading={tabLoading.activity} empty={tabData.activity?.length === 0} emptyText="No activity recorded yet">
            <div className="space-y-6">
              {groupActivityByDay(tabData.activity || []).map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{group.label}</p>
                  <div className="relative space-y-4 border-l pl-10 ml-3">
                    {group.items.map((a: any) => {
                      const meta = ACTIVITY_TYPE_META[a.type] ?? ACTIVITY_TYPE_META.booking;
                      const Icon = meta.icon;
                      return (
                        <div key={a.id} className="relative">
                          <span className={`absolute -left-[54px] top-0 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-background ${meta.bgClass}`}>
                            <Icon className={`h-3.5 w-3.5 ${meta.iconClass}`} />
                          </span>
                          <p className="text-sm font-medium leading-snug">{a.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {a.restaurantName ? `${a.restaurantName} · ` : ""}
                            {new Date(a.date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TabLoading>
        </TabsContent>
      </Tabs>

      <Dialog open={isRejectOpen} onOpenChange={(open) => { setIsRejectOpen(open); if (!open) setRejectionReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>Tell <strong>{owner.name}</strong> why their owner registration was rejected. This is shown to them.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. FSSAI details could not be verified. Please reapply with valid documents."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsRejectOpen(false); setRejectionReason(""); }} disabled={isSubmittingApproval}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSubmittingApproval}>
              {isSubmittingApproval ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserX className="h-4 w-4 mr-2" />}
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabLoading({
  loading,
  empty,
  emptyText,
  children,
}: {
  loading?: boolean;
  empty?: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (empty) {
    return <p className="text-center text-muted-foreground py-12 text-sm">{emptyText}</p>;
  }
  return <>{children}</>;
}

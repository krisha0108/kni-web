"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Gift, Plus, Loader2, Pause, Play, Trash2, ImageIcon, Share2, Copy, MessageCircle, Mail } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Offer {
  id: string;
  name: string;
  type: "FIRST_BOOKING" | "PROMOTIONAL";
  discountPercent: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: { name: string } | null;
  code: string | null;
  category: { name: string } | null;
  maxRedemptions: number | null;
  onePerOwner: boolean;
  imageUrl: string | null;
  description: string | null;
  sortOrder: number;
  _count: { redemptions: number };
}

interface Category {
  id: string;
  name: string;
}

function offerStatus(offer: Offer): { label: string; variant: "success" | "secondary" | "outline" | "destructive" } {
  if (!offer.isActive) return { label: "Paused", variant: "secondary" };
  const now = new Date();
  if (offer.startDate && new Date(offer.startDate) > now) return { label: "Upcoming", variant: "outline" };
  if (offer.endDate && new Date(offer.endDate) < now) return { label: "Expired", variant: "destructive" };
  if (offer.maxRedemptions != null && offer._count.redemptions >= offer.maxRedemptions) return { label: "Exhausted", variant: "destructive" };
  return { label: "Active", variant: "success" };
}

/** Builds the WhatsApp-friendly share message for an offer — bolds the promo
 * code (WhatsApp renders *text* as bold) so it stands out for copy/paste,
 * and only mentions "use code" when the offer actually has one (auto-apply
 * offers need no code, so that line is skipped instead of showing "code:
 * null"). */
function buildShareMessage(offer: Offer): string {
  const scope = offer.category ? ` on ${offer.category.name} services` : "";
  const lines = [
    `🎉 *${offer.name}*`,
    `Get *${offer.discountPercent}% OFF*${scope} with KNI Super App!`,
  ];
  if (offer.description) lines.push(offer.description);
  if (offer.code) {
    lines.push("", `Use code: *${offer.code}*`);
  } else {
    lines.push("", "Auto-applied at checkout — no code needed!");
  }
  if (offer.endDate) lines.push(`Valid till ${formatDate(offer.endDate)}`);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kitchennetworkinternational.com";
  lines.push("", `Book now: ${appUrl}`);
  return lines.join("\n");
}

const EMPTY_FORM = {
  name: "",
  type: "PROMOTIONAL" as "FIRST_BOOKING" | "PROMOTIONAL",
  discountPercent: "",
  startDate: "",
  endDate: "",
  code: "",
  categoryId: "none",
  maxRedemptions: "",
  onePerOwner: false,
  imageUrl: "",
  description: "",
  sortOrder: "0",
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  // Checked client-side only (post-mount) rather than inline during render,
  // so server and first client render always agree on markup - avoids a
  // hydration mismatch between environments that do/don't support the Web
  // Share API.
  const [canNativeShare, setCanNativeShare] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const fetchOffers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/booking-offers");
      const data = await res.json();
      if (data.ok) setOffers(data.data);
    } catch {
      toast({ title: "Error", description: "Failed to fetch offers", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetch("/api/admin/categories?pageSize=1000")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setCategories(data.data.items || []);
      })
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.discountPercent) {
      toast({ title: "Error", description: "Name and discount % are required", variant: "destructive" });
      return;
    }
    if (!form.imageUrl) {
      toast({ title: "Error", description: "Offer image is required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/booking-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          discountPercent: parseInt(form.discountPercent, 10),
          startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
          code: form.code.trim() || undefined,
          categoryId: form.categoryId !== "none" ? form.categoryId : undefined,
          maxRedemptions: form.maxRedemptions ? parseInt(form.maxRedemptions, 10) : undefined,
          onePerOwner: form.onePerOwner,
          imageUrl: form.imageUrl,
          description: form.description.trim() || undefined,
          sortOrder: form.sortOrder ? parseInt(form.sortOrder, 10) : undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "Offer created" });
        setIsCreateOpen(false);
        setForm(EMPTY_FORM);
        fetchOffers();
      } else {
        toast({ title: "Error", description: data.error || "Failed to create offer", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create offer", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (offer: Offer) => {
    try {
      const res = await fetch(`/api/admin/booking-offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !offer.isActive }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchOffers();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update offer", variant: "destructive" });
    }
  };

  // Native share sheet (covers "every other app" in one tap) - only offered
  // when the browser actually supports it, so we never call an API that
  // doesn't exist. A user dismissing the share sheet rejects with
  // AbortError, which is expected and not an error to report.
  const handleNativeShare = async (offer: Offer) => {
    try {
      await navigator.share({ title: offer.name, text: buildShareMessage(offer) });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast({ title: "Error", description: "Failed to open share sheet", variant: "destructive" });
    }
  };

  const handleWhatsAppShare = (offer: Offer) => {
    const url = `https://wa.me/?text=${encodeURIComponent(buildShareMessage(offer))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Uses Gmail's web compose URL rather than a mailto: link - mailto only
  // works if the OS has a default mail app registered (Outlook etc.), which
  // most admin desktops don't have configured, so it silently does nothing
  // no matter how it's dispatched. Gmail's compose-in-browser URL is a real
  // https:// link (same pattern as the WhatsApp wa.me share below) that
  // opens for anyone signed into Gmail, with no local app/config required.
  // No recipient is prefilled - the admin picks who to send it to.
  const handleEmailShare = (offer: Offer) => {
    const subject = encodeURIComponent(`${offer.name} — ${offer.discountPercent}% off on KNI Super App`);
    const body = encodeURIComponent(buildShareMessage(offer));
    const url = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // navigator.clipboard.writeText requires a secure context (fails outright
  // over plain http on a non-localhost host) and can also silently reject
  // with "Document is not focused" if focus shifts before the promise
  // resolves - which happens here because selecting a Radix DropdownMenuItem
  // immediately starts closing the menu and returning focus to the trigger.
  // Fall back to the older execCommand('copy') path (synchronous, via a
  // temporary textarea) whenever the modern API is unavailable or rejects.
  const legacyCopy = (text: string): boolean => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  };

  const copyText = async (text: string, successDescription: string) => {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
    } catch {
      if (!legacyCopy(text)) {
        toast({ title: "Error", description: "Failed to copy", variant: "destructive" });
        return;
      }
    }
    toast({ title: "Copied!", description: successDescription });
  };

  const handleCopyMessage = (offer: Offer) => copyText(buildShareMessage(offer), "Offer message copied to clipboard");
  const handleCopyCode = (offer: Offer) => {
    if (!offer.code) return;
    copyText(offer.code, `Code "${offer.code}" copied to clipboard`);
  };

  const handleDelete = async (offer: Offer) => {
    try {
      const res = await fetch(`/api/admin/booking-offers/${offer.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Deleted", description: "Offer removed" });
        fetchOffers();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete offer", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6" />
            Offers
          </h1>
          <p className="text-muted-foreground">
            Run welcome offers, promo codes, or time-limited promotions on service/parts bookings — shown with an image on the mobile & web home screen. The highest applicable discount wins automatically.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Offer
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : offers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No offers yet</p>
            <p className="text-sm text-muted-foreground">Create a welcome offer or a promotional campaign</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Redemptions</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => {
                    const status = offerStatus(offer);
                    return (
                      <TableRow key={offer.id}>
                        <TableCell>
                          {offer.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={offer.imageUrl}
                              alt={offer.name}
                              className="h-10 w-16 object-cover rounded"
                            />
                          ) : (
                            <div className="h-10 w-16 rounded bg-muted flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {offer.name}
                          {offer.onePerOwner && (
                            <span className="block text-xs text-muted-foreground font-normal">1 per owner</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {offer.type === "FIRST_BOOKING" ? "First Booking" : "Promotional"}
                          </Badge>
                        </TableCell>
                        <TableCell>{offer.discountPercent}%</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {offer.category ? offer.category.name : "Whole booking"}
                        </TableCell>
                        <TableCell>
                          {offer.code ? (
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{offer.code}</code>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleCopyCode(offer)}
                                title="Copy code"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Auto-apply</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {offer._count.redemptions}
                          {offer.maxRedemptions != null ? ` / ${offer.maxRedemptions}` : ""}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {offer.startDate ? formatDate(offer.startDate) : "Anytime"} —{" "}
                          {offer.endDate ? formatDate(offer.endDate) : "No end date"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" title="Share">
                                  <Share2 className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canNativeShare && (
                                  <DropdownMenuItem onClick={() => handleNativeShare(offer)}>
                                    <Share2 className="mr-2 h-4 w-4" /> Share via...
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleWhatsAppShare(offer)}>
                                  <MessageCircle className="mr-2 h-4 w-4" /> Share on WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEmailShare(offer)}>
                                  <Mail className="mr-2 h-4 w-4" /> Share via Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyMessage(offer)}>
                                  <Copy className="mr-2 h-4 w-4" /> Copy message
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleToggleActive(offer)}
                              title={offer.isActive ? "Pause" : "Resume"}
                            >
                              {offer.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteTarget(offer)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Offer Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Offer Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Welcome Offer, Diwali Sale"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short promo text shown under the offer name"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Offer Image *</Label>
              <ImageUpload
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                folder="offers"
                label="Upload Offer Image"
              />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "FIRST_BOOKING" | "PROMOTIONAL" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROMOTIONAL">Promotional (applies to everyone)</SelectItem>
                  <SelectItem value="FIRST_BOOKING">First Booking Only (new customers)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Discount % *</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                placeholder="e.g., 15"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Lower number shows first in the home carousel</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date (optional)</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Blank = starts now</p>
              </div>
              <div className="space-y-2">
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Blank = no end date</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label>Category (optional)</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Whole booking (no category limit)</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Discount only applies to the portion of the booking from this category</p>
            </div>

            <div className="space-y-2">
              <Label>Promo Code (optional)</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g., WELCOME15"
              />
              <p className="text-xs text-muted-foreground">Blank = auto-applies to everyone eligible. Set = owner must enter this code.</p>
            </div>

            <div className="space-y-2">
              <Label>Max Total Redemptions (optional)</Label>
              <Input
                type="number"
                min={1}
                value={form.maxRedemptions}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
                placeholder="Blank = unlimited"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>One redemption per owner</Label>
                <p className="text-xs text-muted-foreground">Prevents the same owner using this offer on every booking</p>
              </div>
              <Switch checked={form.onePerOwner} onCheckedChange={(v) => setForm({ ...form, onePerOwner: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Offer</AlertDialogTitle>
            <AlertDialogDescription>
              Delete offer &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

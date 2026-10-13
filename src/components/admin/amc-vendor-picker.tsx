"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Truck, Search, Loader2, ArrowLeft } from "lucide-react";

export interface PickedAMCVendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

type View = "search" | "addForm";

const EMPTY_FORM = { name: "", phone: "", email: "", address: "" };

export function AMCVendorPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (vendor: PickedAMCVendor) => void;
}) {
  const [view, setView] = useState<View>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedAMCVendor[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setView("search");
      setQuery("");
      setResults([]);
      setForm(EMPTY_FORM);
    }
  }, [open]);

  useEffect(() => {
    if (view !== "search") return;
    const id = setTimeout(async () => {
      setIsSearching(true);
      try {
        const qs = query ? `?q=${encodeURIComponent(query)}` : "";
        const res = await fetch(`/api/admin/amc-vendors${qs}`);
        const data = await res.json();
        if (data.ok) setResults(data.data);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query, view]);

  const pickExisting = (v: PickedAMCVendor) => {
    onSelect(v);
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Error", description: "Vendor name is required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/amc-vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        onSelect({ id: data.data.id, name: data.data.name, phone: data.data.phone, email: data.data.email });
        onOpenChange(false);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save vendor", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {view === "search" ? (
          <>
            <DialogHeader>
              <DialogTitle>Select Vendor</DialogTitle>
              <DialogDescription>Search for an existing vendor, or add a new one.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search vendor name..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" autoFocus />
              </div>
              <div className="max-h-[280px] overflow-y-auto space-y-2">
                {isSearching ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : results.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {query ? "No matching vendors. Add it as new below." : "Start typing to search, or add a new vendor below."}
                  </p>
                ) : (
                  results.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => pickExisting(v)}
                      className="w-full text-left border rounded-lg p-3 hover:border-primary hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{v.name}</span>
                      </div>
                      {(v.phone || v.email) && (
                        <p className="text-xs text-muted-foreground mt-1">{v.phone}{v.phone && v.email ? " · " : ""}{v.email}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => { setForm((f) => ({ ...f, name: query })); setView("addForm"); }}
              >
                + Add New Vendor
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 -ml-2" onClick={() => setView("search")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle>Add New Vendor</DialogTitle>
              </div>
              <DialogDescription>Enter the vendor&apos;s details.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="av-name">Vendor Name <span className="text-destructive">*</span></Label>
                <Input id="av-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="av-phone">Phone</Label>
                <Input id="av-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="av-email">Email</Label>
                <Input id="av-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="av-address">Address</Label>
                <Input id="av-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save &amp; Use This Vendor
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AMCVendorPickerTrigger({
  selected,
  onOpen,
}: {
  selected: PickedAMCVendor | null;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left border rounded-lg p-3 hover:border-primary transition-colors"
    >
      {selected ? (
        <div>
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{selected.name}</span>
            <Badge variant="secondary" className="text-xs">Selected</Badge>
          </div>
          {(selected.phone || selected.email) && (
            <p className="text-xs text-muted-foreground mt-1">{selected.phone}{selected.phone && selected.email ? " · " : ""}{selected.email}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Truck className="h-4 w-4" />
          <span className="text-sm">Tap to select or add a vendor (optional)</span>
        </div>
      )}
    </button>
  );
}

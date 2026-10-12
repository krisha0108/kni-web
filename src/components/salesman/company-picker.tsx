"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Search, Camera, Loader2, Check, ArrowLeft } from "lucide-react";

export interface PickedCompany {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  contactName: string;
  designation: string;
  phone: string;
  email: string;
}

interface CompanySearchResult {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  contacts: { name: string; designation: string | null; phone: string | null; email: string | null }[];
}

type View = "search" | "manualForm";

const EMPTY_FORM = {
  name: "",
  city: "",
  address: "",
  gstNumber: "",
  website: "",
  contactName: "",
  designation: "",
  phone: "",
  altPhone: "",
  email: "",
};

export function CompanyPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (company: PickedCompany) => void;
}) {
  const [view, setView] = useState<View>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [duplicates, setDuplicates] = useState<CompanySearchResult[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState<"front" | "back" | null>(null);
  const [scanNote, setScanNote] = useState("");
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setView("search");
      setQuery("");
      setResults([]);
      setForm(EMPTY_FORM);
      setDuplicates([]);
      setScanNote("");
    }
  }, [open]);

  useEffect(() => {
    if (view !== "search") return;
    const id = setTimeout(async () => {
      setIsSearching(true);
      try {
        const qs = query ? `?q=${encodeURIComponent(query)}` : "";
        const res = await fetch(`/api/salesman/companies${qs}`);
        const data = await res.json();
        if (data.ok) setResults(data.data);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query, view]);

  // Re-check for duplicates whenever the identifying fields change, while
  // the salesman is filling in the manual-add form.
  useEffect(() => {
    if (view !== "manualForm") return;
    if (!form.name.trim() && !form.phone.trim() && !form.email.trim()) {
      setDuplicates([]);
      return;
    }
    const id = setTimeout(async () => {
      const params = new URLSearchParams();
      if (form.name.trim()) params.set("q", form.name.trim());
      if (form.phone.trim()) params.set("phone", form.phone.trim());
      if (form.email.trim()) params.set("email", form.email.trim());
      const res = await fetch(`/api/salesman/companies?${params.toString()}`);
      const data = await res.json();
      if (data.ok) setDuplicates(data.data);
    }, 400);
    return () => clearTimeout(id);
  }, [form.name, form.phone, form.email, view]);

  const pickExisting = (c: CompanySearchResult) => {
    const contact = c.contacts[0];
    onSelect({
      id: c.id,
      name: c.name,
      city: c.city,
      address: c.address,
      contactName: contact?.name || "",
      designation: contact?.designation || "",
      phone: contact?.phone || "",
      email: contact?.email || "",
    });
    onOpenChange(false);
  };

  const runScan = async (side: "front" | "back", file: File) => {
    setIsScanning(side);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("side", side);
      const res = await fetch("/api/salesman/visiting-card-scan", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) {
        toast({ title: "Scan failed", description: data.error, variant: "destructive" });
        return;
      }
      setForm((f) => ({
        ...f,
        email: f.email || data.data.email || "",
        phone: f.phone || data.data.phone || "",
        altPhone: f.altPhone || data.data.altPhone || "",
        website: f.website || data.data.website || "",
        gstNumber: f.gstNumber || data.data.gstNumber || "",
      }));
      setScanNote((prev) => `${prev}${prev ? "\n\n" : ""}[${side} of card]\n${data.data.rawText}`.trim());
      toast({ title: "Card scanned", description: "Phone/email/website/GST auto-filled where found. Check the scanned text below for the rest." });
    } catch {
      toast({ title: "Error", description: "Failed to scan card", variant: "destructive" });
    } finally {
      setIsScanning(null);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.contactName.trim()) {
      toast({ title: "Error", description: "Company name and contact person are required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/salesman/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        onSelect({
          id: data.data.id,
          name: data.data.name,
          city: data.data.city,
          address: data.data.address,
          contactName: form.contactName,
          designation: form.designation,
          phone: form.phone,
          email: form.email,
        });
        onOpenChange(false);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save company", variant: "destructive" });
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
              <DialogTitle>Select Company</DialogTitle>
              <DialogDescription>Search for an existing company, or add a new one.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search company name..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" autoFocus />
              </div>
              <div className="max-h-[280px] overflow-y-auto space-y-2">
                {isSearching ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : results.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {query ? "No matching companies. Add it as new below." : "Start typing to search, or add a new company below."}
                  </p>
                ) : (
                  results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickExisting(c)}
                      className="w-full text-left border rounded-lg p-3 hover:border-[#E71720] hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{c.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.contacts[0]?.name || "No contact on file"}{c.city ? ` · ${c.city}` : ""}
                      </p>
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
                onClick={() => { setForm((f) => ({ ...f, name: query })); setView("manualForm"); }}
              >
                + Add New Company
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
                <DialogTitle>Add New Company</DialogTitle>
              </div>
              <DialogDescription>Scan a visiting card to auto-fill phone/email/website/GST, or enter details manually.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input ref={frontInputRef} type="file" accept="image/*" capture="environment" hidden
                  onChange={(e) => e.target.files?.[0] && runScan("front", e.target.files[0])} />
                <input ref={backInputRef} type="file" accept="image/*" capture="environment" hidden
                  onChange={(e) => e.target.files?.[0] && runScan("back", e.target.files[0])} />
                <Button type="button" variant="outline" className="flex-1" onClick={() => frontInputRef.current?.click()} disabled={isScanning !== null}>
                  {isScanning === "front" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                  Scan Front
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => backInputRef.current?.click()} disabled={isScanning !== null}>
                  {isScanning === "back" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                  Scan Back
                </Button>
              </div>

              {duplicates.length > 0 && (
                <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-amber-800">This company may already exist:</p>
                  {duplicates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickExisting(c)}
                      className="w-full text-left bg-white border border-amber-200 rounded-md p-2 hover:border-amber-400 transition-colors"
                    >
                      <p className="text-sm font-medium flex items-center gap-1"><Check className="h-3 w-3 text-amber-600" /> {c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.contacts[0]?.name || ""}{c.city ? ` · ${c.city}` : ""} — tap to use this instead</p>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="cp-name">Company Name <span className="text-destructive">*</span></Label>
                  <Input id="cp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cp-contactName">Contact Person <span className="text-destructive">*</span></Label>
                  <Input id="cp-contactName" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cp-designation">Designation</Label>
                  <Input id="cp-designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cp-phone">Phone</Label>
                  <Input id="cp-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cp-altPhone">Alt. Phone</Label>
                  <Input id="cp-altPhone" value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cp-email">Email</Label>
                  <Input id="cp-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cp-city">City</Label>
                  <Input id="cp-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="cp-address">Address</Label>
                  <Input id="cp-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cp-gst">GST Number</Label>
                  <Input id="cp-gst" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cp-website">Website</Label>
                  <Input id="cp-website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </div>
              </div>

              {scanNote && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Scanned card text (for reference — copy anything needed above)</Label>
                  <Textarea readOnly value={scanNote} rows={4} className="text-xs font-mono bg-muted/40" />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save &amp; Use This Company
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CompanyPickerTrigger({
  selected,
  onOpen,
}: {
  selected: PickedCompany | null;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left border rounded-lg p-3 hover:border-[#E71720] transition-colors"
    >
      {selected ? (
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{selected.name}</span>
            <Badge variant="secondary" className="text-xs">Selected</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{selected.contactName}{selected.city ? ` · ${selected.city}` : ""}</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span className="text-sm">Tap to select or add a company</span>
        </div>
      )}
    </button>
  );
}

"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/utils";

export interface OfferCandidate {
  offerId: string | null;
  source: string;
  percent: number;
  amount: number;
}

interface OfferSelectorProps {
  candidates: OfferCandidate[];
  /** Matches OfferCandidate.offerId - null means "No discount". undefined
   * (the caller's "haven't picked yet" sentinel) is treated the same as
   * null here - by the time candidates are available to render, the caller
   * has always already resolved this to a real value or null. */
  selectedOfferId: string | null | undefined;
  onSelect: (offerId: string | null) => void;
}

const keyOf = (offerId: string | null) => offerId ?? "none";

/**
 * Lets the owner pick which eligible offer to apply, instead of always
 * silently getting whichever one saves the most. `candidates` comes straight
 * from GET /api/owner/effective-discount (always includes a "No discount"
 * entry, so there's always something selected).
 */
export function OfferSelector({ candidates, selectedOfferId, onSelect }: OfferSelectorProps) {
  if (candidates.length <= 1) return null; // nothing but "No discount" - nothing to choose

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">Available Offers</Label>
      <Select
        value={keyOf(selectedOfferId ?? null)}
        onValueChange={(value) => onSelect(value === "none" ? null : value)}
      >
        <SelectTrigger className="h-auto py-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((c) => (
            <SelectItem key={keyOf(c.offerId)} value={keyOf(c.offerId)}>
              <span className="flex items-center justify-between gap-3 w-full">
                <span>{c.source}</span>
                <span className={c.amount > 0 ? "font-medium text-green-600" : "text-muted-foreground"}>
                  {c.amount > 0 ? `-${formatPrice(c.amount)}` : "—"}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

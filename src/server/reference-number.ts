import { Prisma } from "@prisma/client";

// Generates a short human-readable reference number ("BK-1024", "OR-1042")
// by counting existing rows inside the caller's transaction and using
// count+1. Must be called with the transaction's client so the count and
// the row create it feeds happen atomically (same pattern already used for
// AMCContract.contractNumber in src/server/amc/activate-contract.ts).
export async function generateReferenceNumber(
  tx: Prisma.TransactionClient,
  countFn: () => Promise<number>,
  prefix: string
): Promise<string> {
  const count = await countFn();
  return `${prefix}-${count + 1}`;
}

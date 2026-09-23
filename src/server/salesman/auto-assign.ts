import { db } from "@/server/db";

// Stateless round-robin: picks the active salesman whose most recently
// assigned inquiry is the oldest (or who has never been assigned one).
// This spreads new leads evenly over time without needing a separate
// rotation cursor to track/maintain, and it self-corrects automatically
// when salesmen are added, removed, or (de)activated.
export async function getNextSalesmanForAutoAssign(): Promise<string | null> {
  const activeSalesmen = await db.user.findMany({
    where: { role: "SALESMAN", isActive: true },
    select: {
      id: true,
      assignedInquiries: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (activeSalesmen.length === 0) return null;

  activeSalesmen.sort((a, b) => {
    const aTime = a.assignedInquiries[0]?.createdAt.getTime() ?? 0;
    const bTime = b.assignedInquiries[0]?.createdAt.getTime() ?? 0;
    return aTime - bTime;
  });

  return activeSalesmen[0].id;
}

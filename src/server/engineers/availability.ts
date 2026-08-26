import { db } from "@/server/db";

// AMC visits/surveys only store a single `scheduledDate` timestamp (no end
// time), unlike ServiceBooking which has a real start/end range — assume
// this fixed duration for overlap purposes.
export const ASSUMED_VISIT_DURATION_MINUTES = 90;

export interface EngineerConflict {
  type: "BOOKING" | "AMC_VISIT" | "AMC_SURVEY";
  label: string;
  start: string;
  end: string;
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * For each given engineer, find any other committed job (service booking
 * assignment, AMC scheduled visit, or AMC site survey) that overlaps the
 * requested [rangeStart, rangeEnd) window.
 */
export async function checkEngineerAvailability(
  engineerIds: string[],
  rangeStart: Date,
  rangeEnd: Date,
  opts?: { excludeBookingId?: string }
): Promise<Map<string, EngineerConflict[]>> {
  const conflicts = new Map<string, EngineerConflict[]>();
  if (engineerIds.length === 0) return conflicts;

  const addConflict = (engineerId: string, conflict: EngineerConflict) => {
    const list = conflicts.get(engineerId);
    if (list) list.push(conflict);
    else conflicts.set(engineerId, [conflict]);
  };

  const [assignments, visits, surveys] = await Promise.all([
    db.engineerAssignment.findMany({
      where: {
        engineerId: { in: engineerIds },
        status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] },
        ...(opts?.excludeBookingId ? { bookingId: { not: opts.excludeBookingId } } : {}),
      },
      select: {
        engineerId: true,
        booking: {
          select: {
            slotStartDateTime: true,
            slotEndDateTime: true,
            adminAdjustedSlotStart: true,
            adminAdjustedSlotEnd: true,
            restaurant: { select: { name: true } },
          },
        },
      },
    }),
    db.aMCScheduledVisit.findMany({
      where: {
        engineerId: { in: engineerIds },
        status: { in: ["SCHEDULED", "ASSIGNED", "IN_PROGRESS"] },
      },
      select: {
        engineerId: true,
        scheduledDate: true,
        contract: { select: { restaurant: { select: { name: true } } } },
      },
    }),
    db.aMCSiteSurvey.findMany({
      where: {
        engineerId: { in: engineerIds },
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      },
      select: {
        engineerId: true,
        scheduledDate: true,
        request: { select: { restaurant: { select: { name: true } } } },
      },
    }),
  ]);

  for (const a of assignments) {
    const start = a.booking.adminAdjustedSlotStart ?? a.booking.slotStartDateTime;
    const end = a.booking.adminAdjustedSlotEnd ?? a.booking.slotEndDateTime;
    if (!start || !end) continue;
    if (rangesOverlap(rangeStart, rangeEnd, start, end)) {
      addConflict(a.engineerId, {
        type: "BOOKING",
        label: a.booking.restaurant.name,
        start: start.toISOString(),
        end: end.toISOString(),
      });
    }
  }

  for (const v of visits) {
    if (!v.engineerId) continue;
    const start = v.scheduledDate;
    const end = new Date(start.getTime() + ASSUMED_VISIT_DURATION_MINUTES * 60 * 1000);
    if (rangesOverlap(rangeStart, rangeEnd, start, end)) {
      addConflict(v.engineerId, {
        type: "AMC_VISIT",
        label: v.contract.restaurant.name,
        start: start.toISOString(),
        end: end.toISOString(),
      });
    }
  }

  for (const s of surveys) {
    const start = s.scheduledDate;
    const end = new Date(start.getTime() + ASSUMED_VISIT_DURATION_MINUTES * 60 * 1000);
    if (rangesOverlap(rangeStart, rangeEnd, start, end)) {
      addConflict(s.engineerId, {
        type: "AMC_SURVEY",
        label: s.request.restaurant.name,
        start: start.toISOString(),
        end: end.toISOString(),
      });
    }
  }

  return conflicts;
}

import { prisma } from "@/lib/prisma";
import { featureRepository } from "@/lib/repositories/feature.repository";
import { bookingAvailabilityService } from "@/features/booking/services/booking-availability.service";
import type { ToolCall } from "@/lib/ai/providers/types";

// PROPOSAL — target path: lib/ai/tools/tool-router.ts (new file)
// REVISED: permission check now goes through the Feature Registry
// (workspace.suspended kept as a second, separate gate — suspension is
// account-wide, disabling booking is per-feature, they're not the same
// thing). If you already grabbed the earlier version of this file from
// this chat, use this one instead.
//
// AI -> tool call -> this router -> booking-availability.service.ts -> database.
// The model never touches Prisma directly.

interface RouterContext {
  workspaceId: string;
  customerId: string;
  channel: string;
}

type ToolOutcome =
  | { ok: true; result: { booked: true; bookingId: string; startAt: Date } }
  | { ok: true; result: Awaited<ReturnType<typeof bookingAvailabilityService.checkAvailability>> }
  | { ok: false; message: string };

export async function executeToolCall(call: ToolCall, ctx: RouterContext): Promise<ToolOutcome> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: ctx.workspaceId },
    select: { suspended: true },
  });
  if (workspace?.suspended) {
    return { ok: false, message: "الحساب متوقف مؤقتًا" };
  }

  const bookingEnabled = await featureRepository.isEnabled(ctx.workspaceId, "booking");
  if (!bookingEnabled) {
    return { ok: false, message: "خاصية الحجز متوقفة على هذا الحساب حاليًا" };
  }

  if (call.name === "check_availability") {
    const args = call.arguments as { serviceId: string; resourceId?: string; startAtIso: string };
    const result = await bookingAvailabilityService.checkAvailability({
      workspaceId: ctx.workspaceId,
      serviceId: args.serviceId,
      resourceId: args.resourceId,
      startAt: new Date(args.startAtIso),
    });
    return { ok: true, result };
  }

  if (call.name === "create_booking") {
    const args = call.arguments as { serviceId: string; resourceId?: string; startAtIso: string };
    try {
      const booking = await bookingAvailabilityService.createBooking({
        workspaceId: ctx.workspaceId,
        customerId: ctx.customerId,
        serviceId: args.serviceId,
        resourceId: args.resourceId,
        startAt: new Date(args.startAtIso),
        channel: ctx.channel,
        createdByAI: true,
      });
      return { ok: true, result: { booked: true, bookingId: booking.id, startAt: booking.startAt } };
    } catch {
      return { ok: false, message: "الميعاد ده بقى مش متاح، جرب وقت تاني" };
    }
  }

  return { ok: false, message: `unknown tool: ${call.name}` };
}

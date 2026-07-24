// PROPOSAL — target path: lib/events/listeners/webhook-dispatch.listeners.ts (new file)

import { eventBus } from "@/lib/events/event-bus";
import { prisma } from "@/lib/prisma";
import { enqueueWebhookDelivery } from "@/lib/queue/webhook-delivery.queue";
import type { WebhookEvent } from "@prisma/client";

async function dispatch(workspaceId: string, event: WebhookEvent, payload: Record<string, unknown>) {
  const subscriptions = await prisma.webhookSubscription.findMany({
    where: { workspaceId, active: true, events: { has: event } },
  });

  for (const sub of subscriptions) {
    const delivery = await prisma.webhookDelivery.create({
      data: { subscriptionId: sub.id, event, payload, status: "PENDING" },
    });
    await enqueueWebhookDelivery({ subscriptionId: sub.id, deliveryId: delivery.id });
  }
}

export function registerWebhookDispatchListeners() {
  eventBus.onEvent("CustomerCreated", ({ workspaceId, customerId }) =>
    dispatch(workspaceId, "CUSTOMER_CREATED", { customerId })
  );

  eventBus.onEvent("AppointmentCreated", ({ workspaceId, appointmentId }) =>
    dispatch(workspaceId, "BOOKING_CREATED", { bookingId: appointmentId })
  );

  eventBus.onEvent("BookingStatusChanged", ({ workspaceId, bookingId, status }) =>
    dispatch(workspaceId, "BOOKING_STATUS_CHANGED", { bookingId, status })
  );

  eventBus.onEvent("PaymentSucceeded", ({ workspaceId, amount, transactionId }) =>
    dispatch(workspaceId, "PAYMENT_SUCCEEDED", { amount, transactionId })
  );
}

// PROPOSAL — target path: scripts/worker.ts (replaces existing file)
// Only addition: a second Worker instance for webhook deliveries,
// alongside the existing file-processing one. Same process, same
// connection factory, same shutdown handling.

import { Worker, type Job } from "bullmq";

import { createQueueConnection } from "@/lib/queue/connection";
import { FILE_PROCESSING_QUEUE, type FileProcessingJobData } from "@/lib/queue/file-processing.queue";
import { processKnowledgeFile } from "@/features/knowledge-base/services/file-processing.service";
import { WEBHOOK_DELIVERY_QUEUE, type WebhookDeliveryJobData } from "@/lib/queue/webhook-delivery.queue";
import { deliverWebhook } from "@/features/developer-platform/services/webhook-delivery.service";

const fileWorker = new Worker<FileProcessingJobData>(
  FILE_PROCESSING_QUEUE,
  async (job: Job<FileProcessingJobData>) => {
    console.log(`[worker] processing file ${job.data.fileId} (workspace ${job.data.workspaceId})`);
    const result = await processKnowledgeFile(job.data);
    if (!result.success) {
      throw new Error(result.error ?? "معالجة الملف فشلت");
    }
    return result;
  },
  { connection: createQueueConnection(), concurrency: 4 }
);

const webhookWorker = new Worker<WebhookDeliveryJobData>(
  WEBHOOK_DELIVERY_QUEUE,
  async (job: Job<WebhookDeliveryJobData>) => {
    console.log(`[worker] delivering webhook ${job.data.deliveryId} (attempt ${job.attemptsMade + 1})`);
    await deliverWebhook(job.data.subscriptionId, job.data.deliveryId);
  },
  { connection: createQueueConnection(), concurrency: 10 }
);

fileWorker.on("completed", (job) => console.log(`[worker] ✅ file done: ${job.id}`));
fileWorker.on("failed", (job, error) => console.error(`[worker] ❌ file failed: ${job?.id}`, error));
webhookWorker.on("completed", (job) => console.log(`[worker] ✅ webhook delivered: ${job.id}`));
webhookWorker.on("failed", (job, error) => console.error(`[worker] ❌ webhook failed: ${job?.id}`, error.message));

console.log("[worker] file-processing + webhook-delivery workers started, waiting for jobs...");

process.on("SIGTERM", async () => {
  await Promise.all([fileWorker.close(), webhookWorker.close()]);
  process.exit(0);
});

import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/events/event-bus";
import { sendTransactionalEmail } from "@/lib/email/resend-client";
import { emailTemplates } from "@/lib/email/templates";

async function getOwnerEmail(workspaceId: string) {
  const user = await prisma.user.findFirst({ where: { workspaceId, role: "OWNER" } });
  return user?.email ?? null;
}

export function registerEmailListeners() {
  eventBus.onEvent("WorkspaceCreated", async ({ workspaceId }) => {
    const [email, workspace] = await Promise.all([
      getOwnerEmail(workspaceId),
      prisma.workspace.findUnique({ where: { id: workspaceId } }),
    ]);
    if (!email || !workspace) return;
    await sendTransactionalEmail({
      workspaceId,
      to: email,
      subject: "أهلاً بيك 👋",
      html: emailTemplates.welcome(workspace.name),
      type: "WELCOME",
    });
  });

  eventBus.onEvent("PaymentSucceeded", async ({ workspaceId, amount }) => {
    const email = await getOwnerEmail(workspaceId);
    if (!email) return;
    await sendTransactionalEmail({
      workspaceId,
      to: email,
      subject: "تم الدفع بنجاح ✅",
      html: emailTemplates.paymentSuccess(amount),
      type: "PAYMENT_SUCCESS",
    });
  });

  eventBus.onEvent("PaymentFailed", async ({ workspaceId }) => {
    const email = await getOwnerEmail(workspaceId);
    if (!email) return;
    await sendTransactionalEmail({
      workspaceId,
      to: email,
      subject: "فشلت عملية الدفع",
      html: emailTemplates.paymentFailed(),
      type: "PAYMENT_FAILED",
    });
  });

  eventBus.onEvent("KnowledgeUploaded", async ({ workspaceId, fileId, chunksCreated }) => {
    const [email, file] = await Promise.all([
      getOwnerEmail(workspaceId),
      prisma.knowledgeFile.findUnique({ where: { id: fileId } }),
    ]);
    if (!email || !file) return;
    await sendTransactionalEmail({
      workspaceId,
      to: email,
      subject: "قاعدة المعرفة اتحدّثت",
      html: emailTemplates.knowledgeProcessingFinished(file.fileName, chunksCreated),
      type: "KNOWLEDGE_PROCESSING_FINISHED",
    });
  });
}

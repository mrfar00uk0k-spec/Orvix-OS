// PROPOSAL — target path: lib/repositories/workflow.repository.ts (new file)

import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma } from "@prisma/client";

export class WorkflowRepository extends BaseRepository {
  listForWorkspace(workspaceId: string) {
    return this.db.workflow.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
  }

  findWithGraph(workflowId: string, workspaceId: string) {
    return this.db.workflow.findFirst({
      where: { id: workflowId, workspaceId },
      include: { nodes: true, edges: true },
    });
  }

  // Every workflow that could react to a given trigger type, published
  // only — drafts never fire on real events.
  findPublishedByTriggerType(workspaceId: string, triggerType: string) {
    return this.db.workflow.findMany({
      where: {
        workspaceId,
        status: "PUBLISHED",
        nodes: { some: { type: triggerType as never } },
      },
      include: { nodes: true, edges: true },
    });
  }

  create(data: Prisma.WorkflowCreateInput) {
    return this.db.workflow.create({ data, include: { nodes: true, edges: true } });
  }

  setStatus(workflowId: string, status: "DRAFT" | "PUBLISHED" | "DISABLED") {
    return this.db.workflow.update({ where: { id: workflowId }, data: { status } });
  }

  createExecution(data: Prisma.WorkflowExecutionCreateInput) {
    return this.db.workflowExecution.create({ data });
  }

  updateExecution(executionId: string, data: Prisma.WorkflowExecutionUpdateInput) {
    return this.db.workflowExecution.update({ where: { id: executionId }, data });
  }

  listExecutions(workflowId: string, limit = 20) {
    return this.db.workflowExecution.findMany({
      where: { workflowId },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }
}

export const workflowRepository = new WorkflowRepository();

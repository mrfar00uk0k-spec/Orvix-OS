import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const members = await prisma.teamMember.findMany({
      where: { workspaceId: workspace.id },
      include: { user: { select: { name: true, email: true, avatar: true } } },
      orderBy: { createdAt: "asc" },
    });
    return apiSuccess(members);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

const updateSchema = z.object({ memberId: z.string(), role: z.enum(["ADMIN", "MEMBER"]) });

export async function PATCH(request: Request) {
  try {
    const { workspace, user } = await requireWorkspace();
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return apiError("بس المالك أو الأدمن يقدر يغيّر الأدوار", [], 403);
    }

    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) return apiError("طلب غير صحيح", [], 400);

    const member = await prisma.teamMember.findUnique({ where: { id: parsed.data.memberId } });
    if (!member || member.workspaceId !== workspace.id) return apiErrors.notFound("العضو");
    if (member.role === "OWNER") return apiError("متقدرش تغيّر دور المالك", [], 400);

    const updated = await prisma.$transaction([
      prisma.teamMember.update({ where: { id: member.id }, data: { role: parsed.data.role } }),
      prisma.user.update({ where: { id: member.userId }, data: { role: parsed.data.role } }),
    ]);

    return apiSuccess(updated[0], "تم تحديث الدور");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function DELETE(request: Request) {
  try {
    const { workspace, user } = await requireWorkspace();
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return apiError("بس المالك أو الأدمن يقدر يشيل أعضاء", [], 403);
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    if (!memberId) return apiError("memberId مطلوب", [], 400);

    const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member || member.workspaceId !== workspace.id) return apiErrors.notFound("العضو");
    if (member.role === "OWNER") return apiError("متقدرش تشيل المالك", [], 400);

    await prisma.$transaction([
      prisma.teamMember.delete({ where: { id: memberId } }),
      prisma.user.update({ where: { id: member.userId }, data: { workspaceId: null } }),
    ]);

    return apiSuccess({ removed: true }, "تم حذف العضو");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

// PROPOSAL — target path: lib/repositories/team-member.repository.ts (new file)

import { BaseRepository } from "@/lib/repositories/base.repository";

export class TeamMemberRepository extends BaseRepository {
  findMembership(userId: string, workspaceId: string) {
    return this.db.teamMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
  }

  listWorkspacesForUser(userId: string) {
    return this.db.teamMember.findMany({
      where: { userId },
      include: { workspace: { select: { id: true, name: true, slug: true, logo: true, businessType: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  create(data: { workspaceId: string; userId: string; role: "OWNER" | "ADMIN" | "MEMBER" }) {
    return this.db.teamMember.create({ data });
  }
}

export const teamMemberRepository = new TeamMemberRepository();

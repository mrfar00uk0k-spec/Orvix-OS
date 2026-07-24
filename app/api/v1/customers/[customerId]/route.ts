// PROPOSAL — target path: app/api/v1/customers/[customerId]/route.ts (new file)

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { customerRepository } from "@/lib/repositories/customer.repository";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { customerId } = await params;

    const customer = await customerRepository.findByIdInWorkspace(customerId, workspace.id);
    if (!customer) return apiErrors.notFound("العميل");

    const timeline = await customerRepository.getTimeline(customerId);

    return apiSuccess({ customer, timeline });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

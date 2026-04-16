import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { api } from "~/lib/api";
import { requireUser } from "~/lib/session.server";

/**
 * Server-side proxy for `POST /escrow/:escrowId/confirm`.
 *
 * Forwards the merchant-signed XDR (Body: { signedXdr }) through the
 * Remix server so the API receives the proxy-secret header and the
 * wallet header. The body shape matches the upstream ConfirmLockDto.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const walletAddress = await requireUser(request);
  const { escrowId } = params;
  if (!escrowId) {
    return json({ error: "Missing escrowId" }, { status: 400 });
  }

  let body: { signedXdr?: string };
  try {
    body = (await request.json()) as { signedXdr?: string };
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.signedXdr || typeof body.signedXdr !== "string") {
    return json({ error: "Missing signedXdr" }, { status: 400 });
  }

  const res = await api(`/escrow/${encodeURIComponent(escrowId)}/confirm`, {
    method: "POST",
    body: { signedXdr: body.signedXdr },
    walletAddress,
  });

  return json(res.data ?? { error: res.error }, { status: res.status || 200 });
}

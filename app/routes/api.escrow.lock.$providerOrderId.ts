import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { api } from "~/lib/api";
import { requireUser } from "~/lib/session.server";

/**
 * Server-side proxy for `POST /escrow/lock/:providerOrderId`.
 *
 * The browser can't call the API directly anymore — wallet auth requires
 * `X-Stelo-Proxy-Secret` which is server-only. This route takes the
 * wallet from the Remix session and forwards through `api()`.
 *
 * Returns the same shape as the upstream endpoint:
 *   { escrowId: string; unsignedXdr: string }
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const walletAddress = await requireUser(request);
  const { providerOrderId } = params;
  if (!providerOrderId) {
    return json({ error: "Missing providerOrderId" }, { status: 400 });
  }

  const res = await api(`/escrow/lock/${encodeURIComponent(providerOrderId)}`, {
    method: "POST",
    body: {},
    walletAddress,
  });

  return json(res.data ?? { error: res.error }, { status: res.status || 200 });
}

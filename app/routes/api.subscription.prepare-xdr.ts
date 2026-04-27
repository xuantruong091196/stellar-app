import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { api } from "~/lib/api";
import { requireUser } from "~/lib/session.server";

/**
 * Server-side proxy for `POST /subscription/checkout` (Freighter prepare-xdr step).
 *
 * The browser can't call the API directly — wallet auth requires the
 * STELO_PROXY_SECRET which is server-only. Resource route returns pure JSON,
 * unlike the page route at /subscription/checkout which re-renders HTML.
 *
 * Body: { lockId: string, sourceAddress: string }
 * Returns: { xdr: string, lockId: string } | { error }
 */
export async function action({ request }: ActionFunctionArgs) {
  const walletAddress = await requireUser(request);
  const body = (await request.json()) as { lockId?: string; sourceAddress?: string };
  if (!body.lockId || !body.sourceAddress) {
    return json({ error: "Missing lockId or sourceAddress" }, { status: 400 });
  }

  const res = await api("/subscription/checkout", {
    method: "POST",
    body: {
      lockId: body.lockId,
      walletMode: "freighter",
      sourceAddress: body.sourceAddress,
    },
    walletAddress,
  });

  return json(res.data ?? { error: res.error }, { status: res.status || 200 });
}

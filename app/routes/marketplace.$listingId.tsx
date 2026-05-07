import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useState } from "react";
import { ensureFreighter, signXdr, FreighterError } from "~/lib/freighter";
import {
  listMarketplaceListingsServer,
  prepareListingBuy,
  confirmListingBuy,
  type MarketplaceListing,
} from "~/lib/api";

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.listingId) throw new Response("Missing listingId", { status: 400 });

  // We don't have a single-listing GET endpoint yet; fetch from the list and
  // filter. Acceptable for v1 scale; switch to GET /listings/:id when added.
  const page = await listMarketplaceListingsServer("ACTIVE");
  const listing = page.items.find((l) => l.id === params.listingId);
  if (!listing) throw new Response("Listing not found", { status: 404 });
  return json({ listing });
}

export default function ListingDetail() {
  const { listing } = useLoaderData<typeof loader>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setStatus("Connecting Freighter…");
    try {
      const wallet = await ensureFreighter();
      setStatus("Preparing transaction…");
      const { xdr } = await prepareListingBuy(listing.id);
      setStatus("Awaiting Freighter signature…");
      const signed = await signXdr(xdr, wallet);
      setStatus("Submitting to Soroban…");
      const { txHash } = await confirmListingBuy(listing.id, signed);
      setStatus(`Purchased! Tx: ${txHash}`);
    } catch (err: unknown) {
      const msg =
        err instanceof FreighterError
          ? err.message
          : `Failed: ${err instanceof Error ? err.message : "unknown error"}`;
      setStatus(msg);
    } finally {
      setBusy(false);
    }
  }

  const isError =
    status != null &&
    (status.startsWith("Failed") || status.startsWith("Marketplace") || status.startsWith("Please"));

  return (
    <main className="mx-auto max-w-2xl p-6">
      <a
        href="/marketplace"
        className="text-sm text-on-surface-variant hover:text-on-surface"
      >
        ← Back to marketplace
      </a>

      <div className="mt-4 aspect-square w-full bg-surface-container rounded-xl flex items-center justify-center text-on-surface-variant">
        <span className="font-mono text-sm">NFT #{listing.nftTokenId.slice(0, 12)}</span>
      </div>

      <p className="mt-4 text-sm text-on-surface-variant">
        Seller:{" "}
        <span className="font-mono">{listing.sellerAddress}</span>
      </p>

      <p className="text-3xl font-medium my-4">{listing.priceUsdc.toFixed(2)} USDC</p>

      <button
        onClick={buy}
        disabled={busy}
        className="px-6 py-3 bg-primary text-on-primary rounded font-medium disabled:opacity-50"
      >
        {busy ? "Processing…" : "Buy with Freighter"}
      </button>

      {status && (
        <p className={`mt-3 text-sm ${isError ? "text-red-500" : "text-on-surface-variant"}`}>
          {status}
        </p>
      )}

      <p className="mt-8 text-xs text-on-surface-variant">
        Marketplace is in beta. Soroban submission helpers are pending —
        purchases will fail-closed with a clear error until enabled.
      </p>
    </main>
  );
}

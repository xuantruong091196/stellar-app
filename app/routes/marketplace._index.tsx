import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useState, useEffect } from "react";
import { listMarketplaceListingsServer, type ListingsPage } from "~/lib/api";
import { ListingCard } from "~/components/marketplace/ListingCard";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const result = await listMarketplaceListingsServer("ACTIVE", cursor);
  return json(result);
}

export const meta: MetaFunction = () => [
  { title: "Stelo · Marketplace" },
  { name: "description", content: "Browse Stelo NFTs available for resale" },
];

export default function Marketplace() {
  const initial = useLoaderData<typeof loader>();
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const fetcher = useFetcher<ListingsPage>();

  useEffect(() => {
    if (fetcher.data?.items) {
      setItems((prev) => [...prev, ...fetcher.data!.items]);
      setCursor(fetcher.data.nextCursor);
    }
  }, [fetcher.data]);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
      <p className="text-on-surface-variant mb-6">
        Browse NFTs minted on Stelo and listed for resale.
      </p>

      {items.length === 0 ? (
        <div className="text-on-surface-variant text-center py-12">
          No active listings yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      {cursor && (
        <button
          onClick={() => fetcher.load(`/marketplace?cursor=${cursor}`)}
          disabled={fetcher.state !== "idle"}
          className="mt-6 mx-auto block px-6 py-2 border border-border rounded text-on-surface hover:bg-surface-container-low disabled:opacity-50"
        >
          {fetcher.state === "loading" ? "Loading…" : "Load more"}
        </button>
      )}
    </main>
  );
}

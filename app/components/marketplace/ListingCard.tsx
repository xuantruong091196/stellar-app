import type { MarketplaceListing } from "~/lib/api";

export function ListingCard({ listing }: { listing: MarketplaceListing }) {
  return (
    <a
      href={`/marketplace/${listing.id}`}
      className="block border border-border rounded-xl p-4 bg-surface hover:bg-surface-container-low transition"
    >
      <div className="aspect-square w-full bg-surface-container rounded mb-3 flex items-center justify-center text-on-surface-variant">
        <span className="font-mono text-xs">NFT #{listing.nftTokenId.slice(0, 8)}</span>
      </div>
      <p className="text-on-surface text-sm truncate">
        Listed by{" "}
        <span className="font-mono text-xs">
          {listing.sellerAddress.slice(0, 4)}...{listing.sellerAddress.slice(-4)}
        </span>
      </p>
      <p className="text-on-surface text-lg font-medium mt-1">
        {listing.priceUsdc.toFixed(2)} USDC
      </p>
    </a>
  );
}

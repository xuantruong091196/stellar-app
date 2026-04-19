import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";

import { pageMeta, SITE } from "~/lib/seo";
import { VerificationBadge } from "~/components/nft/VerificationBadge";
import { PhysicalTimeline } from "~/components/nft/PhysicalTimeline";

interface NftVerification {
  nftId: string;
  status: string;
  assetCode?: string;
  assetIssuer?: string;
  owner?: string;
  productTitle?: string;
  productImage?: string;
  merchantName?: string;
  mintedAt?: string;
  timeline?: Array<{ event: string; date: string; txHash?: string }>;
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = data?.nft
    ? `Verify: ${data.nft.productTitle || data.nft.assetCode || data.nft.nftId}`
    : "NFT Verification";
  return pageMeta({
    title,
    description:
      "Verify the authenticity of a Stelo NFT-tagged physical product on the Stellar blockchain.",
    path: `/verify/${data?.nft?.nftId || ""}`,
  });
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { nftId } = params;
  if (!nftId) {
    return json({ nft: null, error: "Missing NFT ID" }, { status: 400 });
  }

  const apiUrl =
    process.env.STELLARPOD_API_URL ||
    process.env.PUBLIC_API_URL ||
    "http://localhost:8000";

  try {
    const res = await fetch(`${apiUrl}/nft/${nftId}/verify`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return json(
        {
          nft: null,
          error:
            (body as { message?: string }).message ||
            `Verification failed (${res.status})`,
        },
        { status: res.status },
      );
    }
    const nft = (await res.json()) as NftVerification;
    return json({ nft, error: null });
  } catch (err) {
    return json(
      {
        nft: null,
        error:
          err instanceof Error ? err.message : "Unable to reach verification service",
      },
      { status: 502 },
    );
  }
}

export default function VerifyNft() {
  const { nft, error } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      {/* Header */}
      <header className="border-b border-outline-variant/10 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/images/logo.png" alt={SITE.name} className="h-8 w-8" />
          <span className="font-headline font-bold text-lg tracking-tight group-hover:text-primary transition-colors">
            {SITE.name}
          </span>
        </Link>
        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
          NFT Verification
        </span>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-8">
          {/* Error state */}
          {error && !nft && (
            <div className="text-center space-y-6">
              <VerificationBadge status="NOT_FOUND" />
              <p className="text-on-surface-variant text-sm">{error}</p>
            </div>
          )}

          {/* Verified NFT */}
          {nft && (
            <div className="space-y-8">
              {/* Badge + Title */}
              <div className="text-center space-y-4">
                <VerificationBadge status={nft.status} />
                {nft.productTitle && (
                  <h1 className="text-3xl md:text-4xl font-headline font-bold tracking-tight">
                    {nft.productTitle}
                  </h1>
                )}
                {nft.merchantName && (
                  <p className="text-on-surface-variant text-sm">
                    by <span className="font-bold text-on-surface">{nft.merchantName}</span>
                  </p>
                )}
              </div>

              {/* Product image */}
              {nft.productImage && (
                <div className="bg-surface-container-low rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center">
                  <img
                    src={nft.productImage}
                    alt={nft.productTitle || "Product"}
                    className="w-full h-full object-contain p-8"
                  />
                </div>
              )}

              {/* Asset info */}
              <section className="bg-surface-container-low rounded-xl p-6 space-y-4">
                <h2 className="font-headline font-bold text-lg">Asset Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">
                      NFT ID
                    </p>
                    <p className="font-mono text-xs break-all">{nft.nftId}</p>
                  </div>
                  {nft.assetCode && (
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">
                        Asset Code
                      </p>
                      <p className="font-mono text-xs">{nft.assetCode}</p>
                    </div>
                  )}
                  {nft.assetIssuer && (
                    <div className="sm:col-span-2">
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">
                        Issuer
                      </p>
                      <a
                        href={`https://stellar.expert/explorer/public/account/${nft.assetIssuer}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-primary hover:underline break-all"
                      >
                        {nft.assetIssuer}
                      </a>
                    </div>
                  )}
                  {nft.owner && (
                    <div className="sm:col-span-2">
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">
                        Current Owner
                      </p>
                      <a
                        href={`https://stellar.expert/explorer/public/account/${nft.owner}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-primary hover:underline break-all"
                      >
                        {nft.owner}
                      </a>
                    </div>
                  )}
                  {nft.mintedAt && (
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">
                        Minted
                      </p>
                      <p className="text-xs">
                        {new Date(nft.mintedAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Timeline */}
              {nft.timeline && nft.timeline.length > 0 && (
                <section className="bg-surface-container-low rounded-xl p-6 space-y-4">
                  <h2 className="font-headline font-bold text-lg">Provenance Timeline</h2>
                  <PhysicalTimeline events={nft.timeline} />
                </section>
              )}
            </div>
          )}

          {/* Footer note */}
          <p className="text-center text-[10px] text-on-surface-variant/60 uppercase tracking-widest">
            Verified on the Stellar blockchain &middot;{" "}
            <a href={SITE.url} className="hover:text-primary">
              {SITE.name}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

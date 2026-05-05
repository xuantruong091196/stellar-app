import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";

import { pageMeta, SITE } from "~/lib/seo";
import { getProvenancePublic, type ProvenanceRecord } from "~/lib/api";

export async function loader({ params }: LoaderFunctionArgs) {
  const { designId } = params;
  if (!designId) {
    throw new Response("Missing designId", { status: 400 });
  }
  // getProvenancePublic throws a 404 Response when the design is not found,
  // which Remix will forward to the nearest ErrorBoundary automatically.
  const provenance = await getProvenancePublic(designId);
  return json({ provenance, designId });
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const label = data?.provenance?.assetCode
    ? `Design ${data.provenance.assetCode}`
    : "Authorship Verification";
  return pageMeta({
    title: `${SITE.name} · ${label}`,
    description:
      "Verify the authorship and on-chain provenance of a Stelo design registered on the Stellar network.",
    path: `/provenance/${data?.designId ?? ""}`,
  });
};

// ── Helper ──────────────────────────────────────────────────────────────────

function Field({
  label,
  mono = false,
  children,
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant pt-1">
        {label}
      </dt>
      <dd className={`text-sm break-all${mono ? " font-mono" : ""}`}>
        {children}
      </dd>
    </>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ProvenancePage() {
  const { provenance } = useLoaderData<typeof loader>();
  const p: ProvenanceRecord = provenance;

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
          Authorship Verification
        </span>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-8">
          {/* Intro */}
          <div className="text-center space-y-2">
            <span
              className="material-symbols-outlined text-5xl text-primary"
              aria-hidden
            >
              verified
            </span>
            <h1 className="text-3xl font-headline font-bold tracking-tight">
              Authorship Verification
            </h1>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto">
              This design is registered on the Stellar network. The data below
              is publicly verifiable on-chain.
            </p>
          </div>

          {/* Details card */}
          <section className="bg-surface-container-low rounded-xl p-6 space-y-4">
            <h2 className="font-headline font-bold text-lg">Design Details</h2>

            <dl className="grid grid-cols-[minmax(140px,auto)_1fr] gap-x-6 gap-y-3">
              {p.assetCode ? (
                <Field label="Asset Code" mono>
                  {p.assetCode}
                </Field>
              ) : (
                <Field label="Asset Code">
                  <em className="text-on-surface-variant">pending mint</em>
                </Field>
              )}

              <Field label="Status">
                <span className="capitalize">{p.status.toLowerCase()}</span>
              </Field>

              <Field label="Author Store">{p.storeName}</Field>

              <Field label="Owner Wallet" mono>
                {p.ownerWallet}
              </Field>

              <Field label="File SHA-256" mono>
                {p.fileSha256}
              </Field>

              <Field label="Registered At">
                {new Date(p.registeredAt).toLocaleString()}
              </Field>

              {p.mintLedger != null && (
                <Field label="Mint Ledger" mono>
                  {String(p.mintLedger)}
                </Field>
              )}
            </dl>
          </section>

          {/* Stellar Explorer link */}
          {p.stellarExplorerUrl && (
            <div className="flex justify-center">
              <a
                href={p.stellarExplorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                View transaction on Stellar Explorer
                <span className="material-symbols-outlined text-base" aria-hidden>
                  open_in_new
                </span>
              </a>
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

// ── Error boundary ───────────────────────────────────────────────────────────

export function ErrorBoundary() {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center gap-6 p-8 text-center">
      <span
        className="material-symbols-outlined text-6xl text-error"
        aria-hidden
      >
        search_off
      </span>
      <h1 className="text-2xl font-headline font-bold">Design Not Found</h1>
      <p className="text-on-surface-variant text-sm max-w-sm">
        This design ID does not exist or has not been registered yet.
      </p>
      <Link
        to="/"
        className="text-sm text-primary hover:underline"
      >
        Back to {SITE.name}
      </Link>
    </div>
  );
}

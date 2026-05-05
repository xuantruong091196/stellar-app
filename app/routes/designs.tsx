import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, Link } from "@remix-run/react";
import { apiGet, apiDelete , deriveStoreId } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import type { Design, PaginatedResponse } from "~/lib/types";
import { PageHeader, EmptyState } from "~/components/ui/PageHeader";
import { LinkButton } from "~/components/ui/Button";
import { Pill, ProvenancePill } from "~/components/ui/StatusPill";
import { pageMeta } from "~/lib/seo";
import { AnimatedPage } from "~/components/ui/AnimatedPage";
import { StaggerList, StaggerItem } from "~/components/ui/StaggerList";
import { TiltCard } from "~/components/ui/TiltCard";
import { EmptyState as AnimatedEmptyState } from "~/components/ui/EmptyState";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Designs",
    description:
      "Your creative library — upload artwork, manage design files and attach them to new print-on-demand products.",
    path: "/designs",
    noIndex: true,
  });


export async function loader({ request }: LoaderFunctionArgs) {
  const walletAddress = await requireUser(request);
  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const res = await apiGet<PaginatedResponse<Design>>(
    `/designs/${deriveStoreId(walletAddress)}?page=${page}&limit=20`,
    walletAddress,
  );
  if (res.error)
    return json({ designs: [] as Design[], meta: null, error: res.error });

  return json({
    designs: res.data?.data ?? [],
    meta: res.data?.meta ?? null,
    error: null as string | null,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const walletAddress = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "delete") {
    const designId = formData.get("designId") as string;
    if (!designId)
      return json({ error: "Missing designId" }, { status: 400 });
    const r = await apiDelete(`/designs/${designId}`, walletAddress);
    return r.error
      ? json({ error: r.error }, { status: r.status || 500 })
      : json({ success: true });
  }
  return json({ error: "Unknown intent" }, { status: 400 });
}

function copyrightStatus(
  design: Design,
): "registered" | "pending" | "unregistered" {
  if (design.copyrightTxHash) return "registered";
  if (design.copyrightAt) return "pending";
  return "unregistered";
}

export default function Designs() {
  const { designs, meta: pagination, error } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ error?: string }>();

  return (
    <AnimatedPage>
      <PageHeader
        title="Designs Library"
        subtitle="Your blockchain-protected design assets"
        actions={
          <LinkButton to="/designs/upload" icon="upload">
            Upload Design
          </LinkButton>
        }
      />

      {error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm">{error}</p>
        </div>
      )}
      {fetcher.data?.error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm">{fetcher.data.error}</p>
        </div>
      )}

      {designs.length === 0 ? (
        <AnimatedEmptyState
          icon="palette"
          title="No designs uploaded"
          description="Upload your first design to start creating products."
          actionLabel="Upload Design"
          actionHref="/designs/upload"
        />
      ) : (
        <>
          <p className="text-sm text-on-surface-variant font-mono">
            {pagination?.total ?? designs.length} designs •{" "}
            <span className="text-green-400">
              {designs.filter((d) => d.copyrightTxHash).length} protected
            </span>
          </p>

          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {designs.map((d) => {
              const status = copyrightStatus(d);
              const img = d.thumbnailUrl || d.fileUrl;
              return (
                <StaggerItem key={d.id}>
                <TiltCard className="bg-surface-container-low rounded-2xl overflow-hidden group">
                  <div className="relative">
                    <div className="aspect-square bg-surface-container-highest flex items-center justify-center overflow-hidden">
                      {img ? (
                        <img
                          src={img}
                          alt={d.name}
                          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
                          image
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      {status === "registered" && (
                        <Pill tone="green">✓ Protected</Pill>
                      )}
                      {status === "pending" && (
                        <Pill tone="amber">Pending</Pill>
                      )}
                      {status === "unregistered" && (
                        <Pill tone="slate">Unregistered</Pill>
                      )}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <h3 className="font-bold truncate">{d.name}</h3>
                    <div className="flex items-center justify-between text-xs text-on-surface-variant">
                      <span className="font-mono">
                        {(d.fileSizeBytes / 1024).toFixed(0)} KB
                      </span>
                      {d.width && d.height && (
                        <span className="font-mono">
                          {d.width}×{d.height}
                        </span>
                      )}
                    </div>
                    {d.copyrightTxHash && (
                      <div className="bg-surface-container-high px-2 py-1 rounded-lg">
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold">
                          Tx Hash
                        </p>
                        <p className="text-[10px] font-mono text-primary truncate">
                          {d.copyrightTxHash.slice(0, 20)}…
                        </p>
                      </div>
                    )}
                    {d.provenance && (
                      <ProvenancePill
                        status={d.provenance.status}
                        assetCode={d.provenance.assetCode}
                      />
                    )}
                    <div className="flex items-center gap-2 pt-2">
                      <Link
                        to={`/products/new?designId=${d.id}`}
                        className="flex-1 text-center px-3 py-2 rounded-full stellar-gradient text-white text-xs font-bold hover:brightness-110 transition-all"
                      >
                        Create Product
                      </Link>
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="designId" value={d.id} />
                        <button
                          type="submit"
                          className="w-9 h-9 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                          aria-label="Delete design"
                        >
                          <span className="material-symbols-outlined text-base">
                            delete
                          </span>
                        </button>
                      </fetcher.Form>
                    </div>
                  </div>
                </TiltCard>
                </StaggerItem>
              );
            })}
          </StaggerList>
        </>
      )}
    </AnimatedPage>
  );
}

import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher, Link } from "@remix-run/react";
import { apiGet, apiPost, apiDelete } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import type { MerchantProduct } from "~/lib/types";
import { PageHeader, SectionCard } from "~/components/ui/PageHeader";
import { Button, LinkButton } from "~/components/ui/Button";
import { ProductPill } from "~/components/ui/StatusPill";
import { pageMeta } from "~/lib/seo";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Product Detail",
    description:
      "Inspect and manage an individual print-on-demand product — pricing, variants, artwork and publish status.",
    noIndex: true,
  });

export async function loader({ request, params }: LoaderFunctionArgs) {
  const walletAddress = await requireUser(request);
  const { productId } = params;
  if (!productId)
    return json({ product: null, error: "Missing product ID" });

  const res = await apiGet<MerchantProduct>(
    `/products/${productId}`,
    walletAddress,
  );
  return json({ product: res.data ?? null, error: res.error });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const walletAddress = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const productId = params.productId;
  if (!productId)
    return json({ error: "Missing product ID" }, { status: 400 });

  if (intent === "publish") {
    const r = await apiPost(`/products/${productId}/publish`, {}, walletAddress);
    return r.error
      ? json({ error: r.error }, { status: r.status || 500 })
      : json({ success: true });
  }
  if (intent === "unpublish") {
    const r = await apiPost(`/products/${productId}/unpublish`, {}, walletAddress);
    return r.error
      ? json({ error: r.error }, { status: r.status || 500 })
      : json({ success: true });
  }
  if (intent === "delete") {
    const r = await apiDelete(`/products/${productId}`, walletAddress);
    return r.error
      ? json({ error: r.error }, { status: r.status || 500 })
      : json({ success: true, deleted: true });
  }
  return json({ error: "Unknown intent" }, { status: 400 });
}

export default function ProductDetail() {
  const navigate = useNavigate();
  const { product, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{
    error?: string;
    deleted?: boolean;
  }>();

  const isSubmitting = fetcher.state === "submitting";

  if (fetcher.data?.deleted) {
    navigate("/products");
    return null;
  }

  if (error || !product) {
    return (
      <>
        <PageHeader
          title="Product Not Found"
          actions={
            <LinkButton to="/products" variant="secondary" icon="arrow_back">
              Products
            </LinkButton>
          }
        />
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm">{error || "Product not found"}</p>
        </div>
      </>
    );
  }

  const platformFee = product.retailPrice * 0.05;
  const profit = product.retailPrice - product.baseCost - platformFee;
  const profitPercent =
    product.retailPrice > 0 ? (profit / product.retailPrice) * 100 : 0;

  const designImg =
    product.design?.thumbnailUrl ||
    product.design?.fileUrl ||
    undefined;
  const blankImg = product.providerProduct
    ? Object.values(product.providerProduct.blankImages)[0]
    : undefined;

  return (
    <>
      <div className="flex items-center gap-3 text-sm">
        <Link
          to="/products"
          className="text-on-surface-variant hover:text-primary flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Products
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-on-surface-variant">{product.title}</span>
      </div>

      <PageHeader
        title={product.title}
        subtitle={product.description || "Product details & pricing"}
        actions={<ProductPill status={product.status} />}
      />

      {fetcher.data?.error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm">{fetcher.data.error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-8">
          {/* Product Hero */}
          <SectionCard title="Product Details">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-60 h-60 rounded-2xl bg-surface-container-highest flex items-center justify-center overflow-hidden">
                {designImg ? (
                  <img
                    src={designImg}
                    alt={product.design?.name || "Design"}
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
                    image
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold">
                    {product.providerProduct?.productType ?? "—"}
                  </span>
                  <ProductPill status={product.status} />
                </div>
                <h3 className="text-2xl font-headline font-bold">
                  {product.title}
                </h3>
                {product.description && (
                  <p className="text-on-surface-variant">{product.description}</p>
                )}
                {product.shopifyProductId && (
                  <p className="text-xs text-on-surface-variant font-mono">
                    Shopify ID: {product.shopifyProductId}
                  </p>
                )}
                {product.publishedAt && (
                  <p className="text-xs text-on-surface-variant">
                    Published:{" "}
                    {new Date(product.publishedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Provider Product */}
          {product.providerProduct && (
            <SectionCard title="Provider Product">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-surface-container-highest flex items-center justify-center overflow-hidden">
                  {blankImg ? (
                    <img
                      src={blankImg}
                      alt={product.providerProduct.name}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-2xl text-on-surface-variant/40">
                      checkroom
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold">{product.providerProduct.name}</h4>
                  {product.providerProduct.brand && (
                    <p className="text-sm text-on-surface-variant">
                      Brand: {product.providerProduct.brand}
                    </p>
                  )}
                  <p className="text-xs text-on-surface-variant font-mono">
                    Production: {product.providerProduct.productionDays} day
                    {product.providerProduct.productionDays !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Variants */}
          {(product.providerProduct?.variants?.length ?? 0) > 0 && (
            <SectionCard title="Variants">
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-on-surface-variant text-[10px] uppercase tracking-[0.1em]">
                      <th className="px-6 py-3 font-semibold">Size</th>
                      <th className="px-6 py-3 font-semibold">Color</th>
                      <th className="px-6 py-3 font-semibold font-mono">SKU</th>
                      <th className="px-6 py-3 font-semibold text-right">
                        +Cost
                      </th>
                      <th className="px-6 py-3 font-semibold">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="font-headline">
                    {product.providerProduct?.variants?.map((v) => (
                      <tr
                        key={v.id}
                        className="hover:bg-surface-bright transition-colors"
                      >
                        <td className="px-6 py-3 font-medium">{v.size}</td>
                        <td className="px-6 py-3 text-on-surface-variant">
                          {v.color}
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-on-surface-variant">
                          {v.sku}
                        </td>
                        <td className="px-6 py-3 font-mono text-right">
                          ${v.additionalCost.toFixed(2)}
                        </td>
                        <td className="px-6 py-3">
                          {v.inStock ? (
                            <span className="text-green-400 text-xs font-bold uppercase">
                              In Stock
                            </span>
                          ) : (
                            <span className="text-red-400 text-xs font-bold uppercase">
                              Out
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 space-y-8">
          {/* Pricing breakdown */}
          <div className="bg-surface-container-low p-6 rounded-2xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">
              Pricing Breakdown
            </h3>
            <div className="space-y-4 text-sm">
              <Row label="Retail Price" value={`$${product.retailPrice.toFixed(2)}`} bold />
              <Row
                label="Base Cost"
                value={`-$${product.baseCost.toFixed(2)}`}
              />
              <Row
                label="Platform Fee (5%)"
                value={`-$${platformFee.toFixed(2)}`}
              />
              <div className="h-[1px] bg-outline-variant/20" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Your Profit</span>
                <span
                  className={`font-mono font-bold text-lg ${
                    profit >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  ${profit.toFixed(2)}
                  <span className="text-xs ml-1 opacity-70">
                    ({profitPercent.toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Print Config */}
          <div className="bg-surface-container-low p-6 rounded-2xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">
              Print Configuration
            </h3>
            <div className="space-y-4 text-sm">
              <Row label="Print Area" value={product.printConfig.printArea} />
              <Row label="Scale" value={`${product.printConfig.scale}x`} />
              <Row
                label="Rotation"
                value={`${product.printConfig.rotation}°`}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="bg-surface-container-low p-6 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Actions
            </h3>
            {product.status === "draft" && (
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="publish" />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Publishing..." : "Publish to Shopify"}
                </Button>
              </fetcher.Form>
            )}
            {product.status === "published" && (
              <>
                {product.shopifyProductId && (
                  <a
                    href={`https://admin.shopify.com/products/${product.shopifyProductId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full bg-surface-container-high text-primary hover:bg-surface-container-highest font-bold text-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-base">
                      open_in_new
                    </span>
                    View on Shopify
                  </a>
                )}
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="unpublish" />
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    Unpublish
                  </Button>
                </fetcher.Form>
              </>
            )}
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <Button
                type="submit"
                variant="danger"
                disabled={isSubmitting}
                className="w-full"
              >
                Delete Product
              </Button>
            </fetcher.Form>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-on-surface-variant">{label}</span>
      <span
        className={`font-mono ${bold ? "font-bold text-on-surface" : "text-on-surface-variant"}`}
      >
        {value}
      </span>
    </div>
  );
}

import { useEffect, useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { apiGet, apiPost } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import { pageMeta } from "~/lib/seo";
import { AnimatedPage } from "~/components/ui/AnimatedPage";
import { GenerationProgress } from "~/components/trends/GenerationProgress";

export const meta: MetaFunction = () => pageMeta({ title: "Generate Design", noIndex: true });

export async function loader({ request, params }: LoaderFunctionArgs) {
  const wallet = await requireUser(request);
  const productsRes = await apiGet<{ data: Array<{ id: string; name: string; productType: string }> }>(
    `/provider-products?limit=20&active=true`, wallet,
  );
  return json({ trendId: params.trendId, products: productsRes.data?.data || [] });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const wallet = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'start') {
    const providerProductId = formData.get('providerProductId') as string;
    const r = await apiPost<{ trendDesignId: string; status: string }>(
      `/trends/${params.trendId}/generate-design`,
      { providerProductId },
      wallet,
    );
    if (r.error) return json({ error: r.error }, { status: r.status || 500 });
    return json({ trendDesignId: r.data!.trendDesignId });
  }

  if (intent === 'poll') {
    const trendDesignId = formData.get('trendDesignId') as string;
    const r = await apiGet<{ id: string; status: string; designId: string | null; errorMessage: string | null }>(
      `/trends/designs/${trendDesignId}`, wallet,
    );
    if (r.data?.status === 'COMPLETED' && r.data.designId) {
      return redirect(`/designs/${r.data.designId}/edit`);
    }
    return json({ ...r.data });
  }

  return json({ error: 'Unknown intent' }, { status: 400 });
}

export default function GenerateDesign() {
  const { products } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const [trendDesignId, setTrendDesignId] = useState<string | null>(null);

  useEffect(() => {
    if (fetcher.data?.trendDesignId && !trendDesignId) {
      setTrendDesignId(fetcher.data.trendDesignId);
    }
  }, [fetcher.data, trendDesignId]);

  useEffect(() => {
    if (!trendDesignId) return;
    if (fetcher.data?.status === 'COMPLETED' || fetcher.data?.status === 'FAILED') return;
    const t = setTimeout(() => {
      const fd = new FormData();
      fd.set('intent', 'poll');
      fd.set('trendDesignId', trendDesignId);
      fetcher.submit(fd, { method: 'post' });
    }, 2000);
    return () => clearTimeout(t);
  }, [trendDesignId, fetcher.data?.status]);

  return (
    <AnimatedPage>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold font-headline">Generate Design from Trend</h1>

        {!trendDesignId && (
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="start" />
            <div>
              <label className="text-xs uppercase font-bold text-on-surface-variant">Choose product</label>
              <select
                name="providerProductId"
                required
                className="w-full mt-1 px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/10 text-sm"
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.productType})</option>
                ))}
              </select>
            </div>
            <button type="submit" className="w-full px-6 py-3 rounded-full stellar-gradient text-white font-bold text-sm">
              Start Generation
            </button>
          </fetcher.Form>
        )}

        {trendDesignId && fetcher.data && (
          <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10">
            <GenerationProgress
              status={fetcher.data.status || 'PENDING'}
              errorMessage={fetcher.data.errorMessage}
            />
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}

import { useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Select,
  BlockStack,
  InlineGrid,
  Text,
  Banner,
  EmptyState,
} from "@shopify/polaris";
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams, useFetcher } from "@remix-run/react";
import { ProviderCard } from "~/components/ProviderCard";
import { apiGet, apiPost, apiDelete } from "~/lib/api";
import type { Provider, StoreProvider, PaginatedResponse } from "~/lib/types";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Providers" }];
};

const STORE_ID = "demo-store";

interface LoaderData {
  providers: Provider[];
  connectedProviderIds: string[];
  meta: PaginatedResponse<Provider>["meta"] | null;
  error: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country") || "";
  const specialty = url.searchParams.get("specialty") || "";
  const page = url.searchParams.get("page") || "1";

  // Build search query
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (specialty) params.set("specialty", specialty);
  params.set("verified", "true");
  params.set("page", page);

  const [providersResult, connectedResult] = await Promise.all([
    apiGet<PaginatedResponse<Provider>>(`/providers/search?${params.toString()}`),
    apiGet<StoreProvider[]>(`/providers/connected/${STORE_ID}`),
  ]);

  if (providersResult.error) {
    return json<LoaderData>({
      providers: [],
      connectedProviderIds: [],
      meta: null,
      error: providersResult.error,
    });
  }

  const connectedIds = Array.isArray(connectedResult.data)
    ? connectedResult.data.map((sp) => sp.providerId)
    : [];

  return json<LoaderData>({
    providers: providersResult.data?.data ?? [],
    connectedProviderIds: connectedIds,
    meta: providersResult.data?.meta ?? null,
    error: null,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const providerId = formData.get("providerId") as string;

  if (!providerId) {
    return json({ error: "Missing providerId" }, { status: 400 });
  }

  if (intent === "connect") {
    const result = await apiPost("/providers/connect", {
      storeId: STORE_ID,
      providerId,
    });

    if (result.error) {
      return json({ error: result.error }, { status: result.status || 500 });
    }
    return json({ success: true });
  }

  if (intent === "disconnect") {
    const result = await apiDelete(
      `/providers/disconnect?storeId=${STORE_ID}&providerId=${providerId}`,
    );

    if (result.error) {
      return json({ error: result.error }, { status: result.status || 500 });
    }
    return json({ success: true });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
}

const countryOptions = [
  { label: "All Countries", value: "" },
  { label: "United States", value: "United States" },
  { label: "Germany", value: "Germany" },
  { label: "Japan", value: "Japan" },
  { label: "Brazil", value: "Brazil" },
  { label: "Sweden", value: "Sweden" },
];

const specialtyOptions = [
  { label: "All Specialties", value: "" },
  { label: "T-Shirts", value: "T-Shirts" },
  { label: "Hoodies", value: "Hoodies" },
  { label: "Posters", value: "Posters" },
  { label: "Mugs", value: "Mugs" },
  { label: "Phone Cases", value: "Phone Cases" },
  { label: "Canvas", value: "Canvas" },
];

export default function Providers() {
  const { providers, connectedProviderIds, meta: pagination, error } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const countryFilter = searchParams.get("country") || "";
  const specialtyFilter = searchParams.get("specialty") || "";
  const searchQuery = searchParams.get("q") || "";

  const handleCountryChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set("country", value);
      } else {
        params.delete("country");
      }
      params.delete("page");
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  const handleSpecialtyChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set("specialty", value);
      } else {
        params.delete("specialty");
      }
      params.delete("page");
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  const handleConnect = useCallback(
    (providerId: string) => {
      const isConnected = connectedProviderIds.includes(providerId);
      const formData = new FormData();
      formData.set("intent", isConnected ? "disconnect" : "connect");
      formData.set("providerId", providerId);
      fetcher.submit(formData, { method: "POST" });
    },
    [connectedProviderIds, fetcher],
  );

  // Client-side search filtering (server handles country/specialty)
  const filteredProviders = searchQuery
    ? providers.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : providers;

  if (error) {
    return (
      <Page title="Print Providers">
        <Banner title="Error loading providers" tone="critical">
          <p>{error}</p>
        </Banner>
      </Page>
    );
  }

  return (
    <Page title="Print Providers" subtitle="Find and connect with print-on-demand providers">
      <BlockStack gap="500">
        {(() => {
          const d = fetcher.data as { error?: string } | undefined;
          return d?.error ? (
            <Banner title="Action failed" tone="critical">
              <p>{d.error}</p>
            </Banner>
          ) : null;
        })()}

        <Card>
          <BlockStack gap="400">
            <TextField
              label="Search providers"
              value={searchQuery}
              onChange={handleSearchChange}
              autoComplete="off"
              placeholder="Search by name..."
              clearButton
              onClearButtonClick={() => handleSearchChange("")}
            />
            <Layout>
              <Layout.Section variant="oneHalf">
                <Select
                  label="Country"
                  options={countryOptions}
                  value={countryFilter}
                  onChange={handleCountryChange}
                />
              </Layout.Section>
              <Layout.Section variant="oneHalf">
                <Select
                  label="Specialty"
                  options={specialtyOptions}
                  value={specialtyFilter}
                  onChange={handleSpecialtyChange}
                />
              </Layout.Section>
            </Layout>
          </BlockStack>
        </Card>

        <Text as="p" variant="bodySm" tone="subdued">
          {pagination
            ? `${pagination.total} providers found`
            : `${filteredProviders.length} providers found`}
        </Text>

        {filteredProviders.length === 0 ? (
          <Card>
            <EmptyState
              heading="No providers found"
              image=""
            >
              <p>Try adjusting your filters to find print providers.</p>
            </EmptyState>
          </Card>
        ) : (
          <InlineGrid columns={{ xs: 1, sm: 2, lg: 3 }} gap="400">
            {filteredProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                id={provider.id}
                name={provider.name}
                country={provider.country}
                rating={provider.rating}
                specialties={provider.specialties}
                productsAvailable={provider.totalOrders}
                connected={connectedProviderIds.includes(provider.id)}
                onConnect={handleConnect}
              />
            ))}
          </InlineGrid>
        )}
      </BlockStack>
    </Page>
  );
}

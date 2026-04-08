import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Select,
  BlockStack,
  InlineGrid,
  Text,
} from "@shopify/polaris";
import type { MetaFunction } from "@remix-run/node";
import { ProviderCard } from "~/components/ProviderCard";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Providers" }];
};

interface Provider {
  id: string;
  name: string;
  country: string;
  rating: number;
  specialties: string[];
  productsAvailable: number;
  connected: boolean;
}

// TODO: Replace with loader data from API
const mockProviders: Provider[] = [
  {
    id: "PRV-001",
    name: "PrintMaster Co.",
    country: "United States",
    rating: 4.8,
    specialties: ["T-Shirts", "Hoodies", "Hats"],
    productsAvailable: 120,
    connected: true,
  },
  {
    id: "PRV-002",
    name: "EuroPrint GmbH",
    country: "Germany",
    rating: 4.6,
    specialties: ["Posters", "Canvas", "Stickers"],
    productsAvailable: 85,
    connected: false,
  },
  {
    id: "PRV-003",
    name: "AsiaFab Ltd",
    country: "Japan",
    rating: 4.9,
    specialties: ["Phone Cases", "Mugs", "Tote Bags"],
    productsAvailable: 200,
    connected: false,
  },
  {
    id: "PRV-004",
    name: "LatamPrint SA",
    country: "Brazil",
    rating: 4.3,
    specialties: ["T-Shirts", "Shorts", "Swimwear"],
    productsAvailable: 60,
    connected: false,
  },
  {
    id: "PRV-005",
    name: "NordicCraft AB",
    country: "Sweden",
    rating: 4.7,
    specialties: ["Notebooks", "Art Prints", "Calendars"],
    productsAvailable: 95,
    connected: true,
  },
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");

  const handleConnect = useCallback((providerId: string) => {
    // TODO: Call API to connect/disconnect provider
    console.log("Toggle connection for provider:", providerId);
  }, []);

  const filteredProviders = mockProviders.filter((provider) => {
    if (searchQuery && !provider.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (countryFilter && provider.country !== countryFilter) {
      return false;
    }
    if (specialtyFilter && !provider.specialties.includes(specialtyFilter)) {
      return false;
    }
    return true;
  });

  return (
    <Page title="Print Providers" subtitle="Find and connect with print-on-demand providers">
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <TextField
              label="Search providers"
              value={searchQuery}
              onChange={setSearchQuery}
              autoComplete="off"
              placeholder="Search by name..."
              clearButton
              onClearButtonClick={() => setSearchQuery("")}
            />
            <Layout>
              <Layout.Section variant="oneHalf">
                <Select
                  label="Country"
                  options={countryOptions}
                  value={countryFilter}
                  onChange={setCountryFilter}
                />
              </Layout.Section>
              <Layout.Section variant="oneHalf">
                <Select
                  label="Specialty"
                  options={specialtyOptions}
                  value={specialtyFilter}
                  onChange={setSpecialtyFilter}
                />
              </Layout.Section>
            </Layout>
          </BlockStack>
        </Card>

        <Text as="p" variant="bodySm" tone="subdued">
          {filteredProviders.length} providers found
        </Text>

        <InlineGrid columns={{ xs: 1, sm: 2, lg: 3 }} gap="400">
          {filteredProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              id={provider.id}
              name={provider.name}
              country={provider.country}
              rating={provider.rating}
              specialties={provider.specialties}
              productsAvailable={provider.productsAvailable}
              connected={provider.connected}
              onConnect={handleConnect}
            />
          ))}
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}

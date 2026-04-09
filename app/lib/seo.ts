// ─── Shared SEO helpers ──────────────────────────────────────────────
// Centralised metadata builders so every page can emit consistent
// <title>, description, OpenGraph and Twitter tags.

export const SITE = {
  name: "StellarPOD",
  tagline: "Mission Control for Stellar-powered Print-on-Demand",
  description:
    "StellarPOD is a decentralised print-on-demand platform. Sell custom merch, accept USDC via Stellar escrow, and automate fulfilment with verified providers — no chargebacks, no middlemen.",
  url: "https://stelo.life",
  locale: "en_US",
  twitter: "@stellarpod",
  logo: "/images/logo.png",
} as const;

export interface PageMetaOptions {
  /** Short page title (will be suffixed with the site name). */
  title: string;
  /** 1–2 sentence page description for search + social previews. */
  description?: string;
  /** Canonical path (default: current route). */
  path?: string;
  /** Optional image override (absolute URL or path relative to site root). */
  image?: string;
  /** Hide the page from indexing (e.g. authenticated dashboards). */
  noIndex?: boolean;
}

/**
 * Build the full tag array Remix's `MetaFunction` expects.
 *
 * Usage:
 *   export const meta: MetaFunction = () =>
 *     pageMeta({ title: "Escrow", description: "...", path: "/escrow" });
 */
export function pageMeta(opts: PageMetaOptions) {
  const title = `${opts.title} · ${SITE.name}`;
  const description = opts.description ?? SITE.description;
  const url = opts.path
    ? new URL(opts.path, SITE.url).toString()
    : SITE.url;
  const image = opts.image
    ? opts.image.startsWith("http")
      ? opts.image
      : new URL(opts.image, SITE.url).toString()
    : new URL(SITE.logo, SITE.url).toString();

  return [
    { title },
    { name: "description", content: description },
    { name: "application-name", content: SITE.name },
    { name: "theme-color", content: "#0B1E3F" },
    ...(opts.noIndex ? [{ name: "robots", content: "noindex,nofollow" }] : []),

    // Canonical
    { tagName: "link", rel: "canonical", href: url },

    // OpenGraph
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE.name },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:locale", content: SITE.locale },

    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: SITE.twitter },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
}

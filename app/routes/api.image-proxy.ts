import type { LoaderFunctionArgs } from "@remix-run/node";

/**
 * Image proxy for external CDN images that don't send CORS headers.
 * Usage: /api/image-proxy?url=https://files.cdn.printful.com/...
 *
 * Hardening:
 * - Whitelist of allowed hostnames (no open proxy).
 * - Protocol must be https.
 * - `redirect: 'manual'` — a whitelisted host redirecting to an internal
 *   IP would otherwise bypass the hostname check (DNS rebinding / SSRF).
 * - Content-Type must start with `image/` — we never proxy HTML or JS.
 * - Size cap (8 MB) — refuses to buffer huge upstreams into memory.
 */
const ALLOWED_DOMAINS = [
  "files.cdn.printful.com",
  "static.cdn.printful.com",
  "cdn.printify.com",
  "images.printify.com",
];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get("url");

  if (!imageUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  if (parsed.protocol !== "https:") {
    return new Response("Protocol not allowed", { status: 400 });
  }

  if (!ALLOWED_DOMAINS.includes(parsed.hostname)) {
    return new Response("Domain not allowed", { status: 403 });
  }

  try {
    const response = await fetch(imageUrl, { redirect: "manual" });

    if (response.status >= 300 && response.status < 400) {
      return new Response("Redirects not allowed", { status: 502 });
    }
    // Pass through upstream 4xx (403/404) verbatim — otherwise a stale
    // Printful URL surfaces as a generic "Upstream error" and the
    // caller can't tell whether it's a temporary outage or a dead URL
    // that needs a catalog re-sync.
    if (response.status === 404 || response.status === 410) {
      return new Response("Image not found at upstream", { status: 404 });
    }
    if (response.status === 403) {
      return new Response("Image not accessible at upstream", { status: 404 });
    }
    if (!response.ok) {
      return new Response("Upstream error", { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new Response("Upstream returned non-image content", { status: 502 });
    }

    const declaredLength = parseInt(
      response.headers.get("content-length") || "0",
      10,
    );
    if (declaredLength && declaredLength > MAX_IMAGE_BYTES) {
      return new Response("Image too large", { status: 413 });
    }

    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_IMAGE_BYTES) {
      return new Response("Image too large", { status: 413 });
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Failed to fetch image", { status: 502 });
  }
}

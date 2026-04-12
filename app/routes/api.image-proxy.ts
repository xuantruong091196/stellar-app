import type { LoaderFunctionArgs } from "@remix-run/node";

/**
 * Image proxy for external CDN images that don't send CORS headers.
 * Usage: /api/image-proxy?url=https://files.cdn.printful.com/...
 *
 * Only allows whitelisted domains to prevent open proxy abuse.
 */
const ALLOWED_DOMAINS = [
  "files.cdn.printful.com",
  "static.cdn.printful.com",
  "cdn.printify.com",
  "images.printify.com",
];

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

  if (!ALLOWED_DOMAINS.includes(parsed.hostname)) {
    return new Response("Domain not allowed", { status: 403 });
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return new Response("Upstream error", { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const body = await response.arrayBuffer();

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

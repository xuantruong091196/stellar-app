import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useParams } from "@remix-run/react";
import { pageMeta } from "~/lib/seo";
import { AnimatedPage } from "~/components/ui/AnimatedPage";

const API = process.env.STELLARPOD_API_URL || "http://localhost:8000";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Burn & Claim",
    description:
      "Burn your NFT to claim the physical merchandise. Provide your shipping address to receive your item.",
    path: "/my-nfts/burn",
    noIndex: true,
  });

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return redirect("/my-nfts");
  }

  // Verify the token is still valid
  const verifyRes = await fetch(`${API}/buyer/verify-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!verifyRes.ok) {
    return redirect("/my-nfts");
  }

  const { accessToken: jwt } = (await verifyRes.json()) as { accessToken: string };

  return json({ jwt, token });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { nftId } = params;
  const formData = await request.formData();
  const jwt = formData.get("jwt") as string;
  const token = formData.get("token") as string;

  if (!jwt || !nftId) {
    return json({ error: "Missing authentication. Please go back and try again." }, { status: 400 });
  }

  const shipping = {
    name: formData.get("name") as string,
    street: formData.get("street") as string,
    city: formData.get("city") as string,
    state: formData.get("state") as string,
    zip: formData.get("zip") as string,
    country: formData.get("country") as string,
  };

  // Validate required fields
  const missing = Object.entries(shipping)
    .filter(([, v]) => !v || !v.trim())
    .map(([k]) => k);

  if (missing.length > 0) {
    return json({ error: `Please fill in: ${missing.join(", ")}` }, { status: 400 });
  }

  const res = await fetch(`${API}/buyer/burn/${nftId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(shipping),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return json(
      { error: (body as { message?: string }).message || "Burn failed. Please try again." },
      { status: res.status },
    );
  }

  return redirect(`/my-nfts?token=${token}&burned=true`);
}

export default function BurnToClaim() {
  const { jwt, token } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const { nftId } = useParams();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center px-6">
      <AnimatedPage className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-amber-400">local_fire_department</span>
          <h1 className="text-3xl font-headline font-bold mt-4 text-amber-400">Burn & Claim</h1>
          <p className="text-on-surface-variant mt-2">
            Burning this NFT is irreversible. Your physical item will be shipped to the address below.
          </p>
        </div>

        {/* Warning */}
        <div className="bg-amber-500/10 border border-amber-400/20 text-amber-300 px-6 py-4 rounded-2xl">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-lg mt-0.5">warning</span>
            <div>
              <p className="text-sm font-bold">This action cannot be undone</p>
              <p className="text-xs opacity-80 mt-1">
                Once burned, the NFT will be permanently destroyed on the Stellar blockchain and a physical item will be produced and shipped.
              </p>
            </div>
          </div>
        </div>

        {actionData && "error" in actionData && (
          <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
            <p className="text-sm">{actionData.error}</p>
          </div>
        )}

        {/* Shipping form */}
        <form method="post" className="space-y-4">
          <input type="hidden" name="jwt" value={jwt} />
          <input type="hidden" name="token" value={token} />

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">Full name</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="Jane Doe"
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label htmlFor="street" className="block text-sm font-medium mb-2">Street address</label>
            <input
              type="text"
              id="street"
              name="street"
              required
              placeholder="123 Main St, Apt 4B"
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium mb-2">City</label>
              <input
                type="text"
                id="city"
                name="city"
                required
                placeholder="San Francisco"
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium mb-2">State / Province</label>
              <input
                type="text"
                id="state"
                name="state"
                required
                placeholder="CA"
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="zip" className="block text-sm font-medium mb-2">ZIP / Postal code</label>
              <input
                type="text"
                id="zip"
                name="zip"
                required
                placeholder="94102"
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-medium mb-2">Country</label>
              <input
                type="text"
                id="country"
                name="country"
                required
                placeholder="US"
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">local_fire_department</span>
              {isSubmitting ? "Burning..." : "Burn NFT & Claim Physical"}
            </button>
          </div>

          <p className="text-center text-xs text-on-surface-variant">
            NFT ID: <span className="font-mono">{nftId}</span>
          </p>
        </form>
      </AnimatedPage>

    </div>
  );
}

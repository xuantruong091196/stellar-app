import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import { pageMeta } from "~/lib/seo";
import { AnimatedPage } from "~/components/ui/AnimatedPage";
import { NftCard } from "~/components/nft/NftCard";

const API = process.env.STELLARPOD_API_URL || "http://localhost:4000";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "My NFTs",
    description:
      "View and manage your StellarPOD NFTs. Burn to claim physical merchandise.",
    path: "/my-nfts",
    noIndex: true,
  });

interface NftItem {
  id: string;
  assetCode: string;
  serialNumber: number;
  status: string;
  physicalStatus: string | null;
  productTitle: string;
  mockupUrl: string;
  isBurnToClaim: boolean;
  explorerUrl: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const burned = url.searchParams.get("burned");

  if (!token) {
    return json({ authenticated: false as const, nfts: [] as NftItem[], burned: burned === "true" });
  }

  // Verify magic-link token → get JWT
  const verifyRes = await fetch(`${API}/buyer/verify-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!verifyRes.ok) {
    return json({ authenticated: false as const, nfts: [] as NftItem[], error: "Invalid or expired link. Please request a new one.", burned: false });
  }

  const { jwt } = (await verifyRes.json()) as { jwt: string };

  // Fetch buyer's NFTs
  const nftsRes = await fetch(`${API}/buyer/nfts`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  const nfts: NftItem[] = nftsRes.ok ? ((await nftsRes.json()) as { data: NftItem[] }).data : [];

  return json({ authenticated: true as const, nfts, jwt, burned: burned === "true" });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) {
    return json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const res = await fetch(`${API}/buyer/send-magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    return json({ error: "Failed to send magic link. Please try again." }, { status: 500 });
  }

  return json({ success: true });
}

export default function MyNfts() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Authenticated: show NFT grid
  if (data.authenticated) {
    return (
      <div className="min-h-screen bg-surface text-on-surface">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <AnimatedPage>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-headline font-bold">My NFTs</h1>
                <p className="text-on-surface-variant mt-1">Your StellarPOD digital collectibles</p>
              </div>
            </div>

            {data.burned && (
              <div className="bg-green-500/10 border border-green-400/20 text-green-300 px-6 py-4 rounded-2xl">
                <p className="text-sm font-bold">Burn successful!</p>
                <p className="text-xs opacity-80">Your physical item claim has been submitted. You'll receive shipping updates via email.</p>
              </div>
            )}

            {"error" in data && data.error && (
              <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
                <p className="text-sm font-bold">Authentication error</p>
                <p className="text-xs opacity-80">{data.error as string}</p>
              </div>
            )}

            {data.nfts.length === 0 ? (
              <div className="text-center py-20">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant/30">token</span>
                <h2 className="text-xl font-bold mt-4">No NFTs yet</h2>
                <p className="text-on-surface-variant mt-2">When you purchase a StellarPOD product, your NFTs will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {data.nfts.map((nft) => (
                  <NftCard key={nft.id} {...nft} />
                ))}
              </div>
            )}
          </AnimatedPage>
        </div>
      </div>
    );
  }

  // Not authenticated: magic link form
  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center px-6">
      <AnimatedPage className="w-full max-w-md space-y-8">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-primary">lock_open</span>
          <h1 className="text-3xl font-headline font-bold mt-4">View Your NFTs</h1>
          <p className="text-on-surface-variant mt-2">
            Enter the email you used at checkout. We'll send a magic link to access your collection.
          </p>
        </div>

        {"error" in data && data.error && (
          <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
            <p className="text-sm">{data.error as string}</p>
          </div>
        )}

        {actionData && "success" in actionData && actionData.success ? (
          <div className="bg-green-500/10 border border-green-400/20 text-green-300 px-6 py-4 rounded-2xl text-center">
            <span className="material-symbols-outlined text-3xl">mark_email_read</span>
            <p className="text-sm font-bold mt-2">Check your inbox!</p>
            <p className="text-xs opacity-80 mt-1">We sent a magic link to your email. Click it to view your NFTs.</p>
          </div>
        ) : (
          <form method="post" className="space-y-4">
            {actionData && "error" in actionData && (
              <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-xl">
                <p className="text-sm">{actionData.error}</p>
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full stellar-gradient text-white font-bold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send Magic Link"}
            </button>
          </form>
        )}
      </AnimatedPage>
    </div>
  );
}
